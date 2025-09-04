// Quick script to test if your Twitter keys are set correctly
require('dotenv').config();

console.log('Checking Twitter API Keys...\n');

const keys = {
  'TWITTER_CONSUMER_KEY': process.env.TWITTER_CONSUMER_KEY,
  'TWITTER_CONSUMER_SECRET': process.env.TWITTER_CONSUMER_SECRET,
  'TWITTER_ACCESS_KEY': process.env.TWITTER_ACCESS_KEY,
  'TWITTER_ACCESS_SECRET': process.env.TWITTER_ACCESS_SECRET,
};

let allKeysPresent = true;

for (const [keyName, keyValue] of Object.entries(keys)) {
  if (keyValue && keyValue.length > 0) {
    console.log(`✅ ${keyName}: Set (${keyValue.substring(0, 5)}...)`);
  } else {
    console.log(`❌ ${keyName}: Missing`);
    allKeysPresent = false;
  }
}

if (allKeysPresent) {
  console.log('\n✨ All Twitter keys are configured!');
  console.log('You can now run: yarn start:dev');
} else {
  console.log('\n⚠️  Some keys are missing. Please check your .env file.');
}

// Clean up
setTimeout(() => {
  const fs = require('fs');
  fs.unlinkSync(__filename);
  console.log('\n(Test script auto-deleted for security)');
}, 100);
