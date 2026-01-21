const fs = require('fs');
const path = require('path');
const https = require('https');

// Imgur Client ID (public, for anonymous uploads)
const IMGUR_CLIENT_ID = 'YOUR_IMGUR_CLIENT_ID'; // You'll need to get this from imgur.com/account/settings/apps

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'gym_moves');
const OUTPUT_CSV = path.join(__dirname, '..', 'gym_moves_urls.csv');

// Read moves.csv to get the mapping
function parseMovesCSV() {
    const csvPath = path.join(__dirname, '..', 'moves.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim()).slice(1); // Skip header

    const mapping = {};
    lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3) {
            const [pageNum, moveName, group] = parts;
            // Extract page number (e.g., "06:" -> 6)
            const pageIndex = parseInt(pageNum.replace(':', ''));
            mapping[pageIndex] = {
                moveName,
                group,
                pageNum: pageIndex
            };
        }
    });

    return mapping;
}

// For now, generate CSV with placeholder URLs (local paths or future hosted URLs)
function generateCSVWithLocalPaths() {
    console.log('📄 Generating CSV with image paths...');

    const movesMapping = parseMovesCSV();
    const files = fs.readdirSync(IMAGES_DIR)
        .filter(f => f.endsWith('.jpg'))
        .sort();

    const csvRows = ['Page,Move Name,Group,Image URL'];

    files.forEach(file => {
        // Extract page number from filename: ExerciseBook_page-0006.jpg -> 6
        const match = file.match(/page-0*(\d+)\.jpg/);
        if (match) {
            const pageNum = parseInt(match[1]);
            const moveInfo = movesMapping[pageNum];

            if (moveInfo) {
                // Generate URL - this will be your deployed URL
                const imageUrl = `/gym_moves/${file}`;
                // Or for absolute URL when deployed: `https://your-app.ondigitalocean.app/gym_moves/${file}`

                csvRows.push(`${pageNum},${moveInfo.moveName},${moveInfo.group},${imageUrl}`);
            }
        }
    });

    fs.writeFileSync(OUTPUT_CSV, csvRows.join('\n'), 'utf-8');
    console.log(`✅ CSV generated: ${OUTPUT_CSV}`);
    console.log(`📊 Total moves with images: ${csvRows.length - 1}`);
}

// Alternative: Upload to Imgur (requires API key)
async function uploadToImgur(file) {
    return new Promise((resolve, reject) => {
        const imageData = fs.readFileSync(file);
        const base64Image = imageData.toString('base64');

        const data = JSON.stringify({
            image: base64Image,
            type: 'base64'
        });

        const options = {
            hostname: 'api.imgur.com',
            path: '/3/image',
            method: 'POST',
            headers: {
                'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const response = JSON.parse(body);
                    resolve(response.data.link);
                } else {
                    reject(new Error(`Upload failed: ${res.statusCode} ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Main function
async function main() {
    console.log('🚀 Starting image URL generation...');

    // Option 1: Generate CSV with local/deployed paths (recommended)
    generateCSVWithLocalPaths();

    console.log('\n📋 Next steps:');
    console.log('1. The images are in public/gym_moves/ and will be served from your deployed app');
    console.log('2. Update image URLs in the CSV with your deployed URL');
    console.log('3. Import the CSV data into Google Sheets');
    console.log('\nAlternatively, if you want to use Imgur:');
    console.log('1. Get an Imgur Client ID from: https://imgur.com/account/settings/apps');
    console.log('2. Update IMGUR_CLIENT_ID in this script');
    console.log('3. Uncomment the upload code below');
}

main().catch(console.error);
