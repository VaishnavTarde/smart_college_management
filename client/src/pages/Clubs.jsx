import React, { useState, useEffect } from 'react';
import { Plus, Users, ArrowRight, Edit, ExternalLink, Sparkles, Trash2, HelpCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { generateClubFAQs } from '../services/aiService';
import gdgBranding from '../assets/gdg_branding.jpg';
import flcLogo from '../assets/flc_logo.jpg';
import vertexLogo from '../assets/vertex_logo.jpg';

const Clubs = () => {
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClubId, setCurrentClubId] = useState(null);
    const [isGeneratingFAQ, setIsGeneratingFAQ] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image: '',
        registrationLink: '',
        faqs: []
    });

    const user = JSON.parse(localStorage.getItem('user'));
    const canCreate = user && (user.role === 'teacher' || user.role === 'admin');

    useEffect(() => {
        fetchClubs();
    }, []);

    const fetchClubs = async () => {
        try {
            const res = await api.get('/clubs');
            setClubs(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (club) => {
        setFormData({
            name: club.name,
            description: club.description,
            image: club.image || '',
            registrationLink: club.registrationLink || '',
            faqs: club.faqs || []
        });
        setCurrentClubId(club._id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleCreate = () => {
        setFormData({ name: '', description: '', image: '', registrationLink: '', faqs: [] });
        setIsEditing(false);
        setCurrentClubId(null);
        setShowModal(true);
    };

    const handleGenerateFAQ = async () => {
        if (!formData.name || !formData.description) {
            alert("Please provide a club name and description first.");
            return;
        }

        setIsGeneratingFAQ(true);
        try {
            const faqs = await generateClubFAQs({
                name: formData.name,
                description: formData.description
            });
            setFormData(prev => ({ ...prev, faqs }));
        } catch (err) {
            alert(err.message || "Failed to generate FAQs");
        } finally {
            setIsGeneratingFAQ(false);
        }
    };

    const handleAddFAQ = () => {
        setFormData(prev => ({
            ...prev,
            faqs: [...prev.faqs, { question: '', answer: '' }]
        }));
    };

    const handleFAQChange = (index, field, value) => {
        const updatedFAQs = [...formData.faqs];
        updatedFAQs[index][field] = value;
        setFormData(prev => ({ ...prev, faqs: updatedFAQs }));
    };

    const handleRemoveFAQ = (index) => {
        setFormData(prev => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/clubs/${currentClubId}`, formData);
            } else {
                await api.post('/clubs', formData);
            }
            setShowModal(false);
            fetchClubs();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Unknown Error';
            const status = err.response?.status || 'No Status';
            alert(`Error (${status}): ${msg}`);
        }
    };

    if (loading) return <div className="text-center py-10">Loading...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Clubs</h1>
                    <p className="text-gray-600 mt-2">Join a community that matches your passion.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center space-x-2 bg-secondary hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        <span>Create Club</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {clubs.map((club) => {
                    const activeEvents = (club.events || []).filter(event => new Date(event.date) >= new Date());
                    return (
                        <div key={club._id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all border border-gray-100 flex flex-col group overflow-hidden">
                        <div className={`h-48 relative overflow-hidden ${(club.name && (club.name.toLowerCase().includes("gdg") || club.name.toLowerCase().includes("google")))
                            ? "bg-white flex items-center justify-center border-b border-gray-100"
                            : (club.name && (club.name.toLowerCase().includes("foreign") || club.name.toLowerCase().includes("language")))
                                ? "bg-[#05445E] flex items-center justify-center"
                                : (club.name && club.name.toLowerCase().includes("vertex"))
                                    ? "bg-black flex items-center justify-center border-b border-gray-900"
                                    : "bg-gray-100"
                            }`}>
                            <img
                                src={
                                    (club.name && (club.name.toLowerCase().includes("gdg") || club.name.toLowerCase().includes("google")))
                                        ? gdgBranding
                                        : (club.name && (club.name.toLowerCase().includes("foreign") || club.name.toLowerCase().includes("language")))
                                            ? flcLogo
                                            : (club.name && club.name.toLowerCase().includes("vertex"))
                                                ? vertexLogo
                                                : (club.image || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')
                                }
                                alt={club.name}
                                className={`w-full h-full ${(club.name && (club.name.toLowerCase().includes("gdg") || club.name.toLowerCase().includes("google")))
                                    ? "object-contain p-6"
                                    : (club.name && (club.name.toLowerCase().includes("foreign") || club.name.toLowerCase().includes("language")))
                                        ? "object-contain p-2"
                                        : (club.name && club.name.toLowerCase().includes("vertex"))
                                            ? "object-contain p-2"
                                            : "object-cover transform group-hover:scale-105 transition-transform duration-500"
                                    }`}
                            />
                            {/* Edit Button for Coordinator/Admin */}
                            {canCreate && (user.role === 'admin' || (user.id === club.coordinator?._id || user.id === club.coordinator)) && (
                                <button
                                    onClick={() => handleEdit(club)}
                                    className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full text-secondary hover:bg-white transition-colors shadow-sm"
                                    title="Edit Club"
                                >
                                    <Edit size={16} />
                                </button>
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{club.name}</h3>


                            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <div className="flex items-center">
                                        <Users size={16} className="mr-1" />
                                        <span>{club.members ? club.members.length : 'View'} Members</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {/* View Details / Join Button */}
                                    <div className="flex gap-2">
                                        <Link
                                            to={`/clubs/${club._id}`}
                                            className="flex-1 flex items-center justify-center bg-secondary hover:bg-accent text-white py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                        >
                                            View Details & Join <ArrowRight size={14} className="ml-1" />
                                        </Link>
                                    </div>

                                    {/* Event/Activity Link */}
                                    {club.registrationLink ? (
                                        activeEvents.length > 0 ? (
                                            <a
                                                href={club.registrationLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-center bg-white border border-secondary text-secondary hover:bg-secondary hover:text-white py-2 rounded-lg text-sm font-medium transition-all"
                                            >
                                                Register for Event <ExternalLink size={14} className="ml-1" />
                                            </a>
                                        ) : (
                                            <button disabled className="w-full text-center bg-gray-50 text-gray-400 py-2 rounded-lg text-sm font-medium border border-gray-100 cursor-not-allowed">
                                                Registration Closed
                                            </button>
                                        )
                                    ) : (
                                        <button disabled className="w-full text-center bg-gray-50 text-gray-400 py-2 rounded-lg text-sm font-medium border border-gray-100 cursor-not-allowed">
                                            {activeEvents.length > 0 ? `Current ${activeEvents.length} Event${activeEvents.length > 1 ? 's' : ''}` : 'Current No Events'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
                })}
            </div>

            {/* Create/Edit Club Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            {isEditing ? 'Edit Club' : 'Create New Club'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border border-gray-400 focus:ring-secondary focus:border-secondary text-gray-900"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-gray-400 focus:ring-secondary focus:border-secondary text-gray-900"
                                        value={formData.image}
                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    required
                                    rows="3"
                                    className="w-full rounded-lg border border-gray-400 focus:ring-secondary focus:border-secondary text-gray-900"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Link / Form</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border border-gray-300 focus:ring-secondary focus:border-secondary text-gray-900"
                                    value={formData.registrationLink}
                                    onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                                    placeholder="https://forms.google.com/..."
                                />
                            </div>

                            {/* FAQ Section */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center">
                                        <HelpCircle size={16} className="mr-2 text-secondary" /> Club FAQs
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleGenerateFAQ}
                                        disabled={isGeneratingFAQ}
                                        className="text-xs flex items-center gap-1 bg-blue-50 text-secondary hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors font-bold disabled:opacity-50"
                                    >
                                        {isGeneratingFAQ ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                        {isGeneratingFAQ ? "Generating..." : "Auto-create FAQ"}
                                    </button>
                                </div>

                                <div className="space-y-3 pr-2">
                                    {formData.faqs.map((faq, index) => (
                                        <div key={index} className="bg-gray-100 p-3 rounded-xl border border-gray-100 relative group animate-fade-in shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFAQ(index)}
                                                className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <input
                                                type="text"
                                                placeholder="Question"
                                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 placeholder-gray-400 mb-1 p-0"
                                                value={faq.question}
                                                onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
                                            />
                                            <textarea
                                                placeholder="Answer"
                                                rows="2"
                                                className="w-full bg-transparent border-none focus:ring-0 text-xs text-gray-600 placeholder-gray-400 p-0 resize-none"
                                                value={faq.answer}
                                                onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    {formData.faqs.length === 0 && !isGeneratingFAQ && (
                                        <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                            <p className="text-xs text-gray-400">No FAQs added yet. Use AI to generate some based on description!</p>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleAddFAQ}
                                        className="w-full py-2 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 font-medium"
                                    >
                                        <Plus size={12} /> Add Custom FAQ
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-secondary hover:bg-accent text-white rounded-lg transition-colors"
                                >
                                    {isEditing ? 'Update Club' : 'Create Club'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clubs;
