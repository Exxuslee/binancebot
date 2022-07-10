import {binanceClient} from "../init";
import {AssetBalance} from "binance-api-node";
import chalk from "chalk";
import dayjs from "dayjs";
import {log} from "../utils/log";


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

    async updateCurrent() {
        // Store account information to local
        let accountInfo = await binanceClient.accountInfo()
        this.currentBalance = accountInfo.balances
    }

    updateDay() {
        this.lastDayBalance = this.currentBalance
    }

    bCurrent(base: String) {
        let balance = 0
        try {
            balance = Number(this.currentBalance.find(value => {
                if (value.asset === base) return value.asset;
            }).free)
        } catch (e) {
            log(`No balance ${base}`)
        }

        return balance ? balance : 0
    }

    bDay(base: String) {
        let balance = Number(this.lastDayBalance.find(value => {
            if (value.asset === base) return value.asset;
        }).free)
        return balance ? balance : 0
    }

    bMonth(base: String) {
        let balance = Number(this.lastMonthBalance.find(value => {
            if (value.asset === base) return value.asset;
        }).free)
        return balance ? balance : 0
    }
}