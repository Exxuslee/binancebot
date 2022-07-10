import {ExchangeInfo} from 'binance-api-node';
import {decimalCeil, decimalFloor} from './math';
import {log} from "./log";

/**
 * @see https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md#lot_size
 */
export function validQuantity(
    quantity: number,
    pair: string,
    exchangeInfo: ExchangeInfo
): number {
    const rules = getLotSizeQuantityRules(pair, exchangeInfo);
    let out = Number(rules.minQty)
    if (Math.abs(quantity) >= Number(rules.maxQty)) return Number(rules.maxQty)
    if (Number(rules.stepSize) > 0) {
        let n = Math.round(quantity / rules.stepSize)
        out = n * rules.stepSize
    }
    return decimalFloor(out, getQuantityPrecision(pair, exchangeInfo))
}

export function validPrice(
    price: number,
): number {
    return decimalFloor(price, 2)
}

/**
 * Get the minimal quantity to trade with this pair according to the
 * Binance futures trading rules
 */
export function getMinOrderQuantity(
    asset: string,
    base: string,
    basePrice: number,
    exchangeInfo: ExchangeInfo
) {
    const precision = getQuantityPrecision(asset + base, exchangeInfo);
    const minimumNotionalValue = 10; // threshold in USDT
    return decimalCeil(minimumNotionalValue / basePrice, precision);

    let min = exchangeInfo.symbols.find((symbol) => symbol.symbol === asset + base).filters.find((filter) => filter.filterType === 'MIN_NOTIONAL');
    // @ts-ignore
    let minNotional = Number(min.minNotional)
    return minNotional
}

/**
 * Get the quantity rules to make a valid order
 * @see https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md#lot_size
 * @see https://www.binance.com/en/support/faq/360033161972
 */
function getLotSizeQuantityRules(
    pair: string,
    exchangeInfo: ExchangeInfo
) {
    // @ts-ignore
    const {minQty, maxQty, stepSize} = exchangeInfo.symbols
        .find((symbol) => symbol.symbol === pair)
        // @ts-ignore
        .filters.find((filter) => filter.filterType === 'LOT_SIZE');

    return {
        minQty: Number(minQty),
        maxQty: Number(maxQty),
        stepSize: Number(stepSize),
    };
}

/**
 * Get the maximal number of decimals for a pair quantity
 */
export function getQuantityPrecision(pair: string, exchangeInfo: ExchangeInfo) {
    const symbol = exchangeInfo.symbols.find((symbol) => symbol.symbol === pair);
    return symbol.quotePrecision;
}

/**
 * Get the maximal number of decimals for a pair quantity
 */
export function getPricePrecision(pair: string, exchangeInfo: ExchangeInfo) {
    const symbol = exchangeInfo.symbols.find((symbol) => symbol.symbol === pair);
    return symbol.baseAssetPrecision;
}

/**
 * Get the tick size for a symbol
 */
export function getTickSize(pair: string, exchangeInfo: ExchangeInfo) {
    let tickSize = 0.01
    const symbol = exchangeInfo.symbols.find((symbol) => symbol.symbol === pair);

    try {
        const filter = symbol.filters.find((f) => f.filterType === 'PRICE_FILTER');
        // @ts-ignore
        tickSize = Number(filter.tickSize)
    } catch (e) {
        log(`no tickSize in ${symbol}`)
    }
    return tickSize;
}


/**
 * Get the data from candles
 * @param candles
 * @param sourceType
 */
export function getCandleSourceType(
    candles: CandleRage[],
    sourceType: SourceType
) {
    switch (sourceType) {
        case 'open':
            return candles.map((c) => c.open);
        case 'high':
            return candles.map((c) => c.high);
        case 'low':
            return candles.map((c) => c.low);
        case 'close':
            return candles.map((c) => c.close);
        case 'hl2':
            return candles.map((c) => (c.high + c.low) / 2);
        case 'hlc3':
            return candles.map((c) => (c.high + c.low + c.close) / 3);
        case 'hlcc4':
            return candles.map((c) => (c.high + c.low + c.close * 2) / 4);
        case 'volume':
            return candles.map((c) => c.volume);
        default:
            return candles.map((c) => c.close);
    }
}