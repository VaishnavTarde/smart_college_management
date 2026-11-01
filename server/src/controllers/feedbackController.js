const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const { GoogleGenAI } = require('@google/genai');

// ─────────────────────────────────────────────────
// @desc    Submit feedback for an event
// @route   POST /api/feedback/submit
// @access  Public (optional auth — student name auto-filled if logged in)
// ─────────────────────────────────────────────────
exports.submitFeedback = async (req, res) => {
    try {
        const { eventId, eventName, rating, message, studentName } = req.body;

        // Validation
        if (!eventId) return res.status(400).json({ success: false, message: 'Event ID is required' });
        if (!eventName) return res.status(400).json({ success: false, message: 'Event name is required' });
        if (!rating) return res.status(400).json({ success: false, message: 'Rating is required' });
        if (!message || message.trim().length === 0) return res.status(400).json({ success: false, message: 'Feedback message is required' });

        // Verify event exists
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        // Build feedback doc
        const feedbackData = {
            eventId,
            eventName: eventName || event.title,
            rating: Number(rating),
            message: message.trim(),
            studentName: studentName?.trim() || 'Anonymous',
        };

        // If user is authenticated, attach their ID
        if (req.user) {
            feedbackData.studentId = req.user._id;
            if (!studentName) feedbackData.studentName = req.user.name;
        }

        const feedback = await Feedback.create(feedbackData);

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback,
        });
    } catch (error) {
        console.error('[FeedbackController] submitFeedback Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Get all feedback (across all events)
// @route   GET /api/feedback/all
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.getAllFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find()
            .populate('eventId', 'title date venue')
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: feedback.length,
            data: feedback,
        });
    } catch (error) {
        console.error('[FeedbackController] getAllFeedback Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Get feedback for a specific event
// @route   GET /api/feedback/event/:eventId
// @access  Public
// ─────────────────────────────────────────────────
exports.getFeedbackByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        const feedback = await Feedback.find({ eventId })
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        // Calculate average rating
        const avgRating =
            feedback.length > 0
                ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
                : 0;

        res.status(200).json({
            success: true,
            count: feedback.length,
            averageRating: Number(avgRating),
            data: feedback,
        });
    } catch (error) {
        console.error('[FeedbackController] getFeedbackByEvent Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Delete a feedback entry
// @route   DELETE /api/feedback/:id
// @access  Private (admin only)
// ─────────────────────────────────────────────────
exports.deleteFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        await Feedback.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Feedback deleted successfully',
        });
    } catch (error) {
        console.error('[FeedbackController] deleteFeedback Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────
// @desc    Get AI-powered sentiment analytics for an event
// @route   GET /api/feedback/analytics/:eventId
// @access  Private (teacher/admin)
// ─────────────────────────────────────────────────
exports.getEventAnalytics = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Fetch all feedback for this event
        const feedbackList = await Feedback.find({ eventId }).sort({ createdAt: -1 });

        if (feedbackList.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No feedback found for this event',
                analytics: {
                    totalResponses: 0,
                    averageRating: 0,
                    positivePercent: 0,
                    neutralPercent: 0,
                    negativePercent: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    summary: 'No feedback has been submitted for this event yet.',
                    likedPoints: [],
                    complaints: [],
                    suggestions: [],
                    recurringTopics: [],
                },
            });
        }

        // ── Calculate basic statistics ──────────────────────────────
        const totalResponses = feedbackList.length;
        const avgRating = (
            feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalResponses
        ).toFixed(2);

        // Rating distribution (1–5)
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        feedbackList.forEach((f) => {
            ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1;
        });

        // ── AI Sentiment Analysis via Gemini ────────────────────────
        if (!process.env.GEMINI_API_KEY) {
            // Graceful fallback without AI
            const positive = feedbackList.filter((f) => f.rating >= 4).length;
            const neutral = feedbackList.filter((f) => f.rating === 3).length;
            const negative = feedbackList.filter((f) => f.rating <= 2).length;

            return res.status(200).json({
                success: true,
                analytics: {
                    totalResponses,
                    averageRating: Number(avgRating),
                    positivePercent: Math.round((positive / totalResponses) * 100),
                    neutralPercent: Math.round((neutral / totalResponses) * 100),
                    negativePercent: Math.round((negative / totalResponses) * 100),
                    ratingDistribution,
                    summary: 'AI analysis unavailable (GEMINI_API_KEY not configured). Showing rating-based breakdown.',
                    likedPoints: [],
                    complaints: [],
                    suggestions: [],
                    recurringTopics: [],
                },
            });
        }

        // Format feedback messages for the prompt
        const formattedFeedback = feedbackList
            .map((f, i) => `[${i + 1}] Rating: ${f.rating}/5 | Message: "${f.message}"`)
            .join('\n');

        // Build Gemini prompt
        const prompt = `You are an expert academic event feedback analyst. Analyze the following student feedback for a college event and return a structured JSON response.

STUDENT FEEDBACK:
${formattedFeedback}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanations outside the JSON.

Return exactly this JSON structure:
{
  "positivePercent": <number 0-100>,
  "neutralPercent": <number 0-100>,
  "negativePercent": <number 0-100>,
  "summary": "<2-3 sentence overall summary of the event feedback>",
  "likedPoints": ["<specific thing students liked>", "<another liked point>"],
  "complaints": ["<specific complaint>", "<another complaint if any>"],
  "suggestions": ["<specific suggestion>", "<another suggestion if any>"],
  "recurringTopics": ["<topic that appeared multiple times>", "<another recurring topic>"],
  "sentimentLabels": ["<Positive|Neutral|Negative for feedback 1>", "<for feedback 2>", ...]
}

Rules:
- positivePercent + neutralPercent + negativePercent must equal 100
- sentimentLabels array must have exactly ${totalResponses} items, one per feedback in order
- likedPoints, complaints, suggestions: 2-5 items each (omit array if none)
- recurringTopics: 2-4 most common themes across all feedback
- Be specific and concise — reference actual feedback content`;

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const rawText = response.text?.trim() || '';

        // Parse AI response
        let aiData;
        try {
            // Strip markdown code fences if Gemini wraps response in ```json ... ```
            const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
            aiData = JSON.parse(cleaned);
        } catch (parseError) {
            console.error('[FeedbackController] AI JSON parse failed:', parseError.message);
            // Fallback to rating-based calculation
            const positive = feedbackList.filter((f) => f.rating >= 4).length;
            const neutral = feedbackList.filter((f) => f.rating === 3).length;
            const negative = feedbackList.filter((f) => f.rating <= 2).length;
            aiData = {
                positivePercent: Math.round((positive / totalResponses) * 100),
                neutralPercent: Math.round((neutral / totalResponses) * 100),
                negativePercent: Math.round((negative / totalResponses) * 100),
                summary: 'AI response parsing failed. Showing rating-based breakdown.',
                likedPoints: [],
                complaints: [],
                suggestions: [],
                recurringTopics: [],
                sentimentLabels: [],
            };
        }

        // Update sentimentLabel on each feedback doc (background — non-blocking)
        if (Array.isArray(aiData.sentimentLabels) && aiData.sentimentLabels.length === totalResponses) {
            const validLabels = ['Positive', 'Neutral', 'Negative'];
            feedbackList.forEach((feedback, idx) => {
                const label = aiData.sentimentLabels[idx];
                if (validLabels.includes(label) && feedback.sentimentLabel !== label) {
                    Feedback.findByIdAndUpdate(feedback._id, { sentimentLabel: label }).catch(() => {});
                }
            });
        }

        res.status(200).json({
            success: true,
            analytics: {
                totalResponses,
                averageRating: Number(avgRating),
                positivePercent: Number(aiData.positivePercent) || 0,
                neutralPercent: Number(aiData.neutralPercent) || 0,
                negativePercent: Number(aiData.negativePercent) || 0,
                ratingDistribution,
                summary: aiData.summary || 'Analysis complete.',
                likedPoints: Array.isArray(aiData.likedPoints) ? aiData.likedPoints : [],
                complaints: Array.isArray(aiData.complaints) ? aiData.complaints : [],
                suggestions: Array.isArray(aiData.suggestions) ? aiData.suggestions : [],
                recurringTopics: Array.isArray(aiData.recurringTopics) ? aiData.recurringTopics : [],
            },
        });
    } catch (error) {
        console.error('[FeedbackController] getEventAnalytics Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
