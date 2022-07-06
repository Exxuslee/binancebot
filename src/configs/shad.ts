import {CandleChartInterval} from 'binance-api-node';
import {basicExitStrategy} from '../strategies/exit';
import {getPositionSizeByPercent} from '../strategies/risk';
import {MAX_LOADED_CANDLE_LENGTH_API} from "../init";
import {STOCHASTIC_RSI} from "../strategies/entry";

// =========================== PRESETS ================================== //

// SHAD investment strategy
// @see https://thecoinacademy.co/altcoins/shad-strategy-a-trading-and-investment-strategy-for-the-crypto-market/

// ====================================================================== //

const assets = [
    'BTC',
    'ETH',
    'BNB',
];

export const hyperParameters = {};

export const config: AbstractStrategyConfig = (parameters) =>
    assets.map((asset) => ({
        asset,
        base: 'USDT',
        risk: 0.01,
        leverage: 0.05,
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
            STOCHASTIC_RSI.isBuySignal(
                candles[CandleChartInterval.FIFTEEN_MINUTES].slice(
                    -MAX_LOADED_CANDLE_LENGTH_API
                )
            ),
        sellStrategy: (candles: CandleTime[]) => false,
    }));
