import fs from 'fs';
import {createLogger, format, transports} from 'winston';
import dayjs from "dayjs";

const loggerFileStart = 'logs/'
const loggerFileEnd = '.log'
let dir = dayjs(Date.now()).format('DD-MM-YYYY')
let date = dayjs(Date.now()).format('DD-MM-YYYY-HH')
let loggerFilePath = loggerFileStart + dir + '/' + date + loggerFileEnd

if (fs.existsSync(loggerFilePath)) {
    fs.unlinkSync(loggerFilePath);
}


export const initLogger = (op = {
    date: dayjs(Date.now()).format('DD-MM-YYYY-HH'),
    dir: dayjs(Date.now()).format('DD-MM-YYYY')
}) =>
    createLogger({
        level: 'info',
        format: format.simple(),
        transports: [
            new transports.File({
                filename: loggerFileStart + op.dir + '/' + op.date + loggerFileEnd
            }),
        ],
    });


