const Club = require('../models/Club');
const User = require('../models/User');
const ClubActivity = require('../models/ClubActivity');
const ClubMembership = require('../models/ClubMembership');
const Event = require('../models/Event');

// @desc    Get all clubs
// @route   GET /api/clubs
// @access  Public
exports.getClubs = async (req, res) => {
    try {
        const clubs = await Club.find()
            .populate('coordinator', 'name email')
            .populate('events');
        res.status(200).json({ success: true, count: clubs.length, data: clubs });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get single club
// @route   GET /api/clubs/:id
// @access  Public
exports.getClub = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id)
            .populate('coordinator', 'name email')
            .populate('events');

        if (!club) {
            return res.status(404).json({ message: 'Club not found' });
        }

        res.status(200).json({ success: true, data: club });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create new club
// @route   POST /api/clubs
// @access  Private (Teacher/Admin)
exports.createClub = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        req.body.coordinator = req.user.id;
        const club = await Club.create(req.body);
        res.status(201).json({ success: true, data: club });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Club with this name already exists' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Join a club
// @route   POST /api/clubs/:id/join
// @access  Private (Student)
exports.joinClub = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: 'Club not found' });

        const existingMembership = await ClubMembership.findOne({
            club: req.params.id,
            user: req.user.id
        });

        if (existingMembership) {
            return res.status(400).json({ message: 'You have already submitted an application for this club' });
        }

        const { name, studentId, email, department, year } = req.body;

        await ClubMembership.create({
            club: req.params.id,
            user: req.user.id,
            name,
            studentId,
            email,
            department,
            year,
            status: 'pending'
        });

        res.status(200).json({ success: true, message: 'Joined successfully' });
    } catch (error) {
        console.error("Join Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get club members
// @route   GET /api/clubs/:id/members
// @access  Public (or Protected if needed)
exports.getMembers = async (req, res) => {
    try {
        const members = await ClubMembership.find({ club: req.params.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: members.length, data: members });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Add Member Manually (Teacher/Admin)
// @route   POST /api/clubs/:id/members
// @access  Private (Teacher/Admin)
exports.addMember = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: 'Club not found' });

        if (req.user.role !== 'admin' && club.coordinator.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to add members to this club' });
        }

        const { email, name, studentId, department, year } = req.body;
        if (!email) return res.status(400).json({ message: 'Please provide a student email' });

        const userToAdd = await User.findOne({ email: email.toLowerCase() });
        // If user doesn't exist, we might still want to add them as a 'placeholder' or error. 
        // For strictness, let's require User account.
        if (!userToAdd) {
            return res.status(404).json({ message: 'No registered student found with this email' });
        }

        const existing = await ClubMembership.findOne({ club: club._id, user: userToAdd._id });
        if (existing) {
            return res.status(400).json({ message: 'Student is already a member' });
        }

        const newMember = await ClubMembership.create({
            club: club._id,
            user: userToAdd._id,
            name: name || userToAdd.name,
            email: userToAdd.email,
            studentId: studentId || 'N/A',
            department: department || 'N/A',
            year: year || 'N/A',
            status: 'approved'
        });

        res.status(200).json({ success: true, message: 'Member added successfully', data: newMember });
    } catch (error) {
        console.error("Add Member Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Remove a member from a club
// @route   DELETE /api/clubs/:id/members/:memberId
// @access  Private (Coordinator/Admin)
exports.removeMember = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: 'Club not found' });

        if (club.coordinator.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to remove members from this club' });
        }

        // memberId param can be the ClubMembership _id OR the User _id. Let's try to handle both or strict.
        // The frontend usually sends the _id of the item in the list.
        // If list comes from `ClubMembership.find()`, then _id is the membership ID.
        // Let's assume req.params.memberId is the Membership Document ID.

        const membership = await ClubMembership.findOneAndDelete({
            _id: req.params.memberId,
            club: req.params.id
        });

        // Fallback: If not found by Membership ID, try by User ID (in case frontend sends User ID)
        if (!membership) {
            await ClubMembership.findOneAndDelete({
                user: req.params.memberId,
                club: req.params.id
            });
        }

        res.status(200).json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update club
// @route   PUT /api/clubs/:id
// @access  Private (Coordinator/Admin)
exports.updateClub = async (req, res) => {
    try {
        let club = await Club.findById(req.params.id);

        if (!club) return res.status(404).json({ message: 'Club not found' });

        if (club.coordinator.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this club' });
        }

        // Safe Update: Only allow specific fields
        const {
            name, description, objectives, category,
            facultyCoordinator, studentCoordinator, secretary,
            image, registrationLink, activityLink, infoLink, faqs
        } = req.body;

        const updateFields = {};

        if (name) updateFields.name = name;
        if (description) updateFields.description = description;
        if (category) updateFields.category = category;
        if (objectives) updateFields.objectives = objectives;
        if (facultyCoordinator) updateFields.facultyCoordinator = facultyCoordinator;
        if (studentCoordinator) updateFields.studentCoordinator = studentCoordinator;
        if (secretary) updateFields.secretary = secretary;
        if (image) updateFields.image = image;
        if (registrationLink !== undefined) updateFields.registrationLink = registrationLink;
        if (activityLink !== undefined) updateFields.activityLink = activityLink;
        if (infoLink !== undefined) updateFields.infoLink = infoLink;
        if (faqs !== undefined) updateFields.faqs = faqs;

        // Handle Gallery/Recent Events
        if (req.body.recentEvents) {
            console.log("Updating recentEvents:", req.body.recentEvents.length, "items");
            updateFields.recentEvents = req.body.recentEvents;
        }

        club = await Club.findByIdAndUpdate(req.params.id, { $set: updateFields }, {
            new: true,
            runValidators: true
        })
            .populate('coordinator', 'name email')
            .populate('events');

        res.status(200).json({ success: true, data: club });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all activities for a club
// @route   GET /api/clubs/:id/activities
// @access  Public
exports.getActivities = async (req, res) => {
    try {
        const activities = await ClubActivity.find({ club: req.params.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: activities.length, data: activities });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Add a past activity to a club
// @route   POST /api/clubs/:id/activities
// @access  Private (Coordinator/Admin)
exports.addActivity = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: 'Club not found' });

        if (club.coordinator.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const activity = await ClubActivity.create({
            club: req.params.id,
            ...req.body
        });

        res.status(201).json({ success: true, data: activity });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a past activity
// @route   PUT /api/clubs/:id/activities/:activityId
// @access  Private (Coordinator/Admin)
exports.updateActivity = async (req, res) => {
    try {
        const activity = await ClubActivity.findById(req.params.activityId);
        if (!activity) return res.status(404).json({ message: 'Activity not found' });

        const club = await Club.findById(req.params.id);
        if (club.coordinator.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updatedActivity = await ClubActivity.findByIdAndUpdate(req.params.activityId, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedActivity });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a past activity
// @route   DELETE /api/clubs/:id/activities/:activityId
// @access  Private (Coordinator/Admin)
exports.deleteActivity = async (req, res) => {
    try {
        const activity = await ClubActivity.findById(req.params.activityId);
        if (!activity) return res.status(404).json({ message: 'Activity not found' });

        const club = await Club.findById(req.params.id);
        if (club.coordinator.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await activity.deleteOne();
        res.status(200).json({ success: true, message: 'Activity deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a member's status (Approve/Reject)
// @route   PUT /api/clubs/:id/members/:memberId
// @access  Private (Coordinator/Admin)
exports.updateMemberStatus = async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: 'Club not found' });

        if (club.coordinator.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to manage members of this club' });
        }

        const { status } = req.body;
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const membership = await ClubMembership.findOneAndUpdate(
            { _id: req.params.memberId, club: req.params.id },
            { status },
            { new: true }
        );

        if (!membership) {
            return res.status(404).json({ message: 'Membership not found' });
        }

        res.status(200).json({ success: true, message: `Membership status updated to ${status}`, data: membership });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
