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

 if (!fs.existsSync(extractedFolder)) {
  fs.mkdirSync(extractedFolder);
 }

 const extractedFiles = zip.getEntries();
 let filesExtracted = 0;

 for (const entry of extractedFiles) {
  if (entry.entryName === 'creds.json' || entry.entryName.startsWith('app-state')) {
   const filePath = path.join(extractedFolder, entry.entryName);
   const content = entry.getData().toString('utf8');

   if (fs.existsSync(filePath)) {
    const existingContent = fs.readFileSync(filePath, 'utf8');
    if (existingContent !== content) {
     fs.writeFileSync(filePath, content);
     filesExtracted++;
    }
   } else {
    fs.writeFileSync(filePath, content);
    filesExtracted++;
   }
  }
 }

 if (filesExtracted > 0) {
  console.log(`session updated`);
 } else {
  console.log('session skipped');
 }

 fs.unlinkSync(zipFilePath);
};

module.exports = getSession;
