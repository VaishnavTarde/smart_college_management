const express = require('express');
const router = express.Router();

const {
    getRegistrationsByEvent,
    addRegistration,
    bulkAddRegistrations,
    updateRegistration,
    deleteRegistration,
    markAttendance,
    getRegistrationStats,
    exportRegistrations,
} = require('../controllers/registrationController');

const { protect, authorize } = require('../middleware/authMiddleware');

// All registration routes are protected — teacher/admin only
const guard = [protect, authorize('teacher', 'admin')];

// ── Event-scoped routes ──────────────────────────────────────────────
// GET  /api/registrations/event/:eventId       → list all for event
// POST /api/registrations/event/:eventId       → add single registration
// POST /api/registrations/event/:eventId/bulk  → add multiple at once
router.get('/event/:eventId', ...guard, getRegistrationsByEvent);
router.post('/event/:eventId', ...guard, addRegistration);
router.post('/event/:eventId/bulk', ...guard, bulkAddRegistrations);

// ── Stats & Export ───────────────────────────────────────────────────
// GET /api/registrations/stats/:eventId        → attendance + dept breakdown
// GET /api/registrations/export/:eventId       → flat JSON for Excel export
router.get('/stats/:eventId', ...guard, getRegistrationStats);
router.get('/export/:eventId', ...guard, exportRegistrations);

// ── Single-record routes ─────────────────────────────────────────────
// PUT   /api/registrations/:id                 → update student details
// DELETE /api/registrations/:id               → remove registration
// PATCH  /api/registrations/:id/attendance    → mark present/absent/pending
router.put('/:id', ...guard, updateRegistration);
router.delete('/:id', ...guard, deleteRegistration);
router.patch('/:id/attendance', ...guard, markAttendance);

module.exports = router;
