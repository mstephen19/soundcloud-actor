const { createKVContext } = require('../utils/contextHooks');

const reducer = (state, action) => {
    switch (action.type) {
        default: {
            return state;
        }
        case 'GENERAL': {
            return {
                ...state,
                ...action.payload,
            };
        }
        case 'ADD_REQUEST': {
            return {
                ...state,
                cheerioRequestList: [...state?.cheerioRequestList, action.payload],
            };
        }
        case 'ADD_USER': {
            return {
                ...state,
                users: { ...state?.users, ...action.payload },
            };
        }
        case 'ADD_TO_USER': {
            return {
                ...state,
                users: { ...state?.users, [action.identifier]: { ...state.users[action.identifier], ...action.payload } },
            };
        }
        case 'ADD_TRACK': {
            return {
                ...state,
                tracks: { ...state?.tracks, ...action.payload },
            };
        }
        case 'ADD_QUERY': {
            return {
                ...state,
                queries: { ...state?.queries, ...action.payload },
            };
        }
        case 'ADD_TO_QUERY': {
            return {
                ...state,
                queries: { ...state?.queries, [action.identifier]: [...state?.queries[action.identifier], ...action.payload] },
            };
        }
        case 'DELETE_TRACK': {
            delete state.tracks[action.payload];
            return {
                ...state,
                users: {
                    ...state?.users,
                    [action.identifier]: { ...state?.users[action.identifier], tracks: [...state?.users[action.identifier].tracks, action.track] },
                },
            };
        }
        case 'DELETE_USER': {
            delete state.users[action.identifier];
            return state;
        }
    }
};

exports.initContext = async () => createKVContext({}, reducer);
