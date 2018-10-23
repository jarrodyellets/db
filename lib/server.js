'use strict';

// Load modules

const Hapi = require('hapi');
const Hoek = require('hoek');

const Database = require('./database');
const Table = require('./table');


// Declare internals

const internals = {
    delay: {
        read: 10,
        write: 50
    }
};


exports.create = async function () {

    // Create server instance

    const server = Hapi.server({
        routes: {
            response: {
                emptyStatusCode: 204
            }
        }
    });

    // Allocate in-memory store

    server.app.store = {};

    // Register endpoints

    await server.register([Database, Table]);

    // Set operations delay

    server.ext('onPostHandler', internals.onPostHandler);

    return server;
};


internals.onPostHandler = async function (request, h) {

    await Hoek.wait(internals.delay[request.route.settings.app.delay]);
    return h.continue;
};
