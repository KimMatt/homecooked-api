// transactions aka stripe.js

var Transactions = Object();
var helper = require('./helper').helper;
var pool = require('../database/database').pool;
var Promise = require('bluebird');
var Users = require('./users').users;
//var Orders = require('./orders').orders;
// TODO: externalize this stripe key somehow
var stripe = require('stripe')("sk_test_UNwZpKth5ReKwqeZMjRTxCLz")//(process.env.STRIPE_SECRET_KEY);



// Charge the given stripe user id the price
// Return the [success (0 or 1)]
Transactions.charge = function(user_id, cost, tax, order_id, stripe_user_id) {
	var currency = "cad";
	var tax = Number(tax.toFixed(2))
	var cost = Number(cost.toFixed(2))
	return new Promise(function(resolve, reject) {
		stripe.charges.create({
			amount: (tax + cost) * 100,
			currency: currency,
			customer: stripe_user_id,
			metadata: {order_id: order_id,
					   cost: cost,
					   tax: tax,}
		}, function(err, charge) {
			if(err) {
				return reject(err);
			}

			tran = {};
			if(charge.paid == true) {

				tran.outcome = charge.outcome;
				tran.paid = charge.paid;
				tran.message = "Thanks! Enjoy your meal(s) :)"
				return resolve(tran);
			}
			else {
				// Even if it doesn't go through return the result so they can try again.
				tran.outcome = charge.outcome;
				return resolve(tran);
			}
		});
	});
};

// Create a permanent customer... basically add their card to our system.
Transactions.createCustomer = function(email, user_id, stripe_token, last_four) {
	return new Promise(function(resolve, reject) {
		// Send token to server
		stripe.customers.create({
			email: email,
			source: stripe_token
		}, function(err, customer) {
			// Get user id
			if(err) return reject(err);
			Users.addStripeUserId(user_id, customer.id, last_four).then(function(result) {
				return resolve(result);
			}).catch(function(err) {
				return reject(err);
			})
		});
	});
};


module.exports.transactions = Transactions;
