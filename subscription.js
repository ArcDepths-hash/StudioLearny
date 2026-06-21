/**
 * ============================================================================
 * @file subscription.js
 * @description StudioLearny Ticket-Based Subscription Engine
 * [Features: !setup, !give coins, !balance/!bal, Access Role Injection, Log Revocation]
 * @version 3.3.0
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
const LOG_CHANNEL_ID = '1517811329828782121'; 
const OWNER_ID = '1511377539073966353'; 

const dataPath = path.join(__dirname, 'subscription_data.json');

// Subscription Tier Configuration mappings
const SUBSCRIPTION_PLANS = {
    basic: { name: "Basic Faculty Pass", cost: 0, durationDays: 30, roleId: "1518225938112843937" },
    gold: { name: "Golden Masterclass Pass", cost: 1500, durationDays: 30, roleId: "1518225966688764045" },
    diamond: { name: "Diamond Elite Pass", cost: 3500, durationDays: 30, roleId: "1518225992425148446" }
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
    console.log(`============================================================================`);
    console.log(`📡 SUBSCRIPTION TICKET BOT INSTANCE ACTIVE: ${instance.user.tag}`);
    console.log(`============================================================================`);
    client.user.setPresence({ status: 'online', activities: [{ name: 'Subscription Tickets', type: ActivityType.Watching }] });
    setInterval(() => { runSubscriptionExpiryCheck(); }, 5 * 60 * 1000);
});

// ============================================================================
// TEXT TRIGGERS: !setup, !give coins, & !balance / !bal
// ============================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const normalizedContent = message.content.toLowerCase().trim();

    // --- 1. THE SHOP DEPLOYMENT COMMAND (OWNER LOCKED) ---
    if (normalizedContent === '!setup') {
        if (message.author.id !== OWNER_ID) return;
        await message.delete().catch(() => null);

        const targetChannel = message.guild.channels.cache.get(TARGET_STORE_CHANNEL_ID);
        if (!targetChannel) return message.channel.send("❌ Error: Target store channel not found in server cache.");

        const storeEmbed = new EmbedBuilder()
            .setTitle('🏪 StudioLearny Access Pass Marketplace')
            .setDescription('Select a tier below to open an onboarding verification ticket. Your 30-day structural access credentials will activate upon completion.')
            .setColor('#2c3e50')
            .setTimestamp();

        const row = new ActionRowBuilder();
        for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
            const labelText = plan.cost === 0 ? `Free ${plan.name.split(' ')[0]}` : plan.name.split(' ')[0];
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`open_ticket_${key}`)
                    .setLabel(`Open ${labelText} Ticket`)
                    .setStyle(plan.cost === 0 ? ButtonStyle.Primary : ButtonStyle.Success)
            );
        }

        await targetChannel.send({ embeds: [storeEmbed], components: [row] });
    }

    // --- 2. THE MINT/GIVE COINS UTILITY (OWNER LOCKED) ---
    if (normalizedContent.startsWith('!give coins')) {
        if (message.author.id !== OWNER_ID) {
            return message.reply("❌ You do not have permission to run coin minting transactions.");
        }

        // Split arguments safely handling varying spacing configurations
        const args = message.content.trim().split(/\s+/);
        // Expecting: args[0]='!give', args[1]='coins', args[2]='@user', args[3]='amount'

        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[3]);

        if (!targetUser || isNaN(amount)) {
            return message.reply("⚠️ **Incorrect Syntax.** Use: `!give coins @username 1500`");
        }

        try {
            // Commit transaction to disk ledger using the economy engine file layer
            const finalLedgerBalance = economyEngine.updateBalance(targetUser.id, amount);
            return message.channel.send(`🪙 **Transaction Logged:** Successfully deposited **${amount}** coins to ${targetUser}. Current Total: **${finalLedgerBalance}** coins.`);
        } catch (error) {
            console.error("Economy file update failed:", error);
            return message.reply("❌ Structural error encountered updating your ledger data file.");
        }
    }

    // --- 3. THE PUBLIC BALANCE CHECK COMMAND (EVERYONE CAN USE) ---
    if (normalizedContent === '!balance' || normalizedContent === '!bal') {
        try {
            const userWalletBalance = economyEngine.getBalance(message.author.id);
            return message.reply(`🪙 Your current account balance is **${userWalletBalance}** coins.`);
        } catch (error) {
            console.error("Economy read failure on balance check:", error);
            return message.reply("❌ Unable to retrieve your balance right now.");
        }
    }
});

// ============================================================================
// INTERACTION ROUTER: TICKET & OVERRIDE FLOW
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
            name: `${planKey}-access-${interaction.user.username}`,
            type: 0,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#e67e22')
            .setTitle(`🎟️ ${plan.name} Intake Process`)
            .setDescription(`Welcome <@${userId}>! Please await verification evaluation checks from <@${OWNER_ID}>.\n\n*Admin: When ready, press approval targets below to render the final authorization buttons.*`);

        const adminRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`admin_approve_${planKey}_${userId}`)
                .setLabel('Approve Process & Drop Activation Link')
                .setStyle(ButtonStyle.Primary)
        );

        await ticketChannel.send({ content: `<@${userId}> | <@${OWNER_ID}>`, embeds: [welcomeEmbed], components: [adminRow] });
        return interaction.editReply({ content: `✅ Onboarding ticket created: <#${ticketChannel.id}>` });
    }

    // --- PHASE 2: ADMIN APPROVES TICKET ---
    if (interaction.customId.startsWith('admin_approve_')) {
        if (userId !== OWNER_ID) return interaction.reply({ content: '❌ Security Exception: Management credentials check failed.', ephemeral: true });

        const [, , planKey, targetUserId] = interaction.customId.split('_');
        const plan = SUBSCRIPTION_PLANS[planKey];

        const userRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`user_finalize_${planKey}_${targetUserId}`)
                .setLabel(`Activate 1-Month Plan (${plan.cost} Coins)`)
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            content: `🏁 **Onboarding Approved.** <@${targetUserId}>, click below to confirm billing and deploy your access permissions!`,
            components: [userRow]
        });
        
        await interaction.message.edit({ components: [] }).catch(() => null);
    }

    // --- PHASE 3: USER FINALIZES & PAYS ---
    if (interaction.customId.startsWith('user_finalize_')) {
        const [, , planKey, targetUserId] = interaction.customId.split('_');
        if (userId !== targetUserId) return interaction.reply({ content: '❌ Access Denied: Interaction sequence owned by applicant.', ephemeral: true });

        const plan = SUBSCRIPTION_PLANS[planKey];
        const userWalletBalance = economyEngine.getBalance(userId);

        if (userWalletBalance < plan.cost) {
            return interaction.reply({ content: `❌ **Transaction Declined:** Insufficient balance. Cost requires \`${plan.cost}\` coins.`, ephemeral: true });
        }

        economyEngine.updateBalance(userId, -plan.cost);

        const durationMs = plan.durationDays * 24 * 60 * 60 * 1000;
        let finalExpiration = Date.now() + durationMs;
        
        subscriptionRegistry[userId] = { tier: planKey, expiresAt: finalExpiration };
        saveRegistryState();

        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const role = guild.roles.cache.get(plan.roleId);
            if (role) await member.roles.add(role).catch(() => null);
        }

        // Send Receipt + Immediate Revoke Button into Log Channel
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🧾 Access Subscription Registered')
                .addFields(
                    { name: 'User Account', value: `<@${userId}> (\`${userId}\`)`, inline: true },
                    { name: 'Assigned Plan', value: `\`${plan.name}\``, inline: true },
                    { name: 'Transaction Cost', value: `\`${plan.cost} Coins\``, inline: true },
                    { name: 'Expiration Date', value: `<t:${Math.floor(finalExpiration / 1000)}:F> (<t:${Math.floor(finalExpiration / 1000)}:R>)` }
                )
                .setTimestamp();

            const logOverrideRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`admin_force_revoke_${userId}_${planKey}`)
                    .setLabel('End Subscription Instantly 🛑')
                    .setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ embeds: [logEmbed], components: [logOverrideRow] });
        }

        await interaction.reply({ content: '🎉 **Pass Activated Successfully!** Initializing clearance nodes. Ticket closing in 5 seconds...' });
        setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
    }

    // --- PHASE 4: EMERGENCY LOG REVOCATION (OWNER LOCKED) ---
    if (interaction.customId.startsWith('admin_force_revoke_')) {
        if (userId !== OWNER_ID) return interaction.reply({ content: '❌ Management authorization validation failure.', ephemeral: true });

        const [, , , targetUserId, planKey] = interaction.customId.split('_');
        const plan = SUBSCRIPTION_PLANS[planKey];

        // Wipe data state references
        if (subscriptionRegistry[targetUserId]) {
            delete subscriptionRegistry[targetUserId];
            saveRegistryState();
        }

        // Strip access role components from target instantly
        const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
        if (targetMember && plan) {
            await targetMember.roles.remove(plan.roleId).catch(() => null);
            await targetMember.send(`🛑 Your premium **${plan.name}** access pass has been terminated early by an administrator.`).catch(() => null);
        }

        const updatedLogEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#c0392b')
            .setTitle('🛑 Access Subscription FORCE TERMINATED')
            .addFields({ name: 'Termination Event Log', value: `Revoked by <@${OWNER_ID}> on <t:${Math.floor(Date.now() / 1000)}:F>` });

        await interaction.update({ embeds: [updatedLogEmbed], components: [] });
    }
});

// ============================================================================
// AUTOMATED RUNTIME EXPIRATION SWEEPER
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
                        await member.send(`⚠️ Your Premium **${plan.name}** access status has expired. Head back to the marketplace to open a renewal ticket.`).catch(() => null);
                    }
                }
            }
        }
    }
}

// Lightweight HTTP port allocation map for modern providers
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Subscription System Online\n');
});
server.listen(8083);

client.login(process.env.DISCORD_TOKEN);
