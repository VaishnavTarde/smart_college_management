import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin, MapPin, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-gradient-to-b from-gray-900 to-black border-t-4 border-secondary text-gray-300 pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    {/* Brand Section */}
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white">College Portal</h3>
                        <p className="text-gray-400 max-w-xs leading-relaxed">
                            Your gateway to academic excellence and campus life
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Instagram size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Linkedin size={20} /></a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white">Quick Links</h3>
                        <ul className="space-y-4">
                            <li>
                                <Link to="/" className="text-gray-400 hover:text-secondary transition-colors">About Us</Link>
                            </li>
                            <li>
                                <Link to="/" className="text-gray-400 hover:text-secondary transition-colors">Academics</Link>
                            </li>
                            <li>
                                <Link to="/" className="text-gray-400 hover:text-secondary transition-colors">Admissions</Link>
                            </li>
                            <li>
                                <Link to="/" className="text-gray-400 hover:text-secondary transition-colors">Campus Life</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white">Contact</h3>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3 text-gray-400">
                                <MapPin size={20} className="mt-1 shrink-0 text-secondary" />
                                <span>
                                    MIT Academy Of Engineering, Alandi<br />
                                    Pune 412105
                                </span>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-400">
                                <Phone size={20} className="shrink-0 text-secondary" />
                                <span>+1 (555) 123-4567</span>
                            </div>
                            <div className="flex items-center space-x-3 text-gray-400">
                                <Mail size={20} className="shrink-0 text-secondary" />
                                <span>mitaoe.ac.in@gmail.com</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
                    © 2024 College Portal. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
