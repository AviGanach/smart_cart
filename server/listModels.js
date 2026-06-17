/**
 * Run this to see which Gemini models are available for your API key:
 *   node listModels.js
 */
require('dotenv').config({ path: '../.env' });
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log('🔍 Fetching available Gemini models...\n');

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.error) {
      console.error('❌ API Error:', json.error.message);
      return;
    }
    const models = json.models || [];
    console.log(`✅ Found ${models.length} models:\n`);
    models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .forEach(m => {
        console.log(`  📦 ${m.name.replace('models/', '')}`);
        console.log(`     Display: ${m.displayName}`);
        console.log(`     Description: ${(m.description || '').slice(0, 80)}`);
        console.log('');
      });
  });
}).on('error', err => console.error('❌ Request failed:', err.message));
