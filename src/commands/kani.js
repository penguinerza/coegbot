const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getKaniList, checkKani, addKani, addKaniBulk, removeKani, toggleFavorite } = require('../services/lists');

const pending = new Map(); // id -> { guildId, name, series }

const owner = process.env.RAJA_KANI;
const PAGE_SIZE = 10;

function buildListPage(entries, guildId, page) {
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const slice = entries.slice(start, start + PAGE_SIZE);

  const formatted = slice
    .map((e, i) => {
      const star = e.favorite ? '⭐ ' : '';
      return `${start + i + 1}. ${star}**${e.name}**`;
    })
    .join('\n');

  const content = `**List ${entries.length} Kani ${owner}** (${page + 1}/${totalPages})\n${formatted}`;

  const components = [];
  if (totalPages > 1) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`kanilist_${guildId}_${page - 1}`)
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`kanilist_${guildId}_${page + 1}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    );
    components.push(row);
  }

  return { content, components };
}

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
    )
    .addSubcommand((sub) =>
      sub
        .setName('tambah-massal')
        .setDescription(`Tambah banyak kani sekaligus ke daftar kaninya ${owner}.`)
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
    )
    .addSubcommand((sub) =>
      sub
        .setName('cek')
        .setDescription(`Cek apakah kani ada di daftar ${owner}.`)
        .addStringOption((opt) =>
          opt.setName('nama').setDescription('Nama kani yang mau dicek').setRequired(true)
        )
    ),

  async autocomplete(interaction) {
    const entries = getKaniList(interaction.guildId);
    const focused = interaction.options.getFocused().toLowerCase();
    const sub = interaction.options.getSubcommand();

    const choices = entries
      .map((e, i) => {
        const prefix = sub === 'fav' ? (e.favorite ? '⭐ ' : '') : '';
        return { name: `${prefix}${e.name}`, value: String(i + 1) };
      })
      .filter((c) => c.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await interaction.respond(choices);
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_');
    const action = parts[0];

    if (action === 'kanilist') {
      const targetGuildId = parts[1];
      const page = parseInt(parts[2]);
      const entries = getKaniList(targetGuildId);
      if (!entries.length) {
        await interaction.update({ content: `Daftar kani ${owner} masih kosong.`, components: [] });
        return;
      }
      const { content, components } = buildListPage(entries, targetGuildId, page);
      await interaction.update({ content, components });
      return;
    }

    const id = parts[1];
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
    const { guildId, name } = entry;
    const result = await addKani(guildId, name);
    if (!result.added) {
      await interaction.update({ content: `**${name}** udah ada di daftar.`, components: [] });
      return;
    }
    await interaction.update({ content: 'Oke, ditambah!', components: [] });
    await interaction.followUp(`**${name}** udah ditambah ke daftar kaninya ${owner}. (total: ${result.total})`);
  },

  async handleModal(interaction) {
    const raw = interaction.fields.getTextInputValue('kani_daftar');
    const names = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (!names.length) {
      await interaction.reply({ content: 'Daftarnya kosong.', ephemeral: true });
      return;
    }

    const { results, total } = await addKaniBulk(interaction.guildId, names);
    const added = results.filter(r => r.added);
    const skipped = results.filter(r => !r.added);

    const lines_out = [];
    if (added.length) {
      lines_out.push(`**${added.length} kani ditambah:**`);
      added.forEach(r => lines_out.push(`+ ${r.name}`));
    }
    if (skipped.length) {
      lines_out.push(`**${skipped.length} kani dilewat (duplikat):**`);
      skipped.forEach(r => lines_out.push(`- ${r.name}`));
    }
    lines_out.push(`\nTotal daftar kani ${owner}: **${total}**`);

    await interaction.reply(lines_out.join('\n'));
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'list') {
      const entries = getKaniList(guildId);
      if (!entries.length) {
        await interaction.reply(`Daftar kani ${owner} masih kosong.`);
      } else {
        const { content, components } = buildListPage(entries, guildId, 0);
        await interaction.reply({ content, components });
      }
    }

    if (sub === 'tambah-massal') {
      const modal = new ModalBuilder()
        .setCustomId('kanitambahmassal')
        .setTitle(`Tambah Banyak Kani ${owner}`);
      const input = new TextInputBuilder()
        .setCustomId('kani_daftar')
        .setLabel('Satu kani per baris')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Aqua\nRem\nNagato')
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (sub === 'tambah') {
      const name = interaction.options.getString('nama');
      const { duplicate, similar } = checkKani(guildId, name);

      if (duplicate) {
        await interaction.reply({ content: `**${name}** udah ada di daftar.`, ephemeral: true });
        return;
      }

      if (similar.length > 0) {
        const id = Date.now().toString();
        pending.set(id, { guildId, name });
        setTimeout(() => pending.delete(id), 5 * 60 * 1000);
        const similarList = similar.map(e => `**${e.name}**`).join('\n');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`kaniconfirm_${id}`).setLabel('Tambah').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`kanibatal_${id}`).setLabel('Batal').setStyle(ButtonStyle.Danger),
        );
        await interaction.reply({
          content: `Ada nama yang mirip:\n${similarList}\n\nTetap tambah **${name}**?`,
          components: [row],
          ephemeral: true,
        });
        return;
      }

      const result = await addKani(guildId, name);
      if (!result.added) {
        await interaction.reply({ content: `**${name}** udah ada di daftar.`, ephemeral: true });
        return;
      }
      await interaction.reply(`**${name}** udah ditambah ke daftar kaninya ${owner}. (total: ${result.total})`);
    }

    if (sub === 'hapus') {
      const nomor = parseInt(interaction.options.getString('nama'));
      const result = await removeKani(guildId, nomor);
      if (!result) {
        await interaction.reply({ content: 'Kani ga ditemukan di daftar.', ephemeral: true });
      } else if (result.blocked) {
        await interaction.reply(`**${result.entry.name}** kani favorit ${owner} coy, mana bisa dihapus😭`);
      } else {
        await interaction.reply(`**${result.entry.name}** dihapus dari daftar kaninya ${owner}.`);
      }
    }

    if (sub === 'cek') {
      const name = interaction.options.getString('nama');
      const { duplicate, similar } = checkKani(guildId, name);
      if (duplicate) {
        const star = duplicate.favorite ? '⭐ ' : '';
        await interaction.reply({ content: `✅ **${name}** ada di daftar kaninya ${owner}. (${star}${duplicate.name})`, ephemeral: true });
      } else if (similar.length > 0) {
        const similarList = similar.map(e => `- ${e.favorite ? '⭐ ' : ''}**${e.name}**`).join('\n');
        await interaction.reply({ content: `❌ **${name}** ga ada, tapi ada yang mirip:\n${similarList}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ **${name}** ga ada di daftar kaninya ${owner}.`, ephemeral: true });
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
