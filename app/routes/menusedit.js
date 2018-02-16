// Authors: Matthew Kim
// mtt.kim@mail.utoronto.ca
//
// Merchant Routes
// Deals with the REST api call validation.
// Calls on the backend logic from menus.js to insert values into database using promises.
var express = require('express');
var router = express.Router();
var helper = require('../libs/helper').helper;
var Menus = require('../libs/menus').menus;
var Promise = require('bluebird');
var users = require('../libs/users').users;

// TODO: allow categories to be added at the same time as items.
// TODO: check for duplicate item names and categories.
// TODO: check authorization for actions, as in if the items being operated on belong to the owner.

/*{
	name: 'Categories',
	columns: [
		{name: 'cid', type: 'int NOT NULL AUTO_INCREMENT'},
		{name: 'owner', type: 'int NOT NULL'},
		{name: 'name', type: 'text NOT NULL'},
		{name: 'description', type: 'text'},
		{option: 'PRIMARY KEY(cid)'},
		{option: 'FOREIGN KEY(mid) REFERENCES Menus(mid) ON DELETE CASCADE ON UPDATE CASCADE'}
	]
},*/

// PUT /menus create a menu
router.put('', function(req,res) {

	var name = req.body.menu.name;
	var description = req.body.menu.description;
	var owner = req.homec.user_id;
	var banner = req.body.menu.banner;
	var tags = req.body.menu.tags;
	var min_order = req.body.menu.min_order;
	var special_min_order = req.body.menu.special_min_order;
	var d_days = req.body.menu.d_days;
	var cutoff = req.body.menu.cutoff;

	console.log('DEBUG: ' + tags);
	console.log(tags[0])

	if(tags) {
		if(tags.constructor !== Array) {
			res.status(400).json( { message: "Tags must be an array"});
		}
	}

	var check = helper.body_check(req.body.menu, 2, {'name': name, 'description':description, 'minimum order': min_order});
	if(check) {
		return res.status(400).json(check);
	}
	else {
		Menus.createMenu(name, description, owner, banner, tags, min_order, special_min_order, d_days, cutoff).then(function(result) {
			return res.status(200).json({result: result});
		}).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}

	// TODO create tags

});

router.all('*', function(req, res, next) {
	var menu_id = req.body.menu_id;
	var user_id = req.homec.user_id;
	// Check if there is a menu id
	var check = helper.body_check(req.body, 1, {'menu_id': menu_id});
	if(check) {
		return res.status(400).json(check);
	}
	// Else check if the user is the owner of the menu
	else {
		Menus.isOwner(user_id, menu_id).then(function(result) {
			if(result) {
				next();
			}
			else {
				return res.status(403).json({message: "Forbidden"});
			}
		}).catch(function(err) {
			if(err) return helper.handle_error(res,err);
		})
	}

})

// PUT /items create categories and items
router.put('/items', function(req, res) {
	var items = req.body.items;
	var categories = req.body.categories;
	var menu_id = req.body.menu_id;

	// Check validity of arguments
	for(var i in items) {
		var item = items[i];

		var check = helper.body_check(item, 3, {'name': item.name, 'price': item.price});

		if(item.tags) {
			if(item.tags.constructor !== Array) {
				res.status(400).json( { message: "Tags must be an array"});
			}
		}

		if(check) {
			return res.json.status(400).json(check)
		}

		if(typeof item.price !== 'number') {
			console.log(typeof item.price)
			return res.status(400).json({
				message: "Price must be a number"
			});
		}
	}

	for(var i in categories) {
		var category = categories[i];
		var check = helper.body_check(category, 1, {'name': category.name})
		if(check) {
			return res.status(400).json(check)
		}
	}

	if (categories) {
		Menus.addCategories(categories, menu_id).then(function(categories) {
			if (items) {
				Menus.addItems(items, menu_id).then(function(items) {
					return res.status(200).json({
									result: {
										categories: categories,
										items: items
									}});
				}).catch(function(err) {
					return helper.handle_error(res, err);
				});
			}
			else {
				return res.status(200).json({
					result: {
						categories: categories
					}
				});
			}
		}).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}
	else if (items) {
		Menus.addItems(items, menu_id).then(function(items) {
			return res.status(200).json({
							result: {
								items: items
							}})
		}).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}
	else {
		return res.status(400).json({
			message: "no categories or items in body"
		});
	}

});

// POST /items update categories and items
router.post('/items', function(req, res) {
	var items = req.body.items;
	var categories = req.body.categories;
	var menu_id = req.body.menu_id;

	// Check validity of arguments
	for(var i in items) {
		var item = items[i];
		var check = helper.body_check(item, 1, {'id': item.id});
		if(check) {
			return res.status(400).json(check)
		}
	}
	for(var i in categories) {
		var category = categories[i];
		var check = helper.body_check(category, 1, {'cid': category.id})
		if(check) {
			return res.status(400).json(check)
		}
	}

	if(categories) {
		Menus.updateCategories(categories, menu_id).then(function(categories) {
			if(items) {
				Menus.updateItems(items, menu_id).then(function(items) {
					return res.status(200).json({
									result: {
										items: items,
										categories: categories
									}})
				}).catch(function(err) {
					return helper.handle_error(res, err);
				});		
			}
			else {
				return res.status(200).json({
							result: {
								items: items
							}
				});
			}
	    }).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}

	else if (items) {
		Menus.updateItems(items, menu_id).then(function(items) {
			return res.status(200).json({
							result: {
								items: items
							}})
		}).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}

	else {
		return res.status(400).json({
			message: "no categories or items in body"
		});
	}

});

router.delete('/items', function(req, res) {
	var item_ids = req.body.item_ids;
	var category_ids = req.body.category_ids;
	var menu_id = req.body.menu_id;

	// Check argument validity
	if(item_ids) {
		if (typeof item_ids !== 'object') {
			return res.status(400).json({message: 'item_ids is not an array'})
		}
		else {
			for(i in item_ids) {
				if(typeof item_ids[i] !== 'number') {
					return res.status(400).json({message: 'item_ids are not numbers'})
				}
			}
		}
	}
	if(category_ids) {
		if (typeof category_ids !== 'object') {
			return res.status(400).json({message: 'category_ids is not an array'})
		}
		else {
			for(i in category_ids) {
				if(typeof category_ids[i] !== 'number') {
					return res.status(400).json({ message: 'category_ids are not numbers'})
				}
			}
		}
	}
	if(!(item_ids) && !(category_ids)) {
		return res.status(400).json({message: "no item_ids or category_ids"})
	}

	// execute 
	if(item_ids && item_ids.length > 0) {
		Menus.deleteItems(item_ids, menu_id).then(function(items) {
			if(category_ids && category_ids.length > 0) {
				Menus.deleteCategories(category_ids, menu_id).then(function(categories) {
					return res.status(200).json({
						result: {
							items : items,
							categories: categories
						}
					})
				});
			}
			else {
				return res.status(200).json({
					result: {
						items: items
					}
				})
			}
		}).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}
	else if (category_ids && category_ids.length > 0) {
		Menus.deleteCategories(category_ids, menu_id).then(function(categories) {
			return res.status(200).json({
						result: {
							categories: categories
						}
					});
		}).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}
});



	
module.exports.router = router;