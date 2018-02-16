// users.js
//
/*
*/

var Users = Object();
var helper = require('./helper').helper;
var Promise = require('bluebird');
var pool = require('../database/database').pool
var promise_pool =require('../database/database').promise_pool;
var crypto = require('crypto');
var uuid = require('node-uuid');
var Addresses = require('./addresses').addresses;
var https = require('https');
var secret = 'yumyumyyyuuum';
var fb_app_token = "188781101550727|O65T8Q_LBRAPgNf3QvGXP17BNfM";

// Reject and close connection
var connectionReject = function(connection, err, reject, rollback) {
	console.log('User reject');
	console.log(err.stack);
	if(rollback) {
		connection.rollback();
	}
	else {
		connection.release(function(err){
			if (err) return reject(err);
		})
	}
	return reject(err);
};

// Returns the user id of the User if it exists
Users.checkFbExists = function(facebook_id) {

	var getConnection = promise_pool.getConnection()

	return getConnection.then(function(connection) {
		return connection.execute('select user_id from Tokens where Tokens.facebook_id = ?', [facebook_id], function(rows) {
			connection.release();
			return rows
		})
	}).then(function(rows){
		if(rows.length > 0) return rows[0].user_id;
		return null
	});
	
};

// Check if the access_token is valid and expired 
// If it is valid return the user_id
Users.fb_authenticate = function(facebook_id, access_token) {

	console.log("Users.fb_authenticate");

	var getConnection = promise_pool.getConnection();

	var getFbInfo = function(connection) {
		return connection.execute('select access_token, access_expiration, user_id from Tokens where Tokens.facebook_id = ?', [facebook_id])
	}

	var checkToken = function(o_access_token) {
		// Return true if the original access token equals the queried access token
		// false otherwise
		return (o_access_token == access_token)
	}

	var checkExpiration = function(o_expiration) {
		// Return true if the current time is not yet past o_expiration 
		// false otherwise
		return  (new Date().getTime() / 1000) < o_expiration 
	}
	return getConnection.then(getFbInfo).then(function(rows) {
		if(typeof rows[0][0] == 'undefined') {
			return null
		}
		else if(typeof rows[0][0].access_token == 'undefined' || typeof rows[0][0].access_expiration == 'undefined') {
			return null
		}
		var token_check = checkToken(rows[0][0].access_token);
		var expiration_check = checkExpiration(rows[0][0].access_expiration);
		console.log("check results")
		console.log(token_check)
		console.log(expiration_check)
		if (token_check && expiration_check) return rows[0][0].user_id
		return null
	})

};

// Records the access token down after validating it
Users.loginFbUser = function(facebook_id, access_token, user_id, expiration) {

	console.log("Logging in fb user.")

	return promise_pool.getConnection().then(function(connection) {
		return connection.execute('update Tokens set Tokens.access_token = ? where Tokens.user_id = ?, Tokens.access_expiration = ?', [access_token, user_id, expiration])
		.then(function() {
			connection.release();
		})
	});

}

// Check if the given fb credentials are legitimate
Users.fb_validate = function(facebook_id, access_token) {
	console.log("fb_validate");

	var graph_url = "https://graph.facebook.com/debug_token?input_token=" + access_token  + 
     "&access_token=" + fb_app_token;


	return new Promise(function(resolve, reject) {
		https.get(graph_url, function(res) {
			var body = '';
			res.on("data", function(chunk) {
				body += chunk;
			});
			res.on("end", function() {
				console.log("end");
				body = JSON.parse(body);
				if( body.data.is_valid && (body.data.user_id == facebook_id)) {
					return resolve(body.data.expires_at);
				}
				else {
					return resolve(null);
				}
			});
		}).on("error", function(err) {
			console.log(error)
		});
	})
}

// Create a new user with fb credentials
Users.createFbUser = function(facebook_id, access_token, role, expiration) {

	console.log("Creating facebook user.")

	var getConnection = promise_pool.getConnection()

	var insertUser = function(connection) {
		return connection.execute('insert into Users (role, facebook) VALUES (?,?)', [role, 1]);
	}

	var insertTokens = function(connection, user_id) {
		var stmt = 'insert into Tokens (facebook_id, access_token, access_expiration, user_id) VALUES (?,?,?,?)'
		var values = [facebook_id, access_token, expiration, user_id]
		console.log(values)
		return connection.execute(stmt,values)
	}

	return getConnection.then(function (connection) {
		return insertUser(connection)
			.then(function (rows) {
				return insertTokens(connection, rows[0].insertId).then(function(){
					connection.release();
				})
			})
			.catch(function(error) {
				connection.release()
				console.log(error)
				throw error
			})
	})
}

