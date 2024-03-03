// @ts-nocheck
import cache from '@/utils/cache';
import got from '@/utils/got';
const dayjs = require('dayjs');
import { art } from '@/utils/render';
import * as path from 'node:path';

const host = 'http://data.guduodata.com';

const types = {
    collect: {
        name: '汇总榜',
        categories: {
            drama: '连续剧',
            variety: '综艺',
        },
    },
    bill: {
        name: '排行榜',
        categories: {
            network_drama: '网络剧',
            network_movie: '网络大电影',
            network_variety: '网络综艺',
            tv_drama: '电视剧',
            tv_variety: '电视综艺',
            anime: '国漫',
        },
    },
};

export default async (ctx) => {
    const now = dayjs().valueOf();
    // yestoday
    const yestoday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const renderRows = (rows) => art(path.join(__dirname, './templates/daily.art'), { rows });
    const items = Object.keys(types).flatMap((key) =>
        Object.keys(types[key].categories).map((category) => ({
            type: key,
            name: `[${yestoday}] ${types[key].name} - ${types[key].categories[category]}`,
            category: category.toUpperCase(),
            url: `${host}/show/datalist?type=DAILY&category=${category.toUpperCase()}&date=${yestoday}`,
        }))
    );
    ctx.set('data', {
        title: `骨朵数据 - 日榜`,
        link: host,
        description: yestoday,
        item: await Promise.all(
            items.map((item) =>
                cache.tryGet(item.url, async () => {
                    const response = await got.get(`${item.url}&t=${now}`, {
                        headers: { Referer: `http://data.guduodata.com/` },
                    });
                    const data = response.data.data;
                    return {
                        title: item.name,
                        pubDate: yestoday,
                        link: item.url,
                        description: renderRows(data),
                    };
                })
            )
        ),
    });
};
