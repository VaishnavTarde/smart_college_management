const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subjects: [String],
    weakSubjects: [String],
    examDate: Date,
    hoursPerDay: Number,
    planData: {
        type: Object, // Will store the JSON returned by Gemini
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
