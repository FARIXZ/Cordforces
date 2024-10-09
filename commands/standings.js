// commands/problems.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { code } = require('../utils/standings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('standings')
    .setDescription('Fetch problems from a specific contest')
    .addStringOption((option) => option.setName('contest_id').setDescription('The contest ID').setRequired(true))
    .addStringOption((option) => option.setName('group_id').setDescription('The group ID (optional)'))
    .addStringOption((option) => option.setName('list').setDescription('A specific list ID (optional)')),

  async execute(interaction) {
    const contestId = interaction.options.getString('contest_id');
    const groupId = interaction.options.getString('group_id');
    const list = interaction.options.getString('list');

    try {
      await interaction.deferReply(); // Acknowledge the command and show a loading message
      const standings = await code(contestId, groupId, list);

      if (standings) {
        if (standings === 'No access' || standings === 'Wrong ID') {
          await interaction.editReply(standings);
        } else if (typeof standings === 'string' && standings.startsWith('Codeforces Error:')) {
          await interaction.editReply(standings);
        } else if (Array.isArray(standings) && standings.length === 0) {
          await interaction.editReply('No standings found.');
        } else if (Array.isArray(standings)) {
          let message = standings
            .map((entry) => `- **@${entry.handle}** : ${entry.problems.map((problem) => `\`${problem}\``).join(', ')}`)
            .join('\n');

          // Truncate the message ( Discord limit is 4000 characters but we don't want the message to be too long )
          if (message.length > 2000) message = message.slice(0, message.lastIndexOf('\n', 1000)) + '...'; // 1000 characters

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
