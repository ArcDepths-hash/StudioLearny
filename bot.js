const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const http = require('http');

// 1. Initialize the Discord Client with required Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = '!';

// 2. The Setup Event (Turns the bot green and handles online status)
client.once('clientReady', (c) => {
    console.log(`Bot is online! Using prefix: ${PREFIX}`);
    console.log(`Logged in as ${c.user.tag}`);
    
    // This forces the status circle to turn bright green
    client.user.setPresence({
        status: 'online',
        activities: [{
            name: `${PREFIX}help`, 
            type: ActivityType.Listening
        }]
    });
});

// 3. The Message / Prefix Command Handler
client.on('messageCreate', (message) => {
    // Ignore messages from other bots, or messages that don't start with your prefix
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    // Split the message into the command name and arguments
    const args = message.content.slice(PREFIX.length).trim().split(/+/);
    const command = args.shift().toLowerCase();

    // Example Command: !ping
    if (command === 'ping') {
        message.reply('Pong! 🏓');
    }

    // Example Command: !hello
    if (command === 'hello') {
        message.reply(`Hey there, ${message.author.username}!`);
    }
});

// 4. Fake Web Server (Keeps Railway happy so it doesn't shut down)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// 5. Log in to Discord using your Railway environment variable
client.login(process.env.DISCORD_TOKEN);
