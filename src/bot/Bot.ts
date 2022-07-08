import {ExchangeInfo, OrderSide, OrderType} from 'binance-api-node';
import {error, log, logBuySellExecutionOrder} from '../utils/log';
import {binanceClient} from '../init';
import {Telegram} from '../telegram';
import dayjs from 'dayjs';
import {Balance} from "./Balance";
import {View} from "./View";
import Emittery from "emittery";
import {Order} from "./Order";
import {getPricePrecision, getQuantityPrecision, validQuantity} from "../utils/currencyInfo";
import {decimalFloor} from "../utils/math";

export class Bot {
    private strategyConfigs: StrategyConfig[];
    private telegram: Telegram;
    private balance: Balance
    private exchangeInfo: ExchangeInfo;
    private hasOpenPosition: { [pair: string]: boolean };
    private currentDay: string;
    private currentMonth: string;

    constructor(tradeConfigs: StrategyConfig[]) {
        this.strategyConfigs = tradeConfigs;
        this.hasOpenPosition = {};
        this.currentDay = dayjs(Date.now()).format('DD/MM/YYYY');
        this.currentMonth = dayjs(Date.now()).format('MM/YYYY');
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
            // Precision
            const pricePrecision = getPricePrecision(pair, this.exchangeInfo);
            const quantityPrecision = getQuantityPrecision(pair, this.exchangeInfo);
            binanceClient.ws.aggTrades(pair, AggregatedTrade => view.update(AggregatedTrade))
            emitter.on(pair, candlesArray => {
                this.trade(candlesArray.dataCandles,
                    strategyConfig,
                    pricePrecision,
                    quantityPrecision,
                    pair,
                    order,
                    candlesArray.currentPrice,
                )
            })
        })
    }

    async trade(candlesArray, strategyConfig, pricePrecision, quantityPrecision, pair, order, currentPrice) {
        if (!order.hasPosition() && strategyConfig.buyStrategy(candlesArray)) {
            await this.buy(candlesArray, strategyConfig, pricePrecision, quantityPrecision, pair, order, currentPrice)
        }
        if (!order.hasPosition() && strategyConfig.sellStrategy(candlesArray)) {
            //TODO sell
        }
    }

    async buy(candlesArray, strategyConfig, pricePrecision, quantityPrecision, pair, order, currentPrice) {
        // Calculate TP and SL
        let {takeProfits, stopLoss} = strategyConfig.exitStrategy
            ? strategyConfig.exitStrategy(
                currentPrice,
                candlesArray,
                pricePrecision,
                OrderSide.BUY,
                this.exchangeInfo
            )
            : {takeProfits: [], stopLoss: null};
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
        log(`${pair} taker buy1 ${String(quantity)}`);
        quantity = validQuantity(quantity, pair, this.exchangeInfo)

        log(`${pair} taker buy2 ${String(quantity)}`);
        log(`${pair} taker buy3 ${String(decimalFloor(quantity, quantityPrecision))}`);

        order.newOrder(binanceClient, pair, String(decimalFloor(quantity, quantityPrecision)), OrderSide.BUY, OrderType.MARKET).then(() => {
            if (takeProfits.length > 0) {
                // Create the take profit orders
                takeProfits.forEach(({price, quantityPercentage}) => {
                    log(`${pair} sell maker profit`);
                    order.newOrder(binanceClient, pair, String(decimalFloor(quantity * quantityPercentage, quantityPrecision)), OrderSide.SELL, OrderType.LIMIT, price).catch(error);
                });
            }
            log(`${pair} sell maker stop-loss`);
            order.newOrder(binanceClient, pair, String(quantity), OrderSide.SELL, OrderType.LIMIT, stopLoss).catch(error);
            logBuySellExecutionOrder(OrderSide.BUY, strategyConfig.asset, strategyConfig.base, currentPrice, quantity, takeProfits, stopLoss);
        }).catch(error);
        console.log("Buy done")
    }

}