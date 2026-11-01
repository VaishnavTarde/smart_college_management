const mongoose = require('mongoose');

const SliderSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        default: 'Slide Image'
    },
    url: {
        type: String,
        required: [true, 'Please provide an image URL'],
    },
    // Optional Event Details
    isEventBanner: {
        type: Boolean,
        default: false
    },
    eventDate: {
        type: Date,
        validate: {
            validator: function(value) {
                if (!value) return true;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return value >= today;
            },
            message: 'Event date cannot be in the past'
        }
    },
    eventEndDate: {
        type: Date,
        validate: {
            validator: function(value) {
                if (!value) return true;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return value >= today;
            },
            message: 'Event end date cannot be in the past'
        }
    },
    venue: {
        type: String
    },
    description: {
        type: String
    },
    clubName: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true });

module.exports = mongoose.model('Slider', SliderSchema);
