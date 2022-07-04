import {Account, CandleChartInterval, ExchangeInfo, OrderSide} from 'binance-api-node';
import {decimalFloor} from './utils/math';
import {log} from './utils/log';
import {binanceClient} from './init';
import {loadCandlesMultiTimeFramesFromAPI} from './utils/loadCandleData';
import {Counter} from './tools/counter';
import {isOnTradingSession} from './utils/tradingSession';
import {sendTelegramMessage} from './telegram';
import dayjs from 'dayjs';
import {getPricePrecision, getQuantityPrecision} from './utils/currencyInfo';

// ====================================================================== //

/**
 * Production bot
 */
export class Bot {
    private strategyConfigs: StrategyConfig[];

    private exchangeInfo: ExchangeInfo;
    private accountInfo: Account;
    private hasOpenPosition: { [pair: string]: boolean };

    // Counter to fix the max duration of each trade
    private counters: { [symbol: string]: Counter };

    // Time
    private currentDay: string;
    private currentMonth: string;
    private lastDayBalance: number;
    private lastMonthBalance: number;
    private currentBalance: number; // temp balance

    constructor(tradeConfigs: StrategyConfig[]) {
        this.strategyConfigs = tradeConfigs;
        this.counters = {};
        this.hasOpenPosition = {};
        this.currentDay = dayjs(Date.now()).format('DD/MM/YYYY');
        this.currentMonth = dayjs(Date.now()).format('MM/YYYY');
    }

    /**
     * Prepare the account
     */
    public prepare() {
        // Initialize the counters
        this.strategyConfigs.forEach(({asset, base, maxTradeDuration}) => {
            if (maxTradeDuration)
                this.counters[asset + base] = new Counter(maxTradeDuration);
        });
    }

    /**
     * Main function
     */
    public async run() {
        log(
            '====================== 💵 BINANCE BOT TRADING 💵 ======================'
        );

        // Get the exchange info
        this.exchangeInfo = await binanceClient.exchangeInfo();

        // Store account information to local
        let accountInfo = await binanceClient.accountInfo()
        this.currentBalance = Number(accountInfo.balances.find(
                (b) => b.asset == this.strategyConfigs[0].base
            ).free
        );
        this.lastMonthBalance = this.currentBalance;
        this.lastDayBalance = this.currentBalance;

        // Main
        this.strategyConfigs.forEach((strategyConfig) => {
            const pair = strategyConfig.asset + strategyConfig.base;
            log(`The bot trades the pair ${pair}`);

            binanceClient.ws.candles(
                pair,
                strategyConfig.loopInterval,
                (candle) => {
                    // If a position has been closed, cancel the open orders
                    this.manageOpenOrders(pair);

                    if (candle.isFinal) {
                        // Load the candle data for each the time frames that will be use on the strategy
                        loadCandlesMultiTimeFramesFromAPI(
                            pair,
                            Array.from(
                                new Set<CandleChartInterval>([
                                    ...strategyConfig.indicatorIntervals,
                                    strategyConfig.loopInterval,
                                ])
                            ),
                            binanceClient
                        ).then(async (candlesMultiTimeFrames) => {
                            await this.trade(
                                strategyConfig,
                                Number(candle.close),
                                candlesMultiTimeFrames
                            );

                            // Update the current balance
                            let accountInfo = await binanceClient.accountInfo()
                            this.currentBalance = Number(accountInfo.balances.find(
                                (b) => b.asset === this.strategyConfigs[0].base
                            ).free)
                        });

                        // Day change ?
                        let candleDay = dayjs(new Date(candle.closeTime)).format(
                            'DD/MM/YYYY'
                        );
                        if (candleDay !== this.currentDay) {
                            this.sendDailyResult();
                            this.currentDay = candleDay;
                        }

                        // Month change ?
                        let candleMonth = dayjs(new Date(candle.closeTime)).format(
                            'MM/YYYY'
                        );
                        if (candleMonth !== this.currentMonth) {
                            this.sendMonthResult();
                            this.currentMonth = candleMonth;
                        }
                    }
                }
            );
        });
    }

