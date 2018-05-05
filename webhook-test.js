const http = require('http');
const port = 13241;

const streamRoute = (req, res) => {
    console.log('received: ' + req.url);
    // Twitch Topic handler (WebHook will push to this)
    if (req.method == 'POST') {
        var body = '';
        req.on('data', data => { body += data; });
        req.on('end', () => {
            if (body == '') return;
            console.log(body);
            
            res.writeHead(202);
            //res.writeHead(202);
            res.end();
        });
    }
    // Subscription confirmation
    if (req.method == 'GET') {
        // success
        //var queryData = url.parse(req.url, true).query;
        res.writeHead(200);
        // echo back challenge
        res.end('234');
        //res.end(queryData['hub.challenge']);
    }
}

const server = http.createServer(streamRoute);

server.listen(port, err => {
    if (err) {
        return console.log('error starting server', err);
    }
    console.log(`started listening on port ${port}`)
});