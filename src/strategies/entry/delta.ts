import {EMA, SMA, WEMA, WMA} from '../../indicators';
import {error} from "../../utils/log";

interface Options {
    maPeriod?: number;
    maType?: MAType;
}

const defaultOptions: Options = {
    maPeriod: 11,
    maType: 'WMA',
};

const getMAClass = (type: MAType) =>
    type === 'SMA' ? SMA : type === 'EMA' ? EMA : type === 'WMA' ? WMA : WEMA;

export const isBuySignal = (
    candles: CandleRage[],
    options = defaultOptions
) => {
    if (candles.length < options.maPeriod) {
        error('candles.length < options.maPeriod')
        return false;
    }
    let reverseBull: CandleRage[] = JSON.parse(JSON.stringify(candles));
    const ma = getMAClass(options.maType);
    const values = ma.calculate(reverseBull.reverse(), {
        period: options.maPeriod,
    });

    let bull1: boolean = !candles[0].isBuyerMaker && !candles[1].isBuyerMaker
    let bull2: boolean = values[values.length - 1] > candles[0].high
    let bull3: boolean = values[values.length - 1] > candles[1].high

    if (bull1) console.log('isBuySignal', values[values.length - 1], candles[0].high, candles[1].high)
    return bull1 && bull2 && bull3;


};

export const isSellSignal = (
    candles: CandleRage[],
    options = defaultOptions
) => {
    if (candles.length < options.maPeriod) {
        error('candles.length < options.maPeriod')
        return false;
    }
    let reverseBear: CandleRage[] = JSON.parse(JSON.stringify(candles));
    const ma = getMAClass(options.maType);
    const values = ma.calculate(reverseBear.reverse(), {
        period: options.maPeriod,
    });

    let bear1: boolean = candles[0].isBuyerMaker && candles[1].isBuyerMaker
    let bear2: boolean = values[values.length - 1] < candles[0].low
    let bear3: boolean = values[values.length - 1] < candles[1].low

    if (bear1) console.log('isSellSignal', values[values.length - 1], candles[0].low, candles[1].low)
    return bear1 && bear2 && bear3
};
