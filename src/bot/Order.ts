import {binanceClient} from "../init";
import {log} from "../utils/log";
import {Binance, OrderSide, OrderType} from "binance-api-node";

export class Order {
    private hasLongPosition = false;
    private hasShortPosition = false;


    async closeOpenOrders(pair: string) {
        let orders = await binanceClient.openOrders({symbol: pair})
        if (orders.length) {
            log(`Close all open orders for the pair ${pair}`);
            await binanceClient.cancelOpenOrders({symbol: pair})
        }
    }

    hasPosition() {
        return this.hasLongPosition || this.hasShortPosition
    }


    async newOrder(
        binanceClient: Binance,
        pair: string,
        quantity: string,
        orderSide,
        type,
        price?: number,
        stopLoss?: number) {
        if (type == OrderType.MARKET)
            await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: quantity
            })
        else if (type == OrderType.LIMIT)
            await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: quantity,
                price: stopLoss.toString()
            })
        if (type == OrderSide.BUY) this.hasLongPosition = true
        if (type == OrderSide.SELL) this.hasLongPosition = true
    }
}