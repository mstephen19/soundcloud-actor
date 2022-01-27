const Apify = require('apify');
const { VM } = require('vm2');

const { log } = Apify.utils;
const vm2 = new VM();

// This prevents us from needing to await the getValue every time we want the state object
let runContext;

// We update the KVStore with the run context every 15 seconds
let nextUpdate;

const createKVContext = async (state, userReducer) => {
    if (!state) throw new Error('Must provide an initial state.');
    if (!userReducer) throw new Error('Must provide a reducer function.');

    // Create a new function which returns our reducer function
    const stringReducer = () => {
        return userReducer;
    };

    const check = await Apify.getValue('CONTEXT');

    if (!check) {
        // Set context for run as well as store it in the KVStore
        runContext = state;

        nextUpdate = new Date();
        nextUpdate.setSeconds(nextUpdate.getSeconds() + 15);

        await Apify.setValue('REDUCER', { stringReducer: `${stringReducer()}` });
        return Apify.setValue('CONTEXT', { state });
    }
    throw new Error('Context already exists!');
};

const useKVContext = async () => {
    try {
        // Pull from KVStore
        const { stringReducer } = await Apify.getValue('REDUCER');

        // Get our reducer function from string
        const reducer = vm2.run(stringReducer);

        // Dispatch function updates state
        const dispatch = async (action) => {
            log.debug('Running a dispatch');

            const newState = reducer(runContext, action);
            runContext = newState;

            // If it's time to update, update the context.
            if (nextUpdate < new Date()) {
                log.info('Saving context to KVStore');
                nextUpdate = new Date();
                nextUpdate.setSeconds(nextUpdate.getSeconds() + 15);
                return Apify.setValue('CONTEXT', { state: runContext });
            }
        };

        const getState = () => {
            return runContext;
        };

        return [getState, dispatch];
    } catch (error) {
        throw new Error(error);
    }
};

module.exports = { createKVContext, useKVContext };
