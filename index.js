const express = require('express');
const config = require('./config');
const { connect } = require('./lib');
const { requireJS, toPath, makeSession } = require('./utils');
const { getandRequirePlugins } = require('./db');
const app = express();
const PORT = process.env.PORT || '8000';

async function initialize() {
 await requireJS(toPath('../db/'));
 await config.DATABASE.sync();
 await requireJS(toPath('../source/'));
 await getandRequirePlugins();
 return await connect();
}

app.listen(PORT, async () => {
 await makeSession(config.SESSION_ID);
 return await initialize();
});
