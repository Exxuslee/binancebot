import {decimalFloor} from "../utils/math";
import {Telegram} from "./index";
import {Balance} from "../bot/Balance";


/**
 * Send the results of the day to the telegram channel
 */
export const sendDailyResult = (telegram: Telegram, balance: Balance, asset:string, report: string) => {

    let performance = decimalFloor(
        ((balance.bCurrent(asset) - balance.bDay(asset)) / balance.bDay(asset)) * 100,
        2
    );

    let emoji = performance >= 0 ? '🟢' : '🔴';
    let message = `${balance.bCurrent(asset)} ${report}\n: ${
        performance > 0 ? `<b>+${performance}%</b>` : `${performance}%`
    } ${emoji}`;

    telegram.sendTelegramMessage(message).then(r => console.log(`promise telegram ${r}`))
}

/**
 * Send the results of the month to the telegram channel
 */
export const sendMonthResult = (telegram: Telegram, balance: Balance) => {
    let performance = decimalFloor(
        ((balance.bCurrent("BTC") - balance.bMonth("BTC")) / balance.bMonth("BTC")) * 100,
        2
    );

    let emoji =
        performance > 30
            ? '🤩'
            : performance > 20
                ? '🤑'
                : performance > 10
                    ? '😍'
                    : performance > 0
                        ? '🥰'
                        : performance > -10
                            ? '😢'
                            : performance > -20
                                ? '😰'
                                : '😭';

    let message =
        `<b>MONTH RESULT - ${balance.bMonth("BTC")}</b>` +
        '\n' +
        `${performance > 0 ? `+${performance}%` : `${performance}%`} ${emoji}`;

    telegram.sendTelegramMessage(message).then(r => console.log(`promise telegram ${r}`))
}