import {AggregatedTrade} from 'binance-api-node';
import Emittery from "emittery";

export class Candles {
    private emitter: Emittery;
    private candleRage: CandleRage[]
    constructor(  emitter: Emittery  ) {
        this.emitter = emitter
    }

    update(aggregatedTrade: AggregatedTrade) {
        console.log(aggregatedTrade)
        let asd: CandleTime[]
        let candleTime: CandleTime
        candleTime = ({
            symbol: "string",
            open: 123,
            high: 123,
            low: 123,
            close: 123,
            volume: 123,
            openTime: Date(),
            closeTime: Date(),

        })
        asd[0] = candleTime
        this.myCallback(asd); //calling callback
    }


    trend(): CandleRage[] {
        return this.candleRage;
    }
}


