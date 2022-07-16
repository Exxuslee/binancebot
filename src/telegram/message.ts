import {decimalFloor} from "../utils/math";
import {Telegram} from "./index";
import {Balance} from "../bot/Balance";


/**
 * Send the results of the day to the telegram channel
 */
export const sendDailyResult
    = (telegram: Telegram, balance: Balance, asset: string, count: CounterResponse) => {

    let performance = decimalFloor(
        ((balance.bCurrent(asset) - balance.bDay(asset)) / balance.bDay(asset)) * 100,
        2
    );

    let emoji = performance >= 0 ? '🟢' : '🔴';
    let message = `${balance.bCurrent(asset)}: ${
        performance > 0 ? `<b>+${performance}%</b>` : `${performance}%`
    } ${emoji}\tsum=${count.sum.toFixed(2)} count=${count.count}`;
    telegram.sendTelegramMessage(message).then(r => true)
}

export const sendHourResult = (telegram: Telegram, count: CounterResponse) => {
    let message = `sum=${count.sum.toFixed(2)}% count=${count.count}`;
    telegram.sendTelegramMessage(message).then(r => true)
}