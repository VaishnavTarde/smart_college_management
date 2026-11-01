const express = require('express');
const router = express.Router();
const { getSlides, addSlide, deleteSlide } = require('../controllers/sliderController');
// const { protect, authorize } = require('../middleware/authMiddleware'); // Assuming you have auth middleware

const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(getSlides)
    .post(protect, authorize('teacher', 'admin'), addSlide);

router.route('/:id')
    .delete(protect, authorize('teacher', 'admin'), deleteSlide);

module.exports = router;
