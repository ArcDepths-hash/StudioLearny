// ==================== CONFIGURATION ====================
const OWNER_ID = '151137753907966353'; 

// Separate your teacher roles by tier
const BASIC_TEACHER_ROLE_ID   = '1518179501056458792';
const GOLDEN_TEACHER_ROLE_ID  = '1518179528545931463';
const DIAMOND_TEACHER_ROLE_ID = '1518179554563194910';
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

client.once('ready', (c) => {
    console.log(`Bot is online! Logged in as ${c.user.tag}`);
    client.user.setPresence({
        status: 'online',
        activities: [{ name: `StudioLearny Lessons`, type: ActivityType.Listening }]
    });
});

client.on('messageCreate', (message) => {
    if (!message.guild || message.author.bot) return;

    const msgLower = message.content.toLowerCase().trim();
    const isOwner = message.author.id === OWNER_ID;
    
    // Cache check for all roles
    const hasBasic = message.member.roles.cache.has(BASIC_TEACHER_ROLE_ID);
    const hasGold = message.member.roles.cache.has(GOLDEN_TEACHER_ROLE_ID);
    const hasDiamond = message.member.roles.cache.has(DIAMOND_TEACHER_ROLE_ID);
    const isAnyTeacher = isOwner || hasBasic || hasGold || hasDiamond;

    // --- DISPLAY AUTHORIZED ROLES & RANKS ---
    if (msgLower === '!authorized' || msgLower === '!authorised') {
        const listEmbed = new EmbedBuilder()
            .setColor('#1a1a1a')
            .setTitle('🛡️ StudioLearny Staff Access & Hierarchy')
            .setDescription('Here is the official staff lineup and the specific rank permissions assigned to each role:')
            .addFields(
                { name: '👑 Bot Owner', value: `<@${OWNER_ID}> (Full Developer Access)`, inline: false },
                { name: '🥇 Diamond Tier', value: `<@&${1518179554563194910}>\n*Perks: Custom Titles, Content, and Hex Colors*`, inline: false },
                { name: '🥈 Golden Tier', value: `<@&${1518179528545931463}>\n*Perks: Custom Titles and Content*`, inline: false },
                { name: '🥉 Basic Tier', value: `<@&${1518179501056458792}>\n*Perks: Standard Template Lessons*`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'StudioLearny Management System' });

        return message.reply({ embeds: [listEmbed] });
    }

    // =======================================================
    // MAIN MASTER LESSON COMMAND (WITH TIER SELECTION BUTTONS)
    // =======================================================
    if (msgLower === '!lesson') {
        if (!isAnyTeacher) {
            return message.reply('❌ You are not an authorized teacher! You cannot use this command.');
        }

        const menuRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('menu_basic').setLabel('Basic Teacher').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('menu_gold').setLabel('Golden Teacher').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('menu_diamond').setLabel('Diamond Teacher').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('lesson_mistake').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        return message.reply({
            content: '👋 **StudioLearny Lesson Portal**\nWhich teaching tier setup would you like to open today?',
            components: [menuRow]
        });
    }

    // =======================================================
    // SHORTCUT 1: BASIC LESSON COMMAND
    // =======================================================
    if (msgLower === '!basic lesson') {
        if (!isAnyTeacher) {
            return message.reply('❌ You must be at least a Basic Teacher to use this command.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lesson_mistake').setLabel('Cancel').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('start_basic_lesson').setLabel('Write Basic Lesson').setStyle(ButtonStyle.Primary)
        );

        return message.reply({
            content: '🥉 **Basic Lesson Setup Shortcut**\nReady to post a standard text lesson?',
            components: [row]
        });
    }

    // =======================================================
    // SHORTCUT 2: GOLD LESSON COMMAND
    // =======================================================
    if (msgLower === '!gold lesson') {
        if (!isOwner && !hasGold && !hasDiamond) {
            return message.reply('❌ You must be at least a Golden Teacher to use this command.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lesson_mistake').setLabel('Cancel').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('start_gold_lesson').setLabel('Write Gold Lesson').setStyle(ButtonStyle.Success)
        );

        return message.reply({
            content: '🥈 **Gold Lesson Setup Shortcut**\nReady to post a lesson with custom titles?',
            components: [row]
        });
    }

    // =======================================================
    // SHORTCUT 3: DIAMOND LESSON COMMAND
    // =======================================================
    if (msgLower === '!diamond lesson') {
        if (!isOwner && !hasDiamond) {
            return message.reply('❌ You must be a Diamond Teacher to use this command.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lesson_mistake').setLabel('Cancel').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('start_diamond_lesson').setLabel('Write Diamond Lesson').setStyle(ButtonStyle.Secondary)
        );

        return message.reply({
            content: '🥇 **Diamond Lesson Setup Shortcut**\nFull access: Custom titles, descriptions, and hex colors enabled.',
            components: [row]
        });
    }
});

