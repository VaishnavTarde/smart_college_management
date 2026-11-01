import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart2, Brain, RefreshCw, Printer, ChevronDown,
    MessageSquare, Star, TrendingUp, ThumbsUp, AlertTriangle,
    Lightbulb, Hash, Users, Calendar, Lock,
    Smile, Meh, Frown, CheckCircle
} from 'lucide-react';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────
// Pure-SVG Donut Chart  (no external library)
// ─────────────────────────────────────────────────────────────
const DonutChart = ({ positive = 0, neutral = 0, negative = 0 }) => {
    const R = 54; const CX = 70; const CY = 70;
    const circumference = 2 * Math.PI * R;

    // segments: clamp to 100 total
    const total = positive + neutral + negative || 100;
    const pct = (v) => (v / total) * circumference;

    const segments = [
        { label: 'Positive', value: positive, color: '#22c55e', offset: 0 },
        { label: 'Neutral',  value: neutral,  color: '#f59e0b', offset: pct(positive) },
        { label: 'Negative', value: negative, color: '#ef4444', offset: pct(positive) + pct(neutral) },
    ];

    return (
        <div className="flex flex-col items-center gap-4">
            <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-sm">
                {/* Background ring */}
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth="18" />
                {segments.map((seg, i) =>
                    seg.value > 0 ? (
                        <circle
                            key={i} cx={CX} cy={CY} r={R} fill="none"
                            stroke={seg.color} strokeWidth="18"
                            strokeDasharray={`${pct(seg.value)} ${circumference - pct(seg.value)}`}
                            strokeDashoffset={-seg.offset}
                            strokeLinecap="butt"
                            transform={`rotate(-90 ${CX} ${CY})`}
                            style={{ transition: 'stroke-dasharray 0.6s ease' }}
                        />
                    ) : null
                )}
                {/* Centre label */}
                <text x={CX} y={CY - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#1e293b">
                    {positive}%
                </text>
                <text x={CX} y={CY + 12} textAnchor="middle" fontSize="10" fill="#64748b">
                    Positive
                </text>
            </svg>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3">
                {segments.map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span>{s.label} <span className="font-semibold text-gray-800">{s.value}%</span></span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// CSS Bar Chart for rating distribution (1–5 stars)
// ─────────────────────────────────────────────────────────────
const RatingBarChart = ({ distribution = {} }) => {
    const max = Math.max(...Object.values(distribution), 1);
    const colors = {
        1: 'bg-red-400',
        2: 'bg-orange-400',
        3: 'bg-yellow-400',
        4: 'bg-blue-400',
        5: 'bg-green-500',
    };
    return (
        <div className="space-y-2 w-full">
            {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] || 0;
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                    <div key={star} className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5 w-14 flex-shrink-0">
                            {[...Array(star)].map((_, i) => (
                                <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />
                            ))}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${colors[star]} transition-all duration-700`}
                                style={{ width: `${pct}%`, minWidth: count > 0 ? '4px' : '0' }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 w-6 text-right">{count}</span>
                    </div>
                );
            })}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Multi-event Trend Bar Chart (avg rating per event)
// ─────────────────────────────────────────────────────────────
const TrendChart = ({ trendData = [] }) => {
    if (trendData.length < 2) return (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
            <BarChart2 size={28} className="opacity-40" />
            <span>Need feedback on 2+ events for trend view</span>
        </div>
    );
    const maxRating = 5;
    return (
        <div className="flex items-end gap-2 h-32 px-2">
            {trendData.slice(-10).map((item, i) => {
                const heightPct = (item.avg / maxRating) * 100;
                return (
                    <div key={i} className="flex flex-col items-center flex-1 gap-1 group">
                        <span className="text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                            {item.avg}★
                        </span>
                        <div
                            className="w-full bg-secondary rounded-t-md transition-all duration-700 relative cursor-default"
                            style={{ height: `${Math.max(heightPct, 8)}%` }}
                            title={`${item.eventTitle}: ${item.avg}★ (${item.count} responses)`}
                        />
                        <span className="text-[9px] text-gray-400 text-center line-clamp-1 w-full px-0.5">
                            {item.eventTitle?.split(' ')[0]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Skeleton loader (shimmer effect)
// ─────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
    <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />
);

const SkeletonSummary = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3 shadow-sm">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
            </div>
        ))}
    </div>
);

const SkeletonInsights = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
            </div>
        ))}
    </div>
);

// ─────────────────────────────────────────────────────────────
// Insight Card
// ─────────────────────────────────────────────────────────────
const InsightCard = ({ icon: Icon, title, items = [], iconColor, bgColor, emptyMsg }) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-full">
        <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${bgColor}`}>
                <Icon size={16} className={iconColor} />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        </div>
        {items.length > 0 ? (
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${iconColor.replace('text-', 'bg-')}`} />
                        {item}
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-gray-400 italic">{emptyMsg || 'None identified'}</p>
        )}
    </div>
);

// ─────────────────────────────────────────────────────────────
// Individual feedback row
// ─────────────────────────────────────────────────────────────
const sentimentConfig = {
    Positive: { bg: 'bg-green-50 text-green-700 border-green-200', icon: <Smile size={12} /> },
    Neutral:  { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Meh size={12} /> },
    Negative: { bg: 'bg-red-50 text-red-700 border-red-200', icon: <Frown size={12} /> },
};

const FeedbackRow = ({ feedback }) => {
    const sc = sentimentConfig[feedback.sentimentLabel] || sentimentConfig.Neutral;
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100/50 transition-colors">
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm">
                    {feedback.studentName?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                    <p className="text-xs font-semibold text-gray-800">{feedback.studentName || 'Anonymous'}</p>
                    <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10}
                                className={i < feedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                    </div>
                </div>
            </div>
            <p className="flex-1 text-sm text-gray-600 leading-relaxed">{feedback.message}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
                {feedback.sentimentLabel && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.bg}`}>
                        {sc.icon} {feedback.sentimentLabel}
                    </span>
                )}
                <span className="text-[10px] text-gray-400">
                    {new Date(feedback.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
            </div>
        </div>
    );
};

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
const FeedbackAnalytics = () => {
    const navigate = useNavigate();
    const printRef = useRef(null);

    // Auth guard
    const user = JSON.parse(localStorage.getItem('user'));
    const isAuthorized = user && (user.role === 'teacher' || user.role === 'admin');

    // State
    const [events, setEvents]           = useState([]);
    const [selectedEventId, setSelected] = useState('');
    const [analytics, setAnalytics]     = useState(null);
    const [feedbackList, setFeedbackList] = useState([]);
    const [trendData, setTrendData]     = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [refreshing, setRefreshing]   = useState(false);
    const [error, setError]             = useState('');

    // Redirect if not authorized
    useEffect(() => {
        if (!isAuthorized) navigate('/dashboard');
    }, [isAuthorized, navigate]);

    // ── Load events ──────────────────────────────────────────
    const fetchEvents = useCallback(async () => {
        try {
            const res = await api.get('/events');
            const sorted = (res.data?.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
            setEvents(sorted);
        } catch {
            setError('Failed to load events');
        } finally {
            setLoadingEvents(false);
        }
    }, []);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    // ── Load trend data (all feedback grouped by event) ──────
    const fetchTrend = useCallback(async () => {
        try {
            const res = await api.get('/feedback/all');
            const all = res.data?.data || [];

            // Group by eventId, compute avg rating + count
            const groups = {};
            all.forEach((f) => {
                const id = f.eventId?._id || f.eventId;
                if (!id) return;
                if (!groups[id]) {
                    groups[id] = {
                        eventTitle: f.eventId?.title || f.eventName || 'Unknown Event',
                        eventDate: f.eventId?.date,
                        ratings: [],
                    };
                }
                groups[id].ratings.push(f.rating);
            });

            const trend = Object.values(groups)
                .map((g) => ({
                    eventTitle: g.eventTitle,
                    eventDate: g.eventDate,
                    avg: (g.ratings.reduce((s, r) => s + r, 0) / g.ratings.length).toFixed(1),
                    count: g.ratings.length,
                }))
                .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

            setTrendData(trend);
        } catch {
            // Trend is optional — silently ignore
        }
    }, []);

    useEffect(() => { fetchTrend(); }, [fetchTrend]);

    // ── Load analytics + per-event feedback ──────────────────
    const fetchAnalytics = useCallback(async (eventId, isRefresh = false) => {
        if (!eventId) return;
        isRefresh ? setRefreshing(true) : setLoadingAnalytics(true);
        setError('');
        setAnalytics(null);
        setFeedbackList([]);

        try {
            const [analyticsRes, feedbackRes] = await Promise.all([
                api.get(`/feedback/analytics/${eventId}`),
                api.get(`/feedback/event/${eventId}`),
            ]);

            setAnalytics(analyticsRes.data?.analytics || null);
            setFeedbackList(feedbackRes.data?.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load analytics. Please try again.');
        } finally {
            setLoadingAnalytics(false);
            setRefreshing(false);
        }
    }, []);

    const handleEventChange = (e) => {
        setSelected(e.target.value);
        if (e.target.value) fetchAnalytics(e.target.value);
        else { setAnalytics(null); setFeedbackList([]); }
    };

    const handleRefresh = () => fetchAnalytics(selectedEventId, true);

    const handlePrint = () => window.print();

    // ── Derived ──────────────────────────────────────────────
    const selectedEventObj = events.find((e) => e._id === selectedEventId);

    // ── Stat card config ─────────────────────────────────────
    const summaryCards = analytics ? [
        {
            icon: Users, label: 'Total Responses', value: analytics.totalResponses,
            iconBg: 'bg-blue-50', iconColor: 'text-secondary', valuePfx: '',
        },
        {
            icon: Star, label: 'Average Rating', value: analytics.averageRating,
            iconBg: 'bg-yellow-50', iconColor: 'text-yellow-500', valueSfx: ' / 5',
        },
        {
            icon: Smile, label: 'Positive', value: `${analytics.positivePercent}%`,
            iconBg: 'bg-green-50', iconColor: 'text-green-500',
        },
        {
            icon: Meh, label: 'Neutral', value: `${analytics.neutralPercent}%`,
            iconBg: 'bg-amber-50', iconColor: 'text-amber-500',
        },
        {
            icon: Frown, label: 'Negative', value: `${analytics.negativePercent}%`,
            iconBg: 'bg-red-50', iconColor: 'text-red-500',
        },
    ] : [];

    // ── Access denied screen ─────────────────────────────────
    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                    <Lock size={28} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Access Restricted</h2>
                <p className="text-gray-500 max-w-sm">
                    This page is only accessible to teachers and administrators.
                </p>
                <button onClick={() => navigate('/dashboard')}
                    className="mt-2 px-5 py-2.5 bg-secondary text-white rounded-xl font-semibold hover:bg-accent transition-colors">
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <>
            {/* ── Print stylesheet ───────────────────────────────── */}
            <style>{`
                @media print {
                    nav, footer, .no-print { display: none !important; }
                    .print-area { padding: 0 !important; }
                    body { background: white !important; }
                }
            `}</style>

            <div className="space-y-6 pb-10 print-area" ref={printRef}>

                {/* ── Page Header ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-secondary/10 rounded-xl">
                            <Brain size={24} className="text-secondary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">AI Feedback Analytics</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Sentiment analysis powered by Google Gemini · Teacher &amp; Admin only
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 no-print">
                        <button
                            onClick={handleRefresh}
                            disabled={!selectedEventId || refreshing || loadingAnalytics}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={!analytics}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-accent text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Printer size={15} />
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* ── Event Filter ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                        <Calendar size={14} className="text-secondary" />
                        Select Event to Analyze
                    </label>
                    <div className="relative max-w-lg">
                        <select
                            value={selectedEventId}
                            onChange={handleEventChange}
                            disabled={loadingEvents}
                            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm text-gray-800 focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none transition-all cursor-pointer"
                        >
                            <option value="">{loadingEvents ? 'Loading events…' : '— Choose an event —'}</option>
                            {events.map((ev) => (
                                <option key={ev._id} value={ev._id}>
                                    {ev.title} — {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Selected event chip */}
                    {selectedEventObj && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 font-medium">
                                <Calendar size={11} />
                                {new Date(selectedEventObj.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {selectedEventObj.venue && (
                                <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">
                                    📍 {selectedEventObj.venue}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                                {selectedEventObj.category || 'Event'}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Error ───────────────────────────────────────────── */}
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold">Error: </span>{error}
                        </div>
                    </div>
                )}

                {/* ── Loading skeletons ────────────────────────────────── */}
                {loadingAnalytics && (
                    <div className="space-y-6">
                        <SkeletonSummary />
                        <SkeletonInsights />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <Skeleton className="h-4 w-32 mb-6" />
                                <div className="flex justify-center">
                                    <Skeleton className="h-36 w-36 rounded-full" />
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
                                <Skeleton className="h-4 w-32 mb-4" />
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Empty state — no event selected ─────────────────── */}
                {!selectedEventId && !loadingAnalytics && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center gap-4">
                        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center">
                            <BarChart2 size={28} className="text-secondary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Select an Event</h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                                Choose an event from the dropdown above to view AI-powered sentiment analytics.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Empty state — event selected but no feedback ─────── */}
                {selectedEventId && !loadingAnalytics && analytics && analytics.totalResponses === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center gap-4">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                            <MessageSquare size={28} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">No Feedback Yet</h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                                No students have submitted feedback for this event yet. Share the{' '}
                                <a href="/feedback" className="text-secondary underline">feedback form</a> link with attendees.
                            </p>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════ */}
                {/* ANALYTICS DATA — shown once loaded                    */}
                {/* ══════════════════════════════════════════════════════ */}
                {!loadingAnalytics && analytics && analytics.totalResponses > 0 && (
                    <div className="space-y-6">

                        {/* ── 1. Summary Stats Cards ───────────────────── */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {summaryCards.map(({ icon: Icon, label, value, iconBg, iconColor, valueSfx }) => (
                                <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                    <div className={`p-2 rounded-xl w-fit mb-3 ${iconBg}`}>
                                        <Icon size={18} className={iconColor} />
                                    </div>
                                    <p className="text-2xl font-extrabold text-gray-900 leading-none">
                                        {value}{valueSfx || ''}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── 2. AI Summary Banner ─────────────────────── */}
                        <div className="bg-gradient-to-r from-secondary/8 via-blue-50 to-secondary/5 border border-secondary/20 rounded-2xl p-5">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-secondary/10 rounded-xl flex-shrink-0">
                                    <Brain size={20} className="text-secondary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-secondary mb-1 text-sm">AI Overall Summary</h3>
                                    <p className="text-gray-700 text-sm leading-relaxed">
                                        {analytics.summary || 'Analysis complete.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── 3. Charts Row ────────────────────────────── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Sentiment Donut */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
                                    <div className="p-1 bg-blue-50 rounded-lg">
                                        <TrendingUp size={14} className="text-secondary" />
                                    </div>
                                    Sentiment Distribution
                                </h3>
                                <div className="flex justify-center">
                                    <DonutChart
                                        positive={analytics.positivePercent}
                                        neutral={analytics.neutralPercent}
                                        negative={analytics.negativePercent}
                                    />
                                </div>
                            </div>

                            {/* Rating Bar Chart */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
                                    <div className="p-1 bg-yellow-50 rounded-lg">
                                        <Star size={14} className="text-yellow-500" />
                                    </div>
                                    Rating Distribution
                                </h3>
                                <RatingBarChart distribution={analytics.ratingDistribution} />
                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>Total responses: <span className="font-bold text-gray-800">{analytics.totalResponses}</span></span>
                                    <span>Avg: <span className="font-bold text-yellow-500">{'★'.repeat(Math.round(analytics.averageRating))}</span> {analytics.averageRating}/5</span>
                                </div>
                            </div>
                        </div>

                        {/* ── 4. Trend Chart ───────────────────────────── */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
                                <div className="p-1 bg-purple-50 rounded-lg">
                                    <TrendingUp size={14} className="text-purple-500" />
                                </div>
                                Rating Trend Across Events
                            </h3>
                            <TrendChart trendData={trendData} />
                        </div>

                        {/* ── 5. AI Insights Grid ──────────────────────── */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Brain size={18} className="text-secondary" /> AI-Generated Insights
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InsightCard
                                    icon={ThumbsUp} title="What Students Liked"
                                    items={analytics.likedPoints}
                                    iconColor="text-green-600" bgColor="bg-green-50"
                                    emptyMsg="No specific positive points identified"
                                />
                                <InsightCard
                                    icon={AlertTriangle} title="Common Complaints"
                                    items={analytics.complaints}
                                    iconColor="text-red-500" bgColor="bg-red-50"
                                    emptyMsg="No complaints identified — great event!"
                                />
                                <InsightCard
                                    icon={Lightbulb} title="Suggestions for Improvement"
                                    items={analytics.suggestions}
                                    iconColor="text-amber-500" bgColor="bg-amber-50"
                                    emptyMsg="No specific suggestions provided"
                                />
                                <InsightCard
                                    icon={Hash} title="Recurring Topics"
                                    items={analytics.recurringTopics}
                                    iconColor="text-purple-500" bgColor="bg-purple-50"
                                    emptyMsg="No recurring topics detected"
                                />
                            </div>
                        </div>

                        {/* ── 6. Individual Feedback List ──────────────── */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                                    <div className="p-1 bg-blue-50 rounded-lg">
                                        <MessageSquare size={14} className="text-secondary" />
                                    </div>
                                    All Responses ({feedbackList.length})
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <CheckCircle size={12} className="text-green-400" />
                                    Sentiment labels auto-generated by AI
                                </div>
                            </div>
                            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                                {feedbackList.length > 0 ? (
                                    feedbackList.map((f) => <FeedbackRow key={f._id} feedback={f} />)
                                ) : (
                                    <p className="text-gray-400 text-sm text-center py-6">No individual responses to show</p>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </>
    );
};

export default FeedbackAnalytics;
