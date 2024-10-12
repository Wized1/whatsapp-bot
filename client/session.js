const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const BASE_URL = 'https://session-manager-x9wf.onrender.com';

const getSession = async (accessKey) => {
 const response = await axios.get(`${BASE_URL}/download/${accessKey}`, {
  responseType: 'arraybuffer',
 });

 const zipFileName = `downloaded_${accessKey}.zip`;
 const zipFilePath = path.join(__dirname, zipFileName);
 fs.writeFileSync(zipFilePath, response.data);

 const zip = new AdmZip(zipFilePath);
 const extractedFolder = path.join(__dirname, '../lib/session');

 let sessionCreated = false;
 if (!fs.existsSync(extractedFolder)) {
  fs.mkdirSync(extractedFolder);
  sessionCreated = true;
 }

 const extractedFiles = zip.getEntries();
 if (extractedFiles.length === 0) {
  console.log('Session created (empty folder)');
  return;
 }

 let anyFileReplaced = false;
 for (const entry of extractedFiles) {
  const existingFilePath = path.join(extractedFolder, entry.entryName);
  const extractedContent = entry.getData().toString('utf8');

  if (fs.existsSync(existingFilePath)) {
   if (entry.entryName === 'creds.json' || entry.entryName.startsWith('app') || entry.entryName.startsWith('app-state')) {
    const existingContent = fs.readFileSync(existingFilePath, 'utf8');
    if (existingContent !== extractedContent) {
     anyFileReplaced = true;
     fs.writeFileSync(existingFilePath, extractedContent);
    }
   }
  } else {
   anyFileReplaced = true;
   fs.writeFileSync(existingFilePath, extractedContent);
  }
 }

 if (sessionCreated) {
  console.log('Session created');
 } else if (anyFileReplaced) {
  console.log('Session partially updated');
 } else {
  console.log('Session skipped (no changes needed)');
 }

 fs.unlinkSync(zipFilePath);
};

module.exports = getSession;
