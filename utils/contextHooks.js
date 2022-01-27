const Apify = require('apify');
const { VM } = require('vm2');

const vm2 = new VM();

// This prevents us from needing to await the getValue every time we want the state object
let runContext;

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
        await Apify.setValue('REDUCER', { stringReducer: `${stringReducer()}` });
        return Apify.setValue('CONTEXT', { state });
    }
    throw new Error('Context already exists!');
};

const useKVContext = async () => {
    try {
        // Pull from KVStore
        const { stringReducer } = await Apify.getValue('REDUCER');
        const { state } = await Apify.getValue('CONTEXT');
        runContext = state;

        // Get our reducer function from string
        const reducer = vm2.run(stringReducer);

        // Dispatch function updates state
        const dispatch = async (action) => {
            const newState = reducer(runContext, action);
            await Apify.setValue('CONTEXT', { state: newState });
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
