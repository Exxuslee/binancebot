import {ExchangeInfo} from 'binance-api-node';
import {log} from './utils/log';
import {binanceClient} from './init';
import {Telegram} from './telegram';
import dayjs from 'dayjs';
import {Balance} from "./interactor/Balance";
import {View} from "./interactor/View";
import Emittery from "emittery";
import {Order} from "./interactor/Order";
import {getPricePrecision, getQuantityPrecision} from "./utils/currencyInfo";
import {trade} from "./interactor/trade";

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
            log(`The bot trades the pair ${pair}`);
            let pairBalance: PairBalance = {
                b1: this.balance.bCurrent(strategyConfig.asset),
                b2: this.balance.bCurrent(strategyConfig.base),
                runningBase: this.strategyConfigs.length
            }
            let view = new View(emitter, strategyConfig.leverage)
            let order = new Order()
            // Precision
            const pricePrecision = getPricePrecision(pair, this.exchangeInfo);
            const quantityPrecision = getQuantityPrecision(pair, this.exchangeInfo);
            binanceClient.ws.aggTrades(pair, AggregatedTrade => view.update(AggregatedTrade))
            emitter.on(pair, candlesArray => {
                trade(candlesArray.dataCandles,
                    strategyConfig,
                    pricePrecision,
                    quantityPrecision,
                    pair,
                    order,
                    candlesArray.currentPrice,
                    pairBalance,
                    this.exchangeInfo,
                )
            })
        })
    }
}