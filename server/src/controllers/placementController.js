const Placement = require('../models/Placement');
const PlacementResource = require('../models/PlacementResource');

// @desc    Get all placements
// @route   GET /api/placements
// @access  Public
exports.getPlacements = async (req, res) => {
    try {
        const placements = await Placement.find().sort({ driveDate: 1 });
        res.status(200).json({ success: true, count: placements.length, data: placements });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get single placement
// @route   GET /api/placements/:id
// @access  Public
exports.getPlacement = async (req, res) => {
    try {
        const placement = await Placement.findById(req.params.id);

        if (!placement) {
            return res.status(404).json({ message: 'Placement not found' });
        }

        res.status(200).json({ success: true, data: placement });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create new placement
// @route   POST /api/placements
// @access  Private (Admin)
exports.createPlacement = async (req, res) => {
    try {
        const placement = await Placement.create(req.body);

        res.status(201).json({
            success: true,
            data: placement,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update placement
// @route   PUT /api/placements/:id
// @access  Private (Admin)
exports.updatePlacement = async (req, res) => {
    try {
        let placement = await Placement.findById(req.params.id);

        if (!placement) {
            return res.status(404).json({ message: 'Placement not found' });
        }

        placement = await Placement.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: placement });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete placement
// @route   DELETE /api/placements/:id
// @access  Private (Admin)
exports.deletePlacement = async (req, res) => {
    try {
        const placement = await Placement.findById(req.params.id);

        if (!placement) {
            return res.status(404).json({ message: 'Placement not found' });
        }

        await Placement.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
// @desc    Get all placement resources
// @route   GET /api/placements/resources
// @access  Public
exports.getPlacementResources = async (req, res) => {
    try {
        const resources = await PlacementResource.find().sort({ createdAt: 1 });
        res.status(200).json({ success: true, count: resources.length, data: resources });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create new placement resource
// @route   POST /api/placements/resources
// @access  Private (Teacher/Admin)
exports.createPlacementResource = async (req, res) => {
    try {
        const resource = await PlacementResource.create(req.body);
        res.status(201).json({ success: true, data: resource });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update placement resource
// @route   PUT /api/placements/resources/:id
// @access  Private (Teacher/Admin)
exports.updatePlacementResource = async (req, res) => {
    try {
        let resource = await PlacementResource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        resource = await PlacementResource.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: resource });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete placement resource
// @route   DELETE /api/placements/resources/:id
// @access  Private (Teacher/Admin)
exports.deletePlacementResource = async (req, res) => {
    try {
        const resource = await PlacementResource.findByIdAndDelete(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
