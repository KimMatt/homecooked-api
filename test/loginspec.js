// Login Tests

var chakram = require('chakram');
var expect = chakram.expect;

var rooturl = 'https://localhost:443'

var testuser = {username: "homecuser@fake.hc", password: 'homec4life', role : 'consumer'};
var testlogin = {username: "homecuser@fake.hc", password: 'homec4life'};
var wronglogin1 = {username: "wronghomecuser@fake.hc", password: 'homec4life'};
var wronglogin2 = {username: "homecuser@fake.hc", password: 'wronghomec4life'};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

describe("Login Tests", function() {

	it("POST login missing username", function(done) {
		chakram.post(rooturl + '/signup', {password: "password"}).then(function(response) {
			expect(response).to.comprise.of.json({ code: 5});
			done();
		});
	});

	it("POST login missing password", function(done) {
		chakram.post(rooturl + '/signup', {username: "username"}).then(function(response) {
			expect(response).to.comprise.of.json({code: 5});
			done();
		});
	});

	it("POST login wrong username", function(done) {
		chakram.post(rooturl + '/signup', wronglogin1).then(function(response) {
			expect(response).to.comprise.of.json({code: 6});
			done();
		})
	});

	it("POST login wrong password", function(done) {
		chakram.post(rooturl + '/signup', wronglogin2).then(function(response) {
			expect(response).to.comprise.of.json({code: 6});
			done();
		});
	});

	it("POST login success", function(done) {
		chakram.post(rooturl + '/signup', testlogin).then(function(response) {
			expect(response).to.comprise.of.json({code: 7});
			done();
		});
	});

	before(function(done) {
		chakram.put(rooturl + '/signup', testuser).then(function() {
			done();
		});
	});

	after(function(done) {
		chakram.put(rooturl + '/signup/deleteTestUser').then(function() {
			done();
		});
	});
});