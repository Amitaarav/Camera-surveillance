const https = require('https');
const fs = require('fs');

const url = 'https://viratdata.org/video/VIRAT_S_010204_05_000856_000890.mp4';
const path = 'c:\\Users\\USER\\Desktop\\100xBootcamp\\100xDevs\\Projects\\Camera-survilance\\camera-survilance\\infra\\sample.mp4';

const file = fs.createWriteStream(path);
https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download completed');
  });
}).on('error', (err) => {
  fs.unlink(path, () => {});
  console.error('Error downloading:', err.message);
});
