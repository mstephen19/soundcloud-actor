const Apify = require('apify');
const { useKVContext } = require('../utils/contextHooks');
const { API_URL } = require('./constants');
const Parser = require('./Parser');

const { log } = Apify.utils;

const handleUserPage = async ({ page, request }, { state, dispatch }) => {
    const { username } = request.userData;
    try {
        await page.waitForSelector('#content', { timeout: 2500 });

        // Parse hydration object from page and grab the user's ID
        const { id } = await Parser.getUserObject(page, username);

        if (!id) return log.error(`User with ${username} not found.`);

        log.debug(`Scraped user ${username} ID of ${id}. Updating cheerioRequestList`);

        // Add request to our context
        return dispatch({
            type: 'ADD_REQUEST',
            payload: { url: `${API_URL}/users/${id}?client_id=${state().input.clientId}`, userData: { label: 'USER', identifier: id } },
        });
    } catch (error) {
        throw new Error(`Failed to parse user object on page for ${username}`);
    }
};

const handleUser = async ({ json, request, crawler: { requestQueue } }, { state, dispatch }) => {
    const { identifier } = request.userData;
    log.debug(`Handling user with ID ${identifier}`);
    try {
        const user = Parser.createUserObject(json);

        // Add user to our context
        await dispatch({
            type: 'ADD_USER',
            payload: { [identifier]: { ...user, tracks: [] } },
        });

        // Add request for user's tracks
        return requestQueue.addRequest({
            url: `${API_URL}/users/${identifier}/tracks?limit=9999&client_id=${state().input.clientId}`,
            userData: { label: 'USER_TRACKS', identifier },
        });
    } catch (error) {
        throw new Error(`Failed to grab data for user with ID ${identifier}: ${error}`);
    }
};

const handleUserTracks = async ({ json, request, crawler: { requestQueue } }, { state, dispatch }) => {
    const { identifier } = request.userData;
    log.debug(`Handling user ${identifier} tracks`);
    try {
        // This "collection" is all of our user's tracks
        const { collection } = json;

        if (collection.length > 150) {
            log.warning(`User with username ${state().users[identifier].username} has ${collection.length} tracks. This may take a bit longer.`);
        }

        // If we want comments, prepare for it
        if (state().input.maxComments > 0) {
            for (const track of collection) {
                const trackId = track.id;

                // const trackObj = Parser.createTrackObject(track);
                const trackNumber = collection.length;

                // Add the track to our context
                await dispatch({
                    type: 'ADD_TRACK',
                    payload: { [trackId]: { ...track } },
                });

                // Add a request for the track's comments
                await requestQueue.addRequest({
                    url: `${API_URL}/tracks/${trackId}/comments?filter_replies=0&client_id=${state().input.clientId}&threaded=1&limit=${
                        state().input.maxComments
                    }`,
                    // Include our identifier and trackId so we can access the user
                    userData: { label: 'TRACK_COMMENTS', identifier, trackId, trackNumber },
                });
            }
            return;
        }
        log.info(`Scraped user with username of ${state().users[identifier].username}`);
        return Apify.pushData({ [state().users[identifier].username]: [{ type: 'user' }, { ...state().users[identifier], tracks: collection }] });
    } catch (error) {
        throw new Error(`Failed to grab track data for user with ID ${identifier}: ${error}`);
    }
};

const handleTrackComments = async ({ json, request }, { state, dispatch }) => {
    const { identifier, trackId, trackNumber } = request.userData;
    log.debug(`Handling track comments for track with ID ${trackId}`);
    try {
        const { collection } = json;

        // Create a formatted object from each comment
        const comments = Parser.createCommentsObjects(collection);

        // Set the track's comments to our results
        const trackObj = state().tracks[trackId];
        const track = Parser.createTrackObject(trackObj);
        track.comments = comments;

        // Delete finished track from context, add it to user's context
        await dispatch({
            type: 'DELETE_TRACK',
            payload: trackId,
            identifier,
            track,
        });

        if (state().users[identifier].tracks.length >= trackNumber) {
            log.info(`Scraped user with username of ${state().users[identifier].username}`);
            return Apify.pushData({ [state().users[identifier].username]: [{ type: 'user' }, { ...state().users[identifier] }] });
        }
    } catch (error) {
        throw new Error(`Failed to grab track comments for track with ID ${trackId}: ${error}`);
    }
};

const handleQuery = async ({ json, request, crawler: { requestQueue } }, { state, dispatch }) => {
    const { identifier, number } = request.userData;
    try {
        // If query doesn't exist in the context, instantiate it
        if (!state().queries?.[identifier]) {
            await dispatch({
                type: 'ADD_QUERY',
                payload: { [identifier]: [...json.collection] },
            });
        } else {
            // Otherwise just add results to the query state
            await dispatch({
                type: 'ADD_TO_QUERY',
                identifier,
                payload: [...json.collection],
            });
        }
        const actualLength = state().queries[identifier].length;
        const desiredLength = state().input.maxQueryResults;

        if (actualLength >= desiredLength || !json?.next_href) {
            let results = state().queries[identifier];

            // Ensure we are only giving back number of results that was requested in input
            if (actualLength > desiredLength) {
                results = results.slice(0, desiredLength);
            }

            log.info(`Scraped query ${identifier}`);
            return Apify.pushData({
                [identifier]: [{ type: 'query', rawResults: results.length }, [...results]],
            });
        }

        log.debug(`Paginating query request ${identifier} to page ${number + 1}`);
        const url = new URL(request.url);

        // Max results is 200, so offset it by 200 * requestNumber
        url.searchParams.set('offset', `${200 * number}`);
        return requestQueue.addRequest({
            url: url.toString(),
            userData: { label: 'QUERY', identifier, number: number + 1 },
        });
    } catch (error) {
        throw new Error(`Failed on query page ${number} for query ${identifier}`);
    }
};

module.exports = { handleUserPage, handleUser, handleQuery, handleUserTracks, handleTrackComments };
