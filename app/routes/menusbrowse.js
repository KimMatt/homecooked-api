// Authors: Matthew Kim
// mtt.kim@mail.utoronto.ca
//
// Browse Routes - Public
var express = require('express');
var router = express.Router();
var helper = require('../libs/helper').helper;
var Menus = require('../libs/menus').menus;
var Promise = require('bluebird');
var Tags = require('../libs/tags').tags;

router.get('/', function(req, res) {
	// default values
	const page = req.header('page');
	if (typeof page != 'Number') {
		return res.status(400).message("Expected page to be a Number, got " + (typeof page))
	}

	var size = 10;
	var offset = (page - 1) * 10;

	Menus.getMenus(size, offset).then(function(rows) {
		// Build response
		response = {menus: rows};
		res.status(200).send(response);
	}).catch(function(err) {
		return helper.handle_error(res, err);
	});

});

// GET the menu item and categories based on menu_id.
router.get('/:menu_id', function(req, res) {
	var menu_id = req.params.menu_id;
	var items;
	var categories;
	(Menus.getItems(menu_id)).then(function(result) {
		items = result;
		(Menus.getCategories(menu_id)).then(function(result) {
			categories = result;
			var resultJSON = Object();
			resultJSON.categories = categories.slice();
			console.log(resultJSON);
			for(i in resultJSON.categories) {
				resultJSON.categories[i].items = [];
			}
			// add items to the categories.
			for(i in items) {
				if(items[i].category_id) {
					for(j in resultJSON.categories) {
						console.log(resultJSON.categories[j])
						console.log(items[i])
						if(resultJSON.categories[j].id === items[i].category_id) {
							resultJSON.categories[j].items.push(items[i]);
							items.splice(i,1)
						}
					}
				}
			}
			// Add items with no categories.
			resultJSON.items = items;
			(Menus.getMenu(menu_id)).then(function(result) {

				resultJSON.description = result[0].description;
				resultJSON.name = result[0].name;
				resultJSON.banner = result[0].banner;
				resultJSON.owner = result[0].owner;
				resultJSON.dates = Menus.getDates(result[0].cutoff, result[0].d_days);
				return res.status(200).json(resultJSON);
				
			}).catch(function(err) {
				return helper.handle_error(res, err);
			});
		}).catch(function(err) {
			return helper.handle_error(res, err);
		});
	}).catch(function(err) {
		return helper.handle_error(res, err);
	});
});

router.get('/search/items', function(req, res) {
	var tags = req.query.tags;
	console.log(tags);
	if(tags.constructor !== Array && tags.constructor !== String) {
		return res.status(400).json( { message: "Tags must be an array or string"});
	}
	if(tags.constructor === String) {
		tags = [tags];
	}
	Tags.searchItems(tags).then(function(result) {
		return res.status(200).json(result);
	}).catch(function(err) {
		return helper.handle_error(res, err);
	})


});

router.get('/search/menus', function(req, res) {
	var tags = req.query.tags;
	console.log(tags);
	if(tags.constructor !== Array && tags.constructor !== String) {
		return res.status(400).json( { message: "Tags must be an array or string"});
	}
	if(tags.constructor === String) {
		tags = [tags];
	}
	Tags.searchMenus(tags).then(function(result) {
		return res.status(200).json(result);
	}).catch(function(err) {
		return helper.handle_error(res, err);
	})
});


module.exports.router = router;