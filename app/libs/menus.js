// Menu interface
// Adding and removing objects. Creating one.
// Menu interface deals with the logic of dealing with the database. No knowledge of the REST API at all.

// TODO: RETURN REJECT AND RESOLVES

var Menus = Object();
var helper = require('./helper').helper;
var pool = require('../database/database').pool;
var Promise = require('bluebird');
var Tags = require('./tags').tags;

// Reject and close connection
var connectionReject = function(connection, err, reject, rollback) {
	console.log('Menus reject');
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
}

function MissingArgument(message) {
  this.code = 'Missing ' + message;
  this.stack = (new Error()).stack;
}

MissingArgument.prototype = Object.create(Error.prototype);
MissingArgument.prototype.constructor = MissingArgument;

Menus.getMenus = function(size, offset) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if (err) return connectionReject(connection, err, reject);
			var values = [offset, size];
			var execute = 'select * from Menus LIMIT ?,?';
			console.log(execute);
			console.log(values)
			connection.execute(execute, values, function(err, rows) {
				if (err) return connectionReject(connection, err, reject);
				connection.unprepare("select * from Menus");
				connection.release();
				var menus = rows;
				return resolve(rows);
			});
		});
	});
}

Menus.getMenuFromOwner = function(owner_id) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if (err) return connectionReject(connection, err, reject);
			var execute = 'select * from Menus where Menus.owner = ?'
			console.log(owner_id);
			connection.execute(execute, [owner_id], function(err, rows) {
				if (err)  return connectionReject(connection, err, reject);
				connection.release();
				return resolve(rows);
			});
		});
	});
}

/*
Menus.getMenuId = function(name, owner) { 
	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if (err) return connectionReject(connection, err, reject);
			var values = [name, owner];
			var execute = 'select id from Menus where Menus.name = ? and Menus.owner = ?';
			console.log(execute);
			console.log(values)
			connection.execute(execute, values, function(err, rows) {
				if (err) return connectionReject(connection, err, reject);
				connection.unprepare("select id from Menus where Menus.name = ? and Menus.owner = ?");
				connection.release();
				resolve(rows[0].id);
			});
		});
	});
}
*/

Menus.getMenu = function(menu_id) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if (err) return connectionReject(connection,err, reject) 
			var execute = "select * from Menus where Menus.id = ?";
			console.log(execute);
			connection.execute(execute, menu_id, function(err, rows) {
				if (err) return connectionReject(connection,err, reject);
				// Add the menu tags to the menu object returned
				Tags.getMenuTags(menu_id).then(function(tags){
					rows.tags = tags;
					return resolve(rows);
				}).catch(function(err) {
					return connectionReject(connection, err, reject);
				})
			});
		});
	});
}

// Insert a menu into the database with given name, description, owner, banner.
Menus.createMenu = function(name, description, owner, banner, tags, min_order, special_min_order, d_days, cutoff) {

	var recursive_tags = function(index, tags, menu_id) {
		return new Promise(function(resolve, reject){
			console.log("recursive_tags");
			if(index <= tags.length-1) {
				Tags.addMenuTag(tags[index], menu_id).then(function(result) {
					if(index < tags.length-1) {
						return recursive_tags(index+1,tags, menu_id);
					}
					else {
						return resolve(result);
					}
				}).catch(function(err) {

					return connectionReject(connection, err, reject);
				});
			}
		});
	};

	return new Promise(
		function(resolve, reject) {
			var response = Object();
			var params = ["name", "description", "owner", "min_order", "special_min_order", "d_days", "cutoff"];
			var values = [name, description, owner, min_order, special_min_order, d_days, cutoff];

			// TODO: check if values are correct types
			if(banner) {
				params.push("banner");
				values.push(banner);
			}

			var stmt = "insert into Menus";

			var execute = helper.build_query(stmt, params, 1);
			
			console.log(execute);

			pool.getConnection(function(err, connection) {
				if (err) return connectionReject(connection, err, reject);
				connection.execute(execute, values, function(err, rows) {
					if (err) return connectionReject(connection, err, reject);
					response.menu = rows;

					// If there are tags then add them as well
					if(tags) {
						recursive_tags(0, tags, rows.insertId).then(function(result) {
							connection.release();
							response.menu.tags = result;
							return resolve(response)
						})
					}

					connection.release();
					return resolve(response);

				});
			});
		}
	);

}

