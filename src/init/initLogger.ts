import fs from 'fs';
import {createLogger, format, transports} from 'winston';
import dayjs from "dayjs";

const loggerFileStart = 'logs/'
const loggerFileEnd = '.log'
let date = dayjs(Date.now()).format('DD-MM-YYYY-HH')
let loggerFilePath = loggerFileStart + date + loggerFileEnd

if (fs.existsSync(loggerFilePath)) {
    fs.unlinkSync(loggerFilePath);
}


export const initLogger = (date = dayjs(Date.now()).format('DD-MM-YYYY-HH')) =>
    createLogger({
        level: 'info',
        format: format.simple(),
        transports: [
            new transports.File({
                filename: loggerFileStart + date + loggerFilePath,
            }),
        ],
    });


