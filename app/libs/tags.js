// tags.js
var Promise = require('bluebird');
var pool = require('../database/database').pool;
var helper = require('./helper').helper;

var Tags = Object();


// Reject and close connection
var connectionReject = function(connection, err, reject) {
	console.log('Tags reject');
	console.log(err.stack);
	connection.release(function(err){
		if (err) return reject(err);
	})
	return reject(err);
}

Tags.createTag = function (tag) {
	return new Promise(function(resolve, reject) {
		// Check if tag exists
		tag = tag.toLowerCase();
		Tags.getTag(tag).then(function(result) {
			console.log("DEBUG: " + result)
			if(result == null) {
				// If not create one
				pool.getConnection(function(err, connection) {	
					if(err) return connectionReject(connection, err, reject);
					var execute = "insert into Tags (tag) VALUES (?)";
					console.log(execute);
					console.log(tag);
					connection.execute(execute, [tag], function(err, rows) {
						if(err) return connectionReject(connection, err, reject);
						connection.release();
						// Return the newly created tag's id.
						return resolve(rows.insertId);
					});
				});
			}
			else {
				// If it does return the id
				return resolve(result);
			}
		}).catch(function(err) {
			return reject(err);
		})
	});
}

// Get the id of a single tag
Tags.getTag = function (tag) {
	return new Promise(function(resolve, reject) {
		tag = tag.toLowerCase();
		pool.getConnection(function(err, connection) {
			if(err) return connectionReject(connection, err, reject);
			var execute = "select id from Tags where Tags.tag = ?";
			console.log(execute);
			console.log(tag);
			connection.execute(execute, [tag], function(err, rows) {
				if(err) return connectionReject(connection, err, reject);
				console.log(rows);
				console.log("DEBUG2: " + rows[0])

				connection.release();
				if(rows[0]) {
					return resolve(rows[0].id);
				}
				else {
					return resolve(null);
				}
			});
		})
	});
}

// Get multiple ids of tags
Tags.getTags = function(tags) {
	return new Promise(function(resolve, reject) {
		tags = Tags.convertLower(tags);
		pool.getConnection(function(resolve, reject) {
			if (err) return connectionReject(connection, err, reject);
			var execute = "select id from Tags where Tags.tag in " + helper.constructQuestions(tags.length);
			console.log(execute);
			console.log(tags);
			connection.execute(execute, tags, function(err, rows) {
				if (err) return connectionReject(connection, err, reject);
				connection.release();
				console.log(rows);
				return resolve(rows);
			});
		});
	});
}

// Get the tags belonging to a menu
Tags.getMenuTags = function(menu_id) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if (err) return connectionReject(connection, err, reject);
			var execute = "select id, tag from (Tags natural join (select tag_id as id, menu_id from TagsMenus) as Tags) where Tags.menu_id = ?";
			console.log(execute);
			console.log(menu_id);
			connection.execute(execute, [menu_id], function(err, rows) {
				if(err) return connectionReject(connection, err, reject);
				console.log(rows);
				connection.release();
				return resolve(rows);
			})
		})
	});
}

// Get the tags belonging to an item
Tags.getItemTags = function(item_id) {
	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if (err) return connectionReject(connection, err, reject);
			var execute = "select id, tag from (Tags natural join (select tag_id as id, item_id from TagsItems) as Tags) where Tags.item_id = ?"
			console.log(execute);
			console.log(item_id);
			connection.execute(execute, [item_id], function(err, rows) {
				if(err) return connectionReject(connection, err, reject);
				console.log(rows);
				connection.release();
				return resolve(rows);
			})
		});
	});
}

// Add a tag to a menu
Tags.addMenuTag = function(tag, menu_id) {
	return new Promise(function(resolve, reject) {
		tag = tag.toLowerCase();
		Tags.createTag(tag).then(function(tag_id) {
			pool.getConnection(function(err, connection) {
				if(err) return connectionReject(connection, err, reject);
				var execute = "insert into TagsMenus (tag_id, menu_id) VALUES (?,?)";
				console.log(execute);
				console.log([tag_id, menu_id])
				connection.execute(execute, [tag_id, menu_id], function(err, rows) {
					if (err) return connectionReject(connection, err, reject);
					connection.release();
					return resolve(rows);
				});
			});
		}).catch(function(err) {
			return reject(err);
		})
	});
}

