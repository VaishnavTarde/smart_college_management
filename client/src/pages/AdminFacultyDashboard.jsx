import React, { useState, useEffect } from 'react';
import {
    Search, Calendar, Clock, UserCheck, CheckCircle2, XCircle, AlertCircle,
    Building2, BookOpen, MapPin, User, ShieldAlert, BarChart2, Shield,
    UserPlus, RefreshCw, FileText, Check, Award, Filter
} from 'lucide-react';
import api from '../services/api';

const AdminFacultyDashboard = () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'calendar' | 'substitute' | 'leaves' | 'analytics'

    // Optional Search & Filter state
    const [filters, setFilters] = useState({
        teacherName: '',
        department: '',
        studentId: '',
        subject: '',
        date: todayStr,
        startTime: '09:00',
        endTime: '17:00',
        status: '',
        activityType: '',
    });

    const [faculties, setFaculties] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Calendar Tab state
    const [selectedCalendarFaculty, setSelectedCalendarFaculty] = useState('');
    const [calendarTimetable, setCalendarTimetable] = useState([]);
    const [calendarLoading, setCalendarLoading] = useState(false);

    // Substitute Finder state
    const [subForm, setSubForm] = useState({
        originalFacultyId: '',
        subject: '',
        className: '',
        date: todayStr,
        startTime: '10:00',
        endTime: '11:00',
    });
    const [subCandidates, setSubCandidates] = useState([]);
    const [subLoading, setSubLoading] = useState(false);
    const [subMessage, setSubMessage] = useState({ type: '', text: '' });

    // Leave & Status Management state
    const [leaves, setLeaves] = useState([]);
    const [leavesLoading, setLeavesLoading] = useState(false);

    // Analytics & Audit Logs state
    const [analyticsData, setAnalyticsData] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    useEffect(() => {
        fetchAllFaculty();
        fetchAvailability();
        fetchLeaves();
        fetchAnalytics();
        fetchAuditLogs();
    }, []);

    const fetchAllFaculty = async () => {
        try {
            const res = await api.get('/faculty');
            setFaculties(res.data.data || []);
            if (res.data.data && res.data.data.length > 0) {
                setSelectedCalendarFaculty(res.data.data[0].facultyId || res.data.data[0]._id);
                setSubForm((prev) => ({ ...prev, originalFacultyId: res.data.data[0].facultyId || res.data.data[0]._id }));
            }
        } catch (err) {
            console.error('Error fetching faculty list:', err);
        }
    };

    const fetchAvailability = async () => {
        setLoading(true);
        setError('');
        try {
            const query = new URLSearchParams({
                date: filters.date,
                startTime: filters.startTime,
                endTime: filters.endTime,
                ...(filters.teacherName && { facultyName: filters.teacherName }),
                ...(filters.department && { department: filters.department }),
                ...(filters.subject && { subject: filters.subject }),
            }).toString();

            const res = await api.get(`/faculty/availability?${query}`);
            let list = res.data.data || [];

            if (filters.status) {
                list = list.filter((f) => f.status === filters.status);
            }
            if (filters.activityType) {
                list = list.filter((f) => f.activityType === filters.activityType);
            }

            setSearchResults(list);
        } catch (err) {
            console.error('Error fetching availability:', err);
            setError(err.response?.data?.message || 'Failed to fetch availability.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCalendar = async (facultyId) => {
        if (!facultyId) return;
        setCalendarLoading(true);
        try {
            const res = await api.get(`/faculty/${facultyId}/timetable`);
            setCalendarTimetable(res.data.data || []);
        } catch (err) {
            console.error('Error fetching timetable calendar:', err);
        } finally {
            setCalendarLoading(false);
        }
    };

    const fetchLeaves = async () => {
        setLeavesLoading(true);
        try {
            const res = await api.get('/faculty/leave');
            setLeaves(res.data.data || []);
        } catch (err) {
            console.error('Error fetching leaves:', err);
        } finally {
            setLeavesLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/faculty/analytics');
            setAnalyticsData(res.data.data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await api.get('/faculty/audit-logs');
            setAuditLogs(res.data.data || []);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchAvailability();
    };

    const handleFindSubstitutes = async (e) => {
        e.preventDefault();
        setSubLoading(true);
        setSubMessage({ type: '', text: '' });
        setSubCandidates([]);

        try {
            const res = await api.post('/faculty/substitute-finder', subForm);
            setSubCandidates(res.data.data || []);
            if (!res.data.data || res.data.data.length === 0) {
                setSubMessage({ type: 'error', text: 'No available substitute candidates match the schedule criteria.' });
            }
        } catch (err) {
            setSubMessage({ type: 'error', text: err.response?.data?.message || 'Error running substitute candidate search.' });
        } finally {
            setSubLoading(false);
        }
    };

    const handleAssignSubstitute = async (candidateFacultyId) => {
        setSubLoading(true);
        setSubMessage({ type: '', text: '' });

        try {
            const res = await api.post('/faculty/substitute-assign', {
                assignedFacultyId: candidateFacultyId,
                originalFacultyId: subForm.originalFacultyId,
                date: subForm.date,
                startTime: subForm.startTime,
                endTime: subForm.endTime,
                subject: subForm.subject,
                className: subForm.className,
            });

            setSubMessage({ type: 'success', text: res.data.message || 'Substitute assigned successfully! Timetable updated.' });
            fetchAvailability();
            fetchAuditLogs();
            fetchAnalytics();
        } catch (err) {
            setSubMessage({
                type: 'error',
                text: err.response?.data?.message || 'Scheduling conflict detected or assignment failed.'
            });
        } finally {
            setSubLoading(false);
        }
    };

    const handleUpdateLeaveStatus = async (leaveId, newStatus) => {
        try {
            await api.patch(`/faculty/leave/${leaveId}/status`, { status: newStatus });
            fetchLeaves();
            fetchAvailability();
            fetchAuditLogs();
        } catch (err) {
            console.error('Error updating leave status:', err);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">🟢 Available</span>;
            case 'BUSY':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">🔴 Busy</span>;
            case 'UNAVAILABLE':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">🟡 Unavailable</span>;
            case 'OUTSIDE_WORKING_HOURS':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-white border border-gray-900">⚫ Outside Working Hours</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Banner */}
                <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold tracking-wider text-accent mb-3 uppercase">
                                <Shield size={14} /> Full Administrative Control
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Admin Faculty Availability Dashboard</h1>
                            <p className="mt-2 text-gray-300 text-sm max-w-2xl">
                                Real-time faculty scheduling overview, substitute recommendation engine, schedule calendars, workload analytics, and audit logging.
                            </p>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex flex-wrap bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 gap-1">
                            {[
                                { id: 'overview', label: 'Overview Grid' },
                                { id: 'calendar', label: 'Schedule Calendar' },
                                { id: 'substitute', label: 'Find Substitute' },
                                { id: 'leaves', label: 'Leaves & Status' },
                                { id: 'analytics', label: 'Analytics & Audit' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        if (tab.id === 'calendar' && selectedCalendarFaculty) {
                                            fetchCalendar(selectedCalendarFaculty);
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-white text-gray-900 shadow-md'
                                            : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* TAB 1: OVERVIEW & AVAILABILITY GRID */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Optional Filter Panel */}
                        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                            <div className="flex items-center gap-2 mb-4 text-sm font-extrabold text-gray-800 border-b border-gray-100 pb-2">
                                <Filter size={16} className="text-secondary" /> Optional Search & Filter Parameters
                            </div>

                            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Teacher Name</label>
                                    <input
                                        type="text"
                                        placeholder="Optional"
                                        value={filters.teacherName}
                                        onChange={(e) => setFilters({ ...filters, teacherName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Department</label>
                                    <input
                                        type="text"
                                        placeholder="Optional"
                                        value={filters.department}
                                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Student / Student ID</label>
                                    <input
                                        type="text"
                                        placeholder="Optional"
                                        value={filters.studentId}
                                        onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        placeholder="Optional"
                                        value={filters.subject}
                                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Date *</label>
                                    <input
                                        type="date"
                                        value={filters.date}
                                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                        className="w-full px-2 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Start Time *</label>
                                    <input
                                        type="time"
                                        value={filters.startTime}
                                        onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
                                        className="w-full px-2 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-600 mb-1">End Time *</label>
                                    <input
                                        type="time"
                                        value={filters.endTime}
                                        onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                                        className="w-full px-2 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                        required
                                    />
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-2 px-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                        <Search size={14} /> Filter
                                    </button>
                                </div>
                            </form>

                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                                <span className="font-bold text-gray-500 self-center">Status Filter:</span>
                                {['', 'AVAILABLE', 'BUSY', 'UNAVAILABLE', 'OUTSIDE_WORKING_HOURS'].map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => { setFilters({ ...filters, status: st }); }}
                                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                                            filters.status === st ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {st || 'All Statuses'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Results Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {searchResults.map((fac) => (
                                <div key={fac.facultyId} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-extrabold text-gray-900 text-lg">{fac.name}</h3>
                                            <p className="text-xs font-semibold text-gray-500">{fac.department}</p>
                                        </div>
                                        {getStatusBadge(fac.status)}
                                    </div>

                                    <div className="space-y-1.5 text-xs text-gray-600 border-t border-b border-gray-100 py-3">
                                        <p>Faculty ID: <strong>{fac.facultyId}</strong></p>
                                        <p>Office Location: <strong>{fac.officeLocation || 'TBA'}</strong></p>
                                        <p>Queried Time: <strong>{fac.startTime} - {fac.endTime}</strong> ({fac.date})</p>
                                        {fac.activityType && (
                                            <p className="text-rose-600 font-semibold">
                                                Active Duty: {fac.activityType} ({fac.subject || 'Duty'})
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl font-medium">
                                        System Note: {fac.details || (fac.status === 'AVAILABLE' ? 'No schedule conflict detected.' : 'Occupied on database schedule.')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 2: FACULTY SCHEDULE CALENDAR */}
                {activeTab === 'calendar' && (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Calendar size={20} className="text-secondary" /> Faculty Schedule Calendar
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Select a faculty member to inspect full timetable schedule, duties, and leaves.</p>
                            </div>

                            <select
                                value={selectedCalendarFaculty}
                                onChange={(e) => {
                                    setSelectedCalendarFaculty(e.target.value);
                                    fetchCalendar(e.target.value);
                                }}
                                className="px-4 py-2 text-sm rounded-xl border border-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50"
                            >
                                {faculties.map((f) => (
                                    <option key={f._id} value={f.facultyId || f._id}>
                                        {f.name} ({f.department})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {calendarLoading ? (
                            <div className="py-8 text-center text-gray-400 font-medium">Loading schedule calendar...</div>
                        ) : calendarTimetable.length === 0 ? (
                            <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-2xl">
                                No scheduled timetable entries found for this faculty member.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {calendarTimetable.map((slot) => (
                                    <div key={slot._id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary">
                                                {slot.day} ({slot.startTime} - {slot.endTime})
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                                                {slot.activityType}
                                            </span>
                                        </div>
                                        <h4 className="font-extrabold text-gray-900 text-sm">{slot.subject}</h4>
                                        <p className="text-xs text-gray-600 font-medium">
                                            Class: <strong>{slot.className}</strong> | Room: <strong>{slot.room}</strong>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: FIND SUBSTITUTE ENGINE */}
                {activeTab === 'substitute' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <UserPlus size={20} className="text-secondary" /> Find Substitute Teacher Engine
                            </h2>

                            {subMessage.text && (
                                <div className={`p-3 rounded-xl text-xs font-semibold ${
                                    subMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                    {subMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleFindSubstitutes} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Original Teacher *</label>
                                    <select
                                        value={subForm.originalFacultyId}
                                        onChange={(e) => setSubForm({ ...subForm, originalFacultyId: e.target.value })}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50"
                                        required
                                    >
                                        {faculties.map((f) => (
                                            <option key={f._id} value={f.facultyId || f._id}>
                                                {f.name} ({f.department})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Subject *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. DBMS"
                                        value={subForm.subject}
                                        onChange={(e) => setSubForm({ ...subForm, subject: e.target.value })}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 font-bold"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Class Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CS-3A"
                                        value={subForm.className}
                                        onChange={(e) => setSubForm({ ...subForm, className: e.target.value })}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
                                    <input
                                        type="date"
                                        value={subForm.date}
                                        onChange={(e) => setSubForm({ ...subForm, date: e.target.value })}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 font-bold"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Start Time *</label>
                                    <input
                                        type="time"
                                        value={subForm.startTime}
                                        onChange={(e) => setSubForm({ ...subForm, startTime: e.target.value })}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 font-bold"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">End Time *</label>
                                    <input
                                        type="time"
                                        value={subForm.endTime}
                                        onChange={(e) => setSubForm({ ...subForm, endTime: e.target.value })}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 font-bold"
                                        required
                                    />
                                </div>

                                <div className="sm:col-span-2 lg:col-span-6">
                                    <button
                                        type="submit"
                                        disabled={subLoading}
                                        className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                        <Search size={16} /> {subLoading ? 'Evaluating Candidates...' : 'Run Substitute Recommendation Engine'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Candidate Ranking Results */}
                        {subCandidates.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-extrabold text-gray-900">Ranked Substitute Candidates</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {subCandidates.map((cand) => (
                                        <div key={cand.faculty.facultyId} className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 space-y-4 flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-extrabold text-gray-900 text-lg">{cand.faculty.name}</h4>
                                                        <p className="text-xs font-semibold text-gray-500">{cand.faculty.department}</p>
                                                    </div>
                                                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                        Match: {cand.matchPercentage}%
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    {cand.reasons.map((r, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            {r.matched ? (
                                                                <Check size={14} className="text-emerald-600 font-bold" />
                                                            ) : (
                                                                <XCircle size={14} className="text-gray-400" />
                                                            )}
                                                            <span className={r.matched ? 'font-semibold text-gray-800' : 'text-gray-400'}>
                                                                {r.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleAssignSubstitute(cand.faculty.facultyId)}
                                                disabled={subLoading}
                                                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                                            >
                                                <UserPlus size={14} /> Assign Substitute Faculty
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: LEAVES & AVAILABILITY STATUS MANAGEMENT */}
                {activeTab === 'leaves' && (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <FileText size={20} className="text-secondary" /> Leave & Availability Status Management
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Approve, reject, or manage faculty leaves to dynamically update backend availability.</p>
                            </div>
                            <button onClick={fetchLeaves} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1">
                                <RefreshCw size={12} /> Refresh Leaves
                            </button>
                        </div>

                        {leavesLoading ? (
                            <div className="py-8 text-center text-gray-400 font-medium">Loading leaves...</div>
                        ) : leaves.length === 0 ? (
                            <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-2xl">No faculty leave records found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                            <th className="p-3">Faculty</th>
                                            <th className="p-3">Department</th>
                                            <th className="p-3">Leave Type</th>
                                            <th className="p-3">Duration</th>
                                            <th className="p-3">Reason</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                                        {leaves.map((l) => (
                                            <tr key={l._id} className="hover:bg-gray-50/80">
                                                <td className="p-3 font-bold">{l.facultyId?.name || 'Faculty'}</td>
                                                <td className="p-3">{l.facultyId?.department || 'N/A'}</td>
                                                <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">{l.leaveType}</span></td>
                                                <td className="p-3">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
                                                <td className="p-3 max-w-xs truncate">{l.reason}</td>
                                                <td className="p-3">
                                                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                                                        l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                                        l.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right space-x-1">
                                                    {l.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleUpdateLeaveStatus(l._id, 'APPROVED')} className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Approve</button>
                                                            <button onClick={() => handleUpdateLeaveStatus(l._id, 'REJECTED')} className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700">Reject</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 5: ANALYTICS & AUDIT LOGS */}
                {activeTab === 'analytics' && (
                    <div className="space-y-8">
                        {/* Analytics Cards */}
                        {analyticsData && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Total Active Faculty</p>
                                    <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{analyticsData.activeFaculty} / {analyticsData.totalFaculty}</h3>
                                    <p className="text-xs text-emerald-600 font-semibold mt-1">Status: Active & Monitoring</p>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Timetable Slots</p>
                                    <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{analyticsData.totalTimetableSlots}</h3>
                                    <p className="text-xs text-gray-600 mt-1">{analyticsData.totalLectures} Lectures, {analyticsData.totalLabs} Labs</p>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Approved Leaves</p>
                                    <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{analyticsData.approvedLeaves}</h3>
                                    <p className="text-xs text-gray-600 mt-1">{analyticsData.pendingLeaves} Pending Review</p>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Substitute Assignments</p>
                                    <h3 className="text-3xl font-extrabold text-indigo-600 mt-2">{analyticsData.approvedSubstitutes} / {analyticsData.substituteRequests}</h3>
                                    <p className="text-xs text-indigo-600 font-semibold mt-1">Automated Conflict Detection Active</p>
                                </div>
                            </div>
                        )}

                        {/* Audit Logs Table */}
                        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Shield size={20} className="text-secondary" /> System Audit Trail Logs (Admin Only)
                            </h3>

                            {auditLogs.length === 0 ? (
                                <div className="py-6 text-center text-gray-500 bg-gray-50 rounded-2xl">No audit logs recorded yet.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                                <th className="p-3">User</th>
                                                <th className="p-3">Role</th>
                                                <th className="p-3">Action</th>
                                                <th className="p-3">Entity</th>
                                                <th className="p-3">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                                            {auditLogs.map((log) => (
                                                <tr key={log._id}>
                                                    <td className="p-3 font-bold">{log.user?.name || 'Admin'}</td>
                                                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold uppercase">{log.role}</span></td>
                                                    <td className="p-3 font-bold text-secondary">{log.action}</td>
                                                    <td className="p-3">{log.entity}</td>
                                                    <td className="p-3 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFacultyDashboard;
