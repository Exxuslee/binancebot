import {binanceClient} from "../init";
import {log} from "../utils/log";
import {Binance, OrderType} from "binance-api-node";

export class Order {
    private hasLongPosition = false;
    private hasShortPosition = false;
    private positionSize = 0


    /**
     *  Close all the open orders for a given symbol
     * @param pair
     */
    async closeOpenOrders(pair: string) {
        return new Promise<void>((resolve, reject) => {
            binanceClient
                .cancelOpenOrders({symbol: pair})
                .then(() => {
                    log(`Close all open orders for the pair ${pair}`);
                    resolve();
                })
                .catch(reject);
        });
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
        price?: number) {
        if (type == OrderType.MARKET)
            await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: String(quantity)
            })
        else if (type == OrderType.LIMIT)
            await binanceClient.order({
                side: orderSide,
                type: type,
                symbol: pair,
                quantity: String(quantity),
                price: price.toString()
            })
    }
}