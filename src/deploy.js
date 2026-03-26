require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const access = require('./config/access');

async function deploy() {
  const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
  const allCommands = commandFiles.map(f => require(`./commands/${f}`));

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  if (process.env.NODE_ENV !== 'production') {
    // Dev: semua command ke satu guild untuk update instan
    const body = allCommands.map(c => c.data.toJSON());
    console.log(`Registering ${body.length} commands to dev guild...`);
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID_DEV), { body });
    console.log('Slash commands registered (guild/dev).');
    return;
  }

  // Prod: global commands + restricted commands per guild
  const restricted = new Set(Object.keys(access));
  const globalBody = allCommands.filter(c => !restricted.has(c.data.name)).map(c => c.data.toJSON());
  const restrictedCommands = allCommands.filter(c => restricted.has(c.data.name));

  console.log(`Registering ${globalBody.length} global commands...`);
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: globalBody });

  // Kelompokkan restricted commands per guild
  const guildMap = {};
  for (const cmd of restrictedCommands) {
    for (const guildId of access[cmd.data.name]) {
      if (!guildMap[guildId]) guildMap[guildId] = [];
      guildMap[guildId].push(cmd.data.toJSON());
    }
  }

  for (const [guildId, cmds] of Object.entries(guildMap)) {
    console.log(`Registering ${cmds.length} restricted commands to guild ${guildId}...`);
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: cmds });
  }

  console.log('Slash commands registered (global + restricted).');
}

if (require.main === module) {
  deploy();
} else {
  module.exports = deploy;
}
