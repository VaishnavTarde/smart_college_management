const mongoose = require('mongoose');
require('dotenv').config(); // Picks up .env in server dir by default or we specify
const Club = require('./src/models/Club');
const ClubActivity = require('./src/models/ClubActivity');

const migrateActivities = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const clubs = await Club.find({ 'activities.0': { $exists: true } });
        console.log(`Clubs to migrate: ${clubs.length}`);

        for (const club of clubs) {
            console.log(`Migrating ${club.activities.length} activities for club: ${club.name}`);

            for (const act of club.activities) {
                // Check duplicate?
                // Simple check: same name and club
                const exists = await ClubActivity.findOne({ club: club._id, name: act.name });
                if (!exists) {
                    await ClubActivity.create({
                        club: club._id,
                        name: act.name,
                        date: act.date,
                        type: act.type,
                        summary: act.summary,
                        image: ''
                    });
                }
            }
            console.log("Migrated.");
        }

        console.log("Migration Complete.");
        process.exit();
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
};

migrateActivities();
