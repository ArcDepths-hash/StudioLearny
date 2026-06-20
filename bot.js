const { 
    Client, 
    GatewayIntentBits, 
    ActivityType, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require('discord.js');
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

// Storage files for persistent data
const USERS_FILE = path.join(__dirname, 'authorized_users.json');
const ROLES_FILE = path.join(__dirname, 'authorized_roles.json');

// Load authorized users
let authorizedUsers = [];
if (fs.existsSync(USERS_FILE)) {
    try {
        authorizedUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        console.log(`Loaded ${authorizedUsers.length} authorized users from storage.`);
    } catch (err) {
        console.error('Error reading authorized users file:', err);
    }
}

// Load authorized roles
let authorizedRoles = [];
if (fs.existsSync(ROLES_FILE)) {
    try {
        authorizedRoles = JSON.parse(fs.readFileSync(ROLES_FILE, 'utf8'));
        console.log(`Loaded ${authorizedRoles.length} authorized roles from storage.`);
    } catch (err) {
        console.error('Error reading authorized roles file:', err);
    }
}

// Helper functions to write changes immediately
function saveAuthorizedUsers() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(authorizedUsers, null, 4), 'utf8');
    } catch (err) {
        console.error('Failed to save authorized users file:', err);
    }
}

function saveAuthorizedRoles() {
    try {
        fs.writeFileSync(ROLES_FILE, JSON.stringify(authorizedRoles, null, 4), 'utf8');
    } catch (err) {
        console.error('Failed to save authorized roles file:', err);
    }
}

// 2. The Setup Event
client.once('ready', (c) => {
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

// 3. Command and Interaction Handler
client.on('messageCreate', (message) => {
    if (!message.guild || message.author.bot) return;

    const currentPrefix = guildPrefixes.get(message.guild.id) || DEFAULT_PREFIX;
    if (!message.content.startsWith(currentPrefix)) return;

    const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- USER MANAGEMENT COMMANDS ---
    if (command === 'authorize') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You do not have the required Administrator permission.');
        }
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`❌ Please mention a user. Example: \`${currentPrefix}authorize @user\``);

        if (authorizedUsers.includes(targetUser.id)) return message.reply(`⚠️ ${targetUser.username} is already authorized.`);
        
        authorizedUsers.push(targetUser.id);
        saveAuthorizedUsers();
        return message.reply(`✅ Success! ${targetUser.username} has been individually authorized.`);
    }

    if (command === 'unauthorize') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You do not have the required Administrator permission.');
        }
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply(`❌ Please mention a user. Example: \`${currentPrefix}unauthorize @user\``);

        const index = authorizedUsers.indexOf(targetUser.id);
        if (index === -1) return message.reply(`⚠️ ${targetUser.username} is not currently authorized.`);

        authorizedUsers.splice(index, 1);
        saveAuthorizedUsers();
        return message.reply(`✅ Success! ${targetUser.username} has been removed.`);
    }

    // --- ROLE MANAGEMENT COMMANDS ---
    if (command === 'authorizerole' || command === 'authoriserole') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You do not have the required Administrator permission.');
        }
        const targetRole = message.mentions.roles.first();
        if (!targetRole) return message.reply(`❌ Please mention a role. Example: \`${currentPrefix}authorizerole @Teacher\``);

        if (authorizedRoles.includes(targetRole.id)) return message.reply(`⚠️ The role ${targetRole.name} is already authorized.`);

        authorizedRoles.push(targetRole.id);
        saveAuthorizedRoles();
        return message.reply(`✅ Success! Anyone with the **${targetRole.name}** role is now authorized to teach.`);
    }

    if (command === 'unauthorizerole' || command === 'unauthoriserole') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ You do not have the required Administrator permission.');
        }
        const targetRole = message.mentions.roles.first();
        if (!targetRole) return message.reply(`❌ Please mention a role. Example: \`${currentPrefix}unauthorizerole @Teacher\``);

        const index = authorizedRoles.indexOf(targetRole.id);
        if (index === -1) return message.reply(`⚠️ The role ${targetRole.name} is not currently authorized.`);

        authorizedRoles.splice(index, 1);
        saveAuthorizedRoles();
        return message.reply(`✅ Success! The **${targetRole.name}** role has been removed from authorization.`);
    }

    // --- DISPLAY LISTS ---
    if (command === 'authorized' || command === 'authorised') {
        const userMentions = authorizedUsers.length > 0 
            ? authorizedUsers.map(id => `<@${id}> (ID: ${id})`).join('\n') 
            : '*None designated individually*';

        const roleMentions = authorizedRoles.length > 0 
            ? authorizedRoles.map(id => `<@&${id}> (ID: ${id})`).join('\n') 
            : '*None designated*';

        const listEmbed = new EmbedBuilder()
            .setColor('#1a1a1a')
            .setTitle('👥 StudioLearny Access Panel')
            .addFields(
                { name: '👤 Individually Authorized Users', value: userMentions },
                { name: '🛡️ Authorized Roles (Anyone with these has access)', value: roleMentions }
            )
            .setTimestamp()
            .setFooter({ text: `Users: ${authorizedUsers.length} | Roles: ${authorizedRoles.length}` });

        return message.reply({ embeds: [listEmbed] });
    }

    // --- PREFIX CONFIGURATION ---
    if (command === 'prefix') {
        const subCommand = args[0]?.toLowerCase();
        if (subCommand === 'set') {
            const newPrefix = args[1];
            if (!newPrefix) return message.reply(`❌ Please specify a new prefix.`);
            if (newPrefix.length > 3) return message.reply('❌ The prefix must be 3 characters or less.');

            guildPrefixes.set(message.guild.id, newPrefix);
            return message.reply(`✅ Success! Prefix changed to \`${newPrefix}\`.`);
        }
        return message.reply(`The current prefix is \`${currentPrefix}\`.`);
    }

    // --- LESSON COMMAND (CHECKS USERS AND ROLES) ---
    if (command === 'lesson') {
        // Check if user is individually authorized OR has any of the allowed roles
        const isUserAuthorized = authorizedUsers.includes(message.author.id);
        const hasAuthorizedRole = message.member.roles.cache.some(role => authorizedRoles.includes(role.id));

        if (!isUserAuthorized && !hasAuthorizedRole) {
            return message.reply('❌ You are not an authorized teacher! You cannot use this command.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lesson_mistake')
                .setLabel('I made a mistake')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('lesson_write')
                .setLabel('Write lesson')
                .setStyle(ButtonStyle.Success)
        );

        return message.reply({
            content: '👋 Welcome teacher, what are we doing today?',
            components: [row]
        });
    }
});

