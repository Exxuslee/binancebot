import {ExchangeInfo, OrderSide} from 'binance-api-node';
import {validPrice} from "../../utils/currencyInfo";

interface Options {
    pair: string
    doubleFee?: number;
}

const defaultOptions: Options = {
    doubleFee: 0.0015,
    pair: "BTCUSDT"
};

const strategy = (
    price: number,
    candles: CandleRage[],
    pricePrecision: number,
    side: OrderSide,
    exchangeInfo: ExchangeInfo,
    options = defaultOptions
) => {
    let rawProfits = side === OrderSide.BUY
        ? (price + price * options.doubleFee)
        : (price - price * options.doubleFee)

    let takeProfits = [{
        price: validPrice(rawProfits),
        quantityPercentage: 0.0011,
    }]

    let rawStopLoss = side === OrderSide.BUY
        ? Math.min(candles[0].low, candles[1].low, candles[2].low, candles[3].low)
        : Math.max(candles[0].high, candles[1].high, candles[2].high, candles[3].high)
    let stopLoss = validPrice(rawStopLoss)

    return {takeProfits, stopLoss};
};

export default strategy;
