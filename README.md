# mockDB Client API Reference


- [Client API](#clientapi)
  - [Load API](#load)
  - [Server](#server)
    - [`server.start()`](#server.start)
  - [Database](#database)
    - [`new`](#new)
      - [`client.location`](#client.location)
      - [`client.database`](#client.database)
    - [`client.create()`](#client.create)
    - [`client.table(name, id)`](#client.table)
      - [`client.table.uuid`](#client.table.uuid)
      - [`client.table.increment`](#client.table.increment)
    - [`client.{tableName}.insert(data)`](#client.insert)
    - [`client.{tableName}.get(id)`](#client.get)
    - [`client.{tableName}.update(data, upsert)`](#client.update)
    - [`client.{tableName}.query(criteria)`](#client.query)
    - [`client.{tableName}.count(criteria)`](#client.count)
    - [`client.{tableName}.remove(id)`](#client.remove)
    - [`client.{tableName}.empty()`](#client.empty)
    - [`client.{tableName}.drop()`](#client.drop)
  - [Testing](#testing)
        
        

## <a name="clientapi" /> Client API

### <a name="load" /> Load API

To load the mockDb Client API, type the following: 

```js
const Db = require('@realmark/db')
```

### <a name="server" /> Server

The database runs on a hapi.js server and must be started in order for mockDB to work.  

#### <a name="server.start" /> `server.start()`

Its best to run the server in a asynchronous function.  To start the server, run the following:

```js
const init = async () => {
	const server = await Db.server();
	await server.start();
}

init();
```

### <a name="database" /> Database

Before you can create a new database, you first have to create a new database object.  

#### <a name="new" /> `new`

To create a new database object, run the following:

```js
const client = new Db.Client({
	location: {location},
	database: {database name}
});
```

The database object takes two parameters: [`location`](#client.location) and [`database`](#client.database)

#### <a name="client.location" /> `client.location`

The `location` parameter is required and is the location of your database server. The `location` parameter must be an http address with the correct http header.  You can also use a variable such as:

```js
location: server.info.uri
```

#### <a name="client.database"> `client.database`

The `database` parameter is the name of your database.  This `database` parameter is a `string` and only contains letters, either upper or lowercase.

#### <a name="client.create"> `client.create()`

After you create your new database object, you then need to create to database on the server.  To do this, run the following:

```js
client.create()
```

- Note, that this function needs to be run after the server has started.  If need-be, you can run this command in the `init` function you create earlier, like so:

```js
const init = async () => {
	const server = await Db.server();
	await server.start();

	const client = new Db.Client({
		location: {location},
		database: {database name}
	});

	await client.create();
}

init();
```

#### <a name="client.table" /> `client.table(name, id)`

Once your database has been created, you then need to make a database `table`.  The `table` is where the database will store all of your data.  Each database can hold multiple tables.  To create a new `table`, run the following:

```js
client.table(name, id);
```

- `name` is a required `string` and is the name of the table.

- `id` is a required `string` and sets what kind of id's you want your table to have.  Value can either be [`uuid`](#client.table.options) or [`increment`](#client.table.options).

#### <a name="client.table.uuid" /> `client.table.uuid`  

`uuid` will use a 128 bit unique identifier for your id's. 

```js
client.table('test', { id: { type: 'uuid' } });
```

This will create a table called `test` that uses `uuid` for its id's.

#### <a name="client.table.increment" /> `client.table.increment`

`increment` will increment the id's base on the increment options. `increment` takes two aditional parameters, `initial` and `radix`.

- `initial` sets the initial number the id's will start with.  This parameter must be `0` or greater.  The default is `1`.

- `radix` sets the radix of the `increment`.  The `radix` is a number and must be between `2` and `36`, with `62` being allowed.  The default is `10`.

```js
client.table('test', { id: { type: 'increment', inital: 0, radix: 62 } });
```

This will create a table called `test` that uses `increment` id's with an initial `id` of `0` and a `radix` of `62`.

#### <a name="client.insert" /> `client.{tableName}.insert(data)`

The `insert` method will insert a data into your database table. To insert data, run the following:

```js
client.{tableName}.insert({id: x1, a: 1});
```

- `data` is the data that you want to insert into your table.  If you don't include an `id`, the table will assign an id based on your [`client.table(data, id)`](#client.table) settings.

You can add multiple items by using an array:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}]);
```

If you enter data with an id that already exists, the database will overwrite the existing data with the data from the `insert` command.

#### <a name="client.get" /> `client.{tableName}.get(id)`

The `get(id)` method will retrieve data that matches the id.

- `id` is a `string` and the id of the data you want to retrieve from the database.

See the following:

```js
client.{tableName}.insert({id: 'x1', a: 1});
client.{tableName}.get('x1');
```

This will return `{id: 'x1', a: 1}`.

#### <a name="client.update" /> `client.{tableName}.update(data, upsert)`

The `update(data, upsert)` method will update currently stored data.  The `upsert` option is a boolean and will allow to insert the data if the data currently is not store.  The default for `upsert` is `false`.  See the following:

- `data` is the data you want to update on the database.  This must include the `id`

- `upsert` is a boolean and will allow you to insert the data if the data currently is not stored on the database.  The default for `upsert` is `false`.

See the following:

```js
client.{tableName}.insert({id: 'x1', a: 1});
client.{tableName}.update({id: 'x1', a: 5});
client.{tableName}.get('x1');
```

This will return `{id: 'x1', a: 5}`.

You can set the `upsert` boolean to `true` to insert data via the `update` method.  See the following: 

```js
client.{tableName}.insert({id: 'x1', a: 1});
client.{tableName}.update({id: 'x2', a: 5}, { insert: true });
client.{tableName}.get(['x1', 'x2');
```

This will return: `[{id: 'x1', a: 1}, {id: 'x2', a: 5}]`.

#### <a name="client.query" /> `client.{tableName}.query(criteria)`

The `query(criteria)` method will return all the data that matches the `criteria`.

- `criteria` is any data you want to find in the database.  If `criteria` is left blank, the `query` method will return the entire table.

See the following:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}]);
client.{tableName}.query();
```

This will return `[{id: x1, a: 1}, {id: x2, a: 2}]`.

If you specify a criteria, `query` will return everything that matches that criteria.  See the following:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}, {id: 'x3', a:1}]);
client.{tableName}.query({a: 1});
```

This will return `[{id: 'x1', a: 1}, {id: 'x3', a:1})`.

#### <a name="client.count" /> `client.{tableName}.count(criteria)`

The `count(criteria)` method will return the number of items that matches the `criteria`.

-`criteria` is any data you want to count in the database.  If `criteria` is left blank, `count` will count all data in the database.

See the following:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}]);
client.{tableName}.count();
```

This will return `2`.

If you specify a criteria, `count` will return everything that matches that criteria.  See the following:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}, {id: 'x3', a:1}]);
client.{tableName}.count({a: 1});
```

This will return `2`.

#### <a name="client.remove" /> `client.{tableName}.remove(id)`

The `remove(id)` method will delete data that has the corresponding `id`.

- `id` is a `string` and the id of the corresponding data you want removed from the database.

See the following:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}]);
client.{tableName}.remove('x1');
client.{tableName}.query();
```

This will return `{id: x2, a: 2}`.

You can also remove multiple id's at once by using an array.  See the following:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}, {id: 'x3', a:1}]);
client.{tableName}.remove(['x1', 'x3']);
client.{tableName}.query();
```

This will return `{id: 'x2', a: 2}`.

#### <a name="client.empty" /> `client.{tableName}.empty()`

The `empty()` method clears all the data from the table.  The table itself will remain in the database.  See the following:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}]);
client.{tableName}.empty();
client.{tableName}.query();
```

This will return `[]`.

#### <a name="client.drop" /> `client.{tableName}.drop()`

The `drop()` method will delete a table from the database.  See the following:

```js
client.{tableName}.insert([{id: x1, a: 1}, {id: x2, a: 2}]);
client.{tableName}.drop();
client.{tableName}.query();
```

This will return `Error: Unknown table`.

### <a name="testing" /> Testing

You can test the integrity of the database by running the following command from the `@realmark/db` folder:

```js
npm run test-cov-html
```

The command will generate an HTML page called `coverage.html`.  Open this page to view test results.




