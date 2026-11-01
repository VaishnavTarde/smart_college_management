const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        required: true,
        trim: true,
    },
    entity: {
        type: String,
        required: true,
        trim: true,
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
