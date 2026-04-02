import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
    try {
        console.log("Reading schema.sql...");
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        
        console.log("Executing schema.sql on database...");
        await pool.query(schema);
        
        console.log("Database initialized successfully!");
    } catch (err) {
        console.error("Error initializing database:", err);
    } finally {
        await pool.end();
    }
}

initDB();
