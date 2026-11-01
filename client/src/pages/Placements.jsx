import React, { useState, useEffect } from 'react';
import {
    Briefcase, Building, MapPin, DollarSign, Calendar, Plus, ExternalLink,
    BookOpen, Award, TrendingUp, FileText, CheckCircle, Lightbulb, GraduationCap,
    Edit, Trash2, X
} from 'lucide-react';
import api from '../services/api';

const Placements = () => {
    const [placements, setPlacements] = useState([]);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showDriveModal, setShowDriveModal] = useState(false);
    const [showResourceModal, setShowResourceModal] = useState(false);

    // Editing state
    const [editingResource, setEditingResource] = useState(null);
    const [viewingResource, setViewingResource] = useState(null);
    const [editingPlacement, setEditingPlacement] = useState(null); // New state for editing placement

    // Form Data
    const [driveData, setDriveData] = useState({
        company: '', role: '', description: '', eligibility: '', driveDate: '', salary: '', applyLink: ''
    });

    const [resourceData, setResourceData] = useState({
        title: '', description: '', information: '', icon: 'BookOpen', link: ''
    });

    const user = JSON.parse(localStorage.getItem('user'));
    const canCreate = user && (user.role === 'admin' || user.role === 'teacher');

    // Icon Mapping for Resources
    const iconMap = {
        BookOpen: BookOpen,
        Award: Award,
        TrendingUp: TrendingUp,
        FileText: FileText,
        CheckCircle: CheckCircle,
        Lightbulb: Lightbulb,
        GraduationCap: GraduationCap,
        Briefcase: Briefcase
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [placementsRes, resourcesRes] = await Promise.all([
                api.get('/placements'),
                api.get('/placements/resources')
            ]);
            setPlacements(placementsRes.data.data);
            setResources(resourcesRes.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Drive Handlers ---
    const openDriveModal = (placement = null) => {
        if (placement) {
            setEditingPlacement(placement);
            setDriveData({
                company: placement.company,
                role: placement.role,
                description: placement.description,
                eligibility: placement.eligibility,
                driveDate: placement.driveDate ? new Date(placement.driveDate).toISOString().split('T')[0] : '',
                salary: placement.salary || '',
                applyLink: placement.applyLink || ''
            });
        } else {
            setEditingPlacement(null);
            setDriveData({ company: '', role: '', description: '', eligibility: '', driveDate: '', salary: '', applyLink: '' });
        }
        setShowDriveModal(true);
    };

    const handleDriveSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPlacement) {
                await api.put(`/placements/${editingPlacement._id}`, driveData);
            } else {
                await api.post('/placements', driveData);
            }
            setShowDriveModal(false);
            setDriveData({ company: '', role: '', description: '', eligibility: '', driveDate: '', salary: '', applyLink: '' });
            setEditingPlacement(null);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving placement drive');
        }
    };

    const handleDeletePlacement = async (id) => {
        if (window.confirm('Are you sure you want to delete this placement drive?')) {
            try {
                await api.delete(`/placements/${id}`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.message || 'Error deleting placement drive');
            }
        }
    };

    // --- Resource Handlers ---
    const openResourceModal = (resource = null) => {
        if (resource) {
            setEditingResource(resource);
            setResourceData({ ...resource });
        } else {
            setEditingResource(null);
            setResourceData({ title: '', description: '', information: '', icon: 'BookOpen', link: '' });
        }
        setShowResourceModal(true);
    };

    const handleResourceSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingResource) {
                await api.put(`/placements/resources/${editingResource._id}`, resourceData);
            } else {
                await api.post('/placements/resources', resourceData);
            }
            setShowResourceModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving resource');
        }
    };

    const handleDeleteResource = async (id) => {
        if (window.confirm('Delete this resource?')) {
            try {
                await api.delete(`/placements/resources/${id}`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.message || 'Error deleting resource');
            }
        }
    };

    if (loading) return <div className="text-center py-10">Loading...</div>;

    return (
        <div className="space-y-12">
            {/* Header Section */}
            <div className="text-center space-y-4 py-8">
                <h1 className="text-4xl font-bold text-gray-900">Placement & Internship Zone</h1>
                <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                    Your comprehensive resource center for career preparation and placement success.
                </p>
            </div>

            {/* Resources Grid section */}
            <section className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Preparation Resources</h2>
                    {canCreate && (
                        <button
                            onClick={() => openResourceModal()}
                            className="flex items-center space-x-2 bg-secondary hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors shadow-sm opacity-90 hover:opacity-100"
                        >
                            <Plus size={18} />
                            <span>Add Resource</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {resources.map((resource) => {
                        const IconComponent = iconMap[resource.icon] || BookOpen;
                        return (
                            <div
                                key={resource._id}
                                onClick={() => setViewingResource(resource)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative group cursor-pointer hover:border-secondary/30"
                            >
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-600">
                                        <IconComponent size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">{resource.title}</h3>
                                            {resource.link && (
                                                <ExternalLink size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                        {/* Description visible on card */}
                                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{resource.description}</p>
                                    </div>
                                </div>

                                {/* Admin Controls */}
                                {canCreate && (
                                    <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-lg">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openResourceModal(resource);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-secondary rounded-md hover:bg-white transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteResource(resource._id);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Upcoming Drives Section */}
            <section className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl p-8 border border-gray-200">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Upcoming Placement Drives</h2>
                    {canCreate && (
                        <button
                            onClick={() => openDriveModal()}
                            className="bg-secondary hover:bg-accent text-white px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium flex items-center"
                        >
                            <Plus size={16} className="mr-2" />
                            Post Drive
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {placements.length > 0 ? (
                        placements.map((placement) => (
                            <div key={placement._id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-gray-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative group">
                                <div className="space-y-1 w-full">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-bold text-gray-900">{placement.company}</h3>
                                        {canCreate && (
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openDriveModal(placement)}
                                                    className="p-1.5 text-gray-400 hover:text-secondary rounded-md hover:bg-gray-50 transition-colors"
                                                    title="Edit Drive"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePlacement(placement._id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                                                    title="Delete Drive"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-600 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Briefcase size={16} className="text-secondary" />
                                            <span className="font-medium text-gray-900">Role:</span>
                                            <span>{placement.role}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <DollarSign size={16} className="text-secondary" />
                                            <span className="font-medium text-gray-900">CTC:</span>
                                            <span>{placement.salary ? `${placement.salary} LPA` : 'Disclosed Later'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={16} className="text-secondary" />
                                            <span className="font-medium text-gray-900">Date of Visiting:</span>
                                            <span>{new Date(placement.driveDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    {placement.description && (
                                        <div className="text-gray-600 text-sm mt-3 whitespace-pre-line leading-relaxed border-t border-gray-100 pt-3">
                                            {placement.description}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <span className="hidden md:inline-block px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded-full border border-gray-100 font-medium">
                                        Eligibility: {placement.eligibility}
                                    </span>
                                    {placement.applyLink ? (
                                        <a
                                            href={placement.applyLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full md:w-auto text-center px-5 py-2.5 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-accent transition-colors shadow-sm"
                                        >
                                            View Details
                                        </a>
                                    ) : (
                                        <button disabled className="w-full md:w-auto px-5 py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">
                                            Closed
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            No upcoming placement drives scheduled.
                        </div>
                    )}
                </div>
            </section>

            {/* --- Modals --- */}

            {/* Create/Edit Resource Modal */}
            {showResourceModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingResource ? 'Edit Resource' : 'Add New Resource'}
                            </h2>
                            <button onClick={() => setShowResourceModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleResourceSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none transition-all text-black"
                                    value={resourceData.title}
                                    onChange={(e) => setResourceData({ ...resourceData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Visible on Card)</label>
                                <textarea
                                    required
                                    rows="2"
                                    className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none transition-all text-black"
                                    value={resourceData.description}
                                    onChange={(e) => setResourceData({ ...resourceData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Information (Visible in Detail View)</label>
                                <textarea
                                    rows="4"
                                    className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none transition-all text-black"
                                    value={resourceData.information}
                                    onChange={(e) => setResourceData({ ...resourceData, information: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none transition-all text-black"
                                        value={resourceData.link}
                                        onChange={(e) => setResourceData({ ...resourceData, link: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                                    <select
                                        className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none transition-all text-black"
                                        value={resourceData.icon}
                                        onChange={(e) => setResourceData({ ...resourceData, icon: e.target.value })}
                                    >
                                        {Object.keys(iconMap).map(iconName => (
                                            <option key={iconName} value={iconName}>{iconName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-secondary hover:bg-accent text-white py-2.5 rounded-lg font-medium transition-colors mt-2">
                                {editingResource ? 'Update Resource' : 'Add Resource'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* View Resource Details Modal */}
            {viewingResource && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                    {(() => {
                                        const IconComponent = iconMap[viewingResource.icon] || BookOpen;
                                        return <IconComponent size={24} />;
                                    })()}
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">{viewingResource.title}</h2>
                            </div>
                            <button onClick={() => setViewingResource(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="prose prose-sm max-w-none">
                                <p className="text-gray-700 whitespace-pre-line leading-relaxed text-base">
                                    {viewingResource.information || viewingResource.description}
                                </p>
                            </div>

                            {viewingResource.link && (
                                <div className="pt-4 border-t border-gray-100 flex justify-end">
                                    <a
                                        href={viewingResource.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 bg-secondary text-white px-6 py-2.5 rounded-lg hover:bg-accent transition-colors font-medium"
                                    >
                                        <span>Visit Resource</span>
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Drive Modal (Existing reused) */}
            {showDriveModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingPlacement ? 'Edit Placement Drive' : 'Post Placement Drive'}
                            </h2>
                            <button onClick={() => setShowDriveModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleDriveSubmit} className="space-y-4">
                            {/* ... Drive Form Fields ... */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none text-black"
                                        value={driveData.company}
                                        onChange={(e) => setDriveData({ ...driveData, company: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none text-black"
                                        value={driveData.role}
                                        onChange={(e) => setDriveData({ ...driveData, role: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    required
                                    rows="3"
                                    className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none text-black"
                                    value={driveData.description}
                                    onChange={(e) => setDriveData({ ...driveData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none text-black"
                                        value={driveData.eligibility}
                                        onChange={(e) => setDriveData({ ...driveData, eligibility: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Salary (CTC)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none text-black"
                                        value={driveData.salary}
                                        onChange={(e) => setDriveData({ ...driveData, salary: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Drive Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none text-black"
                                        value={driveData.driveDate}
                                        onChange={(e) => setDriveData({ ...driveData, driveDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apply Link</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-gray-300 bg-gray-50 p-2.5 focus:ring-2 focus:ring-secondary outline-none text-black"
                                        value={driveData.applyLink}
                                        onChange={(e) => setDriveData({ ...driveData, applyLink: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full px-4 py-2.5 bg-secondary hover:bg-accent text-white rounded-lg transition-colors font-medium mt-4"
                            >
                                {editingPlacement ? 'Update Drive' : 'Post Drive'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Placements;

