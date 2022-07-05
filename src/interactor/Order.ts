import {binanceClient} from "../init";
import {log} from "../utils/log";


/**
 * Check if a position has been closed
 * @param pair
 */
async function manageOpenOrders(pair: string) {
    const hasOpenPosition = false;
    if (this.hasOpenPosition[pair] && !hasOpenPosition) {
        this.hasOpenPosition[pair] = false;
        await this.closeOpenOrders(pair);
    }
}

/**
 *  Close all the open orders for a given symbol
 * @param pair
 */
async function closeOpenOrders(pair: string) {
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