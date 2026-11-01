const Event = require('../models/Event');
const Club = require('../models/Club');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find().populate('club', 'name image');
        res.status(200).json({ success: true, count: events.length, data: events });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('club', 'name image');

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Teacher/Admin)
exports.createEvent = async (req, res) => {
    try {
        const event = await Event.create(req.body);

        // Add event to club's events array
        if (req.body.club) {
            const club = await Club.findById(req.body.club);
            if (club) {
                club.events.push(event._id);
                await club.save();
            }
        }

        res.status(201).json({
            success: true,
            data: event,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Teacher/Admin)
exports.updateEvent = async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        event = await Event.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: event });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Teacher/Admin)
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
