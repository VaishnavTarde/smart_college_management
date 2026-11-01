import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Shield, Key, Save, Edit2, Camera, LogOut, X, Trophy, Download, FileText, Award } from 'lucide-react';
import { generateCertificatePDF } from '../utils/CertificateGenerator';
import api from '../services/api';

const Profile = ({ user, setUser }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [stats, setStats] = useState({ registeredEvents: 0 });
    const [achievements, setAchievements] = useState([]);
    const [achievementsLoading, setAchievementsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email
            });
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/events');
            const allEvents = response.data.data;
            if (user && user.role === 'student') {
                const userId = user._id || user.id;
                const registeredCount = allEvents.filter(e =>
                    e.registeredStudents && e.registeredStudents.some(id => id.toString() === userId)
                ).length;
                setStats({ registeredEvents: registeredCount });
                
                // Fetch achievements
                const achRes = await api.get('/achievements/my');
                setAchievements(achRes.data.data);
            }
        } catch (error) {
            console.error("Error fetching stats", error);
        } finally {
            setAchievementsLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put('/auth/updatedetails', formData);
            const updatedUser = { ...user, ...res.data.data };
            localStorage.setItem('user', JSON.stringify(updatedUser)); // Update local storage
            setUser(updatedUser); // Update app state
            setIsEditing(false);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Update failed' });
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        try {
            await api.put('/auth/updatepassword', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Password update failed' });
        }
    };

    // Auto-dismiss messages
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (!user) return <div className="text-center py-20">Loading profile...</div>;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in min-h-screen">
            {/* Header Section */}
            <div className="relative mb-12">
                <div className="h-48 bg-gradient-to-r from-secondary to-blue-600 rounded-3xl opacity-90"></div>
                <div className="absolute -bottom-16 left-8 md:left-12 flex items-end">
                    <div className="relative group">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
                            <span className="text-5xl font-bold text-secondary uppercase">
                                {user.name.charAt(0)}
                            </span>
                        </div>
                        <button className="absolute bottom-2 right-2 p-2 bg-gray-900/80 text-white rounded-full hover:bg-black transition-colors shadow-lg backdrop-blur-sm opacity-0 group-hover:opacity-100">
                            <Camera size={18} />
                        </button>
                    </div>
                    <div className="ml-6 mb-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">{user.name}</h1>
                        <p className="text-gray-600 capitalize flex items-center gap-2">
                            <Shield size={16} className="text-secondary" /> {user.role} Account
                        </p>
                    </div>
                </div>
            </div>

            {/* Message Notification */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-24 right-8 z-50 px-6 py-3 rounded-xl shadow-lg font-medium text-white ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-20">

                {/* Left Column: Personal Info */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <User className="text-secondary" /> Personal Information
                            </h2>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isEditing
                                    ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {isEditing ? <><X size={16} /> Cancel</> : <><Edit2 size={16} /> Edit</>}
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProfile}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            disabled={!isEditing}
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-secondary/50 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            disabled={!isEditing}
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-secondary/50 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>

                            {isEditing && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 flex justify-end">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 bg-secondary text-white px-8 py-3 rounded-xl hover:bg-accent transition-all shadow-lg shadow-secondary/20 font-medium"
                                    >
                                        <Save size={18} /> Save Changes
                                    </button>
                                </motion.div>
                            )}
                        </form>
                    </div>

                    <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                            <Shield className="text-green-500" size={24} /> Security
                        </h2>
                        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Current Password</label>
                                    <a 
                                        href="/forgot-password" 
                                        className="text-xs text-green-600 hover:text-green-800 hover:underline font-medium"
                                        onClick={() => {
                                            localStorage.removeItem('user');
                                            localStorage.removeItem('token');
                                        }}
                                    >
                                        Forgot Password?
                                    </a>
                                </div>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all font-medium mt-2"
                            >
                                <Key size={18} /> Update Password
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Account & Activity */}
                <div className="space-y-8">
                    <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Account Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                <span className="text-gray-600">Role</span>
                                <span className="font-bold text-secondary capitalize">{user.role}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                <span className="text-gray-600">Member Since</span>
                                <span className="font-bold text-gray-800">
                                    {(() => {
                                        if (!user.createdAt) return 'Feb 2026';
                                        const date = new Date(user.createdAt);
                                        const cutoff = new Date('2026-02-01');
                                        if (date < cutoff) return 'Feb 2026';
                                        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                                    })()}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => {
                            localStorage.removeItem('user');
                            setUser(null);
                            window.location.href = '/login';
                        }} className="w-full mt-6 flex items-center justify-center gap-2 py-3 border-2 border-red-100 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-all">
                            <LogOut size={18} /> Sign Out
                        </button>
                    </div>

                    {/* Activity Stats */}
                    <div className="bg-gradient-to-br from-secondary to-blue-600 rounded-3xl shadow-lg p-6 text-white text-center">
                        <h3 className="text-xl font-bold mb-4">Your Activity</h3>
                        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4">
                            <span className="block text-4xl font-bold">{stats.registeredEvents}</span>
                            <span className="text-sm opacity-90">Registered Events</span>
                        </div>
                        <p className="opacity-90 text-sm">Keep participating to earn badges! 🏆</p>
                    </div>
                </div>
            </div>

            {/* Achievements Section */}
            {user.role === 'student' && (
                <div className="mt-12">
                    <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-8">
                            <Award className="text-yellow-500" size={28} /> My Achievements & Certificates
                        </h2>

                        {achievementsLoading ? (
                            <div className="flex justify-center py-10 text-gray-400 italic">Loading your badges...</div>
                        ) : achievements.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {achievements.map((ach) => (
                                    <motion.div 
                                        key={ach._id}
                                        whileHover={{ y: -5 }}
                                        className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group"
                                    >
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-secondary/10 to-transparent rounded-bl-full"></div>
                                        <Trophy className="text-secondary mb-4" size={32} />
                                        
                                        <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{ach.eventName}</h3>
                                        <p className="text-sm text-gray-600 mb-4">{ach.club?.name || "Campus Club"}</p>
                                        
                                        <div className="flex items-center justify-between mt-auto">
                                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                                                ['1','2','3','1st','2nd','3rd'].includes(ach.rank) 
                                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 shadow-sm' 
                                                : 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                                            }`}>
                                                {['1','2','3','1st','2nd','3rd'].includes(ach.rank) ? `${ach.rank} Position` : 'Participation'}
                                            </span>
                                            
                                            <button 
                                                onClick={() => generateCertificatePDF({
                                                    studentName: ach.studentName,
                                                    eventName: ach.eventName,
                                                    clubName: ach.club?.name || "Campus Club",
                                                    rank: ach.rank,
                                                    certificateId: ach.certificateId,
                                                    date: ach.issuedAt
                                                })}
                                                className="p-2 bg-white text-secondary rounded-xl shadow-sm border border-gray-100 hover:bg-secondary hover:text-white transition-all transform hover:scale-110 active:scale-95"
                                                title="Download Certificate"
                                            >
                                                <Download size={18} />
                                            </button>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-4 font-mono">ID: {ach.certificateId}</div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                <div className="flex justify-center mb-4 opacity-10">
                                    <FileText size={64} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-400">No achievements yet</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Participate in club events to earn official certificates and build your portfolio!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
