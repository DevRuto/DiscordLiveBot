// Edit your info in config.json
const { prefix, listenUrl, listenPort, discordToken, twitchToken, twitchSecret } = require('./config.json');

const Discord = require('discord.js');
const TwitchApi = require('./twitchapi');

const discordClient = new Discord.Client();
const twitch = new TwitchApi(twitchToken, twitchSecret);

// channels to log to
const logChannels = ['441691196339781644'];
const twitchNames = ['rutokz'];

const messageCache = {};

const thumbnailSize = {width: 1000, height: 1000};

discordClient.on('ready', () => {
    console.log(`Logged as ${discordClient.user.tag}`);
    discordClient.user.setActivity('Ruto');
    twitch.init(listenUrl, listenPort, () => {
        twitch.getUserId('rutokz', id => {
            twitch.watchUser(id);
        })
    }, onStreamLive, onStreamEnd);
});

discordClient.on('message', msg => {
});

discordClient.login(discordToken);


//https://www.discordjs.guide/#/popular-topics/miscellaneous-examples?id=richembed-builder
function onStreamLive(username, data) {
    // check if message cache already printed username to prevent repeat
    // there was some notification verification thingy that i didn't bother doing
    if (username in messageCache) return;
    console.log(`${username} went live`);
    for (var i = 0; i < logChannels.length; i++) {
        discordClient.channels.get(logChannels[i])
            .send(generateTwitchEmbed(data.title, username, `https://twitch.tv/${username}`, data.thumbnail_url.replace('{width}', thumbnailSize.width).replace('{height}', thumbnailSize.height)))
            .then(msg => {
                if (!messageCache[username])
                    messageCache[username] = [];
                messageCache[username].push(msg);
            });
    }
}

function onStreamEnd(userid, username) {
    console.log(`${username} went offline`);
    // this made me really dislike javascript, because hate is not a nice word
    for (var i in messageCache[username]) {
        messageCache[username][i].delete();
    }
    delete messageCache[username];
}
//https://api.twitch.tv/helix/streams
//
//secret 

function generateTwitchEmbed(title, username, link, img) {
    return new Discord.RichEmbed()
        .setTitle(`${username} went live!`)
        .setURL(link)
        .setAuthor(username)
        .setThumbnail(img)
        .setFooter(title);
}