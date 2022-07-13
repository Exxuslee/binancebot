import {ExchangeInfo, OrderSide} from 'binance-api-node';
import {error, log, logStart, logStop, logStopLose} from '../utils/log';
import {binanceClient} from '../init';
import {Telegram} from '../telegram';
import dayjs from 'dayjs';
import {Balance} from "./Balance";
import {View} from "./View";
import Emittery from "emittery";
import {Order} from "./Order";
import {getPricePrecision, validPrice, validQuantity} from "../utils/currencyInfo";
import {sendDailyResult} from "../telegram/message";
import {Counter} from "./Counter";

export class Bot {
    private strategyConfigs: StrategyConfig[];
    private telegram: Telegram;
    private balance: Balance
    private exchangeInfo: ExchangeInfo;
    private hasOpenPosition: { [pair: string]: boolean };
    private currentHour: number;
    private currentDay: string;
    private currentMonth: string;
    private bit: boolean
    private counters: { [symbol: string]: Counter };

    constructor(tradeConfigs: StrategyConfig[]) {
        this.strategyConfigs = tradeConfigs;
        this.hasOpenPosition = {};
        this.currentHour = Number(dayjs(Date.now()).format('HH'))
        this.currentDay = dayjs(Date.now()).format('DD/MM/YYYY');
        this.currentMonth = dayjs(Date.now()).format('MM/YYYY');
        this.bit = true
        this.counters = {};
    }

    public async run() {
        log('============ 💵 BINANCE BOT TRADING 💵 ============');
        this.telegram = new Telegram()
        this.balance = new Balance()
        this.exchangeInfo = await binanceClient.exchangeInfo();
        const emitter = new Emittery();
        await this.balance.init()
        this.strategyConfigs.forEach((strategyConfig) => {
            const pair = strategyConfig.asset + strategyConfig.base;
            let b1 = this.balance.bCurrent(strategyConfig.asset).toFixed(4)
            let b2 = this.balance.bCurrent(strategyConfig.base).toFixed(0)
            log(`Trades ${pair}:\t${b1}\t${b2}$`);
            let view = new View(emitter, strategyConfig.leverage)
            let order = new Order()
            this.counters[pair] = new Counter();
            order.closeOpenOrders(pair)
            binanceClient.ws.aggTrades(pair, AggregatedTrade => view.update(AggregatedTrade))
            emitter.on(pair, message => {
                this.trade(message.dataCandles, strategyConfig, pair, order, message.currentPrice,)
            })
        })
    }

