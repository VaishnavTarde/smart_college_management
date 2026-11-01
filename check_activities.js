const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/HP/OneDrive/Desktop/CMS_MP/server/.env' });
const ClubActivity = require('c:/Users/HP/OneDrive/Desktop/CMS_MP/server/src/models/ClubActivity');

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const count = await ClubActivity.countDocuments();
        console.log(`Total ClubActivities: ${count}`);

        if (count > 0) {
            const activities = await ClubActivity.find().limit(5);
            console.log("Sample Activities:", JSON.stringify(activities, null, 2));
        }

        process.exit();
    } catch (err) {
        console.error("DB Check Failed:", err);
        process.exit(1);
    }
};

checkDB();
