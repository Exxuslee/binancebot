import {binanceClient} from "../init";
import {log} from "../utils/log";
import {Binance, OrderSide, OrderType} from "binance-api-node";

export class Order {
    public longStopLoss: number = null;
    public shortStopLoss: number = null;


    async closeOpenOrders(pair: string) {
        let orders = await binanceClient.openOrders({symbol: pair})
        if (orders.length) {
            log(`Close all open orders for the pair ${pair}`);
            await binanceClient.cancelOpenOrders({symbol: pair})
        }
    }

    async viewOpenOrders(pair: string) {
        let orders = await binanceClient.openOrders({symbol: pair})
        console.log("ord", orders)

    }

    hasLongPosition() {
        return this.longStopLoss
    }

    hasShortPosition() {
        return this.shortStopLoss
    }

    async newOrder(
        binanceClient: Binance,
        pair: string,
        quantity: string,
        orderSide,
        type,
        price: number,
    ) {
        if (type == OrderType.MARKET)
            await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: quantity
            }).then(res => true)
        else if (type == OrderType.LIMIT)
            await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: quantity,
                stopPrice: String(price)
            }).then(res => console.log(res))
        if (type === OrderSide.BUY) this.longStopLoss = price
        if (type === OrderSide.SELL) this.shortStopLoss = price
    }
}