import {getPricePrecision} from "../utils/currencyInfo";
import {OrderSide, OrderType} from "binance-api-node";
import {binanceClient} from "../init";
import {decimalFloor} from "../utils/math";
import {error, logBuySellExecutionOrder} from "../utils/log";


export function trade(candlesArray, strategyConfig, pricePrecision, quantityPrecision, pair, candles, order, currentPrice, pairBalance) {
    const tiltMA = false
    if (!order.hasPosition() && !tiltMA && strategyConfig.buyStrategy(candles)) {
        const pricePrecision = getPricePrecision(pair, this.exchangeInfo);
        // Calculate TP and SL
        let {takeProfits, stopLoss} = strategyConfig.exitStrategy
            ? strategyConfig.exitStrategy(
                currentPrice,
                candles,
                pricePrecision,
                OrderSide.BUY,
                this.exchangeInfo
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
            exchangeInfo: this.exchangeInfo
        });

        order.newOrder(binanceClient, pair, String(quantity), OrderSide.BUY, OrderType.MARKET).then(() => {
            if (takeProfits.length > 0) {
                // Create the take profit orders
                takeProfits.forEach(({price, quantityPercentage}) => {
                    // TODO TAKE_PROFIT_LIMIT
                    order.newOrder(binanceClient, pair, String(decimalFloor(quantity * quantityPercentage, quantityPrecision)), OrderSide.SELL, OrderType.LIMIT, price).catch(error);
                });
            }
            order.newOrder(binanceClient, pair, String(quantity), OrderSide.SELL, OrderType.LIMIT, stopLoss).catch(error);
            logBuySellExecutionOrder(OrderSide.BUY, strategyConfig.asset, strategyConfig.base, currentPrice, quantity, takeProfits, stopLoss);
        }).catch(error);
    } else if (!order.hasPosition() && !tiltMA && strategyConfig.sellStrategy(candles)) {
        //TODO
    }
}