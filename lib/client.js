const pino = require('pino');
const path = require('path');
const config = require('../config');
const { loadMessage, saveChat } = require('../client');
const { handleMessages, GreetingsHandler, commands } = require('../client');
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
  logger: logger.child({ module: 'baileys' }),
  browser: Browsers.ubuntu('Firefox'),
  emitOwnEvents: false,
  version: [2, 3000, 1015901307],
  generateHighQualityLinkPreview: true,
  syncFullHistory: false,
  downloadHistory: false,
  fireQueries: false,
  getMessage: async (key) => {
   const message = await loadMessage(key.id);
   return message ? message.message : { conversation: null };
  },
  shouldSyncHistoryMessage: () => false,
  shouldSyncMetaData: () => false,
 });
 const handleConnection = async ({ connection, lastDisconnect }) => {
  if (connection === 'open') {
   const msg = `FX-BOT ${require('../package.json').version}\nPrefix: ${config.HANDLERS.replace(/[\[\]]/g, '')}\nPlugins: ${commands.length}\nMode: ${config.WORK_TYPE}`;
   console.log('Connected\n' + msg);
   await client.sendMessage(client.user.id, { text: '```' + msg + '```' });
  }
  if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
   console.log('Reconnecting...');
   await delay(10000);
   connect();
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
 await conn.sendMessage(conn.user.id, { text: '```' + errorText + '```' });
};

module.exports = { connect };
