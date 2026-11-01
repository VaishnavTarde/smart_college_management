const mongoose = require('mongoose');

const PlacementResourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title'],
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
    },
    information: {
        type: String,
    },
    icon: {
        type: String,
        required: [true, 'Please provide an icon name'],
        default: 'BookOpen'
    },
    link: {
        type: String,
        default: '#'
    }
}, { timestamps: true });

module.exports = mongoose.model('PlacementResource', PlacementResourceSchema);
