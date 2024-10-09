const { bot, isAdmin, parsedJid } = require('../utils');

bot(
 {
  pattern: 'add',
  fromMe: true,
  desc: 'add a person to group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.jid;
  if (!match) return await message.reply('_Mention user to add');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  const jid = parsedJid(match);
  await client.groupParticipantsUpdate(message.jid, [jid], 'add');
  return await message.reply(`_@${jid[0].split('@')[0]} added_`, { mentions: [jid] });
 }
);

bot(
  { 
   pattern: 'kick',
   fromMe: true,
   desc: 'Kicks a person from group',
   type: 'group' 
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_This command is for groups only!_');
    match = match || message.reply_message?.jid;
    if (!match) return await message.reply('_Tag a user to kick or reply to a message_');
    const isBotAdmin = await isAdmin(message.jid, message.user, message.client);
    if (!isBotAdmin) return await message.reply('_I need to be an admin to perform this action!_');
    const jid = parsedJid(match)[0];
    await client.groupParticipantsUpdate(message.jid, [jid], 'remove');
    return await message.reply(`_@${jid.split('@')[0]} kicked_`, { mentions: [jid] });
  }
);

bot(
 {
  pattern: 'promote',
  fromMe: true,
  desc: 'promote to admin',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.jid;
  if (!match) return await message.reply('_Mention user to promote_');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupParticipantsUpdate(message.jid, [message.participant], 'promote');
  return await message.reply(`_@${message.participant[0].split('@')[0]} promoted as admin_`, { mentions: [message.participant] });
 }
);

bot(
 {
  pattern: 'demote',
  fromMe: true,
  desc: 'demote from admin',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.jid;
  if (!match) return await message.reply('_Mention user to demote_');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupParticipantsUpdate(message.jid, [message.participant], 'demote');
  return await message.reply(`_@${message.participant[0].split('@')[0]} demoted from admin_`, { mentions: [message.participant] });
 }
);

bot(
 {
  pattern: 'mute',
  fromMe: true,
  desc: 'mute group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupSettingUpdate(message.jid, 'announcement');
  return await message.reply('_Muted.._');
 }
);

bot(
 {
  pattern: 'unmute',
  fromMe: true,
  desc: 'unmute group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
  await client.groupSettingUpdate(message.jid, 'not_announcement');
  return await message.reply('_Unmuted.._');
 }
);

bot(
 {
  pattern: 'gjid',
  fromMe: true,
  desc: 'gets jid of all group members',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  let { participants } = await client.groupMetadata(message.jid);
  let participant = participants.map((u) => u.id);
  let str = '╭──〔 *Group Jids* 〕\n';
  participant.forEach((result) => {
   str += `├ *${result}*\n`;
  });
  str += `╰──────────────`;
  message.reply(str);
 }
);

bot(
 {
  pattern: 'tagall',
  fromMe: true,
  desc: 'mention all users in group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return;
  const { participants } = await message.client.groupMetadata(message.jid);
  let teks = '';
  for (let mem of participants) teks += ` @${mem.id.split('@')[0]}\n`;
  return await message.sendMessage(message.jid, teks.trim(), { mentions: participants.map((a) => a.id) });
 }
);

bot(
 {
  pattern: 'tag',
  fromMe: true,
  desc: 'mention all users in group',
  type: 'group',
 },
 async (message, match, m, client) => {
  if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
  match = match || message.reply_message.text;
  if (!match) return message.reply('_Enter or reply to a text to tag_');
  const { participants } = await client.groupMetadata(message.jid);
  message.sendMessage(message.jid, match, { mentions: participants.map((a) => a.id) });
 }
);

bot(
  {
    pattern: 'leave',
    fromMe: true,
    desc: 'Leave the group',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    await message.reply('_Leaving the group..._');
    await client.groupLeave(message.jid);
  }
);

bot(
  {
    pattern: 'accept',
    fromMe: true,
    desc: 'Accept group join requests',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
    
    try {
      const participants = await message.client.groupRequestParticipantsList(message.jid);
      if (participants.length === 0) return await message.reply('_No pending join requests_');
      
      await message.client.groupRequestParticipantsUpdate(message.jid, participants.map(p => p.jid), 'approve');
      await message.reply(`_Accepted ${participants.length} join request(s)_`);
    } catch (error) {
      console.error(error);
      await message.reply('_Error occurred while accepting join requests_');
    }
  }
);

