// Session and Authentication Tests

var chakram = require('chakram');
var expect = chakram.expect;

var rooturl = 'https://localhost:443'

var testuser = {username: "homecuser@fake.hc", password: 'homec4life', role : 'consumer'}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

describe("Session and Authentication Tests", function() {

	it("GET with no authentication headers", function(done) {
		chakram.get(rooturl).then(function(response) {
			expect(response).to.comprise.of.json({
				code: 4
			});
			done();
		});
	});

	it("GET with expired headers", function(done) {
		chakram.post(rooturl + '/signup', {username: "homecuser@fake.hc", password: 'homec4life', expiration: 1}).then(function(response) {
			var sid = response.body.sid;
			expect(sid).to.be.an('string');
			var options = {headers: {sid: sid, username: "homecuser@fake.hc"}};
			chakram.get(rooturl, options).then(function(response) {
				expect(response).to.comprise.of.json({
					code : 201
				});
				done();
			});
		});
	});

	it("GET with successful authentication", function(done) {
		chakram.post(rooturl + '/signup', {username: "homecuser@fake.hc", password: 'homec4life'}).then(function(response) {
			var sid = response.body.sid;
			expect(sid).to.be.an('string');
			var options = {headers: {sid: sid, username: "homecuser@fake.hc"}}
			chakram.get(rooturl, options).then(function(response) {
				expect(response).not.to.comprise.of.json({
					code : 4
				});
				expect(response).not.to.comprise.of.json({
					code : 201
				});
				done();
			});
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