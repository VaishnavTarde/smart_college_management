const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Explicitly load .env from server directory BEFORE requiring app code
const envPath = path.resolve(__dirname, '.env');
const logFile = path.resolve(process.cwd(), 'manual_trigger_log.txt');

// Clear log file content at start
try { fs.writeFileSync(logFile, ''); } catch (e) { }

const log = (...args) => {
    const output = args.map(arg => {
        if (arg instanceof Error) {
            return arg.stack || arg.message || arg;
        } else if (typeof arg === 'object') {
            return JSON.stringify(arg, null, 2);
        }
        return arg;
    }).join(' ');

    // Write to file
    try {
        fs.appendFileSync(logFile, output + '\n');
    } catch (e) {
        // ignore
    }
    // Write to stdout
    process.stdout.write(output + '\n');
};

console.log = log;
console.error = log;

log(`Loading .env from: ${envPath}`);
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
    log('Dotenv error: ' + dotenvResult.error);
}

log('Environment Variables Check:');
log('MONGO_URI: ' + (process.env.MONGO_URI ? 'SET' : 'UNSET'));
log('EMAIL_USER: ' + (process.env.EMAIL_USER ? 'SET' : 'UNSET'));
log('EMAIL_PASS: ' + (process.env.EMAIL_PASS ? 'SET' : 'UNSET'));

// Register models and load jobs AFTER env vars are loaded
require('./src/models/Club');
const { runDailyReminders } = require('./src/jobs/cronJobs');

const trigger = async () => {
    try {
        log('Connecting to MongoDB...');
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is undefined. Check .env file.");
        }
        await mongoose.connect(process.env.MONGO_URI);
        log('MongoDB Connected.');

        log('Triggering Daily Reminders (Manual Override)...');

        const result = await runDailyReminders(true); // true = manual run

        log('Result: ' + JSON.stringify(result, null, 2));
    } catch (error) {
        log('Error executing manual trigger: ' + (error.stack || error));
    } finally {
        log('Closing connection...');
        await mongoose.connection.close();
        process.exit();
    }
};

trigger();
