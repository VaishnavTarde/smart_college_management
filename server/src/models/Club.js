const mongoose = require('mongoose');

const ClubSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a club name'],
        unique: true,
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
    },
    objectives: [{
        type: String
    }],
    // Leadership Fields
    facultyCoordinator: {
        type: String,
        default: 'Dr. Faculty Name'
    },
    studentCoordinator: {
        type: String,
        default: 'Student Coordinator'
    },
    secretary: {
        type: String,
        default: 'Student Name'
    },
    // Activity Gallery
    recentEvents: [{
        image: String,
        description: String,
        date: { type: Date, default: Date.now }
    }],
    image: {
        type: String,
        default: 'https://via.placeholder.com/150'
    },
    registrationLink: {
        type: String,
        default: ''
    },
    activityLink: {
        type: String,
        default: ''
    },
    infoLink: {
        type: String,
        default: ''
    },
    faqs: [{
        question: { type: String, required: true },
        answer: { type: String, required: true }
    }],
    coordinator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Teacher or Admin
        required: true,
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for events
ClubSchema.virtual('events', {
    ref: 'Event',
    localField: '_id',
    foreignField: 'club', // Ensure Event model has 'club' field
    justOne: false
});

module.exports = mongoose.model('Club', ClubSchema);
