import * as fs from 'fs';
import * as process from 'process';

import * as log from "/opt/nodejs/log";

export const handler = async (event: any) => {
    const currentDir = process.cwd();
    fs.readdirSync(currentDir, {
        withFileTypes: true
    })
        .map((item) => `${currentDir}/${item.name}`)
        .forEach(path => log.info(path));

    fs.readdirSync('/opt', {
        withFileTypes: true
    })
        .map((item) => `/opt/${item.name}`)
        .forEach(path => log.info(path));

    fs.readdirSync('/opt/nodejs', {
        withFileTypes: true
    })
        .map((item) => `/opt/nodejs/${item.name}`)
        .forEach(path => log.info(path));

    log.info("Hello World");
}