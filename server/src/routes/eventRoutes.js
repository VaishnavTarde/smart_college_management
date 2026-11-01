const express = require('express');
const { getEvents, getEvent, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(getEvents)
    .post(protect, authorize('teacher', 'admin'), createEvent);

router.route('/:id')
    .get(getEvent)
    .put(protect, authorize('teacher', 'admin'), updateEvent)
    .delete(protect, authorize('teacher', 'admin'), deleteEvent);

module.exports = router;