// Handling Button clicks and Form submissions
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.message.reference) {
            const originalMsg = await interaction.channel.messages.fetch(interaction.message.reference.messageId).catch(() => null);
            if (originalMsg && interaction.user.id !== originalMsg.author.id) {
                return interaction.reply({ content: '❌ Only the teacher who initiated this command can use these buttons.', ephemeral: true });
            }
        }

        if (interaction.customId === 'lesson_mistake') {
            return interaction.update({ content: '❌ Action cancelled.', components: [] });
        }

        if (interaction.customId === 'lesson_write') {
            const modal = new ModalBuilder()
                .setCustomId('lesson_modal')
                .setTitle('Create Coding Lesson');

            const lessonInput = new TextInputBuilder()
                .setCustomId('lesson_content_input')
                .setLabel('Enter your lesson text below:')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Type your code block, instructions, or challenges here...')
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(lessonInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
            return interaction.message.delete().catch(() => null);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'lesson_modal') {
            const lessonText = interaction.fields.getTextInputValue('lesson_content_input');

            const lessonEmbed = new EmbedBuilder()
                .setColor('#1a1a1a')
                .setTitle('📚 StudioLearny Live Lesson')
                .setDescription(lessonText)
                .setTimestamp()
                .setFooter({ text: `Instructor: ${interaction.user.username}` });

            await interaction.reply({ embeds: [lessonEmbed] });
        }
    }
});

// Web Server for Railway
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Persistent Tutor Bot is running!\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// Connect
client.login(process.env.DISCORD_TOKEN);
