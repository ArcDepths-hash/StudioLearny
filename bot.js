// ==================== CONFIGURATION ====================
// 1. Put your exact Discord User ID here (Owner - always has access)
const OWNER_ID = '1511377539073966353'; 

// 2. Put your 3 Teacher Role IDs inside this array
let authorizedRoles = [
    '1518179501056458792',
    '1518179528545931463',
    '1518179554563194910'
];
// =======================================================

const { 
    Client, 
    GatewayIntentBits, 
    ActivityType, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require('discord.js');
const http = require('http');

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

client.once('ready', (c) => {
    console.log(`Bot is online! Logged in as ${c.user.tag}`);
    client.user.setPresence({
        status: 'online',
        activities: [{ name: `for lessons`, type: ActivityType.Listening }]
    });
});

client.on('messageCreate', (message) => {
    if (!message.guild || message.author.bot) return;

    const currentPrefix = guildPrefixes.get(message.guild.id) || DEFAULT_PREFIX;
    if (!message.content.startsWith(currentPrefix)) return;

    const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- DISPLAY AUTHORIZED ROLES ---
    if (command === 'authorized' || command === 'authorised') {
        const roleMentions = authorizedRoles.length > 0 
            ? authorizedRoles.map(id => `<@&${id}> (ID: ${id})`).join('\n') 
            : '*No teacher roles configured in code*';

        const listEmbed = new EmbedBuilder()
            .setColor('#1a1a1a')
            .setTitle('🛡️ StudioLearny Staff Access')
            .addFields(
                { name: '👑 Bot Owner', value: `<@${OWNER_ID}>` },
                { name: '👥 Authorized Teaching Roles', value: roleMentions }
            )
            .setTimestamp()
            .setFooter({ text: `Total Roles: ${authorizedRoles.length}` });

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

    // --- LESSON COMMAND ---
    if (command === 'lesson') {
        const isOwner = message.author.id === OWNER_ID;
        const hasAuthorizedRole = message.member.roles.cache.some(role => authorizedRoles.includes(role.id));

        // Must be the owner OR have one of your 3 teacher roles
        if (!isOwner && !hasAuthorizedRole) {
            return message.reply('❌ You are not an authorized teacher! You cannot use this command.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lesson_mistake').setLabel('I made a mistake').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('lesson_write').setLabel('Write lesson').setStyle(ButtonStyle.Success)
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
    res.end('StudioLearny Bot is running!\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
