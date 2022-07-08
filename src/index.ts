import {Bot} from './bot/Bot';
import {StrategyConfig} from './init';

const tradingBot = new Bot(StrategyConfig);
tradingBot.run().then(r => console.log('end bot', r));