const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('woi')
    .setDescription('Spam ping seseorang 10x.')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User yang mau di-ping').setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');

    await interaction.reply(`oke, siap bang 🫡`);

    for (let i = 1; i <= 10; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      await interaction.channel.send(`${target} WOI`);
    }
  },
};
