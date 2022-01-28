const { log } = require('apify').utils;

const { useKVContext } = require('../utils/contextHooks');
const { DEFAULT_CLIENT_ID } = require('./constants');

const cleanInput = async ({
    usernames = [],
    keywords = [],
    urls = [],
    maxComments = 0,
    maxQueryResults = 1,
    maxConcurrency = 100,
    clientId = DEFAULT_CLIENT_ID,
}) => {
    for (const keyword of keywords) {
        if (typeof keyword !== 'string') throw new Error('Keyword must be a string!');
    }

    // Validate usernames
    const cleanUsernames = [];
    for (const username of usernames) {
        switch (true) {
            case username.match(/\s/g): {
                log.warning("SoundCloud usernames can't have spaces! Don't include spaces next time.");
                username.replace(/\s/g, '');
                cleanUsernames.push(username);
                break;
            }
            case username.match(/[!$%^&*()+|~=`{}\[\]:";'<>?,.\/]/): {
                log.warning('Soundcloud usernames can only have the symbols "-" and "_". Don\'t include these next time.');
                username.replace(/[!$%^&*()+|~=`{}\[\]:";'<>?,.\/]/, '');
                cleanUsernames.push(username);
                break;
            }
            default: {
                cleanUsernames.push(username);
                break;
            }
        }
    }

    for (const url of urls) {
        const works = (async () => {
            try {
                return new URL(url) || new URL(`https://${url}`);
            } catch (err) {
                return false;
            }
        })();
        if (!works || !url.includes('soundcloud.com')) throw new Error('Invalid SoundCloud URL provided!');
        if (!url.startsWith('https://')) log.warning('Please include "https://" at the beginning of the URL next time.');
    }

    const [state, dispatch] = await useKVContext();

    log.debug('Input validated. Updating context.');
    return dispatch({
        type: 'GENERAL',
        payload: {
            input: {
                usernames: cleanUsernames,
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
