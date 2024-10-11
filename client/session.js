const { get } = require('axios');
const { ensureDir, createWriteStream, remove } = require('fs-extra');
const { join } = require('path');
const unzipper = require('unzipper');
const config = require('../config');
const fs = require('fs');

/**
 * @class SessionManager
 * @description Manages session operations in the chat application
 */
class SessionManager {
 constructor() {
  this.id = config.SESSION_ID.replace(/^Session~/, '').trim();
  if (!this.id) throw new Error('Session ID is empty');
  this.zipPath = join(__dirname, `session_${this.id}.zip`);
  this.dirPath = join(__dirname, '../lib/session');
 }

 /**
  * @returns {Promise<void>}
  */
 async createSession() {
  await ensureDir(this.dirPath);
  await this.downloadSession();
  await this.extractSession();
  await this.cleanup();
  console.log('Session Success');
 }

 /**
  * @returns {Promise<void>}
  */
 async downloadSession() {
  const response = await get(`https://session-manager-x9wf.onrender.com/download/${this.id}`, { responseType: 'stream' });
  return new Promise((resolve, reject) => {
   response.data.pipe(createWriteStream(this.zipPath)).on('finish', resolve).on('error', reject);
  });
 }

 /**
  * @returns {Promise<void>}
  */
 async extractSession() {
  return new Promise((resolve, reject) => {
   fs
    .createReadStream(this.zipPath)
    .pipe(unzipper.Parse())
    .on('entry', (entry) => {
     const outputPath = join(this.dirPath, entry.path);
     this.shouldExtractFile(entry.path)
      ? entry.pipe(createWriteStream(outputPath)).on('error', (error) => {
         console.error(`Failed to extract ${entry.path}:`, error);
         reject(error);
        })
      : entry.autodrain();
    })
    .on('close', resolve)
    .on('error', reject);
  });
 }

 /**
  * @param {string} fileName - The name of the file to check
  * @returns {boolean} Whether the file should be extracted
  */
 shouldExtractFile(fileName) {
  return fileName === 'creds.json' || (fileName.startsWith('app-state') && fileName.endsWith('.json'));
 }

 /**
  * @returns {Promise<void>}
  */
 async cleanup() {
  await remove(this.zipPath);
 }
}

module.exports = SessionManager;
