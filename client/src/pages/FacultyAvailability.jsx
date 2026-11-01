import React, { useState, useEffect } from 'react';
import {
    Search, Calendar, Clock, UserCheck, CheckCircle2, XCircle, AlertCircle,
    Building2, BookOpen, MapPin, User, ShieldAlert, UserCheck2
} from 'lucide-react';
import api from '../services/api';

const FacultyAvailability = () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'my-availability'
    const [searchParams, setSearchParams] = useState({
        date: todayStr,
        startTime: '10:00',
        endTime: '11:00',
        department: '',
        subject: '',
        facultyName: '',
    });

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    // My Availability State (For Teacher / Admin)
    const [myAvailability, setMyAvailability] = useState(null);
    const [myLoading, setMyLoading] = useState(false);
    const [myError, setMyError] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            if (parsed.role === 'teacher') {
                fetchMyAvailability();
            }
        }
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        setLoading(true);
        setError('');
        try {
            const query = new URLSearchParams({
                date: searchParams.date,
                startTime: searchParams.startTime,
                endTime: searchParams.endTime,
                ...(searchParams.department && { department: searchParams.department }),
                ...(searchParams.subject && { subject: searchParams.subject }),
                ...(searchParams.facultyName && { facultyName: searchParams.facultyName }),
            }).toString();

            const res = await api.get(`/faculty/availability?${query}`);
            setResults(res.data.data || []);
        } catch (err) {
            console.error('Error fetching availability:', err);
            setError(err.response?.data?.message || 'Failed to fetch faculty availability');
        } finally {
            setLoading(false);
        }
    };

    const fetchMyAvailability = async () => {
        setMyLoading(true);
        setMyError('');
        try {
            const query = new URLSearchParams({
                date: searchParams.date,
                startTime: searchParams.startTime,
                endTime: searchParams.endTime,
            }).toString();

            const res = await api.get(`/faculty/my-availability?${query}`);
            setMyAvailability(res.data.data);
        } catch (err) {
            console.error('Error fetching my availability:', err);
            setMyError(err.response?.data?.message || 'Failed to fetch your availability status.');
        } finally {
            setMyLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchAvailability();
        if (user && (user.role === 'teacher' || user.role === 'admin')) {
            fetchMyAvailability();
        }
    };

    const getStatusBadge = (status, details) => {
        switch (status) {
            case 'AVAILABLE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        🟢 AVAILABLE
                    </span>
                );
            case 'BUSY':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        🔴 BUSY
                    </span>
                );
            case 'UNAVAILABLE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        🟡 UNAVAILABLE
                    </span>
                );
            case 'OUTSIDE_WORKING_HOURS':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-white border border-gray-900">
                        ⚫ OUTSIDE WORKING HOURS
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                        {status}
                    </span>
                );
        }
    };

    const isTeacherOrAdmin = user && (user.role === 'teacher' || user.role === 'admin');

    return (
        <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Banner */}
                <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold tracking-wider text-accent mb-3 uppercase">
                                <UserCheck size={14} /> Backend MongoDB Source of Truth
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Faculty Availability</h1>
                            <p className="mt-2 text-gray-300 text-sm max-w-2xl">
                                Real-time faculty availability calculated from working hours, timetables, labs, meetings, leaves, exams, events, and department duties.
                            </p>
                        </div>

                        {/* Role Tabs for Teachers/Admins */}
                        {isTeacherOrAdmin && (
                            <div className="flex bg-white/10 p-1 rounded-2xl backdrop-blur-md self-start md:self-auto border border-white/10">
                                <button
                                    onClick={() => setActiveTab('search')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === 'search'
                                            ? 'bg-white text-gray-900 shadow-md'
                                            : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    Search Faculty
                                </button>
                                <button
                                    onClick={() => { setActiveTab('my-availability'); fetchMyAvailability(); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === 'my-availability'
                                            ? 'bg-white text-gray-900 shadow-md'
                                            : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    My Availability
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* SEARCH FORM */}
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                    <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <User size={14} className="text-secondary" /> Teacher Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Dr. Alan"
                                value={searchParams.facultyName}
                                onChange={(e) => setSearchParams({ ...searchParams, facultyName: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Calendar size={14} className="text-secondary" /> Date *
                            </label>
                            <input
                                type="date"
                                value={searchParams.date}
                                onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Clock size={14} className="text-secondary" /> Start Time *
                            </label>
                            <input
                                type="time"
                                value={searchParams.startTime}
                                onChange={(e) => setSearchParams({ ...searchParams, startTime: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Clock size={14} className="text-secondary" /> End Time *
                            </label>
                            <input
                                type="time"
                                value={searchParams.endTime}
                                onChange={(e) => setSearchParams({ ...searchParams, endTime: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <Building2 size={14} className="text-secondary" /> Department
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Computer Engineering"
                                value={searchParams.department}
                                onChange={(e) => setSearchParams({ ...searchParams, department: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                <BookOpen size={14} className="text-secondary" /> Subject
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. DBMS"
                                value={searchParams.subject}
                                onChange={(e) => setSearchParams({ ...searchParams, subject: e.target.value })}
                                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/50 font-medium"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Search size={16} /> {loading ? 'Searching...' : 'Search'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* MY AVAILABILITY TAB CONTENT FOR TEACHERS */}
                {isTeacherOrAdmin && activeTab === 'my-availability' && (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <UserCheck2 size={20} className="text-secondary" /> My Availability Status
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Calculated from your working hours, timetable, leave, and assigned duties for {searchParams.date} ({searchParams.startTime} - {searchParams.endTime}).
                                </p>
                            </div>
                            <button
                                onClick={fetchMyAvailability}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                            >
                                Refresh My Status
                            </button>
                        </div>

                        {myLoading ? (
                            <div className="py-8 text-center text-gray-400 font-medium animate-pulse">Calculating your availability...</div>
                        ) : myError ? (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm font-medium">
                                {myError}
                            </div>
                        ) : myAvailability ? (
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-extrabold text-gray-900">{myAvailability.name}</h3>
                                        {getStatusBadge(myAvailability.status, myAvailability.details)}
                                    </div>
                                    <p className="text-sm text-gray-600 font-medium">
                                        Department: <strong>{myAvailability.department}</strong> | Office: <strong>{myAvailability.officeLocation || 'TBA'}</strong>
                                    </p>
                                    {myAvailability.activityType && (
                                        <p className="text-xs text-rose-600 font-semibold">
                                            Current Activity: {myAvailability.activityType} ({myAvailability.subject || 'Scheduled Duty'})
                                        </p>
                                    )}
                                </div>
                                <div className="text-right text-xs text-gray-500 space-y-1">
                                    <p>Slot: <strong>{myAvailability.startTime} - {myAvailability.endTime}</strong></p>
                                    <p>Date: <strong>{myAvailability.date}</strong></p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-medium">
                        <ShieldAlert size={18} className="text-rose-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* SEARCH RESULTS SECTION */}
                {(activeTab === 'search' || !isTeacherOrAdmin) && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                Verified Availability Results
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                    {results.length} Faculty
                                </span>
                            </h2>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse space-y-4">
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                                        <div className="h-8 bg-gray-200 rounded" />
                                    </div>
                                ))}
                            </div>
                        ) : results.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                                <UserCheck size={48} className="mx-auto text-gray-300 mb-3" />
                                <h3 className="text-lg font-bold text-gray-800">No matching faculty found</h3>
                                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                                    No faculty records found for the selected department, subject, or time slot.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.map((fac) => {
                                    const isStudent = user && user.role === 'student';
                                    const displayDetails = (isStudent && fac.status === 'UNAVAILABLE')
                                        ? 'Not available during this time.'
                                        : (fac.details || (fac.status === 'AVAILABLE' ? 'Free for consultation' : 'Busy with scheduled duty'));

                                    return (
                                        <div
                                            key={fac.facultyId}
                                            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="font-extrabold text-gray-900 text-lg">{fac.name}</h3>
                                                        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <Building2 size={12} /> {fac.department}
                                                        </p>
                                                    </div>
                                                    {getStatusBadge(fac.status, displayDetails)}
                                                </div>

                                                <div className="space-y-1.5 text-xs text-gray-600 border-t border-b border-gray-100 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={13} className="text-gray-400" />
                                                        <span>Office Location: <strong>{fac.officeLocation || 'TBA'}</strong></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <User size={13} className="text-gray-400" />
                                                        <span>Faculty ID: <strong>{fac.facultyId}</strong></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={13} className="text-gray-400" />
                                                        <span>Slot: <strong>{fac.startTime} - {fac.endTime}</strong> ({fac.date})</span>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50 p-2.5 rounded-xl text-xs font-medium text-gray-700">
                                                    Status Note: <span className="font-semibold text-gray-900">{displayDetails}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyAvailability;