Users.createUser = function(email, password, role, phone_number, address) {
	var password = password;
	return new Promise(function(resolve, reject) {
		// Encrypt the stored password
		// TODO: change the secret from 'yumyumyyyuuum'
		var hmac = crypto.createHmac('sha256', secret);
		hmac.update(password);
		password = hmac.digest('base64');
		hmac.end();
		pool.getConnection(function(err, connection) {
			if(err) return connectionReject(connection, err, reject);
			connection.beginTransaction(function(err) {
				if(err) {
					return connectionReject(connection, err, reject, true);
				}
				// Check if email is taken already
				connection.execute("select * from Emails where Emails.email = ?", [email], function(err, rows) {
					 if(err) {
					 	return connectionReject(connection, err, reject, true);
					 }
					 // If it does resolve with false, will be handled by the reciever
					 if(rows.length > 0) {
					 	connection.rollback();
					 	console.log("email taken.");
					 	return resolve(false);
					 }
					 else {
						// Prepare arguments
						var stmt = 'insert into Users (role) VALUES (?)';
						var values = [role];
						if(phone_number) {
							stmt = 'insert into Users (role, phone_number) VALUES (?,?)';
							values.push(phone_number);
						}
						// Create user
					 	connection.execute(stmt, values, function(err, rows) {
					 			if(err) {
					 				return connectionReject(connection, err, reject, true);
					 			}
					 			var user_id = rows.insertId;
					 			// Insert the password last_insert_id()
					 			connection.execute('insert into Tokens(user_id, password) VALUES(?,?)', 
					 				[user_id, password], function(err, rows) {
					 					if(err) {
					 						return connectionReject(connection, err, reject, true);
					 					}
					 					// Insert the emails
					 					connection.execute('insert into Emails(user_id, email) VALUES(?,?)',
					 						[user_id, email], function(err, rows) {
					 							if (err) {
					 								return connectionReject(connection, err, reject, true);
					 							}
					 							// Commit and release the transaction
					 							connection.commit();
					 							connection.release();
					 							// If an address was also included, add it here.
					 							if(address) {
								 					Addresses.addAddress(user_id, address.street, address.postal_code, address.state, address.country, address.unit).then(function(result) {
								 						return resolve(true);
								 					}).catch(function(err) {
								 						return reject(err);
								 					});
							 					}
							 					else {
							 						return resolve(true);
							 					}
					 						}) 
					 					
					 				})
					 		});
					 }
				});
			});
		})
	});
}

Users.getId = function(email) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			// Get the user id from email
			connection.execute('select user_id from Emails where Emails.email = ?', [email], function(err, rows) {
				if(err) return connectionReject(connection, err, reject);
				if(rows.length == 0) {
					connection.release();
					//return resolve({code: 401, body: {message: "User does not exist"}});
					return resolve(null);
				}
				connection.release();
				console.log("getId")
				console.log(rows[0].user_id)
				console.log(email)
				return resolve(rows[0].user_id);
			});
		});
	});
}

Users.getRole = function(user_id) {
	return new Promise(function(resolve, reject) {
		console.log("getRole");
		pool.getConnection(function(err, connection) {
			// Get the user id from email
			connection.execute('select role from Users where Users.id = ?', [user_id], function(err, rows) {
				if(err) return connectionReject(connection, err, reject);
				if(rows.length == 0) {
					connection.release();
					console.log("rows length 0");
					//return resolve({code: 401, body: {message: "User does not exist"}});
					return resolve(null);
				}
				connection.release();
				console.log(rows[0].role);
				return resolve(rows[0].role);
			});
		});
	});
}

Users.generate_session_id = function(user_id, expiration) {

	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if(err) return connectionReject(connection, err, reject);
			// In milliseconds, session expiration. 3600000 milliseconds = 1 hour
			var default_expiration = 3600000

			// Optionally, we can set the expiration manually (only if it is less than default)
			if(typeof expiration == "number") {
				if(Number(expiration) < default_expiration) {
					expiration = Number(req.body.expiration);
				}
			}
			else {
				expiration = default_expiration;
			}

			console.log('expiration: ' + expiration);

			// Generate session id for this login
			var session_id = uuid.v4();
			// Set expiration time to 1 hours(s) or 3600000 milliseconds
			var date = new Date();
			expiration = date.getTime() + expiration;

			var stmt = 'update Tokens set Tokens.session_id = ?, Tokens.expiration = ? where Tokens.user_id = ?';
			var values = [session_id, expiration, user_id];
			console.log(stmt);
			console.log(values);

			connection.execute(stmt, values, function(err, rows) {
				if(err) return connectionReject(connection, err, reject);
				connection.release();
				return resolve(session_id);
			});
		});
	});

}

