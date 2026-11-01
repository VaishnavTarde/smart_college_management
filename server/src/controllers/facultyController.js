const Faculty = require('../models/Faculty');
const Timetable = require('../models/Timetable');
const Leave = require('../models/Leave');
const Appointment = require('../models/Appointment');
const SubstituteRequest = require('../models/SubstituteRequest');
const AuditLog = require('../models/AuditLog');
const {
    checkFacultyAvailability,
    searchMultipleFacultyAvailability,
    detectScheduleConflict,
    findAndRankSubstitutes,
    timeToMinutes
} = require('../services/availabilityService');

/**
 * Validate HH:MM time format
 */
const isValidTimeFormat = (timeStr) => {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
};

// ============================================================================
// 1. AVAILABILITY CONTROLLERS
// ============================================================================

/**
 * GET /api/faculty/availability
 * Search availability for multiple faculty members or by filters
 */
exports.getFacultyAvailability = async (req, res) => {
    try {
        const { date, startTime, endTime, department, subject, facultyId, facultyName } = req.query;

        if (!date || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Validation Error: date, startTime, and endTime query parameters are required.',
            });
        }

        if (isNaN(new Date(date).getTime())) {
            return res.status(400).json({
                message: 'Validation Error: Invalid date provided.',
            });
        }

        if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
            return res.status(400).json({
                message: 'Validation Error: startTime and endTime must be in HH:MM (24h) format.',
            });
        }

        if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
            return res.status(400).json({
                message: 'Validation Error: endTime must be strictly after startTime.',
            });
        }

        const results = await searchMultipleFacultyAvailability({
            date,
            startTime,
            endTime,
            department,
            subject,
            facultyId,
            facultyName,
        });

        // Enforce student privacy: Sanitize unavailable reasons to "Not available during this time."
        const sanitizedResults = results.map(fac => {
            if (req.user && req.user.role === 'student') {
                if (fac.status === 'UNAVAILABLE') {
                    return {
                        ...fac,
                        details: 'Not available during this time.',
                        reasonCode: 'UNAVAILABLE',
                    };
                }
            }
            return fac;
        });

        return res.status(200).json({
            count: sanitizedResults.length,
            data: sanitizedResults,
        });
    } catch (error) {
        console.error('Error in getFacultyAvailability:', error);
        return res.status(500).json({ message: error.message || 'Server error checking availability' });
    }
};

/**
 * GET /api/faculty/my-availability
 * Get availability status for the currently logged-in teacher from real DB data
 */
exports.getMyAvailability = async (req, res) => {
    try {
        const { date, startTime, endTime } = req.query;

        const targetDate = date || new Date().toISOString().split('T')[0];
        const targetStart = startTime || '09:00';
        const targetEnd = endTime || '17:00';

        if (!isValidTimeFormat(targetStart) || !isValidTimeFormat(targetEnd)) {
            return res.status(400).json({ message: 'Validation Error: Invalid time format (HH:MM required).' });
        }

        // Find Faculty document associated with logged-in user
        const facDoc = await Faculty.findOne({
            $or: [
                { user: req.user._id },
                { email: req.user.email },
            ]
        });

        if (!facDoc) {
            return res.status(404).json({
                message: 'No associated faculty profile found for your account.',
            });
        }

        const result = await checkFacultyAvailability(facDoc, targetDate, targetStart, targetEnd);
        return res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error in getMyAvailability:', error);
        return res.status(500).json({ message: error.message || 'Server error checking my availability' });
    }
};

/**
 * GET /api/faculty/:id/availability
 * Check availability for a specific faculty member
 */
exports.getSingleFacultyAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, startTime, endTime, subject } = req.query;

        if (!date || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Validation Error: date, startTime, and endTime query parameters are required.',
            });
        }

        if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
            return res.status(400).json({
                message: 'Validation Error: startTime and endTime must be in HH:MM format.',
            });
        }

        const result = await checkFacultyAvailability(id, date, startTime, endTime, subject);
        return res.status(200).json({ data: result });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: error.message || 'Server error checking faculty availability' });
    }
};

/**
 * GET /api/faculty/search
 * Search faculty by name, department, or subject
 */
