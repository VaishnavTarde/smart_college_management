const mongoose = require('mongoose');

const JobLogSchema = new mongoose.Schema({
    jobName: {
        type: String,
        required: true,
        unique: true
    },
    lastRun: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    }
}, { timestamps: true });

module.exports = mongoose.model('JobLog', JobLogSchema);
