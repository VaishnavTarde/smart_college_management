const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');
const Timetable = require('../models/Timetable');
const Leave = require('../models/Leave');
const Appointment = require('../models/Appointment');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Converts HH:MM 24-hour string to minutes since midnight
 */
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
};

/**
 * Gets day name (e.g. 'Monday') from a Date object or ISO string
 */
const getDayName = (dateObj) => {
    const d = new Date(dateObj);
    return DAYS[d.getDay()];
};

/**
 * Checks if two time ranges overlap
 * rangeA: [startMinA, endMinA], rangeB: [startMinB, endMinB]
 */
const isTimeOverlapping = (startA, endA, startB, endB) => {
    return startA < endB && startB < endA;
};

/**
 * Calculates availability status for a single faculty member
 */
const checkFacultyAvailability = async (facultyInput, dateStr, startTime, endTime, requestedSubject = null) => {
    // 1. Resolve Faculty Document
    let faculty = facultyInput;
    if (!faculty || typeof faculty !== 'object' || !faculty.facultyId) {
        if (typeof facultyInput === 'string' || facultyInput instanceof mongoose.Types.ObjectId) {
            const searchId = facultyInput.toString();
            if (searchId.match(/^[0-9a-fA-F]{24}$/)) {
                faculty = await Faculty.findById(searchId);
            }
            if (!faculty) {
                faculty = await Faculty.findOne({ facultyId: searchId });
            }
        }
    }

    if (!faculty) {
        throw new Error('Faculty member not found');
    }

    const queryDate = new Date(dateStr);
    if (isNaN(queryDate.getTime())) {
        throw new Error('Invalid date provided');
    }

    const dayName = getDayName(queryDate);
    const reqStartMin = timeToMinutes(startTime);
    const reqEndMin = timeToMinutes(endTime);

    // Subject Match check (if requested subject specified)
    let subjectMatch = false;
    if (requestedSubject && faculty.subjects && faculty.subjects.length > 0) {
        const lowerReq = requestedSubject.trim().toLowerCase();
        subjectMatch = faculty.subjects.some(sub => sub.toLowerCase().includes(lowerReq));
    } else if (!requestedSubject) {
        subjectMatch = true;
    }

    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const baseResponse = {
        facultyId: faculty.facultyId,
        _id: faculty._id,
        name: faculty.name,
        department: faculty.department,
        officeLocation: faculty.officeLocation,
        subjectMatch,
        date: dateStr,
        startTime,
        endTime,
    };

    // CHECK 1 — Working Hours
    const isWorkingDay = faculty.workingDays.some(d => d.toLowerCase() === dayName.toLowerCase());
    const workStartMin = timeToMinutes(faculty.workingHours?.startTime || '09:00');
    const workEndMin = timeToMinutes(faculty.workingHours?.endTime || '17:00');

    const isWithinHours = (reqStartMin >= workStartMin) && (reqEndMin <= workEndMin);

    if (!isWorkingDay || !isWithinHours) {
        return {
            ...baseResponse,
            status: 'OUTSIDE_WORKING_HOURS',
            reasonCode: 'OUTSIDE_WORKING_HOURS',
            details: 'Requested time is outside faculty working days/hours',
        };
    }

    // CHECK 2 — Leave
    const approvedLeave = await Leave.findOne({
        facultyId: faculty._id,
        status: 'APPROVED',
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay },
    });

    if (approvedLeave) {
        return {
            ...baseResponse,
            status: 'UNAVAILABLE',
            reasonCode: 'ON_LEAVE',
            details: 'Faculty is on approved leave for this date',
        };
    }

    // Query all timetable entries for this faculty (matching date OR matching day of week)
    const timetableEntries = await Timetable.find({
        facultyId: faculty._id,
        $or: [
            { date: { $gte: startOfDay, $lte: endOfDay } },
            { day: dayName },
        ],
    });

    // Helper to filter entries overlapping requested time slot
    const overlappingTimetable = timetableEntries.filter(entry => {
        const entryStart = timeToMinutes(entry.startTime);
        const entryEnd = timeToMinutes(entry.endTime);
        return isTimeOverlapping(reqStartMin, reqEndMin, entryStart, entryEnd);
    });

    // CHECK 3 — Timetable (Lecture / Lab)
    const lectureLabConflict = overlappingTimetable.find(e =>
        ['LECTURE', 'LAB'].includes(e.activityType)
    );

    if (lectureLabConflict) {
        return {
            ...baseResponse,
            status: 'BUSY',
            reasonCode: 'TIMETABLE_CONFLICT',
            activityType: lectureLabConflict.activityType,
            subject: lectureLabConflict.subject,
            room: lectureLabConflict.room,
        };
    }

    // CHECK 4 — Meeting
    const meetingConflict = overlappingTimetable.find(e => e.activityType === 'MEETING');
    if (meetingConflict) {
        return {
            ...baseResponse,
            status: 'BUSY',
            reasonCode: 'MEETING_CONFLICT',
            activityType: 'MEETING',
            subject: meetingConflict.subject,
        };
    }

    // CHECK 5 — Exam / Event / Duty
    const dutyConflict = overlappingTimetable.find(e =>
        ['EXAM', 'EVENT', 'DUTY'].includes(e.activityType)
    );
    if (dutyConflict) {
        return {
            ...baseResponse,
            status: 'BUSY',
            reasonCode: 'DUTY_CONFLICT',
            activityType: dutyConflict.activityType,
            subject: dutyConflict.subject,
        };
    }

    // CHECK 6 — ALL CLEAR
    return {
        ...baseResponse,
        status: 'AVAILABLE',
        reasonCode: 'NO_CONFLICT',
    };
};

