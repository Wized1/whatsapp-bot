const config = require('../config');
var commands = [];

function bot(cmdInfo, func) {
 cmdInfo.function = func;
 cmdInfo.pattern = new RegExp(`^(${config.HANDLERS})\\s*(${cmdInfo.pattern})(?:\\s+(.*))?$`, 'i');
 cmdInfo.dontAddCommandList = cmdInfo.dontAddCommandList || false;
 cmdInfo.fromMe = cmdInfo.fromMe || false;
 cmdInfo.isGroup = cmdInfo.isGroup || false;
 cmdInfo.type = cmdInfo.type || 'misc';
 commands.push(cmdInfo);
 return cmdInfo;
}

module.exports = {
 bot,
 commands,
};
