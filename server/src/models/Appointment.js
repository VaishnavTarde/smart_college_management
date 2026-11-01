const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    startTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
        required: true,
    },
    purpose: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'],
        default: 'PENDING',
    },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
