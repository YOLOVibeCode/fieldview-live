#!/usr/bin/env node
/**
 * Quick Mux Stream Test
 * Creates a test live stream to verify Mux credentials work
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testMux() {
  console.log('\x1b[34m================================\x1b[0m');
  console.log('\x1b[34mMux Live Stream Test\x1b[0m');
  console.log('\x1b[34m================================\x1b[0m');
  console.log('');

  const tokenId = await question('Enter your MUX_TOKEN_ID: ');
  const tokenSecret = await question('Enter your MUX_TOKEN_SECRET: ');
  
  console.log('');
  console.log('\x1b[34mCreating test live stream...\x1b[0m');
  console.log('');

  try {
    // Import Mux SDK dynamically
    const Mux = require('@mux/mux-node');
    
    const muxClient = new Mux({
      tokenId: tokenId.trim(),
      tokenSecret: tokenSecret.trim(),
    });

    // Create a test live stream
    const stream = await muxClient.video.liveStreams.create({
      playback_policies: ['public'], // Public for testing
      reconnect_window: 60,
      new_asset_settings: {
        playback_policies: ['public'],
      },
    });

    console.log('\x1b[32m✓ Success!\x1b[0m Live stream created!');
    console.log('');
    console.log('\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('\x1b[32mYour Mux credentials work! ✅\x1b[0m');
    console.log('\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('');
    console.log('\x1b[34m📹 Test Stream Details:\x1b[0m');
    console.log('┌─────────────────────────────────────────────────┐');
    console.log('│ RTMP URL (for streaming):                       │');
    console.log(`│ \x1b[36mrtmp://global-live.mux.com:443/app\x1b[0m`);
    console.log('│                                                 │');
    console.log('│ Stream Key:                                     │');
    console.log(`│ \x1b[36m${stream.stream_key}\x1b[0m`);
    console.log('│                                                 │');
    console.log('│ Playback URL:                                   │');
    console.log(`│ \x1b[36mhttps://stream.mux.com/${stream.playback_ids[0].id}.m3u8\x1b[0m`);
    console.log('│                                                 │');
    console.log('│ Stream ID:                                      │');
    console.log(`│ \x1b[36m${stream.id}\x1b[0m`);
    console.log('└─────────────────────────────────────────────────┘');
    console.log('');
    console.log('\x1b[33m🎬 Quick Test:\x1b[0m');
    console.log('  1. Configure OBS/Veo with the RTMP URL and Stream Key above');
    console.log('  2. Start streaming');
    console.log('  3. View at the Playback URL');
    console.log('');
    console.log('\x1b[33m🗑️  Cleanup:\x1b[0m');
    console.log('  Delete this test stream from: https://dashboard.mux.com/');
    console.log('  Or keep it for testing!');
    console.log('');
    console.log('\x1b[32m✅ You can now use these credentials in Railway!\x1b[0m');
    console.log('');

  } catch (error) {
    console.log('\x1b[31m✗ Failed\x1b[0m');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    console.log('\x1b[31mYour Mux credentials appear to be invalid.\x1b[0m');
    console.log('');
    console.log('Please check:');
    console.log('  1. Token ID is correct');
    console.log('  2. Token Secret is correct');
    console.log('  3. Tokens have proper permissions');
    console.log('');
    console.log('Get credentials from: https://dashboard.mux.com/settings/access-tokens');
    process.exit(1);
  }

  rl.close();
}

testMux().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
