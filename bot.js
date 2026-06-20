const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const http = require('http');

// 1. Initialize Client with required Intents (Including GuildPresences)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences // Allows the bot to update its online status ring
    ]
});

// Default fallback prefix if a server hasn't set a custom one yet
const DEFAULT_PREFIX = '!';

// An in-memory collection to hold custom prefixes per server (guild)
const guildPrefixes = new Map();

// 2. The Setup Event
client.once('clientReady', (c) => {
    console.log(`Bot is online! Default prefix: ${DEFAULT_PREFIX}`);
    console.log(`Logged in as ${c.user.tag}`);
    
    // Using 'online' with a standard Playing status forces the UI to refresh
    c.user.setPresence({
        status: 'online',
        activities: [{
            name: `with prefix ${DEFAULT_PREFIX}`, 
            type: ActivityType.Playing
        }]
    });
});

// 3. The Message / Dynamic Prefix Handler
client.on('messageCreate', (message) => {
    // Ignore direct messages (DMs) and other bots
    if (!message.guild || message.author.bot) return;

    // Get the custom prefix for this specific server, or fall back to default
    const currentPrefix = guildPrefixes.get(message.guild.id) || DEFAULT_PREFIX;

    // Check if the message starts with the active prefix
    if (!message.content.startsWith(currentPrefix)) return;

    // Parse commands and arguments
    const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- PREFIX CONFIGURATION COMMAND ---
    if (command === 'prefix') {
        const subCommand = args[0]?.toLowerCase();

        if (subCommand === 'set') {
            const newPrefix = args[1];

            if (!newPrefix) {
                return message.reply(`❌ Please specify a new prefix. Example: \`${currentPrefix}prefix set ?\``);
            }

            if (newPrefix.length > 3) {
                return message.reply('❌ The prefix must be 3 characters or less.');
            }

            // Save the new prefix for this server's ID
            guildPrefixes.set(message.guild.id, newPrefix);
            return message.reply(`✅ Success! The prefix for this server has been changed to \`${newPrefix}\`.`);
        }

        return message.reply(`The current prefix is \`${currentPrefix}\`. Change it using \`${currentPrefix}prefix set [new-prefix]\`.`);
    }

    // --- STANDARD BOT COMMANDS ---
    // Your new custom commands go right under here!
    
});

// 4. Web Server for Railway
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// 5. Connect
client.login(process.env.DISCORD_TOKEN);