exports.searchFaculty = async (req, res) => {
    try {
        const { query, department, subject } = req.query;
        let filter = { status: 'ACTIVE' };

        if (department) {
            filter.department = new RegExp(department.trim(), 'i');
        }
        if (subject) {
            filter.subjects = { $in: [new RegExp(subject.trim(), 'i')] };
        }
        if (query) {
            const regex = new RegExp(query.trim(), 'i');
            filter.$or = [
                { name: regex },
                { facultyId: regex },
                { department: regex },
                { subjects: { $in: [regex] } },
            ];
        }

        const faculties = await Faculty.find(filter).select('-__v');
        return res.status(200).json({ count: faculties.length, data: faculties });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error searching faculty' });
    }
};

// ============================================================================
// 2. FACULTY PROFILE MANAGEMENT
// ============================================================================

/**
 * POST /api/faculty
 * Create or update faculty profile (Admin only)
 */
exports.createOrUpdateFacultyProfile = async (req, res) => {
    try {
        const {
            facultyId,
            name,
            email,
            department,
            designation,
            subjects,
            workingDays,
            workingHours,
            officeLocation,
            status,
            userId,
        } = req.body;

        if (!facultyId || !name || !email || !department) {
            return res.status(400).json({
                message: 'Validation Error: facultyId, name, email, and department are required.',
            });
        }

        let faculty = await Faculty.findOne({ facultyId });

        const profileData = {
            facultyId,
            name,
            email,
            department,
            designation: designation || 'Assistant Professor',
            subjects: subjects || [],
            workingDays: workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workingHours: workingHours || { startTime: '09:00', endTime: '17:00' },
            officeLocation: officeLocation || 'TBA',
            status: status || 'ACTIVE',
        };

        if (userId) {
            profileData.user = userId;
        }

        if (faculty) {
            faculty = await Faculty.findOneAndUpdate({ facultyId }, profileData, { new: true, runValidators: true });
        } else {
            faculty = await Faculty.create(profileData);
        }

        return res.status(faculty ? 200 : 201).json({ message: 'Faculty profile saved successfully', data: faculty });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error saving faculty profile' });
    }
};

/**
 * GET /api/faculty
 * Get list of all faculty profiles
 */
exports.getFacultyList = async (req, res) => {
    try {
        const faculties = await Faculty.find().select('-__v');
        return res.status(200).json({ count: faculties.length, data: faculties });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error fetching faculty list' });
    }
};

// ============================================================================
// 3. TIMETABLE MANAGEMENT
// ============================================================================

/**
 * POST /api/faculty/timetable
 * Add a timetable slot (Teacher or Admin)
 */
exports.addTimetableSlot = async (req, res) => {
    try {
        const { facultyId, day, date, startTime, endTime, subject, className, room, activityType } = req.body;

        if (!facultyId || !day || !startTime || !endTime || !subject || !className || !room) {
            return res.status(400).json({
                message: 'Validation Error: facultyId, day, startTime, endTime, subject, className, and room are required.',
            });
        }

        if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
            return res.status(400).json({ message: 'Validation Error: Invalid time format (HH:MM required).' });
        }

        // Find faculty doc
        let facDoc = await Faculty.findOne({
            $or: [
                { facultyId },
                ...(facultyId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: facultyId }] : []),
            ]
        });

        if (!facDoc) {
            return res.status(404).json({ message: 'Faculty member not found' });
        }

        const slot = await Timetable.create({
            facultyId: facDoc._id,
            day,
            date: date ? new Date(date) : undefined,
            startTime,
            endTime,
            subject,
            className,
            room,
            activityType: activityType || 'LECTURE',
        });

        return res.status(201).json({ message: 'Timetable slot created successfully', data: slot });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error creating timetable slot' });
    }
};

/**
 * GET /api/faculty/:id/timetable
 * Get timetable for a specific faculty member
 */
exports.getFacultyTimetable = async (req, res) => {
    try {
        const { id } = req.params;
        let facDoc = await Faculty.findOne({
            $or: [
                { facultyId: id },
                ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
            ]
        });

        if (!facDoc) {
            return res.status(404).json({ message: 'Faculty not found' });
        }

        const timetable = await Timetable.find({ facultyId: facDoc._id }).sort({ startTime: 1 });
        return res.status(200).json({ count: timetable.length, data: timetable });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error fetching timetable' });
    }
};

// ============================================================================
// 4. LEAVE MANAGEMENT (WITH PRIVACY FILTER)
// ============================================================================

/**
 * POST /api/faculty/leave
 * Apply for faculty leave (Teacher/Admin)
 */
