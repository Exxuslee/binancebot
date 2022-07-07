import {CandleChartInterval} from "binance-api-node";
import {getPositionSizeByPercent, getPositionSizeByRisk} from "../strategies/risk";
import {basicExitStrategy, highLowExitStrategy} from "../strategies/exit";
import {RSI, STOCHASTIC_RSI} from "../strategies/entry";
import {MAX_LOADED_CANDLE_LENGTH_API} from "../init";


const assets = [
    'ETH',
    // 'BTC',
    // 'BNB',
];

export const hyperParameters = {};

export const config: AbstractStrategyConfig = (parameters) =>
    assets.map((asset) => ({
        asset,
        base: 'USDT',
        risk: 0.01,
        leverage: 0.0375,
        loopInterval: CandleChartInterval.ONE_MINUTE,
        indicatorIntervals: [CandleChartInterval.FIVE_MINUTES],
        exitStrategy: (price, candles, pricePrecision, side, exchangeInfo) =>
            highLowExitStrategy(
                price,
                candles[CandleChartInterval.ONE_HOUR],
                pricePrecision,
                side,
                exchangeInfo,
                {
                    takeProfitRatio: 2,
                    lookBack: 14,
                    side,
                }
            ),
        buyStrategy: (candles) =>
            RSI.isBuySignal(candles, {
                rsiPeriod: parameters.rsiPeriod.value,
                rsiOversold: parameters.rsiOversold.value,
            }),
        sellStrategy: (candles) =>
            RSI.isSellSignal(candles, {
                rsiPeriod: parameters.rsiPeriod.value,
                rsiOverbought: parameters.rsiOverbought.value,
            }),
        riskManagement: getPositionSizeByPercent,
    }));

