const { SlashCommandBuilder } = require('discord.js');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const gantiMessages = [
  (pick) => `eh wait, gw ganti **${pick}** aja deh`,
  (pick) => `hmm sebenernya... lebih prefer **${pick}**`,
  (pick) => `nah bro, **${pick}** aja gw`,
  (pick) => `eh tapi kalo dipikir-pikir, mending **${pick}** sih`,
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pilih')
    .setDescription('Bot milihkan salah satu dari opsi yang dikasih.')
    .addStringOption((opt) => opt.setName('opsi1').setDescription('Opsi pertama').setRequired(true))
    .addStringOption((opt) => opt.setName('opsi2').setDescription('Opsi kedua').setRequired(true))
    .addStringOption((opt) => opt.setName('opsi3').setDescription('Opsi ketiga').setRequired(false))
    .addStringOption((opt) => opt.setName('opsi4').setDescription('Opsi keempat').setRequired(false))
    .addStringOption((opt) => opt.setName('opsi5').setDescription('Opsi kelima').setRequired(false)),

  async execute(interaction) {
    const options = ['opsi1', 'opsi2', 'opsi3', 'opsi4', 'opsi5']
      .map((k) => interaction.options.getString(k))
      .filter(Boolean);

    const pick = (exclude) => { const f = options.filter((o) => o !== exclude); return f[Math.floor(Math.random() * f.length)]; };

    const joined = options.length === 2
      ? `${options[0]} atau ${options[1]}`
      : options.slice(0, -1).join(', ') + ', atau ' + options.at(-1);

    const chosen = options[Math.floor(Math.random() * options.length)];
    await interaction.reply(`${joined}?\ngw sih pilih **${chosen}** bang 😁`);

    if (Math.random() < 0.25) {
      await sleep(2000 + Math.random() * 2000);
      const ganti = pick(chosen);
      const msg = gantiMessages[Math.floor(Math.random() * gantiMessages.length)];
      await interaction.followUp(msg(ganti));
    }
  },
};
