const { Client } = require('pg');
require('dotenv').config();

const createDb = async () => {
    // Connect to default 'postgres' database to create new db
    // Failing fallback: try 'template1' if postgres doesn't exist, but 'postgres' is standard.
    const connectionString = process.env.DATABASE_URL.replace(/\/lifetracker$/, '/postgres');

    console.log(`Connecting to ${connectionString} to create DB...`);

    const client = new Client({
        connectionString: connectionString,
        ssl: false
    });

    try {
        await client.connect();
        // Check if exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'lifetracker'");
        if (res.rowCount === 0) {
            console.log("Creating database 'lifetracker'...");
            await client.query('CREATE DATABASE lifetracker');
            console.log("✅ Database 'lifetracker' created successfully.");
        } else {
            console.log("ℹ️ Database 'lifetracker' already exists.");
        }
    } catch (e) {
        console.error("❌ Error creating database:", e);
    } finally {
        await client.end();
    }
};

createDb();
