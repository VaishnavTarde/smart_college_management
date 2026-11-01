import React from 'react';
import { ArrowRight, BookOpen, Calendar, Users, Briefcase, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import ImageSlider from '../components/ImageSlider';

const Home = () => {
    return (
        <div className="space-y-16 pb-12">
            {/* Hero Section */}
            <section className="relative -mt-8 py-20 lg:py-32 bg-primary overflow-hidden rounded-b-3xl shadow-sm border-b border-gray-100">
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
                        Welcome to <span className="text-secondary">Campus Connect Hub</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                        Your all-in-one platform for managing academic life, clubs, events, and placements seamlessly.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a href="http://moodle.mitaoe.ac.in/login/" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-secondary hover:bg-accent text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                            <BookOpen size={24} />
                            MOODLE
                        </a>
                        <a href="https://mitaoe.mastersofterp.in/iitmsv4eGq0RuNHb0G5WbhLmTKLmTO7YBcJ4RHuXxCNPvuIw=?enc=EGbCGWnlHNJ/WdgJnKH8DA==" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white text-secondary border border-secondary hover:bg-secondary hover:text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                            <Briefcase size={24} />
                            ERP Portal
                        </a>
                        <a href="https://share.google/liLgd9M0r8NQ5CfTm" target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white text-accent border border-accent hover:bg-accent hover:text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                            <Terminal size={24} />
                            CodeTantra
                        </a>
                    </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0 opacity-30 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                </div>
            </section>

            {/* Image Slider Section */}
            <ImageSlider />

            {/* Features Section */}
            <section className="container mx-auto px-4 mt-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
                    <div className="w-24 h-1 bg-secondary mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Feature 1: Clubs */}
                    <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-t-4 border-t-secondary border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 bg-secondary/10 rounded-bl-2xl">
                            <Users className="text-secondary" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-4 group-hover:text-secondary transition-colors">Clubs & Communities</h3>
                        <p className="text-gray-600 mb-6">Explore diverse student clubs, join communities that match your interests, and participate in exciting activities.</p>
                        <Link to="/clubs" className="inline-flex items-center text-secondary font-semibold hover:tracking-wide transition-all">
                            Explore Clubs <ArrowRight size={18} className="ml-2" />
                        </Link>
                    </div>

                    {/* Feature 2: Events */}
                    <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-t-4 border-t-accent border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 bg-accent/10 rounded-bl-2xl">
                            <Calendar className="text-accent" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-4 group-hover:text-accent transition-colors">Events & Workshops</h3>
                        <p className="text-gray-600 mb-6">Stay updated with the latest events, hackathons, and workshops happening around the campus.</p>
                        <Link to="/events" className="inline-flex items-center text-accent font-semibold hover:tracking-wide transition-all">
                            View Calendar <ArrowRight size={18} className="ml-2" />
                        </Link>
                    </div>

                    {/* Feature 3: Placements */}
                    <div className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-t-4 border-t-secondary border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 bg-secondary/10 rounded-bl-2xl">
                            <Briefcase className="text-secondary" size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-4 group-hover:text-secondary transition-colors">Placement Updates</h3>
                        <p className="text-gray-600 mb-6">Prepare for your future career with placement resources, drive updates, and internship opportunities.</p>
                        <Link to="/placements" className="inline-flex items-center text-secondary font-semibold hover:tracking-wide transition-all">
                            Check Drives <ArrowRight size={18} className="ml-2" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
