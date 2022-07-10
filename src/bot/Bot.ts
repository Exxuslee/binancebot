import {ExchangeInfo, OrderSide, OrderType} from 'binance-api-node';
import {error, log, logStart, logStop, logStopLose} from '../utils/log';
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
                let temp = ''
                candlesArray.dataCandles.map(asd => temp += asd.isBuyerMaker ? '0' : '1')
                console.log(pair, temp, candlesArray.currentPrice, '|lh',
                    candlesArray.dataCandles[0].low, candlesArray.dataCandles[0].high, '|oc',
                    candlesArray.dataCandles[0].open, candlesArray.dataCandles[0].close,
                )

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

        // Clear BUY by stop-loss
        if (order.getBull() && order.getPriceSL() > currentPrice) {
            logStopLose(pair, currentPrice, OrderSide.BUY, order.getPriceSL())
            //order.setRelax(true)
            order.setBull(false)
        }

        // Clear SELL by stop-loss
        if (order.getBear() && order.getPriceSL() < currentPrice) {
            logStopLose(pair, currentPrice, OrderSide.SELL, order.getPriceSL())
            //order.setRelax(true)
            order.setBear(false)
        }

        // Start order BUY
        if (!order.getBull() && !order.getBear() && !order.getTrading()) {
                if (strategyConfig.buyStrategy(candles)) {
                    //console.log(`${pair}: Not start order BUY - relax `)
                    //order.setRelax(false)
                //} else {
                    console.log(`${pair}: Start order BUY`)
                    order.setTrading(true)
                    await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.BUY)
                    order.setBull(true)
                    order.setTrading(false)
                }
        }
        // Start order SELL
        if (!order.getBear() && !order.getBull() && !order.getTrading()) {
                if (strategyConfig.sellStrategy(candles)) {
                    //console.log(`${pair}: Not start order SELL - relax `)
                    //order.setRelax(false)
                //} else {
                    console.log(`${pair}: Start order SELL`)
                    order.setTrading(true)
                    await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL)
                    order.setBear(true)
                    order.setTrading(false)
                }
        }

        // Stop order BUY
        if (order.getBull() && candles[0].isBuyerMaker && candles[1].isBuyerMaker && currentPrice > order.getProfit()
            && !order.getTrading()) {
            console.log(`${pair}: Stop order BUY`)
            order.setTrading(true)
            await this.stopSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL, order.getSizeSL())
            order.setBull(false)
            //order.setRelax(true)
            order.setTrading(false)
        }

        // Stop order SELL
        if (order.getBear() && !candles[0].isBuyerMaker && !candles[1].isBuyerMaker && currentPrice < order.getProfit()
            && !order.getTrading()) {
            console.log(`${pair}: Stop order SELL`)
            order.setTrading(true)
            await this.stopSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL, order.getSizeSL())
            order.setBear(false)
            //order.setRelax(true)
            order.setTrading(false)
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
            logStart(pair, currentPrice, quantity, orderSide, takeProfits[0].price, stopLoss)
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