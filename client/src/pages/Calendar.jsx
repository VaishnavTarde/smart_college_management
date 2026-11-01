import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import api from '../services/api';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Form Data for creating events
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        eventDate: '',
        eventHour: '12',
        eventMinute: '00',
        eventAmPm: 'AM',
        venue: '',
        club: '',
        customOrganizer: '',
        category: 'Tech',
        registrationLink: ''
    });
    const [clubs, setClubs] = useState([]);

    const [filterClub, setFilterClub] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const canCreate = user && (user.role === 'teacher' || user.role === 'admin');

    useEffect(() => {
        fetchEvents();
        fetchClubs();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/events');
            setEvents(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClubs = async () => {
        try {
            const res = await api.get('/clubs');
            setClubs(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const addToGoogleCalendar = (event) => {
        const title = encodeURIComponent(event.title);
        const description = encodeURIComponent(event.description);
        const location = encodeURIComponent(event.venue);

        const startDate = new Date(event.date);
        const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration if no endDate

        const formatGCalDate = (date) => {
            return date.toISOString().replace(/-|:|\.\d+/g, '');
        };

        const start = formatGCalDate(startDate);
        const end = formatGCalDate(endDate);

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&location=${location}&dates=${start}/${end}`;
        window.open(url, '_blank');
    };

    // Calendar Helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleDateClick = (day) => {
        if (!canCreate) return;

        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = clickedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

        setFormData({
            title: '',
            description: '',
            eventDate: dateStr,
            eventHour: '09',
            eventMinute: '00',
            eventAmPm: 'AM',
            venue: '',
            club: '',
            customOrganizer: '',
            category: 'Tech',
            registrationLink: '',
            endDate: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Convert 12h to 24h for date construction
            let hours = parseInt(formData.eventHour);
            if (formData.eventAmPm === 'PM' && hours !== 12) hours += 12;
            if (formData.eventAmPm === 'AM' && hours === 12) hours = 0;
            const timeString = `${hours.toString().padStart(2, '0')}:${formData.eventMinute}`;

            const combinedDate = new Date(`${formData.eventDate}T${timeString}`);

            const payload = {
                title: formData.title,
                description: formData.description,
                date: combinedDate.toISOString(),
                venue: formData.venue,
                category: formData.category,
                registrationLink: formData.registrationLink,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null
            };

            if (formData.club === 'other') {
                payload.customOrganizer = formData.customOrganizer;
            } else {
                payload.club = formData.club;
            }

            await api.post('/events', payload);
            setShowModal(false);
            fetchEvents();
            alert('Event added successfully!');
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating event');
        }
    };

    // Filter Events
    const [showMyEvents, setShowMyEvents] = useState(false);

    const filteredEvents = events.filter(event => {
        const matchClub = filterClub ? event.club === filterClub || (event.club && event.club._id === filterClub) : true;
        const matchCategory = filterCategory ? event.category === filterCategory : true;
        const matchMyEvents = showMyEvents ? (user && event.registeredStudents && event.registeredStudents.includes(user._id)) : true;
        return matchClub && matchCategory && matchMyEvents;
    });

    // Rendering Days
    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-28 bg-gray-50 border border-gray-100/50"></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            const dayEvents = filteredEvents.filter(e => new Date(e.date).toDateString() === dateStr);
            const isToday = new Date().toDateString() === dateStr;

            days.push(
                <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-28 border border-gray-100 p-2 relative group transition-colors overflow-hidden
                        ${isToday ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'} 
                        ${canCreate ? 'cursor-pointer hover:border-secondary/30' : ''}
                    `}
                >
                    <div className={`text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-secondary text-white' : 'text-gray-700'}`}>
                        {day}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[calc(100%-2rem)] scrollbar-hide">
                        {dayEvents.map(event => (
                            <div key={event._id} className={`text-xs p-1.5 rounded-md border truncate font-medium group/event relative cursor-pointer
                                ${event.category === 'Tech'
                                    ? 'bg-secondary/10 text-secondary border-secondary/20'
                                    : 'bg-orange-50 text-orange-700 border-orange-100'}
                            `} title={event.title}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!canCreate) addToGoogleCalendar(event);
                                }}>
                                {event.title}
                                {!canCreate && <span className="absolute right-1 top-0.5 opacity-0 group-hover/event:opacity-100 text-[10px]">📅</span>}
                            </div>
                        ))}
                    </div>

                    {canCreate && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={14} className="text-secondary" />
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    if (loading) return <div className="text-center py-10 text-gray-500">Loading...</div>;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Event Calendar</h1>
                    <p className="text-gray-500 mt-1">View and manage upcoming activities.</p>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {user && (
                        <button
                            onClick={() => setShowMyEvents(!showMyEvents)}
                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${showMyEvents
                                ? 'bg-secondary text-white border-secondary'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            My Events
                        </button>
                    )}
                    <div className="relative">
                        <button
                            onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
                            className="px-3 py-2 text-sm rounded-lg border transition-colors bg-white text-secondary border-secondary/50 hover:bg-secondary/10 flex items-center gap-2 font-medium"
                        >
                            Academic Calendar
                        </button>
                        {showCalendarDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowCalendarDropdown(false)}
                                ></div>
                                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                                    <a
                                        href="/FY_Academic_Calendar.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setShowCalendarDropdown(false)}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium relative z-50"
                                    >
                                        FY Calendar
                                    </a>
                                    <a
                                        href="/SY_Academic_Calendar.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setShowCalendarDropdown(false)}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium relative z-50"
                                    >
                                        SY/TY Calendar
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                    <select
                        value={filterClub}
                        onChange={(e) => setFilterClub(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                    >
                        <option value="">All Clubs</option>
                        {clubs.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-secondary/50 outline-none"
                    >
                        <option value="">All Categories</option>
                        <option value="Tech">Tech</option>
                        <option value="Non-Tech">Non-Tech</option>
                    </select>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center transition-colors duration-300">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-lg transition-all">
                    <ChevronLeft size={24} className="text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-gray-800">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-lg transition-all">
                    <ChevronRight size={24} className="text-gray-600" />
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-colors duration-300">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-4 text-center text-sm font-bold text-gray-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 border-l border-t border-gray-100/50">
                    {renderCalendarDays()}
                </div>
            </div>

            {/* Create Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100">
                        <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-800">
                                Create New Event
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                                <select
                                    required
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="Tech">Tech Event</option>
                                    <option value="Non-Tech">Non-Tech Event</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                                <textarea
                                    required
                                    rows="3"
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm"
                                        value={formData.eventDate}
                                        onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">End Date <span className="text-[10px] text-gray-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Time</label>
                                    <div className="flex gap-2">
                                        <select
                                            required
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm"
                                            value={formData.eventHour}
                                            onChange={(e) => setFormData({ ...formData, eventHour: e.target.value })}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        <select
                                            required
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm"
                                            value={formData.eventMinute}
                                            onChange={(e) => setFormData({ ...formData, eventMinute: e.target.value })}
                                        >
                                            {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                                <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <select
                                            required
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm"
                                            value={formData.eventAmPm}
                                            onChange={(e) => setFormData({ ...formData, eventAmPm: e.target.value })}
                                        >
                                            <option value="AM">AM</option>
                                            <option value="PM">PM</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Venue</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
                                        value={formData.venue}
                                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Organizing Club</label>
                                <select
                                    required
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all mb-3"
                                    value={formData.club}
                                    onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                                >
                                    <option value="">Select a Club</option>
                                    {clubs.map(club => (
                                        <option key={club._id} value={club._id}>{club.name}</option>
                                    ))}
                                    <option value="other">Other (Individual / Outside Creator)</option>
                                </select>
                                
                                {formData.club === 'other' && (
                                    <div className="mt-2">
                                        <label className="block text-sm font-medium text-gray-600 mb-1">Creator / Organizer Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter organizer's name (internal or external)"
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 text-black focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-black"
                                            value={formData.customOrganizer}
                                            onChange={(e) => setFormData({ ...formData, customOrganizer: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Registration Link <span className="text-gray-400 font-normal text-[10px]">(Optional)</span></label>
                                <input
                                    type="url"
                                    placeholder="https://forms.google.com/..."
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-black"
                                    value={formData.registrationLink}
                                    onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors font-medium border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-secondary hover:bg-accent text-white rounded-lg transition-colors font-medium shadow-sm"
                                >
                                    Create Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
