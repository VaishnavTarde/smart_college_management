const EventRegistration = require('../models/EventRegistration');
const Event = require('../models/Event');

// ─────────────────────────────────────────────────
// @desc    Get all registrations for an event
// @route   GET /api/registrations/event/:eventId
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.getRegistrationsByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Verify event exists
        const event = await Event.findById(eventId).select('title date venue');
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const registrations = await EventRegistration.find({ event: eventId })
            .populate('addedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: registrations.length,
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                venue: event.venue,
            },
            data: registrations,
        });
    } catch (error) {
        console.error('[RegistrationController] getRegistrationsByEvent Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Add a new registration for an event
// @route   POST /api/registrations/event/:eventId
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.addRegistration = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { studentName, studentEmail, rollNumber, department, year, division, phone, notes } = req.body;

        // Validation
        if (!studentName || !studentName.trim()) {
            return res.status(400).json({ success: false, message: 'Student name is required' });
        }
        if (!studentEmail || !studentEmail.trim()) {
            return res.status(400).json({ success: false, message: 'Student email is required' });
        }
        if (!rollNumber || !rollNumber.trim()) {
            return res.status(400).json({ success: false, message: 'Roll number is required' });
        }

        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const registration = await EventRegistration.create({
            event: eventId,
            studentName: studentName.trim(),
            studentEmail: studentEmail.trim().toLowerCase(),
            rollNumber: rollNumber.trim(),
            department: department?.trim() || '',
            year: year?.trim() || '',
            division: division?.trim() || '',
            phone: phone?.trim() || '',
            notes: notes?.trim() || '',
            addedBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: 'Registration added successfully',
            data: registration,
        });
    } catch (error) {
        // Handle duplicate roll number for the same event
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A student with this roll number is already registered for this event',
            });
        }
        console.error('[RegistrationController] addRegistration Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Bulk add registrations for an event
// @route   POST /api/registrations/event/:eventId/bulk
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.bulkAddRegistrations = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { registrations } = req.body; // Array of student objects

        if (!Array.isArray(registrations) || registrations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'registrations must be a non-empty array',
            });
        }

        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Validate each entry
        const errors = [];
        const validRecords = [];

        registrations.forEach((r, idx) => {
            if (!r.studentName?.trim()) errors.push(`Row ${idx + 1}: studentName is required`);
            else if (!r.studentEmail?.trim()) errors.push(`Row ${idx + 1}: studentEmail is required`);
            else if (!r.rollNumber?.trim()) errors.push(`Row ${idx + 1}: rollNumber is required`);
            else {
                validRecords.push({
                    event: eventId,
                    studentName: r.studentName.trim(),
                    studentEmail: r.studentEmail.trim().toLowerCase(),
                    rollNumber: r.rollNumber.trim(),
                    department: r.department?.trim() || '',
                    year: r.year?.trim() || '',
                    division: r.division?.trim() || '',
                    phone: r.phone?.trim() || '',
                    notes: r.notes?.trim() || '',
                    addedBy: req.user._id,
                });
            }
        });

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: 'Validation errors found', errors });
        }

        // Insert with ordered: false so one duplicate doesn't stop others
        const result = await EventRegistration.insertMany(validRecords, { ordered: false });

        res.status(201).json({
            success: true,
            message: `${result.length} registrations added successfully`,
            inserted: result.length,
            data: result,
        });
    } catch (error) {
        // Some inserted, some duplicates
        if (error.name === 'BulkWriteError' || error.code === 11000) {
            const inserted = error.result?.nInserted || 0;
            return res.status(207).json({
                success: true,
                message: `Partial success: ${inserted} records inserted. Duplicates (same roll number) were skipped.`,
                inserted,
            });
        }
        console.error('[RegistrationController] bulkAddRegistrations Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Update a registration record (edit student details)
// @route   PUT /api/registrations/:id
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.updateRegistration = async (req, res) => {
    try {
        const { studentName, studentEmail, rollNumber, department, year, division, phone, notes } = req.body;

        const registration = await EventRegistration.findById(req.params.id);
        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }

        // Apply updates (only changed fields)
        if (studentName?.trim()) registration.studentName = studentName.trim();
        if (studentEmail?.trim()) registration.studentEmail = studentEmail.trim().toLowerCase();
        if (rollNumber?.trim()) registration.rollNumber = rollNumber.trim();
        if (department !== undefined) registration.department = department.trim();
        if (year !== undefined) registration.year = year.trim();
        if (division !== undefined) registration.division = division.trim();
        if (phone !== undefined) registration.phone = phone.trim();
        if (notes !== undefined) registration.notes = notes.trim();

        await registration.save();

        res.status(200).json({
            success: true,
            message: 'Registration updated successfully',
            data: registration,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Roll number already exists for this event',
            });
        }
        console.error('[RegistrationController] updateRegistration Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Delete a registration record
// @route   DELETE /api/registrations/:id
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.deleteRegistration = async (req, res) => {
    try {
        const registration = await EventRegistration.findById(req.params.id);

        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }

        await EventRegistration.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Registration deleted successfully',
        });
    } catch (error) {
        console.error('[RegistrationController] deleteRegistration Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Mark attendance for a registration (present/absent/pending)
// @route   PATCH /api/registrations/:id/attendance
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.markAttendance = async (req, res) => {
    try {
        const { attendance } = req.body;

        const validValues = ['present', 'absent', 'pending'];
        if (!attendance || !validValues.includes(attendance)) {
            return res.status(400).json({
                success: false,
                message: `attendance must be one of: ${validValues.join(', ')}`,
            });
        }

        const registration = await EventRegistration.findById(req.params.id);
        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }

        registration.attendance = attendance;
        await registration.save();

        res.status(200).json({
            success: true,
            message: `Attendance marked as "${attendance}"`,
            data: registration,
        });
    } catch (error) {
        console.error('[RegistrationController] markAttendance Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Get registration statistics for an event
// @route   GET /api/registrations/stats/:eventId
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.getRegistrationStats = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId).select('title date venue');
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const registrations = await EventRegistration.find({ event: eventId });

        const totalRegistered = registrations.length;
        const totalPresent = registrations.filter((r) => r.attendance === 'present').length;
        const totalAbsent = registrations.filter((r) => r.attendance === 'absent').length;
        const totalPending = registrations.filter((r) => r.attendance === 'pending').length;

        // Department breakdown
        const departmentCounts = {};
        registrations.forEach((r) => {
            const dept = r.department?.trim() || 'Unknown';
            departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        });

        // Year breakdown
        const yearCounts = {};
        registrations.forEach((r) => {
            const year = r.year?.trim() || 'Unknown';
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });

        // Division breakdown
        const divisionCounts = {};
        registrations.forEach((r) => {
            const div = r.division?.trim() || 'Unknown';
            divisionCounts[div] = (divisionCounts[div] || 0) + 1;
        });

        const attendanceRate =
            totalRegistered > 0
                ? Math.round(((totalPresent) / totalRegistered) * 100)
                : 0;

        res.status(200).json({
            success: true,
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                venue: event.venue,
            },
            stats: {
                totalRegistered,
                totalPresent,
                totalAbsent,
                totalPending,
                attendanceRate,
                departmentCounts,
                yearCounts,
                divisionCounts,
            },
        });
    } catch (error) {
        console.error('[RegistrationController] getRegistrationStats Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Export registrations for an event as JSON (for Excel generation on frontend)
// @route   GET /api/registrations/export/:eventId
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.exportRegistrations = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId).select('title date venue');
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const registrations = await EventRegistration.find({ event: eventId })
            .select('-__v -addedBy -linkedUser -updatedAt')
            .sort({ rollNumber: 1 });

        // Format for Excel-friendly flat structure
        const exportData = registrations.map((r, idx) => ({
            'Sr. No.': idx + 1,
            'Name': r.studentName,
            'Roll Number / PRN': r.rollNumber,
            'Email': r.studentEmail,
            'Department': r.department || '-',
            'Year': r.year || '-',
            'Division': r.division || '-',
            'Phone': r.phone || '-',
            'Attendance': r.attendance.charAt(0).toUpperCase() + r.attendance.slice(1),
            'Registered At': new Date(r.createdAt).toLocaleString('en-IN'),
            'Notes': r.notes || '-',
        }));

        res.status(200).json({
            success: true,
            eventTitle: event.title,
            eventDate: event.date,
            count: exportData.length,
            data: exportData,
        });
    } catch (error) {
        console.error('[RegistrationController] exportRegistrations Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
