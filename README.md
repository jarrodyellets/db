# mockDB  API Reference


- [mockDB API](#mockdbapi)
  - [Load API](#load)
  - [Server](#server)
    - [`server.start()`](#server.start)
  - [Client](#client)
    - [Client properties](#client-properties)
      - [`client.location`](#client.location)
      - [`client.database`](#client.database)
    - [`client.create()`](#client.create)
    - [`client.table(name, id)`](#client.table)
    - [`client.{tableName}.insert(data)`](#client.insert)
    - [`client.{tableName}.get(id)`](#client.get)
    - [`client.{tableName}.update(data, upsert)`](#client.update)
    - [`client.{tableName}.query(criteria)`](#client.query)
    - [`client.{tableName}.count(criteria)`](#client.count)
    - [`client.{tableName}.remove(id)`](#client.remove)
    - [`client.{tableName}.empty()`](#client.empty)
    - [`client.{tableName}.drop()`](#client.drop)
  - [Testing](#testing)
        
        

# <a name="mockdbapi" /> mockDB API

### <a name="load" /> Load API

To load the mockDB API, type the following: 

```js
const Db = require('@realmark/db');
```

## <a name="server" /> Server

The database runs on a hapi.js server and must be started in order for mockDB to work.  

### <a name="server.start" /> `server.start()`

Its best to run the server in an asynchronous function.  To start the server, run the following:

```js
const init = async () => {
	const server = await Db.server();
	await server.start();
}

init();
```

## <a name="client" /> Client

Once the server is running, you can create a new client object.

To create a new client object, run the following:

```js
const client = new Db.Client({
	location: {location},
	database: {database name}
});
```

The client object has two properties: [`location`](#client.location) and [`database`](#client.database)

### <a name="client-properties" /> Client properties  


#### <a name="client.location" /> `client.location`

Type: `string`.

The `location` property is required and is the location of your database server. The `location` property must be an HTTP address with the correct HTTP header.  You can also use a variable such as:

```js
location: server.info.uri
```

#### <a name="client.database"> `client.database`

Type: `string`.

The `database` property is the name of your database.  This `database` property can only contains letters, either upper or lowercase. If no value is entered, the database name will be `undefined`.


### <a name="client.create"> `client.create()`

Creates a new database after you created the client object.

```js
client.create();
```

Return value: none.

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

### <a name="client.table" /> `client.table(name, id)`

Adds a new table to the database. Each database can store multiple tables.  To create a new table, run the following:

```js
client.table(name, id);
```

- `name` is a required `string` and is the name of the table.

- `id` is a required `object` and sets the type of id's the database table will have. The key `id` will have a value of an object with a key of `type` and a value of either `uuid` or `increment`.

  - `uuid` will use a 128 bit unique identifier for your id's. 

  - `increment` will increment the id's base on the increment options.  `increment` will takes two additional parameters, `initial` and `radix`.

     - `initial` is a `number` sets the initial number the id's will start with.  This parameter must be `0` or greater.  The default is `1`.

     - `radix` is a `number` and sets the radix of the `increment`.  The `radix` is a number and must be between `2` and `36`, with `62` being allowed.  The default is `10`.

```js
client.table('test', { id: { type: 'increment', inital: 0, radix: 62 } });
```

This will create a table called `test` that uses `increment` id's with an initial `id` of `0` and a `radix` of `62`.

Return value: none.


### <a name="client.insert" /> `client.{tableName}.insert(data)`

The `insert(data)` method will insert a data into your database table. To insert data, run the following:

```js
client.{tableName}.insert({id: 'x1', a: 1});
```

- `data` is the data that you want to insert into your table.  If you don't include an `id`, the table will assign an id based on your `table` settings. `data` can either be an `object` or an `array` of `objects`.

Return value: none.

You can add multiple items by using an array:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}]);
```

If you enter data with an id that already exists, the database will overwrite the existing data with the data from the `insert` command.

### <a name="client.get" /> `client.{tableName}.get(id)`

The `get(id)` method will retrieve data that matches the id.

- `id` is a `string` and the id of the data you want to retrieve from the database.

Return value: `object`

See the following:

```js
client.{tableName}.insert({id: 'x1', a: 1});
client.{tableName}.get('x1');
```

This will return `{id: 'x1', a: 1}`.

### <a name="client.update" /> `client.{tableName}.update(data, upsert)`

The `update(data, upsert)` method will update currently stored data.  The `upsert` option will allow to insert the data if the data is not currently stored in the table.

- `data` is the data you want to update on the database.  This must include the `id`.

- `upsert` is an `object` and will allow you to insert the data if the data currently is not stored on the database.  The `upsert` object has a key of `insert` which takes a `boolean` as a value. The default value for `insert` is `false`.

Return value: none.

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

### <a name="client.query" /> `client.{tableName}.query(criteria)`

The `query(criteria)` method will return all the data that matches the `criteria`.

- `criteria` is an `object` and is the data you want to find in the table.  If `criteria` is left blank, the `query` method will return the entire table.

Return value: `array` of `objects`.

See the following:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}]);
client.{tableName}.query();
```

This will return `[{id: 'x1', a: 1}, {id: 'x2', a: 2}]`.

If you specify a criteria, `query` will return everything that matches that criteria.  See the following:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}, {id: 'x3', a:1}]);
client.{tableName}.query({a: 1});
```

This will return `[{id: 'x1', a: 1}, {id: 'x3', a:1})`.

### <a name="client.count" /> `client.{tableName}.count(criteria)`

The `count(criteria)` method will return the number of items that matches the `criteria`.

-`criteria` is an `object` and is any data you want to count in the table.  If `criteria` is left blank, `count` will count all data in the table.

Return value: `number`.

See the following:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}]);
client.{tableName}.count();
```

This will return `2`.

If you specify a criteria, `count` will return everything that matches that criteria.  See the following:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}, {id: 'x3', a:1}]);
client.{tableName}.count({a: 1});
```

This will return `2`.

### <a name="client.remove" /> `client.{tableName}.remove(id)`

The `remove(id)` method will delete data that has the corresponding `id`.

- `id` is a `string` and the id of the corresponding data you want removed from the table.

Return value: none.

See the following:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}]);
client.{tableName}.remove('x1');
client.{tableName}.query();
```

This will return `{id: 'x2', a: 2}`.

You can also remove multiple id's at once by using an array.  See the following:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}, {id: 'x3', a:1}]);
client.{tableName}.remove(['x1', 'x3']);
client.{tableName}.query();
```

This will return `{id: 'x2', a: 2}`.

### <a name="client.empty" /> `client.{tableName}.empty()`

The `empty()` method clears all the data from the table.  The table itself will remain in the database.

Return value: none.

See the following:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}]);
client.{tableName}.empty();
client.{tableName}.query();
```

This will return `[]`.

### <a name="client.drop" /> `client.{tableName}.drop()`

The `drop()` method will delete a table from the database.  

Return value: none.

See the following:

```js
client.{tableName}.insert([{id: 'x1', a: 1}, {id: 'x2', a: 2}]);
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











