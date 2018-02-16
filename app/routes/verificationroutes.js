// Authors: Matthew Kim
// mtt.kim@mail.utoronto.ca
//
// Verification routes


var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var users = require('../libs/users').users;


router.get('/:userid/:verificationcode', function(req, res) {
	
	userid = req.params.userid;
	verificationcode = req.params.verificationcode;	
	// Check if verification code is correct for user, if so verify. If not, don't.
});