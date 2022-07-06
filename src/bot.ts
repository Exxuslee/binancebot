import {ExchangeInfo} from 'binance-api-node';
import {log} from './utils/log';
import {binanceClient} from './init';
import {Telegram} from './telegram';
import dayjs from 'dayjs';
import {Balance} from "./interactor/Balance";
import {Candles} from "./interactor/Candles";
import Emittery from "emittery";
import {trade} from "./interactor/Trade";

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

            let candles = new Candles(emitter, strategyConfig.leverage)
            let currentPrice: number
            binanceClient.ws.aggTrades(pair, AggregatedTrade => {
                currentPrice = Number(AggregatedTrade.price)
                candles.update(AggregatedTrade)
            })
            emitter.on(pair, data => {
                trade(strategyConfig, data.data, data.currentPrice)
            });
        });
    }
}