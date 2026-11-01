import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Plus, Filter, Edit, Users, Trash2, X } from 'lucide-react';
import api from '../services/api';
import EventFeedback from '../components/EventFeedback';

const Events = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEventId, setCurrentEventId] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'Tech', 'Non-Tech'

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

    const user = JSON.parse(localStorage.getItem('user'));
    const canCreate = user && (user.role === 'teacher' || user.role === 'admin');

    useEffect(() => {
        fetchEvents();
        if (canCreate) fetchClubs();
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

    const handleEdit = (event) => {
        setFormData({
            title: event.title,
            description: event.description,
            eventDate: new Date(event.date).toLocaleDateString('en-CA'), // YYYY-MM-DD
            eventHour: new Date(event.date).toLocaleString('en-US', { hour: 'numeric', hour12: true }).split(' ')[0],
            eventMinute: new Date(event.date).toLocaleString('en-US', { minute: '2-digit' }),
            eventAmPm: new Date(event.date).toLocaleString('en-US', { hour12: true }).slice(-2),
            venue: event.venue,
            club: event.club ? (event.club._id || event.club) : (event.customOrganizer ? 'other' : ''),
            customOrganizer: event.customOrganizer || '',
            category: event.category || 'Tech',
            registrationLink: event.registrationLink || '',
            endDate: event.endDate ? new Date(event.endDate).toLocaleDateString('en-CA') : ''
        });
        setCurrentEventId(event._id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleCreate = () => {
        setFormData({ title: '', description: '', eventDate: '', eventHour: '12', eventMinute: '00', eventAmPm: 'AM', venue: '', club: '', customOrganizer: '', category: 'Tech', registrationLink: '', endDate: '' });
        setIsEditing(false);
        setCurrentEventId(null);
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

            // Remove helper fields and prepare payload
            const { eventDate, eventHour, eventMinute, eventAmPm, endDate, ...dataToSend } = formData;
            dataToSend.date = combinedDate;
            if (endDate) {
                // For endDate, we just use the selected date at the end of the day or same time?
                // Usually end date is just the day. Let's send it as is.
                dataToSend.endDate = new Date(endDate);
            } else {
                dataToSend.endDate = null;
            }
            
            if (dataToSend.club === 'other') {
                dataToSend.club = null;
            } else {
                dataToSend.customOrganizer = '';
            }

            if (isEditing) {
                await api.put(`/events/${currentEventId}`, dataToSend);
            } else {
                await api.post('/events', dataToSend);
            }
            setShowModal(false);
            fetchEvents();
        } catch (err) {
            alert(err.response?.data?.message || 'Error processing request');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                await api.delete(`/events/${id}`);
                fetchEvents();
            } catch (err) {
                alert(err.response?.data?.message || 'Error deleting event');
            }
        }
    };

    const now = new Date();

    const filteredEvents = events.filter(event => {
        if (filter === 'all') return true;
        return event.category === filter;
    });

    const upcomingEvents = filteredEvents
        .filter(event => new Date(event.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const pastEvents = filteredEvents
        .filter(event => new Date(event.date) < now)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (loading) return <div className="text-center py-10">Loading...</div>;

    const EventCard = ({ event }) => (
        <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col md:flex-row gap-6 group relative">
            {/* Edit and Delete Buttons for Teacher/Admin */}
            {canCreate && (
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => handleEdit(event)}
                        className="text-gray-400 hover:text-secondary p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors shadow-sm border border-gray-100"
                        title="Edit Event"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(event._id)}
                        className="text-gray-400 hover:text-red-500 p-2 bg-gray-50 rounded-full hover:bg-red-50 transition-colors shadow-sm border border-gray-100"
                        title="Delete Event"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}

            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-primary/30 w-24 h-24 rounded-xl text-secondary border border-primary/50">
                <span className="text-sm font-bold uppercase tracking-wider">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                <span className="text-3xl font-bold">
                    {event.endDate && new Date(event.endDate).getDate() !== new Date(event.date).getDate() ? (
                        <span className="text-xl">{new Date(event.date).getDate()}-{new Date(event.endDate).getDate()}</span>
                    ) : (
                        new Date(event.date).getDate()
                    )}
                </span>
                <span className="text-xs text-gray-600 mt-1">{new Date(event.date).getFullYear()}</span>
            </div>

            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-secondary transition-colors">{event.title}</h3>
                        <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                            <span className="flex items-center"><Clock size={16} className="mr-1" /> {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="flex items-center"><MapPin size={16} className="mr-1" /> {event.venue}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {(event.club || event.customOrganizer) && (
                            <span className="bg-blue-50 text-secondary text-xs font-semibold px-3 py-1 rounded-full border border-blue-100 whitespace-nowrap">
                                {event.club ? event.club.name : event.customOrganizer}
                            </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded border ${event.category === 'Tech' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                            {event.category || 'Tech'}
                        </span>
                    </div>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed line-clamp-2">{event.description}</p>
                <div className="flex items-center justify-between mt-auto">
                    <button
                        onClick={() => {
                            setSelectedEvent(event);
                            setShowDetailsModal(true);
                        }}
                        className="text-secondary hover:text-accent font-medium text-sm flex items-center hover:underline"
                    >
                        Read More & Reviews
                    </button>
                    {event.customOrganizer && event.registrationLink && new Date(event.date) >= now && (
                        <a 
                            href={event.registrationLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-secondary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-accent transition-all shadow-sm flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Register Now <Plus size={14} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );

    return (

        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        Campus Events
                    </h1>
                    <p className="text-gray-500 mt-2">Discover what's happening on campus.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-secondary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        All Events
                    </button>
                    <button
                        onClick={() => setFilter('Tech')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'Tech' ? 'bg-secondary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        Tech Events
                    </button>
                    <button
                        onClick={() => setFilter('Non-Tech')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'Non-Tech' ? 'bg-secondary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        Non-Tech Events
                    </button>

                    {canCreate && (
                        <button
                            onClick={handleCreate}
                            className="flex items-center space-x-2 bg-secondary hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors shadow-sm ml-2"
                        >
                            <Plus size={20} />
                            <span>Create Event</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-12">
                {/* Upcoming Events Section */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-secondary pl-3">Upcoming Events</h2>
                    {upcomingEvents.length > 0 ? (
                        upcomingEvents.map((event) => (
                            <EventCard key={event._id} event={event} />
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                            <p className="text-gray-500">No upcoming events found in this category.</p>
                        </div>
                    )}
                </div>

                {/* Recent Events Section (Past) */}
                {pastEvents.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-gray-500 pl-3">Recent Events</h2>
                        {pastEvents.map((event) => (
                            <EventCard key={event._id} event={event} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-100">
                            {isEditing ? 'Edit Event' : 'Create New Event'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-black"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                                <select
                                    required
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-black"
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
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-black"
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
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm text-black"
                                        value={formData.eventDate}
                                        onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">End Date <span className="text-[10px] text-gray-400 font-normal">(Optional)</span></label>
                                    <input
                                        type="date"
                                        min={formData.eventDate || new Date().toISOString().split('T')[0]}
                                        className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm text-black"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Time</label>
                                    <div className="flex gap-2">
                                        <select
                                            required
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm text-black"
                                            value={formData.eventHour}
                                            onChange={(e) => setFormData({ ...formData, eventHour: e.target.value })}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        <select
                                            required
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm text-black"
                                            value={formData.eventMinute}
                                            onChange={(e) => setFormData({ ...formData, eventMinute: e.target.value })}
                                        >
                                            {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                                <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <select
                                            required
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm text-black"
                                            value={formData.eventAmPm}
                                            onChange={(e) => setFormData({ ...formData, eventAmPm: e.target.value })}
                                        >
                                            <option value="AM">AM</option>
                                            <option value="PM">PM</option>
                                        </select>
                                    </div>
                                </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Venue</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-black"
                                    value={formData.venue}
                                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Organizing Club</label>
                                <select
                                    required
                                    className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-black mb-3"
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
                                            className="w-full rounded-lg border-gray-200 bg-gray-50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-black"
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
                                    {isEditing ? 'Save Changes' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Details & Feedback Modal */}
            {showDetailsModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100 relative">
                        <button
                            onClick={() => setShowDetailsModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-6">
                            <span className={`text-xs px-2 py-0.5 rounded border mb-2 inline-block ${selectedEvent.category === 'Tech' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                {selectedEvent.category || 'Tech'}
                            </span>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedEvent.title}</h2>
                            <div className="flex items-center text-sm text-gray-500 space-x-4 mb-4">
                                <span className="flex items-center"><Clock size={16} className="mr-1" /> {new Date(selectedEvent.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="flex items-center"><MapPin size={16} className="mr-1" /> {selectedEvent.venue}</span>
                                <span className="flex items-center"><Calendar size={16} className="mr-1" /> 
                                    {new Date(selectedEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {selectedEvent.endDate && new Date(selectedEvent.endDate).getDate() !== new Date(selectedEvent.date).getDate() && (
                                        <> - {new Date(selectedEvent.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                                    )}
                                </span>
                            </div>
                            {(selectedEvent.club || selectedEvent.customOrganizer) && (
                                <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-gray-50 mb-4">
                                    <div className="text-sm font-medium text-gray-700">
                                        Organized by: <span className="text-secondary font-bold">{selectedEvent.club ? selectedEvent.club.name : selectedEvent.customOrganizer}</span>
                                    </div>
                                    {selectedEvent.registrationLink && new Date(selectedEvent.date) >= new Date() && (
                                        <a 
                                            href={selectedEvent.registrationLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent hover:scale-[1.02] transition-all shadow-md"
                                        >
                                            Register for Event <Edit size={16} />
                                        </a>
                                    )}
                                </div>
                            )}
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {selectedEvent.description}
                            </p>
                        </div>

                        <EventFeedback eventId={selectedEvent._id} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Events;
