const { commands, bot } = require('./plugins_manager');
module.exports = {
 Base: require('./base'),
 Message: require('./message'),
 ReplyMessage: require('./message_reply'),
 SessionManager: require('./session_manager'),
 GroupManager: require('./group_manager'),
 GreetingsHandler: require('./group_greetings'),
 commands,
 bot,
};