exports.applyLeave = async (req, res) => {
    try {
        const { facultyId, startDate, endDate, leaveType, reason } = req.body;

        if (!facultyId || !startDate || !endDate || !reason) {
            return res.status(400).json({
                message: 'Validation Error: facultyId, startDate, endDate, and reason are required.',
            });
        }

        let facDoc = await Faculty.findOne({
            $or: [
                { facultyId },
                ...(facultyId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: facultyId }] : []),
            ]
        });

        if (!facDoc) {
            return res.status(404).json({ message: 'Faculty not found' });
        }

        const leave = await Leave.create({
            facultyId: facDoc._id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            leaveType: leaveType || 'CASUAL',
            reason,
            status: 'PENDING',
        });

        return res.status(201).json({ message: 'Leave application submitted successfully', data: leave });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error submitting leave' });
    }
};

/**
 * GET /api/faculty/leave
 * Get leaves with strict privacy filter (Student MUST NOT get `reason`)
 */
exports.getLeaves = async (req, res) => {
    try {
        const { facultyId, status } = req.query;
        let filter = {};

        if (facultyId) {
            let facDoc = await Faculty.findOne({
                $or: [
                    { facultyId },
                    ...(facultyId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: facultyId }] : []),
                ]
            });
            if (facDoc) {
                filter.facultyId = facDoc._id;
            }
        }
        if (status) {
            filter.status = status;
        }

        const leaves = await Leave.find(filter).populate('facultyId', 'name facultyId department').lean();

        // STRICT PRIVACY ENFORCEMENT: Omit `reason` if user is student
        const sanitizedLeaves = leaves.map(leaveItem => {
            if (req.user && req.user.role === 'student') {
                const { reason, ...safeLeave } = leaveItem;
                return safeLeave;
            }
            return leaveItem;
        });

        return res.status(200).json({ count: sanitizedLeaves.length, data: sanitizedLeaves });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error fetching leaves' });
    }
};

/**
 * PATCH /api/faculty/leave/:id/status
 * Update leave status (Admin only)
 */
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'Validation Error: Status must be APPROVED or REJECTED.' });
        }

        const leave = await Leave.findByIdAndUpdate(
            id,
            { status, approvedBy: req.user._id },
            { new: true }
        );

        if (!leave) {
            return res.status(404).json({ message: 'Leave record not found' });
        }

        return res.status(200).json({ message: `Leave status updated to ${status}`, data: leave });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error updating leave status' });
    }
};

// ============================================================================
// 5. APPOINTMENT MANAGEMENT
// ============================================================================

/**
 * POST /api/faculty/appointments
 * Book a student appointment with faculty
 */
exports.bookAppointment = async (req, res) => {
    try {
        const { facultyId, date, startTime, endTime, purpose, message } = req.body;

        if (!facultyId || !date || !startTime || !endTime || !purpose) {
            return res.status(400).json({
                message: 'Validation Error: facultyId, date, startTime, endTime, and purpose are required.',
            });
        }

        if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
            return res.status(400).json({ message: 'Validation Error: Invalid time format (HH:MM required).' });
        }

        let facDoc = await Faculty.findOne({
            $or: [
                { facultyId },
                ...(facultyId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: facultyId }] : []),
            ]
        });

        if (!facDoc) {
            return res.status(404).json({ message: 'Faculty member not found' });
        }

        // Check availability via availability engine
        const availability = await checkFacultyAvailability(facDoc, date, startTime, endTime);

        if (availability.status !== 'AVAILABLE') {
            return res.status(400).json({
                message: `Cannot book appointment: Faculty is ${availability.status} (${availability.reasonCode}).`,
                availabilityDetails: availability,
            });
        }

        const appointment = await Appointment.create({
            studentId: req.user._id,
            facultyId: facDoc._id,
            date: new Date(date),
            startTime,
            endTime,
            purpose,
            message: message || '',
            status: 'PENDING',
        });

        return res.status(201).json({ message: 'Appointment request submitted successfully', data: appointment });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error booking appointment' });
    }
};

/**
 * GET /api/faculty/appointments
 * View appointments (filtered based on user role)
 */
