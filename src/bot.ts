import {ExchangeInfo} from 'binance-api-node';
import {log} from './utils/log';
import {binanceClient} from './init';
import {Telegram} from './telegram';
import dayjs from 'dayjs';
import {Balance} from "./interactor/Balance";
import {Candles} from "./interactor/Candles";
import {trade} from "./interactor/Trade";
import Emittery from "emittery";

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

        // let pairs = []
        // this.strategyConfigs.forEach((strategyConfig) =>
        //     pairs.push(strategyConfig.asset + strategyConfig.base))
        // console.log(pairs)
        // binanceClient.ws.aggTrades(pairs, trade => {
        //     console.log(trade)
        // })
        const emitter = new Emittery();
        this.strategyConfigs.forEach((strategyConfig) => {
            const pair = strategyConfig.asset + strategyConfig.base;
            log(`The bot trades the pair ${pair}`);

            let candles = new Candles(emitter)
            binanceClient.ws.aggTrades(pair, AggregatedTrade => {
                candles.update(AggregatedTrade)
            })
            emitter.on(pair, data => {
                console.log(data)
                //trade(strategyConfig, data)
            });
        });
    }
}