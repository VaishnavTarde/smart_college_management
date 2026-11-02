const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// CORS — open in production (Render handles network security)
// Allows all origins to prevent deploy health-check failures
app.use(cors({
    origin: true,
    credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
        const bodyStr = JSON.stringify(req.body, null, 2);
        if (bodyStr) {
            console.log('Body:', bodyStr.substring(0, 500));
        }
    }
    next();
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
const authRoutes = require('./src/routes/authRoutes');
const clubRoutes = require('./src/routes/clubRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const placementRoutes = require('./src/routes/placementRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const achievementRoutes = require('./src/routes/achievementRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/gallery', require('./src/routes/galleryRoutes'));
app.use('/api/discussions', require('./src/routes/discussionRoutes'));
app.use('/api/reviews', require('./src/routes/reviewRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/upload', require('./src/routes/uploadRoutes'));
app.use('/api/slider', require('./src/routes/sliderRoutes'));
app.use('/api/ai', require('./src/routes/aiRoutes'));
app.use('/api/feedback', require('./src/routes/feedbackRoutes'));
app.use('/api/registrations', require('./src/routes/registrationRoutes'));
app.use('/api/study-planner', require('./src/routes/studyPlannerRoutes'));
app.use('/api/achievements', achievementRoutes);

// Initialize Cron Jobs
const { setupCronJobs, checkMissedReminders } = require('./src/jobs/cronJobs');
setupCronJobs();
checkMissedReminders();

// Health check route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Campus Connect API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Routes: /api/auth, /api/clubs, /api/events, /api/placements, /api/gallery, /api/discussions, /api/feedback, /api/registrations');

    // Keep-Alive Self-Ping — prevents Render free tier spin-down
    // Pings own health route every 14 minutes
    const PING_URL = 'https://campus-connect-api-qnf4.onrender.com';
    if (process.env.NODE_ENV === 'production') {
        const https = require('https');
        setInterval(() => {
            https.get(PING_URL, (res) => {
                console.log(`[KeepAlive] Pinged — status: ${res.statusCode}`);
            }).on('error', (err) => {
                console.warn('[KeepAlive] Ping failed:', err.message);
            });
        }, 14 * 60 * 1000);
        console.log(`[KeepAlive] Self-ping active → ${PING_URL} every 14 min`);
    }
});
