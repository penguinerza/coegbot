const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getKaniList, checkKani, addKani, removeKani, toggleFavorite } = require('../services/lists');

const pending = new Map(); // id -> { guildId, name, series }

const owner = process.env.RAJA_KANI;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kani')
    .setDescription(`Daftar kaninya ${owner}.`)
    .addSubcommand((sub) =>
      sub.setName('list').setDescription(`Lihat semua isi daftar kaninya ${owner}.`)
    )
    .addSubcommand((sub) =>
      sub
        .setName('tambah')
        .setDescription(`Tambah kani ke daftar kaninya ${owner}.`)
        .addStringOption((opt) =>
          opt.setName('nama').setDescription('Nama kani').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('seri').setDescription('Nama seri').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('hapus')
        .setDescription(`Hapus kani dari daftar kaninya ${owner}.`)
        .addStringOption((opt) =>
          opt.setName('nama').setDescription('Nama kani yang mau dihapus').setRequired(true).setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('fav')
        .setDescription('Toggle favorit kani.')
        .addStringOption((opt) =>
          opt.setName('nama').setDescription('Nama kani').setRequired(true).setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const entries = getKaniList(interaction.guildId);
    const focused = interaction.options.getFocused().toLowerCase();
    const sub = interaction.options.getSubcommand();

    const choices = entries
      .map((e, i) => {
        const label = e.series ? `${e.name} — ${e.series}` : e.name;
        const prefix = sub === 'fav' ? (e.favorite ? '⭐ ' : '') : '';
        return { name: `${prefix}${label}`, value: String(i + 1) };
      })
      .filter((c) => c.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await interaction.respond(choices);
  },

  async handleButton(interaction) {
    const [action, id] = interaction.customId.split('_');
    const entry = pending.get(id);
    if (!entry) {
      await interaction.update({ content: 'Konfirmasi udah kedaluwarsa.', components: [] });
      return;
    }
    pending.delete(id);
    if (action === 'kanibatal') {
      await interaction.update({ content: 'Dibatalin.', components: [] });
      return;
    }
    // kaniconfirm
    const { guildId, name, series } = entry;
    const seriesText = series ? ` dari **${series}**` : '';
    const result = await addKani(guildId, name, series);
    if (!result.added) {
      await interaction.update({ content: `**${name}**${seriesText} udah ada di daftar.`, components: [] });
      return;
    }
    await interaction.update({ content: 'Oke, ditambah!', components: [] });
    await interaction.followUp(`**${name}**${seriesText} udah ditambah ke daftar kaninya ${owner}. (total: ${result.total})`);
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'list') {
      const entries = getKaniList(guildId);
      if (!entries.length) {
        await interaction.reply(`Daftar kani ${owner} masih kosong.`);
      } else {
        const formatted = entries
          .map((e, i) => {
            const star = e.favorite ? '⭐ ' : '';
            const series = e.series ? ` — ${e.series}` : '';
            return `${i + 1}. ${star}**${e.name}**${series}`;
          })
          .join('\n');
        await interaction.reply(`**List ${entries.length} Kani ${owner}**\n${formatted}`);
      }
    }

    if (sub === 'tambah') {
      const name = interaction.options.getString('nama');
      const series = interaction.options.getString('seri') ?? null;
      const seriesText = series ? ` dari **${series}**` : '';
      const { duplicate, similar } = checkKani(guildId, name, series);

      if (duplicate) {
        await interaction.reply({ content: `**${name}**${seriesText} udah ada di daftar.`, ephemeral: true });
        return;
      }

      if (similar.length > 0) {
        const id = Date.now().toString();
        pending.set(id, { guildId, name, series });
        setTimeout(() => pending.delete(id), 5 * 60 * 1000);
        const similarList = similar.map(e => e.series ? `**${e.name}** — ${e.series}` : `**${e.name}**`).join('\n');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`kaniconfirm_${id}`).setLabel('Tambah').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`kanibatal_${id}`).setLabel('Batal').setStyle(ButtonStyle.Danger),
        );
        await interaction.reply({
          content: `Ada nama yang mirip:\n${similarList}\n\nTetap tambah **${name}**${seriesText}?`,
          components: [row],
          ephemeral: true,
        });
        return;
      }

      const result = await addKani(guildId, name, series);
      if (!result.added) {
        await interaction.reply({ content: `**${name}**${seriesText} udah ada di daftar.`, ephemeral: true });
        return;
      }
      await interaction.reply(`**${name}**${seriesText} udah ditambah ke daftar kaninya ${owner}. (total: ${result.total})`);
    }

    if (sub === 'hapus') {
      const nomor = parseInt(interaction.options.getString('nama'));
      const result = await removeKani(guildId, nomor);
      if (!result) {
        await interaction.reply({ content: 'Kani ga ditemukan di daftar.', ephemeral: true });
      } else if (result.blocked) {
        await interaction.reply(`**${result.entry.name}** kani favorit ${owner} coy, mana bisa dihapus😭`);
      } else {
        const seriesText = result.entry.series ? ` dari **${result.entry.series}**` : '';
        await interaction.reply(`**${result.entry.name}**${seriesText} dihapus dari daftar kaninya ${owner}.`);
      }
    }

    if (sub === 'fav') {
      const nomor = parseInt(interaction.options.getString('nama'));
      const entry = await toggleFavorite(guildId, nomor);
      if (!entry) {
        await interaction.reply({ content: 'Kani ga ditemukan di daftar.', ephemeral: true });
      } else if (entry.favorite) {
        await interaction.reply(`⭐ **${entry.name}** ditandai jadi kani favorit ${owner}!`);
      } else {
        await interaction.reply(`**${entry.name}** dihapus dari kani favorit ${owner}.`);
      }
    }
  },
};
