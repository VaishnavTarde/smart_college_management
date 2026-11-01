const mongoose = require('mongoose');

const PlacementSchema = new mongoose.Schema({
    company: {
        type: String,
        required: [true, 'Please provide a company name'],
    },
    role: {
        type: String,
        required: [true, 'Please provide a role'],
    },
    description: {
        type: String
    },
    eligibility: {
        type: String,
        required: [true, 'Please provide eligibility criteria'],
    },
    driveDate: {
        type: Date,
        required: [true, 'Please provide a drive date'],
    },
    salary: {
        type: String
    },
    applyLink: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Placement', PlacementSchema);
