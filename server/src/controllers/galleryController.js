const Gallery = require('../models/Gallery');

// @desc    Get all photos
// @route   GET /api/gallery
// @access  Public
exports.getPhotos = async (req, res) => {
    try {
        const photos = await Gallery.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: photos.length, data: photos });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Add a photo
// @route   POST /api/gallery
// @access  Public (for now, or Protected if headers sent)
exports.addPhoto = async (req, res) => {
    try {
        const { title, url, size } = req.body;

        const photo = await Gallery.create({
            title,
            url,
            size
        });

        res.status(201).json({ success: true, data: photo });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete a photo
// @route   DELETE /api/gallery/:id
// @access  Public (for now)
exports.deletePhoto = async (req, res) => {
    try {
        const photo = await Gallery.findById(req.params.id);

        if (!photo) {
            return res.status(404).json({ success: false, error: 'Photo not found' });
        }

        await photo.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
