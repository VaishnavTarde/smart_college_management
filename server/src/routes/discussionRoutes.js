const express = require('express');
const { getClubMessages, postMessage, getCommunityMessages, deleteMessage } = require('../controllers/discussionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all messages for a club (Public or Protected? Let's keep it protected for now so only logged in users see chats)
// Actually, maybe public is fine to View, but Posting needs auth.
// Let's protect both to encourage login.
router.get('/community/all', protect, getCommunityMessages);
router.get('/:clubId', protect, getClubMessages);

// Post a message
router.post('/', protect, postMessage);
router.put('/:id', protect, require('../controllers/discussionController').putMessage);
router.delete('/:id', protect, deleteMessage);

module.exports = router;