// Update the menu
Menus.menuUpdate = function(attributes, values) {

	return new Promise(
		function(resolve, reject) {
			pool.getConnection(function(err, connection) {
				if (err) return connectionReject(connection, err, reject);
				// Flesh
			});
		}
	);

}

// Delete the entire menu.
Menus.deleteMenu = function(menu_id) {

}

// Update items given the list of items and menu_id.
Menus.updateItems = function(items, menu_id) {

	// recursive function to carry out the transaction
	var updateItem = function(connection, index, items, menu_id) {
		console.log("Recursive update item");
		return new Promise(
			function(resolve, reject) {
				//Construct Query
				var item = items[index];
				var stmt = "update Items";
				var params = [];
				var values = [];
				var end = "where id = ? AND menu_id = ?";

				if(!(item.id)) {
					reject(new MissingArgument("id"));
				}
				if (item.price) {
					params.push("price");
					values.push(item.price);
				}
				if (item.name) {
					params.push("name");
					values.push(item.name);
				}
				if (item.description) {
					params.push("description");
					values.push(item.description);
				}
				if (item.image) {
					params.push("image");
					values.push(item.image);
				}

				var execute = stmt + " " + helper.constructSetStatement(params) + " " + end;

				console.log(execute);

				values.push(item.id);
				values.push(menu_id);

				console.log(values);

				connection.query(execute, values, function(err, rows) {
					if(err) {
						connection.rollback();
						return connectionReject(connection, err, reject, true);
					}
					else if(index < items.length -1) {
						updateItem(connection, index+1, items, menu_id).then(function(result) {
							return resolve(helper.concat_results(rows, result));
						})
					}
					else {
						return resolve(rows);
					}
				});
			}
		);
	}

	// initialize transaction and connection
	return new Promise(
		function(resolve, reject) {
			pool.getConnection(function(err, connection) {
				if (err) return connectionReject(connection, err, reject);
				connection.beginTransaction(function(err) {
					if (err) return connectionReject(connection, err, reject, true);
					updateItem(connection, 0, items, menu_id).then(function(rows) {
						connection.commit();
						connection.release();
						return resolve(rows);
					}).catch(function(err) {
						return connectionReject(connection, err, reject, true);
					});

				});
			});
		}	
	);

}


// Get all items belonging to menu: menu_id
Menus.getItems = function(menu_id) {

	return new Promise(
        function(resolve, reject) {
            pool.getConnection(function(err, connection) {
            	if (err) return connectionReject(connection, err, reject);
            	console.log("select * from Items where Items.menu_id = ?");
				connection.execute("select * from Items where Items.menu_id = ?", [menu_id], function(err,rows) {
					if (err) return connectionReject(connection, err, reject);
					connection.release();
					return resolve(rows);				
				});
			});
        }
    );

}


// Update categories given the list of categories and menu_id.
Menus.updateCategories = function(categories, menu_id) {

	// recursive function to carry out the transaction
	var updateCategory= function(connection, index, categories, menu_id) {
		console.log("recursive update category");
		return new Promise(
			function(resolve, reject) {
				// Construct Query
				var category = categories[index];
				var stmt = "update Categories";
				var params = [];
				var values = [];
				var end = "where id = ? AND menu_id = ?";

				if(!(category.id)) {
					reject(new MissingArgument("id"));
				}
				if (category.name) {
					params.push("name");
					values.push(category.name);
				}
				if (category.description) {
					params.push("description");
					values.push(category.description);
				}

				var execute = stmt + " " + helper.constructSetStatement(params) + " " + end;

				console.log(execute);

				values.push(category.id);
				values.push(menu_id);

				console.log(values);

				connection.query(execute, values, function(err, rows) {
					if(err) {
						connection.rollback();
						return connectionReject(connection, err, reject, true);
					}
					else if(index < categories.length -1) {
						updateCategory(connection, index+1, categories, menu_id).then(function(result) {
							return resolve(helper.concat_results(rows, result));
						})
					}
					else {
						return resolve(rows);
					}
				});
			}
		);
	}

	// initialize transaction and connection
	return new Promise(
		function(resolve, reject) {
			pool.getConnection(function(err, connection) {
				if (err) return connectionReject(connection, err, reject);
				connection.beginTransaction(function(err) {
					if (err) return connectionReject(connection, err, reject, true);
					return updateCategory(connection, 0, categories, menu_id).then(function(rows) {
						connection.commit();
						connection.release();
						return resolve(rows);
					}).catch(function(err) {
						return connectionReject(connection, err, reject, true);
					});

				});
			});
		}	
	);

}

