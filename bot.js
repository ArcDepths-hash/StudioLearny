const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Grab the token from Render's environment variables
const token = process.env.DISCORD_TOKEN;

client.once('ready', () => {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);
});

// Simple test command
client.on('messageCreate', (message) => {
    if (message.content === '!ping') {
        message.channel.send('pong!');
    }
});

client.login(token);
