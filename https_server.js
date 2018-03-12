'use strict';

const
    fs = require('fs'),
    https = require('https'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()), // create Express HTTP server
    key = fs.readFileSync('ssl/private.key'),
    cert = fs.readFileSync('ssl/sa2wks0291.crt')

var options = {
    key: key,
    cert: cert
}

// Sets server port and log message on success
https.createServer(options, app).listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

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
            // Get the message. entry.messaging is an array but only contain one message so we get at index [0]
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
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
    // Verify tooken should be a random string, hardcoded to your webhook
    let VERYFY_TOKEN = '<YOUR_VERIFY_TOKEN>';

    // parse the qurey params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token)
    {
        if (mode === 'subscribe' && token === VERYFY_TOKEN)
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