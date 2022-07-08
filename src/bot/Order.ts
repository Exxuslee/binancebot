import {binanceClient} from "../init";
import {log} from "../utils/log";
import {Binance, OrderSide, OrderType} from "binance-api-node";

export class Order {
    private longStopLoss;
    private shortStopLoss;
    private iBull;
    private iBear;

    constructor() {
        this.longStopLoss = null
        this.shortStopLoss = null
        this.iBull = false
        this.iBear = false
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

    async newOrder(
        binanceClient: Binance,
        pair: string,
        quantity: number,
        orderSide,
        type,
        price: number,
    ) {
        console.log(pair, orderSide, type, price, quantity)
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

    getBul() {
        return this.iBull
    }

    getBear() {
        return this.iBear
    }

    setBull(ok: boolean) {
        this.iBull = ok
    }

    setBear(ok: boolean) {
        this.iBear = ok
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
}