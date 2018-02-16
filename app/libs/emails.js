// email operations
var sendgrid = require('sendgrid')
var mail = sendgrid.mail;
console.log("FINDME " + process.env.SENDGRID_API_KEY)
var sg = sendgrid(process.env.SENDGRID_API_KEY);
var from_email = new mail.Email("homec@example.com")
var Promise = require('bluebird');

var Emails = new Object()

// Send a confirmation email for the order
Emails.sendOrderConfirmationEmail = function(email, order_info) {
	return new Promise(function(resolve, reject) {
		console.log(email);
		to_email = new mail.Email(email);
		subject = "Your MealHub Order!";
		content = new mail.Content("text/plain", "Thanks for ordering!");
		mail = new mail.Mail(from_email, subject, to_email, content);

		var request = sg.emptyRequest({
			method: 'POST',
			path: '/v3/mail/send',
			body: mail.toJSON()
		});

		sg.API(request, function(error, response) {
			if(error) {
				return reject(error)
			}
			console.log(response.statusCode);
			console.log(response.body);
			console.log(response.headers);
			console.log('Email sent');
			return resolve(response)
		});

	});
}

Emails.sendTestEmail = function() {
	return new Promise(function(resolve, reject) {
		to_email = new mail.Email("mk1995x@gmail.com");
		subject = "Sending with SendGrid is Fun";
		content = new mail.Content("text/plain", "and easy to do anywhere, even with Node.js");
		mail = new mail.Mail(from_email, subject, to_email, content);

		var request = sg.emptyRequest({
		  method: 'POST',
		  path: '/v3/mail/send',
		  body: mail.toJSON()
		});

		sg.API(request, function(error, response) {
			if(error) {
				return reject(error)
			}
			console.log(response.statusCode);
			console.log(response.body);
			console.log(response.headers);
			console.log('Email sent');
			return resolve(response)
		});
	});
	
	return null
}

// return a list of producers to their items
Emails.producersToItems = function(items) {
	var owners = {}
	var owner_ids = []
	for(var i = 0; i< items.length;i++) {
		oid = items[i].owner_id
		if(owners[str(items[i].owner_id)]) {
			owner_ids.push()
		}
		else {
			owners[str(items[i].owner_id)] = []
		}
	}
}

module.exports.emails = Emails