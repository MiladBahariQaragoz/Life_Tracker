// Helper script to convert service-account.json to a single-line string
// Usage: node convert-service-account.js

const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ service-account.json not found in server directory');
    console.log('Please download your service account JSON from Google Cloud Console');
    console.log('and save it as server/service-account.json');
    process.exit(1);
}

try {
    const serviceAccount = fs.readFileSync(serviceAccountPath, 'utf8');

    // Validate it's valid JSON
    JSON.parse(serviceAccount);

    // Convert to single line (remove newlines and extra spaces)
    const singleLine = JSON.stringify(JSON.parse(serviceAccount));

    console.log('✅ Converted service-account.json to single-line format\n');
    console.log('📋 Copy the following line and add it to your .env file:\n');
    console.log(`GOOGLE_SERVICE_ACCOUNT_JSON='${singleLine}'`);
    console.log('\n🔐 For your deployment platform (DigitalOcean, Heroku, etc.):');
    console.log('   - Environment Variable Name: GOOGLE_SERVICE_ACCOUNT_JSON');
    console.log('   - Environment Variable Value: (paste the value above without quotes)\n');

} catch (error) {
    console.error('❌ Error reading or parsing service-account.json:', error.message);
    process.exit(1);
}
