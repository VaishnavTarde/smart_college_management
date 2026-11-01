const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const {
    submitFeedback,
    getAllFeedback,
    getFeedbackByEvent,
    deleteFeedback,
    getEventAnalytics,
} = require('../controllers/feedbackController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ── Helper: Optional JWT Auth ─────────────────────────────────
// Attaches req.user if token is valid, but does NOT block the request if missing
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token && process.env.JWT_SECRET) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = await User.findById(decoded.id).select('-password');
            }
        }
    } catch (_) {
        // Invalid / expired token — continue as anonymous
    }
    next();
}

// ── Public Routes ─────────────────────────────────────────────
// Submit feedback — anonymous allowed; name auto-fills if token present
router.post('/submit', optionalAuth, submitFeedback);

// Get all feedback for a specific event — public read
router.get('/event/:eventId', getFeedbackByEvent);

// ── Protected Routes (teacher / admin) ───────────────────────
router.get('/all', protect, authorize('teacher', 'admin'), getAllFeedback);
router.get('/analytics/:eventId', protect, authorize('teacher', 'admin'), getEventAnalytics);

// ── Admin-only Routes ─────────────────────────────────────────
router.delete('/:id', protect, authorize('admin'), deleteFeedback);

module.exports = router;
