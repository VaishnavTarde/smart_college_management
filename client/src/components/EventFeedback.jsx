import React, { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import api from '../services/api';

const EventFeedback = ({ eventId }) => {
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReviews();
    }, [eventId]);

    const fetchReviews = async () => {
        try {
            const res = await api.get(`/feedback/event/${eventId}`);
            if (res.data.success) {
                setReviews(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post(`/feedback/submit`, { 
                eventId,
                eventName: "Campus Event",
                rating, 
                message: comment 
            });
            if (res.data.success) {
                setReviews([res.data.data, ...reviews]);
                setComment('');
                setRating(0);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error submitting review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-8 pt-8 border-t border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Star className="text-yellow-500 fill-current" /> Event Feedback
            </h3>

            {/* Review Form */}
            <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-xl mb-8">
                <h4 className="font-semibold text-gray-700 mb-3">Leave a Review</h4>

                <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="bg-transparent border-none p-0 focus:outline-none transition-transform hover:scale-110"
                        >
                            <Star
                                size={24}
                                className={`${(hoverRating || rating) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                        </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-500 font-medium">
                        {hoverRating || rating ? `${hoverRating || rating} Stars` : 'Rate this event'}
                    </span>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your experience..."
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-secondary/50 outline-none"
                        required
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-secondary text-white px-4 py-2 rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        {submitting ? 'Posting...' : 'Post'}
                    </button>
                </div>
                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </form>

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <p className="text-gray-500 italic">No reviews yet. Be the first!</p>
                ) : (
                    reviews.map((review) => (
                        <div key={review._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="font-semibold text-gray-800">{review.userName || review.studentName || 'Anonymous'}</div>
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={14}
                                                className={`${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-gray-600 text-sm">{review.comment || review.message}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EventFeedback;
