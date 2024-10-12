const { addModule, commands } = require('../lib');
const { TIME_ZONE } = require('../config');
const { exec } = require('child_process');

addModule(
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

addModule(
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
  return message.send(menuText);
 }
);

addModule(
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
  return await message.reply(commandListText);
 }
);

addModule(
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

addModule(
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

addModule(
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
