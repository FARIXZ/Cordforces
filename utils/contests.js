const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

let messageExec = async (message) => {
  const apiUrl = 'https://codeforces.com/api/contest.list';

  try {
    const response = await axios.get(apiUrl);
    const contests = await response.data.result;
    if (!contests) return message.reply('Codeforces API error. Please try again later.');

    const upcomingContests = contests.filter((contest) => contest.phase === 'BEFORE');
    if (upcomingContests.length === 0) return message.reply('No upcoming contests found.');

    // Create embed for each upcoming contest
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Upcoming Codeforces Contests')
      .setDescription("Here are the contests that haven't started yet:");

    upcomingContests.slice(0, 5).forEach((contest) => {
      embed.addFields({
        name: contest.name,
        value: `**Starts at:** <t:${Math.floor(contest.startTimeSeconds)}:F> (<t:${Math.floor(contest.startTimeSeconds)}:R>)\n**Duration:** ${
          contest.durationSeconds / 3600
        } hours`,
        inline: false,
      });
    });

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await message.reply('Error fetching contest data. Please try again later.');
  }
};

let interactionExec = async (interaction) => {
  const apiUrl = 'https://codeforces.com/api/contest.list';

  try {
    const response = await axios.get(apiUrl);
    const contests = await response.data.result;
    if (!contests) return interaction.reply('Codeforces API error. Please try again later.');

    const upcomingContests = contests.filter((contest) => contest.phase === 'BEFORE');
    if (upcomingContests.length === 0) return interaction.reply('No upcoming contests found.');

    // Create embed for each upcoming contest
    const embed = new EmbedBuilder()
      .setTitle('Upcoming Codeforces Contests')
      .setDescription("Here are the contests that haven't started yet:");

    upcomingContests.slice(0, 5).forEach((contest) => {
      embed.addFields({
        name: contest.name,
        value: `**Starts at:** <t:${Math.floor(contest.startTimeSeconds)}:F> (<t:${Math.floor(contest.startTimeSeconds)}:R>)\n**Duration:** ${
          contest.durationSeconds / 3600
        } hours`,
        inline: false,
      });
    });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.reply('Error fetching contest data. Please try again later.');
  }
};

module.exports = { messageExec, interactionExec };
