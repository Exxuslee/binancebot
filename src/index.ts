import {Bot} from './bot';
import {StrategyConfig} from './init';

const tradingBot = new Bot(StrategyConfig);
tradingBot.prepare();
tradingBot.run();