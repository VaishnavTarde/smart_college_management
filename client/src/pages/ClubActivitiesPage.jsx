import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Clock } from 'lucide-react';
import api from '../services/api';

const ClubActivitiesPage = () => {
    const { id } = useParams();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clubName, setClubName] = useState('Club');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch basic club info for breadcrumb
                const clubRes = await api.get(`/clubs/${id}`);
                setClubName(clubRes.data.data.name);

                // Fetch Activities
                const activitiesRes = await api.get(`/clubs/${id}/activities`);
                setActivities(activitiesRes.data.data);
            } catch (err) {
                console.error("Failed to load data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Loading activities...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <Link to={`/clubs/${id}`} className="inline-flex items-center text-gray-600 hover:text-secondary mb-8 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Back to {clubName}
                </Link>

                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Past Activity Highlights</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">Explore the history of events, workshops, and achievements by {clubName}.</p>
                </div>

                {activities.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {activities.map((activity, idx) => (
                            <div key={idx} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col md:flex-row gap-8">
                                {/* Image (Optional) */}
                                {activity.image && (
                                    <div className="w-full md:w-64 h-48 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden">
                                        <img src={activity.image} alt={activity.name} className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                            {activity.type || 'Event'}
                                        </span>
                                        <div className="flex items-center text-gray-500 text-sm">
                                            <Calendar size={14} className="mr-1" />
                                            {activity.date}
                                        </div>
                                    </div>

                                    <h2 className="text-2xl font-bold text-gray-900 mb-3">{activity.name}</h2>
                                    <p className="text-gray-600 leading-relaxed mb-4">
                                        {activity.summary}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <Clock size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Activities Yet</h3>
                        <p className="text-gray-500">This club hasn't documented any past activities yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClubActivitiesPage;
