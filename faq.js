const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', (c) => {
    console.log(`ℹ️ FAQ Bot is online as ${c.user.tag}`);
    client.user.setPresence({
        status: 'online',
        activities: [{ name: `StudioLearny FAQs`, type: ActivityType.Watching }]
    });
});

client.on('messageCreate', (message) => {
    // Ignore bots so it doesn't reply to itself or other bots
    if (message.author.bot) return;

    // Convert message to lowercase and remove any accidental blank spaces
    const msgClean = message.content.toLowerCase().trim();

    // No prefix test trigger: If someone says exactly "ping", reply "pong"
    if (msgClean === 'ping') {
        return message.reply('pong');
    }
});

// Separate web server port (8081) to prevent crashing your lesson-bot (8080)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('FAQ Bot Web Server Operational\n');
});

server.listen(8081, () => {
    console.log('FAQ Web Server listening on port 8081');
});

// Uses your existing environment token
client.login(process.env.DISCORD_TOKEN);
