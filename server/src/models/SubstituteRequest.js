const mongoose = require('mongoose');

const SubstituteRequestSchema = new mongoose.Schema({
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    originalFacultyId: {
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
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    className: {
        type: String,
        trim: true,
    },
    reason: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
        default: 'PENDING',
    },
    assignedFaculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
    },
    recommendedFaculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
    },
}, { timestamps: true });

module.exports = mongoose.model('SubstituteRequest', SubstituteRequestSchema);