bot(
  {
    pattern: 'reject',
    fromMe: true,
    desc: 'Reject group join requests',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
    
    try {
      const participants = await message.client.groupRequestParticipantsList(message.jid);
      if (participants.length === 0) return await message.reply('_No pending join requests_');
      
      await message.client.groupRequestParticipantsUpdate(message.jid, participants.map(p => p.jid), 'reject');
      await message.reply(`_Rejected ${participants.length} join request(s)_`);
    } catch (error) {
      console.error(error);
      await message.reply('_Error occurred while rejecting join requests_');
    }
  }
);

bot(
  {
    pattern: 'requests',
    fromMe: true,
    desc: 'Get all group join requests',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
    
    try {
      const participants = await message.client.groupRequestParticipantsList(message.jid);
      if (participants.length === 0) return await message.reply('_No pending join requests_');
      
      let requestList = '📋 *Pending Join Requests:*\n\n';
      participants.forEach((participant, index) => {
        requestList += `${index + 1}. @${participant.jid.split('@')[0]}\n`;
      });
      
      await message.reply(requestList, { mentions: participants.map(p => p.jid) });
    } catch (error) {
      console.error(error);
      await message.reply('_Error occurred while fetching join requests_');
    }
  }
);

bot(
  {
    pattern: 'join',
    fromMe: true,
    desc: 'Join an open group',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!match) return await message.reply('_Please provide the group link or ID to join_');
    await message.reply(`_Joined the group ${match}_`);
  }
);

bot(
  {
    pattern: 'common',
    fromMe: true,
    desc: 'Find common elements between two sets',
    type: 'group',
  },
  async (message, match, m, client) => {
    const [set1, set2] = match.split(' ').map(set => new Set(set.split(',')));
    const commonElements = [...set1].filter(x => set2.has(x));
    await message.reply(`Common elements: ${commonElements.join(', ')}`);
  }
);

bot(
  {
    pattern: 'diff',
    fromMe: true,
    desc: 'Find the difference between two sets',
    type: 'group',
  },
  async (message, match, m, client) => {
    const [set1, set2] = match.split(' ').map(set => new Set(set.split(',')));
    const diffSet1 = [...set1].filter(x => !set2.has(x));
    const diffSet2 = [...set2].filter(x => !set1.has(x));
    await message.reply(`Elements in set1 but not in set2: ${diffSet1.join(', ')}\nElements in set2 but not in set1: ${diffSet2.join(', ')}`);
  }
);

bot(
  {
    pattern: 'vote',
    fromMe: true,
    desc: 'Create a poll',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!match) return await message.reply('_Please provide poll options separated by |_');
    const options = match.split('|');
    if (options.length < 2) return await message.reply('_Please provide at least 2 options_');
    await client.sendMessage(message.jid, {
      poll: {
        name: 'Poll',
        values: options,
        selectableCount: 1
      }
    });
  }
);

bot(
  {
    pattern: 'groupinfo',
    fromMe: true,
    desc: 'Get group info',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    const groupMetadata = await client.groupMetadata(message.jid);
    const info = `
*Group Name:* ${groupMetadata.subject}
*Group ID:* ${groupMetadata.id}
*Created By:* @${groupMetadata.owner.split('@')[0]}
*Created On:* ${new Date(groupMetadata.creation * 1000).toLocaleString()}
*Member Count:* ${groupMetadata.participants.length}
*Description:* ${groupMetadata.desc || 'No description'}
    `;
    await message.reply(info, { mentions: [groupMetadata.owner] });
  }
);

bot(
  {
    pattern: 'setdesc',
    fromMe: true,
    desc: 'Set group description',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
    if (!match) return await message.reply('_Please provide the new group description_');
    await client.groupUpdateDescription(message.jid, match);
    await message.reply('_Group description updated successfully_');
  }
);

bot(
  {
    pattern: 'setsubject',
    fromMe: true,
    desc: 'Set group subject',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
    if (!match) return await message.reply('_Please provide the new group subject_');
    await client.groupUpdateSubject(message.jid, match);
    await message.reply('_Group subject updated successfully_');
  }
);

bot(
  {
    pattern: 'revoke',
    fromMe: true,
    desc: 'Revoke group invite link',
    type: 'group',
  },
  async (message, match, m, client) => {
    if (!message.isGroup) return await message.reply('_ғᴏʀ ɢʀᴏᴜᴘs ᴏɴʟʏ!_');
    if (!isAdmin(message.jid, message.user, message.client)) return await message.reply('_ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀᴅᴍɪɴ!_');
    await client.groupRevokeInvite(message.jid);
    await message.reply('_Group invite link revoked successfully_');
  }
);
