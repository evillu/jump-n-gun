'use strict';

const
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); // create Express HTTP server

const PAGE_ACCESS_TOKEN = 'EAAVw6YRW4MQBAEOFa7TEIlvvG5sLwXGipRkDQ21JtUUoGewm32DptM7FSCWJE9JZCrjDEzSdeL3AzdMBoHRWNKjcQ0ILMb4hjRN97HOw8KZBFKiMvlpPXJ8jRdZA22ulkuZAInw9IubecakUI3IB8Bze0faJv0Mbd6ZCAKg6ZA5gZDZD';

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

app.engine('html', require('ejs').renderFile);

// Sets server port and log message on success
app.listen(port, ip, () => console.log(`webhook is listening on ${ip}:${port}`));

app.get('/', function (req, res) {
    console.log('Access Homepage')
    res.render('index.html');
});

// Create the endpoint for our webhook
app.post('/webhook', (req, res) =>
{
    let body = req.body;

    // check if this is an event from a page subscription
    if (body.object == 'page')
    {
        // Iterate over each entry - there may be multiple if batched
        body.entry.forEach(function (entry)
        {
            try
            {
                // Get the message. entry.messaging is an array but only contain one message so we get at index [0]
                let webhook_event = entry.messaging[0];
                console.log(webhook_event);

                // Get the sender PSID
                let sender_psid = webhook_event.sender.id;
                console.log('Sender PSID: ' + sender_psid);
            } catch (e)
            {
                console.log('Error: ', entry);
            }
        });

        // Return a response '200' to all requests
        res.status(200).send('EVENT_RECEIVED');
    }
    else
    {
        res.sendStatus(404);
    }
})

// Add webhook verification
// Add support for GET requests to our webhook
app.get('/webhook', (req, res) =>
{
    // parse the qurey params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token)
    {
        if (mode === 'subscribe' && token === PAGE_ACCESS_TOKEN)
        {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
        else
        {
            // response '403 forbidden' if verify token doesn't match
            res.sendStatus(403);
        }
    }
})

// Handles messages events
function handleMessage(sender_psid, received_message) {

}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    
}

module.exports = app ;