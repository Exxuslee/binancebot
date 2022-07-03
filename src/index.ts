require("dotenv").config();
const Binance = require('binance-api-node')
const options = {
    apiKey: process.env.tAPIKEY,
    apiSecret: process.env.tAPISECRET,
    //  getTime: Date.now,
    httpBase: 'https://testnet.binance.vision',
    // httpBase:'https://api.binance.com',
    wsBase: 'wss://testnet.binance.vision/ws'

};
const client = Binance.default(options);

async function start() {
    console.log(await client.ping())
    console.log(await client.accountInfo())
}
start().then(r => console.log("end", r))

client.ws.aggTrades('BTCUSDT', trade => {
    console.log(trade)
})