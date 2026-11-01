import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, User as UserIcon, Trash2, Clock } from 'lucide-react';
import api from '../services/api';

const ClubMembers = () => {
    const { id } = useParams();
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    const [members, setMembers] = useState([]);
    const [newMemberData, setNewMemberData] = useState({
        email: '',
        name: '',
        studentId: '',
        department: '',
        year: ''
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Fetch User
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
        } catch (e) {
            console.error("User parsing error:", e);
        }
    }, []);

    const fetchMembers = async () => {
        try {
            const res = await api.get(`/clubs/${id}/members`);
            setMembers(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (err) {
            console.error("Fetch members error:", err);
            setMembers([]); // Fallback to empty array
        }
    };

    // Fetch Club & Members
    useEffect(() => {
        const fetchClub = async () => {
            try {
                const res = await api.get(`/clubs/${id}`);
                setClub(res.data.data);
            } catch (err) {
                console.error("Fetch club error:", err);
                setError("Failed to load club details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchClub();
            fetchMembers();
        }
    }, [id]);

    const approvedMembers = members.filter(m => m.status === 'approved' || !m.status);
    const pendingMembers = members.filter(m => m.status === 'pending');

    if (loading) return <div className="p-10 text-center">Loading members...</div>;
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
    if (!club) return <div className="p-10 text-center">Club not found</div>;

    // Safety logic for permissions
    const coordinatorId = club?.coordinator?._id || club?.coordinator;
    const canManage = user && (user.role === 'teacher' || user.role === 'admin' || (coordinatorId && user._id === String(coordinatorId)));

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;
        try {
            await api.delete(`/clubs/${id}/members/${memberId}`);
            setMembers(prev => prev.filter(m => m._id !== memberId));
            alert("Member removed successfully");
        } catch (err) {
            console.error("Failed to remove member", err);
            alert(err.response?.data?.message || "Failed to remove member");
        }
    };

    const handleApproveMember = async (memberId) => {
        try {
            await api.put(`/clubs/${id}/members/${memberId}`, { status: 'approved' });
            alert("Application approved successfully");
            await fetchMembers();
        } catch (err) {
            console.error("Failed to approve membership", err);
            alert(err.response?.data?.message || "Failed to approve membership");
        }
    };

    const handleRejectMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to reject this request?")) return;
        try {
            await api.delete(`/clubs/${id}/members/${memberId}`);
            alert("Application rejected and removed");
            await fetchMembers();
        } catch (err) {
            console.error("Failed to reject membership", err);
            alert(err.response?.data?.message || "Failed to reject membership");
        }
    };

    // Robust leadership data construction
    const leadership = [
        { role: 'Faculty Coordinator', name: club.facultyCoordinator || 'Dr. Faculty Name', icon: '👨‍🏫' },
        { role: 'Student Coordinator', name: club.studentCoordinator || club.coordinator?.name || 'Student Name', icon: '👤' },
        { role: 'Secretary', name: club.secretary || 'Student Name', icon: '📝' },
    ];

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/clubs/${id}/members`, newMemberData);
            setNewMemberData({ email: '', name: '', studentId: '', department: '', year: '' });
            setIsAddModalOpen(false);
            await fetchMembers(); // Refetch to get populated data
            alert("Member added successfully");
        } catch (err) {
            console.error("Failed to add member", err);
            alert(err.response?.data?.message || "Failed to add member");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <Link to={`/clubs/${id}`} className="inline-flex items-center text-gray-600 hover:text-secondary mb-8 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Back to Club Details
                </Link>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-10">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Club Leadership & Members</h1>
                            <p className="text-gray-500 mt-2">People behind {club.name || 'the club'}</p>
                        </div>
                        {canManage && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center shadow-md"
                            >
                                <span className="mr-2 text-xl">+</span> Add Member
                            </button>
                        )}
                    </div>

                    {/* Leadership Section */}
                    <div className="p-8 bg-gray-50/50">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <span className="w-2 h-8 bg-secondary rounded-full mr-3"></span>
                            Leadership Team
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {leadership.map((leader, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                                        {leader.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{leader.name}</h3>
                                        <p className="text-sm text-secondary font-medium">{leader.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Join Requests Section */}
                    {canManage && pendingMembers.length > 0 && (
                        <div className="p-8 border-b border-gray-100 bg-yellow-50/30">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <span className="w-2 h-8 bg-yellow-500 rounded-full mr-3"></span>
                                Pending Join Requests ({pendingMembers.length})
                            </h2>

                            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                <table className="w-full text-left bg-white">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Dept & Year</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {pendingMembers.map((member, idx) => {
                                            const memberName = member.name || member.user?.name || 'Unknown';
                                            const memberEmail = member.email || member.user?.email || 'N/A';
                                            const memberId = member._id || idx;

                                            return (
                                                <tr key={String(memberId)} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-sm font-bold mr-3">
                                                                {String(memberName).charAt(0)}
                                                            </div>
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-900 block">{String(memberName)}</span>
                                                                <span className="text-xs text-gray-400">ID: {member.studentId}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center">
                                                            <Mail size={14} className="mr-2 text-gray-400" />
                                                            {String(memberEmail)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {member.department} - {member.year}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => handleApproveMember(member._id)}
                                                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectMember(member._id)}
                                                                className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border border-red-100"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* All Members Section */}
                    <div className="p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <span className="w-2 h-8 bg-secondary rounded-full mr-3"></span>
                            All Members ({approvedMembers.length})
                        </h2>

                        {approvedMembers.length > 0 ? (
                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <table className="w-full text-left bg-white">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                            {canManage && <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {approvedMembers.map((member, idx) => {
                                            // Strict member check
                                            if (!member || typeof member !== 'object') return null;

                                            const memberName = member.name || member.user?.name || 'Unknown';
                                            const memberEmail = member.email || member.user?.email || 'N/A';
                                            const memberRole = member.role || 'Member';
                                            const memberId = member._id || idx;

                                            return (
                                                <tr key={String(memberId)} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-bold mr-3">
                                                                {String(memberName).charAt(0)}
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">{String(memberName)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center">
                                                            <Mail size={14} className="mr-2 text-gray-400" />
                                                            {String(memberEmail)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize">
                                                            {String(memberRole)}
                                                        </span>
                                                    </td>
                                                    {canManage && (
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <button
                                                                onClick={() => handleRemoveMember(member._id)}
                                                                className="text-red-500 hover:text-red-700 font-medium text-xs border border-red-200 hover:bg-red-50 px-3 py-1 rounded-lg transition-all flex items-center ml-auto"
                                                            >
                                                                <Trash2 size={14} className="mr-1" /> Remove
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <UserIcon size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500">No members found in this club yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Member Modal - Unified with ClubDetails */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">Add New Member</h2>

                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    required
                                    placeholder="student@university.edu"
                                    className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border"
                                    value={newMemberData.email}
                                    onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border"
                                        value={newMemberData.name}
                                        onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">PRN / ID</label>
                                    <input
                                        type="text"
                                        placeholder="123456"
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border"
                                        value={newMemberData.studentId}
                                        onChange={e => setNewMemberData({ ...newMemberData, studentId: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <select
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border"
                                        value={newMemberData.department}
                                        onChange={e => setNewMemberData({ ...newMemberData, department: e.target.value })}
                                    >
                                        <option value="">Select Dept</option>
                                        <option value="CSE">CSE</option>
                                        <option value="IT">IT</option>
                                        <option value="ENTC">ENTC</option>
                                        <option value="MECH">MECH</option>
                                        <option value="CIVIL">CIVIL</option>
                                        <option value="AIML">AIML</option>
                                        <option value="DS">Data Science</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                    <select
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border"
                                        value={newMemberData.year}
                                        onChange={e => setNewMemberData({ ...newMemberData, year: e.target.value })}
                                    >
                                        <option value="">Select Year</option>
                                        <option value="FY">FY</option>
                                        <option value="SY">SY</option>
                                        <option value="TY">TY</option>
                                        <option value="BTech">Final Year</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-secondary text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
                                >
                                    Add Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClubMembers;
