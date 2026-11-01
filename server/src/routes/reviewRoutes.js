const express = require('express');
const { getEventReviews, addReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/:eventId').get(getEventReviews).post(protect, addReview);

module.exports = router;
