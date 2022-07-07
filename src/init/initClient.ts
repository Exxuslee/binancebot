import Binance from 'binance-api-node';

export const initBinanceClient = () =>
    Binance(
         {
                apiKey: process.env.BINANCE_PUBLIC_KEY,
                apiSecret: process.env.BINANCE_PRIVATE_KEY,
                httpBase: 'https://testnet.binance.vision',
                //httpBase:'https://api.binance.com',
                wsBase: 'wss://testnet.binance.vision/ws'
            }
    );
