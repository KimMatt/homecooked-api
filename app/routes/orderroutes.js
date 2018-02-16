// orderroutes.js

var express = require('express');
var router = express.Router();
var helper = require('../libs/helper').helper;
var Promise = require('bluebird');
var Addresses = require('../libs/addresses').addresses;
var stripe = require('stripe')("sk_test_UNwZpKth5ReKwqeZMjRTxCLz")//(process.env.STRIPE_SECRET_KEY);
var Users = require('../libs/users').users;
var Orders = require('../libs/orders').orders;
var Emails = require('../libs/emails').emails;

router.put('/', (req, res) => {
	const user_id = req.homec.user_id;
	const address_id = req.body.address_id;
	const items = req.body.items;

	// Add order to the database
	Orders.addOrder(items, user_id, address_id).then(function(result) {
		if(result.paid) {
			res.status(200).json(result);
			Emails.sendOrderConfirmationEmail(req.homec.username, result).then(function() {
				console.log("Order Confirmation email sent");
				return;
			}).catch(function(err) {
				// Log the error
				console.log(err);
				return;
			});
		}
		else {
			res.status(202).json(result);
			console.log("Order failed email sending...");
			return;
		}
	}).catch(function(err) {
		return helper.handle_error(res, err);
	})

});

// Get all orders sorted by the user
router.get('/', (req, res) => {

	const page = req.header('page');

	if (typeof page != 'Number') {
		return res.status(400).message("Expected page to be a Number, got " + (typeof page))
	}

	const size = 10;
	const offset = (page - 1) * size;

});


// Get the user with user_id's orders 
router.get('/:user_id', (req, res) => {

	const page = req.header('page');

	if (typeof page != 'Number') {
		return res.status(400).message("Expected page to be a Number, got " + (typeof page))
	}

	const user_id = req.homec.user_id;

	const size = 10;
	const offset = (page - 1) * size;

	Orders.getUserOrders(user_id, size, offset).then(function(orders) {
		return res.status(200).json(orders)
	}).catch(function(err) {
		console.log(err)
		return res.status(500).message('Internal server error')
	});

});

module.exports.router = router;