import {CandleChartInterval} from "binance-api-node";
import {getPositionSizeByPercent} from "../strategies/risk";
import {deltaExitStrategy} from "../strategies/exit";
import {DELTA} from "../strategies/entry";


const assets = [
    'BTC'
];

export const hyperParameters = {};

export const config: AbstractStrategyConfig = (hyperParameters) =>
    assets.map((asset) => ({
        asset,
        base: 'USDT',
        risk: 0.05,
        //leverage: 0.0375,
        // leverage: 0.0002, профит 2,6% за 2 часа
        // leverage: 0.00025, профит 3.1% за 2 часа
        // 0.0003 чаще по стоп лосам в эфире выбивает
        leverage: 0.0004,
        loopInterval: CandleChartInterval.ONE_MINUTE,
        indicatorIntervals: [CandleChartInterval.FIVE_MINUTES],
        exitStrategy: (price, candles,   pricePrecision, side, exchangeInfo) =>
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


