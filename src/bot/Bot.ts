import {ExchangeInfo, OrderSide, OrderType} from 'binance-api-node';
import {
    error,
    log,
    logBuySellExecutionOrder,
    logStart,
    logStop,
    logStopExecutionOrder,
    logStopLose
} from '../utils/log';
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

        // Start order BUY
        if (strategyConfig.buyStrategy(candles) && !order.getBull() && !order.getBear()) {
            if (order.getRelax()){
                console.log(`${pair}: Not start order BUY - relax `)
                order.setRelax(false)
            }
            else {
                console.log(`${pair}: Start order BUY`)
                order.setBull(true)
                await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.BUY)
            }
        }
        // Start order SELL
        if (strategyConfig.sellStrategy(candles) && !order.getBear() && !order.getBull()) {
            if (order.getRelax()) {
                console.log(`${pair}: Not start order SELL - relax `)
                order.setRelax(false)
            }
            else {
                console.log(`${pair}: Start order SELL`)
                order.setBear(true)
                await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL)
            }
        }

        // Clear BUY by stop-loss
        if (order.getBull() && order.getPriceSL() > currentPrice) {
            logStopLose(pair, currentPrice, OrderSide.BUY, order.getPriceSL())
            order.setRelax(true)
            order.setBull(false)
        }

        // Clear SELL by stop-loss
        if (order.getBear() && order.getPriceSL() < currentPrice) {
            logStopLose(pair, currentPrice, OrderSide.SELL, order.getPriceSL())
            order.setRelax(true)
            order.setBear(false)
        }

        // Stop order BUY
        if (order.getBull() && candles[0].isBuyerMaker && candles[1].isBuyerMaker && currentPrice > order.getProfit()) {
            console.log(`${pair}: Stop order BUY`)
            await this.stopSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL, order.getSizeSL())
            order.setBull(false)
            order.setRelax(true)
        }

        // Stop order SELL
        if (order.getBear() && !candles[0].isBuyerMaker && !candles[1].isBuyerMaker && currentPrice < order.getProfit()) {
            console.log(`${pair}: Stop order SELL`)
            await this.stopSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL, order.getSizeSL())
            order.setBear(false)
            order.setRelax(true)
        }
    }

    async startSignal(candlesArray, strategyConfig, pair, order, currentPrice, orderSide) {
        let reverseOrder = (orderSide === OrderSide.BUY) ? OrderSide.SELL : OrderSide.BUY
        let {takeProfits, stopLoss} = await strategyConfig.exitStrategy
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
        stopLoss = validPrice(stopLoss)

        await order.newOrder(binanceClient, pair, quantity, orderSide, OrderType.MARKET, currentPrice).then(() => {
            order.setProfit(takeProfits[0].price)
            order.newOrder(binanceClient, pair, quantity, reverseOrder, OrderType.LIMIT, stopLoss).catch(error);
            logStart(pair, currentPrice, quantity, OrderSide.BUY, takeProfits[0].price, stopLoss)
        }).catch(error);
    }

    async stopSignal(candlesArray, strategyConfig, pair, order, currentPrice, orderSide, quantity) {
        quantity = validQuantity(quantity, pair, this.exchangeInfo)
        await order.newOrder(binanceClient, pair, quantity, orderSide, OrderType.MARKET, currentPrice).then(() => {
            order.closeOpenOrders(pair).catch(error);
            logStop(pair, currentPrice, orderSide, order.getProfit())
        }).catch(error);
    }
}