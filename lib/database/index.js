const { getAntiLink, setAntiLink, deleteAntiLink } = require('./antilink');
const { addAntiWord, removeAntiWord, getAntiWords } = require('./antiword');
const { getAutoReactSettings, setAutoReactSettings } = require('./autoreact');
const { getFilter, setFilter, deleteFilter } = require('./filters');
const { getPausedChats, savePausedChat, deleteAllPausedChats } = require('./chats');
const { installPlugin, getandRequirePlugins, removePlugin } = require('./plugins');
const { saveMessage, loadMessage, saveChat, getName } = require('./store');
const { getWarns, saveWarn, resetWarn } = require('./warn');
const { setMessage, getMessage, delMessage, toggleStatus, getStatus } = require('./greetings');

module.exports = {
  getAntiLink,
  setAntiLink,
  deleteAntiLink,
  addAntiWord,
  removeAntiWord,
  getAntiWords,
  getAutoReactSettings,
  setAutoReactSettings,
  getFilter,
  setFilter,
  deleteFilter,
  getPausedChats,
  savePausedChat,
  deleteAllPausedChats,
  installPlugin,
  getandRequirePlugins,
  removePlugin,
  saveMessage,
  loadMessage,
  saveChat,
  getName,
  getWarns,
  saveWarn,
  resetWarn,
  setMessage,
  getMessage,
  delMessage,
  toggleStatus,
  getStatus,
};
