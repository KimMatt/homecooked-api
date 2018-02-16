// Home Cooking server!
// Authors: Matthew Kim
// mtt.kim@mail.utoronto.ca
//
// IProperty of Matt Kim's sole company
// Refresher - https://scotch.io/tutorials/build-a-restful-api-using-node-and-express-4


// Requirements
// express is kind of a middleware with basic server
// functionality and routing
var express = require('express');
//var https = require('https');
var https = require('https');
var fs = require('fs');
var mysql = require('mysql2');
var users = require('./libs/users').users;
// Define app with express
var app = express();
var parser = require('body-parser');
var helper = require('./libs/helper').helper;
var cors = require('cors');


// Define our port
var port = process.env.PORT || 8080;

// Define the router from express
var signup = require('./routes/signup').router;
var menusedit = require('./routes/menusedit').router;
var menusbrowse = require('./routes/menusbrowse').router;
var userroutes = require('./routes/userroutes').router;
var orderroutes = require('./routes/orderroutes').router;

// ========= ROUTES ======================================
// The order in which we define these routes matter. If we have 'chained' routes
// then it will follow the order they are listed. 

// WHEN ACCESSING THE DATABASE PLEASE USE PREPARED STATEMENTS TO PREVENT SQL INJECTION

// ALWAYS MAKE CALLBACKS FOR ANYTHING THAT CAN HAVE AN ERROR OR ELSE IF THERE
// IS AN ERROR WITHOUT A CALLBACK THE SERVER WILL SILENTLY DIE. Example:
// connection.on('error', function(err) {
//  console.log(err.code); // 'WILL NOT DIE TODAY'
// });

// Configure app to use bodyParser()
// This will let us get the data from a POST

app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.use(cors());

app.use(function(req, res, next) {
	// ad hoc logging
	console.log(req.url + ' ' + req.method);
	req.homec = Object();
	res.setHeader('content-type', 'application/json');
	next();
});

// Thus all of our signup routes will be prefixed with signup
app.use('/signup', signup);
app.use('/menus', menusbrowse);

// normal hand crafted authentication
var norm_authn = function(req, res, next, session_id, email) {

	console.log("starting normal authentication...")

	if (session_id === undefined || email === undefined) {
		return res.status(400).json({message: 'No authentication headers'});
	}

	req.homec.username = email;

	users.authenticate(email, session_id).then(function(result) {
		if(result.code == 0) {
			return res.status(401).json({message: "Token expired"});
		}
		else if(result.code == 1) {
			req.homec.user_id = result.user_id;
			console.log("congrats");
			console.log(req.homec.user_id);
			next();
		}
		else {
			return res.status(401).json({message: "Authentication failure"});
		}
	}).catch(function(err) {
		return helper.handle_error(res, err);
	});

}
// facebook authentication
var fb_authn = function(req, res, next, access_token, facebook_id) {

	console.log("starting fb authentication...")
	
	if (access_token === undefined || facebook_id === undefined) {
		return res.status(400).json({message: 'No authentication headers'});
	}

	users.fb_authenticate(facebook_id, access_token).then(function(user_id) {
		if(user_id) {
			req.homec.user_id = user_id;
			console.log("fb user authenticated");
			console.log(req.homec.user_id);
			next();
		}
		else {
			return res.status(401).json({message: "Authentication failure"});
		}
	}).catch(function(err) {
		return helper.handle_error(res, err);
	});

}

// Authenticate the identity of the user
var authn = function(req, res, next) {
	console.log('authn');

	var facebook = req.header('facebook');
	var session_id = req.header('session_id');
	var email = req.header('email');
	var access_token = req.header('access_token');
	var facebook_id = req.header('facebook_id');

	if(typeof access_token != 'undefined' && typeof facebook_id != 'undefined') return fb_authn(req, res, next, access_token, facebook_id);
	return norm_authn(req, res, next, session_id, email);
	
};


// Check if the user is authorized here 403
var authz = function(req, res, next) {
	users.getRole(req.homec.user_id).then(function(result) {
		if (result !== 'producer') {
			return res.status(403).json({message: "Forbidden"});
		}
	}).catch(function(err) {
		return helper.handle_error(res, err);
	})
	next();

};

// All routes other than signup and menu fetching must go through authentication
// and authorization
app.all('*', authn);

app.use('/order', orderroutes)

app.use('/user', userroutes);

// beyond this only producers should access.
app.all('*', authz)

// Add the other routes
app.use('/menus', menusedit);

// app.use('/orders', orders)

// No routes

// Route not found
app.use(function(req, res, next) {
	// ad hoc logging
	return res.status(404).send();
});

// HTTPS & RUNNING SERVER ===========================================

// HTTPS options
var options = {
   key  : fs.readFileSync('cert-key/server.key'),
   cert : fs.readFileSync('cert-key/server.crt')
};

// Begin listening to the denizens!
https.createServer(options, app).listen(port, function () {
	// I have to have fun while doing this
	console.log("HELLO WATCHER");
	console.log("Port: " + port);
});

// GRACEFUL SHUTDOWN FUNCTION
var shutdown = function() {
	pool.end(function (err) {
	  // all connections in the pool have ended
	});
};
