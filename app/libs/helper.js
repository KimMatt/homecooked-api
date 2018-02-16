// Authors: Matthew Kim
// mtt.kim@mail.utoronto.ca
//
// Helper functions for the API

var helper = Object();


// Check if a request's body fits requirements
// Example:
// body_check(req.body, 2, 
//		{'username': req.body.username, 'password' : req.body.password});
//
// length - expected body length
// values - dictionary of expected value names and actual values
//
helper.body_check = function(body, length, values) {

	var body_length = Object.keys(body).length;
	for(var value in values) {
		if (!values[value]) {
			return {
				message : 'Missing ' + value
			};
		}
	}

	if(body_length < length) {
		return {
			message : 'Wrong number of arguments in body, expected ' + String(length) + ' got: ' + String(body_length)
			};
	}

	return null;
}

// Check if a request's header fits requirements
helper.header_check = function(values) {

	for(var value in values) {
		if (!values[value]) {
			return {
				message : 'Missing ' + value
			};
		}
	}

	return null;
}

// Constructs question marks
// ex.length 2 (?, ?).
helper.constructQuestions = function(length) {
	var values = " (";
	while(length > 0) {
		values = values + "?,";
		length--;
	}
	values = values.substring(0,values.length-1) + ")"
	return values;
}

// Constructs multiple values for an insert usually. 
// ex: VALUES (?,?) (?,?) length 2 times 2.
helper.construct_values = function(length, times) {
	var values = "";
	for(var i = 0; i < times; i++) {
		var thisLength = length;
		if( i == 0) {
			values = values + "VALUES ";
		}
		values = values + helper.constructQuestions(thisLength) + ",";
	}
	
	return values.substring(0, values.length-1);
}


helper.construct_params = function(list) {
	var params = ")";
	while(list.length > 0) {
		params = "," + list.pop() + params;
	}
	params = "(" + params.substring(1,params.length);
	return params;
}

helper.constructSetStatement = function(params) {
	var stmt = "SET "
	for( i in params) {
		stmt = stmt + params[i] + "=? , ";
	}
	return stmt.slice(0,stmt.length-2) + " ";
}

// Build a sql query to insert
// query - the beginning of the query ex. insert into Table
// list - the list of parameters
// times - the number of items to be inserted
helper.build_query = function(query, list, times) {
	var values = "";
	return query + " " + helper.construct_params(list.slice(0)) + " " + helper.construct_values(list.length, times);
}

helper.handle_error = function(res, err) {
	if (!err) {
		return res.status(500).json({
					     "message" : "Unknown error"});
	}
	console.log("HANDLE ERROR");
	var code = err.code;
	console.log(err)
	console.log(code);
	if(code === "ER_DUP_ENTRY") {
		return res.status(400).json({
					     "message" : "Entry already exists"});
	}
	else {
		if(err.stack) {
			console.log(err.stack);
		}
		failed = {};
		if(err.message) {
			failed.message = err.message
		}
		else {
			failed.message = "Internal server error";
		}
		if(err.myMessage) {
			failed["additional info"] = err.myMessage;
		}
		if(err.code) {
			failed.code = err.code;
		}
		return res.status(500).json(failed);
	}
}

// Concatenate db insert results
helper.concat_results = function(result1, result2) {
	var result = new Object();
	result.fieldCount = result1.fieldCount + result2.fieldCount;
	result.affectedRows = result1.affectedRows + result2.affectedRows;
	result.insertId = result1.insertId + result2.insertId;
	result.serverStatus = result1.serverStatus + result2.serverStatus;
	result.warningStatus = result1.warningStatus + result2.warningStatus;
	return result;

}

module.exports.helper = helper;