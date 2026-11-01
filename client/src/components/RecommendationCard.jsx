import React from 'react';
import { Calendar, MapPin, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const RecommendationCard = ({ event }) => {
    // Generate a random match score between 85 and 99 for "AI" simulation
    const matchScore = Math.floor(Math.random() * (99 - 85 + 1)) + 85;

    return (
        <Link to={`/events`} className="block group">
            <div className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all transform hover:-translate-y-1 h-full flex flex-col">
                <div className="relative p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="bg-gradient-to-r from-secondary to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center shadow-sm">
                        <Sparkles size={12} className="mr-1" />
                        {matchScore}% Match
                    </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                    <div className="mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                            {event.category || 'Event'}
                        </span>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-secondary transition-colors">
                        {event.title}
                    </h3>

                    <div className="space-y-1 mt-auto text-sm text-gray-500">
                        <div className="flex items-center">
                            <Calendar size={14} className="mr-2" />
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPin size={14} className="mr-2" />
                            <span className="line-clamp-1">{event.venue}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default RecommendationCard;
