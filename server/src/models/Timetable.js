const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true,
    },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
    },
    date: {
        type: Date,
        required: false,
    },
    startTime: {
        type: String,
        required: [true, 'Please provide start time (HH:MM)'],
    },
    endTime: {
        type: String,
        required: [true, 'Please provide end time (HH:MM)'],
    },
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    className: {
        type: String,
        required: true,
        trim: true,
    },
    room: {
        type: String,
        required: true,
        trim: true,
    },
    activityType: {
        type: String,
        enum: ['LECTURE', 'LAB', 'MEETING', 'EXAM', 'EVENT', 'DUTY'],
        default: 'LECTURE',
    },
}, { timestamps: true });

module.exports = mongoose.model('Timetable', TimetableSchema);
