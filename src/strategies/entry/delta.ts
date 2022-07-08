import {CrossDown} from 'technicalindicators';
import {EMA, SMA, WEMA, WMA} from '../../indicators';

interface Options {
    maPeriod?: number;
    maType?: MAType;
}

const defaultOptions: Options = {
    maPeriod: 10,
    maType: 'WMA',
};

const getMAClass = (type: MAType) =>
    type === 'SMA' ? SMA : type === 'EMA' ? EMA : type === 'WMA' ? WMA : WEMA;

/**
 * Return true if the last candle crosses up the MA
 */
export const isBuySignal = (
    candles: CandleRage[],
    options = defaultOptions
) => {
    if (candles.length < options.maPeriod) return false;

    const ma = getMAClass(options.maType);
    const values = ma.calculate(candles.reverse(), {
        period: options.maPeriod,
    });

    let bull1 = !candles[0].isBuyerMaker && !candles[1].isBuyerMaker
    let bull2 = values[values.length - 1] > candles[0].close
    let bull3 = values[values.length - 1] > candles[1].close

    return bull1 && bull2 && bull3;


};

/**
 * Return true if the last candle crosses down the MA
 */
export const isSellSignal = (
    candles: CandleRage[],
    options = defaultOptions
) => {
    if (candles.length < options.maPeriod) return false;

    const ma = getMAClass(options.maType);
    const values = ma.calculate(candles.reverse(), {
        period: options.maPeriod,
    });

    let bear1 = candles[0].isBuyerMaker && candles[1].isBuyerMaker
    let bear2 = values[values.length - 1] < candles[0].close
    let bear3 = values[values.length - 1] < candles[1].close
    return bear1 && bear2 && bear3
};
