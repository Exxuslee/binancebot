import { ATR } from 'technicalindicators';

interface Options {
  length?: number;
}

const defaultOptions: Options = {
  length: 14,
};


export function calculate(candles: CandleRage[], options?: Options) {
  let { symbol, openTime } = candles[candles.length - 1];
  options = { ...defaultOptions, ...options };

  let high = candles.map((c) => c.high);
  let low = candles.map((c) => c.low);
  let close = candles.map((c) => c.close);

  let result: number[] = ATR.calculate({
    high,
    low,
    close,
    period: options.length,
  });

  return result;
}
