import {EMA, SMA, WEMA, WMA} from '../../indicators';
import {error, log} from "../../utils/log";

interface Options {
    maPeriod?: number;
    maType?: MAType;
}

const defaultOptions: Options = {
    maPeriod: 12,
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

    let sumVol = 0
    for (let i = 2; i < candles.length; i++) {
        sumVol = sumVol + candles[i].volume
    }
    let sumEnd = sumVol / candles.length
    let sumStart = (candles[0].volume + candles[1].volume) / 2


    let bull1: boolean = !candles[0].isBuyerMaker && !candles[1].isBuyerMaker
    let bull2: boolean = values[values.length - 1] > candles[0].high
    let bull3: boolean = values[values.length - 1] > candles[1].high
    let bull4: boolean = sumStart > sumEnd

    if (bull1 && bull2 && bull3 && !bull4) log(`Relax - ${sumStart.toFixed(2)} < ${sumEnd.toFixed(2)}`)

    //if (bull1 && bull2 && bull3) console.log('isBuySignal', values[values.length - 1], candles[0].high, candles[1].high)
    return bull1 && bull2 && bull3 && bull4;


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

    let sumVol = 0
    for (let i = 2; i < candles.length; i++) {
        sumVol = sumVol + candles[i].volume
    }
    let sumEnd = sumVol / candles.length
    let sumStart = (candles[0].volume + candles[1].volume) / 2

    let bear1: boolean = candles[0].isBuyerMaker && candles[1].isBuyerMaker
    let bear2: boolean = values[values.length - 1] < candles[0].low
    let bear3: boolean = values[values.length - 1] < candles[1].low
    let bear4: boolean = sumStart > sumEnd

    if (bear1 && bear2 && bear3 && !bear4) log(`Relax - ${sumStart.toFixed(2)} < ${sumEnd.toFixed(2)}`)

    //if (bear1 && bear2 && bear3) console.log('isSellSignal', values[values.length - 1], candles[0].low, candles[1].low)
    return bear1 && bear2 && bear3 && bear4
};
