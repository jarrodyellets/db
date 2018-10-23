'use strict';

// Load modules

const Boom = require('boom');

const Types = require('./types');


// Declare internals

const internals = {};


exports = module.exports = {
    name: 'database',
    register: function (server, options) {

        server.route({ method: 'PUT', path: '/{db}', config: internals.create });
    }
};


internals.create = {
    app: {
        delay: 'write'
    },
    validate: {
        params: {
            db: Types.db
        }
    },
    handler: (request, h) => {

        const store = request.server.app.store;
        const { db } = request.params;

        if (store[db]) {
            throw Boom.conflict('Database exists');
        }

        store[db] = {};

        return null;
    }
};
