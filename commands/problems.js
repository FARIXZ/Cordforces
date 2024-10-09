// commands/problems.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { code } = require('../utils/problems');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('problems')
    .setDescription('Fetch problems from a specific contest')
    .addStringOption((option) => option.setName('contest_id').setDescription('The contest ID').setRequired(true))
    .addStringOption((option) => option.setName('group_id').setDescription('The group ID (optional)')),

  async execute(interaction) {
    const contestId = interaction.options.getString('contest_id');
    const groupId = interaction.options.getString('group_id');

    try {
      await interaction.deferReply(); // Acknowledge the command and show a loading message
      const problems = await code(contestId, groupId);

      if (problems) {
        if (problems === 'No access' || problems === 'Wrong ID') {
          await interaction.editReply(problems);
        } else if (!Array.isArray(problems) && problems.startsWith('Codeforces Error:')) {
          await interaction.editReply(problems);
        } else if (Array.isArray(problems) && problems.length === 0) {
          await interaction.editReply('No problems found.');
        } else {
          const message = `${problems.map((p) => `- [${p.name}](<${p.link}>)`).join('\n')}`;
          const embed = new EmbedBuilder().setTitle('Problems loaded!').setDescription(message);
          await interaction.editReply({ embeds: [embed] });
        }
      } else {
        await interaction.editReply('No problems found or an error occurred.');
      }
    } catch (error) {
      await interaction.editReply('An error occurred while fetching problems.');
      console.error(error); // Log the error for debugging
    }
  },
};
