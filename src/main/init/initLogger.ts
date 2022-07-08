import fs from 'fs';
import { createLogger, format, transports } from 'winston';

const loggerFilePath = 'logs/bot.log'

if (fs.existsSync(loggerFilePath)) {
  fs.unlinkSync(loggerFilePath);
}

export const initLogger = () =>
  createLogger({
    level: 'info',
    format: format.simple(),
    transports: [
      new transports.File({
        filename: loggerFilePath,
      }),
    ],
  });
