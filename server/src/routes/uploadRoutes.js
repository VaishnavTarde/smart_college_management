const express = require('express');
const router = express.Router();
const { uploadMiddleware, uploadImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

// Wrapper to catch middleware errors (like Cloudinary auth failure)
const uploadWithErrorHandler = (req, res, next) => {
    uploadMiddleware(req, res, function (err) {
        if (err) {
            console.error("Upload Middleware Error:", err);
            return res.status(500).json({
                success: false,
                message: "Image Upload Failed",
                error: err.message
            });
        }
        next();
    });
};

// @route   POST /api/upload
// @desc    Upload an image
// @access  Private (Registered Users)
router.post('/', uploadWithErrorHandler, uploadImage);

module.exports = router;
