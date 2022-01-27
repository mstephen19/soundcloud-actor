const Apify = require('apify');
const { useKVContext } = require('../utils/contextHooks');
const { API_URL } = require('./constants');
const Parser = require('./Parser');

const { log } = Apify.utils;

const handleUserPage = async ({ page, request }) => {
    const [state, dispatch] = await useKVContext();

    const { username } = request.userData;
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
};

const handleUser = async ({ json, request, crawler: { requestQueue } }) => {
    const [state, dispatch] = await useKVContext();
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

const handleUserTracks = async ({ json, request, crawler: { requestQueue } }) => {
    const [state, dispatch] = await useKVContext();
    const { identifier } = request.userData;
    log.debug(`Handling user ${identifier} tracks`);
    try {
        // This "collection" is all of our user's tracks
        const { collection } = json;

        if (collection.length > 150) {
            log.warning(`User with username ${state().users[identifier].username} has ${collection.length} tracks. This may take a few minutes.`);
        }

        // If we want comments, prepare for it
        if (state().input.maxComments > 0) {
            for (const track of collection) {
                const trackId = track.id;

                const trackObj = Parser.createTrackObject(track);
                const trackNumber = collection.length;

                // Add the track to our context
                await dispatch({
                    type: 'ADD_TRACK',
                    payload: { [trackId]: { ...trackObj, comments: [] } },
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

const handleTrackComments = async ({ json, request }) => {
    const [state, dispatch] = await useKVContext();
    const { identifier, trackId, trackNumber } = request.userData;
    log.debug(`Handling track comments for track with ID ${trackId}`);
    try {
        const { collection } = json;

        // Create a formatted object from each comment
        const comments = Parser.createCommentsObjects(collection);

        // Set the track's comments to our results
        const track = state().tracks[trackId];
        track.comments = comments;

        // Delete finished track from context, add it to user's context
        await dispatch({
            type: 'DELETE_TRACK',
            payload: trackId,
        });

        await dispatch({
            type: 'ADD_TO_USER',
            identifier,
            payload: { tracks: [...state().users[identifier].tracks, track] },
        });

        if (state().users[identifier].tracks.length >= trackNumber) {
            log.info(`Scraped user with username of ${state().users[identifier].username}`);
            await Apify.pushData({ [state().users[identifier].username]: [{ type: 'user' }, { ...state().users[identifier] }] });

            return dispatch({
                type: 'DELETE_USER',
                payload: identifier,
            });
        }
    } catch (error) {
        throw new Error(`Failed to grab track comments for track with ID ${trackId}: ${error}`);
    }
};

const handleQuery = async ({ json, request, crawler: { requestQueue } }) => {
    const [state, dispatch] = await useKVContext();
    const { identifier, number } = request.userData;

    if (!state().queries?.[identifier]) {
        await dispatch({
            type: 'ADD_QUERY',
            payload: { [identifier]: [...json.collection] },
        });
    } else {
        await dispatch({
            type: 'ADD_TO_QUERY',
            identifier,
            payload: [...json.collection],
        });
    }

    if (state().queries[identifier].length >= state().input.maxQueryResults || !json?.next_href) {
        log.info(`Scraped query ${identifier}`);
        return Apify.pushData({
            [identifier]: [{ type: 'query', rawResults: state().queries[identifier].length }, [...state().queries[identifier]]],
        });
    }

    log.debug(`Paginating query request ${identifier} to page ${number + 1}`);
    const url = new URL(request.url);
    url.searchParams.set('offset', `${200 * number}`);
    return requestQueue.addRequest({
        url: url.toString(),
        userData: { label: 'QUERY', identifier, number: number + 1 },
    });
};

module.exports = { handleUserPage, handleUser, handleQuery, handleUserTracks, handleTrackComments };
