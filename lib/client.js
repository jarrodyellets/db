'use strict';

// Load modules

const Bounce = require('bounce');
const Wreck = require('wreck');


// Declare internals

const internals = {};


exports = module.exports = internals.Client = class {

    constructor(options) {

        this._database = options.database;
        this._location = options.location;
    }

    table(name, options = {}) {

        const table = new internals.Table(name, this);
        this[name] = table;

        if (options.create) {
            return table.create(options.create);
        }
    }

    async create() {

        try {
            await Wreck.put(`${this._location}/${this._database}`, { json: true });
        }
        catch (err) {
            Bounce.rethrow(err, 'system');
            throw new Error(err.data.payload.message);
        }
    }
};


internals.Table = class {

    constructor(name, client) {

        this._client = client;
        this.name = name;
    }

    create(options) {

        return this._request('put', '', { payload: options });
    }

    async get(ids) {

        const result = await this._request('get', '/document', { ids, result: true });
        if (Array.isArray(ids)) {
            return result;
        }

        return result[0];
    }

    query(criteria) {

        return this._request('post', '/query', { payload: criteria, result: true });
    }

    count(criteria) {

        return this._request('post', '/count', { payload: criteria, result: true });
    }

    async insert(documents, options) {

        const result = await this._request('post', '/document', { options, payload: documents, result: true });
        if (Array.isArray(documents)) {
            return result;
        }

        return result[0];
    }

    update(documents, options) {

        return this._request('patch', '/document', { options, payload: documents });
    }

    remove(ids) {

        return this._request('delete', '/document', { ids });
    }

    empty() {

        return this._request('delete', '/documents');
    }

    drop() {

        return this._request('delete');
    }

    async _request(method, path = '', options = {}) {

        const { ids, payload, options: flags, result } = options;
        const select = (ids ? '/' + (Array.isArray(ids) ? ids.join(',') : ids) : '');
        const query = internals.query(flags);

        const location = `${this._client._location}/${this._client._database}/${this.name}${path}${select}${query}`;

        try {
            const { payload: output } = await Wreck[method](location, { json: true, payload });
            if (result) {
                return output;
            }
        }
        catch (err) {
            Bounce.rethrow(err, 'system');

            if (!err.data) {
                throw err;
            }

            throw new Error(err.data.payload.message);
        }
    }
};


internals.query = function (flags) {

    if (!flags) {
        return '';
    }

    const pairs = [];
    for (const key in flags) {
        pairs.push(`${key}=${flags[key]}`);
    }

    return `?${pairs.join('&')}`;
};
