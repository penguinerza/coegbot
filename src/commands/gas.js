const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addAgenda, setAgendaMessageId } = require('../services/scheduler');

function formatTime(timeStr) {
  return timeStr === '20:00' ? 'jam lapan' : timeStr;
}

function buildEmbed(timeStr, tz, createdBy, confirmed, declined, cancelled = false) {
  const confirmedList = confirmed.length ? confirmed.map(id => `<@${id}>`).join(', ') : '-';
  const declinedList = declined.length ? declined.map(id => `<@${id}>`).join(', ') : '-';
  const timeLabel = tz === 'Asia/Jakarta' ? formatTime(timeStr) : `${timeStr} (${tz})`;

  const embed = new EmbedBuilder()
    .setTitle(cancelled ? '❌ Agenda Mabar Dibatalkan' : '📅 Agenda Mabar')
    .setColor(cancelled ? 0x808080 : confirmed.length >= 5 ? 0x00c853 : 0x0099ff)
    .addFields(
      { name: 'Waktu', value: timeLabel },
      { name: `✅ Gas (${confirmed.length})`, value: confirmedList },
      { name: `❌ Sekip (${declined.length})`, value: declinedList },
    );

  if (!cancelled) {
    embed.setFooter({ text: confirmed.length >= 5 ? '✅ Cukup 5 orang, yang hadir aja yang di-ping!' : `Butuh ${5 - confirmed.length} orang lagi biar ga nge-ping role mabar` });
  }

  return embed;
}

function buildButtons(agendaId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hadir_${agendaId}`).setLabel('Gas').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(disabled),
    new ButtonBuilder().setCustomId(`tidak_${agendaId}`).setLabel('Sekip').setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(disabled),
  );
}

function buildCancelButton(agendaId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`batal_${agendaId}`).setLabel('Batalkan Agenda').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
  );
}

async function executeAgenda(interaction) {
  const timeStr = interaction.options.getString('waktu') ?? '20:00';
  const tz = interaction.options.getString('timezone') ?? 'Asia/Jakarta';

  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    await interaction.reply({ content: 'Format waktu salah. Gunakan HH:MM, contoh: `20:00`.', ephemeral: true });
    return;
  }

  try {
    const result = await addAgenda({
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      timeStr,
      tz,
      createdBy: interaction.user.tag,
      createdById: interaction.user.id,
    });

    if (!result) {
      await interaction.reply({
        content: `minimal mikir 😅 jam **${timeStr}** udah lewat, set waktu yang belum lewat dong.`,
      });
      return;
    }

    const { id } = result;
    const embed = buildEmbed(timeStr, tz, interaction.user.tag, [], []);
    const buttons = buildButtons(id);

    const msg = await interaction.reply({ embeds: [embed], components: [buttons], fetchReply: true });
    await setAgendaMessageId(id, msg.id);
    await interaction.followUp({ components: [buildCancelButton(id)], ephemeral: true });
    console.log(`[AGENDA] ${id} dijadwalkan oleh ${interaction.user.tag}`);
  } catch (err) {
    console.error(`[ERROR] agenda: ${err.message}`);
    await interaction.reply({ content: 'Timezone tidak valid. Contoh: `Asia/Jakarta`, `Asia/Tokyo`.', ephemeral: true });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gas')
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

  buildEmbed,
  buildButtons,
  buildCancelButton,
  executeAgenda,
};
