export class Counter {
    private sum: number;
    private count: number;

    constructor(initialValue = 0, count = 0) {
        this.sum = initialValue;
        this.count = count;
    }

    public add(aPrice: number, bPrice: number) {
        this.count++
        this.sum = this.sum + (aPrice - bPrice)/bPrice;
    }

    public reset() {
        this.sum = 0;
        this.count = 0
    }

    public getCounter():CounterResponse {
        return {sum: this.sum, count: this.count};
    }
}
