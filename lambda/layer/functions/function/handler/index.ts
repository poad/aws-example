import * as fs from 'fs';
import * as process from 'process';

import fetch from 'cross-fetch';

import * as log from '/opt/nodejs/log';

export const handler = async (__event: any) => {
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

    const resp = await fetch('https://www.nicovideo.jp/rss/newarrival');
    if (resp.ok) {
        log.info(await resp.text());
    }
}