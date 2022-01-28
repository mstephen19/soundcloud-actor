const Apify = require('apify');
const { useKVContext } = require('../utils/contextHooks');
const { BASE_URL, API_URL } = require('./constants');

const { log } = Apify.utils;

const createRequestList = async () => {
    const [state, dispatch] = await useKVContext();

    // If the request must go through puppeteer to grab user ID, send it to requests
    // Otherwise, add it to cheerioRequestList
    const cheerioRequestList = [];
    const requests = [];

    log.debug('Creating request lists.');
    for (const username of state().input.usernames) {
        requests.push({
            url: `${BASE_URL}/${username}`,
            userData: { label: 'USER_PAGE', username },
        });
    }

    // The max limit SoundCloud API allows for search results is 200
    const queryLimit = state().input.maxQueryResults > 200 ? 200 : state().input.maxQueryResults;

    await dispatch({
        type: 'GENERAL',
        payload: { queryLimit },
    });

    for (const keyword of state().input.keywords) {
        cheerioRequestList.push({
            url: `${API_URL}/search?q=${keyword}&client_id=${state().input.clientId}&limit=${queryLimit}&offset=0`,
            userData: { label: 'QUERY', identifier: keyword, number: 1 },
        });
    }

    for (const link of state().input.urls) {
        if (link.includes('search')) {
            // Parse query and format QUERY request
            const keyword = new URL(link).searchParams.get('q');
            cheerioRequestList.push({
                url: `${API_URL}/search?q=${keyword}&client_id=${state().input.clientId}&limit=${queryLimit}&offset=0`,
                userData: { label: 'QUERY', identifier: keyword, number: 1 },
            });
        } else {
            // Parse username and format USER_PAGE request
            const username = link.split('.com/')[1].split('/')[0];
            requests.push({
                url: `${BASE_URL}/${username}`,
                userData: { label: 'USER_PAGE', username },
            });
        }
    }

    log.debug('Updating context with cheerioRequestList.');
    await dispatch(
        {
            type: 'GENERAL',
            payload: { cheerioRequestList },
        },
        false
    );

    return Apify.openRequestList('puppeteer-urls', requests);
};

module.exports = { createRequestList };
