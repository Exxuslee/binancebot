import {ExchangeInfo, OrderSide, OrderType} from 'binance-api-node';
import {error, log} from './utils/log';
import {binanceClient} from './init';
import {Telegram} from './telegram';
import dayjs from 'dayjs';
import {Balance} from "./interactor/Balance";
import {Candles} from "./interactor/Candles";
import Emittery from "emittery";
import {Order} from "./interactor/Order";
import {getPricePrecision, getQuantityPrecision} from "./utils/currencyInfo";
import {decimalFloor} from "./utils/math";

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
        this.strategyConfigs.forEach((strategyConfig) => {
            const pair = strategyConfig.asset + strategyConfig.base;
            log(`The bot trades the pair ${pair}`);
            let pairBalance: PairBalance = {
                b1: this.balance.bCurrent(strategyConfig.asset),
                b2: this.balance.bCurrent(strategyConfig.base),
                runningBase: this.strategyConfigs.length
            }
            let candles = new Candles(emitter, strategyConfig.leverage)
            let order = new Order()
            // Precision
            const pricePrecision = getPricePrecision(pair, this.exchangeInfo);
            const quantityPrecision = getQuantityPrecision(pair, this.exchangeInfo);
            let currentPrice: number
            binanceClient.ws.aggTrades(pair, AggregatedTrade => {
                currentPrice = Number(AggregatedTrade.price)
                candles.update(AggregatedTrade)
            })
            emitter.on(pair, candlesArray => {
                    const tiltMA = false

                    if (!order.hasPosition() && !tiltMA && strategyConfig.buyStrategy(candles)) {
                        const pricePrecision = getPricePrecision(pair, this.exchangeInfo);
                        // Calculate TP and SL
                        let {takeProfits, stopLoss} = strategyConfig.exitStrategy
                            ? strategyConfig.exitStrategy(
                                currentPrice,
                                candles,
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
                                ? Number(pairBalance.b1)
                                : Number(pairBalance.b2),
                            risk: strategyConfig.risk,
                            enterPrice: currentPrice,
                            stopLossPrice: stopLoss,
                            exchangeInfo: this.exchangeInfo
                        });

                        order.newOrder(
                            binanceClient,
                            pair,
                            String(quantity),
                            OrderSide.BUY,
                            OrderType.MARKET
                        ).then(() => {
                            if (takeProfits.length > 0) {
                                // Create the take profit orders
                                takeProfits.forEach(({price, quantityPercentage}) => {
                                    order.newOrder(
                                        binanceClient,
                                        pair,
                                        String(decimalFloor(quantity * quantityPercentage, quantityPrecision)
                                        ),
                                        OrderSide.SELL,
                                        OrderType.LIMIT,
                                        price).catch(error);
                                });
                            }

                            if (stopLoss) {
                                if (takeProfits.length > 1) {
                                    binanceClient
                                        .futuresOrder({
                                            side: OrderSide.SELL,
                                            type: OrderType.STOP_MARKET,
                                            symbol: pair,
                                            stopPrice: stopLoss,
                                            closePosition: 'true',
                                        })
                                        .catch(error);
                                } else {
                                    binanceClient
                                        .futuresOrder({
                                            side: OrderSide.SELL,
                                            type: OrderType.STOP,
                                            symbol: pair,
                                            stopPrice: stopLoss,
                                            price: stopLoss,
                                            quantity: String(quantity),
                                        })
                                        .catch(error);
                                }
                            }

                            logBuySellExecutionOrder(
                                OrderSide.BUY,
                                asset,
                                base,
                                currentPrice,
                                quantity,
                                takeProfits,
                                stopLoss
                            );
                        }).catch(error);
                    } else if (!order.hasPosition() && !tiltMA && strategyConfig.sellStrategy(candles)) {
                        //TODO
                    }

                }
            )
            ;
        });
    }
}