const Discussion = require('../models/Discussion');

// @desc    Get messages for a club
// @route   GET /api/discussions/:clubId
// @access  Protected
const getClubMessages = async (req, res) => {
    try {
        const messages = await Discussion.find({ clubId: req.params.clubId }).sort({ createdAt: 1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get community messages (global)
// @route   GET /api/discussions/community/all
// @access  Protected
const getCommunityMessages = async (req, res) => {
    try {
        const messages = await Discussion.find({ clubId: { $exists: false } }).sort({ createdAt: 1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Post a message (Club or Community)
// @route   POST /api/discussions
// @access  Protected
const postMessage = async (req, res) => {
    try {
        const { clubId, message, isAnonymous } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        const newMessage = await Discussion.create({
            clubId: clubId || undefined, // If null/empty, it's a community message
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            message,
            isAnonymous
        });

        res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update a message
// @route   PUT /api/discussions/:id
// @access  Protected
const putMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const messageId = req.params.id;

        let discussion = await Discussion.findById(messageId);

        if (!discussion) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Check ownership
        if (discussion.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized to edit this message' });
        }

        // Check if message is older than 5 minutes
        const messageTime = new Date(discussion.createdAt).getTime();
        const currentTime = Date.now();
        const timeDiff = (currentTime - messageTime) / 1000 / 60; // in minutes

        if (timeDiff > 5) {
            return res.status(400).json({ success: false, error: 'Messages can only be edited within 5 minutes of posting.' });
        }

        discussion = await Discussion.findByIdAndUpdate(
            messageId,
            { message, isEdited: true },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: discussion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const messageId = req.params.id;
        const discussion = await Discussion.findById(messageId);

        if (!discussion) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Check ownership
        if (discussion.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized to delete this message' });
        }

        // Check time limit (5 minutes)
        const messageTime = new Date(discussion.createdAt).getTime();
        const currentTime = Date.now();
        const timeDiff = (currentTime - messageTime) / 1000 / 60; // in minutes

        if (timeDiff > 5) {
            return res.status(400).json({ success: false, error: 'Messages can only be deleted within 5 minutes of posting.' });
        }

        // Soft delete
        discussion.isDeleted = true;
        discussion.message = "This message was deleted";
        await discussion.save();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    getClubMessages,
    getCommunityMessages,
    postMessage,
    putMessage,
    deleteMessage
};
