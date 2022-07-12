import {binanceClient} from "../init";
import {log} from "../utils/log";
import {Binance, OrderSide, OrderType} from "binance-api-node";

export class Order {
    private _longStopLoss;
    private _shortStopLoss;
    private _iBull: boolean = false
    private _iBear: boolean = false
    private _relax: boolean = false
    private _priceSL;
    private _sizeSL
    private _priceStart
    private _nowTrading: boolean = false

    constructor() {
    }

    async closeOpenOrders(pair: string) {
        let orders = await binanceClient.openOrders({symbol: pair})
        if (orders.length) {
            log(`Close all open orders for the pair ${pair}`);
            await binanceClient.cancelOpenOrders({symbol: pair})
            this.updateSL(null, null)
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
        delay: number
    ) {

        function afterDelay(pair) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    let p = binanceClient.prices({symbol: pair})
                    resolve(p);
                }, delay);
            });
        }

        let delayObject = await afterDelay(pair)
        let delayPrice = delayObject[pair]

        if (price > (delayPrice * 0.98) && price < (delayPrice * 1.02)) {
            //console.log(pair, orderSide, type, price, quantity)
            if (type === OrderType.MARKET)
                await binanceClient.orderTest({
                    side: orderSide,
                    type: type,
                    symbol: pair,
                    quantity: String(quantity)
                }).then(response => console.log('real order', response.price))
            else if (type === OrderType.LIMIT && orderSide === OrderSide.BUY)
                await binanceClient.orderTest({
                    side: orderSide,
                    type: type,
                    symbol: pair,
                    quantity: String(quantity),
                    price: String(price)
                }).then(() => this.updateSL(price, quantity))
            else if (type === OrderType.LIMIT && orderSide === OrderSide.SELL)
                await binanceClient.orderTest({
                    side: orderSide,
                    type: type,
                    symbol: pair,
                    quantity: String(quantity),
                    price: String(price)
                }).then(() => this.updateSL(price, quantity))
            else throw ('Unknown type & OrderSide')
            return true
        } else {
            log(`${orderSide} ${pair} ${price} <> ${delayPrice}`)
            return false
        }
    }

    getBull() {
        return this._iBull
    }

    getBear() {
        return this._iBear
    }

    setBull(ok: boolean) {
        this._iBull = ok
//        if (!ok) this.updateSL(null, null)
    }

    setBear(ok: boolean) {
        this._iBear = ok
        //      if (!ok) this.updateSL(null, null)
    }

    getPriceSL() {
        return this._priceSL
    }

    getSizeSL() {
        return this._sizeSL
    }

    setRelax(ok: boolean) {
        this._relax = ok
    }

    getRelax() {
        return this._relax
    }

    private updateSL(prise: number, quantity: number) {
        this._priceSL = prise
        this._sizeSL = quantity
    }

    setPriceStart(prise: number) {
        this._priceStart = prise
    }

    getPriceStart() {
        return this._priceStart
    }

    setTrading(ok: boolean) {
        this._nowTrading = ok
    }

    getTrading() {
        return this._nowTrading
    }

    // setReport(ok: boolean) {
    //     this._report = this._report + ok ? "1" : "0"
    // }
    //
    // getReport() {
    //     let data = (' ' + this._report).slice(1);
    //     this._report = ''
    //     return data
    // }
}