import {Account, ExchangeInfo, OrderSide} from 'binance-api-node';
import {decimalFloor} from './utils/math';
import {log} from './utils/log';
import {binanceClient} from './init';
import {isOnTradingSession} from './utils/tradingSession';
import {Telegram} from './telegram';
import dayjs from 'dayjs';
import {getPricePrecision, getQuantityPrecision} from './utils/currencyInfo';
import {Balance} from "./Balance";
import {sendDailyResult} from "./telegram/message";


// ====================================================================== //

/**
 * Production bot
 */
export class Bot {
    private strategyConfigs: StrategyConfig[];
    private telegram: Telegram;
    private balance: Balance

    private exchangeInfo: ExchangeInfo;
    private accountInfo: Account;
    private hasOpenPosition: { [pair: string]: boolean };

    // Time
    private currentDay: string;
    private currentMonth: string;

    constructor(tradeConfigs: StrategyConfig[]) {
        this.strategyConfigs = tradeConfigs;
        this.hasOpenPosition = {};
        this.currentDay = dayjs(Date.now()).format('DD/MM/YYYY');
        this.currentMonth = dayjs(Date.now()).format('MM/YYYY');
    }

    /**
     * Main function
     */
    public async run() {
        log(
            '=========== 💵 BINANCE BOT TRADING 💵 ==========='
        );

        // Get the exchange info
        this.exchangeInfo = await binanceClient.exchangeInfo();

        // Main
        this.strategyConfigs.forEach((strategyConfig) => {
            const pair = strategyConfig.asset + strategyConfig.base;
            log(`The bot trades the pair ${pair}`);


        });
        await this.telegram.sendTelegramMessage("Run bot")
        await this.balance.init()
        await this.telegram.sendTelegramMessage(this.balance.bDay("BTC").toString())
        sendDailyResult(this.telegram, this.balance)
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
            await this.closeOpenOrders(pair);
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
}
