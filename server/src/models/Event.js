const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide an event title'],
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: [true, 'Please provide a date'],
        validate: {
            validator: function(value) {
                if (!value) return true;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return value >= today;
            },
            message: 'Date cannot be in the past'
        }
    },
    endDate: {
        type: Date,
        required: false,
        validate: {
            validator: function(value) {
                if (!value) return true;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return value >= today;
            },
            message: 'End date cannot be in the past'
        }
    },
    venue: {
        type: String,
        required: [true, 'Please provide a venue'],
    },
    category: {
        type: String,
        enum: ['Tech', 'Non-Tech'],
        default: 'Tech'
    },
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Club',
        required: false,
    },
    customOrganizer: {
        type: String,
    },
    registeredStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    registrationLink: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
