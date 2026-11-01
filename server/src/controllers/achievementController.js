const Achievement = require('../models/Achievement');
const Club = require('../models/Club');
const crypto = require('crypto');

// @desc    Upload bulk achievements
// @route   POST /api/achievements/upload
// @access  Private (Coordinator/Admin)
exports.uploadAchievements = async (req, res) => {
    try {
        const { clubId, achievements } = req.body;

        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ success: false, message: 'Club not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && club.coordinator.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this club' });
        }

        if (!Array.isArray(achievements) || achievements.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid achievement data' });
        }

        // Use bulk operations to avoid duplicates and update existing records
        const savedRecords = [];
        for (const item of achievements) {
            const query = {
                studentEmail: item.studentEmail.toLowerCase(),
                eventName: item.eventName,
                club: clubId
            };
            
            // Check if record exists to maintain certificateId if updating
            let existing = await Achievement.findOne(query);
            
            if (existing) {
                // Update existing
                const updated = await Achievement.findOneAndUpdate(query, { ...item }, { new: true });
                savedRecords.push(updated);
            } else {
                // Create new with unique ID
                const certSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
                const yearStr = new Date().getFullYear();
                const clubSlug = club.name.substring(0, 3).toUpperCase();
                const certificateId = `CC-${clubSlug}-${yearStr}-${certSuffix}`;
                
                const newRecord = await Achievement.create({
                    ...item,
                    club: clubId,
                    certificateId
                });
                savedRecords.push(newRecord);
            }
        }

        res.status(201).json({
            success: true,
            count: savedRecords.length,
            data: savedRecords
        });

    } catch (error) {
        console.error('Upload Achievements Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get achievements for a club
// @route   GET /api/achievements/club/:clubId
// @access  Public
exports.getClubAchievements = async (req, res) => {
    try {
        const achievements = await Achievement.find({ club: req.params.clubId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: achievements.length, data: achievements });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get achievements for current student
// @route   GET /api/achievements/my
// @access  Private (Student)
exports.getStudentAchievements = async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(400).json({ success: false, message: 'User email not found' });
        }

        const achievements = await Achievement.find({ studentEmail: req.user.email.toLowerCase() })
            .populate('club', 'name image')
            .sort({ issuedAt: -1 });

        res.status(200).json({ success: true, data: achievements });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Delete achievement
// @route   DELETE /api/achievements/:id
// @access  Private (Coordinator/Admin)
exports.deleteAchievement = async (req, res) => {
    try {
        const achievement = await Achievement.findById(req.params.id);
        if (!achievement) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        const club = await Club.findById(achievement.club);
        if (req.user.role !== 'admin' && club.coordinator.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await achievement.deleteOne();
        res.status(200).json({ success: true, message: 'Record removed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Delete all achievements for a club
// @route   DELETE /api/achievements/club/:clubId
// @access  Private (Coordinator/Admin)
exports.deleteAllClubAchievements = async (req, res) => {
    try {
        const club = await Club.findById(req.params.clubId);
        if (!club) {
            return res.status(404).json({ success: false, message: 'Club not found' });
        }

        // Authorization check
        if (req.user.role !== 'admin' && club.coordinator.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const result = await Achievement.deleteMany({ club: req.params.clubId });
        res.status(200).json({ 
            success: true, 
            message: `Successfully removed ${result.deletedCount} records`,
            count: result.deletedCount 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
