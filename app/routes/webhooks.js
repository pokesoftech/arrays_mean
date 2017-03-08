var express = require('express');
var router = express.Router();

var auth = require('http-auth');
var ipfilter = require('express-ipfilter');
// var Xml2js = require('xml2js');
// var parser = new Xml2js.Parser({explicitArray: false});

var bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);

// Basic HTTP Auth for Recurly Webhooks
var authConfig = {
    RECURLY_WEBHOOKS_USERNAME: process.env.RECURLY_WEBHOOKS_USERNAME ? process.env.RECURLY_WEBHOOKS_USERNAME : '',
    RECURLY_WEBHOOKS_PASSWORD: process.env.RECURLY_WEBHOOKS_PASSWORD ? process.env.RECURLY_WEBHOOKS_PASSWORD : ''
};

var basic = auth.basic({
    realm: 'recurly'
}, function(username, password, callback) {
    // Use callback(error) if you want to throw async error.
    callback(username === authConfig.RECURLY_WEBHOOKS_USERNAME && password === authConfig.RECURLY_WEBHOOKS_PASSWORD);
});

router.use(auth.connect(basic));


// Filter IP Addresses to only allow requests from Recurly Webhooks servers
var IpDeniedError = ipfilter.IpDeniedError;
var ips = [
    '50.18.192.88',
    '52.8.32.100',
    '52.9.209.233',
    '50.0.172.150',
    '52.203.102.94',
    '52.203.192.184',
    '127.0.0.1' // Local IP Address
];

// Whitelist IPs
router.use(ipfilter.IpFilter(ips, {mode: 'allow'}));


// Parse XML
router.use(bodyParser.xml());


// Handle IP Filter errors
router.use(function(err, req, res, next) {
    console.log('Webhooks Error:', err.name + ': ' + err.message);
    if (err instanceof IpDeniedError) {
        res.status(401).send('401 Unauthorized');
    } else {
        res.status(err.status || 500).send('Webhooks Error');
    }
});


// Process XML requests
router.post('/', function(req, res) {
    console.log(req.body);

    if (req.body.new_subscription_notification || req.body.updated_subscription_notification || req.body.canceled_subscription_notification || req.body.expired_subscription_notification || req.body.renewed_subscription_notification) {
        console.log('Webhook notification: Subscription updated');

        

    } else {
        console.log('Webhook notification ignored because it doesn\'t pertain to subscriptions');
    }

    res.send('webhooks url');
});

module.exports = router;
