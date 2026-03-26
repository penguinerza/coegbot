const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRandomSfwPost } = require('../services/danbooru');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('danbooru')
    .setDescription('Ambil gambar acak dari Danbooru (SFW).'),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const post = await getRandomSfwPost();
      const embed = new EmbedBuilder()
        .setTitle('Gambar Acak Danbooru')
        .setURL(post.pageUrl)
        .setImage(post.url)
        .setFooter({ text: `Tags: ${post.tags}` })
        .setColor(0x0099ff);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(`[ERROR] /danbooru: ${err.message}`);
      await interaction.editReply('Gagal ngambil gambar, coba lagi nanti.');
    }
  },
};
