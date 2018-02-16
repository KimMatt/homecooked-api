// Authors: Matthew Kim
// mtt.kim@mail.utoronto.ca
//
// Code to initialize the database and get a connection to the database
// Using mysql2 node - https://github.com/sidorares/node-mysql2
//
var mysql = require('mysql2');
var promise_mysql = require('mysql2/promise');

// ===== DATABASE POOL INITIALIZATION ================

var pool  = mysql.createPool({
	host     : 'localhost',
	user     : 'homecuser',
	password : 'yumyum',
	database : 'homec'
});

var promise_pool = promise_mysql.createPool({
	host     : 'localhost',
	user     : 'homecuser',
	password : 'yumyum',
	database : 'homec' 
});

var db_layout = [
					{
						name: 'Users',
						columns: [
							{name: 'id', type: 'int NOT NULL AUTO_INCREMENT'},
							{name: 'role', type: 'text NOT NULL'},
							{name: 'phone_number', type: 'bigint'},
							{name: 'facebook', type: 'boolean NOT NULL DEFAULT 0'},
							{option: 'PRIMARY KEY(id)'}
						]
					},
					{
						 name: 'Emails',
						 columns: [
						 	{name: 'email', type: 'text NOT NULL'},
						 	{name: 'user_id', type: 'int NOT NULL'},
						 	{name: 'verified', type: 'boolean NOT NULL DEFAULT 0'}
						 ]
					},
					{
						name: 'Tokens',
						columns: [
							{name: 'user_id', type: 'int NOT NULL'},
							{name: 'session_id', type: 'text'},
							{name: 'expiration', type: 'bigint'},
							{name: 'password', type: 'text'},
							{name: 'access_token', type: 'text'},
							{name: 'facebook_id', type: 'text'},
							{name: 'access_expiration', type:'bigint'},
							{option: 'FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE'}
						]
					},
					{
						name: 'Stripe',
						columns: [
							{name: 'id', type: 'int NOT NULL AUTO_INCREMENT'},
							{name: 'user_id', type: 'int NOT NULL'},
							{name: 'stripe_user_id', type: 'text'},
							{name: 'last_four', type: 'text'},
							{option: 'PRIMARY KEY(id)'},
							{option: 'FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE'}
						]
					},
					{
						name: 'Addresses',
						columns: [
							{name: 'id', type: 'int NOT NULL AUTO_INCREMENT'},
							{name: 'user_id', type: 'int NOT NULL'},
							{name: 'street', type: 'varchar(255) NOT NULL'},
							{name: 'postal_code', type: 'varchar(255) NOT NULL'},
							{name: 'state', type: 'varchar(255) NOT NULL'},
							{name: 'country', type: 'varchar(255) NOT NULL'},
							{name: 'unit', type: 'varchar(255)'},
							{name: 'temp', type: 'boolean NOT NULL DEFAULT 0'},
							{option: 'FOREIGN KEY(user_id) REFERENCES Users(id)'},
							{option: 'PRIMARY KEY(id)'}
						]
					},
					{
						name: 'Menus',
						columns: [
						    {name: 'id', type: 'int NOT NULL AUTO_INCREMENT'},
							{name: 'description', type: 'text'},
							{name: 'name', type: 'varchar(255) NOT NULL'},
							{name: 'banner', type: 'text'},
							{name: 'owner', type: 'int NOT NULL'},
							{name: 'min_order', type: 'int'},
							{name: 'special_min_order', type: 'int'},
							{name: 'max_orders', type: 'int'},
							{name: 'd_days', type: 'text'}, // sat sun 1000001
							{name: 'cutoff', type: 'text'}, // cutoff wednesday 0001000 
							{option: 'FOREIGN KEY(owner) REFERENCES Users(id) ON DELETE CASCADE'},
							{option: 'PRIMARY KEY(id)'}
						]
					},
					{
						name: 'Categories',
						columns: [
							{name: 'id', type: 'int NOT NULL AUTO_INCREMENT'},
							{name: 'menu_id', type: 'int NOT NULL'},
							{name: 'name', type: 'text NOT NULL'},
							{name: 'description', type: 'text'},
							{option: 'PRIMARY KEY(id)'},
							{option: 'FOREIGN KEY(menu_id) REFERENCES Menus(id) ON DELETE CASCADE ON UPDATE CASCADE'}
						]
					},
					{
						name: 'Items',
						columns: [
							{name: 'id', type: 'int NOT NULL AUTO_INCREMENT'},
							{name: 'category_id', type: 'int'},
							{name: 'menu_id', type: 'int NOT NULL'},
							{name: 'name', type: 'text NOT NULL'},
							{name: 'price', type: 'decimal(10,2) NOT NULL'},
							{name: 'description', type: 'text'},
							{name: 'image', type: 'text'},
							{option: 'PRIMARY KEY(id)'},
							{option: 'FOREIGN KEY(menu_id) REFERENCES Menus(id) ON DELETE CASCADE'},
							{option: 'FOREIGN KEY(category_id) REFERENCES Categories(id) ON DELETE CASCADE'}
						]
					},
					{
						name: 'Orders',
						columns: [
							{name: 'id', type: 'int NOT NULL AUTO_INCREMENT'},
							{name: 'user_id', type: 'int NOT NULL'},
							{name: 'address_id', type: 'int NOT NULL'},
							{name: 'last_four', type: 'text'},
							{name: 'price', type: 'decimal(10,2) NOT NULL'},
							{name: 'paid', type: 'boolean NOT NULL DEFAULT 0'},
							{name: 'fulfilled', type: 'boolean NOT NULL DEFAULT 0'},
							{name: 'date_ordered', type: 'DATE NOT NULL'},
							{option: 'PRIMARY KEY(id)'},
							{option: 'FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE'},
							{option: 'FOREIGN KEY(address_id) REFERENCES Addresses(id) ON DELETE CASCADE'}]
					},
					{
						name: 'OrdersItems',
						columns: [
							{name: 'order_id', type: 'int NOT NULL'},
							{name: 'name', type: 'text NOT NULL'},
							{name: 'item_id', type: 'int NOT NULL'},
							{name: 'owner_id', type: 'int NOT NULL'},
							{name: 'quantity', type: 'int NOT NULL'},
							{name: 'fulfilled', type: 'boolean NOT NULL DEFAULT 0'},
							{option: 'FOREIGN KEY(order_id) REFERENCES Orders(id)'},
							{option: 'FOREIGN KEY(item_id) REFERENCES Items(id)'},
							{option: 'PRIMARY KEY(order_id, item_id)'},
						]
					},
					{
						name: 'OrdersOwners',
						columns: [
							{name: 'order_id', type: 'int NOT NULL'},
							{name: 'owner_id', type: 'int NOT NULL'},
							{option: 'FOREIGN KEY(order_id) REFERENCES Orders(id)'},
							{option: 'FOREIGN KEY(owner_id) REFERENCES Users(id)'},
							{option: 'PRIMARY KEY(order_id, owner_id)'},
						]
					},
					{
						name: 'OrdersUsers',
						columns: [
							{name: 'order_id', type: 'int NOT NULL'},
							{name: 'user_id', type: 'int NOT NULL'},
							{option: 'FOREIGN KEY(user_id) REFERENCES Users(id)'},
							{option: 'FOREIGN KEY(order_id) REFERENCES Orders(id)'}
						]
					},
					{
						name: 'Tags',
						columns: [
							{name: 'id', type: 'int NOT NULL AUTO_INCREMENT'},
							{name: 'tag', type: 'varchar(255) NOT NULL COLLATE utf8_unicode_ci'},
							{option: 'PRIMARY KEY(id)'}
						]
					},
					{
						name: 'TagsItems',
						columns: [
							{name: 'tag_id', type: 'int NOT NULL'},
							{name: 'item_id', type: 'int NOT NULL'},
							{option: 'FOREIGN KEY(tag_id) REFERENCES Tags(id) ON DELETE CASCADE'},
							{option: 'FOREIGN KEY(item_id) REFERENCES Items(id) ON DELETE CASCADE'},
							{option: 'PRIMARY KEY(tag_id, item_id)'}
						]
					},
					{
						name: 'TagsMenus',
						columns: [
							{name: 'tag_id', type: 'int NOT NULL'},
							{name: 'menu_id', type: 'int NOT NULL'},
							{option: 'FOREIGN KEY(tag_id) REFERENCES Tags(id) ON DELETE CASCADE'},
							{option: 'FOREIGN KEY(menu_id) REFERENCES Menus(id) ON DELETE CASCADE'},
							{option: 'PRIMARY KEY(tag_id, menu_id)'}
						]
					}
				];

