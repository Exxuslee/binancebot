import {binanceClient} from "../init";
import {getPricePrecision, getQuantityPrecision} from "../utils/currencyInfo";
import {isOnTradingSession} from "../utils/tradingSession";
import {OrderSide} from "binance-api-node";

/**
 * Main function (long/short, open/close orders)
 * @param strategyConfig
 * @param currentPrice
 * @param candles
 */
export async function trade(
    strategyConfig: StrategyConfig,
    candles: CandleRage[],
    currentPrice: number
) {
    const {
        asset,
        base,
        risk,
        buyStrategy,
        sellStrategy,
        exitStrategy,
        trendFilter,
        riskManagement,
        tradingSessions,
        canOpenNewPositionToCloseLast,
        allowPyramiding,
        maxPyramidingAllocation,
        unidirectional,
        loopInterval,
        maxTradeDuration,
    } = strategyConfig;
    const pair = asset + base;

    // Update the account info
    this.accountInfo = await binanceClient.accountInfo();

    // Balance information
    const balances = this.accountInfo;
    const {asset: assetBalance, free: availableBalance} = balances.balances.find(
        (balance) => balance.asset === base
    );

    // Open Orders
    const currentOpenOrders = await binanceClient.openOrders({
        symbol: pair,
    });

    // Check the trend
    const useLongPosition = trendFilter ? trendFilter(candles) === 1 : true;
    const useShortPosition = trendFilter ? trendFilter(candles) === -1 : true;


    // Precision
    const pricePrecision = getPricePrecision(pair, this.exchangeInfo);
    const quantityPrecision = getQuantityPrecision(pair, this.exchangeInfo);


    // Do not trade with short position if the trend is up
    if (!useShortPosition) return;


    // Calculate TP and SL
    let {takeProfits, stopLoss} = exitStrategy
        ? exitStrategy(
            currentPrice,
            candles,
            pricePrecision,
            OrderSide.SELL,
            this.exchangeInfo
        )
        : {takeProfits: [], stopLoss: null};

    // Calculate the quantity for the position according to the risk management of the strategy
    let quantity = riskManagement({
        asset,
        base,
        balance: allowPyramiding
            ? Number(assetBalance)
            : Number(availableBalance),
        risk,
        enterPrice: currentPrice,
        stopLossPrice: stopLoss,
        exchangeInfo: this.exchangeInfo,
    });


}