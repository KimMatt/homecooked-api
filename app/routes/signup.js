// Authors: Matthew Kim
// mtt.kim@mail.utoronto.ca
//
// Signup Routes
var express = require('express');
var router = express.Router();
var helper = require('../libs/helper').helper;
var Users = require('../libs/Users').users

// Error codes:

// /signup
// Expecting a email and password to be sent
router.put('/', function (req, res) {
	var email = req.body.email;
	var password = req.body.password;
	var address = req.body.address;
	var phone_number = req.body.phone_number;
	var role = req.body.role;

	// Check password length
	if(password.length < 8) {
		return res.status(400).json({message: "Password must be at least 8 characters long!"});
	}

	// Check the main body's arguments
	var check = helper.body_check(req.body, 3, 
		{'email': email, 'password' : password, 'role': role});

	if(check) {
		return res.json(check);
	}

	// Check the address object's fields
	if(address) {
		var address_check = helper.body_check(address, 4, {'street': address.street, 'postal code': address.postal_code,
		 'state': address.state, 'country': address.country});
		if(address_check) {
			return res.json(address_check);
		}
	}	
	// create the user
	Users.createUser(email, password, role, phone_number, address).then(function(result) {
		if(result) {
			Users.login(email, password).then(function(session_id) {
				if(session_id) {
					return res.status(200).json({session_id: session_id, message: "Success!"});
				}
				else {
					return res.status(500).json({message: "Internal server error"});
				}
			}).catch(function(err) {
				return helper.handle_error(res, err);
			});
		}
		else {
			return res.status(400).json({message: "email already exists"});
		}
	}).catch(function(err) {
		return helper.handle_error(res, err);
	});
});

router.post('/fb', function(req, res) {
// Handles both a login or a signup from a facebook account

	console.log('POST /fb/');

	var access_token = req.header('access_token');
	var facebook_id = req.header('facebook_id');

	var check = helper.header_check({'access_token': access_token, 'facebook_id': facebook_id});

	if(check) return res.json(check);

	var loginOrCreate = function(expiration) {
		return Users.checkFbExists(facebook_id).then(function(user_id) {
			if (user_id) return Users.loginFbUser(facebook_id, access_token, user_id, expiration)
			return Users.createFbUser(facebook_id, access_token, 'consumer', expiration)
		});
	}

	// validate against the facebook servers to see if the access token and id match an actual account
	return Users.fb_validate(facebook_id, access_token).then(function(expiration){
		if (expiration) {
			// The token is valid
			return loginOrCreate(expiration).then(function() {
				return res.status(200).json({message: "Success!"})
			})
		}
		return res.status(401).json({message: 'Improper facebook login details.'})
	}).catch(function(err) {
		console.log(err)
		throw err;
	})
});

// Login. Pass in the body the email and password. 
// If success return success + the session uuid
router.post('/', function(req, res) {

	var email = req.body.email;
	var password = req.body.password;
	var expiration = req.body.expiration;

	var check = helper.body_check(req.body, 2, {'email': email, 'password': password});
	
	if(check) {
		return res.json(check);
	}
	else {
		Users.login(email, password, expiration).then(function(session_id) {
			if(session_id) {
				return res.status(200).json({session_id: session_id, message: "Success!"});
			}
			else {
				return res.status(401).json({message: "email or password incorrect"});
			}
		}).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}
})

// Only for development testing purposes. Deletes the test user account
router.put('/deleteTestUser', function(req, res) {
	Users.deleteTestUser();
})

module.exports.router = router;