var rec_init = function(index, connection) {
	if(index < db_layout.length){
		var table = db_layout[index];
		var columns = table.columns;
		var parseable_columns = [];
		for (var j = 0;j<columns.length;j++) {
			if(columns[j].option){
				parseable_columns.push(columns[j].option);
			}
			else {
				parseable_columns.push(columns[j].name + ' ' + columns[j].type);
			}
		}
		var query = 'CREATE TABLE IF NOT EXISTS ' + table.name + ' (' + parseable_columns.join(',') + ')';
		console.log('Creating ' + table.name);
		connection.query(query, function(err, result) {
			console.log(query);
			if(err) throw err;
			rec_init(index + 1, connection);
		});
	}
	else {
		connection.release(function(err) {
			if (err) throw err;
		});
	}

}

// No need to prepare statements, no user input here.
var init = function() {
	console.log("Initializing Database")
	pool.getConnection(function(err, connection) {
		if (err) throw err;
		rec_init(0, connection);
	});
}//();

var rec_reset = function(index, connection)  {
	if(index > -1) {
		var table = db_layout[index];
		var query = 'DROP TABLE IF EXISTS ' + table.name + '';
		console.log(query);
		connection.query(query, function(err, result) {
			if(err) { console.log('Failed: ' + query);throw err};
			rec_reset(index - 1, connection);
		});
	}
	else {
		connection.release(function(err) {
		});
		init();
	}
}

var reset = function() {
	console.log('resetting db')
	var reset_connect = pool.getConnection(function(err, connection) {
		if(err) throw err;
		rec_reset(db_layout.length-1,connection);
	});
}();


// Use pool.getConnection(function(err, connection) {
pool.getConnection(function(err, connection) {
    if (err) throw err;
	connection.ping(function (err) {
	  if (err) throw err;
	  connection.release();
	  console.log('MySQL server responded to ping');
	})
});

module.exports.promise_pool = promise_pool;
module.exports.pool = pool;