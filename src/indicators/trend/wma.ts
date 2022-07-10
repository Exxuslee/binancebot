import {WMA} from 'technicalindicators';
import {getCandleSourceType} from "../../utils/currencyInfo";

interface Options {
    sourceType?: SourceType;
    period?: number;
}

const defaultOptions: Options = {
    sourceType: 'close',
    period: 12,
};

export function calculate(candles: CandleRage[], options?: Options) {
    options = {...defaultOptions, ...options};
    let values = getCandleSourceType(candles, options.sourceType);
    return WMA.calculate({values, period: options.period,})
}
