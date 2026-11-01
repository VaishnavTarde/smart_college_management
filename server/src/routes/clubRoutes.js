const express = require('express');
const { getClubs, getClub, createClub, updateClub, joinClub, removeMember, addMember, getMembers, getActivities, addActivity, updateActivity, deleteActivity, updateMemberStatus } = require('../controllers/clubController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(getClubs)
    .post(protect, authorize('teacher', 'admin'), createClub);

router.route('/:id')
    .get(getClub)
    .put(protect, authorize('teacher', 'admin'), updateClub);

router.route('/:id/join')
    .post(protect, joinClub);

router.route('/:id/members')
    .get(getMembers)
    .post(protect, authorize('teacher', 'admin'), addMember);

router.route('/:id/members/:memberId')
    .put(protect, authorize('teacher', 'admin'), updateMemberStatus)
    .delete(protect, authorize('teacher', 'admin'), removeMember);

router.route('/:id/activities')
    .get(getActivities)
    .post(protect, authorize('teacher', 'admin'), addActivity);

router.route('/:id/activities/:activityId')
    .put(protect, authorize('teacher', 'admin'), updateActivity)
    .delete(protect, authorize('teacher', 'admin'), deleteActivity);

module.exports = router;
