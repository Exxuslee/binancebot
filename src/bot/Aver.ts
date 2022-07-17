import {AggregatedTrade} from 'binance-api-node';
import Emittery from "emittery";

const len = 12

export class Aver {
    private emitter: Emittery;
    private candleRageSlow: CandleRage[] = []
    private currentCandle: CandleRage
    private readonly rageSlow: number

    constructor(emitter: Emittery, rage: number) {
        this.emitter = emitter
    }

    update(aggTrade: AggregatedTrade) {
        let price = Number(aggTrade.price)
        if (this.currentCandle === undefined) this.initSlow(aggTrade)

        ++this.currentCandle.rage
        if (this.currentCandle.high < price) this.currentCandle.high = price
        if (this.currentCandle.low > price) this.currentCandle.low = price
        if (aggTrade.isBuyerMaker) --this.currentCandle.trades
        else ++this.currentCandle.trades
        this.currentCandle.volume += Number(aggTrade.quantity)

        if (this.currentCandle.rage > 0) this.finishSlow(aggTrade)

    }

    private initSlow(aggTrade
                         :
                         AggregatedTrade
    ) {

        this.currentCandle = {
            symbol: aggTrade.symbol,
            openTime: new Date(aggTrade.timestamp),
            closeTime: undefined,
            trades: 0,
            aggTrades: 0,
            rage: 0,
            open: Number(aggTrade.price),
            high: Number(aggTrade.price),
            low: Number(aggTrade.price),
            close: Number(aggTrade.price),
            isBuyerMaker: false,
            volume: 0,
        }
    }

    private finishSlow(aggTrade) {
        this.currentCandle.closeTime = new Date(aggTrade.timestamp)
        this.currentCandle.close = aggTrade.price
        this.currentCandle.isBuyerMaker = this.currentCandle.trades <= 0;
        //console.log('finishSlow', this.currentCandle.isBuyerMaker)
        //if (this.currentCandle.volume.toFixed(2) != '0.00') this.candleRageSlow.unshift(this.currentCandle)
        this.candleRageSlow.unshift(this.currentCandle)
        this.initSlow(aggTrade)
        if (this.candleRageSlow.length > len) {
            this.emitter.emit(aggTrade.symbol, {
                dataCandles: this.candleRageSlow,
                currentPrice: Number(aggTrade.price)
            }).then(() => true)
            this.candleRageSlow.pop()
        }
    }

}

