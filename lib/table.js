'use strict';

// Load modules

const Crypto = require('crypto');

const Boom = require('boom');
const Joi = require('joi');
const Radix62 = require('radix62');

const Types = require('./types');


// Declare internals

const internals = {};


exports = module.exports = {
    name: 'table',
    register: function (server, options) {

        server.ext('onPreHandler', internals.onPreHandler, { sandbox: 'plugin' });

        server.route({ method: 'PUT', path: '/{db}/{table}', config: internals.create });

        server.route({ method: 'POST', path: '/{db}/{table}/document', config: internals.insert });
        server.route({ method: 'PATCH', path: '/{db}/{table}/document', config: internals.update });

        server.route({ method: 'GET', path: '/{db}/{table}/document/{ids}', config: internals.get });
        server.route({ method: 'POST', path: '/{db}/{table}/query', config: internals.query });
        server.route({ method: 'POST', path: '/{db}/{table}/count', config: internals.count });

        server.route({ method: 'DELETE', path: '/{db}/{table}/document/{ids}', config: internals.remove });
        server.route({ method: 'DELETE', path: '/{db}/{table}/documents', config: internals.empty });
        server.route({ method: 'DELETE', path: '/{db}/{table}', config: internals.drop });
    }
};


internals.onPreHandler = function (request, h) {

    const store = request.server.app.store;
    const { db, table, ids } = request.params;

    if (!store[db]) {
        throw Boom.notFound('Unknown database');
    }

    if (!store[db][table] &&
        !request.route.settings.app.create) {

        throw Boom.notFound('Unknown table');
    }

    if (ids) {
        request.params.ids = ids.split(',');
    }

    request.app.table = store[db][table];

    return h.continue;
};


internals.create = {
    app: {
        create: true,
        delay: 'write'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table
        },
        payload: {
            id: Joi.alternatives([
                {
                    type: 'uuid'
                },
                {
                    type: 'increment',
                    initial: Joi.number().integer().min(0).default(1),
                    radix: Joi.number().integer().min(2).max(36).allow(62).default(10)
                }
            ])
                .required()
        }
    },
    handler: (request, h) => {

        const store = request.server.app.store;
        const { db, table } = request.params;

        if (store[db][table]) {
            throw Boom.conflict('Table exists');
        }

        store[db][table] = {
            settings: request.payload,
            data: new Map()
        };

        return null;
    }
};


internals.insert = {
    app: {
        delay: 'write'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table
        },
        query: {
            replace: Types.flag
        },
        payload: Types.documents({ id: false })
    },
    handler: (request, h) => {

        const table = request.app.table.data;
        const documents = request.payload;

        const ids = [];
        for (const document of documents) {
            if (!document.id) {
                document.id = internals.allocate(request.app.table);
            }

            if (table.has(document.id) &&
                !request.query.replace) {

                throw Boom.conflict('Document exists');
            }

            table.set(document.id, document);
            ids.push(document.id);
        }

        return ids;
    }
};


internals.update = {
    app: {
        delay: 'write'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table
        },
        query: {
            insert: Types.flag
        },
        payload: Types.documents()
    },
    handler: (request, h) => {

        const table = request.app.table.data;
        const documents = request.payload;

        for (const document of documents) {
            if (table.has(document.id)) {
                Object.assign(table.get(document.id), document);
            }
            else {
                if (!request.query.insert) {
                    throw Boom.conflict('Cannot update unknown document');
                }

                table.set(document.id, document);        // Upsert
            }
        }

        return null;
    }
};


internals.get = {
    app: {
        delay: 'read'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table,
            ids: Types.ids
        }
    },
    handler: (request, h) => {

        const table = request.app.table.data;
        const { ids } = request.params;

        return ids.map((id) => {

            return table.get(id) || null;
        });
    }
};


internals.query = {
    app: {
        delay: 'read'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table
        },
        payload: Types.criteria
    },
    handler: (request, h) => {

        const table = request.app.table.data;

        let criteria = request.payload;
        if (criteria &&
            !Object.keys(criteria).length) {

            criteria = null;
        }

        const results = [];
        for (const [, document] of table) {
            if (internals.match(document, criteria)) {
                results.push(document);
            }
        }

        return results;
    }
};