// Get all categories belonging to menu: menu_id
Menus.getCategories = function(menu_id) {

	return new Promise(
        function(resolve, reject) {
            pool.getConnection(function(err, connection) {
            	if (err) return connectionReject(connection, err, reject);
            	console.log("select * from Categories where Categories.menu_id = ?");
				connection.execute("select * from Categories where Categories.menu_id = ?", [menu_id], function(err,rows) {
					if (err) return connectionReject(connection, err, reject);
					connection.release();
					return resolve(rows);				
				});
			});
        }
    );

}

// Add the list of items under menu_id: menu_id
Menus.addItems = function(items, menu_id) {

	// Recurse over each item and call recursive_tags for each item
	var recursive_items_tags = function(index, first_id, items) {
		return new Promise(function(resolve, reject) {
			console.log("recursive_items_tags");
			// If the item has tags
			if(items[index].tags) {
				recursive_tags(0, items[index].tags, first_id).then(function(result) {
					if(index < items.length-1) {
						recursive_items_tags(index+1, first_id+1, items).then(function(result) {
							return resolve(result);
						}).catch(function(err) {
							return reject(err);
						})
					}
					else {
						return resolve(result);
					}
				}).catch(function(err) {
					return reject(err);
				})
			}
			// If there are items left
			else if(index < items.length-1) {
				console.log (index)
				console.log (items.length);
				recursive_items_tags(index+1, first_id +1, items).then(function(result) {
					return resolve(result);
				});
			}
			// Otherwise we just resolve
			else {
				return resolve(null);
			}
		});
	};

	// Recursively add each tag to the item
	var recursive_tags = function(index, tags, item_id) {
		return new Promise(function(resolve, reject){
			console.log("recursive_tags");
			Tags.addItemTag(tags[index], item_id).then(function(result) {
				if(index < tags.length-1) {
					recursive_tags(index+1,tags, item_id).then(function(result) {
						return resolve(result);
					}).then(function(err) {
						return reject(err);
					})
				}
				else {
					return resolve(result);
				}
			}).catch(function(err) {
				return reject(err);
			})
		});
	};

	return new Promise(
		function(resolve, reject) {
			// If there are items left add them
			var params = ["price", "name", "menu_id", "category_id", "description", "image"];
			var stmt = "insert into Items"
			var values = [];

			for(var index = 0;index<items.length;index++) {
				var item = items[index];
				values = values.concat([item.price, item.name, menu_id]);

				// Special case, means that item was passed in with a category it belongs to.
				// Must look up the added category, get category_id... and the make that category_id
				values.push(item.category_id);
				values.push(item.description);
				values.push(item.image);
			}

			var execute = helper.build_query(stmt, params, items.length);

			console.log(execute);
			console.log(values);

			pool.getConnection(function(err, connection) {
				connection.query(execute, values, function(err, rows) {
					if (err) return connectionReject(connection, err, reject);
					connection.release();
					recursive_items_tags(0, rows.insertId, items).then(function(result) {
						connection.release();
						return resolve(rows);
					}).catch(function(err){
						return connectionReject(connection, err, reject);
					});
				});
			});
		}
	);

}

// Add the list of categories under menu_id: menu_id
Menus.addCategories = function(categories, menu_id) {

	return new Promise(
		function(resolve, reject) {
			var params = ["menu_id", "name", "description"];
			var stmt = "insert into Categories"
			var values = [];

			// Loop through the categories and add their values
			for(var index = 0; index < categories.length; index++) {
				var category = categories[index];

				values.push(menu_id);
				values.push(category.name);
				values.push(category.description);

			}
			var execute = helper.build_query(stmt, params, categories.length);
			console.log(execute);
			console.log(values);
			pool.getConnection(function(err, connection) {
				if (err) return connectionReject(connection, err, reject);
				connection.execute(execute, values, function(err, rows) {
					if (err) return connectionReject(connection, err, reject);
					connection.release();
					return resolve(rows);
				});	
			})	
		}
	);

}

// Delete items by their ids
// ids = array of the ids
Menus.deleteItems = function(ids, menu_id) {

	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {

			var execute = "delete from Items where id in " + helper.constructQuestions(ids.length);
			console.log(execute);
			console.log(ids);

			connection.execute(execute, ids, function(err, rows) {
				if (err) return connectionReject(connection, err, reject);
				connection.release();
				return resolve(rows);
			})
		});
	});

}

