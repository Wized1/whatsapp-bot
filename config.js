const { Sequelize } = require('sequelize');
require('dotenv').config();

const toBool = (x) => x === 'true';
const DATABASE_URL = process.env.DATABASE_URL || './database.db';
const isSQLite = DATABASE_URL === './database.db';

let sequelize;

if (isSQLite) {
 sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DATABASE_URL,
  logging: false,
 });
} else {
 sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  ssl: {
   require: true,
   rejectUnauthorized: false,
  },
 });
}

module.exports = {
 SESSION_ID: process.env.SESSION_ID || '',
 PREFIX: process.env.HANDLER || '[.,/]',
 LOGS: toBool(process.env.LOGS) ?? true,
 WARN_COUNT: 3,
 SUDO: process.env.SUDO || '',
 MODE: process.env.MODE || 'private',
 AUTO_READ: toBool(process.env.AUTO_READ) || false,
 AUTO_STATUS_READ: toBool(process.env.AUTO_STATUS_READ) || false,
 DELETED_LOG: toBool(process.env.DELETED_LOG) || false,
 ANTI_DELETE: toBool(process.env.ANTI_DELETE) || false,
 DATABASE_URL,
 DATABASE: sequelize,
};
