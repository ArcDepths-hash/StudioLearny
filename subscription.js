/**
 * ============================================================================
 * @file subscription.js
 * @description StudioLearny Ticket-Based Subscription Engine
 * [Features: Ticket Generation, Admin Approval, 30-Day Expiry, Central Logging]
 * @version 3.0.0
 * @framework discord.js (v14+)
 * ============================================================================
 */

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ActivityType,
    PermissionFlagsBits
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Import the shared economy ledger system file
const economyEngine = require('./economy.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// System Constants
const TARGET_STORE_CHANNEL_ID = '1518224135291932882';
const LOG_CHANNEL_ID = '1517811329828782121'; // Central logging hub
const OWNER_ID = '1511377539073966353'; 

const dataPath = path.join(__dirname, 'subscription_data.json');

const SUBSCRIPTION_PLANS = {
    basic: { name: "Basic Faculty Pass", cost: 0, durationDays: 30, roleId: "1518179501056458792" },
    gold: { name: "Golden Masterclass Pass", cost: 1500, durationDays: 30, roleId: "1518179528545931463" },
    diamond: { name: "Diamond Elite Pass", cost: 3500, durationDays: 30, roleId: "1518179554563194910" }
};

let subscriptionRegistry = {};
if (fs.existsSync(dataPath)) {
    try { subscriptionRegistry = JSON.parse(fs.readFileSync(dataPath, 'utf-8')); } catch (e) {}
}

function saveRegistryState() {
    fs.writeFileSync(dataPath, JSON.stringify(subscriptionRegistry, null, 4));
}

// ============================================================================
// BOT LIFECYCLE HOOKS
// ============================================================================
client.once('ready', (instance) => {
    console.log(`📡 SUBSCRIPTION TICKET ENGINE OPERATIONAL: ${instance.user.tag}`);
    client.user.setPresence({ status: 'online', activities: [{ name: 'Subscription Tickets', type: ActivityType.Watching }] });
    setInterval(() => { runSubscriptionExpiryCheck(); }, 5 * 60 * 1000);
});

// ============================================================================
// TEXT TRIGGERS: !setup ticketsub (OWNER LOCKED)
// ============================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content.toLowerCase().trim() === '!setup ticketsub') {
        if (message.author.id !== OWNER_ID) return;
        await message.delete().catch(() => null);

        const targetChannel = message.guild.channels.cache.get(TARGET_STORE_CHANNEL_ID);
        if (!targetChannel) return message.channel.send("❌ Cannot find target store channel.");

        const storeEmbed = new EmbedBuilder()
            .setTitle('🏪 StudioLearny Subscription Portal')
            .setDescription('Select a pass below to open a ticket. You will go through a brief onboarding process before your 30-day pass is activated.')
            .setColor('#3498db');

        const row = new ActionRowBuilder();
        for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_ticket_${key}`)
                    .setLabel(`Open ${plan.name.split(' ')[0]} Ticket`)
                    .setStyle(plan.cost === 0 ? ButtonStyle.Primary : ButtonStyle.Success)
            );
        }

        await targetChannel.send({ embeds: [storeEmbed], components: [row] });
    }
});

// ============================================================================
// INTERACTION ROUTER: TICKET FLOW
// ============================================================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const userId = interaction.user.id;
    const guild = interaction.guild;

    // --- PHASE 1: OPENING THE TICKET ---
    if (interaction.customId.startsWith('open_ticket_')) {
        const planKey = interaction.customId.split('_')[2];
        const plan = SUBSCRIPTION_PLANS[planKey];
        if (!plan) return;

        await interaction.deferReply({ ephemeral: true });

        const ticketChannel = await guild.channels.create({
            name: `sub-${interaction.user.username}`,
            type: 0,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle(`🎟️ ${plan.name} Application Process`)
            .setDescription(`Welcome <@${userId}>! Please wait for <@${OWNER_ID}> to begin your onboarding process.\n\n*Admin: When the process is complete, click the button below to generate the final activation button for the user.*`);

        const adminRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`admin_approve_${planKey}_${userId}`)
                .setLabel('Approve & Generate Activation Button')
                .setStyle(ButtonStyle.Secondary)
        );

        await ticketChannel.send({ content: `<@${userId}> | <@${OWNER_ID}>`, embeds: [welcomeEmbed], components: [adminRow] });
        return interaction.editReply({ content: `✅ Ticket opened: <#${ticketChannel.id}>` });
    }

    // --- PHASE 2: ADMIN APPROVES TICKET ---
    if (interaction.customId.startsWith('admin_approve_')) {
        if (userId !== OWNER_ID) return interaction.reply({ content: '❌ Only admins can approve this step.', ephemeral: true });

        const [, , planKey, targetUserId] = interaction.customId.split('_');
        const plan = SUBSCRIPTION_PLANS[planKey];

        const userRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`user_finalize_${planKey}_${targetUserId}`)
                .setLabel(`Activate 1-Month Pass (${plan.cost} Coins)`)
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            content: `✅ **Process Complete.** <@${targetUserId}>, click below to finalize your transaction and activate your roles!`,
            components: [userRow]
        });
        
        // Remove the admin button so it isn't clicked twice
        await interaction.message.edit({ components: [] }).catch(() => null);
    }

    // --- PHASE 3: USER FINALIZES & PAYS ---
    if (interaction.customId.startsWith('user_finalize_')) {
        const [, , planKey, targetUserId] = interaction.customId.split('_');
        if (userId !== targetUserId) return interaction.reply({ content: '❌ This button is not for you.', ephemeral: true });

        const plan = SUBSCRIPTION_PLANS[planKey];
        const userWalletBalance = economyEngine.getBalance(userId);

        if (userWalletBalance < plan.cost) {
            return interaction.reply({ content: `❌ Insufficient funds. You need ${plan.cost} coins.`, ephemeral: true });
        }

        // Deduct Coins
        economyEngine.updateBalance(userId, -plan.cost);

        // Assign Roles
        const durationMs = plan.durationDays * 24 * 60 * 60 * 1000;
        let finalExpiration = Date.now() + durationMs;
        
        subscriptionRegistry[userId] = { tier: planKey, expiresAt: finalExpiration };
        saveRegistryState();

        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const role = guild.roles.cache.get(plan.roleId);
            if (role) await member.roles.add(role).catch(() => null);
        }

        // Log to Central Channel
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🧾 Subscription Activated')
                .addFields(
                    { name: 'User', value: `<@${userId}>`, inline: true },
                    { name: 'Plan', value: plan.name, inline: true },
                    { name: 'Cost', value: `${plan.cost} Coins`, inline: true },
                    { name: 'Expires', value: `<t:${Math.floor(finalExpiration / 1000)}:R>`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.reply({ content: '✅ **Subscription Activated!** This ticket will close in 5 seconds.' });
        setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
    }
});

// ============================================================================
// EXPIRATION SWEEPER ROUTINE
// ============================================================================
async function runSubscriptionExpiryCheck() {
    const now = Date.now();
    for (const [userId, record] of Object.entries(subscriptionRegistry)) {
        if (now >= record.expiresAt) {
            delete subscriptionRegistry[userId];
            saveRegistryState();

            for (const guild of client.guilds.cache.values()) {
                const member = await guild.members.fetch(userId).catch(() => null);
                if (member) {
                    const plan = SUBSCRIPTION_PLANS[record.tier];
                    if (plan) {
                        await member.roles.remove(plan.roleId).catch(() => null);
                        await member.send(`⚠️ Your **${plan.name}** has expired. Please open a new ticket to renew.`).catch(() => null);
                    }
                }
            }
        }
    }
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Subscription Ticket Bot Operational\n');
});
server.listen(8083);

client.login(process.env.DISCORD_TOKEN);
