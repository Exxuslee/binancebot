import {AggregatedTrade} from 'binance-api-node';
import Emittery from "emittery";


export class Candles {
    private emitter: Emittery;
    private candleRage: CandleRage[] = []
    private readonly rage: number

    constructor(emitter: Emittery, rage: number) {
        this.emitter = emitter
        this.rage = rage
    }

    update(aggTrade: AggregatedTrade) {
        if (this.candleRage === undefined || this.candleRage.length === 0) this.init(aggTrade)
        let current = Number(aggTrade.price)


        if (current > this.candleRage[0].low + this.rage) {
            // new candle
            this.candleRage[0].closeTime = new Date(aggTrade.timestamp)
            this.candleRage[0].close = this.candleRage[0].low - this.rage
            this.candleRage[0].isBuyerMaker = false
            this.emitter.emit(aggTrade.symbol, this.candleRage.length)
            this.init(aggTrade)
            if (this.candleRage.length > 64) this.candleRage.pop()
        } else if (current < this.candleRage[0].high - this.rage) {
            // new candle
            this.candleRage[0].closeTime = new Date(aggTrade.timestamp)
            this.candleRage[0].close = this.candleRage[0].low + this.rage
            this.candleRage[0].isBuyerMaker = true
            this.emitter.emit(aggTrade.symbol, this.candleRage.length)
            this.init(aggTrade)
            if (this.candleRage.length > 64) this.candleRage.pop()
        } else {
            // old candle
            this.candleRage[0].aggTrades++
            this.candleRage[0].trades += aggTrade.lastId - aggTrade.lastId + 1
            if (current > this.candleRage[0].high) this.candleRage[0].high = current
            if (current < this.candleRage[0].low) this.candleRage[0].low = current
            this.candleRage[0].volume += Number(aggTrade.quantity)
            this.candleRage[0].close = current
            this.candleRage[0].isBuyerMaker = this.candleRage[0].open > current;
        }


    }


    trend(): CandleRage[] {
        return this.candleRage;
    }

    private init(aggTrade: AggregatedTrade) {
        this.candleRage.unshift({
            aggTrades: 0,
            closeTime: undefined,
            isBuyerMaker: false,
            rage: this.rage,
            trades: 0,
            symbol: aggTrade.symbol,
            open: Number(aggTrade.price),
            high: Number(aggTrade.price),
            low: Number(aggTrade.price),
            close: Number(aggTrade.price),
            volume: 0,
            openTime: new Date(aggTrade.timestamp),
        })
    }
}

