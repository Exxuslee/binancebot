import {binanceClient} from "../init";
import {error, log} from "../utils/log";
import {Binance, OrderSide, OrderType} from "binance-api-node";

export class Order {
    private _iBull: boolean = false
    private _iBear: boolean = false
    private _priceSL;
    private _priceTP;
    private _quantity
    private _volume
    private _priceStart = 0
    private _priceStop = 0
    private _nowTrading: boolean = false

    constructor() {
    }

    async closeOpenOrders(pair: string) {
        let orders = await this.viewOpenOrders(pair)
        if (orders.length) {
            let response = await binanceClient.cancelOpenOrders({symbol: pair})
            let temp = []
            response.map(result => temp.push(result.orderId))
            //log(`Close all open orders for the pair ${pair} ${temp}`);
            this._iBear = false
            this._iBull = false
        }
    }

    async viewOpenOrders(pair: string) {
        return await binanceClient.openOrders({symbol: pair})
    }

    async marketStart(binanceClient: Binance, pair: string, quantity: number, orderSide, price: number, delay: number,) {
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

        if (price > (delayPrice * 0.99) && price < (delayPrice * 1.01)) {
            //console.log(pair, orderSide, type, price, quantity)
            let resp = await binanceClient.order({
                side: orderSide, type: OrderType.MARKET, symbol: pair, quantity: String(quantity)
            })

            if (resp.fills[0].price.length > 0) {
                this._priceStart = Number(resp.fills[0].price)
                this._quantity = quantity
                if (orderSide === OrderSide.BUY) this._iBull = true
                else this._iBear = true
                return true
            } else {
                error(`${orderSide} ${pair} marketStart`)
                return false
            }

        } else {
            log(`${orderSide} ${pair} ${price} <> ${delayPrice}`)
            return false
        }
    }

    async stopLose(binanceClient: Binance, pair: string, quantity: number, orderSide, price: number) {
        await binanceClient.order({
            side: orderSide,
            type: OrderType.STOP_LOSS_LIMIT,
            symbol: pair,
            quantity: String(quantity),
            price: String(price),
            stopPrice: String(price)
        }).then(() => {
            this._priceSL = price
        })

    }

    async takeProfit(binanceClient: Binance, pair: string, quantity: number, orderSide, price: number) {
        await binanceClient.order({
            side: orderSide,
            type: OrderType.LIMIT,
            symbol: pair,
            quantity: String(quantity),
            price: String(price),
        }).then(() => {
            this._priceTP = price
        })

    }

    async stop(binanceClient: Binance, pair: string, quantity: number, orderSide,) {
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

    getPriceSL() {
        return this._priceSL
    }

    setPriceSL(price) {
        this._priceSL = price
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


    getPriceTP() {
        return this._priceTP
    }

    setVolume(vol: number) {
        this._volume = vol
    }

    getVolume() {
        return this._volume
    }

    getQuantity() {
        return this._quantity
    }

    setBull(ok: boolean) {
        this._iBull = ok
    }

    setBear(ok: boolean) {
        this._iBear = ok
    }
}