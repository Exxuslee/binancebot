import {AggregatedTrade} from 'binance-api-node';
import Emittery from "emittery";

export class Candles {
    private emitter: Emittery;
    private candleRage: CandleRage[]

    constructor(emitter: Emittery) {
        this.emitter = emitter
    }

    update(aggregatedTrade: AggregatedTrade) {
        console.log(aggregatedTrade)
        if (this.candleRage.length === null) this.candleRage.push({
            aggTrades: 0,
            closeTime: undefined,
            isBuyerMaker: false,
            rage: 0,
            trades: 0,
            symbol: aggregatedTrade.symbol,
            open: Number(aggregatedTrade.price),
            high: Number(aggregatedTrade.price),
            low: Number(aggregatedTrade.price),
            close: Number(aggregatedTrade.price),
            volume: Number(aggregatedTrade.quantity),
            openTime: new Date(aggregatedTrade.timestamp),
        })

    }


    trend(): CandleRage[] {
        return this.candleRage;
    }
}


