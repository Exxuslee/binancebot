import {ExchangeInfo, OrderSide, OrderType} from 'binance-api-node';
import {error, log, logBuySellExecutionOrder} from '../utils/log';
import {binanceClient} from '../init';
import {Telegram} from '../telegram';
import dayjs from 'dayjs';
import {Balance} from "./Balance";
import {View} from "./View";
import Emittery from "emittery";
import {Order} from "./Order";
import {getPricePrecision, validPrice, validQuantity} from "../utils/currencyInfo";

export class Bot {
    private strategyConfigs: StrategyConfig[];
    private telegram: Telegram;
    private balance: Balance
    private exchangeInfo: ExchangeInfo;
    private hasOpenPosition: { [pair: string]: boolean };
    private currentDay: string;
    private currentMonth: string;
    private bit: boolean

    constructor(tradeConfigs: StrategyConfig[]) {
        this.strategyConfigs = tradeConfigs;
        this.hasOpenPosition = {};
        this.currentDay = dayjs(Date.now()).format('DD/MM/YYYY');
        this.currentMonth = dayjs(Date.now()).format('MM/YYYY');
        this.bit = true
    }

    public async run() {
        log('=========== 💵 BINANCE BOT TRADING 💵 ===========');
        this.telegram = new Telegram()
        this.balance = new Balance()
        this.exchangeInfo = await binanceClient.exchangeInfo();
        const emitter = new Emittery();
        await this.balance.init()
        this.strategyConfigs.forEach((strategyConfig) => {
            const pair = strategyConfig.asset + strategyConfig.base;
            let b1 = this.balance.bCurrent(strategyConfig.asset)
            let b2 = this.balance.bCurrent(strategyConfig.base)
            log(`Trades ${pair}: ${b1}\t${b2}`);
            let view = new View(emitter, strategyConfig.leverage)
            let order = new Order()
            order.closeOpenOrders(pair)
            binanceClient.ws.aggTrades(pair, AggregatedTrade => view.update(AggregatedTrade))
            emitter.on(pair, candlesArray => {
                this.trade(candlesArray.dataCandles,
                    strategyConfig,
                    pair,
                    order,
                    candlesArray.currentPrice,
                )
            })
        })
    }

    async trade(candles, strategyConfig, pair, order, currentPrice) {

        if (order.getLong() === null && strategyConfig.buyStrategy(candles) && !order.getBul()) {
            order.setBull(true)
            await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.BUY)
        }
        if (order.getShort() === null && strategyConfig.sellStrategy(candles) && !order.getBear()) {
            order.setBear(true)
            await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL)
        }

        if (order.getLong() !== null) if (+order.getLong().price > currentPrice) order.setLong()
        if (order.getShort() !== null) if (+order.getShort().price < currentPrice) order.setShort()
    }

    async startSignal(candlesArray, strategyConfig, pair, order, currentPrice, orderSide) {
        let banOrder = (orderSide === OrderSide.BUY) ? OrderSide.BUY : OrderSide.SELL
        let {takeProfits, stopLoss} = strategyConfig.exitStrategy
            ? strategyConfig.exitStrategy(
                currentPrice,
                candlesArray,
                getPricePrecision(pair, this.exchangeInfo),
                orderSide,
                this.exchangeInfo
            ) : {takeProfits: [], stopLoss: null};
        // Calculate the quantity for the position according to the risk management of the strategy
        let quantity = strategyConfig.riskManagement({
            asset: strategyConfig.asset,
            base: strategyConfig.base,
            balance: strategyConfig.allowPyramiding
                ? Number(this.balance.bCurrent(strategyConfig.asset))
                : Number(this.balance.bCurrent(strategyConfig.base)),
            risk: strategyConfig.risk,
            enterPrice: currentPrice,
            stopLossPrice: stopLoss,
            exchangeInfo: this.exchangeInfo
        });
        quantity = validQuantity(quantity, pair, this.exchangeInfo)
        stopLoss = validPrice(stopLoss, pair, this.exchangeInfo)

        await order.newOrder(binanceClient, pair, quantity, orderSide, OrderType.MARKET, currentPrice).then(() => {
            order.newOrder(binanceClient, pair, quantity, banOrder, OrderType.LIMIT, stopLoss).catch(error);
            logBuySellExecutionOrder(orderSide, strategyConfig.asset, strategyConfig.base, currentPrice, quantity, takeProfits, stopLoss);
        }).catch(error);
    }

    async stopSignal() {

    }
}