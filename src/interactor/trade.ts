import {getPricePrecision} from "../utils/currencyInfo";
import {OrderSide, OrderType} from "binance-api-node";
import {binanceClient} from "../init";
import {decimalFloor} from "../utils/math";
import {error, log, logBuySellExecutionOrder} from "../utils/log";


export function trade(
    candlesArray, strategyConfig, pricePrecision,
    quantityPrecision, pair, order,
    currentPrice, pairBalance, exchangeInfo
) {
    if (!order.hasPosition() && strategyConfig.buyStrategy(candlesArray)) {
        const pricePrecision = getPricePrecision(pair, exchangeInfo);
        // Calculate TP and SL
        let {takeProfits, stopLoss} = strategyConfig.exitStrategy
            ? strategyConfig.exitStrategy(
                currentPrice,
                candlesArray,
                pricePrecision,
                OrderSide.BUY,
                exchangeInfo
            )
            : {takeProfits: [], stopLoss: null};
        // Calculate the quantity for the position according to the risk management of the strategy
        let quantity = strategyConfig.riskManagement({
            asset: strategyConfig.asset,
            base: strategyConfig.base,
            balance: strategyConfig.allowPyramiding
                ? Number(pairBalance.b1)
                : Number(pairBalance.b2),
            risk: strategyConfig.risk,
            enterPrice: currentPrice,
            stopLossPrice: stopLoss,
            exchangeInfo: exchangeInfo
        });

        log(`${pair} taker buy ${String(quantity)}`);
        order.newOrder(binanceClient, pair, String(quantity), OrderSide.BUY, OrderType.MARKET).then(() => {
            if (takeProfits.length > 0) {
                // Create the take profit orders
                takeProfits.forEach(({price, quantityPercentage}) => {
                    // TODO TAKE_PROFIT_LIMIT
                    log(`${pair} sell maker profit`);
                    order.newOrder(binanceClient, pair, String(decimalFloor(quantity * quantityPercentage, quantityPrecision)), OrderSide.SELL, OrderType.LIMIT, price).catch(error);
                });
            }
            log(`${pair} sell maker stop-loss`);
            order.newOrder(binanceClient, pair, String(quantity), OrderSide.SELL, OrderType.LIMIT, stopLoss).catch(error);
            logBuySellExecutionOrder(OrderSide.BUY, strategyConfig.asset, strategyConfig.base, currentPrice, quantity, takeProfits, stopLoss);
        }).catch(error);
        console.log("Buy done")
    } else if (!order.hasPosition() && strategyConfig.sellStrategy(candlesArray)) {
        //TODO
    }
}