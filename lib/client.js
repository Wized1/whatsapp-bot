const pino = require('pino');
const path = require('path');
const config = require('../config');
const { serialize } = require('./serialize');
const { commands } = require('../utils');
const { getPausedChats, loadMessage, saveMessage, saveChat, getName } = require('./database');
const { Message, GreetingsHandler } = require('../client');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason } = require('baileys');

const logger = pino({
  level: process.env.LOG_LEVEL || 'silent',
});
const connect = async () => {
  const sessionDir = path.join(__dirname, './session');
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const client = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger: logger.child({
      module: 'baileys',
    }),
    browser: Browsers.ubuntu('Firefox'),
    emitOwnEvents: false,
    version: [2, 3000, 1015901307],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    downloadHistory: false,
    fireQueries: false,
    getMessage: async (key) => {
      const message = await loadMessage(key.id);
      return message
        ? message.message
        : {
            conversation: null,
          };
    },
    shouldSyncHistoryMessage: () => false,
    shouldSyncMetaData: () => false,
  });
  const handleConnection = async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      const msg = `FX-BOT ${require('../package.json').version}\nPrefix: ${config.HANDLERS.replace(/[\[\]]/g, '')}\nPlugins: ${commands.length}\nMode: ${config.WORK_TYPE}`;
      console.log('Connected\n' + msg);
      await client.sendMessage(client.user.id, {
        text: '```' + msg + '```',
      });
    }
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      console.log('Reconnecting...');
      await delay(10000);
      connect();
    }
  };

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
              const whatsappMsg = new Message(client, msg);
              whatsappMsg.messageId = msg.message.protocolMessage.key?.id;
              command.function(whatsappMsg, msg, client, messages[0]);
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

  client.ev.on('connection.update', handleConnection);
  client.ev.on('creds.update', saveCreds);
  const greetingsHandler = new GreetingsHandler(client);
  client.ev.on('group-participants.update', (data) => greetingsHandler.handleGroupEvent(data));
  client.ev.on('chats.update', (chats) => Promise.all(chats.map(saveChat)));
  client.ev.on('messages.upsert', handleMessages);

  process.on('unhandledRejection', (err) => handleErrors(err, client));
  process.on('uncaughtException', (err) => handleErrors(err, client));

  return client;
};

const handleErrors = async (err, conn, msg = {}) => {
  const { message, stack } = err;
  const fileName = stack?.split('\n')[1]?.trim();
  const errorText = `─━❲ ERROR REPORT ❳━─\nMessage: ${message}\nFrom: ${fileName}`;
  console.error('Error:', err);
  await conn.sendMessage(conn.user.id, {
    text: '```' + errorText + '```',
  });
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

module.exports = { connect };
