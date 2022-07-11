import {CandleChartInterval} from "binance-api-node";
import {getPositionSizeByPercent} from "../strategies/risk";
import {deltaExitStrategy} from "../strategies/exit";
import {DELTA} from "../strategies/entry";


const assets = [
    'BTC',
    'ETH'
];

export const hyperParameters = {};

export const config: AbstractStrategyConfig = (hyperParameters) =>
    assets.map((asset) => ({
        asset,
        base: 'USDT',
        risk: 0.15,
        //leverage: 0.0375,
        // leverage: 0.002,
        leverage: 0.00037,
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
        buyStrategy: (candles) => DELTA.isBuySignal(candles),
        sellStrategy: (candles) => DELTA.isSellSignal(candles),
        riskManagement: getPositionSizeByPercent,
    }));


