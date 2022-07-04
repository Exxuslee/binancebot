import { CandleChartInterval } from 'binance-api-node';
import { Basics } from '../strategies/entry';
import { Fibonacci } from '../indicators';
import { basicExitStrategy } from '../strategies/exit';
import { getPositionSizeByPercent } from '../strategies/riskManagement';

// =========================== PRESETS ================================== //

// SHAD investment strategy
// @see https://thecoinacademy.co/altcoins/shad-strategy-a-trading-and-investment-strategy-for-the-crypto-market/

// ====================================================================== //

const assets = [
  'ETH',
  'BNB',
  'SOL',
  'AVAX',
  'ONE',
  'FTM',
  'ATOM',
  'NEAR',
  'GALA',
  'SAND',
];

export const hyperParameters = {};

export const config: AbstractStrategyConfig = (parameters) =>
  assets.map((asset) => ({
    asset,
    base: 'USDT',
    risk: 0.01,
    loopInterval: CandleChartInterval.ONE_MINUTE,
    indicatorIntervals: [CandleChartInterval.FIVE_MINUTES],
    trendFilter: (candles) => 1, // Take only long position, supposing we are in up trend on long term
    riskManagement: getPositionSizeByPercent,
    exitStrategy: (price, candles, pricePrecision, side, exchangeInfo) =>
    basicExitStrategy(price, pricePrecision, side, exchangeInfo, {
        profitTargets: [
          {
            deltaPercentage: 1, // x2
            quantityPercentage: 0.5,
          },
          {
            deltaPercentage: 3, // x4
            quantityPercentage: 0.25,
          },
          {
            deltaPercentage: 7, // x8
            quantityPercentage: 0.125,
          },
          {
            deltaPercentage: 15, // x16
            quantityPercentage: 0.0625,
          },
          {
            deltaPercentage: 31, // x32
            quantityPercentage: 0.0625,
          },
        ],
      }),
    buyStrategy: (candles) =>
      Basics.RELOAD_ZONE.isBuySignal(candles[CandleChartInterval.ONE_HOUR], {
        trend: Fibonacci.FibonacciTrend.UP,
      }),
    sellStrategy: (candles: CandleData[]) => false,
  }));