exports.getAppointments = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'student') {
            filter.studentId = req.user._id;
        } else if (req.user.role === 'teacher') {
            const facDoc = await Faculty.findOne({ user: req.user._id });
            if (facDoc) {
                filter.facultyId = facDoc._id;
            }
        }

        const appointments = await Appointment.find(filter)
            .populate('studentId', 'name email')
            .populate('facultyId', 'name facultyId department')
            .sort({ date: -1 });

        return res.status(200).json({ count: appointments.length, data: appointments });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error fetching appointments' });
    }
};

/**
 * PATCH /api/faculty/appointments/:id/status
 * Update appointment status (Teacher or Admin)
 */
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ message: 'Validation Error: Invalid appointment status.' });
        }

        const appointment = await Appointment.findByIdAndUpdate(id, { status }, { new: true });
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        return res.status(200).json({ message: `Appointment status updated to ${status}`, data: appointment });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error updating appointment' });
    }
};

// ============================================================================
// 6. SUBSTITUTE REQUEST MANAGEMENT
// ============================================================================

/**
 * POST /api/faculty/substitute-requests
 * Create substitute request (Teacher / Admin)
 */
exports.createSubstituteRequest = async (req, res) => {
    try {
        const { originalFacultyId, date, startTime, endTime, subject, className, reason, recommendedFaculty } = req.body;

        if (!originalFacultyId || !date || !startTime || !endTime || !subject) {
            return res.status(400).json({
                message: 'Validation Error: originalFacultyId, date, startTime, endTime, and subject are required.',
            });
        }

        let facDoc = await Faculty.findOne({
            $or: [
                { facultyId: originalFacultyId },
                ...(originalFacultyId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: originalFacultyId }] : []),
            ]
        });

        if (!facDoc) {
            return res.status(404).json({ message: 'Original Faculty member not found' });
        }

        let recommendedFacDoc = null;
        if (recommendedFaculty) {
            recommendedFacDoc = await Faculty.findOne({
                $or: [
                    { facultyId: recommendedFaculty },
                    ...(recommendedFaculty.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: recommendedFaculty }] : []),
                ]
            });
        }

        const subRequest = await SubstituteRequest.create({
            requestedBy: req.user._id,
            originalFacultyId: facDoc._id,
            date: new Date(date),
            startTime,
            endTime,
            subject,
            className: className || '',
            reason: reason || '',
            recommendedFaculty: recommendedFacDoc ? recommendedFacDoc._id : undefined,
            status: 'PENDING',
        });

        return res.status(201).json({ message: 'Substitute request created successfully', data: subRequest });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error creating substitute request' });
    }
};

/**
 * GET /api/faculty/substitute-requests
 * View substitute requests (Teacher / Admin)
 */
exports.getSubstituteRequests = async (req, res) => {
    try {
        const requests = await SubstituteRequest.find()
            .populate('requestedBy', 'name email')
            .populate('originalFacultyId', 'name facultyId department')
            .populate('assignedFaculty', 'name facultyId department')
            .populate('recommendedFaculty', 'name facultyId department')
            .sort({ date: -1 });

        return res.status(200).json({ count: requests.length, data: requests });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error fetching substitute requests' });
    }
};

// ============================================================================
// 7. PROMPT 3 ADMIN FEATURES & SUBSTITUTE RANKING
// ============================================================================

/**
 * POST /api/faculty/substitute-finder
 * Find and rank substitute faculty candidates using DB criteria
 */
exports.findSubstitutes = async (req, res) => {
    try {
        const { originalFacultyId, subject, className, date, startTime, endTime } = req.body;

        if (!originalFacultyId || !date || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Validation Error: originalFacultyId, date, startTime, and endTime are required.',
            });
        }

        const candidates = await findAndRankSubstitutes({
            originalFacultyId,
            subject,
            className,
            date,
            startTime,
            endTime,
        });

        return res.status(200).json({
            count: candidates.length,
            data: candidates,
        });
    } catch (error) {
        console.error('Error in findSubstitutes:', error);
        return res.status(500).json({ message: error.message || 'Server error finding substitute candidates' });
    }
};

/**
 * POST /api/faculty/substitute-assign
 * Assign substitute faculty member with overlap conflict check & instant timetable update
 */
