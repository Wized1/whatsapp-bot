const axios = require('axios');
const { TIME_ZONE } = require('../config');
const { exec } = require('child_process');
const { bot, tiny, runtime, commands, getOS, getRAMUsage, PluginDB, installPlugin, images } = require('../utils');

bot(
  {
    pattern: 'ping',
    fromMe: false,
    desc: 'Bot response in milliseconds.',
    type: 'system',
  },
  async (message) => {
    const start = new Date().getTime();
    const pingMsg = await message.reply('Pinging...');
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;
    await pingMsg.edit(`*sᴘᴇᴇᴅ ${responseTime} sᴇᴄs*`);
  }
);

bot(
  {
    pattern: 'menu',
    fromMe: false,
    description: 'Show All Commands',
    dontAddCommandList: true,
  },
  async (message, match, m, client) => {
    const { prefix, pushName } = message;
    const currentTime = new Date().toLocaleTimeString('en-IN', {
      timeZone: TIME_ZONE,
    });
    const currentDay = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
    });
    const currentDate = new Date().toLocaleDateString('en-IN', {
      timeZone: TIME_ZONE,
    });
    let menuText = `\`\`\`╭─ ғxᴏᴘʀɪsᴀ ᴍᴅ ───
│ Prefix: ${prefix}
│ User: ${pushName}
│ Os: ${getOS()}
│ Plugins: ${commands.length}
│ Runtime: ${runtime(process.uptime())}
│ Ram: ${getRAMUsage()}
│ Time: ${currentTime}
│ Day: ${currentDay}
│ Date: ${currentDate}
│ Version: ${require('../package.json').version}
╰────────────────\`\`\`\n`;

    const categorized = commands
      .filter((cmd) => cmd.pattern && !cmd.dontAddCommandList)
      .map((cmd) => ({
        name: cmd.pattern.toString().split(/\W+/)[2],
        category: cmd.type?.toLowerCase() || 'misc',
      }))
      .reduce((acc, { name, category }) => {
        acc[category] = (acc[category] || []).concat(name);
        return acc;
      }, {});

    Object.keys(categorized)
      .sort()
      .forEach((category) => {
        menuText += tiny(`\n╭── *${category}* ────\n│ ${categorized[category].sort().join('\n│ ')}\n╰──────────────\n`);
      });
    const media = await images();
    return message.send(media, {
      caption: menuText,
    });
  }
);

bot(
  {
    pattern: 'list',
    fromMe: false,
    description: 'Show All Commands',
    dontAddCommandList: true,
  },
  async (message) => {
    let commandListText = '*about commands*\n';
    const commandList = [];
    commands.forEach((command) => {
      if (command.pattern && !command.dontAddCommandList) {
        const commandName = command.pattern.toString().split(/\W+/)[2];
        const description = command.desc || command.info || 'No description available';
        commandList.push({
          name: commandName,
          description,
        });
      }
    });
    commandList.sort((a, b) => a.name.localeCompare(b.name));
    commandList.forEach(({ name, description }, index) => {
      commandListText += `\`\`\`${index + 1} ${name.trim()}\`\`\`\n`;
      commandListText += `Use: \`\`\`${description}\`\`\`\n\n`;
    });
    return await message.reply(tiny(commandListText));
  }
);

bot(
  {
    pattern: 'restart',
    fromMe: true,
    info: 'Restarts the Bot',
    type: 'system',
  },
  async (message, match, m, client) => {
    await message.reply('_Restarting..._');
    await process.exit(1);
  }
);

bot(
  {
    pattern: 'shutdown',
    fromMe: true,
    info: 'Shutdown the bot',
    type: 'system',
  },
  async (m) => {
    await m.reply('_Shutting Down_');
    await exec(require('../package.json').scripts.stop);
  }
);

bot(
  {
    pattern: 'runtime',
    fromMe: false,
    desc: 'Check uptime of bot',
    type: 'system',
  },
  async (message, match) => {
    const alive = `*runtime:* ${runtime(process.uptime())}`;
    return await message.reply(tiny(alive));
  }
);

bot(
  {
    pattern: 'install',
    fromMe: true,
    desc: 'Installs External plugins',
    type: 'system',
  },
  async (message, match, m, client) => {
    if (!match) return message.reply('_Provide Plugin URl_');
    let url = new URL(match);
    if (url.host === 'gist.github.com') url = `https://gist.githubusercontent.com${url.pathname}/raw`;
    const { data } = await axios.get(url);
    const plugin_name = data.match(/(?<=pattern:) ["'](.*?)["']/)?.[1]?.split(' ')?.[0] || `__${Math.random().toString(36).slice(2)}`;
    fs.writeFileSync(`${__dirname}/${plugin_name}.js`, data);
    require(`./${plugin_name}`);
    await installPlugin(url, plugin_name);
    message.send(`_Installed: ${plugin_name}_`);
  }
);

bot(
  {
    pattern: 'plugin',
    fromMe: true,
    desc: 'plugin list',
    type: 'system',
  },
  async (message, match, m, client) => {
    const plugins = await PluginDB.findAll();
    if (plugins.length < 1) return message.send('_External Plugins Not Found_');
    message.send(plugins.map((p) => `\`\`\`${p.dataValues.name}\`\`\`: ${p.dataValues.url}`).join('\n'));
  }
);

bot(
  {
    pattern: 'remove',
    fromMe: true,
    desc: 'Remove external plugins',
    type: 'system',
  },
  async (message, match, m, client) => {
    if (!match) return message.sendMessage('_Need a plugin name_');
    const plugin = await PluginDB.findOne({
      where: {
        name: match,
      },
    });
    if (!plugin) return message.sendMessage('_Plugin not found_');
    await plugin.destroy();
    delete require.cache[require.resolve(`./${match}.js`)];
    fs.unlinkSync(`${__dirname}/${match}.js`);
    message.sendMessage(`Plugin ${match} deleted`);
  }
);
