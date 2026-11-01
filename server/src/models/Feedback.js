const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema(
    {
        // Event reference (required)
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Event ID is required'],
        },
        eventName: {
            type: String,
            required: [true, 'Event name is required'],
            trim: true,
        },

        // Student info (optional — supports anonymous feedback)
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        studentName: {
            type: String,
            trim: true,
            default: 'Anonymous',
        },

        // Core feedback fields
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        message: {
            type: String,
            required: [true, 'Feedback message is required'],
            trim: true,
            maxlength: [1000, 'Message cannot exceed 1000 characters'],
        },

        // AI-generated sentiment label (populated by analytics endpoint)
        sentimentLabel: {
            type: String,
            enum: ['Positive', 'Neutral', 'Negative', null],
            default: null,
        },
    },
    { timestamps: true }
);

// Index for fast per-event queries
FeedbackSchema.index({ eventId: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
