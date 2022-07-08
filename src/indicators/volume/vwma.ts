import { SMA } from 'technicalindicators';

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
  let volume = candles.map((c) => c.volume);

  let sma1 = SMA.calculate({ period: options.period, values: volume });
  let sma2 = SMA.calculate({ period: options.period, values: volume });

  let result: number[] = new Array(sma1.length);
  for (let i = 0; i < sma1.length; i++) {
    result[i] = sma1[i] / sma2[i];
  }

  return result;
}
