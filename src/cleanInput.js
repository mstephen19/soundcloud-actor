const { log } = require('apify').utils;

const { useKVContext } = require('../utils/contextHooks');
const { DEFAULT_CLIENT_ID } = require('./constants');

const cleanInput = async ({
    usernames = [],
    keywords = [],
    urls = [],
    maxComments = 0,
    maxQueryResults = 200,
    maxConcurrency = 100,
    clientId = DEFAULT_CLIENT_ID,
}) => {
    for (const keyword of keywords) {
        if (typeof keyword !== 'string') throw new Error('Keyword must be a string!');
    }

    for (const username of usernames) {
        if (username.match(/\s/g)) throw new Error("SoundCloud usernames can't have spaces!");
        if (username.match(/[!$%^&*()+|~=`{}\[\]:";'<>?,.\/]/)) throw new Error('Soundcloud usernames can only have the symbols "-" and "_"');
    }

    for (const url of urls) {
        const works = (async () => {
            try {
                return new URL(url) || new URL(`https://${url}`);
            } catch (err) {
                return err;
            }
        })();
        if (!works || !url.includes('soundcloud.com')) throw new Error('Invalid SoundCloud URL provided!');
        if (!url.startsWith('https://')) log.warning('Please include "https://" at the beginning of the URL next time.');
    }

    if (maxQueryResults < 200) maxQueryResults = 200;

    const [state, dispatch] = await useKVContext();

    log.debug('Input validated. Updating context.');
    return dispatch({
        type: 'GENERAL',
        payload: {
            input: {
                usernames,
                keywords,
                urls,
                maxComments,
                maxQueryResults,
                maxConcurrency,
                clientId,
                startTime: new Date().getTime(),
            },
        },
    });
};

module.exports = { cleanInput };
