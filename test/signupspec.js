// Signup Tests

var chakram = require('chakram');
var expect = chakram.expect;

var rooturl = 'https://localhost:443'

var testuser = {username: "homecuser@fake.hc", password: 'homec4life', role : 'consumer'}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

describe("Signup Tests", function() {
	this.timeout(2000);
	it("PUT signup missing username", function(done) {
		chakram.put(rooturl + '/signup', {password: 'homec4life'}).then(function(response){
			expect(response).to.comprise.of.json({
		      code: 5
		    });
		    done();
		});
	});
	it("PUT signup missing role", function(done) {
		chakram.put(rooturl + '/signup', {username: 'testuser', password: 'password'}).then(function(response) {
			expect(response).to.comprise.of.json({
				code: 5
			});
			done();
		});
	})
	it("PUT signup missing password", function(done) {
		chakram.put(rooturl + '/signup', {username: 'testuser', role: 'role'}).then(function(response) {
			expect(response).to.comprise.of.json({
				code: 5
			});
			done();
		});
	})
	it("PUT signup success", function(done) {
		chakram.put(rooturl + '/signup', testuser).then(function(response) {
			expect(response).to.comprise.of.json({
				code: 7
			});
			done();
		});
	});
	it("PUT duplicate username", function(done) {
        chakram.put(rooturl + '/signup', testuser).then(function(response) {
        	var response = chakram.put(rooturl + '/signup', testuser);
			expect(response).to.comprise.of.json({
				code: 6
			});
			done();
        });
	});

	afterEach(function(done) {
		chakram.put(rooturl + '/signup/deleteTestUser').then(function(reply) {
			done();
		});
	});
});