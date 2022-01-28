const Apify = require('apify');
const { VM } = require('vm2');

const { log } = Apify.utils;
const vm2 = new VM();

// This prevents us from needing to await the getValue every time we want the state object
let runContext;

let stringReducerFn;

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

        stringReducerFn = `${stringReducer()}`;

        await Apify.setValue('REDUCER', { stringReducer: `${stringReducer()}` });
        await Apify.setValue('CONTEXT', { state });

        return setInterval(async () => {
            log.info('Saving context to KVStore');
            return Apify.setValue('CONTEXT', { state: runContext });
        }, 15000);
    }
    throw new Error('Context already exists!');
};

const useKVContext = async () => {
    try {
        // If not local in run, pull from KVStore
        const stringReducer = stringReducerFn ?? (await Apify.getValue('REDUCER').stringReducer);

        // Get our reducer function from string
        const reducer = vm2.run(stringReducer);

        // Dispatch function updates state
        const dispatch = async (action) => {
            log.debug('Running a dispatch');

            const newState = reducer(runContext, action);
            runContext = newState;
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
