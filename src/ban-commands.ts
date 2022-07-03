client.ws.trades(['BTCUSDT'], trade => {
    console.log(trade)
})
/** {
//     eventType: 'trade',
//     eventTime: 1656849835702,
//     tradeTime: 1656849835702,
//     symbol: 'BTCUSDT',
//     price: '19098.63000000',
//     quantity: '0.00078500',
//     isBuyerMaker: true,
//     maker: true,
//     tradeId: 4002630,
//     buyerOrderId: 9331628,
//     sellerOrderId: 9331644
// } */

client.ws.aggTrades(['BTCUSDT'], trade => {
    console.log(trade)
})
/** {
//   eventType: 'aggTrade',
//   eventTime: 1656850179594,
//   timestamp: 1656850179593,
//   symbol: 'BTCUSDT',
//   price: '19115.62000000',
//   quantity: '0.00078400',
//   isBuyerMaker: true,
//   wasBestPrice: true,
//   aggId: 3926618,
//   firstId: 4002872,
//   lastId: 4002872
// }*/

const clean = client.ws.depth('ETHBTC', depth => {
    console.log(depth)
})
/**
 {
  eventType: 'depthUpdate',
  eventTime: 1656850576695,
  symbol: 'BTCUSDT',
  firstUpdateId: 14471412,
  finalUpdateId: 14471418,
  bidDepth: [
    { price: '19108.03000000', quantity: '0.12246200' },
    { price: '19107.07000000', quantity: '0.11775800' }
  ],
  askDepth: [
    { price: '19113.30000000', quantity: '0.00000000' },
    { price: '19113.66000000', quantity: '0.00000000' },
    { price: '19114.16000000', quantity: '0.00000000' },
    { price: '19134.79000000', quantity: '0.11340700' },
    { price: '19150.00000000', quantity: '0.12271600' }
  ]
}
 */
