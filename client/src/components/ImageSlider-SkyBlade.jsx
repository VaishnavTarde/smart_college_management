import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Upload, X, Link as LinkIcon, Edit2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://minor-final-project.onrender.com';

const ImageSlider = () => {
    const [slides, setSlides] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [loading, setLoading] = useState(true);

    // Edit Mode States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('url'); // 'url' or 'file'
    const [newSlide, setNewSlide] = useState({
        title: '',
        url: '',
        isEventBanner: false,
        eventDate: '',
        customDate: '', // YYYY-MM-DD
        customTime: {
            hour: '12',
            minute: '00',
            ampm: 'AM'
        },
        venue: '',
        description: '',
        clubName: '',
        eventEndDate: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    // Auth Check
    const user = JSON.parse(localStorage.getItem('user'));
    const canEdit = user && (user.role === 'teacher' || user.role === 'admin');

    // Fetch Slides
    useEffect(() => {
        fetchSlides();
    }, []);

    const fetchSlides = async () => {
        try {
            const res = await fetch(`${API_URL}/api/slider`);
            const data = await res.json();
            if (data.success) {
                setSlides(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch slides", error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-slide logic
    useEffect(() => {
        let interval;
        if (!isHovered && slides.length > 0) {
            interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % slides.length);
            }, 3000); // Increased to 3s for better viewing
        }
        return () => clearInterval(interval);
    }, [isHovered, slides.length]);

    // File Handler
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
                setNewSlide(prev => ({ ...prev, url: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Add Slide
    const handleAddSlide = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let finalUrl = newSlide.url;

            // If file selected, upload first
            if (activeTab === 'file' && selectedFile) {
                const formData = new FormData();
                formData.append('image', selectedFile);

                const token = localStorage.getItem('token');
                if (!token) {
                    alert("You are not logged in. Please login again.");
                    setUploading(false);
                    return;
                }
                const uploadRes = await fetch(`${API_URL}/api/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (uploadRes.status === 401) {
                    alert("Session expired. Please login again.");
                    localStorage.clear();
                    window.location.href = '/login';
                    return;
                }

                const uploadData = await uploadRes.json();

                if (!uploadData.success) throw new Error(uploadData.message || 'Upload failed');
                finalUrl = uploadData.data.url;
            }

            // Combine Date and Time
            let finalEventDate = newSlide.eventDate;
            if (newSlide.isEventBanner && newSlide.customDate) {
                const { hour, minute, ampm } = newSlide.customTime;
                let hours = parseInt(hour);
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;

                const dateObj = new Date(newSlide.customDate);
                dateObj.setHours(hours, parseInt(minute), 0, 0);
                finalEventDate = dateObj.toISOString();
            }

            // Add Slide to DB
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/slider`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newSlide.title,
                    url: finalUrl,
                    isEventBanner: newSlide.isEventBanner,
                    eventDate: finalEventDate,
                    venue: newSlide.venue,
                    description: newSlide.description,
                    clubName: newSlide.clubName,
                    eventEndDate: newSlide.eventEndDate || null
                })
            });
            const data = await res.json();

            if (res.status === 401) {
                alert("Session expired. Please login again.");
                localStorage.clear();
                window.location.href = '/login';
                return;
            }
            if (data.success) {
                fetchSlides(); // Refresh
                setNewSlide({
                    title: '',
                    url: '',
                    isEventBanner: false,
                    eventDate: '',
                    customDate: '',
                    customTime: { hour: '12', minute: '00', ampm: 'AM' },
                    venue: '',
                    description: '',
                    clubName: '',
                    eventEndDate: ''
                });
                setSelectedFile(null);
                setPreviewUrl('');
                setIsEditModalOpen(false);
            } else {
                alert(data.error || data.message || "An error occurred");
            }
        } catch (error) {
            console.error("Error adding slide:", error);
            alert("Failed to add slide");
        } finally {
            setUploading(false);
        }
    };

    // Delete Slide
    const handleDeleteSlide = async (id) => {
        if (!window.confirm("Are you sure you want to remove this slide?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/slider/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchSlides();
                if (currentIndex >= slides.length - 1) setCurrentIndex(0);
            }
        } catch (error) {
            console.error("Error deleting slide:", error);
        }
    };

    if (loading) return <div className="h-48 md:h-80 bg-gray-100/50 animate-pulse rounded-3xl m-8"></div>;

    // Fallback if no slides
    const displaySlides = slides.length > 0 ? slides : [
        { _id: '1', url: "https://placehold.co/600x400/FFE5E5/FF6B6B?text=Welcome+to+Campus", title: "Welcome" }
    ];
    const currentSlide = displaySlides[currentIndex];

    return (
        <section
            className="container mx-auto px-4 my-8 relative group/slider"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Edit Button for Teachers */}
            {canEdit && (
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute top-4 right-8 z-20 bg-white/90 backdrop-blur text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover/slider:opacity-100 transition-all hover:text-secondary border border-gray-200"
                    title="Manage Slides"
                >
                    <Edit2 size={20} />
                </button>
            )}

            {/* Slider Container */}
            <div className="bg-white p-2 rounded-3xl shadow-md border border-gray-100 overflow-hidden max-w-5xl mx-auto">
                <div className="relative w-full overflow-hidden rounded-2xl bg-gray-50 flex justify-center items-center">
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={currentSlide._id || currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="w-full flex justify-center"
                        >
                            <img
                                src={currentSlide.url}
                                alt={currentSlide.title || "Slide"}
                                className="w-auto h-auto max-w-full max-h-[85vh] object-contain"
                            />
                            {/* Optional Title Overlay */}
                            {currentSlide.title && currentSlide.title !== 'Slide Image' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
                                    <h3 className="text-xl font-bold">{currentSlide.title}</h3>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/5 hover:bg-transparent transition-colors pointer-events-none"></div>
                </div>

                {/* Dots Indicators */}
                <div className="flex justify-center gap-2 mt-3 pb-1">
                    {displaySlides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex
                                ? 'bg-secondary w-8'
                                : 'bg-gray-300 w-2 hover:bg-gray-400'
                                }`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900">Manage Slider Images</h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {/* Current Slides List */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Current Slides</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {slides.map((slide) => (
                                            <div key={slide._id} className="relative group rounded-xl overflow-hidden aspect-video border border-gray-200">
                                                <img src={slide.url} alt="slide" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleDeleteSlide(slide._id)}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate px-2">
                                                    {slide.title}
                                                </div>
                                            </div>
                                        ))}
                                        {slides.length === 0 && <p className="text-sm text-gray-400 col-span-full italic">No custom slides added. Default placeholder is shown.</p>}
                                    </div>
                                </div>

                                {/* Add New Slide Form */}
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Plus size={16} className="text-secondary" /> Add New Slide
                                    </h3>

                                    <form onSubmit={handleAddSlide} className="space-y-4">
                                        {/* Tabs */}
                                        <div className="flex bg-white p-1 rounded-xl border border-gray-200 w-fit">
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('url')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'url' ? 'bg-secondary text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                            >
                                                <LinkIcon size={14} /> URL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab('file')}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'file' ? 'bg-secondary text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                            >
                                                <Upload size={14} /> Upload
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Slide Title (Optional)"
                                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900 placeholder-gray-500"
                                                    value={newSlide.title}
                                                    onChange={e => setNewSlide({ ...newSlide, title: e.target.value })}
                                                />
                                            </div>

                                            {/* Event Details Toggle */}
                                            <div className="flex items-center gap-2 pt-2">
                                                <input
                                                    type="checkbox"
                                                    id="isEvent"
                                                    checked={newSlide.isEventBanner}
                                                    onChange={e => setNewSlide({ ...newSlide, isEventBanner: e.target.checked })}
                                                    className="w-4 h-4 text-secondary rounded focus:ring-secondary cursor-pointer"
                                                />
                                                <label htmlFor="isEvent" className="text-sm text-gray-700 font-medium cursor-pointer select-none">Is this an Event Banner?</label>
                                            </div>

                                            {/* Event Details Inputs */}
                                            {newSlide.isEventBanner && (
                                                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                    {/* Date and Time Row */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-500 uppercase">Event Date</label>
                                                            <input
                                                                type="date"
                                                                min={new Date().toISOString().split('T')[0]}
                                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900 mt-1"
                                                                value={newSlide.customDate}
                                                                onChange={e => setNewSlide({ ...newSlide, customDate: e.target.value })}
                                                                required={newSlide.isEventBanner}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-gray-500 uppercase">End Date <span className="text-[10px] text-gray-400 font-normal">(Optional)</span></label>
                                                            <input
                                                                type="date"
                                                                min={newSlide.customDate || new Date().toISOString().split('T')[0]}
                                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900 mt-1"
                                                                value={newSlide.eventEndDate}
                                                                onChange={e => setNewSlide({ ...newSlide, eventEndDate: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="text-xs font-bold text-gray-500 uppercase">Event Time</label>
                                                            <div className="flex gap-2 mt-1">
                                                                <select
                                                                    className="flex-1 px-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900"
                                                                    value={newSlide.customTime.hour}
                                                                    onChange={e => setNewSlide({ ...newSlide, customTime: { ...newSlide.customTime, hour: e.target.value } })}
                                                                >
                                                                    {[...Array(12).keys()].map(i => (
                                                                        <option key={i} value={i + 1}>{i + 1}</option>
                                                                    ))}
                                                                </select>
                                                                <span className="self-center font-bold">:</span>
                                                                <select
                                                                    className="flex-1 px-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900"
                                                                    value={newSlide.customTime.minute}
                                                                    onChange={e => setNewSlide({ ...newSlide, customTime: { ...newSlide.customTime, minute: e.target.value } })}
                                                                >
                                                                    {[...Array(60).keys()].map(i => {
                                                                        const m = i.toString().padStart(2, '0');
                                                                        return <option key={m} value={m}>{m}</option>;
                                                                    })}
                                                                </select>
                                                                <select
                                                                    className="w-20 px-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900"
                                                                    value={newSlide.customTime.ampm}
                                                                    onChange={e => setNewSlide({ ...newSlide, customTime: { ...newSlide.customTime, ampm: e.target.value } })}
                                                                >
                                                                    <option value="AM">AM</option>
                                                                    <option value="PM">PM</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Venue / Location"
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900"
                                                        value={newSlide.venue}
                                                        onChange={e => setNewSlide({ ...newSlide, venue: e.target.value })}
                                                        required={newSlide.isEventBanner}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Club / Host Name"
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900"
                                                        value={newSlide.clubName}
                                                        onChange={e => setNewSlide({ ...newSlide, clubName: e.target.value })}
                                                        required={newSlide.isEventBanner}
                                                    />
                                                    <textarea
                                                        placeholder="Short Description / Event Type"
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900 resize-none"
                                                        rows="2"
                                                        value={newSlide.description}
                                                        onChange={e => setNewSlide({ ...newSlide, description: e.target.value })}
                                                    ></textarea>
                                                </div>
                                            )}

                                            {activeTab === 'url' ? (
                                                <input
                                                    type="url"
                                                    required={activeTab === 'url'}
                                                    placeholder="Image URL"
                                                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-secondary/20 outline-none text-sm text-gray-900 placeholder-gray-500"
                                                    value={newSlide.url}
                                                    onChange={e => setNewSlide({ ...newSlide, url: e.target.value })}
                                                />
                                            ) : (
                                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-white transition-colors relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        required={activeTab === 'file'}
                                                        onChange={handleFileChange}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    {previewUrl ? (
                                                        <img src={previewUrl} alt="Preview" className="h-20 mx-auto rounded object-cover" />
                                                    ) : (
                                                        <div className="text-gray-400 text-xs">
                                                            <Upload size={20} className="mx-auto mb-1" />
                                                            Click to upload image
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={uploading}
                                                className="w-full py-3 bg-secondary text-white rounded-xl font-bold hover:bg-accent transition-colors disabled:opacity-70 text-sm shadow-md"
                                            >
                                                {uploading ? 'Processing...' : 'Add to Slider'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default ImageSlider;