internals.count = {
    app: {
        delay: 'read'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table
        },
        payload: Types.criteria
    },
    handler: (request, h) => {

        const table = request.app.table.data;

        const criteria = request.payload;
        if (!criteria ||
            !Object.keys(criteria).length) {

            return table.size;
        }

        let count = 0;
        for (const [, document] of table) {
            if (internals.match(document, criteria)) {
                ++count;
            }
        }

        return count;
    }
};


internals.remove = {
    app: {
        delay: 'write'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table,
            ids: Types.ids
        }
    },
    handler: (request, h) => {

        const table = request.app.table.data;
        const { ids } = request.params;

        for (const id of ids) {
            table.delete(id);
        }

        return null;
    }
};


internals.empty = {
    app: {
        delay: 'write'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table
        }
    },
    handler: (request, h) => {

        const table = request.app.table.data;

        table.clear();

        return null;
    }
};


internals.drop = {
    app: {
        delay: 'write'
    },
    validate: {
        params: {
            db: Types.db,
            table: Types.table
        }
    },
    handler: (request, h) => {

        const store = request.server.app.store;
        const { db, table } = request.params;

        delete store[db][table];

        return null;
    }
};


internals.match = function (document, criteria) {

    if (!criteria) {
        return true;
    }

    for (const key in criteria) {
        if (document[key] !== criteria[key]) {
            return false;
        }
    }

    return true;
};


internals.allocate = function (table) {

    const settings = table.settings;
    const type = settings.id.type;

    // UUID

    if (type === 'uuid') {
        return internals.uuid();
    }

    // Increment

    if (settings._ids === undefined) {
        settings._ids = settings.id.initial;
    }

    const id = settings._ids;
    ++settings._ids;

    if (settings.id.radix <= 36) {
        return id.toString(settings.id.radix);
    }

    return Radix62.to(id);
};


internals.byteToHex = [
    '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
    '0a', '0b', '0c', '0d', '0e', '0f', '10', '11', '12', '13',
    '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d',
    '1e', '1f', '20', '21', '22', '23', '24', '25', '26', '27',
    '28', '29', '2a', '2b', '2c', '2d', '2e', '2f', '30', '31',
    '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b',
    '3c', '3d', '3e', '3f', '40', '41', '42', '43', '44', '45',
    '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f',
    '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
    '5a', '5b', '5c', '5d', '5e', '5f', '60', '61', '62', '63',
    '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d',
    '6e', '6f', '70', '71', '72', '73', '74', '75', '76', '77',
    '78', '79', '7a', '7b', '7c', '7d', '7e', '7f', '80', '81',
    '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b',
    '8c', '8d', '8e', '8f', '90', '91', '92', '93', '94', '95',
    '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f',
    'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9',
    'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'b0', 'b1', 'b2', 'b3',
    'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd',
    'be', 'bf', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7',
    'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf', 'd0', 'd1',
    'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db',
    'dc', 'dd', 'de', 'df', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5',
    'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef',
    'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9',
    'fa', 'fb', 'fc', 'fd', 'fe', 'ff'
];


internals.uuid = function () {

    // Based on node-uuid - https://github.com/broofa/node-uuid - Copyright (c) 2010-2012 Robert Kieffer - MIT License

    const b = internals.byteToHex;
    const buf = Crypto.randomBytes(16);

    buf[6] = (buf[6] & 0x0f) | 0x40;            // Per RFC 4122 (4.4) - set bits for version and clock_seq_hi_and_reserved
    buf[8] = (buf[8] & 0x3f) | 0x80;

    return (b[buf[0]] + b[buf[1]] + b[buf[2]] + b[buf[3]] +
        b[buf[4]] + b[buf[5]] +
        b[buf[6]] + b[buf[7]] +
        b[buf[8]] + b[buf[9]] +
        b[buf[10]] + b[buf[11]] + b[buf[12]] + b[buf[13]] + b[buf[14]] + b[buf[15]]);
};
