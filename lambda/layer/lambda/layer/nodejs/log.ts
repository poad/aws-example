import * as log4js from 'log4js';

log4js.configure({
    appenders: { out: { type: "stdout", layout: { type: 'pattern', pattern: '%m%n' } } },
    categories: { default: { appenders: ["out"], level: "info" } }
});
const logger = log4js.getLogger();

export const info = (message: string) => {
    logger.info(message);
}

export const warn = (message: string) => {
    logger.warn(message);
}

export const error = (message: string) => {
    logger.error(message);
}

const log = {
    info,
    warn,
    error
};

export default log;
