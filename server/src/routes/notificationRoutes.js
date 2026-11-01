const express = require('express');
const { getNotifications, markAsRead, markAllAsRead, triggerReminders } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.post('/test-reminders', triggerReminders);

module.exports = router;
