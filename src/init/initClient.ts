import Binance from 'binance-api-node';

export const initBinanceClient = (
    nodeEnv: 'test' | 'development' | 'production'
) =>
    Binance(
        nodeEnv === 'production' || nodeEnv === 'test'
            ? {
                apiKey: process.env.BINANCE_PUBLIC_KEY,
                apiSecret: process.env.BINANCE_PRIVATE_KEY,
                httpBase: 'https://testnet.binance.vision',
                // httpBase:'https://api.binance.com',
                wsBase: 'wss://testnet.binance.vision/ws'
            }
            : {
                apiKey: process.env.BINANCE_FUTURES_TESTNET_PUBLIC_KEY,
                apiSecret: process.env.BINANCE_FUTURES_TESTNET_PRIVATE_KEY,
                //httpFutures: 'https://testnet.binancefuture.com',
                //wsFutures: 'wss://fstream.binance.com/ws',
                httpBase: 'https://testnet.binance.vision',
                // httpBase:'https://api.binance.com',
                wsBase: 'wss://testnet.binance.vision/ws'
            }
    );
