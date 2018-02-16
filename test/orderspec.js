// Order Tests

var chakram = require('chakram');
var expect = chakram.expect;

var rooturl = 'https://localhost:443';

var testuser = {username: "homecuser@fake.hc", password: 'homec4life', role : 'producer'};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe("Transaction tests", function() {
	it("Place order", function(done) {

	});
	it("Place order with missing parameters", function(done) {

	});
	it("Get orders for merchant", function(done) {

	});
	// Paging
	it("Get orders for merchant by date", function(done) {

	});
	it("Get orders for consumer", function(done) {

	});
	it("Mark order as delivered", function(done) {

	});

	// Future calls, refund, cancel order.

});