import {AggregatedTrade} from 'binance-api-node';
import Emittery from "emittery";


export class View {
    private emitter: Emittery;
    private candleRageSlow: CandleRage[] = []
    private currentRageSlow: CandleRage
    private readonly rageSlow: number
    private readonly rageFast: number

    constructor(emitter: Emittery, rage: number) {
        this.emitter = emitter
        this.rageSlow = rage
        this.rageFast = rage * 0.75
    }

    update(aggTrade: AggregatedTrade) {
        if (this.currentRageSlow === undefined) this.initSlow(aggTrade)
        let current = Number(aggTrade.price)

        //Slow
        if (current > this.currentRageSlow.low + this.currentRageSlow.rage) {
            // new candle
            // no high || low candle
            this.currentRageSlow.close = this.currentRageSlow.low + this.currentRageSlow.rage
            this.currentRageSlow.isBuyerMaker = false
            this.currentRageSlow.high = this.currentRageSlow.low + this.currentRageSlow.rage
            if (current < this.currentRageSlow.low) this.currentRageSlow.low = current
            this.finishSlow(aggTrade)
        } else if (current < this.currentRageSlow.high - this.currentRageSlow.rage) {
            // new candle
            this.currentRageSlow.close = this.currentRageSlow.high - this.currentRageSlow.rage
            this.currentRageSlow.isBuyerMaker = true
            this.currentRageSlow.low = this.currentRageSlow.high - this.currentRageSlow.rage
            this.finishSlow(aggTrade)
        } else {
            // old candle
            // no high || low candle
            this.currentRageSlow.aggTrades++
            this.currentRageSlow.trades += aggTrade.lastId - aggTrade.lastId + 1
            if (current > this.currentRageSlow.high) this.currentRageSlow.high = current
            if (current < this.currentRageSlow.low) this.currentRageSlow.low = current
            this.currentRageSlow.volume += Number(aggTrade.quantity)
            this.currentRageSlow.close = current
            this.currentRageSlow.isBuyerMaker = this.currentRageSlow.open > current;
            if (current > this.currentRageSlow.high) this.currentRageSlow.high = current
            if (current < this.currentRageSlow.low) this.currentRageSlow.low = current
        }

    }

    private initSlow(aggTrade: AggregatedTrade) {
        let percent = Number(aggTrade.price) * this.rageSlow

        this.currentRageSlow = {
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


    private finishSlow(aggTrade) {
        this.currentRageSlow.closeTime = new Date(aggTrade.timestamp)
        this.candleRageSlow.unshift(this.currentRageSlow)
        this.initSlow(aggTrade)
        if (this.candleRageSlow.length > 12) {
            this.emitter.emit(aggTrade.symbol, {
                dataCandles: this.candleRageSlow,
                currentPrice: Number(aggTrade.price)
            })
            this.candleRageSlow.pop()
        }
    }

}

