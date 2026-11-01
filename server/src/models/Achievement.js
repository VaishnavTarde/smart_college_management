const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Club',
        required: true
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    studentEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    department: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    eventName: {
        type: String,
        required: true,
        trim: true
    },
    rank: {
        type: String,
        required: true,
        default: 'Participation'
    },
    certificateId: {
        type: String,
        required: true,
        unique: true
    },
    issuedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for faster searching
AchievementSchema.index({ studentEmail: 1 });
AchievementSchema.index({ club: 1 });
AchievementSchema.index({ certificateId: 1 });

module.exports = mongoose.model('Achievement', AchievementSchema);
