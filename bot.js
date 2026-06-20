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

// File path for saving authorized users permanently
const DATA_FILE = path.join(__dirname, 'authorized_users.json');

// Load authorized users from file on startup so it survives crashes/restarts
let authorizedUsers = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        authorizedUsers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log(`Loaded ${authorizedUsers.length} authorized users from storage.`);
    } catch (err) {
        console.error('Error reading authorized users file, starting fresh:', err);
        authorizedUsers = [];
    }
}

// Helper function to write changes immediately to the disk (creates file automatically)
function saveAuthorizedUsers() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(authorizedUsers, null, 4), 'utf8');
        console.log('Authorized users list successfully saved to disk.');
    } catch (err) {
        console.error('Failed to save authorized users file:', err);
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

    // --- ADMINISTRATIVE COMMANDS ---
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
        saveAuthorizedUsers(); // Saves immediately to json file

        return message.reply(`✅ Success! ${targetUser.username} has been authorized and saved to permanent storage.`);
    }

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
        saveAuthorizedUsers(); // Removes immediately from json file

        return message.reply(`✅ Success! ${targetUser.username} has been removed from permanent storage.`);
    }

    if (command === 'authorized' || command === 'authorised') {
        if (authorizedUsers.length === 0) {
            return message.reply('ℹ️ There are currently no authorized teachers stored in the system.');
        }

        const userMentions = authorizedUsers.map(id => `<@${id}> (ID: ${id})`).join('\n');

        const listEmbed = new EmbedBuilder()
            .setColor('#1a1a1a')
            .setTitle('👥 Authorized StudioLearny Teachers')
            .setDescription(`The following users currently have access to the \`${currentPrefix}lesson\` command:\n\n${userMentions}`)
            .setTimestamp()
            .setFooter({ text: `Total Teachers: ${authorizedUsers.length}` });

        return message.reply({ embeds: [listEmbed] });
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

    // --- LESSON COMMAND WITH BUTTONS ---
    if (command === 'lesson') {
        const isAuthorized = authorizedUsers.includes(message.author.id);
        if (!isAuthorized) {
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

// 4. Web Server for Railway
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Persistent Tutor Bot is running!\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// 5. Connect
client.login(process.env.DISCORD_TOKEN);
