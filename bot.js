const { Client, GatewayIntentBits, ActivityType, PermissionFlagsBits } = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Initialize Client with required Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

const DEFAULT_PREFIX = '!';
const guildPrefixes = new Map();

// File path for saving authorized users permanently
const DATA_FILE = path.join(__dirname, 'authorized_users.json');

// Load authorized users from file on startup
let authorizedUsers = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        authorizedUsers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log(`Loaded ${authorizedUsers.length} authorized users from file.`);
    } catch (err) {
        console.error('Error reading authorized users file, starting fresh:', err);
        authorizedUsers = [];
    }
}

// Helper function to save authorized users to the file
function saveAuthorizedUsers() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(authorizedUsers, null, 4), 'utf8');
    } catch (err) {
        console.error('Failed to save authorized users file:', err);
    }
}

// 2. The Setup Event
client.once('clientReady', (c) => {
    console.log(`Bot is online! Default prefix: ${DEFAULT_PREFIX}`);
    console.log(`Logged in as ${c.user.tag}`);
    
    client.user.setPresence({
        status: 'online',
        activities: [{
            name: `for lessons`, 
            type: ActivityType.Listening
        }]
    });
});

// 3. The Message / Command Handler
client.on('messageCreate', (message) => {
    if (!message.guild || message.author.bot) return;

    const currentPrefix = guildPrefixes.get(message.guild.id) || DEFAULT_PREFIX;
    if (!message.content.startsWith(currentPrefix)) return;

    const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- ADMINISTRATIVE COMMANDS ---

    // Command: !authorize @user
    if (command === 'authorize') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You do not have the required Administrator permission to use this command.');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply(`❌ Please mention a user to authorize. Example: \`${currentPrefix}authorize @user\``);
        }

        if (authorizedUsers.includes(targetUser.id)) {
            return message.reply(`⚠️ ${targetUser.username} is already authorized.`);
        }

        authorizedUsers.push(targetUser.id);
        saveAuthorizedUsers();

        return message.reply(`✅ Success! ${targetUser.username} has been authorized to use lesson commands.`);
    }

    // Command: !unauthorize @user
    if (command === 'unauthorize') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You do not have the required Administrator permission to use this command.');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply(`❌ Please mention a user to unauthorize. Example: \`${currentPrefix}unauthorize @user\``);
        }

        const index = authorizedUsers.indexOf(targetUser.id);
        if (index === -1) {
            return message.reply(`⚠️ ${targetUser.username} is not currently authorized.`);
        }

        authorizedUsers.splice(index, 1);
        saveAuthorizedUsers();

        return message.reply(`✅ Success! ${targetUser.username} has been stripped of their teacher permissions.`);
    }

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

            guildPrefixes.set(message.guild.id, newPrefix);
            return message.reply(`✅ Success! The prefix for this server has been changed to \`${newPrefix}\`.`);
        }

        return message.reply(`The current prefix is \`${currentPrefix}\`. Change it using \`${currentPrefix}prefix set [new-prefix]\`.`);
    }

    // --- LESSON COMMANDS BLOCK (Protected by Authorization) ---
    const isAuthorized = authorizedUsers.includes(message.author.id);

    if (command === 'lesson') {
        if (!isAuthorized) {
            return message.reply('❌ You are not an authorized teacher! You cannot use this command.');
        }

        return message.reply('📚 Teacher verified! What topic are we teaching today?');
    }
});

// 4. Web Server for Railway
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Authorized Tutor Bot is running!\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// 5. Connect
client.login(process.env.DISCORD_TOKEN);
