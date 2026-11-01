import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Image as ImageIcon, Upload, Link as LinkIcon } from 'lucide-react';

const EventGallery = () => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null); // Lightbox State
    const [activeTab, setActiveTab] = useState('url'); // 'url' or 'file'
    const [newPhoto, setNewPhoto] = useState({ title: '', url: '', size: 'medium' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchPhotos();
    }, []);

    const fetchPhotos = async () => {
        try {
            const res = await fetch('https://minor-vt.onrender.com/api/gallery');
            const data = await res.json();
            if (data.success) {
                setPhotos(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch photos", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
                setNewPhoto(prev => ({ ...prev, url: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddPhoto = async (e) => {
        e.preventDefault();

        if (!newPhoto.title) {
            alert("Please add a title");
            return;
        }

        setUploading(true);

        try {
            let finalUrl = newPhoto.url;

            // Upload to Cloudinary if file selected
            if (activeTab === 'file' && selectedFile) {
                const formData = new FormData();
                formData.append('image', selectedFile);

                const token = localStorage.getItem('token');
                const uploadRes = await fetch('https://minor-vt.onrender.com/api/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const uploadData = await uploadRes.json();

                if (!uploadData.success) throw new Error(uploadData.message || 'Upload failed');
                finalUrl = uploadData.data.url;
            } else if (activeTab === 'url' && !newPhoto.url) {
                alert("Please enter a URL");
                setUploading(false);
                return;
            }

            // Save to DB
            const photoData = {
                title: newPhoto.title,
                url: finalUrl,
                size: newPhoto.size // Keep size for legacy reasons or layout hints if needed
            };

            const token = localStorage.getItem('token');
            const res = await fetch('https://minor-vt.onrender.com/api/gallery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(photoData)
            });

            const data = await res.json();

            if (data.success) {
                fetchPhotos(); // Refresh list
                setNewPhoto({ title: '', url: '', size: 'medium' });
                setSelectedFile(null);
                setPreviewUrl('');
                setIsAddModalOpen(false);
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error adding photo:", error);
            alert("Failed to add photo: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async (id) => {
        if (!window.confirm('Are you sure you want to delete this photo?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`https://minor-vt.onrender.com/api/gallery/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                if (selectedPhoto && selectedPhoto._id === id) setSelectedPhoto(null); // Close lightbox if deleting current
                setPhotos(photos.filter(p => p._id !== id));
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Delete failed");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Campus Moments</h1>
                    <p className="text-lg text-gray-600 max-w-xl">
                        Reliving the best memories from our vibrant campus life.
                    </p>
                </div>
                {/* Only Teachers/Admins can add photos */}
                {(() => {
                    const user = JSON.parse(localStorage.getItem('user'));
                    return user && (user.role === 'teacher' || user.role === 'admin') ? (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-xl hover:bg-accent transition-all shadow-lg shadow-secondary/30 transform hover:-translate-y-1 font-medium"
                        >
                            <Plus size={20} />
                            Add Photo
                        </button>
                    ) : null;
                })()}
            </div>

            {photos.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <ImageIcon size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg">No photos yet. Be the first to add one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[0, 1, 2].map(colIndex => (
                        <div key={colIndex} className="flex flex-col gap-6">
                            {photos.filter((_, i) => i % 3 === colIndex).map(photo => (
                                <PhotoCard
                                    key={photo._id}
                                    photo={photo}
                                    onDelete={handleDeletePhoto}
                                    onClick={() => setSelectedPhoto(photo)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPhoto(null)}
                            className="fixed inset-0 bg-black/90 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative z-10 max-w-7xl max-h-screen p-2"
                        >
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute -top-12 right-0 md:-right-12 text-white/80 hover:text-white transition-colors bg-white/10 p-2 rounded-full backdrop-blur-md"
                                title="Close"
                            >
                                <X size={24} />
                            </button>
                            <img
                                src={selectedPhoto.url}
                                alt={selectedPhoto.title}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                            <div className="absolute bottom-[-3rem] left-0 right-0 text-center text-white/90 font-medium text-lg">
                                {selectedPhoto.title}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Photo Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <ImageIcon className="text-secondary" /> Add New Photo
                                </h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddPhoto} className="p-6 space-y-5">
                                {/* Title Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Hackathon Winners 2024"
                                        value={newPhoto.title}
                                        onChange={e => setNewPhoto({ ...newPhoto, title: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                                    />
                                </div>

                                {/* Tabs */}
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('url')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'url' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <LinkIcon size={16} /> Link URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('file')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'file' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <Upload size={16} /> Upload File
                                    </button>
                                </div>

                                {activeTab === 'url' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://example.com/image.jpg"
                                            value={newPhoto.url}
                                            onChange={e => setNewPhoto({ ...newPhoto, url: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-secondary/50 outline-none transition-all"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Choose File</label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            {previewUrl ? (
                                                <div className="relative">
                                                    <img src={previewUrl} alt="Preview" className="h-32 mx-auto rounded-lg shadow-sm object-cover" />
                                                    <p className="mt-2 text-xs text-green-500 font-medium">Image selected</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <Upload className="text-gray-400 mb-2" size={24} />
                                                    <span className="text-sm text-gray-500">Click or Drag to upload</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Size Selection - Kept for optional grid hint, but not enforcing crop anymore */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Size</label>
                                    <select
                                        value={newPhoto.size}
                                        onChange={e => setNewPhoto({ ...newPhoto, size: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-secondary/50 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                        <option value="small">Small</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium border border-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="flex-1 px-4 py-2.5 bg-secondary text-white rounded-xl hover:bg-accent transition-colors shadow-lg shadow-secondary/20 font-medium disabled:opacity-70"
                                    >
                                        {uploading ? 'Saving...' : 'Save Photo'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PhotoCard = ({ photo, onDelete, onClick }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const canDelete = user && (user.role === 'teacher' || user.role === 'admin');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -5 }}
            onClick={onClick}
            className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 bg-gray-100 cursor-zoom-in"
        >
            <img
                src={photo.url}
                alt={photo.title}
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 pointer-events-none">
                <h3 className="text-white font-bold text-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    {photo.title}
                </h3>
            </div>

            {canDelete && (
                <div className="absolute top-3 right-3 z-10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(photo._id);
                        }}
                        className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg backdrop-blur-sm"
                        title="Delete Photo"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )}
        </motion.div>
    );
}

export default EventGallery;