// Handling Button clicks and Form submissions
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const isOwner = interaction.user.id === OWNER_ID;
        const hasBasic = interaction.member.roles.cache.has(BASIC_TEACHER_ROLE_ID);
        const hasGold = interaction.member.roles.cache.has(GOLDEN_TEACHER_ROLE_ID);
        const hasDiamond = interaction.member.roles.cache.has(DIAMOND_TEACHER_ROLE_ID);

        // Security check: Only allow the person who sent the command to interact
        if (interaction.message.reference) {
            const originalMsg = await interaction.channel.messages.fetch(interaction.message.reference.messageId).catch(() => null);
            if (originalMsg && interaction.user.id !== originalMsg.author.id) {
                return interaction.reply({ content: '❌ Only the teacher who initiated this command can use these buttons.', ephemeral: true });
            }
        }

        if (interaction.customId === 'lesson_mistake') {
            return interaction.update({ content: '❌ Action cancelled.', components: [] });
        }

        // --- MASTER MENU DIRECTION + ROLE CHECKS ---
        if (interaction.customId === 'menu_basic') {
            if (!isOwner && !hasBasic && !hasGold && !hasDiamond) {
                return interaction.reply({ content: '❌ Access Denied: You do not have the Basic Teacher role!', ephemeral: true });
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lesson_mistake').setLabel('Cancel').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('start_basic_lesson').setLabel('Confirm & Write Basic Lesson').setStyle(ButtonStyle.Primary)
            );
            return interaction.update({ content: '🥉 **Basic Lesson Mode Activated.** Ready?', components: [row] });
        }

        if (interaction.customId === 'menu_gold') {
            if (!isOwner && !hasGold && !hasDiamond) {
                return interaction.reply({ content: '❌ Access Denied: You do not have the Golden Teacher role!', ephemeral: true });
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lesson_mistake').setLabel('Cancel').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('start_gold_lesson').setLabel('Confirm & Write Gold Lesson').setStyle(ButtonStyle.Success)
            );
            return interaction.update({ content: '🥈 **Gold Lesson Mode Activated.** Ready?', components: [row] });
        }

        if (interaction.customId === 'menu_diamond') {
            if (!isOwner && !hasDiamond) {
                return interaction.reply({ content: '❌ Access Denied: You do not have the Diamond Teacher role!', ephemeral: true });
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lesson_mistake').setLabel('Cancel').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('start_diamond_lesson').setLabel('Confirm & Write Diamond Lesson').setStyle(ButtonStyle.Secondary)
            );
            return interaction.update({ content: '🥇 **Diamond Lesson Mode Activated.** Ready?', components: [row] });
        }

        // --- TRIGGER BASIC MODAL (1 Field) ---
        if (interaction.customId === 'start_basic_lesson') {
            const modal = new ModalBuilder().setCustomId('modal_basic').setTitle('Create Basic Lesson');
            const input = new TextInputBuilder()
                .setCustomId('basic_content')
                .setLabel('Lesson Content:')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
            return interaction.message.delete().catch(() => null);
        }

        // --- TRIGGER GOLD MODAL (2 Fields) ---
        if (interaction.customId === 'start_gold_lesson') {
            const modal = new ModalBuilder().setCustomId('modal_gold').setTitle('Create Golden Lesson');
            
            const titleInput = new TextInputBuilder()
                .setCustomId('gold_title')
                .setLabel('Custom Embed Title:')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const contentInput = new TextInputBuilder()
                .setCustomId('gold_content')
                .setLabel('Lesson Content:')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(contentInput)
            );
            await interaction.showModal(modal);
            return interaction.message.delete().catch(() => null);
        }

        // --- TRIGGER DIAMOND MODAL (3 Fields) ---
        if (interaction.customId === 'start_diamond_lesson') {
            const modal = new ModalBuilder().setCustomId('modal_diamond').setTitle('Create Diamond Lesson');
            
            const titleInput = new TextInputBuilder()
                .setCustomId('diamond_title')
                .setLabel('Custom Embed Title:')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const contentInput = new TextInputBuilder()
                .setCustomId('diamond_content')
                .setLabel('Lesson Content:')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const colorInput = new TextInputBuilder()
                .setCustomId('diamond_color')
                .setLabel('Embed Hex Color (e.g., #ff0000):')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('#00ffff')
                .setRequired(false);
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(contentInput),
                new ActionRowBuilder().addComponents(colorInput)
            );
            await interaction.showModal(modal);
            return interaction.message.delete().catch(() => null);
        }
    }

    if (interaction.isModalSubmit()) {
        // --- SUBMIT BASIC LESSON ---
        if (interaction.customId === 'modal_basic') {
            const content = interaction.fields.getTextInputValue('basic_content');
            const embed = new EmbedBuilder()
                .setColor('#555555')
                .setTitle('📚 StudioLearny Standard Lesson')
                .setDescription(content)
                .setFooter({ text: `Instructor: ${interaction.user.username} (Basic Tier)` })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }

        // --- SUBMIT GOLD LESSON ---
        if (interaction.customId === 'modal_gold') {
            const title = interaction.fields.getTextInputValue('gold_title');
            const content = interaction.fields.getTextInputValue('gold_content');
            const embed = new EmbedBuilder()
                .setColor('#d4af37')
                .setTitle(`🌟 ${title}`)
                .setDescription(content)
                .setFooter({ text: `Instructor: ${interaction.user.username} (Gold Tier)` })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }

        // --- SUBMIT DIAMOND LESSON ---
        if (interaction.customId === 'modal_diamond') {
            const title = interaction.fields.getTextInputValue('diamond_title');
            const content = interaction.fields.getTextInputValue('diamond_content');
            let hexColor = interaction.fields.getTextInputValue('diamond_color') || '#00ffff';

            if (hexColor && !hexColor.startsWith('#')) {
                hexColor = `#${hexColor}`;
            }

            const isValidHex = /^#[0-9A-F]{6}$/i.test(hexColor);
            const finalColor = isValidHex ? hexColor : '#00ffff';

            const embed = new EmbedBuilder()
                .setColor(finalColor)
                .setTitle(`💎 ${title}`)
                .setDescription(content)
                .setFooter({ text: `Instructor: ${interaction.user.username} (Diamond Tier)` })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }
    }
});

// Web Server for Railway hosting
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('StudioLearny System is fully operational!\n');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
