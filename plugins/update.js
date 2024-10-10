const config = require('../config');
const { bot } = require('../utils');
const { exec } = require('child_process');
const git = require('simple-git')();

bot(
 {
  pattern: 'update',
  fromMe: true,
  desc: 'Update the bot',
  type: 'system',
 },
 async (message, match) => {
  await git.fetch();
  const commits = await git.log([`${config.BRANCH}..origin/${config.BRANCH}`]);

  if (commits.total === 0) return message.sendMessage(message.jid, match === 'now' ? 'You are on the latest Version.' : `You are on Latest Version ${require('../package.json').version}`);

  if (match === 'now') {
   await message.sendMessage(message.jid, '*Updating...*');
   exec(`git stash && git pull origin ${config.BRANCH}`, async () => {
    await message.sendMessage(message.jid, '*Restarting...*');
    exec('npm start');
    if ((await git.diff([`${config.BRANCH}..origin/${config.BRANCH}`])).includes('"dependencies":')) {
     await message.sendMessage(message.chat, 'Updating System Files...');
     exec(`npm install && npm npm start`);
    }
   });
  } else {
   let changes = `_New update available!_\n\n*Commits:* ${commits.total}\n*Branch:* ${config.BRANCH}\n*Changes:*\n`;
   commits.all.forEach((commit, i) => (changes += `${i + 1}. ${commit.message}\n`));
   await message.sendMessage(message.jid, changes + `\n*To update, send* ${message.prefix}update now`);
  }
 }
);
