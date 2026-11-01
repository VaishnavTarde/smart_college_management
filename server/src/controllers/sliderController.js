const Slider = require('../models/Slider');
const User = require('../models/User'); // For sending emails
const Event = require('../models/Event');
const Club = require('../models/Club');
const { sendNewEventAnnouncement } = require('../services/emailService');

// @desc    Get all slides
// @route   GET /api/slider
// @access  Public
exports.getSlides = async (req, res) => {
    try {
        const slides = await Slider.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: slides.length, data: slides });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Add a slide
// @route   POST /api/slider
// @access  Private (Teacher/Admin)
exports.addSlide = async (req, res) => {
    try {
        const { title, url, isEventBanner, eventDate, eventEndDate, venue, description, clubName } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'Image URL is required' });
        }

        const slide = await Slider.create({
            title,
            url,
            isEventBanner,
            eventDate,
            eventEndDate,
            venue,
            description,
            clubName,
            user: req.user ? req.user.id : null
        });

        // Only send emails AND link to events if it's explicitly an Event Banner
        if (isEventBanner) {
            // 1. Automatically create an Event in the Events database
            let clubId = undefined;
            let customOrg = clubName;
            
            if (clubName) {
                // Try to find if this clubName matches an actual registered club
                const foundClub = await Club.findOne({ name: new RegExp('^' + clubName.trim() + '$', 'i') });
                if (foundClub) {
                    clubId = foundClub._id;
                    customOrg = undefined;
                }
            }

            try {
                await Event.create({
                    title: title || 'Slider Event',
                    description: description || 'No description provided.',
                    date: eventDate || new Date(),
                    endDate: eventEndDate || null,
                    venue: venue || 'TBA',
                    category: 'Tech', // Default
                    club: clubId,
                    customOrganizer: customOrg
                });
                console.log('[SliderController] Successfully created linked Event for banner.');
            } catch (eventErr) {
                console.error('[SliderController] Failed to auto-create Event:', eventErr.message);
            }

            // 2. Asynchronously fetch students and send emails (don't block the response)
            User.find({ role: 'student' }).select('email').then(async (students) => {
                console.log(`[SliderController] Sending new event announcement to ${students.length} students...`);
                for (const student of students) {
                    // Send individually or implement batching based on Resend limits
                    await sendNewEventAnnouncement(student.email, {
                        title: title || 'New Campus Event',
                        url,
                        eventDate,
                        venue,
                        description,
                        clubName
                    });
                }
            }).catch(err => console.error('[SliderController] Failed to send slider emails:', err));
        }

        res.status(201).json({ success: true, data: slide });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete a slide
// @route   DELETE /api/slider/:id
// @access  Private (Teacher/Admin)
exports.deleteSlide = async (req, res) => {
    try {
        const slide = await Slider.findById(req.params.id);

        if (!slide) {
            return res.status(404).json({ success: false, error: 'Slide not found' });
        }

        await slide.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