// Returns null if there is no associated tag to remove
Tags.removeMenuTag = function(tag, menu_id) {
	return new Promise(function(resolve, reject) {
		tag = tag.toLowerCase();
		Tags.getTag(tag).then(function(tag_id) {
			if(tag_id) {
				pool.getConnection(function(err, connection) {
					var execute = "delete from TagsMenus where TagsMenus.menu_id = ? and TagsMenus.tag_id = ?";
					console.log(execute);
					connection.execute(execute, [menu_id, tag_id], function(err, rows) {
						if (err) return connectionReject(connection, err, reject);
						connection.release();
						return resolve(rows);
					})
				})
			}
			else {
				return resolve(null);
			}
		}).catch(function(err) {
			return reject(err);
		});
	})
}

Tags.addItemTag = function(tag, item_id) {
	return new Promise(function(resolve, reject) {
		tag = tag.toLowerCase();
		Tags.createTag(tag).then(function(tag_id) {
			pool.getConnection(function(err, connection) {
				if(err) return connectionReject(connection, err, reject);
				var execute = "insert into TagsItems (tag_id, item_id) VALUES (?,?)";
				console.log(execute);
				connection.execute(execute, [tag_id, item_id], function(err, rows) {
					if(err) return connectionReject(connection, err, reject);
					connection.release();
					return resolve(rows);
				});
			});
		}).catch(function(err) {
			return reject(err);
		})
	})
}

Tags.removeItemTag = function(tag, item_id) {
	return new Promise(function(resolve, reject) {
		tag = tag.toLowerCase();
		Tags.getTag(tag).then(function(tag_id) {
			if(tag_id) {
				pool.getConnection(function(err, connection) {
					if(err) return connectionReject(connection, err, reject);
					var execute = "delete from TagsItems where TagsItems.item_id = ? and TagsMenus.tag_id = ?";
					console.log(execute);
					connection.execute(execute, [item_id, tag_id], function(err, rows) {
						if(err) return connectionReject(connection, err, reject);
						connection.release();
						return resolve(rows);
					})
				})
			}
			else {
				return resolve(null);
			}
		}).catch(function(err) {
			return reject(err);
		});
	})
}

Tags.searchMenus = function(tags) {

	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if(err) return connectionReject(connection, err, reject);
			tags = Tags.convertLower(tags);
			var questions = helper.constructQuestions(tags.length);
			var execute = "select * from Menus natural join (select distinct menu_id as id from (TagsMenus "+
				"natural join (select id as tag_id, tag from Tags) as TagMenus) where tag in "+
				 questions +") as Menus";

			connection.execute(execute, tags, function(err, rows) {
				if(err) return connectionReject(connection, err, reject);
				connection.release();
				return resolve(rows);
			});
		})
	});
}

Tags.searchItems = function(tags) {

	return new Promise(function(resolve, reject) {
		pool.getConnection(function(err, connection) {
			if(err) return connectionReject(connection, err, reject);
			tags = Tags.convertLower(tags);
			var questions = helper.constructQuestions(tags.length);
			var execute = "select * from Items natural join (select distinct item_id as id from (TagsItems "+
				"natural join (select id as tag_id, tag from Tags) as TagItems) where tag in "+
				 questions +") as Items";

			connection.execute(execute, tags, function(err, rows) {
				if(err) return connectionReject(connection, err, reject);
				connection.release();
				return resolve(rows);
			});
		})
	});

}

// Convert all tags to lower case.
Tags.convertLower = function(tags) {
	var lower_tags = [];
	for (var i = 0; i < tags.length; i++) {
	    lower_tags.push(tags[i].toLowerCase());
	}
	return lower_tags;
}

module.exports.tags = Tags;