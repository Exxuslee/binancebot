import { EMA } from 'technicalindicators';
import {getCandleSourceType} from "../../utils/currencyInfo";

interface Options {
  sourceType?: SourceType;
  period?: number;
}

const defaultOptions: Options = {
  sourceType: 'close',
  period: 14,
};

export function calculate(candles: CandleRage[], options?: Options) {
  options = { ...defaultOptions, ...options };
  let values = getCandleSourceType(candles, options.sourceType);

  return EMA.calculate({
    values,
    period: options.period,
  });
}
