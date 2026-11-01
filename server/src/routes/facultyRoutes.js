const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getFacultyAvailability,
    getMyAvailability,
    getSingleFacultyAvailability,
    searchFaculty,
    createOrUpdateFacultyProfile,
    getFacultyList,
    addTimetableSlot,
    getFacultyTimetable,
    applyLeave,
    getLeaves,
    updateLeaveStatus,
    bookAppointment,
    getAppointments,
    updateAppointmentStatus,
    createSubstituteRequest,
    getSubstituteRequests,
    findSubstitutes,
    assignSubstitute,
    getAdminAnalytics,
    getAuditLogs,
} = require('../controllers/facultyController');

// ----------------------------------------------------------------------------
// Availability Routes
// ----------------------------------------------------------------------------
router.get('/availability', protect, getFacultyAvailability);
router.get('/my-availability', protect, authorize('teacher', 'admin'), getMyAvailability);
router.get('/search', protect, searchFaculty);
router.get('/:id/availability', protect, getSingleFacultyAvailability);

// ----------------------------------------------------------------------------
// Faculty Profile Routes
// ----------------------------------------------------------------------------
router.get('/', protect, getFacultyList);
router.post('/', protect, authorize('admin'), createOrUpdateFacultyProfile);

// ----------------------------------------------------------------------------
// Timetable Routes
// ----------------------------------------------------------------------------
router.post('/timetable', protect, authorize('teacher', 'admin'), addTimetableSlot);
router.get('/:id/timetable', protect, getFacultyTimetable);

// ----------------------------------------------------------------------------
// Leave Routes
// ----------------------------------------------------------------------------
router.post('/leave', protect, authorize('teacher', 'admin'), applyLeave);
router.get('/leave', protect, getLeaves);
router.patch('/leave/:id/status', protect, authorize('admin'), updateLeaveStatus);

// ----------------------------------------------------------------------------
// Appointment Routes
// ----------------------------------------------------------------------------
router.post('/appointments', protect, bookAppointment);
router.get('/appointments', protect, getAppointments);
router.patch('/appointments/:id/status', protect, authorize('teacher', 'admin'), updateAppointmentStatus);

// ----------------------------------------------------------------------------
// Substitute Request & Ranking Routes
// ----------------------------------------------------------------------------
router.post('/substitute-requests', protect, authorize('teacher', 'admin'), createSubstituteRequest);
router.get('/substitute-requests', protect, authorize('teacher', 'admin'), getSubstituteRequests);
router.post('/substitute-finder', protect, authorize('teacher', 'admin'), findSubstitutes);
router.post('/substitute-assign', protect, authorize('admin'), assignSubstitute);

// ----------------------------------------------------------------------------
// Admin Analytics & Audit Log Routes
// ----------------------------------------------------------------------------
router.get('/analytics', protect, authorize('admin'), getAdminAnalytics);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);

module.exports = router;
