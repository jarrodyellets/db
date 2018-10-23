'use strict';

// Load modules

const Code = require('code');
const Lab = require('lab');

const Db = require('../');


// Declare internals

const internals = {};


// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;


describe('Db', () => {

    describe('Client', () => {

        const provision = async ({ flags, table, database }) => {

            const server = await Db.server();

            flags.onCleanup = () => server.stop();

            await server.start();

            const client = new Db.Client({ location: server.info.uri, database: 'test' });

            if (database !== false) {
                await client.create();
            }

            const create = (table === false ? false : table || { id: { type: 'increment' } });
            await client.table('test', { create });

            return { server, client };
        };

        describe('Database', () => {

            it('errors on unknown database', async (flags) => {

                const { client } = await provision({ flags, database: false, table: false });

                await expect(client.test.get('x1')).to.reject('Unknown database');
            });

            describe('create()', () => {

                it('errors on existing database', async (flags) => {

                    const { client } = await provision({ flags });

                    await expect(client.create()).to.reject('Database exists');
                });
            });
        });

        describe('Table', () => {

            describe('create()', () => {

                it('errors on existing table', async (flags) => {

                    const { client } = await provision({ flags });

                    await expect(client.test.create({ id: { type: 'uuid' } })).to.reject('Table exists');
                });
            });

            describe('insert()', () => {

                it('inserts a document', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert({ id: 'x1', a: 1 });
                    const document = await client.test.get('x1');
                    expect(document).to.equal({ id: 'x1', a: 1 });
                });

                it('inserts multiple documents (separate inserts)', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert({ id: 'x1', a: 1 });
                    await client.test.insert({ id: 'x2', a: 2 });

                    const document1 = await client.test.get('x1');
                    expect(document1).to.equal({ id: 'x1', a: 1 });

                    const document2 = await client.test.get('x2');
                    expect(document2).to.equal({ id: 'x2', a: 2 });
                });

                it('inserts multiple documents (batch)', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    const documents = await client.test.get(['x1', 'x2']);
                    expect(documents).to.equal([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                });

                it('allocates id (increment)', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ a: 1 }, { a: 2 }]);
                    const documents = await client.test.get(['1', '2']);
                    expect(documents).to.equal([{ id: '1', a: 1 }, { id: '2', a: 2 }]);
                });

                it('allocates id (increment base 62)', async (flags) => {

                    const { client } = await provision({ flags, table: { id: { type: 'increment', initial: 1000, radix: 62 } } });

                    const ids = await client.test.insert([{ a: 1 }, { a: 2 }]);
                    expect(ids).to.equal(['g8', 'g9']);
                    const documents = await client.test.get(ids);
                    expect(documents).to.equal([{ id: 'g8', a: 1 }, { id: 'g9', a: 2 }]);
                });

                it('allocates id (uuid)', async (flags) => {

                    const { client } = await provision({ flags, table: { id: { type: 'uuid' } } });

                    const ids = await client.test.insert([{ a: 1 }, { a: 2 }]);
                    expect(ids[0]).to.have.length(32);
                    const documents = await client.test.get(ids);
                    expect(documents).to.equal([{ id: ids[0], a: 1 }, { id: ids[1], a: 2 }]);
                });

                it('overrides a document', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert({ id: 'x1', a: 1 });
                    expect(await client.test.get('x1')).to.equal({ id: 'x1', a: 1 });

                    await client.test.insert({ id: 'x1', a: 2 }, { replace: true });
                    expect(await client.test.get('x1')).to.equal({ id: 'x1', a: 2 });
                });

                it('errors on existing document', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert({ id: 'x1', a: 1 });
                    expect(await client.test.get('x1')).to.equal({ id: 'x1', a: 1 });

                    await expect(client.test.insert({ id: 'x1', a: 2 })).to.reject('Document exists');
                });
            });

            describe('update()', () => {

                it('updates a document', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert({ id: 'x1', a: 1, b: 2 });
                    expect(await client.test.get('x1')).to.equal({ id: 'x1', a: 1, b: 2 });

                    await client.test.update({ id: 'x1', a: 4, c: 3 });
                    expect(await client.test.get('x1')).to.equal({ id: 'x1', a: 4, b: 2, c: 3 });
                });

                it('updates multiple documents', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1, b: 1 }, { id: 'x2', a: 2, b: 2 }]);
                    expect(await client.test.get(['x1', 'x2'])).to.equal([{ id: 'x1', a: 1, b: 1 }, { id: 'x2', a: 2, b: 2 }]);

                    await client.test.update([{ id: 'x1', a: 'x', d: 4 }, { id: 'x2', a: 'y', c: 3 }]);
                    expect(await client.test.get(['x1', 'x2'])).to.equal([{ id: 'x1', a: 'x', b: 1, d: 4 }, { id: 'x2', a: 'y', b: 2, c: 3 }]);
                });

                it('upserts a document', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.update({ id: 'x1', a: 1 }, { insert: true });
                    expect(await client.test.get('x1')).to.equal({ id: 'x1', a: 1 });
                });

                it('upserts multiple documents', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.update([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }], { insert: true });
                    expect(await client.test.get(['x1', 'x2'])).to.equal([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                });

                it('errors on missing document', async (flags) => {

                    const { client } = await provision({ flags });

                    await expect(client.test.update({ id: 'x1', a: 1 })).to.reject('Cannot update unknown document');
                });
            });

            describe('get()', () => {

                it('errors on missing table', async (flags) => {

                    const { client } = await provision({ flags, table: false });

                    await expect(client.test.get('x1')).to.reject('Unknown table');
                });

                it('return null on missing document', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert({ id: 'x1', a: 1 });
                    expect(await client.test.get('x2')).to.be.null();
                });

                it('returns null on missing id in multiple ids request', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert({ id: 'x1', a: 1 });
                    expect(await client.test.get(['x2', 'x1', 'x2'])).to.equal([null, { id: 'x1', a: 1 }, null]);
                });
            });

            describe('query()', () => {

                it('returns all documents', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    expect(await client.test.query()).to.equal([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                });

                it('returns all documents (empty object criteria)', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    expect(await client.test.query({})).to.equal([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                });

                it('returns all documents matching criteria (single key)', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    expect(await client.test.query({ a: 1 })).to.equal([{ id: 'x1', a: 1 }]);
                });

                it('returns all documents matching criteria (multiple keys)', async (flags) => {

                    const { client } = await provision({ flags });

                    const documents = [
                        { id: 'x1', a: 1, b: 1 },
                        { id: 'x2', a: 2, b: 1 },
                        { id: 'x3', a: 2, b: 2 }
                    ];

                    await client.test.insert(documents);

                    expect(await client.test.query({ a: 2 })).to.equal([documents[1], documents[2]]);
                    expect(await client.test.query({ a: 2, b: 1 })).to.equal([documents[1]]);
                });

                it('errors on missing table', async (flags) => {

                    const { client } = await provision({ flags, table: false });

                    await expect(client.test.query({ a: 1 })).to.reject('Unknown table');
                });
            });

            describe('count()', () => {

                it('returns all documents', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    expect(await client.test.count()).to.equal(2);
                });

                it('returns all documents (empty object criteria)', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    expect(await client.test.count({})).to.equal(2);
                });

                it('returns all documents matching criteria (single key)', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    expect(await client.test.count({ a: 1 })).to.equal(1);
                });

                it('returns all documents matching criteria (multiple keys)', async (flags) => {

                    const { client } = await provision({ flags });

                    const documents = [
                        { id: 'x1', a: 1, b: 1 },
                        { id: 'x2', a: 2, b: 1 },
                        { id: 'x3', a: 2, b: 2 }
                    ];

                    await client.test.insert(documents);

                    expect(await client.test.count({ a: 2 })).to.equal(2);
                    expect(await client.test.count({ a: 2, b: 1 })).to.equal(1);
                });

                it('errors on missing table', async (flags) => {

                    const { client } = await provision({ flags, table: false });

                    await expect(client.test.count({ a: 1 })).to.reject('Unknown table');
                });
            });

            describe('remove()', () => {

                it('deletes an id', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert({ id: 'x1', a: 1 });
                    expect(await client.test.get('x1')).to.exist();

                    await client.test.remove('x1');
                    expect(await client.test.get('x1')).to.not.exist();
                });

                it('deletes multiple ids', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    expect(await client.test.get(['x1', 'x2'])).to.equal([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);

                    await client.test.remove(['x1', 'x2']);
                    expect(await client.test.get(['x1', 'x2'])).to.equal([null, null]);
                });

                it('errors on unknown table', async (flags) => {

                    const { client } = await provision({ flags, table: false });

                    await expect(client.test.remove('x1')).to.reject('Unknown table');
                });
            });

            describe('empty()', () => {

                it('empties entire table', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.insert([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);
                    expect(await client.test.get(['x1', 'x2'])).to.equal([{ id: 'x1', a: 1 }, { id: 'x2', a: 2 }]);

                    await client.test.empty();
                    expect(await client.test.get(['x1', 'x2'])).to.equal([null, null]);
                    expect(await client.test.count()).to.equal(0);
                });

                it('errors on unknown table', async (flags) => {

                    const { client } = await provision({ flags, table: false });

                    await expect(client.test.empty()).to.reject('Unknown table');
                });
            });

            describe('drop()', () => {

                it('deletes table', async (flags) => {

                    const { client } = await provision({ flags });

                    await client.test.drop();
                    await expect(client.test.drop()).to.reject('Unknown table');
                });

                it('errors on unknown table', async (flags) => {

                    const { client } = await provision({ flags, table: false });

                    await expect(client.test.empty()).to.reject('Unknown table');
                });
            });

            describe('_request()', () => {

                it('errors on connection error', async (flags) => {

                    const { client, server } = await provision({ flags });

                    await server.stop();

                    await expect(client.test.insert({ id: 'x1', a: 1 })).to.reject();
                });
            });
        });
    });
});