    /**
     * Main function (long/short, open/close orders)
     * @param strategyConfig
     * @param currentPrice
     * @param candles
     */
    private async trade(
        strategyConfig: StrategyConfig,
        currentPrice: number,
        candles: CandlesDataMultiTimeFrames
    ) {
        const {
            asset,
            base,
            risk,
            buyStrategy,
            sellStrategy,
            exitStrategy,
            trendFilter,
            riskManagement,
            tradingSessions,
            canOpenNewPositionToCloseLast,
            allowPyramiding,
            maxPyramidingAllocation,
            unidirectional,
            loopInterval,
            maxTradeDuration,
        } = strategyConfig;
        const pair = asset + base;

        // Update the account info
        this.accountInfo = await binanceClient.accountInfo();

        // Balance information
        const balances = this.accountInfo;
        const {asset: assetBalance, free: availableBalance} = balances.balances.find(
            (balance) => balance.asset === base
        );

        // Open Orders
        const currentOpenOrders = await binanceClient.openOrders({
            symbol: pair,
        });

        // Check the trend
        const useLongPosition = trendFilter ? trendFilter(candles) === 1 : true;
        const useShortPosition = trendFilter ? trendFilter(candles) === -1 : true;


        // Precision
        const pricePrecision = getPricePrecision(pair, this.exchangeInfo);
        const quantityPrecision = getQuantityPrecision(pair, this.exchangeInfo);

        // Check if we are in the trading sessions
        const isTradingSessionActive = isOnTradingSession(
            candles[loopInterval][candles[loopInterval].length - 1].closeTime,
            tradingSessions
        );


        // Do not trade with short position if the trend is up
        if (!useShortPosition) return;


        // Calculate TP and SL
        let {takeProfits, stopLoss} = exitStrategy
            ? exitStrategy(
                currentPrice,
                candles,
                pricePrecision,
                OrderSide.SELL,
                this.exchangeInfo
            )
            : {takeProfits: [], stopLoss: null};

        // Calculate the quantity for the position according to the risk management of the strategy
        let quantity = riskManagement({
            asset,
            base,
            balance: allowPyramiding
                ? Number(assetBalance)
                : Number(availableBalance),
            risk,
            enterPrice: currentPrice,
            stopLossPrice: stopLoss,
            exchangeInfo: this.exchangeInfo,
        });


    }

    /**
     * Check if a position has been closed
     * @param pair
     */
    private async manageOpenOrders(pair: string) {
        const hasOpenPosition = false;
        if (this.hasOpenPosition[pair] && !hasOpenPosition) {
            this.hasOpenPosition[pair] = false;
            this.closeOpenOrders(pair);
            if (this.counters[pair]) this.counters[pair].reset();
        }
    }

    /**
     *  Close all the open orders for a given symbol
     * @param pair
     */
    private closeOpenOrders(pair: string) {
        return new Promise<void>((resolve, reject) => {
            binanceClient
                .cancelOpenOrders({symbol: pair})
                .then(() => {
                    log(`Close all open orders for the pair ${pair}`);
                    resolve();
                })
                .catch(reject);
        });
    }

    /**
     * Send the results of the day to the telegram channel
     */
    private sendDailyResult() {
        let performance = decimalFloor(
            ((this.currentBalance - this.lastDayBalance) / this.lastDayBalance) * 100,
            2
        );

        let emoji = performance >= 0 ? '🟢' : '🔴';
        let message = `Day result of ${this.currentDay}: ${
            performance > 0 ? `<b>+${performance}%</b>` : `${performance}%`
        } ${emoji}`;

        sendTelegramMessage(message);
    }

    /**
     * Send the results of the month to the telegram channel
     */
    private sendMonthResult() {
        let performance = decimalFloor(
            ((this.currentBalance - this.lastMonthBalance) / this.lastMonthBalance) *
            100,
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
            `<b>MONTH RESULT - ${this.currentMonth}</b>` +
            '\n' +
            `${performance > 0 ? `+${performance}%` : `${performance}%`} ${emoji}`;

        sendTelegramMessage(message);
    }
}
