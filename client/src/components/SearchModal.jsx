import React, { useState, useEffect } from 'react';
import { Search, X, Calendar, Users, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const SearchModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ events: [], clubs: [] });
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();

    // Toggle modal on Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleOpenSearch = () => setIsOpen(true);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('open-search', handleOpenSearch);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('open-search', handleOpenSearch);
        };
    }, []);

    // Search logic
    useEffect(() => {
        const search = async () => {
            if (!query.trim()) {
                setResults({ events: [], clubs: [] });
                return;
            }

            setLoading(true);
            try {
                // In a real app, you'd likely have a specific search endpoint.
                // Here we'll fetch all and filter client-side for simplicity/speed with small data.
                const [eventsRes, clubsRes] = await Promise.all([
                    api.get('/events'),
                    api.get('/clubs')
                ]);

                const filteredEvents = eventsRes.data.data.filter(e =>
                    e.title.toLowerCase().includes(query.toLowerCase()) ||
                    e.description.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 3);

                const filteredClubs = clubsRes.data.data.filter(c =>
                    c.name.toLowerCase().includes(query.toLowerCase()) ||
                    c.category?.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 3);

                setResults({ events: filteredEvents, clubs: filteredClubs });
                setSelectedIndex(0);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    // Keyboard navigation
    const allResults = [...results.clubs.map(c => ({ ...c, type: 'club' })), ...results.events.map(e => ({ ...e, type: 'event' }))];

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < allResults.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (allResults[selectedIndex]) {
                    handleSelect(allResults[selectedIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, allResults]);

    const handleSelect = (item) => {
        setIsOpen(false);
        setQuery('');
        if (item.type === 'club') {
            navigate(`/clubs/${item._id}`);
        } else {
            // Navigate to events page (placeholder for specific event detail view)
            navigate('/events');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[60vh] border border-gray-100"
                    >
                        <div className="flex items-center p-4 border-b border-gray-100">
                            <Search className="text-gray-400 mr-3" size={20} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search events, clubs, or activities..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="flex-1 text-lg bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                            />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded transition-colors ml-2"
                            >
                                Back
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {loading ? (
                                <div className="p-4 text-center text-gray-500">Searching...</div>
                            ) : allResults.length > 0 ? (
                                <div className="space-y-1">
                                    {results.clubs.length > 0 && (
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Clubs
                                        </div>
                                    )}
                                    {results.clubs.map((club, index) => (
                                        <div
                                            key={club._id}
                                            onClick={() => handleSelect({ ...club, type: 'club' })}
                                            className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors ${index === selectedIndex ? 'bg-secondary/10' : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                                                <Users size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-800">{club.name}</h4>
                                                <p className="text-sm text-gray-500 line-clamp-1">{club.description || club.category}</p>
                                            </div>
                                            {index === selectedIndex && <ArrowRight size={16} className="text-secondary" />}
                                        </div>
                                    ))}

                                    {results.events.length > 0 && (
                                        <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Events
                                        </div>
                                    )}
                                    {results.events.map((event, i) => {
                                        const totalIndex = results.clubs.length + i;
                                        return (
                                            <div
                                                key={event._id}
                                                onClick={() => handleSelect({ ...event, type: 'event' })}
                                                className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors ${totalIndex === selectedIndex ? 'bg-secondary/10' : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600 mr-3">
                                                    <Calendar size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-800">{event.title}</h4>
                                                    <div className="flex items-center text-sm text-gray-500 space-x-3">
                                                        <span>{new Date(event.date).toLocaleDateString()}</span>
                                                        <span className="flex items-center"><MapPin size={12} className="mr-1" /> {event.venue}</span>
                                                    </div>
                                                </div>
                                                {totalIndex === selectedIndex && <ArrowRight size={16} className="text-secondary" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : query.trim() ? (
                                <div className="p-8 text-center text-gray-500">
                                    No results found for "{query}"
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    Type to search for clubs, events, and more...
                                </div>
                            )}
                        </div>

                        <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 text-xs text-gray-400">
                            <div className="flex items-center"><span className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] mr-1">↑↓</span> to navigate</div>
                            <div className="flex items-center"><span className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] mr-1">↵</span> to select</div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SearchModal;
