const mongoose = require('mongoose');

const ClubActivitySchema = new mongoose.Schema({
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Club',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Please provide an activity name']
    },
    date: {
        type: String, // Keeping as string for flexibility in formatting, or could be Date
        required: [true, 'Please provide a date']
    },
    type: {
        type: String,
        default: 'Event'
    },
    summary: {
        type: String,
        required: [true, 'Please provide a summary']
    },
    image: {
        type: String,
        default: '' // URL for the image
    }
}, { timestamps: true });

module.exports = mongoose.model('ClubActivity', ClubActivitySchema);