exports.assignSubstitute = async (req, res) => {
    try {
        const { substituteRequestId, assignedFacultyId, originalFacultyId, date, startTime, endTime, subject, className } = req.body;

        if (!assignedFacultyId || !date || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Validation Error: assignedFacultyId, date, startTime, and endTime are required.',
            });
        }

        // Automatic Conflict Detection
        const conflictCheck = await detectScheduleConflict({
            facultyId: assignedFacultyId,
            dateStr: date,
            startTime,
            endTime,
        });

        if (conflictCheck.conflict) {
            return res.status(400).json({
                message: 'Scheduling conflict detected.',
                conflictDetails: conflictCheck,
            });
        }

        let assignedFacDoc = await Faculty.findOne({
            $or: [
                { facultyId: assignedFacultyId },
                ...(assignedFacultyId.toString().match(/^[0-9a-fA-F]{24}$/) ? [{ _id: assignedFacultyId }] : []),
            ]
        });

        if (!assignedFacDoc) {
            return res.status(404).json({ message: 'Assigned faculty member not found' });
        }

        // 1. Create Timetable slot for assigned substitute
        const queryDate = new Date(date);
        const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = DAYS[queryDate.getDay()];

        const timetableSlot = await Timetable.create({
            facultyId: assignedFacDoc._id,
            day: dayName,
            date: queryDate,
            startTime,
            endTime,
            subject: subject || 'Substitute Lecture',
            className: className || 'TBA',
            room: 'TBA',
            activityType: 'LECTURE',
        });

        // 2. Update SubstituteRequest if ID provided
        let subReq = null;
        if (substituteRequestId) {
            subReq = await SubstituteRequest.findByIdAndUpdate(
                substituteRequestId,
                { status: 'APPROVED', assignedFaculty: assignedFacDoc._id },
                { new: true }
            );
        }

        // 3. Create Audit Log
        if (req.user) {
            await AuditLog.create({
                user: req.user._id,
                role: req.user.role,
                action: 'SUBSTITUTE_ASSIGNED',
                entity: 'SubstituteRequest',
                details: {
                    assignedFaculty: assignedFacDoc.name,
                    date,
                    startTime,
                    endTime,
                    subject,
                },
            });
        }

        return res.status(200).json({
            message: 'Substitute assigned successfully. Timetable updated.',
            timetableSlot,
            substituteRequest: subReq,
        });
    } catch (error) {
        console.error('Error in assignSubstitute:', error);
        return res.status(500).json({ message: error.message || 'Server error assigning substitute' });
    }
};

/**
 * GET /api/faculty/analytics
 * Get Admin Faculty Analytics metrics
 */
exports.getAdminAnalytics = async (req, res) => {
    try {
        const totalFaculty = await Faculty.countDocuments();
        const activeFaculty = await Faculty.countDocuments({ status: 'ACTIVE' });
        const onLeaveFaculty = await Faculty.countDocuments({ status: 'ON_LEAVE' });

        const totalTimetableSlots = await Timetable.countDocuments();
        const totalLectures = await Timetable.countDocuments({ activityType: 'LECTURE' });
        const totalLabs = await Timetable.countDocuments({ activityType: 'LAB' });
        const totalMeetings = await Timetable.countDocuments({ activityType: 'MEETING' });
        const totalDuties = await Timetable.countDocuments({ activityType: { $in: ['EXAM', 'EVENT', 'DUTY'] } });

        const approvedLeaves = await Leave.countDocuments({ status: 'APPROVED' });
        const pendingLeaves = await Leave.countDocuments({ status: 'PENDING' });

        const substituteRequests = await SubstituteRequest.countDocuments();
        const approvedSubstitutes = await SubstituteRequest.countDocuments({ status: 'APPROVED' });

        const deptAggregation = await Faculty.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);

        return res.status(200).json({
            data: {
                totalFaculty,
                activeFaculty,
                onLeaveFaculty,
                totalTimetableSlots,
                totalLectures,
                totalLabs,
                totalMeetings,
                totalDuties,
                approvedLeaves,
                pendingLeaves,
                substituteRequests,
                approvedSubstitutes,
                departmentDistribution: deptAggregation,
            }
        });
    } catch (error) {
        console.error('Error in getAdminAnalytics:', error);
        return res.status(500).json({ message: error.message || 'Server error fetching analytics' });
    }
};

/**
 * GET /api/faculty/audit-logs
 * Get Audit Logs (Admin only)
 */
exports.getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('user', 'name email role')
            .sort({ timestamp: -1 })
            .limit(100);

        return res.status(200).json({ count: logs.length, data: logs });
    } catch (error) {
        console.error('Error in getAuditLogs:', error);
        return res.status(500).json({ message: error.message || 'Server error fetching audit logs' });
    }
};
