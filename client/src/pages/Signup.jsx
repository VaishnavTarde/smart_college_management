import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import api from '../services/api';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [teacherCode, setTeacherCode] = useState('');
    const [teacherVerified, setTeacherVerified] = useState(false);
    const [codeError, setCodeError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleVerifyCode = async () => {
        if (!teacherCode) {
            setCodeError('Please enter the secret code');
            return;
        }
        setLoading(true);
        setCodeError('');
        try {
            const res = await api.post('/auth/verify-teacher-code', { secretCode: teacherCode });
            if (res.data.success) {
                setTeacherVerified(true);
            }
        } catch (err) {
            setCodeError(err.response?.data?.message || 'Invalid Secret Code');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            setLoading(false);
            return;
        }

        if (formData.role === 'student') {
            if (!formData.email.startsWith('20') || !formData.email.endsWith('@mitaoe.ac.in')) {
                setError('Only valid college email IDs are allowed');
                setLoading(false);
                return;
            }
        }

        if (!/^(?=.*[a-zA-Z])(?=.*\d).*$/.test(formData.password)) {
            setError('Password must contain at least one letter and one number');
            setLoading(false);
            return;
        }

        try {
            const res = await api.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                ...(formData.role === 'teacher' && { secretCode: teacherCode })
            });

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create Account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-secondary hover:text-accent">
                            Sign in
                        </Link>
                    </p>
                </div>
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>

                    {/* Role Selection */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                setFormData({ ...formData, role: 'student' });
                                setTeacherVerified(false);
                                setCodeError('');
                                setError('');
                            }}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${formData.role === 'student' ? 'border-secondary bg-secondary/10' : 'border-gray-200 hover:border-secondary/50'}`}
                        >
                            <GraduationCap className={`mb-2 ${formData.role === 'student' ? 'text-secondary' : 'text-gray-500'}`} size={24} />
                            <span className={`font-medium ${formData.role === 'student' ? 'text-secondary' : 'text-gray-500'}`}>Student</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFormData({ ...formData, role: 'teacher' });
                                setCodeError('');
                                setError('');
                            }}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${formData.role === 'teacher' ? 'border-secondary bg-secondary/10' : 'border-gray-200 hover:border-secondary/50'}`}
                        >
                            <BookOpen className={`mb-2 ${formData.role === 'teacher' ? 'text-secondary' : 'text-gray-500'}`} size={24} />
                            <span className={`font-medium ${formData.role === 'teacher' ? 'text-secondary' : 'text-gray-500'}`}>Teacher</span>
                        </button>
                    </div>

                    {formData.role === 'teacher' && !teacherVerified ? (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="teacherCode" className="block text-sm font-medium text-gray-700">
                                    Teacher Secret Code
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        name="teacherCode"
                                        id="teacherCode"
                                        className="focus:ring-secondary focus:border-secondary block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border"
                                        placeholder="Enter secret code"
                                        value={teacherCode}
                                        onChange={(e) => setTeacherCode(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleVerifyCode())}
                                    />
                                </div>
                                {codeError && <p className="mt-2 text-sm text-red-600 text-center">{codeError}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={handleVerifyCode}
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-secondary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="rounded-md shadow-sm -space-y-px">
                                <div className="relative">
                                    <User className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        className="appearance-none rounded-t-xl relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-secondary focus:border-secondary focus:z-10 sm:text-sm"
                                        placeholder="Full Name"
                                        value={formData.name}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="relative">
                                    <Mail className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        id="email-address"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-secondary focus:border-secondary focus:z-10 sm:text-sm"
                                        placeholder="Email address"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-secondary focus:border-secondary focus:z-10 sm:text-sm"
                                        placeholder="Password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute top-3 left-3 text-gray-400" size={20} />
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        className="appearance-none rounded-b-xl relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-secondary focus:border-secondary focus:z-10 sm:text-sm"
                                        placeholder="Confirm Password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
        
                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-secondary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                        <ArrowRight className="h-5 w-5 text-blue-200 group-hover:text-white" aria-hidden="true" />
                                    </span>
                                    {loading ? 'Creating account...' : 'Create Account'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Signup;
