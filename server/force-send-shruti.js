require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
// const Slider = require('./src/models/Slider'); // Temporarily comment out Slider to isolate Event issue
const { sendEventReminder } = require('./src/services/emailService');

const uri = process.env.MONGO_URI;

async function run() {
    try {
        console.log('Connecting...');
        await mongoose.connect(uri);
        console.log('Connected.');

        const user = await User.findOne({ name: { $regex: 'Shruti', $options: 'i' } });
        if (!user) {
            console.log('User not found');
            process.exit(0);
        }
        console.log(`User: ${user.email}`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fourDaysFromNow = new Date(today);
        fourDaysFromNow.setDate(today.getDate() + 4);

        console.log('Fetching events...');
        const events = await Event.find({
            date: { $gte: today, $lte: fourDaysFromNow }
        });
        console.log(`Events found: ${events.length}`);

        for (const event of events) {
            console.log(`Sending for: ${event.title}`);
            const daysLeft = Math.ceil((new Date(event.date) - today) / (1000 * 60 * 60 * 24));

            await sendEventReminder(user.email, event.title, daysLeft, 'event', {
                date: new Date(event.date).toLocaleDateString(),
                time: new Date(event.date).toLocaleTimeString(),
                venue: event.venue,
                image: 'https://via.placeholder.com/600x400', // Hardcoded for safety
                club: 'TEST',
                type: 'General'
            });
            console.log(`Sent to ${user.email}`);
        }

        await mongoose.disconnect();
        console.log('Done.');
    } catch (e) {
        console.error(e);
    }
}

run();
