import {AggregatedTrade} from 'binance-api-node';
import Emittery from "emittery";


export class Candles {
    private emitter: Emittery;
    private candleRage: CandleRage[] = []
    private currentRage: CandleRage
    private readonly rage: number

    constructor(emitter: Emittery, rage: number) {
        this.emitter = emitter
        this.rage = rage
    }

    update(aggTrade: AggregatedTrade) {
        if (this.currentRage === undefined) this.init(aggTrade)
        let current = Number(aggTrade.price)

        if (current > this.currentRage.low + this.currentRage.rage) {
            // new candle
            this.currentRage.close = this.currentRage.low + this.currentRage.rage
            this.currentRage.isBuyerMaker = false
            this.finish(aggTrade)
        } else if (current < this.currentRage.high - this.currentRage.rage) {
            // new candle
            this.currentRage.close = this.currentRage.high - this.currentRage.rage
            this.currentRage.isBuyerMaker = true
            this.finish(aggTrade)
        } else {
            // old candle
            this.currentRage.aggTrades++
            this.currentRage.trades += aggTrade.lastId - aggTrade.lastId + 1
            if (current > this.currentRage.high) this.currentRage.high = current
            if (current < this.currentRage.low) this.currentRage.low = current
            this.currentRage.volume += Number(aggTrade.quantity)
            this.currentRage.close = current
            this.currentRage.isBuyerMaker = this.currentRage.open > current;
        }
    }

    private init(aggTrade: AggregatedTrade) {
        let percent = Number(aggTrade.price) * this.rage / 100

        this.currentRage = {
            symbol: aggTrade.symbol,
            openTime: new Date(aggTrade.timestamp),
            closeTime: undefined,
            trades: 0,
            aggTrades: 0,
            rage: percent,
            open: Number(aggTrade.price),
            high: Number(aggTrade.price),
            low: Number(aggTrade.price),
            close: Number(aggTrade.price),
            isBuyerMaker: false,
            volume: 0,
        }
    }

    private finish(aggTrade) {
        this.currentRage.closeTime = new Date(aggTrade.timestamp)
        this.candleRage.unshift(this.currentRage)
        this.init(aggTrade)
        if (this.candleRage.length > 21) {
            this.emitter.emit(aggTrade.symbol, this.candleRage)
            this.candleRage.pop()
        }
    }
}

