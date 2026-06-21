/**
 * ============================================================================
 * @file apply.js
 * @description Advanced StudioLearny Role Application & Faculty Vetting Engine
 * [Split Commands: !apply (New Applicants) & !rankup (Tier Upgrades)]
 * @version 1.1.0
 * @framework discord.js (v14+)
 * ============================================================================
 */
const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ChannelType,
    ActivityType
} = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ============================================================================
// 1. SYSTEM CONFIGURATION & CONSTANTS
// ============================================================================
const OWNER_ID = '1511377539073966353'; // Your Verified ID

const ROLES = {
    Basic: '1518179501056458792',
    Golden: '1518179528545931463',
    Diamond: '1518179554563194910'
};

// Volatile memory map to manage active trial vetting sessions
const activeVettingSessions = new Map();

client.once('ready', (instance) => {
    console.log(`============================================================================`);
    console.log(`ℹ️ APPLY SYSTEM OPERATIONAL: ${instance.user.tag} IS ACTIVE`);
    console.log(`👑 Vetting Magistrate ID: ${OWNER_ID}`);
    console.log(`============================================================================`);
    
    client.user.setPresence({
        status: 'online',
        activities: [{ name: 'Faculty Vetting Trials', type: ActivityType.Watching }]
    });
});

// ============================================================================
// 2. CHAT COMMAND ROUTERS: !apply & !rankup
// ============================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const msgLower = message.content.toLowerCase().trim();

    // ------------------------------------------------------------------------
    // COMMAND A: !apply (FOR NEWCOMERS LACKING ANY INSTRUCTOR ROLES)
    // ------------------------------------------------------------------------
    if (msgLower === '!apply') {
        await message.delete().catch(() => null);

        const applyDashboardEmbed = new EmbedBuilder()
            .setTitle('🏛️ StudioLearny Faculty Entrance Bureau')
            .setDescription('Welcome to the qualification portal. Click the button below to initialize your application file for entry-level **Basic Teacher** infrastructure.')
            .setColor('#3498db')
            .addFields({ 
                name: '📘 Basic Blueprint Requirements', 
                value: '• Must not hold any active instructor rank profiles.\n• Requires passing a 12-trial evaluation block overseen by the Root Administrator.' 
            })
            .setFooter({ text: 'StudioLearny Certification Framework • Entrance Exam' });

        const applyRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('app_init_basic')
                    .setLabel('Apply for Basic Teacher')
                    .setStyle(ButtonStyle.Primary)
            );

        return message.channel.send({
            embeds: [applyDashboardEmbed],
            components: [applyRow]
        });
    }

    // ------------------------------------------------------------------------
    // COMMAND B: !rankup (FOR EXISTING TEACHERS TRYING TO LEVEL UP)
    // ------------------------------------------------------------------------
    if (msgLower === '!rankup') {
        await message.delete().catch(() => null);

        const rankupDashboardEmbed = new EmbedBuilder()
            .setTitle('⭐ StudioLearny Faculty Rankup Escalator')
            .setDescription('Ready to elevate your structural clearance? Use the buttons below to initiate your next deployment layer verification cycle.')
            .setColor('#f1c40f')
            .addFields(
                { name: '🟡 Golden Rankup', value: 'Requires: Active **Basic Teacher** role.\n*Unlocks design frame overrides.*', inline: true },
                { name: '🔴 Diamond Masterclass', value: 'Requires: Active **Golden Teacher** role.\n*Unlocks premium media modules & global alerts.*', inline: true }
            )
            .setFooter({ text: 'StudioLearny Certification Framework • Promotion System' });

        const rankupRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('app_init_golden')
                    .setLabel('Rankup: Golden Teacher')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('app_init_diamond')
                    .setLabel('Rankup: Diamond Master')
                    .setStyle(ButtonStyle.Danger)
            );

        return message.channel.send({
            embeds: [rankupDashboardEmbed],
            components: [rankupRow]
        });
    }
});

