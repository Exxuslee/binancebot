import { Binance, CandleChartInterval } from 'binance-api-node';

/**
 * Load the candle data for a specific time frame (or interval) from the binance api
 * @param symbol
 * @param interval
 * @param binanceClient
 * @param removeLastCandle
 */
export function loadCandlesFromAPI(
  symbol: string,
  interval: CandleChartInterval,
  binanceClient: Binance,
  removeLastCandle = true
) {
  return new Promise<CandleData[]>((resolve, reject) => {
    binanceClient
      .futuresCandles({ symbol, interval })
      .then((candles) => {
        resolve(
          candles
            .slice(0, removeLastCandle ? -1 : candles.length)
            .map((candle) => ({
              symbol,
              interval,
              open: Number(candle.open),
              high: Number(candle.high),
              low: Number(candle.low),
              close: Number(candle.close),
              volume: Number(candle.volume),
              openTime: new Date(candle.openTime),
              closeTime: new Date(candle.closeTime),
            }))
        );
      })
      .catch(reject);
  });
}


/**
 * Load the candle data from binance api for all the time frames needed for the strategy
 * @param symbol
 * @param timeFrames
 * @param binanceClient
 * @param removeLastCandle
 */
export async function loadCandlesMultiTimeFramesFromAPI(
  symbol: string,
  timeFrames: CandleChartInterval[],
  binanceClient: Binance,
  removeLastCandle?: boolean
): Promise<CandlesDataMultiTimeFrames> {
  let loadTimeFrames: Promise<{
    timeFrame: CandleChartInterval;
    candles: CandleData[];
  }>[] = [];

  timeFrames.forEach((timeFrame: CandleChartInterval) => {
    loadTimeFrames.push(
      new Promise<{ timeFrame: CandleChartInterval; candles: CandleData[] }>(
        (resolve, reject) => {
          loadCandlesFromAPI(symbol, timeFrame, binanceClient, removeLastCandle)
            .then((candles) => {
              resolve({ timeFrame, candles });
            })
            .catch(reject);
        }
      )
    );
  });

  return (await Promise.all(loadTimeFrames)).reduce((data, value) => {
    data[value.timeFrame] = value.candles;
    return data;
  }, {});
}

/**
 * Get the data from candles
 * @param candles
 * @param sourceType
 */
export function getCandleSourceType(
  candles: CandleData[],
  sourceType: SourceType
) {
  switch (sourceType) {
    case 'open':
      return candles.map((c) => c.open);
    case 'high':
      return candles.map((c) => c.high);
    case 'low':
      return candles.map((c) => c.low);
    case 'close':
      return candles.map((c) => c.close);
    case 'hl2':
      return candles.map((c) => (c.high + c.low) / 2);
    case 'hlc3':
      return candles.map((c) => (c.high + c.low + c.close) / 3);
    case 'hlcc4':
      return candles.map((c) => (c.high + c.low + c.close * 2) / 4);
    case 'volume':
      return candles.map((c) => c.volume);
    default:
      return candles.map((c) => c.close);
  }
}
