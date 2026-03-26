const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createVoting, setVotingMessageId } = require('../services/voting');

function buildBar(count, total) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  const filled = Math.round(pct / 10);
  return `${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)} ${pct}%`;
}

function buildVotingEmbed(question, options, votes, closed = false) {
  const counts = options.map((_, i) => Object.values(votes).filter((v) => v === i).length);
  const total = Object.keys(votes).length;

  return new EmbedBuilder()
    .setTitle(closed ? `🔒 ${question}` : `🗳️ ${question}`)
    .setColor(closed ? 0x808080 : 0x0099ff)
    .addFields(options.map((opt, i) => ({
      name: `${opt} (${counts[i]})`,
      value: buildBar(counts[i], total),
    })))
    .setFooter({ text: closed ? `Voting ditutup · ${total} vote` : `${total} vote` });
}

function buildVotingButtons(id, options, disabled = false) {
  const buttons = options.map((opt, i) =>
    new ButtonBuilder()
      .setCustomId(`vote_${id}_${i}`)
      .setLabel(opt)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  );
  return new ActionRowBuilder().addComponents(buttons);
}

function buildCloseButton(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`closevote_${id}`)
      .setLabel('Tutup Voting')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voting')
    .setDescription('Buat voting.')
    .addStringOption((opt) => opt.setName('pertanyaan').setDescription('Pertanyaan voting').setRequired(true))
    .addStringOption((opt) => opt.setName('opsi1').setDescription('Opsi pertama').setRequired(true))
    .addStringOption((opt) => opt.setName('opsi2').setDescription('Opsi kedua').setRequired(true))
    .addStringOption((opt) => opt.setName('opsi3').setDescription('Opsi ketiga').setRequired(false))
    .addStringOption((opt) => opt.setName('opsi4').setDescription('Opsi keempat').setRequired(false))
    .addStringOption((opt) => opt.setName('opsi5').setDescription('Opsi kelima').setRequired(false)),

  async execute(interaction) {
    const question = interaction.options.getString('pertanyaan');
    const options = ['opsi1', 'opsi2', 'opsi3', 'opsi4', 'opsi5']
      .map((k) => interaction.options.getString(k))
      .filter(Boolean);

    const id = await createVoting({
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      question,
      options,
      createdById: interaction.user.id,
    });

    const embed = buildVotingEmbed(question, options, {});
    const msg = await interaction.reply({ embeds: [embed], components: [buildVotingButtons(id, options)], fetchReply: true });
    await setVotingMessageId(id, msg.id);
    await interaction.followUp({ components: [buildCloseButton(id)], ephemeral: true });
  },

  buildVotingEmbed,
  buildVotingButtons,
  buildCloseButton,
};
