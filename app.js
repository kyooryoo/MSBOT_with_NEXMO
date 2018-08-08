var restify = require('restify');
var builder = require('botbuilder');
var Nexmo = require('nexmo');
require('dotenv').config();

var nexmo = new Nexmo({
    apiKey: process.env.NEXMO_API_KEY,
    apiSecret: process.env.NEXMO_API_SECRET
});

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

server.post('/api/messages', connector.listen());

// A basic test of the bot
// // Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
// var bot = new builder.UniversalBot(connector, function (session) {
//    session.send("You said: %s", session.message.text);
// });

var inMemoryStorage = new builder.MemoryBotStorage();

// // A bot that uses a waterfall technique to prompt users for input.
// var bot = new builder.UniversalBot(connector, [
//     function (session) {
//         session.send("Welcome to the Nexmo API Platform. We will help you get registered.");
//         builder.Prompts.text(session, "Please provide your First Name:");
//     },
//     function (session, results) {
//         session.dialogData.firstName = results.response;
//         builder.Prompts.text(session, "Please provide your Last Name:");
//     },
//     function (session, results) {
//         session.dialogData.lastName = results.response;
//         builder.Prompts.number(session, "Please provide your mobile phone number in Intrnational format without prefixing + or 0:");
//     },
//     function (session, results) {
//         session.dialogData.phone = results.response;
//
//         // Process request and display reservation details
//         session.send(`Your presonal information for user registration: <br/>Name: ${session.dialogData.firstName} ${session.dialogData.lastName} <br/>Phone: ${session.dialogData.phone}`);
//         session.endDialog();
//     }
// ]).set('storage', inMemoryStorage); // Register in-memory storage

var bot = new builder.UniversalBot(connector, function(session){
    var msg = "Welcome to the Nexmo bot. Please say 'verify user' or 'send message'";
    session.send(msg);
}).set('storage', inMemoryStorage);

bot.dialog('verifyUser', [
    function (session) {
        session.send("You can verify user with a mobile number!");
        session.beginDialog('askForName');
    },
    function (session, results) {
        session.dialogData.name = results.response;
        session.beginDialog('askForPhone');
    },
    function (session, results) {
        session.dialogData.phone = results.response;
        session.send(`Your presonal information for user registration: <br/>Name: ${session.dialogData.name} <br/>Phone: ${session.dialogData.phone}`);
        session.endDialog();
    }
])
.triggerAction({
    matches: /^verify user$/i,
    confirmPrompt: "This will cancel your current request. Are you sure?"
});

bot.dialog('askForName', [
    function (session) {
        builder.Prompts.text(session, "Please provide your name:");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])

bot.dialog('askForPhone', [
    function (session) {
        builder.Prompts.number(session, "Please provide the mobile phone number:");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])
.beginDialogAction('phoneHelpAction','phoneHelp',{ matches: /^help$/i });

bot.dialog('phoneHelp', function(session, args, next) {
    var msg = "Input your phone number in its international format but without '+' or '00'. I will send you a verification code shortly.";
    session.endDialog(msg);
})

bot.dialog('sendMessage', [
    function (session) {
        session.send("You can send message to a mobile number!");
        session.beginDialog('askForFrom');
    },
    function (session, results) {
        session.dialogData.from = results.response;
        session.beginDialog('askForPhone');
    },
    function (session, results) {
        session.dialogData.to = results.response;
        session.beginDialog('askForBody');
    },
    function (session, results) {
        session.dialogData.body = results.response;
        session.send(`The following SMS will be sent: <br/>From: ${session.dialogData.from} <br/>To: ${session.dialogData.to} <br/>Body: ${session.dialogData.body}`);
        nexmo.message.sendSms(session.dialogData.from, String(session.dialogData.to), session.dialogData.body);

    }
    function (session, results) {
        session.dialogData.receipt = results.response;
        session.send(`The following SMS will be sent: <br/>From: ${session.dialogData.from} <br/>To: ${session.dialogData.to} <br/>Body: ${session.dialogData.body}`);
        nexmo.message.sendSms(session.dialogData.from, String(session.dialogData.to), session.dialogData.body);
        session.endDialog();
    }
])
.triggerAction({
    matches: /^send message$/i,
    confirmPrompt: "This will cancel your current request. Are you sure?"
});

bot.dialog('askForFrom', [
    function (session) {
        builder.Prompts.text(session, "Please provide your Sender ID:");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])
.beginDialogAction('fromHelpAction','fromHelp',{ matches: /^help$/i });

bot.dialog('fromHelp', function(session, args, next) {
    var msg = "If you do not know how to input here, please use 'NEXMO' as the Sender ID.";
    session.endDialog(msg);
})

bot.dialog('askForBody', [
    function (session) {
        builder.Prompts.text(session, "Please input the message body you want to send:");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])
.beginDialogAction('bodyHelpAction','bodyHelp',{ matches: /^help$/i });

bot.dialog('bodyHelp', function(session, args, next) {
    var msg = "If your message body contains Unicode characters, please keep it less than 70 characters.";
    session.endDialog(msg);
})

// The dialog stack is cleared and this dialog is invoked when the user enters 'help'.
bot.dialog('help', function (session, args, next) {
    session.endDialog("This is a bot that can help you verify a user. <br/>Please say 'next' to continue");
})
.triggerAction({
    matches: /^help$/i,
});
