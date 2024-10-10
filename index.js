const express = require('express');
const path = require('path');
const config = require('./config');
const { delay } = require('baileys');
const { connect, getandRequirePlugins } = require('./lib');
const { requireJS } = require('./utils');
const { SessionManager } = require('./client');
const app = express();
const PORT = process.env.PORT || '8000';
async function makeSession() {
 const session = new SessionManager();
 await session.createSession();
}
async function initialize() {
 await requireJS(path.join(__dirname, '/lib/database/'));
 await config.DATABASE.sync();
 await requireJS(path.join(__dirname, '/plugins/'));
 await getandRequirePlugins();
 return await connect();
}

app.listen(PORT, async () => {
 await makeSession();
 await delay(5000);
 return await initialize();
});
