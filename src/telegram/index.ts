import TelegramBot from 'node-telegram-bot-api';
import {log} from '../utils/log';
import {telegramBot} from '../init';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export class Telegram {
    sendTelegramMessage(message: string) {
        if (!CHAT_ID) {
            console.error('You must set up the environment variable TELEGRAM_CHAT_ID to use the Telegram bot');
            process.exit(1);
        }
        return new Promise<TelegramBot.Message>((resolve, reject) => {
            telegramBot.sendMessage(CHAT_ID, message, {parse_mode: 'HTML'})
                .then((messageInfo) => {
                    log(`Telegram send: ${message}`);
                    resolve(messageInfo);
                }).catch(reject);
        });
    }
}