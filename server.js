'use strict';

const
    express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()); // create Express HTTP server

const PAGE_ACCESS_TOKEN = process.env.VERIFY_TOKEN || '$$VERYFY_TOKEN$$';

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
    console.log('webhook =: ', JSON.stringify(body));

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
                console.log('webhook_event =: ', webhook_event);

                // Get the sender PSID
                let sender_psid = webhook_event.sender.id;
                console.log('Sender PSID =: ' + sender_psid);

                // Check if the event is a message or postback and
                // pass the event to the appropriate handler function
                if (webhook_event.message)
                {
                    handleMessage(sender_psid, webhook_event.message);        
                }
                else if (webhook_event.postback)
                {
                    handlePostback(sender_psid, webhook_event.postback);
                }
                else if (webhook_event.game_play)
                {
                    handleGamePlay(sender_psid, webhook_event.game_play);
                }
            }
            catch (e)
            {
                console.log(e);
                return
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
    let response;
    let request_body = {
        "messaging_type": "RESPONSE",
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    // Check if the message contains text
    if (received_message.text)
    {
        // Create the payload for a basic text message
        response = {
            "text": `You sent the message: "${received_message.text}". Now send me an image!`
        }
    }
    else if (received_message.attachments)
    {
        
        // Gets the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [{
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }

    }

    // Attach message to request_body
    request_body.message = response;

    // Sends the response message
    callSendAPI(request_body);  
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;
    let request_body = {
        "messaging_type": "RESPONSE",
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };
    
    // Get the payload for the postback
    let payload = received_postback.payload;
  
    // Set the response based on the postback payload
    if (payload === 'yes')
    {
        response = {
            "text": "Thanks!"
        }
    }
    else if (payload === 'no')
    {
        response = {
            "text": "Oops, try sending another image."
        }
    }

    // Attach message to request_body
    request_body.message = response;

    // Send the message to acknowledge the postback
    callSendAPI(request_body);
}

// 
function handleGamePlay(sender_psid, received_gameplay)
{
    let response;
    let request_body = {
        "messaging_type": "RESPONSE",
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    // Collect gameplay data
    let gameId = received_gameplay.game_id;
    let playerId = received_gameplay.player_id;
    let contextType = received_gameplay.context_type;
    let contextId = received_gameplay.context_id;
    let payload = received_gameplay.payload;

    // Send a "Play Again!" button
    response = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "It has been a while since your last game. Time to get back.",
                    "buttons": [{
                        "type": "game_play",
                        "title": "Play Again!",
                        "payload": "{}",
                        "game_metadata": {
                            "player_id": playerId
                        }
                    }]
                }]
            }
        }
    }

    // Attach message to request_body
    request_body.message = response;
    
    // Send the message to acknowledge the postback
    callSendAPI(request_body);
}

// Sends response messages via the Send API
function callSendAPI(request_body) {
    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    },
    (err, res, body) =>
    {
        if (!err)
        {
            console.log('message sent!')
        }
        else
        {
            console.error("Unable to send message:" + err);
        }
    }); 
}

module.exports = app ;