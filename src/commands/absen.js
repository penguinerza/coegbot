const { SlashCommandBuilder } = require('discord.js');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const responses = [
  { weight: 10, message: () => 'Hadir bang!' },
  { weight: 3, delay: 4000,  message: () => 'Hadir bang, maaf telat — dipanggil mamah.' },
  { weight: 2, delay: 7000,  message: () => 'Hadir, habis masukin motor dulu.' },
  { weight: 1, delay: 12000, message: () => 'Hadir. Afk pipis bentar tadi.' },
  { weight: 2, message: () => `\`\`\`
DiscordAPIError[10008]: Unknown Message
    at handleErrors (/app/node_modules/discord.js/src/rest/handlers/SequentialHandler.js:251:13)
    at SequentialHandler.runRequest (/app/node_modules/discord.js/src/rest/handlers/SequentialHandler.js:230:15)
    at processTicksAndRejections (node:internal/process/task_queues:95:5) {
  code: 10008,
  status: 404,
  method: 'GET',
  url: 'https://discord.com/api/v10/channels/${Math.floor(Math.random() * 1e18)}'
}
\`\`\`` },
  { weight: 2, message: () => `\`\`\`
Error: read ECONNRESET
    at TLSSocket.onConnectEnd (_tls_wrap.js:1495:19)
    at Object.onceWrapper (events.js:422:26)
    at TLSSocket.emit (events.js:327:22) {
  errno: -104,
  code: 'ECONNRESET',
  syscall: 'read'
}
\`\`\`` },
];

function pickWeighted(items) {
  const total = items.reduce((sum, r) => sum + r.weight, 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return items.at(-1);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('absen')
    .setDescription('Cek apakah bot hadir.'),

  async execute(interaction) {
    const response = pickWeighted(responses);

    if (response.delay) {
      await interaction.deferReply();
      await sleep(response.delay);
      await interaction.editReply(response.message());
    } else {
      await interaction.reply(response.message());
    }
  },
};
