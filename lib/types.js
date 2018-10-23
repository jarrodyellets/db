'use strict';

// Load modules

const Boom = require('boom');
const Joi = require('joi');


// Declare internals

const internals = {};


internals.identifier = Joi.string().alphanum().min(1).max(250);


internals.document = (options) => {

    return Joi.object({
        id: options.id !== false ? internals.identifier.required() : internals.identifier
    })
        .unknown();
};


exports = module.exports = internals.types = {

    db: internals.identifier,
    table: internals.identifier,
    ids: Joi.string().regex(/^\w{1,250}(?:,\w{1,250})*$/),
    documents: (options = {}) => Joi.array().items(internals.document(options)).single().error(Boom.badData('Document missing string id key')),
    flag: Joi.boolean().default(false),
    criteria: Joi.object().allow(null)
};
