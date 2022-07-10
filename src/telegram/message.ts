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