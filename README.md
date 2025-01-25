# Cordforces

A Discord.js bot capable of loading standings and problems from Codeforces, getting the future contests and getting profiles data.

## Commands

- **cf!contests** to get future contests.
- send a **profile link** to get data about it
- **/problems** [contestID] (groupID) to scrap problems
- **/standings** [contestID] (groupID) (list) to get users in contest and their status

  > [Required] (optional)

## Requirements

- [Node.js](https://nodejs.org/) (v16.x or higher)
- [Discord.js](https://discord.js.org/) (v14.x)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/farixz/cordforces.git
   cd Cordforces
   ```

2. **Install dependencies**

   ```bash
   npm i discord.js dotenv axios puppeteer-extra puppeteer-extra-plugin-stealth cheerio
   ```

3. **Run the bot**
   ```bash
   node bot.js
   ```

## Credits

- [@farixz](https://www.github.com/farixz)
- [@chatgpt](https://chatgpt.com) (bro helped me so much)
