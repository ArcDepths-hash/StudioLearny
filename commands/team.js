const { SlashCommandBuilder } = require('discord.js');

// We export an array of commands instead of just one
module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName('team')
            .setDescription('Manage or view teams!'),
        async execute(interaction) {
            // Put your code for what /team does here
            await interaction.reply('Team command executed!');
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('hello')
            .setDescription('Says hello back!'),
        async execute(interaction) {
            // Put your code for what /hello does here
            await interaction.reply(`Hello, ${interaction.user.username}!`);
        }
    }
    // You can keep adding more commands down here using the same format!
];
