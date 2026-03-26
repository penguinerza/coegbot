const { SlashCommandBuilder } = require('discord.js');
const { executeAgenda } = require('./gas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mabar')
    .setDescription('Jadwalkan ping mabar. Default jam 20:00 WIB.')
    .addStringOption((opt) =>
      opt.setName('waktu').setDescription('Waktu mabar, format HH:MM. Default: 20:00').setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('timezone').setDescription('Timezone. Default: Asia/Jakarta').setRequired(false)
    ),

  async execute(interaction) {
    await executeAgenda(interaction);
  },
};
