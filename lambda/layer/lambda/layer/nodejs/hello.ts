import * as log4js from 'log4js';

log4js.configure({
    appenders: { out: { type: "stdout", layout: { type: 'pattern', pattern: '%m%n'} } },
    categories: { default: { appenders: ["out"], level: "info" } }
});
const logger = log4js.getLogger();

export const hello = (message: string) => {
    logger.info(message);
}
