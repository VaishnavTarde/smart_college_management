const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const Club = require(path.join(__dirname, 'server', 'src', 'models', 'Club'));
const ClubActivity = require(path.join(__dirname, 'server', 'src', 'models', 'ClubActivity'));

const migrateActivities = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const clubs = await Club.find({ 'activities.0': { $exists: true } });
        console.log(`Clubs to migrate: ${clubs.length}`);

        for (const club of clubs) {
            console.log(`Migrating ${club.activities.length} activities for club: ${club.name}`);

            for (const act of club.activities) {
                // Create new activity doc
                await ClubActivity.create({
                    club: club._id,
                    name: act.name,
                    date: act.date,
                    type: act.type,
                    summary: act.summary,
                    image: '' // Default empty
                });
            }

            // Optional: clear old array? No, let's keep it for safety for now, or clear it to avoid confusion?
            // User said "all past activity is deleted", they want it "stored separately".
            // Let's NOT delete from old array yet, just copy.
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
