import {Bot} from './bot';
import {StrategyConfig} from './init';

const tradingBot = new Bot(StrategyConfig);
tradingBot.run().then(r => console.log('end bot', r));