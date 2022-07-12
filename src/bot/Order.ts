import {binanceClient} from "../init";
import {log} from "../utils/log";
import {Binance, OrderSide, OrderType} from "binance-api-node";

export class Order {
    private _iBull: boolean = false
    private _iBear: boolean = false
    private _relax: boolean = false
    private _priceSL;
    private _sizeSL
    private _priceStart = 0
    private _priceStop = 0
    private _nowTrading: boolean = false

    constructor() {
    }

    async closeOpenOrders(pair: string) {
        let orders = await binanceClient.openOrders({symbol: pair})
        if (orders.length) {
            let response = await binanceClient.cancelOpenOrders({symbol: pair})
            let temp = []
            response.map(result => temp.push(result.orderId))
            //log(`Close all open orders for the pair ${pair} ${temp}`);
            this.updateSL(null, null)
        }
    }

    async viewOpenOrders(pair: string) {
        let orders = await binanceClient.openOrders({symbol: pair})
        console.log("orders:", orders)
    }

    async newOrderStart(
        binanceClient: Binance,
        pair: string,
        quantity: number,
        orderSide,
        type,
        price: number,
        delay: number,
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
            if (type === OrderType.MARKET) {
                let resp = await binanceClient.order({
                    side: orderSide, type: type, symbol: pair, quantity: String(quantity)
                })
                if (resp.fills[0].price.length > 0) {
                    this._priceStart = Number(resp.fills[0].price)
                    if (orderSide === OrderSide.BUY) this._iBull = true
                    else this._iBear = true
                    return true
                } else return false
            } else if (type === OrderType.STOP_LOSS_LIMIT)
                await binanceClient.order({
                    side: orderSide,
                    type: type,
                    symbol: pair,
                    quantity: String(quantity),
                    price: String(price),
                    stopPrice: String(price)
                }).then(() => {
                    this.updateSL(price, quantity)
                })
            else throw ('Unknown type & OrderSide')
        } else {
            log(`${orderSide} ${pair} ${price} <> ${delayPrice}`)
            return false
        }
    }

    async newOrderStop(
        binanceClient: Binance,
        pair: string,
        quantity: number,
        orderSide,
    ) {
        let resp = await binanceClient.order({
            side: orderSide, type: OrderType.MARKET, symbol: pair, quantity: String(quantity)
        })
        if (resp.fills[0].price.length > 0) {
            this._iBear = false
            this._iBull = false
            this._priceStop = Number(resp.fills[0].price)
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
    }

    setBear(ok: boolean) {
        this._iBear = ok
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

    updateSL(prise: number, quantity: number) {
        this._priceSL = prise
        this._sizeSL = quantity
    }


    getPriceStart() {
        return this._priceStart
    }

    getPriceStop() {
        return this._priceStop
    }

    setTrading(ok: boolean) {
        this._nowTrading = ok
    }

    getTrading() {
        return this._nowTrading
    }
}