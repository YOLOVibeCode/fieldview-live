// Quick fix for stream URL typo
// Run with: node scripts/fix-stream-url-direct.js

const https = require('https');

const eventId = 'clzql4gzv0008mr5d3kqw2v85'; // We'll get this from the API

// First, get the correct event ID
const apiUrl = 'https://api.fieldview.live/api/public/direct/tchs/events/soccer-20260116-jv/bootstrap';

https.get(apiUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Current stream URL:', json.streamUrl);
    console.log('\nThe stream URL has a typo: "ahttps://" instead of "https://"');
    console.log('Correct URL should be:', json.streamUrl.replace('ahttps://', 'https://'));
    console.log('\nOr better yet, use the new working stream:');
    console.log('https://stream.mux.com/9b8FqDtpFAnkUvQUhVNrs00Kq00icRnOqmL7LELXPOUKk.m3u8');
  });
}).on('error', err => console.error(err));