/**
 * Evaluates availability across multiple faculty members based on filter options
 */
const searchMultipleFacultyAvailability = async ({ date, startTime, endTime, department, subject, facultyId, facultyName }) => {
    let facultyQuery = { status: 'ACTIVE' };

    if (facultyId) {
        facultyQuery.$or = [
            { facultyId: facultyId },
            ...(facultyId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: facultyId }] : []),
        ];
    } else {
        if (department) {
            facultyQuery.department = new RegExp(`^${department.trim()}$`, 'i');
        }
        if (subject) {
            facultyQuery.subjects = { $in: [new RegExp(subject.trim(), 'i')] };
        }
        if (facultyName) {
            facultyQuery.name = new RegExp(facultyName.trim(), 'i');
        }
    }

    const faculties = await Faculty.find(facultyQuery);

    const results = await Promise.all(
        faculties.map(fac =>
            checkFacultyAvailability(fac, date, startTime, endTime, subject).catch(err => ({
                facultyId: fac.facultyId,
                name: fac.name,
                status: 'ERROR',
                reasonCode: 'EVALUATION_ERROR',
                error: err.message,
            }))
        )
    );

    return results;
};

/**
 * Detects if a faculty member has any schedule conflict (Leave or Timetable overlap)
 */
const detectScheduleConflict = async ({ facultyId, dateStr, startTime, endTime }) => {
    let faculty = await Faculty.findOne({
        $or: [
            { facultyId: facultyId },
            ...(facultyId.toString().match(/^[0-9a-fA-F]{24}$/) ? [{ _id: facultyId }] : []),
        ]
    });

    if (!faculty) {
        return { conflict: true, reason: 'Faculty not found' };
    }

    const queryDate = new Date(dateStr);
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const reqStartMin = timeToMinutes(startTime);
    const reqEndMin = timeToMinutes(endTime);
    const dayName = getDayName(queryDate);

    // 1. Check Leave
    const approvedLeave = await Leave.findOne({
        facultyId: faculty._id,
        status: 'APPROVED',
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay },
    });

    if (approvedLeave) {
        return { conflict: true, type: 'LEAVE', reason: 'Faculty is on approved leave' };
    }

    // 2. Check Timetable (Lectures, Labs, Meetings, Exams, Events, Duties)
    const timetableEntries = await Timetable.find({
        facultyId: faculty._id,
        $or: [
            { date: { $gte: startOfDay, $lte: endOfDay } },
            { day: dayName },
        ],
    });

    const overlapping = timetableEntries.find(entry => {
        const entryStart = timeToMinutes(entry.startTime);
        const entryEnd = timeToMinutes(entry.endTime);
        return isTimeOverlapping(reqStartMin, reqEndMin, entryStart, entryEnd);
    });

    if (overlapping) {
        return {
            conflict: true,
            type: 'TIMETABLE',
            reason: `Overlapping ${overlapping.activityType} (${overlapping.subject})`,
            entry: overlapping,
        };
    }

    return { conflict: false };
};

