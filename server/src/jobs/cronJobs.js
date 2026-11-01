const cron = require('node-cron');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const JobLog = require('../models/JobLog');
const User = require('../models/User');
const Slider = require('../models/Slider');
const { sendEventReminder } = require('../services/emailService');

const runDailyReminders = async (isManual = false) => {
    console.log(`[Cron] Attempting to run daily event reminder job (Manual: ${isManual})...`);

    // Check if already ran today (idempotency)
    if (!isManual) {
        try {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const lastLog = await JobLog.findOne({ jobName: 'dailyEventReminder' });

            if (lastLog) {
                console.log(`[Cron] Last run found: ${lastLog.lastRun} (Status: ${lastLog.status})`);
                if (lastLog.lastRun >= startOfToday) {
                    console.log('[Cron] Daily reminder already ran today. Skipping.');
                    return { success: true, message: 'Already ran today' };
                }
            } else {
                console.log('[Cron] No previous job log found. Proceeding with first run.');
            }
        } catch (err) {
            console.error('[Cron] Error checking job log:', err);
        }
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today (00:00:00)
        const fourDaysFromNow = new Date(today);
        fourDaysFromNow.setDate(today.getDate() + 4);

        console.log(`[Cron] Fetching events between ${today.toISOString()} and ${fourDaysFromNow.toISOString()}...`);

        // 1. Find standard events happening within the next 4 days
        const upcomingEvents = await Event.find({
            date: {
                $gte: today,
                $lte: fourDaysFromNow
            }
        }).populate('club');

        // 2. Find Slider Events (isEventBanner = true) happening within the next 4 days
        const sliders = await Slider.find({});
        const upcomingSliderEvents = sliders.filter(slide => {
            if (!slide.isEventBanner || !slide.eventDate) return false;
            const slideDate = new Date(slide.eventDate);
            return slideDate >= today && slideDate <= fourDaysFromNow;
        });

        console.log(`[Cron] Found ${upcomingEvents.length} standard events and ${upcomingSliderEvents.length} slider events.`);

        // Combine events, avoiding duplicates by Title
        const processedTitles = new Set();
        const finalEventsList = [];

        // Add Standard Events first
        for (const event of upcomingEvents) {
            processedTitles.add(event.title.toLowerCase().trim());
            finalEventsList.push({
                title: event.title,
                date: event.date,
                venue: event.venue,
                clubName: event.club ? event.club.name : (event.customOrganizer || 'Campus Connect'),
                image: null,
                type: event.category || 'General',
                description: event.description,
                registrationLink: event.registrationLink,
                isSliderOnly: false,
                originalEvent: event
            });
        }

        // Add Slider Events if not already present
        for (const slide of upcomingSliderEvents) {
            const cleanTitle = slide.title.toLowerCase().trim();
            if (!processedTitles.has(cleanTitle)) {
                processedTitles.add(cleanTitle);
                finalEventsList.push({
                    title: slide.title,
                    date: slide.eventDate,
                    venue: slide.venue || 'TBA',
                    clubName: slide.clubName || 'Campus Connect',
                    image: slide.url,
                    type: 'General',
                    description: slide.description || '',
                    registrationLink: null,
                    isSliderOnly: true,
                    originalEvent: null
                });
            }
        }

        if (finalEventsList.length === 0) {
            console.log('[Cron] No upcoming events found. Updating job log and exiting.');
            // Still mark as run so we don't keep checking today
            await JobLog.findOneAndUpdate(
                { jobName: 'dailyEventReminder' },
                { lastRun: new Date(), status: 'success' },
                { upsert: true, new: true }
            );
            return { success: true, count: 0 };
        }

        // Fetch ALL users to send reminders to
        const allUsers = await User.find({});
        console.log(`[Cron] Sending reminders for ${finalEventsList.length} events to ${allUsers.length} users...`);

        for (const eventItem of finalEventsList) {
            // Calculate days remaining by comparing dates at MIDNIGHT
            const eventDateMidnight = new Date(eventItem.date);
            eventDateMidnight.setHours(0, 0, 0, 0);

            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);

            const timeDiff = eventDateMidnight.getTime() - todayMidnight.getTime();
            const daysRemaining = Math.round(timeDiff / (1000 * 3600 * 24));

            // Determine Poster Image
            let posterImage = eventItem.image;
            if (!posterImage) {
                const matchingSlide = sliders.find(s => s.title && s.title.toLowerCase() === eventItem.title.toLowerCase());
                posterImage = matchingSlide ? matchingSlide.url : (eventItem.originalEvent && eventItem.originalEvent.club && eventItem.originalEvent.club.image ? eventItem.originalEvent.club.image : 'https://via.placeholder.com/600x400?text=Event+Coming+Soon');
            }

            let emailCount = 0;
            // Send to ALL users
            for (const user of allUsers) {
                if (user.email) {
                    // Send Email
                    const eventDate = new Date(eventItem.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const eventTime = new Date(eventItem.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                    try {
                        await sendEventReminder(user.email, eventItem.title, daysRemaining, 'event', {
                            date: eventDate,
                            time: eventTime,
                            venue: eventItem.venue,
                            image: posterImage,
                            club: eventItem.clubName,
                            type: eventItem.type,
                            description: eventItem.description,
                            registrationLink: eventItem.registrationLink
                        });
                        emailCount++;
                    } catch (emailErr) {
                        console.error(`[Cron] Failed to send email to ${user.email} for ${eventItem.title}:`, emailErr.message);
                    }

                    // Create In-App Notification (skip for now to focus on email, or keep it)
                    try {
                        await Notification.create({
                            recipient: user._id,
                            title: `Upcoming Event: ${eventItem.title}`,
                            message: `${eventItem.title} is starting in ${daysRemaining} days! Check your email for details.`,
                            type: 'info',
                            relatedLink: `/events`
                        });
                    } catch (noteErr) {
                        // ignore notification errors
                    }
                }
            }
            console.log(`[Cron] Sent ${emailCount} emails for event: ${eventItem.title}`);
        }

        // Log successful run
        await JobLog.findOneAndUpdate(
            { jobName: 'dailyEventReminder' },
            { lastRun: new Date(), status: 'success' },
            { upsert: true, new: true }
        );

        console.log(`[Cron] Successfully processed reminders for ${upcomingEvents.length} events.`);
        return { success: true, count: upcomingEvents.length };
    } catch (error) {
        console.error('[Cron] Error in daily cron job:', error);
        return { success: false, error };
    }
};

const checkMissedReminders = async () => {
    console.log('[Cron] Checking for missed daily reminders...');
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        console.log(`[Cron] Current server time: ${now.toLocaleTimeString()} (Hour: ${currentHour}, Minute: ${currentMinute})`);

        // Check if it's past 07:00 AM
        if (currentHour >= 7) {
            console.log('[Cron] Server started past scheduled time (07:00 AM). Verifying execution status...');
            // We call runDailyReminders WITHOUT arguments (so isManual=false).
            // This ensures it performs the idempotency check internally and only runs ONCE per day.
            await runDailyReminders();
        } else {
            console.log('[Cron] Too early for daily reminder catch-up (Wait for 07:00 AM schedule).');
        }
    } catch (error) {
        console.error('[Cron] Error checking missed reminders:', error);
    }
};

const setupCronJobs = () => {
    console.log('[Cron] Initializing cron schedules...');
    // Run every day at 07:00 AM: 0 7 * * *
    cron.schedule('0 7 * * *', () => {
        console.log('[Cron] Scheduled job triggered.');
        runDailyReminders();
    });
};

module.exports = { setupCronJobs, runDailyReminders, checkMissedReminders };

