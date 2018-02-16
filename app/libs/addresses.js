// Addresses.js

var helper = require('./helper').helper;
var pool = require('../database/database').pool;
var Promise = require('bluebird');
var Users = require('./users').users;
var https = require('https');
var GoogleAPI = "&key=AIzaSyAPdy_XQs0Qbra_9iUQp3FuXPZXxSEe6OU&mode=bicycling";
var MapsURL = "https://maps.googleapis.com/maps/api/distancematrix/json?origins=388+Yonge+St+Toronto+ON&destinations="
/*
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
							{option: 'FOREIGN KEY(user_id) REFERENCES Users(id)'},
							{option: 'PRIMARY KEY(id)'}
						]
					},
*/

var Addresses = Object();

var connectionReject = function(err, connection, reject) {
	console.log('Addresses reject');
	console.log(err.stack);
	connection.release(function(err) {
		if (err) return reject(err);
	})
	return reject(err);
}

Addresses.addAddress = function(user_id, street, postal_code, state, country, unit) {

	return new Promise(function(resolve, reject) {
		return Addresses.getDistance(street, postal_code, state, country, unit).then(function(in_range) {
			if(in_range) {
				pool.getConnection(function(err, connection) {
					if (err) return connectionReject(err, connection, reject);

					var values = [user_id, street, postal_code, state, country];
					var execute;
					if (unit) {
						execute =  "insert into Addresses (user_id, street, postal_code, state, country, unit) VALUES " + helper.constructQuestions(6);
						values.push(unit);
					}
					else {
						execute = "insert into Addresses (user_id, street, postal_code, state, country) VALUES " + helper.constructQuestions(5);
					}
					console.log(execute);
					console.log(values);
					pool.execute(execute, values, function(err, rows) {
						if (err) return connectionReject(err, connection, reject);
						connection.release();
						return resolve(rows);
					});
				});
			}
			else {
				err = {}
				err.message = "Address not in our serviceable area."
				err.code = 230;
				return reject(err)
			}
		}).catch(function(err) {
			return reject(err);
		})
	});

}

// Gets the distance and returns if it is in our delivery range.
Addresses.getDistance = function(street, postal_code, state, country, unit) {
	return new Promise(function(resolve, reject) {
		address_string = street.split(" ").join("+") + "+" + state + "+" + country + "+" + postal_code;
		address_url = MapsURL + address_string + GoogleAPI;
		console.log(address_url);
		https.get(address_url , function(res) {
			var body = '';
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				console.log(body);
				body = JSON.parse(body);
				if (body.rows[0].elements[0].status == "NOT_FOUND"){
					err = {};
					err.message = "Invalid address";
					err.code = 403;
					return reject(err)
				}				
				distance = Number(body.rows[0].elements[0].duration.value);
				console.log("Address Distance:");
				console.log(distance);
				if(distance > 1200) {
					return resolve(false);
				}
				else {
					return resolve(true);
				}
			});
		}).on('error', function(err) {
			return reject(err);
		});
	});
};

Addresses.removeAddress = function(address_id, user_id) {

	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection){
			if(err) return connectionReject(err, connection, reject);
			var execute = "delete from Addresses where Addresses.id = ? and Addresses.user_id = ?";
			console.log(execute);
			console.log(address_id);
			pool.execute(execute, [address_id, user_id], function(err, rows) {
				if(err) return connectionReject(err, connection, reject);
				connection.release();
				return resolve(rows);
			})
		});
	});
	
}

Addresses.getAddresses = function(user_id) {

	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if(err) return connectionReject(err, connection, reject);
			var execute = "select * from Addresses where Addresses.user_id = ?";
			console.log(execute);
			console.log(user_id);
			pool.execute(execute, [user_id], function(err, rows) {
				if(err) return connectionReject(err, connection, reject);
				connection.release();
				return resolve(rows);
			});
		});
	});

}

module.exports.addresses = Addresses;