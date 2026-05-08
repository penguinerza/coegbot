require('dotenv').config();
const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { castVote, getVoting, closeVoting } = require('./services/voting');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  console.log(`[LOAD] Loaded command: ${command.data.name}`);
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  try {
    await require('./deploy')();
  } catch (err) {
    console.error(`[ERROR] deploy: ${err.message}`);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    try {
      const [action, id, extra] = interaction.customId.split('_');

      if (action === 'kaniconfirm' || action === 'kanibatal') {
        await client.commands.get('kani').handleButton(interaction);
        return;
      }

      const votingCmd = client.commands.get('voting');
      const { buildVotingEmbed, buildVotingButtons } = votingCmd;

      if (action === 'vote') {
        const voting = await castVote(id, interaction.user.id, parseInt(extra));
        if (!voting) {
          await interaction.reply({ content: 'Voting udah ditutup.', ephemeral: true });
          return;
        }
        const embed = buildVotingEmbed(voting.question, voting.options, voting.votes);
        await interaction.update({ embeds: [embed] });
        return;
      }

      if (action === 'closevote') {
        const voting = getVoting(id);
        if (!voting) {
          await interaction.reply({ content: 'Voting udah ditutup.', ephemeral: true });
          return;
        }
        if (voting.createdById !== interaction.user.id) {
          await interaction.reply({ content: 'Cuma yang buat voting yang bisa nutup.', ephemeral: true });
          return;
        }
        await closeVoting(id);
        const embed = buildVotingEmbed(voting.question, voting.options, voting.votes, true);
        await interaction.update({ content: 'Voting ditutup.', components: [] });
        if (voting.messageId) {
          const channel = await interaction.guild.channels.fetch(voting.channelId);
          const msg = await channel.messages.fetch(voting.messageId).catch(() => null);
          if (msg) await msg.edit({ embeds: [embed], components: [buildVotingButtons(id, voting.options, true)] });
        }
        return;
      }

    } catch (err) {
      console.error(`[ERROR] Button handler: ${err.stack}`);
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (command?.autocomplete) await command.autocomplete(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const tag = interaction.user.tag;
  const guild = interaction.guild?.name ?? 'DM';
  console.log(`[CMD] /${interaction.commandName} by ${tag} in ${guild}`);

  try {
    await command.execute(interaction);
    console.log(`[OK] /${interaction.commandName} done`);
  } catch (err) {
    console.error(`[ERROR] /${interaction.commandName}: ${err.message}`);
    const msg = { content: 'Terjadi error, coba lagi nanti.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

async function shutdown(signal) {
  console.log(`[SHUTDOWN] ${signal} diterima, matiin bot...`);
  client.destroy();
  console.log('[SHUTDOWN] Bot mati dengan damai.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error(`[FATAL] uncaughtException: ${err.stack}`);
  client.destroy();
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error(`[FATAL] unhandledRejection: ${reason instanceof Error ? reason.stack : reason}`);
});

client.login(process.env.DISCORD_TOKEN);
