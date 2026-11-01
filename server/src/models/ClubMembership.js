const mongoose = require('mongoose');

const ClubMembershipSchema = new mongoose.Schema({
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Club',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Form Data
    name: {
        type: String,
        required: true
    },
    studentId: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Prevent duplicate joining
ClubMembershipSchema.index({ club: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('ClubMembership', ClubMembershipSchema);
