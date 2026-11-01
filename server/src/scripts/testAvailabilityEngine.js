const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Timetable = require('../models/Timetable');
const Leave = require('../models/Leave');
const AuditLog = require('../models/AuditLog');

const {
    checkFacultyAvailability,
    searchMultipleFacultyAvailability,
    findAndRankSubstitutes,
    detectScheduleConflict,
} = require('../services/availabilityService');

const {
    getFacultyAvailability,
    getMyAvailability,
    findSubstitutes,
    assignSubstitute,
    getAdminAnalytics,
    getAuditLogs,
} = require('../controllers/facultyController');

const { protect, authorize } = require('../middleware/authMiddleware');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        testsPassed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        testsFailed++;
    }
}

function createMockReqRes({ params = {}, query = {}, body = {}, user = null, headers = {} } = {}) {
    const req = { params, query, body, user, headers };
    const res = {
        statusCode: 200,
        responseData: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.responseData = data;
            return this;
        },
    };
    return { req, res };
}

async function runPrompt3Tests() {
    console.log('================================================================');
    console.log('  PROMPT 3 - ADMIN FACULTY DASHBOARD & FEATURES TEST SUITE');
    console.log('================================================================\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for testing.\n');

        // Cleanup test data
        await Faculty.deleteMany({ facultyId: /^TEST_P3_/ });
        await User.deleteMany({ email: /^test_p3_.*@example\.com$/ });
        await AuditLog.deleteMany({ entity: 'SubstituteRequest' });

        // 1. Create Test Users
        const studentUser = await User.create({
            name: 'P3 Student',
            email: 'test_p3_student@example.com',
            password: 'Password123!',
            role: 'student',
        });

        const teacherUser = await User.create({
            name: 'P3 Teacher 1',
            email: 'test_p3_teacher1@example.com',
            password: 'Password123!',
            role: 'teacher',
        });

        const teacherUser2 = await User.create({
            name: 'P3 Teacher 2',
            email: 'test_p3_teacher2@example.com',
            password: 'Password123!',
            role: 'teacher',
        });

        const adminUser = await User.create({
            name: 'P3 Admin',
            email: 'test_p3_admin@example.com',
            password: 'Password123!',
            role: 'admin',
        });

        // 2. Create Test Faculty Members
        const fac1 = await Faculty.create({
            facultyId: 'TEST_P3_F101',
            user: teacherUser._id,
            name: 'Dr. Alan Turing',
            email: teacherUser.email,
            department: 'Computer Engineering',
            designation: 'Professor',
            subjects: ['DBMS', 'Algorithms'],
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workingHours: { startTime: '09:00', endTime: '17:00' },
            officeLocation: 'Room 101',
            status: 'ACTIVE',
        });

        const fac2 = await Faculty.create({
            facultyId: 'TEST_P3_F102',
            user: teacherUser2._id,
            name: 'Prof. Grace Hopper',
            email: teacherUser2.email,
            department: 'Computer Engineering',
            designation: 'Associate Professor',
            subjects: ['DBMS', 'Compilers'],
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workingHours: { startTime: '09:00', endTime: '17:00' },
            officeLocation: 'Room 102',
            status: 'ACTIVE',
        });

        const fac3 = await Faculty.create({
            facultyId: 'TEST_P3_F103',
            name: 'Dr. Ada Lovelace',
            email: 'test_p3_ada@example.com',
            department: 'Mathematics',
            designation: 'Professor',
            subjects: ['Calculus'],
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workingHours: { startTime: '09:00', endTime: '17:00' },
            officeLocation: 'Room 103',
            status: 'ACTIVE',
        });

        const facIds = [fac1._id, fac2._id, fac3._id];
        await Timetable.deleteMany({ facultyId: { $in: facIds } });
        await Leave.deleteMany({ facultyId: { $in: facIds } });

        const testDateStr = '2026-08-18'; // Tuesday

        // Schedule lecture for Faculty 1 (14:00 - 16:00)
        await Timetable.create({
            facultyId: fac1._id,
            day: 'Tuesday',
            startTime: '14:00',
            endTime: '16:00',
            subject: 'DBMS',
            className: 'CS-3A',
            room: 'Lab 1',
            activityType: 'LECTURE',
        });

        console.log('--- TEST 1: Admin search with optional filters (Teacher Name, Dept, Status) ---');
        const ctx1 = createMockReqRes({
            user: adminUser,
            query: { date: testDateStr, startTime: '10:00', endTime: '11:00', facultyName: 'Grace', department: 'Computer Engineering' }
        });
        await getFacultyAvailability(ctx1.req, ctx1.res);
        assert(ctx1.res.statusCode === 200 && ctx1.res.responseData.data.length === 1 && ctx1.res.responseData.data[0].name.includes('Grace'),
            `Filtered search by optional Teacher Name 'Grace' returned exact match`);

        console.log('\n--- TEST 2: Substitute Finder Engine candidate ranking ---');
        const candidates = await findAndRankSubstitutes({
            originalFacultyId: fac1.facultyId,
            subject: 'DBMS',
            className: 'CS-3A',
            date: testDateStr,
            startTime: '10:00',
            endTime: '11:00',
        });
        assert(Array.isArray(candidates) && candidates.length >= 1 && candidates[0].matchPercentage >= 70,
            `Substitute engine returned candidate ${candidates[0]?.faculty.name} with ${candidates[0]?.matchPercentage}% match`);

        console.log('\n--- TEST 3: Automatic Conflict Detection rejecting overlapping assignment ---');
        const conflictRes = await detectScheduleConflict({
            facultyId: fac1.facultyId,
            dateStr: testDateStr,
            startTime: '14:30', // Overlaps with 14:00 - 16:00 lecture
            endTime: '15:30',
        });
        assert(conflictRes.conflict === true && conflictRes.reason.includes('DBMS'),
            `Conflict detector correctly caught overlapping timetable slot`);

        console.log('\n--- TEST 4: Assign Substitute & Instant Timetable Update ---');
        const assignCtx = createMockReqRes({
            user: adminUser,
            body: {
                originalFacultyId: fac1.facultyId,
                assignedFacultyId: fac2.facultyId, // Available from 10:00 - 11:00
                date: testDateStr,
                startTime: '10:00',
                endTime: '11:00',
                subject: 'DBMS',
                className: 'CS-3A',
            }
        });
        await assignSubstitute(assignCtx.req, assignCtx.res);
        assert(assignCtx.res.statusCode === 200 && assignCtx.res.responseData.timetableSlot,
            `Substitute assigned & new Timetable slot created for ${fac2.name}`);

        console.log('\n--- TEST 5: Assigned substitute immediately becomes BUSY in Availability Engine ---');
        const res5 = await checkFacultyAvailability(fac2._id, testDateStr, '10:15', '10:45');
        assert(res5.status === 'BUSY' && res5.reasonCode === 'TIMETABLE_CONFLICT',
            `Availability engine immediately marks candidate BUSY after assignment`);

        console.log('\n--- TEST 6: Admin Analytics API returns metrics ---');
        const analyticsCtx = createMockReqRes({ user: adminUser });
        await getAdminAnalytics(analyticsCtx.req, analyticsCtx.res);
        assert(analyticsCtx.res.statusCode === 200 && analyticsCtx.res.responseData.data.totalFaculty >= 3,
            `Admin Analytics API returned valid total faculty count (${analyticsCtx.res.responseData.data.totalFaculty})`);

        console.log('\n--- TEST 7: Audit Logs recorded & restricted to Admin role ---');
        const auditCtx = createMockReqRes({ user: adminUser });
        await getAuditLogs(auditCtx.req, auditCtx.res);
        assert(auditCtx.res.statusCode === 200 && auditCtx.res.responseData.data.length >= 1,
            `Admin successfully retrieved ${auditCtx.res.responseData.data.length} Audit Log entries`);

        const studentAuditCtx = createMockReqRes({ user: studentUser });
        const authAdminOnly = authorize('admin');
        let nextCalled = false;
        authAdminOnly(studentAuditCtx.req, studentAuditCtx.res, () => { nextCalled = true; });
        assert(studentAuditCtx.res.statusCode === 403 && !nextCalled,
            `Student calling Audit Logs endpoint receives HTTP 403 Forbidden`);

        // Clean up test data
        await Faculty.deleteMany({ facultyId: /^TEST_P3_/ });
        await User.deleteMany({ email: /^test_p3_.*@example\.com$/ });
        await Timetable.deleteMany({ facultyId: { $in: facIds } });
        await Leave.deleteMany({ facultyId: { $in: facIds } });
        await AuditLog.deleteMany({ entity: 'SubstituteRequest' });

        console.log('\n================================================================');
        console.log(`  TEST RESULTS SUMMARY:`);
        console.log(`  PASSED: ${testsPassed}`);
        console.log(`  FAILED: ${testsFailed}`);
        console.log('================================================================\n');

        if (testsFailed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }

    } catch (error) {
        console.error('Fatal Error running Prompt 3 tests:', error);
        process.exit(1);
    }
}

runPrompt3Tests();
