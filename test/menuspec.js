// Menu Tests

var chakram = require('chakram');
var expect = chakram.expect;

var rooturl = 'https://localhost:443';

var testuser = {username: "homecuser@fake.hc", password: 'homec4life', role : 'producer'};
var unauthorizeduser = {username: "anotherhomec@fake.hc", password: "homec4life", role : 'producer'};
var consumeruser = {username: "consumer@fake.hc", password: "home3life", role: "consumer"};
var testlogin = {username: "homecuser@fake.hc", password: 'homec4life'};
var options;
var options_unauthorized;
var options_consumer;
var mid;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// One call to add categories and items. /menu/add {items: [{item1},{item2}], categories: [{category1},{category2}]
// To update /menu/update {items: [{item1},{item2}], categories: [{category1},{category2}]
// To delete {items: [{item1},{item2}], categories: [{category1},{category2}]

describe("Menu Creation Tests", function() {

	it("Initialize more than one menu", function(done) {
		chakram.put(rooturl + '/menus/create', {name: "Another Matt's Kitchen", description: "The tastiest food on the planet", image: "www.test.com", tags :"comma,seperated,items"}, options).then(function(result) {
			expect(result).to.be.comprised.of.json({
				code: 9
			});
			done();
		});
	});

	it("Add Item", function(done) {
		chakram.put(rooturl + '/menus/add', {items:[{name: "Lasagna", price: 5.99, description: "Italians know how to cook", tags: "comma,separated,tags"}], options).then(function(result) {
			expect(result).to.be.comprised.of.json({
				code: 7
			});
			done();
		});

	});

	it("Add Item missing name", function(done) {
		chakram.put(rooturl + '/menus/add', {items: [{price: 5.99, description: "Italians know how to cook", tags: "comma,separated,tags"}], options).then(function(result) {
			expect(result).to.be.comprised.of.json({
				code: 5
			});
			done();
		});
	});

	it("Add Item missing price", function(done) {
		chakram.put(rooturl + '/menus/add', {items:[{name: "Lasagna", description: "Italians know how to cook", tags: "comma,separated,tags"}], options).then(function(result) {
			expect(result).to.be.comprised.of.json({
				code: 5
			});
			done();
		});
	});

	it("Add Category", function(done) {
		chakram.put(rooturl + '/menus/add', {categories:[{name: "Lunch", description: "Italians know how to cook", tags: "comma,separated,tags"}], options).then(function(result) {
			expect(result).to.be.comprised.of.json({
				code: 7
			});
			expect(result.body.cid).to.be.an.('number');
			done();
		});
	});

	it("Add Category missing name", function(done) {
		chakram.put(rooturl + '/menus/add', {categories:[{description: "Italians know how to cook", tags: "comma,separated,tags"}], options).then(function(result) {
			expect(result).to.be.comprised.of.json({
				code: 7
			});
			expect(result.body.cid).to.be.an.('number');
			done();
		});
	})

	it("Add Categories and Items", function(done) {
		chakram.put(rooturl + '/menus/add', {categories: [{name: "cat1", description: "desc1"},{name: "cat2", description: "cat2"}], 
			items: [{name: "item1", price: 5.99, description: "desc1", category: "cat1"},{name: "item2", price: 9.22, description:"desc2", category: "cat2"}]}, options).then(function(result){
			
			expect(result).to.be.comprised.of.json({
				code: 7
			});
			done();
		});
	})

	it("Update Menu",function (done) {
		chakram.post(rooturl + '/menus', {name: ""}, options)
	});

	it("Update Menu incorrect fields",function (done) {

	})

	it("Update Item", function(done) {

	});

	it("Update Item incorrect fields", function(done) {

	});

	it("Update Category", function(done) {

	})

	it("Update Category incorrect fields", function(done) {

	})

	it("Delete Menu", function(done) {

	});

	it("Delete Item", function(done) {

	})

	it("Delete Category", function(done) {

	})

	it("Publish Menu", function(done) {
		chakram.post(rooturl + '/menus/add', {publish: true}, options).then(function(response) {
			expect(response).to.be.comprised.of.json({
				code: 7
			})
			done();
		})

	});

	it("Unpublish Menu", function(done) {
		chakram.post(rooturl + '/menus/add', {publish: false}, options).then(function(response) {
			expect(response).to.be.comprised.of.json({
				code: 7
			})
			done();
		})
	})

	it("Publish Menu without any items", function(done) {

	});

	it("Get Menus", function(done) {
		chakram.get(rooturl + '/menus').then(function(response) {
			done();
		});	
	})

	it("Get Menu details", function(done) {
		chakram.get(rooturl + '/menus/' + mid).then(function(response) {
			done();
		});
	})

	before(function(done) {
		chakram.put(rooturl + '/signup', testuser).then(function() {
			chakram.post(rooturl + '/signup', testlogin).then(function(result) {
				options = {headers: {sid: result.body.sid, username: "homecuser@fake.hc"}}
			});
		});
		chakram.put(rooturl + '/signup', unauthorizeduser).then(function() {
			chakram.post(rooturl + '/signup', testlogin).then(function(result) {
				options_consumer = {headers: {sid: result.body.sid, username: "consumer@fake.hc"}}
			});
		});
		chakram.put(rooturl + '/signup', consumeruser).then(function() {
			chakram.post(rooturl + '/signup', testlogin).then(function(result) {
				options_unauthorized = {headers: {sid: result.body.sid, username: "anotherhomec@fake.hc"}}
			});
		});
	});

	beforeEach(function(done) {
		chakram.put(rooturl + '/menus/create', {name: "Matts kitchen", description: "The tastiest food on the planet", image: "www.test.com", tags :"comma,seperated,items"}, options).then(function(result) {
			expect(result).to.be.comprised.of.json({
				code: 5
			});
			mid = result.body.mid;
			expect(mid).to.be.an('number');
		});
	});

	afterEach(function(done) {
		chakram.delete(rooturl + '/menus/' + mid, options).then(function(){
			done();
		})
	});

	after(function(done) {
		chakram.put(rooturl + '/signup/deleteTestUser').then(function() {
			done();
		});
	});
});
