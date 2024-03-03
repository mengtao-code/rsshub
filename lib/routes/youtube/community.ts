// @ts-nocheck
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseRelativeDate } from '@/utils/parse-date';
import { art } from '@/utils/render';
import * as path from 'node:path';
const { isYouTubeChannelId } = require('./utils');

export default async (ctx) => {
    const handle = ctx.req.param('handle');

    let urlPath = handle;
    if (isYouTubeChannelId(handle)) {
        urlPath = `channel/${handle}`;
    }

    const { data: response } = await got(`https://www.youtube.com/${urlPath}/community`);
    const $ = load(response);
    const ytInitialData = JSON.parse(
        $('script')
            .text()
            .match(/ytInitialData = ({.*?});/)[1]
    );

    const channelMetadata = ytInitialData.metadata.channelMetadataRenderer;
    const username = channelMetadata.title;
    const communityTab = ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs.find((tab) => tab.tabRenderer.endpoint.commandMetadata.webCommandMetadata.url.endsWith('/community'));
    const list = communityTab.tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents;

    if (list[0].messageRenderer) {
        throw new Error(list[0].messageRenderer.text.runs[0].text);
    }

    const items = list
        .filter((i) => i.backstagePostThreadRenderer)
        .map((item) => {
            const post = item.backstagePostThreadRenderer.post.backstagePostRenderer;
            const media = post.backstageAttachment?.postMultiImageRenderer?.images.map((i) => i.backstageImageRenderer.image.thumbnails.pop()) ?? [post.backstageAttachment?.backstageImageRenderer?.image.thumbnails.pop()];
            return {
                title: post.contentText.runs[0].text,
                description: art(path.join(__dirname, 'templates', 'community.art'), {
                    runs: post.contentText.runs,
                    media,
                }),
                link: `https://www.youtube.com/post/${post.postId}`,
                author: post.authorText.runs[0].text,
                pubDate: parseRelativeDate(post.publishedTimeText.runs[0].text.split('(')[0]),
            };
        });

    ctx.set('data', {
        title: `${username} - Community - YouTube`,
        link: channelMetadata.channelUrl,
        description: channelMetadata.description,
        item: items,
    });
};
