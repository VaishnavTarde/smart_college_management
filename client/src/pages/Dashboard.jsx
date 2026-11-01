import React, { useState, useEffect } from 'react';
import { User, BookOpen, Calendar, Briefcase, Users, UserPlus as UserProps, ArrowRight, ExternalLink, Sparkles, TrendingUp } from 'lucide-react';
import api from '../services/api';
import RecommendationCard from '../components/RecommendationCard';

const Dashboard = () => {
    const [stats, setStats] = useState({
        clubMembers: 0,
        eventRegistrations: 0,
        upcomingEventsCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [recommendedEvents, setRecommendedEvents] = useState([]);
    const [myEvents, setMyEvents] = useState([]);

    // Get user from local storage
    const user = JSON.parse(localStorage.getItem('user')) || {
        name: 'Guest',
        role: 'student'
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch basic stats for everyone or specific to roles
                const eventsRes = await api.get('/events');
                const clubsRes = await api.get('/clubs');

                const events = eventsRes.data.data;
                const clubs = clubsRes.data.data;

                // Simple Recommendation Logic: Randomly pick 3 upcoming events
                const upcoming = events.filter(e => new Date(e.date) > new Date());
                const shuffled = [...upcoming].sort(() => 0.5 - Math.random());
                setRecommendedEvents(shuffled.slice(0, 3));

                // Calculate stats based on role
                if (user.role === 'teacher' || user.role === 'admin') {
                    const totalClubMembers = clubs.reduce((acc, club) => acc + (club.members ? club.members.length : 0), 0);
                    const totalEventRegistrations = events.reduce((acc, event) => acc + (event.registeredStudents ? event.registeredStudents.length : 0), 0);

                    setStats({
                        clubMembers: totalClubMembers,
                        eventRegistrations: totalEventRegistrations,
                        upcomingEventsCount: events.length
                    });
                } else {
                    // Student stats (mocked or simplified for now as per current endpoint limitations)
                    setStats({
                        clubMembers: 0,
                        eventRegistrations: 0,
                        upcomingEventsCount: events.length
                    });
                    
                    if (user && user._id) {
                        const registered = events.filter(e => e.registeredStudents && (e.registeredStudents.includes(user._id) || e.registeredStudents.some(s => s._id === user._id || s === user._id)));
                        setMyEvents(registered);
                    }
                }
            } catch (err) {
                console.error("Error fetching dashboard stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user.role]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl shadow-lg border border-gray-100 transition-colors">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Hello, <span className="text-secondary">{user.name}</span>
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Welcome to your {user.role} dashboard. Here's what's happening.
                    </p>
                </div>
                <div className="mt-4 md:mt-0 bg-secondary/10 px-4 py-2 rounded-xl text-secondary font-medium capitalize border border-secondary/10">
                    {user.role} Account
                </div>
            </div>

            {/* My Registered Events Section - Student Only */}
            {user.role === 'student' && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 px-1">
                        <Calendar className="text-secondary" size={24} />
                        <h2 className="text-2xl font-bold text-gray-800">My Registered Events</h2>
                    </div>

                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading your events...</div>
                    ) : myEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {myEvents.map(event => (
                                <RecommendationCard key={event._id} event={event} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                            You have not registered for any events yet.
                        </div>
                    )}
                </div>
            )}

            {/* Smart Recommendations Section - Student Only */}
            {user.role === 'student' && recommendedEvents.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 px-1">
                        <Sparkles className="text-yellow-500" size={24} />
                        <h2 className="text-2xl font-bold text-gray-800">Recommended for You</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recommendedEvents.map(event => (
                            <RecommendationCard key={event._id} event={event} />
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Student specific card: My Clubs Actions */}
                {user.role === 'student' && (
                    <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100 group">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="p-3 bg-secondary/10 rounded-xl text-secondary group-hover:scale-110 transition-transform">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Student Actions</h3>
                        </div>

                        <div className="space-y-3">
                            <a href="/clubs" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl group/item transition-colors">
                                <span className="font-medium text-gray-700 group-hover/item:text-secondary">Join a Club</span>
                                <ArrowRight size={18} className="text-gray-400 group-hover/item:text-secondary transition-colors" />
                            </a>
                            <a href="/events" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl group/item transition-colors">
                                <span className="font-medium text-gray-700 group-hover/item:text-accent">Register for Events</span>
                                <ArrowRight size={18} className="text-gray-400 group-hover/item:text-accent transition-colors" />
                            </a>
                        </div>
                    </div>
                )}

                {/* Teacher/Admin specific Card: Total Student Club Registrations */}
                {(user.role === 'teacher' || user.role === 'admin') && (
                    <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-green-100 rounded-xl text-green-600">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Club Registrations</h3>
                        </div>
                        <p className="text-gray-600 font-medium">{stats.clubMembers} students registered.</p>
                    </div>
                )}

                {/* Teacher/Admin specific Card: Event Registrations */}
                {(user.role === 'teacher' || user.role === 'admin') && (
                    <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                                <UserProps size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Event Registrations</h3>
                        </div>
                        <p className="text-gray-600 font-medium">{stats.eventRegistrations} students registered.</p>
                    </div>
                )}

                {/* Teacher/Admin specific Card: Manage Clubs */}
                {(user.role === 'teacher' || user.role === 'admin') && (
                    <a href="/clubs" className="block bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100 cursor-pointer group">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-red-100 rounded-xl text-red-600 group-hover:scale-110 transition-transform">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Manage Clubs</h3>
                        </div>
                        <p className="text-gray-600 mb-4">Create, Edit, and Manage club details.</p>
                    </a>
                )}

                {/* Teacher/Admin specific Card: Feedback Analytics */}
                {(user.role === 'teacher' || user.role === 'admin') && (
                    <a href="/admin/analytics" className="block bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100 cursor-pointer group">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-secondary/10 rounded-xl text-secondary group-hover:scale-110 transition-transform">
                                <TrendingUp size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Feedback Analytics</h3>
                        </div>
                        <p className="text-gray-600 mb-4">AI-powered sentiment analysis on event feedback.</p>
                    </a>
                )}

                {/* Teacher/Admin specific Card: Registration Management */}
                {(user.role === 'teacher' || user.role === 'admin') && (
                    <a href="/admin/registrations" className="block bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100 cursor-pointer group">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Registrations</h3>
                        </div>
                        <p className="text-gray-600 mb-4">Manage students, attendance and export Excel reports.</p>
                    </a>
                )}

                {/* Common Card: Upcoming Events Count */}
                <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Upcoming Events</h3>
                    </div>
                    <p className="text-gray-600 font-medium">{stats.upcomingEventsCount} events scheduled.</p>
                </div>

                {/* Student specific Card: Applications */}
                {user.role === 'student' && (
                    <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                                <Briefcase size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Applications</h3>
                        </div>
                        <p className="text-gray-600 font-medium">Applied to 1 placement drive.</p>
                    </div>
                )}

                {/* Common Card: Quick Access Links (Moodle & ERP) */}
                <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="p-3 bg-teal-100 rounded-xl text-teal-600">
                            <ExternalLink size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Quick Links</h3>
                    </div>

                    <div className="space-y-3">
                        <a
                            href="https://mitaoe.mastersofterp.in/iitmsv4eGq0RuNHb0G5WbhLmTKLmTO7YBcJ4RHuXxCNPvuIw=?enc=EGbCGWnlHNJ/WdgJnKH8DA=="
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl group transition-colors border border-gray-200"
                        >
                            <span className="font-medium text-gray-700 group-hover:text-secondary">ERP Login</span>
                            <ExternalLink size={16} className="text-gray-400 group-hover:text-secondary transition-colors" />
                        </a>
                        <a
                            href="http://moodle.mitaoe.ac.in/login/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl group transition-colors border border-gray-200"
                        >
                            <span className="font-medium text-gray-700 group-hover:text-secondary">Moodle Login</span>
                            <ExternalLink size={16} className="text-gray-400 group-hover:text-secondary transition-colors" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