/**
 * Finds and ranks substitute faculty candidates based on DB criteria
 */
const findAndRankSubstitutes = async ({ originalFacultyId, subject, className, date, startTime, endTime }) => {
    let origFaculty = await Faculty.findOne({
        $or: [
            { facultyId: originalFacultyId },
            ...(originalFacultyId.toString().match(/^[0-9a-fA-F]{24}$/) ? [{ _id: originalFacultyId }] : []),
        ]
    });

    if (!origFaculty) {
        throw new Error('Original faculty member not found');
    }

    // Find all active faculty excluding original faculty
    const candidates = await Faculty.find({
        _id: { $ne: origFaculty._id },
        status: 'ACTIVE',
    });

    const ranked = [];

    for (const cand of candidates) {
        // Run availability check
        const avail = await checkFacultyAvailability(cand, date, startTime, endTime, subject);

        // Candidate MUST be available
        if (avail.status !== 'AVAILABLE') {
            continue;
        }

        let score = 0;
        const reasons = [];

        // 1. Subject Expertise (+40)
        const hasSubjectMatch = cand.subjects && cand.subjects.some(sub =>
            sub.toLowerCase().includes((subject || '').trim().toLowerCase())
        );
        if (hasSubjectMatch) {
            score += 40;
            reasons.push({ label: `${subject} expertise`, matched: true, score: 40 });
        } else {
            reasons.push({ label: `${subject} expertise`, matched: false, score: 0 });
        }

        // 2. Same Department (+30)
        const isSameDept = cand.department.toLowerCase() === origFaculty.department.toLowerCase();
        if (isSameDept) {
            score += 30;
            reasons.push({ label: 'Same department', matched: true, score: 30 });
        } else {
            reasons.push({ label: 'Same department', matched: false, score: 0 });
        }

        // 3. Availability (+20)
        score += 20;
        reasons.push({ label: 'Available (No schedule conflict)', matched: true, score: 20 });

        // 4. Workload Balance (+10)
        const totalSlots = await Timetable.countDocuments({ facultyId: cand._id });
        if (totalSlots <= 10) {
            score += 10;
            reasons.push({ label: 'Reasonable workload', matched: true, score: 10 });
        } else {
            reasons.push({ label: 'Reasonable workload', matched: false, score: 0 });
        }

        ranked.push({
            faculty: {
                _id: cand._id,
                facultyId: cand.facultyId,
                name: cand.name,
                email: cand.email,
                department: cand.department,
                designation: cand.designation,
                subjects: cand.subjects,
                officeLocation: cand.officeLocation,
            },
            matchPercentage: score,
            reasons,
        });
    }

    // Sort descending by matchPercentage
    ranked.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return ranked;
};

module.exports = {
    checkFacultyAvailability,
    searchMultipleFacultyAvailability,
    detectScheduleConflict,
    findAndRankSubstitutes,
    timeToMinutes,
    isTimeOverlapping,
    getDayName,
};
