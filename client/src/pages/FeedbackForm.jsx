import React, { useState, useEffect, useCallback } from 'react';
import { Star, Send, CheckCircle, AlertCircle, ChevronDown, User, MessageSquare, Calendar, Loader2 } from 'lucide-react';
import api from '../services/api';

// ─── Star Rating Sub-component ───────────────────────────────────────────────
const StarRating = ({ value, onChange, disabled }) => {
    const [hovered, setHovered] = useState(0);

    const labels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };

    return (
        <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        className="p-0.5 rounded transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    >
                        <Star
                            size={32}
                            className={`transition-colors duration-150 ${
                                (hovered || value) >= star
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-200 fill-gray-200'
                            }`}
                        />
                    </button>
                ))}
                {(hovered || value) > 0 && (
                    <span className="ml-2 text-sm font-semibold text-secondary animate-fade-in">
                        {labels[hovered || value]}
                    </span>
                )}
            </div>
            {value === 0 && (
                <p className="text-xs text-gray-400">Click a star to rate</p>
            )}
        </div>
    );
};

// ─── Toast Sub-component ─────────────────────────────────────────────────────
const Toast = ({ type, message, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4500);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const config = {
        success: {
            bg: 'bg-green-50 border-green-200',
            icon: <CheckCircle size={20} className="text-green-500 flex-shrink-0" />,
            text: 'text-green-800',
        },
        error: {
            bg: 'bg-red-50 border-red-200',
            icon: <AlertCircle size={20} className="text-red-500 flex-shrink-0" />,
            text: 'text-red-800',
        },
    };

    const c = config[type];

    return (
        <div
            className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm ${c.bg} animate-slide-in`}
            role="alert"
        >
            {c.icon}
            <p className={`text-sm font-medium leading-snug ${c.text}`}>{message}</p>
            <button
                onClick={onDismiss}
                className="ml-auto text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
                aria-label="Dismiss"
            >
                ×
            </button>
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const FeedbackForm = () => {
    // User from localStorage (same pattern as rest of app)
    const user = JSON.parse(localStorage.getItem('user')) || null;

    // Form state
    const [formData, setFormData] = useState({
        studentName: user?.name || '',
        eventId: '',
        rating: 0,
        message: '',
    });

    // UI state
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

    // Duplicate guard: tracks eventIds already submitted in this session
    const [submittedEvents, setSubmittedEvents] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('feedbackSubmitted') || '[]');
        } catch {
            return [];
        }
    });

    // Derived state
    const selectedEvent = events.find((e) => e._id === formData.eventId) || null;
    const isPastEvent = selectedEvent ? new Date(selectedEvent.date) < new Date() : false;
    const alreadySubmitted = formData.eventId && submittedEvents.includes(formData.eventId);

    // ── Load events ──────────────────────────────────────────────────
    const fetchEvents = useCallback(async () => {
        try {
            const res = await api.get('/events');
            const all = res.data?.data || [];
            // Sort: past events first (more likely to want feedback on completed events)
            const sorted = all.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEvents(sorted);
        } catch {
            setToast({ type: 'error', message: 'Could not load events. Please refresh the page.' });
        } finally {
            setLoadingEvents(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // ── Validation ───────────────────────────────────────────────────
    const validate = () => {
        const errs = {};
        if (!formData.eventId) errs.eventId = 'Please select an event';
        if (formData.rating === 0) errs.rating = 'Please select a rating';
        if (!formData.message.trim()) errs.message = 'Feedback message is required';
        else if (formData.message.trim().length < 10) errs.message = 'Message must be at least 10 characters';
        else if (formData.message.trim().length > 1000) errs.message = 'Message cannot exceed 1000 characters';
        return errs;
    };

    // ── Submit ───────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        if (alreadySubmitted) {
            setToast({ type: 'error', message: 'You have already submitted feedback for this event.' });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/feedback/submit', {
                eventId: formData.eventId,
                eventName: selectedEvent?.title || '',
                rating: formData.rating,
                message: formData.message.trim(),
                studentName: formData.studentName.trim() || 'Anonymous',
            });

            // Mark as submitted in session storage
            const updated = [...submittedEvents, formData.eventId];
            setSubmittedEvents(updated);
            sessionStorage.setItem('feedbackSubmitted', JSON.stringify(updated));

            setSubmitted(true);
            setToast({ type: 'success', message: '🎉 Feedback submitted successfully! Thank you.' });

            // Reset form after short delay
            setTimeout(() => {
                setFormData({
                    studentName: user?.name || '',
                    eventId: '',
                    rating: 0,
                    message: '',
                });
                setSubmitted(false);
            }, 3000);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to submit feedback. Please try again.';
            setToast({ type: 'error', message: msg });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Clear field error on change ──────────────────────────────────
    const clearError = (field) => {
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    // ── Field classes ────────────────────────────────────────────────
    const inputBase =
        'w-full rounded-xl border bg-gray-50 px-4 py-3 text-gray-900 text-sm transition-all outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary focus:bg-white placeholder:text-gray-400';
    const inputError = 'border-red-300 bg-red-50/30 focus:ring-red-200 focus:border-red-400';
    const inputNormal = 'border-gray-200';

    const fieldClass = (field) => `${inputBase} ${errors[field] ? inputError : inputNormal}`;

    // ── Event label helper ───────────────────────────────────────────
    const eventLabel = (event) => {
        const date = new Date(event.date);
        const isPast = date < new Date();
        const formatted = date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        return `${event.title} — ${formatted}${isPast ? ' ✓' : ' (upcoming)'}`;
    };

    return (
        <>
            {/* Toast notification */}
            {toast && (
                <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
            )}

            <div className="min-h-screen bg-gray-50 py-10 px-4">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* ── Page Header ─────────────────────────────── */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-secondary/10 rounded-xl">
                                <MessageSquare size={22} className="text-secondary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Event Feedback</h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Share your experience to help us improve future events
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Form Card ───────────────────────────────── */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                        {/* Success overlay */}
                        {submitted && (
                            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={32} className="text-green-500" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Thank You!</h2>
                                <p className="text-gray-500 text-sm">
                                    Your feedback has been recorded. Resetting form…
                                </p>
                                <div className="mt-4 w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-secondary rounded-full animate-[shrink_3s_linear_forwards]" />
                                </div>
                            </div>
                        )}

                        {!submitted && (
                            <form onSubmit={handleSubmit} noValidate className="p-6 md:p-8 space-y-6">

                                {/* ── Student Name ────────────────── */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                        <User size={14} className="text-secondary" />
                                        Your Name
                                        <span className="text-gray-400 font-normal text-xs">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="studentName"
                                        placeholder="Enter your name or leave blank for anonymous"
                                        className={`${inputBase} ${inputNormal}`}
                                        value={formData.studentName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, studentName: e.target.value })
                                        }
                                        maxLength={80}
                                        disabled={submitting}
                                    />
                                    {user && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                            Logged in as <span className="font-medium text-gray-600">{user.name}</span>
                                        </p>
                                    )}
                                </div>

                                {/* ── Event Selector ──────────────── */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700" htmlFor="eventId">
                                        <Calendar size={14} className="text-secondary" />
                                        Select Event
                                        <span className="text-red-400">*</span>
                                    </label>

                                    <div className="relative">
                                        <select
                                            id="eventId"
                                            className={`${fieldClass('eventId')} appearance-none pr-10 cursor-pointer`}
                                            value={formData.eventId}
                                            onChange={(e) => {
                                                setFormData({ ...formData, eventId: e.target.value });
                                                clearError('eventId');
                                            }}
                                            disabled={loadingEvents || submitting}
                                        >
                                            <option value="">
                                                {loadingEvents ? 'Loading events…' : '— Choose an event —'}
                                            </option>
                                            {events.length > 0 && (
                                                <>
                                                    <optgroup label="Past Events (feedback recommended)">
                                                        {events
                                                            .filter((e) => new Date(e.date) < new Date())
                                                            .map((event) => (
                                                                <option key={event._id} value={event._id}>
                                                                    {eventLabel(event)}
                                                                </option>
                                                            ))}
                                                    </optgroup>
                                                    <optgroup label="Upcoming Events">
                                                        {events
                                                            .filter((e) => new Date(e.date) >= new Date())
                                                            .map((event) => (
                                                                <option key={event._id} value={event._id}>
                                                                    {eventLabel(event)}
                                                                </option>
                                                            ))}
                                                    </optgroup>
                                                </>
                                            )}
                                        </select>
                                        <ChevronDown
                                            size={16}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                        />
                                    </div>

                                    {errors.eventId && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle size={12} /> {errors.eventId}
                                        </p>
                                    )}

                                    {/* Event info chip */}
                                    {selectedEvent && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 font-medium">
                                                <Calendar size={11} />
                                                {new Date(selectedEvent.date).toLocaleDateString('en-IN', {
                                                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                                                })}
                                            </span>
                                            {selectedEvent.venue && (
                                                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">
                                                    📍 {selectedEvent.venue}
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${isPastEvent ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                                {isPastEvent ? '✓ Completed' : '⏳ Upcoming'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Upcoming event notice */}
                                    {selectedEvent && !isPastEvent && (
                                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                            <span>
                                                This event hasn't happened yet. You can still submit feedback,
                                                but it's most useful after attending.
                                            </span>
                                        </div>
                                    )}

                                    {/* Duplicate submission notice */}
                                    {alreadySubmitted && (
                                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                                            <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                                            <span>
                                                You've already submitted feedback for this event in this session.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* ── Star Rating ─────────────────── */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                        <Star size={14} className="text-secondary" />
                                        Overall Rating
                                        <span className="text-red-400">*</span>
                                    </label>
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <StarRating
                                            value={formData.rating}
                                            onChange={(val) => {
                                                setFormData({ ...formData, rating: val });
                                                clearError('rating');
                                            }}
                                            disabled={submitting}
                                        />
                                    </div>
                                    {errors.rating && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle size={12} /> {errors.rating}
                                        </p>
                                    )}
                                </div>

                                {/* ── Feedback Message ─────────────── */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700" htmlFor="message">
                                        <MessageSquare size={14} className="text-secondary" />
                                        Your Feedback
                                        <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        id="message"
                                        rows={5}
                                        placeholder="Tell us about your experience — what you liked, what could be improved, and any suggestions for future events…"
                                        className={`${fieldClass('message')} resize-none leading-relaxed`}
                                        value={formData.message}
                                        onChange={(e) => {
                                            setFormData({ ...formData, message: e.target.value });
                                            clearError('message');
                                        }}
                                        maxLength={1000}
                                        disabled={submitting}
                                    />
                                    <div className="flex justify-between items-center">
                                        {errors.message ? (
                                            <p className="text-xs text-red-500 flex items-center gap-1">
                                                <AlertCircle size={12} /> {errors.message}
                                            </p>
                                        ) : (
                                            <span />
                                        )}
                                        <span className={`text-xs tabular-nums ${formData.message.length > 900 ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                                            {formData.message.length}/1000
                                        </span>
                                    </div>
                                </div>

                                {/* ── Divider ─────────────────────── */}
                                <div className="border-t border-gray-100" />

                                {/* ── Submit Button ────────────────── */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="submit"
                                        disabled={submitting || alreadySubmitted}
                                        className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Submitting…
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                Submit Feedback
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({
                                                studentName: user?.name || '',
                                                eventId: '',
                                                rating: 0,
                                                message: '',
                                            });
                                            setErrors({});
                                        }}
                                        disabled={submitting}
                                        className="sm:w-auto px-6 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl font-medium transition-all text-sm disabled:opacity-50"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* ── Info card ───────────────────────────────── */}
                    <div className="bg-secondary/5 border border-secondary/10 rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-secondary mb-2">💡 Why your feedback matters</h3>
                        <ul className="text-xs text-gray-600 space-y-1.5 list-none">
                            <li className="flex items-start gap-2">
                                <span className="text-secondary font-bold mt-0.5">•</span>
                                Feedback is analyzed using AI to help organizers understand what worked well
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-secondary font-bold mt-0.5">•</span>
                                You can submit anonymously — your name is optional
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-secondary font-bold mt-0.5">•</span>
                                Responses are only visible to faculty coordinators and admins
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FeedbackForm;
