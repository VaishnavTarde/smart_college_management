const express = require('express');
const router = express.Router();
const { 
    uploadAchievements, 
    getClubAchievements, 
    getStudentAchievements, 
    deleteAchievement,
    deleteAllClubAchievements 
} = require('../controllers/achievementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/upload', protect, authorize('teacher', 'admin'), uploadAchievements);
router.get('/club/:clubId', getClubAchievements);
router.get('/my', protect, getStudentAchievements);
router.delete('/club/:clubId', protect, authorize('teacher', 'admin'), deleteAllClubAchievements);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteAchievement);

module.exports = router;
