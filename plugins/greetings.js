const { bot } = require('../utils');
const { GreetingsHandler } = require('../client');

bot(
  {
    pattern: 'welcome',
    fromMe: true,
    desc: 'Manage welcome messages',
    type: 'group',
  },
  async (message, match) => {
    if (!message.isGroup) return await message.reply('This command can only be used in groups.');

    let { prefix } = message;
    let status = await GreetingsHandler.getGreetingStatus(message.jid, 'welcome');
    let stat = status ? 'on' : 'off';

    if (!match) {
      let replyMsg = `Welcome Message Manager\n\nGroup: ${(await message.client.groupMetadata(message.jid)).subject}\nStatus: ${stat}\n\nAvailable Actions:\n\n- ${prefix}welcome get: Get the current welcome message\n- ${prefix}welcome on: Enable welcome message\n- ${prefix}welcome off: Disable welcome message\n- ${prefix}welcome delete: Delete the welcome message\n- ${prefix}welcome <text>: Set a new welcome message`;
      return await message.reply(replyMsg);
    }

    switch (match.split(' ')[0].toLowerCase()) {
      case 'get':
        let msg = await GreetingsHandler.getGreetingMessage(message.jid, 'welcome');
        if (!msg) return await message.reply('_There is no welcome message set_');
        return message.reply(`Current welcome message:\n\n${msg.message}`);

      case 'on':
        if (status) return await message.reply('_Welcome message is already enabled_');
        await GreetingsHandler.toggleGreetingStatus(message.jid, 'welcome');
        return await message.reply('_Welcome message has been enabled_');

      case 'off':
        if (!status) return await message.reply('_Welcome message is already disabled_');
        await GreetingsHandler.toggleGreetingStatus(message.jid, 'welcome');
        return await message.reply('_Welcome message has been disabled_');

      case 'delete':
        await GreetingsHandler.deleteGreeting(message.jid, 'welcome');
        return await message.reply('_Welcome message has been deleted successfully_');

      default:
        await GreetingsHandler.setGreeting(message.jid, 'welcome', match);
        return await message.reply('_Welcome message has been set successfully_');
    }
  }
);

bot(
  {
    pattern: 'goodbye',
    fromMe: true,
    desc: 'Manage goodbye messages',
    type: 'group',
  },
  async (message, match) => {
    if (!message.isGroup) return await message.reply('This command can only be used in groups.');

    let { prefix } = message;
    let status = await GreetingsHandler.getGreetingStatus(message.jid, 'goodbye');
    let stat = status ? 'on' : 'off';

    if (!match) {
      let replyMsg = `Goodbye Message Manager\n\nGroup: ${(await message.client.groupMetadata(message.jid)).subject}\nStatus: ${stat}\n\nAvailable Actions:\n\n- ${prefix}goodbye get: Get the current goodbye message\n- ${prefix}goodbye on: Enable goodbye message\n- ${prefix}goodbye off: Disable goodbye message\n- ${prefix}goodbye delete: Delete the goodbye message\n- ${prefix}goodbye <text>: Set a new goodbye message`;
      return await message.reply(replyMsg);
    }

    switch (match.split(' ')[0].toLowerCase()) {
      case 'get':
        let msg = await GreetingsHandler.getGreetingMessage(message.jid, 'goodbye');
        if (!msg) return await message.reply('_There is no goodbye message set_');
        return message.reply(`Current goodbye message:\n\n${msg.message}`);

      case 'on':
        if (status) return await message.reply('_Goodbye message is already enabled_');
        await GreetingsHandler.toggleGreetingStatus(message.jid, 'goodbye');
        return await message.reply('_Goodbye message has been enabled_');

      case 'off':
        if (!status) return await message.reply('_Goodbye message is already disabled_');
        await GreetingsHandler.toggleGreetingStatus(message.jid, 'goodbye');
        return await message.reply('_Goodbye message has been disabled_');

      case 'delete':
        await GreetingsHandler.deleteGreeting(message.jid, 'goodbye');
        return await message.reply('_Goodbye message has been deleted successfully_');

      default:
        await GreetingsHandler.setGreeting(message.jid, 'goodbye', match);
        return await message.reply('_Goodbye message has been set successfully_');
    }
  }
);
