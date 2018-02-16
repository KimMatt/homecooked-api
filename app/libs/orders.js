// orders.js
//
// Author: Matthew Kim
//

//TODO RETURN REJECT AND RESOLVES

var Orders = Object();
var helper = require('./helper').helper;
var pool = require('../database/database').pool;
var Promise = require('bluebird');
var Menus = require('./menus').menus;
var Users = require('./users').users;
var Transactions = require('./transactions').transactions;

// Helper function to replace the names of an order
var replace_names = function(items, names) {
	var replaced = items;
	for (var i =0;i<names.length;i++) {
		replaced[i].name = names[i];
	}
	return replaced;
}

Orders.addOrder = function(items, user_id, address_id) {

	// recursive call for each order to be added
	var recursive_orders = function(connection, index, items, oid, names) {
		return new Promise(function(resolve, reject) {
			var execute_third = "insert into OrdersItems (order_id, item_id, name, quantity, owner_id) VALUES (?,?,?,?,?)";
			var execute_fourth = "insert into OrdersOwners (order_id, owner_id) VALUES (?,?)";

			// Finished
			if(index >= items.length) {
				connection.commit();
				connection.release();
				return resolve();
			}
			else {
				var item = items[index];
				var values = [oid, item.id, names[index], item.quantity, item.owner_id];
				var values_fourth = [oid, item.owner_id];
				console.log(execute_third);
				console.log(values);
				// Insert into order to item
				connection.execute(execute_third, values, function(err, rows) {
					if(err) {
						connection.rollback();
						return reject(err);
					}
					console.log(execute_fourth)
					console.log(values_fourth)
					// Insert into order to owner/menu
					connection.execute(execute_fourth, values_fourth, function(err, rows) {
						if(err) {
							if(err.code == 'ER_DUP_ENTRY') {
								return recursive_orders(connection, index + 1, items, oid, names).then(function(result) {
									return resolve(result);
								}).catch(function(err) {
									return reject(err);
								});
							}
							connection.rollback();
							return reject(err);
						}
						return recursive_orders(connection, index + 1, items, oid, names).then(function(result) {
								return resolve(result);
							}).catch(function(err) {
								return reject(err);
							});
					});
				});
			}
		})
	}

	return new Promise(function(resolve, reject) {

		// Validate order and get charging price
		Menus.validateItems(items).then(function(price_info) {
			console.log("price?");
			cost = price_info.cost;
			tax = price_info.tax;
			names = price_info.names;
			// TODO: calculate delivery fee
			// Check if user has a credit card registered
			// TODO add cash option
			console.log("Price calculated:");
			console.log(cost);
			console.log(tax);
			Users.getStripeTokens(user_id).then(function(stripe_info) {
				// Add orders to database
				stripe_user_id = stripe_info.stripe_user_id;
				last_four = stripe_info.last_four;
				console.log('stripe_user_id');
				console.log(stripe_user_id);
				pool.getConnection(function(err, connection) {
					connection.beginTransaction(function(err) {
						if(err) {
							return reject(err);
						}
						var execute_order = "insert into Orders (user_id, address_id, last_four, price, date_ordered) VALUES (?,?,?,?, CURDATE())";
						var execute_second = "insert into OrdersUsers (user_id, order_id) VALUES(?,?)";
						console.log(execute_order);
						var values = [user_id, address_id, last_four, cost + tax];

						console.log(values)
						// Add base order item into database
						connection.execute(execute_order, values, function(err, order) {
							if(err) {
								connection.rollback();
								return reject(err);
							}
							var order_id = order.insertId
							var values_second = [user_id, order_id];
							console.log("order_id:" + order_id)
							console.log(execute_second)
							console.log(values_second)
							// Map the order to users
							connection.execute(execute_second, values_second, function(err, rows) {
								if(err) {
									connection.rollback();
									return reject(err);
								}
								// Begin recursively adding the items for each owner
								// connection closed in recursive_orders
								recursive_orders(connection, 0, items, order_id, names).then(function(result) {
									// Charge credit card
									Transactions.charge(user_id, cost, tax, order_id, stripe_user_id).then(function(result) {
										
										// Gather information for the confirmation email
										order_cont = replace_names(items, names);
										result.items = order_cont;
										result.cost = cost;
										result.tax = tax;
										
										if (result.paid) {
											Orders.markPaid(order_id).then(function() {
												return resolve(result);
											}).catch(function(err) {
												// TODO: Retry
												console.log("RECORD PAYMENT ERROR: ")
												console.log("User_id: ")
												console.log(user_id);
												console.log("Order_id: ")
												console.log(order_id);
												result.important_message = "Order paid but not marked! Please contact customer support.";
												return resolve(result);
											});
										}
										else {
											return resolve(result);
										}
									}).catch(function(err) {
										return reject(err);
									});
								}).catch(function(err) {
									return reject(err);
								})
							});
						})
					})
				});
			}).catch(function(err) {
				// already added myMessage in the function getStripeTokens
				return reject(err);
			})
		}).catch(function(err) {
			console.log("Order error")
			err.myMessage = "Invalid item id";
			return reject(err);
		});

	});

}

Orders.getOrders = function(order, owner, size, offset) {

	return new Promise(function(resolve, reject){
		// Step 1: select from a join with Orders table and oid2owner

		var execute = "select * from (Orders natural join oid2owner) where owner = ?"
		var value = [owner];

		var values = [offset, size];

		pool.getConnection(function(err, connection) {
			if(err) {
				connection.release();
				return reject(err);
			}
			console.log(execute);
			console.log(values);
			connection.execute(execute, owner, function(err, rows) {
				if(err) {
					connection.release();
					return reject(err);
				}
			});
		});

	});

}

// Return all the orders after a certain date
Orders.getAllOrders = function(date) {
	return new Promise(function(resolve, reject) {
	});
}

Orders.markPaid = function(order_id) {
	return new Promise(function(resolve, reject) {
		var execute = "update Orders set paid = 1 where Orders.id = ?";
		var value = [order_id];
		console.log(execute);
		console.log(order_id);
		pool.getConnection(function(err, connection) {
			if(err) {
				connection.release();
				return reject(err);
			}
			connection.execute(execute, value, function(err, rows) {
				if(err) {
					connection.release();
					return reject(err);
				}
				else {
					connection.release();
					return resolve(rows);
				}
			})
		});
	});
}


// Mark order as fulfilled.
Orders.fulfillOrder = function(order_id) {

	return new Promise(function(resolve, reject){

		var execute = "update Orders set fulfilled=1 where Orders.id = ? ";
		var value = [order_id]
		console.log(execute);
		pool.getConnection(function(err, connection) {
			if(err) {
				connection.release();
				return reject(err);
			}
			connection.execute(execute, value, function(err, rows) {
				if(err) {
					connection.release();
					return reject(err);
				}
				else {
					connection.release();
					return resolve(rows);
				}
			})
		});

	});

}


module.exports.orders = Orders


