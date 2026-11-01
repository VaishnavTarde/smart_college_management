const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { chat, generateClubFAQ } = require('../controllers/aiController');

router.post('/chat', chat);
router.post('/generate-club-faq', protect, authorize('teacher', 'admin'), generateClubFAQ);

module.exports = router;
