const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Tampilkan daftar perintah.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Daftar Perintah')
      .setColor(0x0099ff)
      .addFields(
        { name: '/absen', value: 'Cek apakah bot hadir.' },
        { name: '/danbooru', value: 'Ambil gambar acak dari Danbooru (SFW).' },
        { name: '/gas', value: 'Jadwalkan ping mabar. Parameter: `waktu` (HH:MM), `timezone` (opsional).' },
        { name: '/kani tambah', value: `Tambah kani ke daftar kaninya ${process.env.RAJA_KANI}.` },
        { name: '/kani list', value: `Lihat semua isi daftar kaninya ${process.env.RAJA_KANI}.` },
        { name: '/pilih', value: 'Bot milihkan salah satu dari opsi yang dikasih (maks. 5).' },
        { name: '/voting', value: 'Buat voting dengan beberapa opsi (maks. 5). Dilengkapi progress bar.' },
        { name: '/help', value: 'Tampilkan pesan ini.' },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
