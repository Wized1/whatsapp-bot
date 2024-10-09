const { get } = require('axios');
const { ensureDir, createWriteStream, remove } = require('fs-extra');
const { join } = require('path');
const unzipper = require('unzipper'); // Ensure you have this imported
const config = require('../config');
const fs = require('fs');

class SessionManager {
  constructor() {
    this.id = config.SESSION_ID.replace(/^Session~/, '').trim();
    if (!this.id) {
      throw new Error('Session ID is empty');
    }
    this.zipPath = join(__dirname, `session_${this.id}.zip`);
    this.dirPath = join(__dirname, '../lib/session');
  }

  async createSession() {
    await ensureDir(this.dirPath);
    await this.downloadSession();
    await this.extractSession();
    await this.cleanup();
    console.log('Session Success');
  }

  async downloadSession() {
    const response = await get(`https://session-manager-x9wf.onrender.com/download/${this.id}`, {
      responseType: 'stream',
    });
    const writeStream = createWriteStream(this.zipPath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  async extractSession() {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(this.zipPath);
      readStream
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          const outputPath = join(this.dirPath, entry.path);
          const shouldExtract = this.shouldExtractFile(entry.path);

          if (shouldExtract) {
            const writeStream = createWriteStream(outputPath);

            entry
              .pipe(writeStream)
              .on('finish', () => {})
              .on('error', (error) => {
                console.error(`Failed to extract ${entry.path}:`, error);
                reject(error);
              });
          } else {
            entry.autodrain();
          }
        })
        .on('close', resolve)
        .on('error', reject);
    });
  }

  shouldExtractFile(fileName) {
    return fileName === 'creds.json' || (fileName.startsWith('app-state') && fileName.endsWith('.json'));
  }

  async cleanup() {
    await remove(this.zipPath);
  }
}

module.exports = SessionManager;
