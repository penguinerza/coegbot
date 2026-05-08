const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('woi')
    .setDescription('Spam ping seseorang atau role 10x.')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User yang mau di-ping').setRequired(false)
    )
    .addRoleOption((opt) =>
      opt.setName('role').setDescription('Role yang mau di-ping').setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

    if (!user && !role) {
      await interaction.reply({ content: 'Pilih minimal satu: `user` atau `role`.', ephemeral: true });
      return;
    }

    const target = user ? `${user}` : `<@&${role.id}>`;

    await interaction.reply(`oke, siap bang 🫡`);

    for (let i = 1; i <= 10; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      await interaction.channel.send({ content: `${target} WOI`, allowedMentions: { users: user ? [user.id] : [], roles: role ? [role.id] : [] } });
    }
  },
};
