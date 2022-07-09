import {binanceClient} from "../init";
import {log} from "../utils/log";
import {Binance, OrderSide, OrderType} from "binance-api-node";

export class Order {
    private longStopLoss;
    private shortStopLoss;
    private iBull;
    private iBear;
    private relax;
    private priceSL;
    private sizeSL
    private priceProfit

    constructor() {
        this.longStopLoss = null
        this.shortStopLoss = null
        this.iBull = false
        this.iBear = false
        this.relax = false
        this.priceSL = null
        this.sizeSL = null
        this.priceProfit = null
    }

    async closeOpenOrders(pair: string) {
        let orders = await binanceClient.openOrders({symbol: pair})
        if (orders.length) {
            log(`Close all open orders for the pair ${pair}`);
            this.updateSL(null, null)
            await binanceClient.cancelOpenOrders({symbol: pair})
        }
    }

    async viewOpenOrders(pair: string) {
        let orders = await binanceClient.openOrders({symbol: pair})
        console.log("orders:", orders)
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
            }).then(() => this.updateSL(price, quantity))
        else if (type === OrderType.LIMIT && orderSide === OrderSide.SELL)
            this.longStopLoss = await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: String(quantity),
                price: String(price)
            }).then(() => this.updateSL(price, quantity))
        else throw ('Unknown type & OrderSide')
    }

    getBull() {
        return this.iBull
    }

    getBear() {
        return this.iBear
    }

    setBull(ok: boolean) {
        this.iBull = ok
        if (!ok) this.updateSL(null, null)
    }

    setBear(ok: boolean) {
        this.iBear = ok
        if (!ok) this.updateSL(null, null)
    }

    getPriceSL() {
        return this.priceSL
    }

    getSizeSL() {
        return this.sizeSL
    }

    setRelax(ok: boolean) {
        this.relax = ok
    }

    getRelax() {
        return this.relax
    }

    private updateSL(prise: number, quantity: number) {
        this.priceSL = prise
        this.sizeSL = quantity
    }

    setProfit(prise: number) {
        this.priceProfit = prise
    }

    getProfit() {
        return this.priceProfit
    }
}