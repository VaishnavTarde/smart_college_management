const mongoose = require('mongoose');

const EventReviewSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: [true, 'Please add a comment'],
        maxlength: 500
    }
}, { timestamps: true });

// Prevent user from submitting more than one review per event
EventReviewSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('EventReview', EventReviewSchema);
