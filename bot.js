const { Client, IntentsBitField, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// Create a new client instance
const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent],
});

const token = process.env.TOKEN;
const clientID = process.env.CLIENT_ID;

client.once('ready', () => {
  console.log(`${client.user.username} is online`); // Log that the bot is online
  client.user.setActivity('codeforces!', { type: 'WATCHING' }); // Set the bot's activity
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Detect Codeforces profile links
  const cfProfileRegex = /https:\/\/codeforces\.com\/profile\/([a-zA-Z0-9_]+)/;
  const profile = message.content.match(cfProfileRegex);

  if (profile) {
    const { messageExec } = require('./utils/profile');
    return await messageExec(message, profile);
  }

  if (message.content.startsWith('cf!contests')) {
    const { messageExec } = require('./utils/contests');
    return await messageExec(message);
  }
});

// Slash command interaction handling
const commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`); // Import the command from the file
  commands.set(command.data.name, command); // Set a new item in the Collection
  console.log(`> Registering command: ${command.data.name}`); // Log the command name
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  const commandsToRegister = commands.map((command) => command.data.toJSON()); // Format the commands to send to Discord

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(clientID), { body: commandsToRegister }); // Put the commands to Discord
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
  }
});

client.login(token);
