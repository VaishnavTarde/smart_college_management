const mongoose = require('mongoose');

const EventRegistrationSchema = new mongoose.Schema(
    {
        // Event reference
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Event ID is required'],
        },

        // Student details (manually entered by admin/teacher)
        studentName: {
            type: String,
            required: [true, 'Student name is required'],
            trim: true,
        },
        studentEmail: {
            type: String,
            required: [true, 'Student email is required'],
            trim: true,
            lowercase: true,
        },
        rollNumber: {
            type: String,
            required: [true, 'Roll number is required'],
            trim: true,
        },
        department: {
            type: String,
            trim: true,
            default: '',
        },
        year: {
            type: String,
            trim: true,
            default: '',
        },
        division: {
            type: String,
            trim: true,
            default: '',
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },

        // Attendance tracking
        attendance: {
            type: String,
            enum: ['present', 'absent', 'pending'],
            default: 'pending',
        },

        // Who added this registration
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Optional: platform user link (if they have an account)
        linkedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        notes: {
            type: String,
            trim: true,
            default: '',
        },
    },
    { timestamps: true }
);

// Prevent duplicate roll number per event
EventRegistrationSchema.index({ event: 1, rollNumber: 1 }, { unique: true });

// Index for fast per-event queries
EventRegistrationSchema.index({ event: 1, attendance: 1 });

module.exports = mongoose.model('EventRegistration', EventRegistrationSchema);
