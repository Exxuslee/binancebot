import {binanceClient} from "../init";
import {log} from "../utils/log";
import {Binance, OrderSide, OrderType} from "binance-api-node";

export class Order {
    private longStopLoss;
    private shortStopLoss;

    constructor() {
        this.longStopLoss = null
        this.shortStopLoss = null
    }

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

    getLong() {
        return this.longStopLoss
    }

    getShort() {
        return this.shortStopLoss
    }

    setLong() {
        this.longStopLoss = null
    }

    setShort() {
        this.shortStopLoss = null
    }

    async newOrder(
        binanceClient: Binance,
        pair: string,
        quantity: number,
        orderSide,
        type,
        price: number,
    ) {
        if (type === OrderType.MARKET)
            await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: String(quantity)
            })
        else if (type === OrderType.LIMIT && orderSide === OrderSide.BUY)
            this.shortStopLoss = await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: String(quantity),
                price: String(price)
            })
        else if (type === OrderType.LIMIT && orderSide === OrderSide.SELL)
            this.longStopLoss = await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: String(quantity),
                price: String(price)
            })
        else throw ('Unknown type & OrderSide')
    }
}