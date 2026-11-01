import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Clubs from './pages/Clubs';
import ClubDetails from './pages/ClubDetails';
import ClubMembers from './pages/ClubMembers';
import ClubActivitiesPage from './pages/ClubActivitiesPage';
import Events from './pages/Events';
import Calendar from './pages/Calendar';
import Placements from './pages/Placements';
import EventGallery from './pages/EventGallery';
import Profile from './pages/Profile';
import PageTransition from './components/PageTransition';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Chatbot from './components/Chatbot';
import SearchModal from './components/SearchModal';
import Community from './pages/Community';
import FeedbackForm from './pages/FeedbackForm';
import FeedbackAnalytics from './pages/FeedbackAnalytics';
import RegistrationManagement from './pages/RegistrationManagement';
import StudyPlannerPro from './pages/StudyPlannerPro';

// Separate component to handle internal routing logic (needs useLocation)
const AnimatedRoutes = ({ user, setUser }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login setUser={setUser} /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard user={user} /></PageTransition>} />
        <Route path="/clubs" element={<PageTransition><Clubs /></PageTransition>} />
        <Route path="/clubs/:id" element={<PageTransition><ClubDetails /></PageTransition>} />
        <Route path="/clubs/:id/members" element={<PageTransition><ClubMembers /></PageTransition>} />
        <Route path="/clubs/:id/activities" element={<PageTransition><ClubActivitiesPage /></PageTransition>} />
        <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
        <Route path="/gallery" element={<PageTransition><EventGallery /></PageTransition>} />
        <Route path="/placements" element={<PageTransition><Placements /></PageTransition>} />
        <Route path="/calendar" element={<PageTransition><Calendar /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile user={user} setUser={setUser} /></PageTransition>} />
        <Route path="/community" element={<PageTransition><Community /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password/:token" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/feedback" element={<PageTransition><FeedbackForm /></PageTransition>} />
        <Route path="/admin/analytics" element={<PageTransition><FeedbackAnalytics /></PageTransition>} />
        <Route path="/admin/registrations" element={<PageTransition><RegistrationManagement /></PageTransition>} />
        <Route path="/study-planner" element={<PageTransition><StudyPlannerPro /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

import Footer from './components/Footer';

const AppContent = ({ user, setUser }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 transition-colors duration-300 flex flex-col">
      <Navbar user={user} setUser={setUser} />
      <SearchModal />
      <div className="flex-grow">
        <AnimatedRoutes user={user} setUser={setUser} />
      </div>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <Chatbot />}
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      <AppContent user={user} setUser={setUser} />
    </Router>
  );
}

export default App;
