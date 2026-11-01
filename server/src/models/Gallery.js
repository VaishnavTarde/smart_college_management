const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        trim: true
    },
    url: {
        type: String,
        required: [true, 'Please provide an image URL'],
    },
    size: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
    },
    user: { // Who uploaded it? (Optional for now, but good practice)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', GallerySchema);
