const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    venue: {
        type: String,
        default: 'TBA'
    },
    description: {
        type: String,
    }
}, { timestamps: true });

module.exports = mongoose.model('Exam', ExamSchema);
