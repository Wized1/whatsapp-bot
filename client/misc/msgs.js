const { default: client } = require('baileys');
const config = require('../../config');
const { serialize } = require('../../lib/serialize');
const { getPausedChats, saveMessage } = require('../database');
const { commands } = require('../plugins');
const Message = require('../_message');

const handleMessages = async ({ messages }) => {
 const msg = await serialize(JSON.parse(JSON.stringify(messages[0])), client);
 await saveMessage(messages[0], msg.sender);

 if (config.AUTO_READ) await client.readMessages([msg.key]);
 if (config.AUTO_STATUS_READ && msg.from === 'status@broadcast') await client.readMessages([msg.key]);

 const isResume = new RegExp(`${config.HANDLERS}( ?resume)`, 'is').test(msg.body);
 const pausedChats = await getPausedChats();
 if (pausedChats.some((chat) => chat.chatId === msg.from && !isResume)) return;

 if (config.LOGS) await logMessage(msg, client);

 for (const command of commands) {
  const privilege = msg.dev || msg.isOwner || msg.sudo;
  const canExecute = config.WORK_TYPE === 'private' ? privilege : config.WORK_TYPE === 'public' ? !command.fromMe || privilege : false;
  const execute = (Instance, arguments) => command.function(new Instance(client, msg), ...arguments, msg, client, messages[0]);

  if (command.on) {
   const handlers = {
    text: () => msg.body && execute(Message, [msg.body]),
    delete: () => {
     if (msg.type === 'protocolMessage' && msg.message.protocolMessage.type === 'MESSAGE_DELETE') {
      const resMsg = new Message(client, msg);
      resMsg.messageId = msg.message.protocolMessage.key?.id;
      command.function(resMsg, msg, client, messages[0]);
     }
    },
   };
   handlers[command.on]?.();
  }

  if (canExecute && msg.body && command.pattern) {
   const matched = msg.body.match(command.pattern);
   if (matched) {
    msg.prefix = matched[1];
    msg.command = matched[1] + matched[2];
    execute(Message, [matched[3] || false]);
    break;
   }
  }
 }
};
const logMessage = async (msg, conn) => {
 if (msg.sender === conn.user?.id) return;
 const name = await getName(msg.sender);
 const isGroup = msg.from?.endsWith('@g.us');
 const chat = isGroup ? (await conn.groupMetadata(msg.from).catch(() => ({}))).subject : '';
 const body = msg.body;
 if (name && body && (isGroup ? chat : true)) {
  console.log(chat ? `${chat}:\n${name}: ${body}` : `${name}: ${body}`);
 }
};
module.exports = { handleMessages };
