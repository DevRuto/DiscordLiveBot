const Discord = require('discord.js');
const TwitchApi = require('./twitchapi');
// Edit your info in config.json
const { prefix, listenPort, discordToken, twitchToken, twitchSecret } = require('./config.json');

const discordClient = new Discord.Client();
const twitch = new TwitchApi(twitchToken, twitchSecret);

// channels to log to
const logChannels = ['441691196339781644'];

discordClient.on('ready', () => {
    console.log(`Logged as ${discordClient.user.tag}`);
    discordClient.user.setActivity('Ruto');
    twitch.init(listenPort, () => {
        twitch.getUserId('rutokz', id => {
            twitch.watchUser(id);
        })
    }, onStreamLive, onStreamEnd);
});

discordClient.on('message', msg => {
    if (!msg.content.startsWith(prefix)) return;
    msg.content = msg.content.substring(1);
    if (msg.content === 'ping') {
        msg.reply('Pong!');
    }
});

discordClient.login(discordToken);

function onStreamLive(userid, username) {
    for (var i = 0; i < logChannels.length; i++) {
        discordClient.channels.get(logChannels[i]).send(`${username} went live`);
    }
}

function onStreamEnd(userid, username) {
    for (var i = 0; i < logChannels.length; i++) {
        discordClient.channels.get(logChannels[i]).send(`${username} went offline`);
    }
}
//https://api.twitch.tv/helix/streams
//
//secret 