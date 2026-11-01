const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema({
    facultyId: {
        type: String,
        required: [true, 'Please provide a unique faculty ID'],
        unique: true,
        trim: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    name: {
        type: String,
        required: [true, 'Please provide faculty name'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide faculty email'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    department: {
        type: String,
        required: [true, 'Please provide department'],
        trim: true,
    },
    designation: {
        type: String,
        default: 'Assistant Professor',
        trim: true,
    },
    subjects: [{
        type: String,
        trim: true,
    }],
    workingDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    workingHours: {
        startTime: {
            type: String,
            default: '09:00',
        },
        endTime: {
            type: String,
            default: '17:00',
        },
    },
    officeLocation: {
        type: String,
        default: 'TBA',
        trim: true,
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'],
        default: 'ACTIVE',
    },
}, { timestamps: true });

module.exports = mongoose.model('Faculty', FacultySchema);
