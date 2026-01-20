
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("No API Key found in .env");
        return;
    }

    console.log("Checking models with key ending in...", process.env.GEMINI_API_KEY.slice(-4));

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Note: listModels is on the GoogleGenerativeAI instance? 
        // Actually, sometimes it's distinct or requires a different call structure in node.
        // Let's check documentation or try standard getGenerativeModel extraction.
        // Actually the SDK might not expose listModels directly on the main class easily in all versions.
        // But let's try assuming standard usage or just try a fetch if SDK fails.
        // Wait, the error message literally said: "Call ListModels"

        // Using raw fetch to be safe and dependency-agnostic regarding SDK versions
        const key = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("\nAVAILABLE MODELS:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
                }
            });
        } else {
            console.log("Error listing models:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("Failed to list models:", e);
    }
}

listModels();