// Delete categories by their ids
Menus.deleteCategories = function(ids, menu_id) {

	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			var execute = "delete from Categories where id in " + helper.constructQuestions(ids.length);
			console.log(execute);
			console.log(ids);

			connection.execute(execute, ids, function(err, rows) {
				if (err) return connectionReject(connection, err, reject);
				connection.release();
				return resolve(rows);
			})			
		});
	});

}

Menus.isOwner = function(user_id, menu_id) {

	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			var execute = "select owner from Menus where Menus.id = ?";
			console.log(execute);
			console.log(menu_id);

			connection.execute(execute, [menu_id], function(err, rows) {
				if (err) return connectionReject(connection, err, reject);
				connection.release();
				if(rows.length == 0 ) {
					console.log("menu doesn't exist")
					return resolve(false);
				}
				else if(rows[0].owner == user_id) {
					console.log("is owner indeed")
					return resolve(true);
				}
				else {
					console.log("Is not the owner!");
					return resolve(false);
				}

			})
		});
	});

}

Menus.getDates = function(cutoff, d_days) {
	d_days = d_days.split('')
	var date = new Date()
	today = date.getDay()

	dates = []

	for(i=today+1;i<7;i++) {
		if (d_days[i] == "1") {
			var addMe = new Date()
			addMe.setDate( addMe.getDate() + (i- today))
			dates.push(addMe.getDate()+'/'+ (addMe.getMonth()+1) +'/'+addMe.getFullYear());
		}
	}

	for(i=0;i<=today;i++) {
		if (d_days[i] == "1") {
			var addMe = new Date()
			addMe.setDate( addMe.getDate() + (i + 1 + (6 - today)))
			dates.push(addMe.getDate()+'/'+ (addMe.getMonth()+1) +'/'+addMe.getFullYear());
		}
	}
	return dates
}

// Return which dates are available for delivery
Menus.getDatesDB = function(menu_id) {

	return new Promise(function(resolve, reject) {

		var execute = "select d_days, cutoff from Menus where Menus.id = ?"
		var value = [menu_id]
		console.log(execute)
		pool.getConnection(function(err, connection) {
			if(err) {
				connection.release();
				return reject(err);
			}
			connection.execute(execute, value, function(err, rows) {
				connection.release();
				if(err) {
					return reject(err);
				}
				else {
					return Menus.getDates(rows.cutoff, rows.d_days)
				}
				
			})
		});
	})
}

// Given an order return whether each item id is valid 
// if it is valid return the total cost [cost, tax]
Menus.validateItems = function(items) {
	var tax = 0.15;
	var stmt = "select price, name from Items where Items.id = ? and Items.menu_id = ?"

	var recursive_validate = function(connection, items, i, price, names) {

		return new Promise(function(resolve, reject) {
			// Finished
			if(i >= items.length) {
				connection.release();

				result = {	cost: Number(price.toFixed(2)), 
							tax:  Number((price * tax).toFixed(2)),
							names: names};

				return resolve(result);
			}

			//CAN SIMPLIFY (get rid of owner)
			var item_id = items[i].id;
			var owner_id = items[i].owner_id;
			var quantity = items[i].quantity;
			console.log(owner_id)
			Menus.getMenuFromOwner(owner_id).then(function(menu) {
				menu_id = menu[0].id
				var values = [item_id, menu_id];
				console.log(stmt);
				console.log(values);
				// get price of item and add it
				connection.execute(stmt, values, function(err, rows) {
					if(err) {
						connection.release();
						return reject(err);
					}
					// Also get the valid names... someone might troll
					if(names) {
						names.push(rows[0].name);
					}
					else {
						names = [rows[0].name];
					}
					return recursive_validate(connection, items, i+1, Number(price) + (Number(quantity) * Number(rows[0].price)), names)
					.then(function(result) {
						return resolve(result);
					}).catch(function(err) {
						return reject(err);	
					});	
				})
			}).catch(function(err) {
				return reject(err);
			});

			
		});
	};

	// Canadian HST
	return new Promise( function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if (err) {
				connection.release();
				return reject(err);
			}
			else {
				return recursive_validate(connection, items, 0, 0).then(function(result) {
					return resolve(result);
				}).catch(function(err) {
					return reject(err);	
				});	
			}
		});
	});
}


module.exports.menus = Menus;