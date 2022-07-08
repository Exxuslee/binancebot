import {CandleChartInterval} from "binance-api-node";
import {getPositionSizeByPercent} from "../strategies/risk";
import {deltaExitStrategy, highLowExitStrategy} from "../strategies/exit";
import {RSI} from "../strategies/entry";


const assets = [
    'ETH',
    'BTC',
    'BNB',
];

export const hyperParameters = {
    takeProfitRatio: { value: 3 },
    lookBack: { value: 14 },
    rsiPeriod: { value: 14 },
    rsiOversold: { value: 30 },
    rsiOverbought: { value: 70 },
};

export const config: AbstractStrategyConfig = (hyperParameters) =>
    assets.map((asset) => ({
        asset,
        base: 'USDT',
        risk: 0.01,
        //leverage: 0.0375,
        leverage: 0.001,
        loopInterval: CandleChartInterval.ONE_MINUTE,
        indicatorIntervals: [CandleChartInterval.FIVE_MINUTES],
        exitStrategy: (price, candles, pricePrecision, side, exchangeInfo) =>
            deltaExitStrategy(
                price,
                candles,
                pricePrecision,
                side,
                exchangeInfo
            ),
        buyStrategy: (candles) =>
            RSI.isBuySignal(candles, {
                rsiPeriod: hyperParameters.rsiPeriod.value,
                rsiOversold: hyperParameters.rsiOversold.value,
            }),
        sellStrategy: (candles) =>
            RSI.isSellSignal(candles, {
                rsiPeriod: hyperParameters.rsiPeriod.value,
                rsiOverbought: hyperParameters.rsiOverbought.value,
            }),
        riskManagement: getPositionSizeByPercent,
    }));


