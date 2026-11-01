const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    leaveType: {
        type: String,
        enum: ['CASUAL', 'SICK', 'EARNED', 'DUTY'],
        default: 'CASUAL',
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
    },
    reason: {
        type: String,
        required: true,
        trim: true,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

module.exports = mongoose.model('Leave', LeaveSchema);
