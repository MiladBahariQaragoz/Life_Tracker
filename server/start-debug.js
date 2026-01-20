const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'debug_startup.log');

try {
    fs.writeFileSync(logFile, 'Starting debug server...\n');
    process.env.PORT = 3005; // Try 3005

    // Hook into console.log to capture it
    const originalLog = console.log;
    console.log = (...args) => {
        fs.appendFileSync(logFile, args.join(' ') + '\n');
        originalLog.apply(console, args);
    };

    console.log('Requiring index.js...');
    require('./index.js');
    console.log('Require complete.');
} catch (e) {
    fs.appendFileSync(logFile, 'CRASH: ' + e.message + '\n' + e.stack);
}
