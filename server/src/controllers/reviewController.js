const EventReview = require('../models/EventReview');
const Event = require('../models/Event');

// @desc    Get reviews for an event
// @route   GET /api/reviews/:eventId
// @access  Public
exports.getEventReviews = async (req, res) => {
    try {
        const reviews = await EventReview.find({ event: req.params.eventId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Add a review
// @route   POST /api/reviews/:eventId
// @access  Private
exports.addReview = async (req, res) => {
    try {
        req.body.event = req.params.eventId;
        req.body.user = req.user.id;
        req.body.userName = req.user.name;

        const event = await Event.findById(req.params.eventId);

        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        // Check if user already reviewed
        const existingReview = await EventReview.findOne({
            event: req.params.eventId,
            user: req.user.id
        });

        if (existingReview) {
            return res.status(400).json({ success: false, error: 'You have already reviewed this event' });
        }

        const review = await EventReview.create(req.body);

        res.status(201).json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
