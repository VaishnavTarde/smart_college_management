import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User as UserIcon, Search, ChevronDown, Image, MessageSquare, BarChart2, ClipboardList, BookOpen } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

// ─── NavLink helper — highlights active route ─────────────────
const NavLink = ({ to, children, onClick }) => {
    const { pathname } = useLocation();
    const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`relative px-1 py-1 text-sm font-semibold transition-colors duration-200 whitespace-nowrap group
                ${isActive ? 'text-accent' : 'text-black hover:text-accent'}`}
        >
            {children}
            {/* Active underline bar */}
            <span
                className={`absolute -bottom-[22px] left-0 w-full h-[3px] rounded-t-full bg-accent transition-all duration-200
                    ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0 group-hover:opacity-60 group-hover:scale-x-100'}`}
            />
        </Link>
    );
};

// ─── Main Navbar ──────────────────────────────────────────────
const Navbar = () => {
    const [mobileOpen, setMobileOpen]   = useState(false);
    const [dropdownOpen, setDropdown]   = useState(false);
    const dropdownRef                   = useRef(null);
    const navigate                      = useNavigate();
    const { pathname }                  = useLocation();

    const user = JSON.parse(localStorage.getItem('user'));
    const isPrivileged = user && (user.role === 'teacher' || user.role === 'admin');
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
        setDropdown(false);
    }, [pathname]);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // Items that go inside the "More" dropdown
    const moreItems = [
        { to: '/community',            label: 'Community',     icon: <MessageSquare size={15} />, always: true },
        { to: '/gallery',              label: 'Gallery',       icon: <Image size={15} />,        always: true },
        { to: '/feedback',             label: 'Feedback',      icon: <MessageSquare size={15} />, always: true },
        { to: '/admin/analytics',      label: 'Analytics',     icon: <BarChart2 size={15} />,     always: false },
        { to: '/admin/registrations',  label: 'Registrations', icon: <ClipboardList size={15} />, always: false },
    ].filter(item => item.always || isPrivileged);

    // Is the current page one of the "More" pages?
    const moreActive = moreItems.some(item =>
        item.to === pathname || (item.to !== '/' && pathname.startsWith(item.to))
    );

    if (isAuthPage) {
        return (
            <nav className="bg-primary shadow-md sticky top-0 z-50">
                <div className="w-full px-4 sm:px-6">
                    <div className="flex items-center justify-center h-[62px]">
                        <Link to="/" className="flex items-center">
                            <span className="text-2xl font-extrabold text-black tracking-tight hover:text-accent transition-colors duration-200 whitespace-nowrap">
                                Campus Connect
                            </span>
                        </Link>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className="bg-primary shadow-md sticky top-0 z-50">
            <div className="w-full px-4 sm:px-6">
                <div className="flex items-center h-[62px]">

                    {/* ── Logo ─────────────────────────────────────── */}
                    <div className="flex-shrink-0" style={{minWidth: '210px'}}>
                        <Link to="/" className="flex items-center">
                            <span className="text-2xl font-extrabold text-black tracking-tight hover:text-accent transition-colors duration-200 whitespace-nowrap">
                                Campus Connect
                            </span>
                        </Link>
                    </div>

                    {/* ── Desktop Nav Links ─────────────────────────── */}
                    <div className="hidden lg:flex items-center gap-5 xl:gap-7 flex-1 justify-center">
                        <NavLink to="/">Home</NavLink>
                        <NavLink to="/events">Events</NavLink>
                        <NavLink to="/clubs">Clubs</NavLink>
                        <NavLink to="/calendar">Calendar</NavLink>
                        <NavLink to="/placements">Placements</NavLink>
                        <NavLink to="/study-planner">Study Planner</NavLink>

                        {/* ── More Dropdown ──────────────────────────── */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdown(v => !v)}
                                className={`flex items-center gap-1 px-1 py-1 text-sm font-semibold transition-colors duration-200 focus:outline-none
                                    ${moreActive ? 'text-accent' : 'text-black hover:text-accent'}`}
                            >
                                More
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                                />
                                {/* underline for active more item */}
                                {moreActive && (
                                    <span className="absolute -bottom-[22px] left-0 w-full h-[3px] rounded-t-full bg-accent" />
                                )}
                            </button>

                            {/* Dropdown panel */}
                            <div
                                className={`absolute top-[calc(100%+14px)] left-0 min-w-[190px] bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50
                                    transition-all duration-200 origin-top-left
                                    ${dropdownOpen
                                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                                        : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
                            >
                                {moreItems.map(item => {
                                    const isActive = item.to === pathname || (item.to !== '/' && pathname.startsWith(item.to));
                                    return (
                                        <Link
                                            key={item.to}
                                            to={item.to}
                                            onClick={() => setDropdown(false)}
                                            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 mx-1 rounded-xl
                                                ${isActive
                                                    ? 'bg-accent/10 text-accent font-semibold'
                                                    : 'text-gray-700 hover:bg-gray-50 hover:text-accent'}`}
                                        >
                                            <span className={`${isActive ? 'text-accent' : 'text-gray-400'}`}>
                                                {item.icon}
                                            </span>
                                            {item.label}
                                            {isActive && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Search button (after links) ──────────── */}
                        <button
                            onClick={() => window.dispatchEvent(new Event('open-search'))}
                            className="ml-2 p-2 text-black hover:text-accent hover:bg-black/5 rounded-full transition-all duration-200 flex-shrink-0"
                            title="Search (Cmd+K)"
                        >
                            <Search size={18} />
                        </button>
                    </div>

                    {/* ── Right: User section ───────────────────────── */}
                    <div className="hidden md:flex items-center justify-end gap-2" style={{minWidth: '210px'}}>
                        {user ? (
                            <div className="flex items-center gap-2">
                                <NotificationCenter />
                                <div className="flex items-center gap-3 pl-3 border-l-2 border-gray-200">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-black font-semibold uppercase tracking-widest leading-none">Hello,</span>
                                        <span className="text-sm font-extrabold text-black leading-snug">{user.name ? user.name.split(' ')[0] : ''}</span>
                                    </div>
                                    <Link
                                        to="/profile"
                                        className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full transition-all shadow-sm"
                                        title="Profile"
                                    >
                                        <UserIcon size={18} className="text-black" />
                                    </Link>
                                    <button
                                        onClick={logout}
                                        className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all font-bold text-xs shadow-md tracking-wide"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/login" className="text-sm text-black hover:text-accent font-bold transition-colors">
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="bg-black hover:bg-gray-800 text-white px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-200"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* ── Mobile hamburger ──────────────────────────── */}
                    <div className="lg:hidden flex items-center ml-auto gap-2">
                        {/* Search on mobile */}
                        <button
                            onClick={() => window.dispatchEvent(new Event('open-search'))}
                            className="p-2 text-black hover:text-accent hover:bg-black/5 rounded-full transition-all"
                            title="Search"
                        >
                            <Search size={18} />
                        </button>
                        {user && <NotificationCenter />}
                        <button
                            onClick={() => setMobileOpen(v => !v)}
                            className="p-2 text-black hover:text-accent transition-colors focus:outline-none"
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Mobile Menu ───────────────────────────────────── */}
            <div
                className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-200/60
                    ${mobileOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="bg-white/95 backdrop-blur-sm px-4 py-3 space-y-1">

                    {/* Main links */}
                    {[
                        { to: '/',              label: 'Home' },
                        { to: '/events',        label: 'Events' },
                        { to: '/clubs',         label: 'Clubs' },
                        { to: '/calendar',      label: 'Calendar' },
                        { to: '/placements',    label: 'Placements' },
                        { to: '/study-planner', label: 'Study Planner' },
                    ].map(({ to, label }) => {
                        const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
                        return (
                            <Link
                                key={to}
                                to={to}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150
                                    ${isActive ? 'bg-accent/10 text-accent' : 'text-gray-700 hover:bg-gray-100 hover:text-accent'}`}
                            >
                                {label}
                                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                            </Link>
                        );
                    })}

                    {/* More section divider */}
                    <div className="pt-1 pb-0.5">
                        <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">More</p>
                    </div>

                    {/* More items */}
                    {moreItems.map(item => {
                        const isActive = item.to === pathname || (item.to !== '/' && pathname.startsWith(item.to));
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-150
                                    ${isActive ? 'bg-accent/10 text-accent' : 'text-gray-600 hover:bg-gray-100 hover:text-accent'}`}
                            >
                                <span className={`${isActive ? 'text-accent' : 'text-gray-400'}`}>{item.icon}</span>
                                {item.label}
                                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                            </Link>
                        );
                    })}

                    {/* Auth section */}
                    <div className="border-t border-gray-100 pt-3 mt-2">
                        {user ? (
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <UserIcon size={16} className="text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium leading-none">Logged in as</p>
                                        <p className="text-sm font-bold text-gray-800 leading-snug">{user.name?.split(' ')[0]}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        to="/profile"
                                        onClick={() => setMobileOpen(false)}
                                        className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50"
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        onClick={() => { setMobileOpen(false); logout(); }}
                                        className="px-3 py-1.5 text-xs font-bold bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 px-2">
                                <Link
                                    to="/login"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex-1 text-center py-2.5 text-sm font-semibold border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex-1 text-center py-2.5 text-sm font-bold bg-black text-white rounded-xl hover:bg-gray-800"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
