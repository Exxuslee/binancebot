import {decimalFloor} from "../utils/math";
import {Telegram} from "./index";
import {Balance} from "../Balance";


/**
 * Send the results of the day to the telegram channel
 */
export const sendDailyResult = (telegram: Telegram, balance: Balance) => {

    let performance = decimalFloor(
        ((balance.bCurrent("BTC") - balance.bDay("BTC")) / balance.bDay("BTC")) * 100,
        2
    );

    let emoji = performance >= 0 ? '🟢' : '🔴';
    let message = `Day result of ${balance.bCurrent("BTC")}: ${
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