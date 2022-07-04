import {binanceClient} from "./init";
import {AssetBalance} from "binance-api-node";


export class Balance {
    private lastDayBalance: AssetBalance[]
    private lastMonthBalance: AssetBalance[]
    private currentBalance: AssetBalance[]

    async init() {
        // Store account information to local
        let accountInfo = await binanceClient.accountInfo()
        this.currentBalance = accountInfo.balances
        this.lastMonthBalance = accountInfo.balances
        this.lastDayBalance = accountInfo.balances
    }

    bCurrent(base: String) {
        return Number(this.currentBalance.find(value => {
            if (value.asset === base) return value.asset;
        }).free)
    }


    bDay(base: String) {
        return Number(this.lastDayBalance.find(value => {
            if (value.asset === base) return value.asset;
        }).free)
    }
    bMonth(base: String) {
        return Number(this.lastMonthBalance.find(value => {
            if (value.asset === base) return value.asset;
        }).free)
    }
}