Users.login = function(email, password, expiration) {

	return new Promise(function(resolve, reject) {
		// Encrypt the queried password
		var hmac = crypto.createHmac('sha256', secret);
		hmac.update(password);
		password = hmac.digest('base64');
		hmac.end();
		
		pool.getConnection(function(err, connection) {
			if(err) return connectionReject(connection, err, reject);

			// Get the user id from email
			Users.getId(email).then(function(user_id) {
				if(user_id == null) {
					connection.release();
					return resolve(null);
				}
				// Get the password using the user_id
				connection.execute('select password from Tokens where Tokens.user_id = ?', [user_id], function(err, rows) {
					if(err) return connectionReject(connection, err, reject);
					connection.release();
					if(rows.length == 0) {
						
						return resolve(null);
					}
					else {
						if( rows[0].password == password ) {
							// Generate the session_id and return it
							Users.generate_session_id(user_id, expiration).then(function(session_id) {
								return resolve(session_id);
							}).catch(function(err) {
								return reject(err);
							})
						}
						else {
							return resolve(null);
						}
					}
				});
			}).catch(function(err) {
				if(err) return connectionReject(connection, err, reject);
			});
			
		});
	});
}


Users.authenticate = function(email, session_id) {
	console.log(session_id)
	console.log(email)
	return new Promise(function(resolve, reject) {
		Users.getId(email).then(function(user_id) {
			console.log("authenticate user: " + user_id);
			pool.getConnection(function(err, connection) {
				if(err) return connectionReject(connection, err, reject);
				var date = new Date();
				connection.execute('select Tokens.session_id, Tokens.expiration from Tokens where Tokens.user_id = ?', [user_id], function(err, rows) {
					if(err) return connectionReject(connection, err, reject);
					if(rows[0]) {
						// If it is the correct session id check if it is expired
						console.log(session_id);
						console.log(rows[0].session_id);
						if (session_id == rows[0].session_id) {
							if(date.getTime() > rows[0].expiration) {
								console.log("token expired");
								connection.release();
								return resolve({code: 0, user_id: user_id});
							}
							else {
								console.log("authn success");
								connection.unprepare('select Tokens.session_id, Tokens.expiration from Tokens where Tokens.user_id = ?');
								connection.release();
								return resolve({code: 1, user_id: user_id});
							}
						}
						else {
							console.log("authn failure");
							connection.release();
							return resolve({code: 2, user_id: null});
						}
					}
					else {
						console.log("no user exists");
						connection.release();
						return resolve({code: 2, user_id: null});
					}

				});
			});
		})
	})
}

Users.deleteTestUser = function() {
	var email = "homecuser@fake.hc";
	pool.getConnection(function(err, connection) {
		if (err) throw err;
		connection.execute('DELETE FROM Tokens where Tokens.email = ?', [email], function(err, rows) {
			res.json({message : 'Success!',
				 				code: 7})
		});
		connection.unprepare('DELETE FROM Tokens where Tokens.email = ?');
		connection.release();
	})
}

Users.addStripeUserId = function(user_id, stripe_user_id, last_four) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function (err, connection) {
			if (err) return connectionReject(err, connection, reject);
			var execute = "insert into Stripe (user_id, stripe_user_id, last_four) VALUES (?,?,?)";
			connection.execute(execute, [user_id, stripe_user_id, last_four], function(err, rows) {
				if(err) return connectionReject(err, connection, reject);
				connection.release();
				return resolve(rows);
			});
		});
	});
}

Users.getStripeTokens = function(user_id) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function (err, connection) {
			if (err) return connectionReject(err, connection, reject);
			var execute = "select last_four, stripe_user_id from Stripe where Stripe.user_id = ?"
			var values = [user_id]
			connection.execute(execute, values, function(err, rows) {
				if(err) return connectionReject(err, connection, reject);
				connection.release();
				if (rows.length == 0) {
					var err = {};
					err.myMessage = "No credit card registered to account."
					err.code = 432;
					return reject(err);
				}
				return resolve(rows[0]);
			});
		});
	});
}



Users.addStripePublishableKey = function(user_id, stripe_publishable_key) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function (err, connection) {
			if (err) return connectionReject(err, connection, reject);
			var execute = "update Tokens set Tokens.stripe_publishable_key = ? where Tokens.user_id = ?";
			console.log(execute);
			connection.execute(execute, [stripe_user_id, user_id], function(err, rows) {
				if(err) return connectionReject(err, connection, reject);
				connection.release();
				return resolve(rows);
			});
		})
	});
}

module.exports.users = Users;
