// user edit routes
// /user

var express = require('express');
var router = express.Router();
var helper = require('../libs/helper').helper;
var Promise = require('bluebird');
var Addresses = require('../libs/addresses').addresses;
var stripe = require('stripe')("sk_test_UNwZpKth5ReKwqeZMjRTxCLz")//(process.env.STRIPE_SECRET_KEY);
var Users = require('../libs/users').users;
var Emails = require('../libs/emails').emails;
var Transactions = require('../libs/transactions').transactions;

router.put('/address', function(req, res) {

	var address = req.body.address

	if(!address) {
		return res.status(400).json({message: "No address"});
	}
	var street = address.street;
	var postal_code = address.postal_code;
	var state = address.state;
	var country = address.country;
	var unit = address.unit;

	var check = helper.body_check(address, 4, {'street': street, 'postal_code': postal_code, 'state' : state, 'country': country});
	if(check) {
		return res.status(400).json(check);
	}
	else {
		Addresses.addAddress(req.homec.user_id, street, postal_code, state, country, unit).then(function(result) {
			return res.status(200).json(result);
		}).catch(function(err) {
			if(err) return helper.handle_error(res,err);
		});
	}


});

router.get('/addresses', function(req, res) {
	var user_id = req.homec.user_id;

	Addresses.getAddresses(user_id).then(function(result) {
		return res.status(200).json(result);
	}).catch(function(err) {
		return helper.handle_error(res,err);
	});

});

// Route to get the status of the sid
router.get('/status', function(req, res) {
	// If it makes it to here that means the user is properly authenticated.

	// TODO: Generate new SID and return it.

	return res.status(200).json({});
});

router.delete('/address/:address_id', function(req, res) {
	var address_id = req.params.address_id;
	var user_id = req.homec.user_id;

	Addresses.removeAddress(address_id, user_id).then(function(result) {
		return res.status(200).json(result);
	}).catch(function(err) {
		return helper.handle_error(res,err);
	});
});

router.put('/stripe_token', function(req, res) {

	var stripe_token = req.body.stripe_token;
	var last_four = req.body.last_four;
	var check = helper.body_check(req.body, 1, {'stripe_token': stripe_token});
	var user_id = req.homec.user_id;
	var email = req.homec.username

	if(check) {
		return res.status(400).json(check);
	}

	// Send token to server and create customer
	console.log("Creating customer");
	Transactions.createCustomer(email, user_id, stripe_token, last_four).then(function(result) {
		return res.status(200).json(result);
	}).catch(function(err) {
		return helper.handle_error(res, err);
	});

});

router.get('/stripe_tokens', function(req, res) {
	var user_id = req.homec.user_id;

	Users.getStripe_Tokens(user_id).then(function(result) {
		return res.status(200).json(result);
	}).catch(function(err) {
		return helper.handle_error(res,err);
	})
})

router.put('/emailtest', function(req, res) {
	Emails.sendTestEmail().then(function(result) {
		console.log("Here")
		return res.status(200).json(result);
	}).catch(function(err) {
		console.log("ErrHere")
		return helper.handle_error(res,err);
	})
});


module.exports.router = router;