// ============================================================================
// 3. INTERACTION ROUTER (ROLE GATEKEEPING & HANDSHAKE FLOW)
// ============================================================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;
    const member = interaction.member;
    if (!member || !interaction.guild) return;

    const hasBasic = member.roles.cache.has(ROLES.Basic);
    const hasGolden = member.roles.cache.has(ROLES.Golden);
    const hasDiamond = member.roles.cache.has(ROLES.Diamond);

    // ------------------------------------------------------------------------
    // HANDSHAKE INITIALIZATION CHECKS
    // ------------------------------------------------------------------------
    if (interaction.customId.startsWith('app_init_')) {
        let requestedTier = '';
        let passesGatekeeping = false;
        let errorMessage = '';

        if (interaction.customId === 'app_init_basic') {
            requestedTier = 'Basic';
            if (!hasBasic && !hasGolden && !hasDiamond) {
                passesGatekeeping = true;
            } else {
                errorMessage = '❌ **Gatekeeper Exception:** You are already a member of the faculty system. If you want to advance your rank, use the `!rankup` command panel instead.';
            }
        }

        if (interaction.customId === 'app_init_golden') {
            requestedTier = 'Golden';
            if (hasBasic && !hasGolden && !hasDiamond) {
                passesGatekeeping = true;
            } else {
                errorMessage = '❌ **Gatekeeper Exception:** You must actively hold the **Basic Teacher** credential before you can request a Golden Rankup validation profile.';
            }
        }

        if (interaction.customId === 'app_init_diamond') {
            requestedTier = 'Diamond';
            if (hasGolden && !hasDiamond) {
                passesGatekeeping = true;
            } else {
                errorMessage = '❌ **Gatekeeper Exception:** You must actively hold the **Golden Teacher** credential before you can request a Diamond Rankup validation profile.';
            }
        }

        if (!passesGatekeeping) {
            return interaction.reply({ content: errorMessage, ephemeral: true });
        }

        // Return the Premium Hidden Button (Ephemeral Handshake Matrix)
        const hiddenHandshakeEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🔏 Vetting Stream Target Document Locked')
            .setDescription(`Your request file for **${requestedTier} Faculty Status** has been pre-compiled successfully.\n\nClick the premium launch command below to securely request an evaluation room setup from the Administrator.`);

        const hiddenHandshakeRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`launch_setup_${userId}_${requestedTier}`)
                    .setLabel('🚀 Launch !setup Hook')
                    .setStyle(ButtonStyle.Secondary)
            );

        return interaction.reply({
            embeds: [hiddenHandshakeEmbed],
            components: [hiddenHandshakeRow],
            ephemeral: true
        });
    }

    // ------------------------------------------------------------------------
    // HANDLING INTERACTIVE SETUP & VETTING MATRIX (LOCKED TO OWNER)
    // ------------------------------------------------------------------------
    if (interaction.customId.startsWith('launch_setup_')) {
        const [, , targetApplicantId, targetTier] = interaction.customId.split('_');

        if (userId !== targetApplicantId) {
            return interaction.reply({ content: '❌ Security parameters mismatch.', ephemeral: true });
        }

        if (activeVettingSessions.has(targetApplicantId)) {
            return interaction.reply({ content: '⚠️ **Active Session Warning:** You already have an evaluation console pending review. Please wait for completion.', ephemeral: true });
        }

        const evaluationEmbed = new EmbedBuilder()
            .setColor('#e67e22')
            .setTitle(`⚖️ Vetting Ledger: Trial 1 / 12 [${targetTier.toUpperCase()} MODE]`)
            .setDescription(`**Applicant:** <@${targetApplicantId}>\n**Target Rank:** \`${targetTier} Faculty\`\n\n**Magistrate Action Required:**\nReview the initial core requirements. Select status outcome action below to step file positions.`)
            .setFooter({ text: `Vetting Matrix Secure Stream • Reserved for Owner Node Authorization` })
            .setTimestamp();

        const vettingControlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`vet_pass_${targetApplicantId}`)
                    .setLabel('Pass Trial ✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`vet_fail_${targetApplicantId}`)
                    .setLabel('Fail/Vaporize Session ❌')
                    .setStyle(ButtonStyle.Danger)
            );

        const evalMessageInstance = await interaction.channel.send({
            content: `📢 **New Evaluation Request Loaded** for <@${targetApplicantId}>. Waiting for root supervisor confirmation...`,
            embeds: [evaluationEmbed],
            components: [vettingControlRow]
        });

        activeVettingSessions.set(targetApplicantId, {
            currentTrial: 1,
            targetTier: targetTier,
            evaluationMessageId: evalMessageInstance.id,
            channelId: interaction.channelId
        });

        return interaction.reply({
            content: '✅ **Handshake Resolved.** Your deployment ledger file has been passed directly onto the Administrator platform panel.',
            ephemeral: true
        });
    }

    if (interaction.customId.startsWith('vet_pass_') || interaction.customId.startsWith('vet_fail_')) {
        if (userId !== OWNER_ID) {
            return interaction.reply({
                content: '❌ **Security Boundary Breach Alert:** Your signature token does not match the Master Root Admin configuration file. This interaction trace has been locked.',
                ephemeral: true
            });
        }

        const isPassAction = interaction.customId.startsWith('vet_pass_');
        const targetApplicantId = interaction.customId.split('_')[2];
        const sessionRecord = activeVettingSessions.get(targetApplicantId);

        if (!sessionRecord) {
            return interaction.reply({ content: '❌ **State Exception:** This evaluation file session mapping registry data was lost or expired from heap memory.', ephemeral: true });
        }

        const targetApplicantMember = await interaction.guild.members.fetch(targetApplicantId).catch(() => null);
        if (!targetApplicantMember) {
            activeVettingSessions.delete(targetApplicantId);
            return interaction.reply({ content: '❌ **State Exception:** Applicant profile left the context server location during vetting tracking run loops.', ephemeral: true });
        }

        if (!isPassAction) {
            activeVettingSessions.delete(targetApplicantId);

            const rejectionReceiptEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('❌ Evaluation File Vaporized')
                .setDescription(`⚠️ **Vetting Status Declined:** <@${targetApplicantId}> failed to satisfy evaluation trial conditions at **Trial ${sessionRecord.currentTrial}/12**.\n\n*Closing console and clearing temporary terminal elements...*`);

            await interaction.update({ content: ' ', embeds: [rejectionReceiptEmbed], components: [] }).catch(() => null);

            setTimeout(() => {
                interaction.message.delete().catch(() => null);
            }, 4000);
            return;
        }

        if (sessionRecord.currentTrial < 12) {
            sessionRecord.currentTrial += 1; 

            const updatedEvaluationEmbed = new EmbedBuilder()
                .setColor('#e67e22')
                .setTitle(`⚖️ Vetting Ledger: Trial ${sessionRecord.currentTrial} / 12 [${sessionRecord.targetTier.toUpperCase()} MODE]`)
                .setDescription(`**Applicant:** <@${targetApplicantId}>\n**Target Rank:** \`${sessionRecord.targetTier} Faculty\`\n\n**Magistrate Action Required:**\nAdvance to evaluation check parameters for trial tracking index context tier block **${sessionRecord.currentTrial}**.\nSelect status outcome action below to step file positions.`)
                .setFooter({ text: `Vetting Matrix Secure Stream • Reserved for Owner Node Authorization` })
                .setTimestamp();

            return await interaction.update({
                embeds: [updatedEvaluationEmbed]
            }).catch(() => null);

        } else {
            activeVettingSessions.delete(targetApplicantId);

            if (sessionRecord.targetTier === 'Golden') await targetApplicantMember.roles.remove(ROLES.Basic).catch(() => null);
            if (sessionRecord.targetTier === 'Diamond') {
                await targetApplicantMember.roles.remove(ROLES.Basic).catch(() => null);
                await targetApplicantMember.roles.remove(ROLES.Golden).catch(() => null);
            }

            const targetingRoleClearanceTokenId = ROLES[sessionRecord.targetTier];
            await targetApplicantMember.roles.add(targetingRoleClearanceTokenId).catch(() => null);

            const absoluteSuccessReceiptEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('👑 Faculty Vetting Complete • Commission Granted')
                .setDescription(`🏆 **Promotion Matrix Confirmed.** <@${targetApplicantId}> successfully cleared all 12 institutional vetting trials!\n\n**New Classification Status:** Verified **${sessionRecord.targetTier} Teacher** Profile Infrastructure Loaded.\n\n*Terminating evaluation array console footprints...*`);

            await interaction.update({ content: ' ', embeds: [absoluteSuccessReceiptEmbed], components: [] }).catch(() => null);

            await interaction.channel.send({
                content: `🎉 **Faculty Announcement:** Congratulations to <@${targetApplicantId}> on passing the 12 rigorous trials and advancing to **${sessionRecord.targetTier} Faculty Status**! 🎓`
            });

            setTimeout(() => {
                interaction.message.delete().catch(() => null);
            }, 4000);
        }
    }
});

// ============================================================================
// 4. INFRASTRUCTURE KEEP-ALIVE SERVER PORT HOOK ROUTINES
// ============================================================================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Apply Vetting Triage Web Server Operational\n');
});

server.listen(8081, () => {
    console.log('📡 Apply Vetting Web Server listening securely on isolated port 8081');
});

client.login(process.env.DISCORD_TOKEN);
