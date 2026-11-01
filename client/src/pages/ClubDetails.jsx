import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, Info, Clock, MapPin, CheckCircle, MessageSquare, Send, User, Edit2, Smile, X, Image, Upload, Trash2, Sparkles, HelpCircle, ChevronDown, ChevronUp, Loader2, Plus, Trophy } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import api from '../services/api';
import { generateClubFAQs } from '../services/aiService';
import { formatMessageDate } from '../utils/dateUtils';
import vertexBanner from '../assets/vertex_banner.png';
import vertexLogo from '../assets/vertex_logo.jpg';
import gdgBanner from '../assets/gdg_banner.png';
import gdgLogo from '../assets/gdg_logo.png';
import gdgBranding from '../assets/gdg_branding.jpg';
import flcLogo from '../assets/flc_logo.jpg';
import CertificateSection from '../components/Club/CertificateSection';

const ClubDetails = () => {
    console.log("ClubDetails Component Mounting...");
    const { id } = useParams();
    console.log("ClubDetails ID:", id);
    const navigate = useNavigate();

    // Core Data State
    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI/Form State
    const [activeTab, setActiveTab] = useState('info');
    const [joinStatus, setJoinStatus] = useState(null);

    // Chat State
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    // Modals State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
    const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGeneratingFAQ, setIsGeneratingFAQ] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);
    const [members, setMembers] = useState([]);

    // Forms
    const [joinFormData, setJoinFormData] = useState({
        name: '',
        studentId: '',
        email: '',
        department: '',
        year: ''
    });

    const [eventFormData, setEventFormData] = useState({
        title: '',
        date: '',
        venue: '',
        description: '',
        category: 'Tech',
        registrationLink: ''
    });

    const [editFormData, setEditFormData] = useState({
        name: '',
        description: '',
        objectives: '',
        facultyCoordinator: '',
        studentCoordinator: '',
        secretary: '',
        registrationLink: '',
        infoLink: '',
        faqs: []
    });

    // Dedicated State for editing
    const [activitiesData, setActivitiesData] = useState([]);
    const [galleryData, setGalleryData] = useState([]);
    const [newMemberData, setNewMemberData] = useState({
        email: '',
        name: '',
        studentId: '',
        department: '',
        year: ''
    });

    // Helper to ensure array
    const ensureArray = (data) => Array.isArray(data) ? data : [];

    // Populate edit form when club is loaded
    useEffect(() => {
        if (club) {
            const objectivesArray = Array.isArray(club.objectives) ? club.objectives : [];
            setEditFormData({
                name: club.name || '',
                description: club.description || '',
                objectives: objectivesArray.join('\n'),
                facultyCoordinator: club.facultyCoordinator || '',
                studentCoordinator: club.studentCoordinator || '',
                secretary: club.secretary || '',
                registrationLink: club.registrationLink || '',
                infoLink: club.infoLink || '',
                faqs: club.faqs || []
            });
            // Initialize data
            setActivitiesData([]); // Will fetch from API
            // Initialize data with inputType for UI state
            setGalleryData(ensureArray(club.recentEvents).map(item => ({ ...item, inputType: 'upload' })));
        }
    }, [club]);

    // Fetch activities independently
    const fetchActivities = async () => {
        try {
            const res = await api.get(`/clubs/${id}/activities`);
            setActivitiesData(res.data.data);
        } catch (err) {
            console.error("Failed to fetch activities", err);
        }
    };

    // Fetch club members
    const fetchMembers = async () => {
        try {
            const res = await api.get(`/clubs/${id}/members`);
            setMembers(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (err) {
            console.error("Failed to fetch members", err);
        }
    };

    useEffect(() => {
        if (id) {
            fetchActivities();
            fetchMembers();
        }
    }, [id]);

    // Fetch Chat Messages
    const fetchMessages = async () => {
        try {
            setChatLoading(true);
            const res = await api.get(`/discussions/${id}`);
            setMessages(res.data.data);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'community' && id) {
            fetchMessages();
            // Poll for new messages every 2 seconds for "real-time" feel
            const interval = setInterval(fetchMessages, 2000);
            return () => clearInterval(interval);
        }
    }, [activeTab, id]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !editingMessageId) || (!editContent.trim() && editingMessageId)) return;

        try {
            if (editingMessageId) {
                // Edit Message
                await api.put(`/discussions/${editingMessageId}`, { message: editContent });

                // Optimistic update
                setMessages(messages.map(msg =>
                    msg._id === editingMessageId ? { ...msg, message: editContent } : msg
                ));

                setEditingMessageId(null);
                setEditContent('');
            } else {
                // Send New Message
                const res = await api.post('/discussions', {
                    clubId: id,
                    message: newMessage,
                    isAnonymous
                });
                setMessages([...messages, res.data.data]);
                setNewMessage('');
                setShowEmojiPicker(false);
                fetchMessages(); // Refresh to be safe
            }
        } catch (err) {
            console.error('Error sending/editing message:', err);
            const errMsg = err.response?.data?.message || err.message || "Failed to send/edit message";
            alert(`Error: ${errMsg}`);
        }
    };

    const handleEmojiClick = (emojiObject) => {
        if (editingMessageId) {
            setEditContent(prev => prev + emojiObject.emoji);
        } else {
            setNewMessage(prev => prev + emojiObject.emoji);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.delete(`/discussions/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                // Update local state to reflect soft delete
                setCommunityMessages(prev => prev.map(msg =>
                    msg._id === id ? { ...msg, isDeleted: true, message: "This message was deleted" } : msg
                ));
            } else {
                alert(res.data.error || "Failed to delete message");
            }
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    const startEditing = (msg) => {
        setEditingMessageId(msg._id);
        setEditContent(msg.message);
        setShowEmojiPicker(false);
    };

    const handleGenerateFAQ = async () => {
        if (!editFormData.name || !editFormData.description) {
            alert("Please provide a club name and description first.");
            return;
        }

        setIsGeneratingFAQ(true);
        try {
            const faqs = await generateClubFAQs({
                name: editFormData.name,
                description: editFormData.description
            });
            setEditFormData(prev => ({ ...prev, faqs }));
        } catch (err) {
            alert(err.message || "Failed to generate FAQs");
        } finally {
            setIsGeneratingFAQ(false);
        }
    };

    const handleAddFAQ = () => {
        setEditFormData(prev => ({
            ...prev,
            faqs: [...prev.faqs, { question: '', answer: '' }]
        }));
    };

    const handleFAQChange = (index, field, value) => {
        const updatedFAQs = [...editFormData.faqs];
        updatedFAQs[index][field] = value;
        setEditFormData(prev => ({ ...prev, faqs: updatedFAQs }));
    };

    const handleRemoveFAQ = (index) => {
        setEditFormData(prev => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index)
        }));
    };

    // Fetch club details
    useEffect(() => {
        const fetchClub = async () => {
            try {
                console.log("ClubDetails: Fetching from API...");
                const res = await api.get(`/clubs/${id}`);
                console.log("ClubDetails: API Response:", res.data);
                setClub(res.data.data);
            } catch (err) {
                console.error("Failed to fetch club", err);
                setError(err.message || "Failed to load club details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchClub();
        } else {
            console.error("No ID found provided to ClubDetails!");
            setLoading(false);
            setError("Invalid Club ID");
        }
    }, [id]);

    // user fetching logic
    let user = null;
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) user = JSON.parse(storedUser);
    } catch (e) {
        console.error("User parsing error:", e);
    }

    // Render Logic - EARLY RETURNS MUST BE HERE
    if (loading) {
        return <div className="flex justify-center items-center min-h-[50vh]">Loading...</div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">Error: {error}</div>;
    }

    if (!club) {
        return <div className="text-center py-10">Club not found</div>;
    }

    // Derived State Calculations (Safe now because club is not null)
    const getSafeClubData = () => {
        const safeMembers = Array.isArray(members) ? members : [];
        const safeRecentEvents = Array.isArray(club.recentEvents) ? club.recentEvents : [];
        const safeEvents = (Array.isArray(club.events) ? club.events : []).filter(event => new Date(event.date) >= new Date());
        const safeObjectives = Array.isArray(club.objectives) ? club.objectives : [];

        return {
            safeMembers,
            safeFacultyName: club.facultyCoordinator || "Dr. Faculty Name",
            safeStudentName: club.studentCoordinator || club.coordinator?.name || "Student Coordinator",
            safeSecretaryName: club.secretary || "Student Name",
            safeImage: (club.name && club.name.toLowerCase().includes("vertex")) ? vertexBanner : (club.image || 'https://via.placeholder.com/800x400'),
            safeDescription: club.description || "No description available.",
            safeRecentEvents,
            safeEvents,
            safeObjectives
        };
    };

    const { safeMembers, safeFacultyName, safeStudentName, safeSecretaryName, safeImage, safeDescription, safeRecentEvents, safeEvents, safeObjectives } = getSafeClubData();

    const coordinatorId = club?.coordinator?._id || club?.coordinator;
    const canManage = user && (user.role === 'teacher' || user.role === 'admin' || user._id === coordinatorId);
    // Student Check (Hide Join if teacher)
    const isStudent = user && user.role === 'student';

    const isAlreadyMember = user && members.some(m => {
        const memberUserId = m.user?._id || m.user || m.userId;
        const memberEmail = m.email || m.user?.email;
        const isUser = (memberUserId && String(memberUserId) === String(user._id || user.id)) || 
                       (memberEmail && String(memberEmail).toLowerCase() === String(user.email).toLowerCase());
        return isUser && (m.status === 'approved' || !m.status);
    });

    const isPendingMember = user && members.some(m => {
        const memberUserId = m.user?._id || m.user || m.userId;
        const memberEmail = m.email || m.user?.email;
        const isUser = (memberUserId && String(memberUserId) === String(user._id || user.id)) || 
                       (memberEmail && String(memberEmail).toLowerCase() === String(user.email).toLowerCase());
        return isUser && m.status === 'pending';
    });

    // Add Member Handler
    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/clubs/${id}/members`, newMemberData);
            setNewMemberData({ email: '', name: '', studentId: '', department: '', year: '' });
            setIsAddModalOpen(false);
            alert("Member added successfully! Visit 'Manage Members' to view list.");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to add member");
        }
    };


    // Handlers
    const handleJoinSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/clubs/${id}/join`, joinFormData);
            setJoinStatus('success');
            fetchMembers();
        } catch (err) {
            console.error(err);
            setJoinStatus('error');
            alert(err.response?.data?.message || "Failed to join club");
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            // Ensure objectives are sent as an array
            const payload = {
                ...editFormData,
                objectives: editFormData.objectives.split('\n').filter(o => o.trim() !== '')
            };
            const res = await api.put(`/clubs/${id}`, payload);
            setClub(res.data.data);
            setIsEditModalOpen(false);
            alert("Club details updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to update club details");
        }
    };



    // Gallery Handlers (Recent Activities)
    const handleGalleryAdd = () => {
        setGalleryData([...galleryData, { image: '', description: '', inputType: 'upload' }]);
    };

    const handleInputTypeChange = (index, type) => {
        const updated = [...galleryData];
        updated[index].inputType = type;
        setGalleryData(updated);
    };

    const handleImageUpload = async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input value to allow re-uploading the same file
        e.target.value = '';

        console.log("Starting Upload for file:", file.name, "Size:", file.size);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://minor-vt.onrender.com/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || "Upload failed");
            }

            if (data.success) {
                console.log("Upload Success, URL:", data.data.url);
                // Removed alert for smoother experience if user is adding many images
                // alert(`Image Uploaded Successfully!\nURL: ${data.data.url}`);

                const updated = [...galleryData];
                updated[index].image = data.data.url;
                setGalleryData(updated);
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert(`Upload Error: ${error.message}`);
        }
    };

    const handleGalleryChange = (index, field, value) => {
        const updated = [...galleryData];
        updated[index][field] = value;
        setGalleryData(updated);
    };

    const handleGalleryRemove = (index) => {
        const updated = galleryData.filter((_, i) => i !== index);
        setGalleryData(updated);
    };

    const handleGallerySave = async () => {
        try {
            console.log("Saving Gallery Data (Payload):", JSON.stringify(galleryData, null, 2));

            // Automatically filter out items with no image without confirming/blocking
            const validItems = galleryData.filter(item => item.image && item.image.trim() !== '');

            if (validItems.length === 0 && galleryData.length > 0) {
                if (!window.confirm("All items are empty and will be removed. Continue?")) return;
            } else if (galleryData.length > validItems.length) {
                // Configuring silent cleanup, maybe a small toast/alert if significant data lost?
                // Given user request "solve this issue", silent cleanup of empty rows is best.
            }

            // Only update recentEvents to avoid conflicts
            // Strip inputType before saving
            const cleanData = validItems.map(({ inputType, ...keep }) => keep);
            const res = await api.put(`/clubs/${id}`, { recentEvents: cleanData });
            console.log("Gallery Save Response:", res.data);

            if (res.data.success && res.data.data) {
                setClub(res.data.data);
                // Also update local form state to match
                setGalleryData(res.data.data.recentEvents || []);
                setIsGalleryModalOpen(false);
                alert("Recent Activities updated successfully!");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update recent activities");
        }
    };

    // Activities Handlers
    const handleActivityAdd = () => {
        setActivitiesData([...activitiesData, { name: '', date: '', type: 'Event', summary: '' }]);
    };

    const handleActivityChange = (index, field, value) => {
        const updated = [...activitiesData];
        updated[index][field] = value;
        setActivitiesData(updated);
    };

    const handleActivityRemove = (index) => {
        const updated = activitiesData.filter((_, i) => i !== index);
        setActivitiesData(updated);
    };

    const handleActivitySave = async () => {
        try {
            // Validate required fields
            const isValid = activitiesData.every(a => a.name && a.name.trim() && a.date && a.date.trim());
            if (!isValid) {
                alert("Please ensure all activities have an Event Name and Date.");
                return;
            }

            // Iterate and Save (Create or Update)
            const promises = activitiesData.map(async (activity) => {
                if (activity._id) {
                    // Update existing
                    await api.put(`/clubs/${id}/activities/${activity._id}`, activity);
                } else {
                    // Create new
                    await api.post(`/clubs/${id}/activities`, activity);
                }
            });

            await Promise.all(promises);
            await fetchActivities(); // Refresh data
            setIsActivitiesModalOpen(false);
            alert("Activities updated successfully!");
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || "Failed to update activities";
            alert(`Error: ${msg}`);
        }
    };

    const handleActivityDelete = async (idx) => {
        const activity = activitiesData[idx];
        if (activity._id) {
            if (!window.confirm("Are you sure you want to delete this activity?")) return;
            try {
                await api.delete(`/clubs/${id}/activities/${activity._id}`);
                const updated = activitiesData.filter((_, i) => i !== idx);
                setActivitiesData(updated);
            } catch (err) {
                console.error(err);
                alert("Failed to delete activity");
            }
        } else {
            // Just remove from state if not saved yet
            const updated = activitiesData.filter((_, i) => i !== idx);
            setActivitiesData(updated);
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/events', { ...eventFormData, club: id });
            // Add new event to club state locally
            setClub(prev => ({
                ...prev,
                events: [...(prev.events || []), res.data.data]
            }));
            setIsEventModalOpen(false);
            setEventFormData({ title: '', date: '', venue: '', description: '', category: 'Tech', registrationLink: '' });
            alert("Event created successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to create event");
        }
    };



    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
            {/* Header / Back Button */}
            <div className="flex justify-between items-center mb-4 mt-6">
                <button
                    onClick={() => navigate('/clubs')}
                    className="flex items-center text-gray-500 hover:text-secondary transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Clubs
                </button>
                <div className="flex gap-2">
                    {canManage && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsGalleryModalOpen(true)}
                                className="flex items-center px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                            >
                                Recent Activities
                            </button>

                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                            >
                                + Add Student
                            </button>

                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="flex items-center px-4 py-2 bg-secondary text-white rounded-lg hover:bg-accent transition-colors shadow-md"
                            >
                                Edit Club Details
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Club Header Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
                <div className="h-48 md:h-64 bg-gray-50 relative">
                    {(club.name && (club.name.toLowerCase().includes("gdg") || club.name.toLowerCase().includes("google"))) ? (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900" />
                    ) : (club.name && (club.name.toLowerCase().includes("foreign") || club.name.toLowerCase().includes("language"))) ? (
                        <div className="w-full h-full bg-black" />
                    ) : (club.name && club.name.toLowerCase().includes("vertex")) ? (
                        <div className="w-full h-full bg-black" />
                    ) : (
                        <img
                            src={safeImage}
                            alt={club.name || 'Club'}
                            className="w-full h-full object-cover"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end">
                        <div className="p-8 w-full">
                            {(club.name && (club.name.toLowerCase().includes("gdg") || club.name.toLowerCase().includes("google"))) && (
                                <img src={gdgLogo} alt="GDG Logo" className="h-16 mb-4 animate-fade-in" />
                            )}
                            {(club.name && (club.name.toLowerCase().includes("foreign") || club.name.toLowerCase().includes("language"))) && (
                                <img src={flcLogo} alt="FLC Logo" className="h-16 w-16 mb-4 rounded-full object-cover animate-fade-in border-2 border-white/20" />
                            )}
                            {(club.name && club.name.toLowerCase().includes("vertex")) && (
                                <img src={vertexLogo} alt="Vertex Logo" className="h-16 w-16 mb-4 rounded-full object-cover animate-fade-in border-2 border-white/20" />
                            )}
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
                                {(club.name && (club.name.toLowerCase().includes("gdg") || club.name.toLowerCase().includes("google")))
                                    ? "GDG ( GOOGLE DEVELOPER GROUP )"
                                    : club.name}
                            </h1>
                            <p className="text-white/80 text-sm md:text-base font-medium mt-2 max-w-2xl line-clamp-2 hidden md:block">
                                Empowering students to build, learn, and grow together.
                            </p>
                        </div>
                    </div>
                </div>
            </div> {/** Properly closing the header card */}
            {/** Header card closed, now sticky nav can work properly */}

            {/* Navigation Tabs */}
            <div className="flex flex-wrap justify-center border-b border-gray-200 bg-white sticky top-20 z-10 rounded-xl shadow-sm">
                {[
                    // Show Join tab ONLY to students (or non-logged in users who might be students)
                    // Teachers/Admins don't need to join own clubs usually, they manage them
                    ...(isStudent || !user ? [{ id: 'join', label: 'Join Club', icon: Users }] : []),
                    { id: 'events', label: 'Event Registration', icon: Calendar },
                    { id: 'community', label: 'Community', icon: MessageSquare }, // NEW TAB
                    { id: 'gallery', label: 'Gallery', icon: Image },
                    { id: 'achievements', label: 'Achievements', icon: Trophy },
                    { id: 'info', label: 'Club Information', icon: Info },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-8 py-4 font-medium transition-all relative ${activeTab === tab.id
                            ? 'text-secondary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon size={20} className="mr-2" />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[400px]">

                {/* --- JOIN CLUB TAB --- */}
                {activeTab === 'join' && (
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Join {club.name}</h2>
                        {isAlreadyMember ? (
                            <div className="text-center py-10 space-y-4 animate-fade-in">
                                <div className="w-16 h-16 bg-blue-100 text-secondary rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">You have already joined the club</h3>
                                <p className="text-gray-500">You are a registered member of {club.name}.</p>
                            </div>
                        ) : isPendingMember ? (
                            <div className="text-center py-10 space-y-4 animate-fade-in">
                                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                    <Clock size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Application Pending Approval</h3>
                                <p className="text-gray-500">Your request to join {club.name} has been submitted and is pending approval by the teacher.</p>
                            </div>
                        ) : joinStatus === 'success' ? (
                            <div className="text-center py-10 space-y-4">
                                <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Successfully Join!</h3>
                                <p className="text-gray-500">Your request has been submitted to the club coordinator.</p>
                                <button onClick={() => setJoinStatus(null)} className="text-secondary hover:underline">Register another student</button>
                            </div>
                        ) : (
                            <form onSubmit={handleJoinSubmit} className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text" required
                                            className="w-full rounded-xl border border-black focus:ring-secondary focus:border-secondary"
                                            value={joinFormData.name}
                                            onChange={e => setJoinFormData({ ...joinFormData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Student ID / PRN</label>
                                        <input
                                            type="text" required
                                            className="w-full rounded-xl border border-black focus:ring-secondary focus:border-secondary"
                                            value={joinFormData.studentId}
                                            onChange={e => setJoinFormData({ ...joinFormData, studentId: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email" required
                                        className="w-full rounded-xl border border-black focus:ring-secondary focus:border-secondary"
                                        value={joinFormData.email}
                                        onChange={e => setJoinFormData({ ...joinFormData, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <select
                                            required
                                            className="w-full rounded-xl border border-black focus:ring-secondary focus:border-secondary"
                                            value={joinFormData.department}
                                            onChange={e => setJoinFormData({ ...joinFormData, department: e.target.value })}
                                        >
                                            <option value="">Select Department</option>
                                            <option value="CSE">Computer Engineering</option>
                                            <option value="IT">Information Technology</option>
                                            <option value="ENTC">E & TC</option>
                                            <option value="MECH">Mechanical</option>
                                            <option value="CIVIL">Civil</option>
                                            <option value="CHEM">Chemical</option>
                                            <option value="Software">Software</option>
                                            <option value="AIML">AIML</option>
                                            <option value="Data Science">Data Science</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                        <select
                                            required
                                            className="w-full rounded-xl border border-black focus:ring-secondary focus:border-secondary"
                                            value={joinFormData.year}
                                            onChange={e => setJoinFormData({ ...joinFormData, year: e.target.value })}
                                        >
                                            <option value="">Select Year</option>
                                            <option value="FY">First Year</option>
                                            <option value="SY">Second Year</option>
                                            <option value="TY">Third Year</option>
                                            <option value="BTech">Final Year</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-3 bg-secondary hover:bg-accent text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all mt-4">
                                    Submit Application
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* --- EVENTS TAB --- */}
                {activeTab === 'events' && (
                    <div>
                        {/* Upcoming Events */}
                        <div className="mb-10">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                    <Calendar className="mr-2 text-secondary" /> Upcoming Events
                                </h2>
                                {canManage && (
                                    <button
                                        onClick={() => setIsEventModalOpen(true)}
                                        className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-accent transition-all shadow-md text-sm font-bold"
                                    >
                                        + Add Event
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {safeEvents.length > 0 ? (
                                    safeEvents.map((event, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${event.category === 'Tech' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                                        {event.category || 'Event'}
                                                    </span>
                                                    <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                                                </div>
                                                <div className="text-center bg-white p-2 rounded-lg shadow-sm w-16">
                                                    <div className="text-xs text-gray-500 uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                                                    <div className="text-xl font-bold text-secondary">{new Date(event.date).getDate()}</div>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>
                                            <div className="flex items-center text-sm text-gray-500 mb-4 space-x-4">
                                                <div className="flex items-center"><Clock size={14} className="mr-1" /> {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                <div className="flex items-center"><MapPin size={14} className="mr-1" /> {event.venue}</div>
                                            </div>
                                            {event.registrationLink ? (
                                                <a 
                                                    href={event.registrationLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="w-full block text-center py-2 bg-white border border-secondary text-secondary hover:bg-secondary hover:text-white rounded-xl font-semibold transition-all"
                                                >
                                                    Register Now
                                                </a>
                                            ) : (
                                                <button disabled className="w-full py-2 bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed rounded-xl font-semibold transition-all">
                                                    Register Now
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 text-center text-gray-500 italic bg-gray-50 rounded-2xl border-2 border-dashed">
                                        No upcoming events scheduled.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- GALLERY TAB --- */}
                {activeTab === 'gallery' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <Image className="mr-2 text-secondary" /> Club Gallery
                            </h2>
                            {canManage && (
                                <button
                                    onClick={() => setIsGalleryModalOpen(true)}
                                    className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-accent transition-all shadow-md text-sm font-bold"
                                >
                                    + Manage Photos
                                </button>
                            )}
                        </div>

                        {safeRecentEvents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {safeRecentEvents.map((item, idx) => (
                                    <div key={idx} className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 bg-white">
                                        <div className="w-full">
                                            <img
                                                src={item.image || 'https://via.placeholder.com/400x300'}
                                                alt={item.description || 'Gallery Image'}
                                                className="w-full h-auto object-contain bg-gray-50 transform group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                        <div className="p-4">
                                            <p className="text-black text-sm font-medium line-clamp-2">
                                                {item.description || "No description provided."}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2">
                                                {item.date ? new Date(item.date).toLocaleDateString() : 'Recent'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <div className="flex justify-center mb-4"><Image size={48} className="text-gray-300" /></div>
                                <p className="text-lg font-medium text-gray-600">No photos in the gallery yet.</p>
                                {canManage && <p className="text-sm mt-2 text-secondary cursor-pointer hover:underline" onClick={() => setIsGalleryModalOpen(true)}>Manage Photos</p>}
                            </div>
                        )}
                    </div>
                )}


                {/* --- COMMUNITY TAB --- */}
                {activeTab === 'community' && (
                    <div className="max-w-4xl mx-auto h-[600px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <MessageSquare className="mr-2 text-secondary" /> Discussion Forum
                            </h2>
                            <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                {messages.length} Messages
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-6 mb-4 space-y-4 border border-gray-100 shadow-inner">
                            {chatLoading && messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">Loading discussions...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                                    <MessageSquare size={48} className="mb-2 opacity-20" />
                                    <p>No messages yet. Be the first to start a conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg._id}
                                        className={`flex flex-col ${msg.userId === user._id ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className={`flex items-end max-w-[80%] ${msg.userId === user._id ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {/* Avatar */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 shadow-sm
                                                ${msg.isAnonymous
                                                    ? 'bg-gray-600 text-white'
                                                    : (msg.userId === user._id ? 'bg-secondary text-white' : 'bg-blue-100 text-blue-600')
                                                }
                                                ${msg.userId === user._id ? 'ml-2' : 'mr-2'}
                                            `}>
                                                {msg.isAnonymous ? <User size={14} /> : msg.userName.charAt(0)}
                                            </div>

                                            {/* Bubble */}
                                            <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm relative group
                                                ${msg.userId === user._id
                                                    ? 'bg-secondary text-white rounded-br-none' // User's message: Secondary BG, White Text
                                                    : 'bg-white border border-gray-200 text-black rounded-bl-none' // Others: White BG, Black Text
                                                }
                                            `}>
                                                {/* Edit & Delete Buttons for User's Own Messages */}
                                                {!msg.isAnonymous && user && (msg.userId === user.id || msg.userId === user._id) && !msg.isDeleted && (new Date() - new Date(msg.createdAt) < 5 * 60 * 1000) && (
                                                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => startEditing(msg)}
                                                            className="bg-white text-gray-500 p-1 rounded-full shadow-sm hover:text-secondary border border-gray-100"
                                                            title="Edit Message"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(msg._id)}
                                                            className="bg-white text-gray-500 p-1 rounded-full shadow-sm hover:text-red-500 border border-gray-100"
                                                            title="Delete Message"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Sender Name */}
                                                <div className={`text-[10px] font-bold mb-1 opacity-90 ${msg.userId === user._id ? 'text-white' : 'text-gray-600'}`}>
                                                    {msg.isAnonymous ? 'Anonymous Student' : msg.userName}
                                                    {msg.userRole !== 'student' && <span className="ml-1 px-1 rounded bg-white/20 text-white text-[8px] uppercase">{msg.userRole}</span>}
                                                </div>

                                                {/* Message Text - Enforcing Visibility */}
                                                <span className={`block ${msg.userId === user._id ? 'text-white' : 'text-black'}`}>
                                                    {msg.isDeleted ? (
                                                        <span className="italic opacity-70 flex items-center gap-1">
                                                            <X size={12} /> This message was deleted
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {msg.message}
                                                            {msg.isEdited && <span className="text-[10px] ml-1 italic opacity-70">(edited)</span>}
                                                        </span>
                                                    )}
                                                </span>

                                                {/* Timestamp */}
                                                <div className={`text-[9px] mt-1 text-right opacity-70 ${msg.userId === user._id ? 'text-blue-50' : 'text-gray-400'}`}>
                                                    {formatMessageDate(msg.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative">
                            {/* Emoji Picker */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-20 left-4 z-10 shadow-xl rounded-xl">
                                    <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
                                </div>
                            )}

                            {/* Editing Indicator */}
                            {editingMessageId && (
                                <div className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg mb-2 text-xs border border-gray-200">
                                    <span className="text-gray-600 font-medium">Editing message...</span>
                                    <button
                                        onClick={() => { setEditingMessageId(null); setEditContent(''); }}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="flex flex-col md:flex-row gap-4 items-center">
                                {/* Emoji Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <Smile size={24} />
                                </button>

                                {/* Anonymous Toggle (Only for new messages) */}
                                {!editingMessageId && (
                                    <button
                                        type="button"
                                        onClick={() => setIsAnonymous(!isAnonymous)}
                                        className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all text-xs font-medium border
                                            ${isAnonymous
                                                ? 'bg-gray-800 text-white border-gray-800'
                                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                            }
                                        `}
                                        title="Toggle Anonymity"
                                    >
                                        <div className={`w-3 h-3 rounded-full border ${isAnonymous ? 'bg-green-400 border-green-400' : 'bg-transparent border-gray-400'}`}></div>
                                        <span className="hidden md:inline">{isAnonymous ? 'Anonymous ON' : 'Anonymous OFF'}</span>
                                    </button>
                                )}

                                <input
                                    type="text"
                                    value={editingMessageId ? editContent : newMessage}
                                    onChange={(e) => editingMessageId ? setEditContent(e.target.value) : setNewMessage(e.target.value)}
                                    placeholder={editingMessageId ? "Update your message..." : (isAnonymous ? "Type your anonymous message..." : "Type a message...")}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary/50 outline-none transition-all text-black placeholder-gray-400 w-full"
                                />

                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !editingMessageId) || (editingMessageId && !editContent.trim())}
                                    className="p-3 bg-secondary text-white rounded-xl hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm transform hover:scale-105 active:scale-95"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- ACHIEVEMENTS TAB --- */}
                {activeTab === 'achievements' && (
                    <CertificateSection 
                        clubId={id} 
                        clubName={club.name} 
                        clubLogo={club.image}
                        initialCoordinator={club.facultyCoordinator}
                        canManage={canManage} 
                    />
                )}

                {/* --- INFO TAB --- */}
                {activeTab === 'info' && (
                    <div className="space-y-12 animate-fade-in">
                        {/* Leadership Section */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-secondary pl-4">Club Leadership</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {/* Faculty Coordinator */}
                                <div className="bg-gray-50 p-6 rounded-2xl flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">👨‍🏫</div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{safeFacultyName}</h3>
                                        <p className="text-sm text-secondary font-medium">Faculty Coordinator</p>
                                    </div>
                                </div>
                                {/* Club Lead */}
                                <div className="bg-gray-50 p-6 rounded-2xl flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center text-2xl font-bold">
                                        {(safeStudentName).charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{safeStudentName}</h3>
                                        <p className="text-sm text-secondary font-medium">Club Lead</p>
                                    </div>
                                </div>
                                {/* Secretary */}
                                <div className="bg-gray-50 p-6 rounded-2xl flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">📝</div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{safeSecretaryName}</h3>
                                        <p className="text-sm text-secondary font-medium">Secretary</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Members Section (NEW) */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-l-4 border-secondary pl-4 flex justify-between items-center">
                                <span>Club Members</span>
                                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{safeMembers.length} Members</span>
                            </h2>
                            <div className="mb-4">
                                <Link to={`/clubs/${id}/members`} className="text-secondary font-medium hover:underline text-sm">View All Members & Leadership &rarr;</Link>
                            </div>

                        </section>

                        {/* About & Objectives Grid */}
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                            {/* About Card */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative group hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-gray-900 border-l-4 border-secondary pl-3">
                                        About Us
                                    </h2>
                                    {canManage && (
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="text-gray-400 hover:text-secondary bg-gray-50 hover:bg-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-gray-200"
                                            title="Edit Club Details"
                                        >
                                            <span className="sr-only">Edit</span>
                                            <span className="text-xs font-medium flex items-center gap-1">
                                                Edit <span className="text-lg leading-none">✎</span>
                                            </span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-gray-600 leading-relaxed text-sm mb-4 text-justify">
                                    {safeDescription}
                                </p>

                            </div>

                            {/* Objectives Card */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative group hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-gray-900 border-l-4 border-secondary pl-3">
                                        Objectives
                                    </h2>
                                    {canManage && (
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="text-gray-400 hover:text-secondary bg-gray-50 hover:bg-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-gray-200"
                                            title="Edit Objectives"
                                        >
                                            <span className="sr-only">Edit</span>
                                            <span className="text-xs font-medium flex items-center gap-1">
                                                Edit <span className="text-lg leading-none">✎</span>
                                            </span>
                                        </button>
                                    )}
                                </div>
                                <ul className="space-y-3 text-gray-600">
                                    {safeObjectives.length > 0 ? (
                                        safeObjectives.map((obj, i) => (
                                            <li key={i} className="flex items-start group/item">
                                                <div className="mt-1 mr-3 p-1 bg-green-50 rounded-full group-hover/item:bg-green-100 transition-colors">
                                                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                                                </div>
                                                <span className="text-sm font-medium">{obj}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <>
                                            <li className="flex items-start"><CheckCircle size={18} className="text-green-500 mr-2 mt-1" /> Promote technical excellence</li>
                                            <li className="flex items-start"><CheckCircle size={18} className="text-green-500 mr-2 mt-1" /> Facilitate peer learning</li>
                                            <li className="flex items-start"><CheckCircle size={18} className="text-green-500 mr-2 mt-1" /> Connect students with industry</li>
                                        </>
                                    )}
                                </ul>

                                {/* Links Section (NEW) */}
                                {(club.registrationLink || club.infoLink) && (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                                            Important Links
                                        </h3>
                                        <div className="flex flex-col space-y-3">
                                            {club.registrationLink && (
                                                safeEvents.length > 0 ? (
                                                    <a
                                                        href={club.registrationLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center text-secondary hover:underline font-medium p-2 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                                                    >
                                                        <span className="bg-secondary text-white p-1 rounded mr-2 text-xs">JOIN</span>
                                                        Registration / Join Link &rarr;
                                                    </a>
                                                ) : (
                                                    <div
                                                        className="flex items-center text-gray-400 font-medium p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-not-allowed"
                                                    >
                                                        <span className="bg-gray-400 text-white p-1 rounded mr-2 text-xs">CLOSED</span>
                                                        Registration Closed (No Active Events)
                                                    </div>
                                                )
                                            )}
                                            {club.infoLink && (
                                                <a
                                                    href={club.infoLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center text-blue-600 hover:underline font-medium p-2 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                                                >
                                                    <Info size={16} className="mr-2" />
                                                    Club Website / More Info &rarr;
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* FAQ Section (NEW) */}
                        {club.faqs && club.faqs.length > 0 && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative group hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 border-l-4 border-secondary pl-3">
                                        Frequently Asked Questions
                                    </h2>
                                    {canManage && (
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="text-gray-400 hover:text-secondary bg-gray-50 hover:bg-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-gray-200"
                                            title="Edit FAQs"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {club.faqs.map((faq, index) => (
                                        <div key={index} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                            <button
                                                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                                                className="w-full flex justify-between items-center text-left group/faq"
                                            >
                                                <span className="text-sm font-bold text-gray-800 group-hover/faq:text-secondary transition-colors flex items-center">
                                                    <HelpCircle size={16} className="mr-2 text-secondary/60" />
                                                    {faq.question}
                                                </span>
                                                {activeFaq === index ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                            </button>
                                            {activeFaq === index && (
                                                <div className="mt-3 text-sm text-gray-600 pl-6 leading-relaxed animate-fade-in whitespace-pre-wrap">
                                                    {faq.answer}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Activity Gallery (NEW) */}
                        {/* Recent Activities Section Removed - Moved to Modal */}

                        <section>
                            <div className="flex justify-between items-center mb-6 pl-4 border-l-4 border-secondary">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Past Activity Highlights</h2>
                                    <div className="mt-2 text-sm text-gray-500">
                                        View our complete history of events and achievements.
                                        <br />
                                        <Link to={`/clubs/${id}/activities`} className="text-secondary font-bold hover:underline inline-flex items-center mt-1">
                                            View Full Activity History <ArrowLeft size={14} className="ml-1 rotate-180" />
                                        </Link>
                                    </div>
                                </div>
                                {canManage && (
                                    <button
                                        onClick={() => setIsActivitiesModalOpen(true)}
                                        className="text-gray-400 hover:text-secondary p-1 rounded-full hover:bg-gray-100 transition-all"
                                        title="Add New Activity"
                                    >
                                        <span className="text-sm border border-gray-200 px-3 py-1 rounded-full bg-white">+ Add Activity</span>
                                    </button>
                                )}
                            </div>
                        </section>
                    </div>
                )
                }
            </div >

            {/* Edit Modal / Form */}
            {
                isEditModalOpen && (
                    <div className="fixed inset-0 bg-gray-50/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
                        <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-xl border border-gray-100 relative my-4">

                            {/* Header with Back Button */}
                            <div className="flex items-center mb-4 border-b border-gray-100 pb-3">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="mr-3 flex items-center text-gray-500 hover:text-secondary transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
                                >
                                    <ArrowLeft size={16} className="mr-1.5" />
                                    <span className="font-medium text-xs">Back</span>
                                </button>
                                <h2 className="text-xl font-bold text-gray-900">Edit Club Details</h2>
                            </div>

                            <form onSubmit={handleEditSubmit}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                    {/* Left Column: Basic Details */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold border-l-2 border-secondary pl-2 mb-2">Basic Info</h3>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Club Name</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-secondary transition-all p-2.5 border outline-none text-sm text-black placeholder-gray-500"
                                                value={editFormData.name}
                                                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Club Description</label>
                                            <textarea
                                                className="w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-secondary transition-all p-2.5 border outline-none text-sm text-black placeholder-gray-500"
                                                rows="5"
                                                value={editFormData.description}
                                                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Key Objectives <span className="text-gray-400 font-normal text-[10px]">(one per line)</span></label>
                                            <textarea
                                                className="w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-secondary transition-all p-2.5 border outline-none text-sm text-black placeholder-gray-500"
                                                rows="4"
                                                placeholder="Promote technical excellence..."
                                                value={editFormData.objectives}
                                                onChange={e => setEditFormData({ ...editFormData, objectives: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Leadership & Links (Stacked) */}
                                    <div className="space-y-5">
                                        {/* Leadership */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold border-l-2 border-secondary pl-2 mb-2">Leadership</h3>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Faculty Coordinator</label>
                                                <input
                                                    type="text"
                                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-secondary transition-all p-2.5 border outline-none text-sm text-black placeholder-gray-500"
                                                    value={editFormData.facultyCoordinator}
                                                    onChange={e => setEditFormData({ ...editFormData, facultyCoordinator: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Student Lead</label>
                                                    <input
                                                        type="text"
                                                        className="w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-secondary transition-all p-2.5 border outline-none text-sm text-black placeholder-gray-500"
                                                        value={editFormData.studentCoordinator}
                                                        onChange={e => setEditFormData({ ...editFormData, studentCoordinator: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Secretary</label>
                                                    <input
                                                        type="text"
                                                        className="w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-secondary transition-all p-2.5 border outline-none text-sm text-black placeholder-gray-500"
                                                        value={editFormData.secretary}
                                                        onChange={e => setEditFormData({ ...editFormData, secretary: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Links */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold border-l-2 border-secondary pl-2 mb-2">Links</h3>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Registration Link <span className="text-gray-400 font-normal text-[10px]">(Optional)</span></label>
                                                <input
                                                    type="url"
                                                    placeholder="https://forms.google.com/..."
                                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-secondary transition-all p-2.5 border outline-none text-sm text-black placeholder-gray-500"
                                                    value={editFormData.registrationLink}
                                                    onChange={e => setEditFormData({ ...editFormData, registrationLink: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1 ml-1">Website / Info Link <span className="text-gray-400 font-normal text-[10px]">(Optional)</span></label>
                                                <input
                                                    type="url"
                                                    placeholder="https://club-website.com"
                                                    className="w-full rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-50 focus:border-secondary transition-all p-2.5 border outline-none text-sm text-black placeholder-gray-500"
                                                    value={editFormData.infoLink}
                                                    onChange={e => setEditFormData({ ...editFormData, infoLink: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* FAQ Section */}
                                        <div className="space-y-3 pt-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold border-l-2 border-secondary pl-2">Club FAQs</h3>
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateFAQ}
                                                    disabled={isGeneratingFAQ}
                                                    className="text-[10px] flex items-center gap-1 bg-blue-50 text-secondary hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors font-bold disabled:opacity-50"
                                                >
                                                    {isGeneratingFAQ ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                    {isGeneratingFAQ ? "Wait..." : "AI Generate"}
                                                </button>
                                            </div>

                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                {editFormData.faqs.map((faq, index) => (
                                                    <div key={index} className="bg-gray-50 p-2 rounded-xl border border-gray-100 relative group animate-fade-in shadow-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFAQ(index)}
                                                            className="absolute -top-1.5 -right-1.5 bg-white text-red-500 rounded-full p-0.5 shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                        <input
                                                            type="text"
                                                            placeholder="Question"
                                                            className="w-full bg-transparent border-none focus:ring-0 text-xs font-bold text-gray-900 placeholder-gray-400 mb-0.5 p-0"
                                                            value={faq.question}
                                                            onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
                                                        />
                                                        <textarea
                                                            placeholder="Answer"
                                                            rows="2"
                                                            className="w-full bg-transparent border-none focus:ring-0 text-[10px] text-gray-600 placeholder-gray-400 p-0 resize-none"
                                                            value={faq.answer}
                                                            onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                                {editFormData.faqs.length === 0 && !isGeneratingFAQ && (
                                                    <div className="text-center py-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                                        <p className="text-[10px] text-gray-400">No FAQs yet. Click AI Generate!</p>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleAddFAQ}
                                                    className="w-full py-1.5 bg-white border border-gray-200 text-gray-500 rounded-lg text-[10px] hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 font-medium"
                                                >
                                                    <Plus size={10} /> Add Custom
                                                </button>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex justify-end items-center space-x-3 pt-2 mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditModalOpen(false)}
                                                className="px-4 py-2 text-gray-500 hover:text-gray-800 font-medium transition-colors text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-6 py-2 bg-secondary text-white rounded-xl font-bold shadow-md hover:shadow-lg hover:bg-accent transform hover:-translate-y-0.5 transition-all text-sm"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Gallery Management Modal (Restored) */}
            {
                isGalleryModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-secondary pl-4">Recent Club Activities</h2>
                                <button onClick={() => setIsGalleryModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-2">
                                    <span className="text-xl">×</span>
                                </button>
                            </div>

                            {/* Gallery Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {galleryData.length > 0 ? (
                                    galleryData.map((event, idx) => (
                                        <div key={idx} className="relative group rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50">
                                            <div className="h-48 overflow-hidden relative">
                                                <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50">
                                                    {event.image ? (
                                                        <div className="relative w-full h-full group/image">
                                                            <img src={event.image} alt="Preview" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity flex-col gap-2">
                                                                <label className="cursor-pointer bg-white text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 flex items-center shadow-lg transform hover:scale-105 transition-all">
                                                                    <div className="mr-1"><Upload size={12} /></div> Upload New
                                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, idx)} />
                                                                </label>
                                                                <button
                                                                    onClick={() => handleGalleryChange(idx, 'image', '')}
                                                                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 shadow-lg transform hover:scale-105 transition-all"
                                                                >
                                                                    Remove Image
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col">
                                                            <div className="flex justify-center border-b border-gray-200">
                                                                <button
                                                                    onClick={() => handleInputTypeChange(idx, 'upload')}
                                                                    className={`flex-1 py-1 text-xs font-semibold ${event.inputType !== 'url' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                                                >
                                                                    Upload
                                                                </button>
                                                                <button
                                                                    onClick={() => handleInputTypeChange(idx, 'url')}
                                                                    className={`flex-1 py-1 text-xs font-semibold ${event.inputType === 'url' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                                                >
                                                                    URL
                                                                </button>
                                                            </div>

                                                            {event.inputType === 'url' ? (
                                                                <div className="flex-1 flex items-center justify-center p-4">
                                                                    <input
                                                                        type="url"
                                                                        placeholder="Paste image URL here"
                                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 placeholder-gray-500"
                                                                        value={event.image || ''}
                                                                        onChange={(e) => handleGalleryChange(idx, 'image', e.target.value)}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <label className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                                                                    <div className="bg-gradient-to-br from-secondary to-blue-600 rounded-3xl shadow-lg p-6 text-white text-center">
                                                                        <Upload size={20} />
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-gray-500">Click to Upload Image</span>
                                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, idx)} />
                                                                </label>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white">
                                                <textarea
                                                    placeholder="Description"
                                                    className="w-full text-sm rounded border-gray-300 resize-none h-20 text-gray-900 placeholder-gray-500"
                                                    value={event.description}
                                                    onChange={(e) => handleGalleryChange(idx, 'description', e.target.value)}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleGalleryRemove(idx)}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors z-10"
                                                title="Remove"
                                            >
                                                <span className="text-xs font-bold px-2">✕</span>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 text-center text-gray-500 italic bg-gray-50 rounded-2xl border-2 border-dashed">
                                        No recent activities posted yet.
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                                <button
                                    onClick={handleGalleryAdd}
                                    className="flex items-center px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 font-semibold transition-all shadow-sm"
                                >
                                    <span className="text-xl mr-2">+</span> Add New Activity Slot
                                </button>
                                <button
                                    onClick={handleGallerySave}
                                    className="px-6 py-2 bg-secondary text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Activities Management Modal (Table) */}
            {
                isActivitiesModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-6 md:p-8 max-w-5xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-secondary pl-4">Manage Past Activities</h2>
                                <button onClick={() => setIsActivitiesModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-2">
                                    <span className="text-xl">×</span>
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                {activitiesData.map((activity, idx) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Event Name</label>
                                            <input
                                                type="text"
                                                className="w-full text-sm rounded-lg border-gray-300 text-gray-900"
                                                value={activity.name}
                                                onChange={(e) => handleActivityChange(idx, 'name', e.target.value)}
                                                placeholder="Event Name"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                                            <input
                                                type="text"
                                                className="w-full text-sm rounded-lg border-gray-300 text-gray-900"
                                                value={activity.date}
                                                onChange={(e) => handleActivityChange(idx, 'date', e.target.value)}
                                                placeholder="e.g. Jan 10"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                                            <select
                                                className="w-full text-sm rounded-lg border-gray-300 text-gray-900"
                                                value={activity.type}
                                                onChange={(e) => handleActivityChange(idx, 'type', e.target.value)}
                                            >
                                                <option value="Event">Event</option>
                                                <option value="Hackathon">Hackathon</option>
                                                <option value="Seminar">Seminar</option>
                                                <option value="Workshop">Workshop</option>
                                                <option value="Webinar">Webinar</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL</label>
                                            <input
                                                type="text"
                                                className="w-full text-sm rounded-lg border-gray-300 text-gray-900"
                                                value={activity.image || ''}
                                                onChange={(e) => handleActivityChange(idx, 'image', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="md:col-span-3 relative">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Summary</label>
                                            <input
                                                type="text"
                                                className="w-full text-sm rounded-lg border-gray-300 text-gray-900"
                                                value={activity.summary}
                                                onChange={(e) => handleActivityChange(idx, 'summary', e.target.value)}
                                                placeholder="Brief description"
                                            />
                                            <button
                                                onClick={() => handleActivityDelete(idx)}
                                                className="absolute top-0 right-0 -mt-6 text-red-500 hover:text-red-700 p-1"
                                                title="Remove Activity"
                                            >
                                                <span className="text-xl">×</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {activitiesData.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 italic border-2 border-dashed border-gray-200 rounded-xl">
                                        No activities added yet. Click below to add one.
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                                <button
                                    onClick={handleActivityAdd}
                                    className="flex items-center px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 font-semibold transition-all shadow-sm"
                                >
                                    <span className="text-xl mr-2">+</span> Add Activity
                                </button>
                                <button
                                    onClick={handleActivitySave}
                                    className="px-6 py-2 bg-secondary text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Event Modal (NEW) */}
            {
                isEventModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                            <h2 className="text-2xl font-bold mb-6 text-gray-900">Add New Event</h2>
                            <form onSubmit={handleEventSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
                                        value={eventFormData.title}
                                        onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time <span className="text-red-500">*</span></label>
                                        <input
                                            type="datetime-local"
                                            required
                                            min={new Date().toISOString().slice(0, 16)}
                                            className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
                                            value={eventFormData.date}
                                            onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <select
                                            className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
                                            value={eventFormData.category}
                                            onChange={e => setEventFormData({ ...eventFormData, category: e.target.value })}
                                        >
                                            <option value="Tech">Tech</option>
                                            <option value="Non-Tech">Non-Tech</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
                                        value={eventFormData.venue}
                                        onChange={e => setEventFormData({ ...eventFormData, venue: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        required
                                        rows="3"
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
                                        value={eventFormData.description}
                                        onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Link (Optional)</label>
                                    <input
                                        type="url"
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
                                        value={eventFormData.registrationLink}
                                        onChange={e => setEventFormData({ ...eventFormData, registrationLink: e.target.value })}
                                        placeholder="https://forms.gle/..."
                                    />
                                </div>
                                <div className="flex space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEventModalOpen(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-secondary text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Add Member Modal (NEW) */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                            <h2 className="text-2xl font-bold mb-2 text-gray-900">Add New Member</h2>
                            <p className="text-gray-500 mb-6 text-sm">Enter the email address of the student you want to add.</p>

                            <form onSubmit={handleAddMember} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Email <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="student@university.edu"
                                        className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
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
                                            className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
                                            value={newMemberData.name}
                                            onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">PRN / ID</label>
                                        <input
                                            type="text"
                                            placeholder="123456"
                                            className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
                                            value={newMemberData.studentId}
                                            onChange={e => setNewMemberData({ ...newMemberData, studentId: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <select
                                            className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
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
                                            className="w-full rounded-xl border-gray-200 focus:ring-secondary focus:border-secondary transition-all p-3 border text-gray-900"
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
                )
            }

        </div >
    );
};

export default ClubDetails;
