const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/HP/OneDrive/Desktop/CMS_MP/server/.env' });
const Club = require('c:/Users/HP/OneDrive/Desktop/CMS_MP/server/src/models/Club');

const checkLegacyData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const clubs = await Club.find({ 'activities.0': { $exists: true } });
        console.log(`Clubs with legacy activities: ${clubs.length}`);

        clubs.forEach(club => {
            console.log(`Club: ${club.name}, Activities: ${club.activities.length}`);
        });

        if (clubs.length === 0) {
            console.log("No legacy data found.");
        }

        process.exit();
    } catch (err) {
        console.error("Check Failed:", err);
        process.exit(1);
    }
};

checkLegacyData();
