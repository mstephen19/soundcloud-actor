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
    const [state, dispatch] = await useKVContext();

    // Grab input, validate it, and add it to the sate
    const input = await Apify.getInput();
    // eslint-disable-next-line
    input.debug ? log.setLevel(log.LEVELS.DEBUG) : log.setLevel(log.LEVELS.INFO);
    await cleanInput(input);

    // Create list of user pages to grab IDs from, and store API ready requests in state.cheerioRequestList
    const puppeteerRequestList = await createRequestList();

    const proxyConfiguration = await Apify.createProxyConfiguration({ ...input.proxy });

    const puppy = new Apify.PuppeteerCrawler({
        requestList: puppeteerRequestList,
        maxConcurrency: 50,
        handlePageTimeoutSecs: 60,
        launchContext: {
            launchOptions: {
                headless: true,
            },
        },
        proxyConfiguration,
        handlePageFunction: async (context) => {
            const { label } = context.request.userData;

            // Make page load quicker
            await puppeteer.blockRequests(context.page, {
                urlPatterns: ['.css', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.woff', '.pdf', '.zip'],
            });

            switch (label) {
                case 'USER_PAGE': {
                    // Add API requests to state.cheerioRequestList from user IDs
                    return handleUserPage(context, { state, dispatch });
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

    const cheerio = new Apify.CheerioCrawler({
        requestList: cheerioRequestList,
        requestQueue: cheerioRequestQueue,
        maxConcurrency: state().input.maxConcurrency,
        requestTimeoutSecs: 120,
        maxRequestRetries: 5,
        handlePageTimeoutSecs: 120,
        autoscaledPoolOptions: {
            desiredConcurrency: state().input.maxConcurrency,
        },
        proxyConfiguration,
        handlePageFunction: async (context) => {
            const { label } = context.request.userData;
            switch (label) {
                case 'USER': {
                    return handleUser(context, { state, dispatch });
                }
                case 'QUERY': {
                    return handleQuery(context, { state, dispatch });
                }
                case 'USER_TRACKS': {
                    return handleUserTracks(context, { state, dispatch });
                }
                case 'TRACK_COMMENTS': {
                    return handleTrackComments(context, { state, dispatch });
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

    const { usernames, keywords, urls } = state().input;
    const totalEntries = usernames.length + keywords.length + urls.length;
    const distance = new Date().getTime() - state().input.startTime;

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    log.info(`Scraped ${totalEntries} entries in ${minutes} minutes and ${seconds} seconds.`);
});
