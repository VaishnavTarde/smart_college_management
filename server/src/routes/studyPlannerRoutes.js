const express = require('express');
const router = express.Router();
const multer = require('multer');
const { generatePlan, getPlan, analyzeDocuments, analyzePYQ } = require('../controllers/studyPlannerController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for memory storage (file buffer)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file max
});

// Timetable Planner routes
router.post('/generate', protect, generatePlan);
router.get('/my-plan', protect, getPlan);

// Document & PYQ Analyzer routes (accept up to 10 files)
router.post('/analyze-documents', protect, upload.array('files', 10), analyzeDocuments);
router.post('/analyze-pyq', protect, upload.array('files', 10), analyzePYQ);

module.exports = router;
