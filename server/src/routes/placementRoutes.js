const express = require('express');
const {
    getPlacements,
    getPlacement,
    createPlacement,
    updatePlacement,
    deletePlacement,
    getPlacementResources,
    createPlacementResource,
    updatePlacementResource,
    deletePlacementResource
} = require('../controllers/placementController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/resources')
    .get(getPlacementResources)
    .post(protect, authorize('teacher', 'admin'), createPlacementResource);

router.route('/resources/:id')
    .put(protect, authorize('teacher', 'admin'), updatePlacementResource)
    .delete(protect, authorize('teacher', 'admin'), deletePlacementResource);

router.route('/')
    .get(getPlacements)
    .post(protect, authorize('admin', 'teacher'), createPlacement); // Admin and Teacher can post

router.route('/:id')
    .get(getPlacement)
    .put(protect, authorize('admin', 'teacher'), updatePlacement)
    .delete(protect, authorize('admin', 'teacher'), deletePlacement);

module.exports = router;
