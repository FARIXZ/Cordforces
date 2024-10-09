const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

let messageExec = async (message, profile) => {
  const handle = profile[1];
  const apiUrl = `https://codeforces.com/api/user.info?handles=${handle}&checkHistoricHandles=false`;

  try {
    const response = await axios.get(apiUrl);
    const user = response.data.result[0];
    const status = response.data.status;
    if (status != 'OK') {
      return message.reply('Error fetching the user data. Make sure the handle is correct. (1)');
    }

    const fields = [];

    if (user.country) fields.push({ name: 'Country', value: `${user.city ? `${user.city}/` : ''}${user.country}`, inline: true });
    if (user.organization) fields.push({ name: 'Organization', value: user.organization, inline: true });
    if (user.rating) fields.push({ name: 'Rating', value: `${user.rating}`, inline: true });
    if (user.maxRating) fields.push({ name: 'Max Rating', value: `${user.maxRating}`, inline: true });
    if (user.rank) fields.push({ name: 'Rank', value: `${user.rank}`, inline: true });
    if (user.maxRank && user.maxRank != user.rank) fields.push({ name: 'Max Rank', value: `${user.maxRank}`, inline: true });
    if (user.contribution) fields.push({ name: 'Contribution', value: `${user.contribution}`, inline: true });
    if (user.friendOfCount) fields.push({ name: 'Friends', value: `${user.friendOfCount}`, inline: true });
    if (user.registrationTimeSeconds)
      fields.push({ name: 'Registration Date', value: `<t:${Math.floor(user.registrationTimeSeconds)}:F>`, inline: false });
    if (user.lastOnlineTimeSeconds)
      fields.push({ name: 'Last Online', value: `<t:${Math.floor(user.lastOnlineTimeSeconds)}:R>`, inline: true });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${user.firstName} ${user.lastName} ( @${user.handle} ) ${handle == 'farixz' ? '👑' : ''}`,
        iconURL: user.avatar,
        url: `https://codeforces.com/profile/${user.handle}`,
      })
      .setThumbnail(
        'https://cdn.iconscout.com/icon/free/png-256/free-code-forces-logo-icon-download-in-svg-png-gif-file-formats--technology-social-media-vol-2-pack-logos-icons-2944796.png'
      )
      .addFields(fields)
      .setFooter({ text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

    await message.reply({ embeds: [embed] });
    return await message.suppressEmbeds(true);

    //
  } catch (error) {
    console.error(error);
    message.reply('Error fetching the user data. Make sure the handle is correct. (2)');
  }
};

module.exports = { messageExec };
