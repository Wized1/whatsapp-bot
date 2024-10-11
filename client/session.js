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

 zip.extractAllTo(extractedFolder, true);

 const extractedFiles = zip.getEntries();
 if (extractedFiles.length === 0) {
  console.log('Session created');
  return;
 }

 let anyFileReplaced = false; // To track if any file was replaced
 for (const entry of extractedFiles) {
  const existingFilePath = path.join(extractedFolder, entry.entryName);
  const extractedContent = entry.getData().toString('utf8');

  if (fs.existsSync(existingFilePath)) {
   const existingContent = fs.readFileSync(existingFilePath, 'utf8');

   if (existingContent !== extractedContent) {
    anyFileReplaced = true; // Mark that a file has been replaced
    fs.writeFileSync(existingFilePath, extractedContent); // Replace the file
   }
  } else {
   anyFileReplaced = true; // Mark that a new file is being added
   fs.writeFileSync(existingFilePath, extractedContent);
  }
 }

 if (sessionCreated) {
  console.log('Session created');
 } else if (anyFileReplaced) {
  console.log('Session replaced');
 } else {
  console.log('Session skipped');
 }

 fs.unlinkSync(zipFilePath);
};
module.exports = getSession;
