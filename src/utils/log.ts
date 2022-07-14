import dayjs from 'dayjs';
import chalk from 'chalk';
import {OrderSide} from 'binance-api-node';
import {logger} from '../init';

/**
 * Main function add a log
 * @param message
 * @param date
 */
export function log(message: string, date = Date.now()) {
    const logDate = dayjs(date).format('YYYY-MM-DD HH:mm:ss');
    logger.info(`${logDate} : ${message}`);
    console.log(`${chalk.blue(logDate)} : ${message}`);
}

/**
 * Main function add an error in the logs
 * @param message
 * @param date
 */
export function error(message: string, date = Date.now()) {
    const logDate = dayjs(date).format('YYYY-MM-DD HH:mm:ss');
    logger.warn(`${logDate} : ${message}`);
    console.log(`${chalk.blue(logDate)} : ${message}`);
}

/**
 * Function to log the message when an order is opened
 * @param orderSide
 * @param asset
 * @param base
 * @param price
 * @param quantity
 * @param takeProfits
 * @param stopLoss
 */
export function logBuySellExecutionOrder(
    orderSide: OrderSide,
    asset: string,
    base: string,
    price: number,
    quantity: string,
    takeProfits: { price: number; quantityPercentage: number }[],
    stopLoss: number
) {
    let introPhrase = `Open a ${
        orderSide === OrderSide.BUY ? 'long' : 'short'
    } position on ${asset}${base} at the price ${price} with a size of ${quantity}${asset}`;

    let tp = `TP: ${
        takeProfits.length > 0
            ? takeProfits
                .map(
                    (takeProfit) =>
                        `[${takeProfit.price} => ${takeProfit.quantityPercentage * 100}%]`
                )
                .join(' ')
            : '----'
    }`;

    let sl = `SL: ${stopLoss ? `[${stopLoss} => 100%]` : '----'}`;

    log([introPhrase, tp, sl].join(' | '));
}

/**
 * Function to log the message when an order is opened
 * @param orderSide
 * @param asset
 * @param base
 * @param price
 * @param quantity
 */
export function logStopExecutionOrder(
    orderSide: OrderSide,
    asset: string,
    base: string,
    price: number,
    quantity: string,
) {
    let introPhrase = `Close a ${
        orderSide === OrderSide.BUY ? 'long' : 'short'
    } position on ${asset}${base} at the price ${price} with a size of ${quantity}${asset}`;
    log(introPhrase);
}

export function logStart(pair: string, price: number, size: number, type: string, takeProfits: number, stopLose: number) {
    const logDate = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    const message = [type, pair, `${price}$`, size, `, TP:${takeProfits}, SL:${stopLose}`].join(' ')
    logger.info(`${logDate} : ${message}`);
    console.log(`${chalk.yellow(logDate)} : ${message}`);
}

export function logStopLose(pair: string, price: number, type: string, priceStart: number) {
    const logDate = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    let percent = type == OrderSide.BUY
        ? (price - priceStart) / price * 100
        : (priceStart - price) / priceStart * 100
    let percent2 = percent.toFixed(3)
    let p1 = priceStart.toFixed(2)
    let p2 = price.toFixed(2)
    const message = [type, pair, `${p1}/${p2}`, '=%\t', percent2].join(' ')
    logger.info(`${logDate} : ${message}`);
    console.log(`${chalk.red(logDate)} : ${message}`);
}

export function logStop(pair: string, price: number, type: string, priceStart: number) {
    const logDate = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    let percent = type == OrderSide.BUY
        ? (priceStart - price) / price * 100
        : (price - priceStart) / priceStart * 100
    let percent2 = percent.toFixed(3)
    let p1 = priceStart.toFixed(2)
    let p2 = price.toFixed(2)
    const message = [type, pair, `${p1}/${p2}`, '=%\t', percent2].join(' ')
    logger.info(`${logDate} : ${message}`);
    percent > 0
        ? console.log(`${chalk.green(logDate)} : ${message}`)
        : console.log(`${chalk.redBright(logDate)} : ${message}`)

}