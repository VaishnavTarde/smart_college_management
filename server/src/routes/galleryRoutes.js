const express = require('express');
const { getPhotos, addPhoto, deletePhoto } = require('../controllers/galleryController');

const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(getPhotos)
    .post(protect, authorize('teacher', 'admin'), addPhoto);

router.route('/:id')
    .delete(protect, authorize('teacher', 'admin'), deletePhoto);

module.exports = router;
