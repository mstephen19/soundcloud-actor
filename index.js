const Apify = require('apify');

const { initContext } = require('./src/context');
const { createRequestList } = require('./src/createRequestList');

const { handleUserPage, handleUser, handleQuery, handleUserTracks, handleTrackComments } = require('./src/routes');
const { useKVContext } = require('./utils/contextHooks');

const { cleanInput } = require('./src/cleanInput');

const { log, puppeteer } = Apify.utils;

Apify.main(async () => {
    // Initialize our state context
    await initContext();
    const [state] = await useKVContext();

    // Grab input, validate it, and add it to the sate
    const input = await Apify.getInput();
    // eslint-disable-next-line
    input.debug ? log.setLevel(log.LEVELS.DEBUG) : log.setLevel(log.LEVELS.INFO);
    await cleanInput(input);

    // Create list of user pages to grab IDs from, and store API ready requests in state.cheerioRequestList
    const puppeteerRequestList = await createRequestList();

    const puppy = new Apify.PuppeteerCrawler({
        requestList: puppeteerRequestList,
        maxConcurrency: 50,
        handlePageTimeoutSecs: 60,
        launchContext: {
            launchOptions: {
                headless: true,
            },
        },
        handlePageFunction: async (context) => {
            const { label } = context.request.userData;

            // Make page load quicker
            await puppeteer.blockRequests(context.page, {
                urlPatterns: ['.css', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.woff', '.pdf', '.zip'],
            });

            switch (label) {
                case 'USER_PAGE': {
                    // Add API requests to state.cheerioRequestList from user IDs
                    return handleUserPage(context);
                }
                default: {
                    break;
                }
            }
        },
    });

    log.info('Starting the crawl.');
    if (puppeteerRequestList.length()) {
        log.debug('Starting Puppeteer');
        await puppy.run();
        log.debug('Puppeteer finished.');
    }

    const cheerioRequestList = await Apify.openRequestList('cheerio-urls', state().cheerioRequestList);
    const cheerioRequestQueue = await Apify.openRequestQueue();

    const { usernames, keywords, urls } = state().input;
    const totalEntries = usernames.length + keywords.length + urls.length;

    const cheerio = new Apify.CheerioCrawler({
        requestList: cheerioRequestList,
        requestQueue: cheerioRequestQueue,
        maxConcurrency: totalEntries <= 1 ? 200 : 100,
        requestTimeoutSecs: 120,
        maxRequestRetries: 5,
        handlePageTimeoutSecs: 120,
        autoscaledPoolOptions: {
            desiredConcurrency: 100,
        },
        handlePageFunction: async (context) => {
            const { label } = context.request.userData;
            switch (label) {
                case 'USER': {
                    return handleUser(context);
                }
                case 'QUERY': {
                    return handleQuery(context);
                }
                case 'USER_TRACKS': {
                    return handleUserTracks(context);
                }
                case 'TRACK_COMMENTS': {
                    return handleTrackComments(context);
                }
                default: {
                    break;
                }
            }
        },
    });

    if (cheerioRequestList.length()) {
        log.debug('Starting Cheerio');
        await cheerio.run();
        log.debug('Cheerio finished.');
    }
    log.info('Crawl finished.');
});
