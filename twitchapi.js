const request = require('request');
const http = require('http');
const url = require('url');

module.exports = class TwitchApi {

    constructor(token, secret) {
        console.log("login");
        this._token = token;
        this._secret = secret;
        this._ids = {};
        this._watching = [];
    }

    init(listenerUrl, listenerPort, successCallback, streamLiveCallback, streamEndCallback) {
        this.webhookHost = listenerUrl;
        this.webhookListenerPort = listenerPort;
        this.onSuccess = successCallback;
        this.onStreamLive = streamLiveCallback;
        this.onStreamEnd = streamEndCallback;
        request.post(`https://id.twitch.tv/oauth2/token?client_id=${this._token}&client_secret=${this._secret}&grant_type=client_credentials`, (err, res, body) => {
            if (err) {
                console.log('error occured in retrieving oauth token');
                return;
            }
            body = JSON.parse(body);
            this._accessToken = body['access_token'];
            this._expiresIn = body['expires_in'];
            this.startWebhookListener();
            // renew token at some seconds before expiration (3 seconds before?)
            // TODO: figure out why no refresh token is returned
            // setTimeout(this.renew, (this._expiresIn - 3)*1000);
            setTimeout(() => {this.renew();}, (this._expiresIn - 3)*1000);
        });
    }

    renew() {
        console.log("renewed token");
        request.post(`https://id.twitch.tv/oauth2/token?client_id=${this._token}&client_secret=${this._secret}&grant_type=client_credentials`, (err, res, body) => {
            if (err) {
                console.log('error occured in retrieving oauth token, unable to renew');
                return;
            }
            body = JSON.parse(body);
            this._accessToken = body['access_token'];
            this._expiresIn = body['expires_in'];
            // renew token at some seconds before expiration (3 seconds before?)
            // TODO: figure out why no refresh token is returned
            setTimeout(() => {this.renew();}, (this._expiresIn - 3)*1000);
        });
    }

    startWebhookListener() {
        this.webhookListener = http.createServer().listen(this.webhookListenerPort, err => {
            if (err) {
                return console.log('error starting server', err);
            }
            console.log(`started webhook listener on port ${this.webhookListenerPort}`);
            this.onSuccess();
        });

        this.webhookListener.on('request', (req, res) => {
            var i = req.url.indexOf('?');
            if (i < 0) i = req.url.length;
            var id = req.url.substring(1, i);
            if (!id) return;
            // Twitch Topic handler (WebHook will push to this)
            if (req.method == 'POST') {
                var body = '';
                req.on('data', data => { body += data; });
                req.on('end', () => {
                    if (body == '') return;
                    body = JSON.parse(body);
                    var data = body['data'];
                    if (data.length == 0) {
                        // OFFLINE USER
                        this.onStreamEnd(id, this._ids[id]);
                    } else {
                        this.onStreamLive(this._ids[id], data[0]);
                    }
                    res.writeHead(202);
                    res.end();
                });
            }
            // Subscription confirmation
            if (req.method == 'GET') {
                // success
                console.log(`Success: watching user ${this._ids[id]}`)
                this._watching.push(id)
                var queryData = url.parse(req.url, true).query;
                res.writeHead(200);
                // echo back challenge
                res.end(queryData['hub.challenge']);
            }
        });
    }
    
    getUserId(name, callback) {
        request.get(`https://api.twitch.tv/helix/users?login=${name}`, {
            'auth': {
                'bearer': this._accessToken
            }
        }, (err, res, body) => {
            if (err) {
                callback(null);
            } else {
                body = JSON.parse(body);
                if (body['data'].length == 0) 
                    callback(null);
                else {
                    this._ids[body['data'][0]['id']] = name;
                    callback(body['data'][0]['id']);
                }
            }
        });
    }
    
    // 👀
    watchUser(id) {
        request.post('https://api.twitch.tv/helix/webhooks/hub', {
            'auth': {
                'bearer': this._accessToken
            },
            json: {
                'hub.callback': `http://${this.webhookHost}:${this.webhookListenerPort}/${id}`,
                'hub.mode': `subscribe`,
                'hub.topic': `https://api.twitch.tv/helix/streams?user_id=${id}`,
                'hub.lease_seconds': '864000' // max
            }
        }, (err, res, body) => {
            if (res.statusCode == 400) {
                // unable to subscribe
                console.log(`Unable to subscribe to user ${id}`)
            } 
        });
    }

    stopWatchingUser(id) {
        request.post('https://api.twitch.tv/helix/webhooks/hub', {
        'auth': {
            'bearer': this._accessToken
        },  
        json: {
            'hub.callback': `http://rutoc.me:${this.webhookListenerPort}/${id}`,
            'hub.mode': `unsubscribe`,
            'hub.topic': `https://api.twitch.tv/helix/streams?user_id=${id}`
        }
    }, (err, res, body) => {
        if (res.statusCode == 400) {
            // unable to subscribe
            console.log(`Unable to unsubscribe to user ${id}`)
        } 
    });
    }
}

// "Authorization: Bearer <access token>" 