    async trade(candles, strategyConfig, pair, order, currentPrice) {
        //Log
        //if (order.getBull() || order.getBear()) {}
        let tempSlow = ''
        candles.map(asd => tempSlow += asd.isBuyerMaker ? '0' : '1')
        let volume = candles[0].volume
        log(`${pair} ${tempSlow}\t${currentPrice}   \t${volume.toFixed(2)}`)


        /** Clear BUY by stop-loss */
        // if (order.getBull() && order.getPriceSL() > currentPrice && !order.getTrading()) {
        //     logStopLose(pair, currentPrice, OrderSide.BUY, order.getPriceStart())
        //     this.counters[pair].add(currentPrice, order.getPriceStart())
        //     //order.setRelax(true)
        //     order.setBull(false)
        // }

        /** Clear SELL by stop-loss */
        // if (order.getBear() && order.getPriceSL() < currentPrice && !order.getTrading()) {
        //     logStopLose(pair, currentPrice, OrderSide.SELL, order.getPriceStart())
        //     this.counters[pair].add(order.getPriceStart(), currentPrice)
        //     //order.setRelax(true)
        //     order.setBear(false)
        // }

        /** Clear BUY by takeProfit */
        if (order.getBull() && order.getPriceTP() < currentPrice && !order.getTrading()) {
            await order.closeOpenOrders(pair).catch(error);
            logStop(pair, currentPrice, OrderSide.BUY, order.getPriceStart())
            this.counters[pair].add(currentPrice, order.getPriceStart())
            order.setBull(false)
        }

        /** Clear SELL by takeProfit */
        if (order.getBear() && order.getPriceTP() > currentPrice && !order.getTrading()) {
            await order.closeOpenOrders(pair).catch(error);
            logStop(pair, currentPrice, OrderSide.SELL, order.getPriceStart())
            this.counters[pair].add(order.getPriceStart(), currentPrice)
            order.setBear(false)
        }

        /** Stop order BUY */
        // if (order.getBull() && candles[0].isBuyerMaker && candles[1].isBuyerMaker && currentPrice > order.getProfit()
        if (order.getBull() && !order.getTrading())
            if (candles[0].isBuyerMaker && candles[1].isBuyerMaker) {
                //console.log(`${pair}: Stop order BUY`)
                order.setTrading(true)
                await this.stopSignal(pair, order, OrderSide.SELL, order.getSizeSL())
                //order.setBull(false)
                //order.setRelax(true)
                this.counters[pair].add(currentPrice, order.getPriceStart())
                //order.setReport(true)
                order.setTrading(false)
            }


        /**Stop order SELL */
        // if (order.getBear() && currentPrice < order.getProfit() && !order.getTrading() && !candles[0].isBuyerMaker && candles[1].isBuyerMaker
        if (order.getBear() && !order.getTrading())
            if (!candles[0].isBuyerMaker && !candles[1].isBuyerMaker) {
                //console.log(`${pair}: Stop order SELL`)
                order.setTrading(true)
                await this.stopSignal(pair, order, OrderSide.BUY, order.getSizeSL())
                //order.setBear(false)
                //order.setRelax(true)
                this.counters[pair].add(order.getPriceStart(), currentPrice)
                //order.setReport(true)
                order.setTrading(false)
            }

        /** Ready to start */
        if (!order.getBull() && !order.getBear() && !order.getTrading()) {

            /** Start order BUY */
            if (strategyConfig.buyStrategy(candles) && !order.getRelax()) {
                if (order.getRelax()) {
                    console.log(`${pair}: Not start order BUY - relax `)
                    //order.setRelax(false)
                } else {
                    //console.log(`${pair}: Start order BUY`)
                    order.setTrading(true)
                    let bit = await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.BUY)
                    //order.setBull(bit)
                    order.setTrading(false)
                }
            }

            /** Start order SELL */
            if (strategyConfig.sellStrategy(candles) && !order.getRelax()) {
                if (order.getRelax()) {
                    console.log(`${pair}: Not start order SELL - relax `)
                    order.setRelax(false)
                } else {
                    //console.log(`${pair}: Start order SELL`)
                    order.setTrading(true)
                    let bit = await this.startSignal(candles, strategyConfig, pair, order, currentPrice, OrderSide.SELL)
                    //order.setBear(bit)
                    order.setTrading(false)
                }
            }
        }

        /**Report */
        await this.report(candles, strategyConfig, order, pair)

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
            exchangeInfo: this.exchangeInfo
        });
        quantity = validQuantity(quantity, pair, this.exchangeInfo)
        stopLoss = validPrice(stopLoss)
        takeProfits = validPrice(takeProfits)

        let bit = await order.marketStart(binanceClient, pair, quantity, orderSide, currentPrice, 50).catch(error)
        if (bit) {
            //await order.stopLose(binanceClient, pair, quantity, reverseOrder, stopLoss)
            await order.takeProfit(binanceClient, pair, quantity, reverseOrder, takeProfits)
            //order.setPriceStart(currentPrice)
            //order.newOrderStart(binanceClient, pair, quantity, reverseOrder, OrderType.STOP_LOSS_LIMIT, stopLoss, 0).catch(error);
            logStart(pair, order.getPriceStart(), quantity, orderSide, stopLoss)
        }
        return bit
    }

    async stopSignal(pair, order, orderSide, quantity) {
        quantity = validQuantity(quantity, pair, this.exchangeInfo)
        await order.stop(binanceClient, pair, quantity, orderSide).then(() => {
            logStop(pair, order.getPriceStop(), orderSide, order.getPriceStart())
        }).catch(err => {
            error(err)
            error(quantity)
        });
        await order.closeOpenOrders(pair).catch(error);
    }

    async report(candles, strategyConfig, order, pair) {
        // Day change ?
        let candleDay = dayjs(new Date(candles[0].closeTime)).format('DD/MM/YYYY');
        if (candleDay !== this.currentDay) {
            let hour = Number(dayjs(Date.now()).format('HH'));
            if (hour > 6) {
                await this.balance.updateCurrent()
                sendDailyResult(this.telegram, this.balance, strategyConfig.asset, this.counters[pair].getCounter());
                this.currentDay = candleDay;
                this.balance.updateDay()
                this.counters[pair].reset();
            }
        }
        let hour = Number(dayjs(Date.now()).format('HH'));
        if (hour > this.currentHour) {
            sendDailyResult(this.telegram, this.balance, strategyConfig.asset, this.counters[pair].getCounter());
            this.currentHour = hour
        }
    }
}