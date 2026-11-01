require('dotenv').config();
const mongoose = require('mongoose');
const JobLog = require('./src/models/JobLog');

const uri = process.env.MONGO_URI;

async function checkLog() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const log = await JobLog.findOne({ jobName: 'dailyEventReminder' });
        if (log) {
            console.log('Job Log Found:');
            console.log('Last Run:', log.lastRun);
            console.log('Status:', log.status);

            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            if (log.lastRun >= startOfToday) {
                console.log('CONCLUSION: Job ran today.');
            } else {
                console.log('CONCLUSION: Job DID NOT run today yet.');
            }
        } else {
            console.log('No JobLog found for dailyEventReminder.');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkLog();
