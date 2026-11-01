require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const Slider = require('./src/models/Slider');

const uri = process.env.MONGO_URI;

async function checkUserAndEvents() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // 1. Check User
        const user = await User.findOne({ name: { $regex: 'Shruti', $options: 'i' } });
        if (user) {
            console.log(`Found User: ${user.name} (${user.email}) - Role: ${user.role}`);
        } else {
            console.log('User "Shruti" NOT found.');
        }

        // 2. Check Upcoming Events (next 4 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fourDaysFromNow = new Date(today);
        fourDaysFromNow.setDate(today.getDate() + 4);

        const events = await Event.find({
            date: { $gte: today, $lte: fourDaysFromNow }
        });

        const sliders = await Slider.find({ isEventBanner: true });
        const upcomingSliders = sliders.filter(s => {
            if (!s.eventDate) return false;
            const d = new Date(s.eventDate);
            return d >= today && d <= fourDaysFromNow;
        });

        console.log(`Upcoming Standard Events: ${events.length}`);
        console.log(`Upcoming Slider Events: ${upcomingSliders.length}`);

        if (events.length === 0 && upcomingSliders.length === 0) {
            console.log('CONCLUSION: No emails sent because there are NO upcoming events.');
        } else {
            console.log('CONCLUSION: There are events. Emails SHOULD have been sent.');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkUserAndEvents();
