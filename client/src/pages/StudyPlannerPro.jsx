import React, { useState, useEffect, useRef } from 'react';
import { generatePlan, getMyPlan, analyzeDocuments, analyzePYQ } from '../services/studyPlannerService';
import {
    Brain, FileText, FileSearch, Calendar, Loader, FilePlus, X,
    CheckCircle, AlertCircle, BookOpen, Clock, Target, TrendingUp,
    ChevronDown, ChevronUp, Star, Zap, BarChart2, FileQuestion,
    MessageSquare, Send, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';

// ── Shared: Tab Button ───────────────────────────────────────────
const TabButton = ({ icon, label, badge, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 w-full text-left font-medium text-sm
            ${isActive ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
    >
        <div className={`${isActive ? 'text-white' : 'text-slate-500'}`}>
            {React.cloneElement(icon, { size: 18 })}
        </div>
        <span className="hidden md:block flex-1">{label}</span>
        {badge && <span className={`hidden md:block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>{badge}</span>}
    </button>
);

// ── Shared: Alert Banner ─────────────────────────────────────────
const Alert = ({ type, message }) => (
    <div className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium mb-6 border
        ${type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
        {type === 'error' ? <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" /> : <CheckCircle size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />}
        <span className="leading-relaxed">{message}</span>
    </div>
);

// ── Shared: Loading Overlay ──────────────────────────────────────
const AnalyzingOverlay = ({ steps, currentStep }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center gap-6 shadow-sm mx-auto max-w-lg">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
            <Loader className="animate-spin text-slate-900" size={32} />
        </div>
        <div className="text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-1">{steps[currentStep]}</h3>
            <p className="text-sm text-slate-500 mb-6">Processing your request...</p>
        </div>
        <div className="w-full space-y-2">
            {steps.map((step, i) => (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${i === currentStep ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-500'}`}>
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {i < currentStep ? <CheckCircle size={16} className="text-emerald-600" /> : 
                         i === currentStep ? <div className="w-2 h-2 bg-slate-900 rounded-full animate-pulse"></div> : 
                         <div className="w-2 h-2 bg-slate-300 rounded-full"></div>}
                    </div>
                    <span className="text-sm">{step}</span>
                </div>
            ))}
        </div>
    </div>
);

// ── Shared: File Dropzone ────────────────────────────────────────
const FileDropzone = ({ files, setFiles, maxFiles = 10, accept = '.pdf,.docx,.txt' }) => {
    const inputRef = useRef();

    const handleDrop = (e) => {
        e.preventDefault();
        const dropped = Array.from(e.dataTransfer?.files || e.target.files);
        if (files.length + dropped.length > maxFiles) {
            alert(`Maximum ${maxFiles} files allowed.`); return;
        }
        setFiles(prev => [...prev, ...dropped]);
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer border border-dashed border-slate-300 rounded-xl h-40 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors"
            >
                <FilePlus size={28} className="text-slate-400 mb-3" />
                <p className="font-medium text-slate-900 text-sm">Upload Files</p>
                <p className="text-xs text-slate-500 mt-1">{accept} • Max {maxFiles}</p>
                <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={handleDrop} />
            </div>

            {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {files.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white text-xs font-medium text-slate-700 py-1.5 px-3 rounded-lg border border-slate-200 shadow-sm">
                            <FileText size={14} className="text-slate-400" />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                                className="text-slate-400 hover:text-red-600 hover:bg-slate-50 p-0.5 rounded"><X size={14} /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Priority Badge ───────────────────────────────────────────────
const PriorityBadge = ({ priority }) => {
    const colors = { High: 'bg-red-50 text-red-700 border-red-200', Medium: 'bg-amber-50 text-amber-700 border-amber-200', Low: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return <span className={`text-[11px] uppercase tracking-wide font-bold px-2 py-0.5 rounded border ${colors[priority] || colors.Low}`}>{priority}</span>;
};

// ════════════════════════════════════════════════════════════════
//  MAIN PAGE LAYOUT
// ════════════════════════════════════════════════════════════════
const StudyPlannerPro = () => {
    const [activeTab, setActiveTab] = useState('planner');

    return (
        <div className="min-h-screen bg-white flex text-slate-900 font-sans border-t border-slate-200">
            {/* Sidebar */}
            <div className="w-16 md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col items-center md:items-start py-6 flex-shrink-0 print:hidden">
                <div className="hidden md:flex items-center gap-3 px-6 mb-8 w-full">
                    <div className="p-2 bg-slate-900 text-white rounded-lg">
                        <Brain size={20} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold leading-tight">Study Pro</h1>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">Workspace</p>
                    </div>
                </div>

                <nav className="w-full flex md:flex-col gap-1.5 px-4 flex-col items-center md:items-stretch">
                    <TabButton icon={<Calendar />} label="Study Schedule" badge="AI" isActive={activeTab === 'planner'} onClick={() => setActiveTab('planner')} />
                    <TabButton icon={<BookOpen />} label="Doc Analysis" isActive={activeTab === 'docs'} onClick={() => setActiveTab('docs')} />
                    <TabButton icon={<FileSearch />} label="PYQ Matrix" isActive={activeTab === 'pyq'} onClick={() => setActiveTab('pyq')} />
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-white print:overflow-visible print:bg-white print:block">
                <div className="max-w-5xl mx-auto p-6 md:p-12 print:p-0 print:max-w-none">
                    <AnimatePresence mode="wait">
                        {activeTab === 'planner' && <TimetablePlanner key="planner" />}
                        {activeTab === 'docs'    && <DocumentAnalyzer key="docs" />}
                        {activeTab === 'pyq'     && <PYQAnalyzer key="pyq" />}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
//  MODULE 1: TIMETABLE PLANNER
// ════════════════════════════════════════════════════════════════
const TimetablePlanner = () => {
    const [loading, setLoading]   = useState(false);
    const [fetching, setFetching] = useState(true);
    const [plan, setPlan]         = useState(null);
    const [error, setError]       = useState('');
    const [form, setForm]         = useState({ subjects: '', weakSubjects: '', examDate: '', hoursPerDay: 4, preferredTime: 'Anytime' });
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        getMyPlan().then(res => { 
            if (res.success && res.plan) {
                setPlan(res.plan); 
            }
        }).catch(() => {}).finally(() => setFetching(false));
    }, []);

    const getDayDate = (idx, totalDays, examDate) => {
        if (!examDate) return null;
        const exam = new Date(examDate);
        // We want the last day (totalDays) to be the day before the exam
        // So Day 1 is idx=0, Day totalDays is idx = totalDays - 1
        // Day totalDays = exam - 1 day
        // Day 1 = exam - totalDays days
        const targetDate = new Date(exam);
        targetDate.setDate(exam.getDate() - (totalDays - idx));
        return targetDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            // Calculate daysLeft locally to ensure it starts from the user's TODAY
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const examDt = new Date(form.examDate);
            examDt.setHours(0, 0, 0, 0);
            const diffTime = examDt - today;
            const daysLeft = Math.max(2, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            const payload = { 
                ...form, 
                daysLeft,
                todayStr,
                subjects: form.subjects.split(',').map(s => s.trim()), 
                weakSubjects: form.weakSubjects ? form.weakSubjects.split(',').map(s => s.trim()) : [] 
            };
            
            const res = await generatePlan(payload);
            if (res.success) setPlan(res.plan);
            else setError(res.message || 'Failed to generate plan');
        } catch (err) {
            setError(err.message || 'Server error. Please try again.');
        } finally { setLoading(false); }
    };

    const handleDownloadPDF = () => {
        setIsDownloading(true);
        setTimeout(() => {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            let y = 20;
            const x = 20;

            // ── Styling Helpers ──
            const addFooter = () => {
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(148, 163, 184); // slate-400
                    doc.text('Generated by Campus Connect AI Study Planner', x, 287);
                    doc.text(`Page ${i} of ${pageCount}`, 170, 287);
                }
            };

            const addTitle = (text, size = 14) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFontSize(size);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42); // slate-900
                doc.text(text, x, y);
                y += 2;
                doc.setDrawColor(99, 102, 241); // indigo-500
                doc.setLineWidth(0.5);
                doc.line(x, y, x + 20, y);
                y += 6;
            };

            const addBody = (text, isBullet = false) => {
                if (!text) return;
                let cleanText = String(text).replace(/[\r\n]+/g, ' ').replace(/[^\x00-\x7F]/g, '');
                const lines = doc.splitTextToSize(cleanText, isBullet ? 160 : 170);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105); // slate-600
                lines.forEach((line, i) => {
                    if (y > 275) { doc.addPage(); y = 20; }
                    doc.text(isBullet && i === 0 ? `•  ${line}` : (isBullet ? `    ${line}` : line), isBullet ? x + 5 : x, y);
                    y += 6;
                });
            };

            // ── PDF Composition ──
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, 210, 35, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('CAMPUS CONNECT', 20, 18);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text('AI STUDY PLANNER PRO', 20, 26);
            
            y = 50;

            // Active Strategy
            addTitle('ACTIVE STRATEGY & NOTES');
            if (plan.planData.countdownNotes) addBody(plan.planData.countdownNotes);
            if (plan.planData.weeklyOverview) { y+=2; addBody(plan.planData.weeklyOverview); }
            y += 10;

            // Daily Routine (Time Slots)
            if (plan.planData.dailyRoutine) {
                addTitle('DAILY TIME SLOTS & ROUTINE');
                ['Morning', 'Afternoon', 'Evening', 'Night'].forEach(shift => {
                    const textVal = plan.planData.dailyRoutine[shift.toLowerCase()];
                    if (textVal) {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(10);
                        doc.setTextColor(79, 70, 229); // indigo-600
                        doc.text(shift.toUpperCase(), x, y);
                        y += 6;
                        
                        if (typeof textVal === 'string') {
                            const pts = textVal.split(/(?:\.\s+|\n|- )/).map(p => p.replace(/^\W+/, '').trim()).filter(Boolean);
                            pts.forEach(p => addBody(p, true));
                        } else {
                            addBody(textVal, true);
                        }
                        y += 4;
                    }
                });
                y += 8;
            }

            // Timeline
            if (plan.planData.dayWisePlan?.length) {
                doc.addPage();
                y = 25; 
                
                doc.setFillColor(248, 250, 252); // slate-50 box
                doc.rect(x - 5, y - 8, 180, 14, 'F');
                addTitle('DAY-BY-DAY TIMELINE', 16);
                y += 6;
                
                plan.planData.dayWisePlan.forEach((day, idx) => {
                    if (y > 250) { doc.addPage(); y = 20; }
                    const dateStr = getDayDate(idx, plan.planData.dayWisePlan.length, plan.examDate);
                    const dayLabel = `DAY ${idx + 1} (${dateStr})`;
                    
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.setTextColor(15, 23, 42); // slate-900
                    doc.text(dayLabel, x, y);
                    
                    if (day.subject) {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(9);
                        doc.setTextColor(79, 70, 229); // indigo-600
                        // Increase gap to 8mm to avoid overlap
                        doc.text(`|  ${day.subject.toUpperCase()}`, x + doc.getTextWidth(dayLabel) + 8, y);
                    }
                    y += 8;
                    
                    if (day.tasks && day.tasks.length) {
                        day.tasks.forEach(t => addBody(t, true));
                    }
                    y += 4;
                    
                    // Separator Line
                    doc.setDrawColor(241, 245, 249); // slate-100
                    doc.setLineWidth(0.2);
                    doc.line(x, y-2, 190, y-2);
                    y += 8;
                });
            }

            addFooter();
            doc.save(`CampusConnect_StudyPlan_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
            setIsDownloading(false);
        }, 50);
    };



    if (fetching) return (
        <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
            <Loader className="animate-spin text-slate-400" size={24} />
            <p className="text-sm font-medium text-slate-500">Loading your schedule...</p>
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 print:space-y-0 print:m-0 print:block">
            <div className="mb-6 print:hidden">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Study Schedule</h2>
                <ul className="text-sm text-slate-500 list-disc ml-4 space-y-1">
                    <li>Configure parameters (subjects, exam date)</li>
                    <li>Generate day-by-day learning schedule</li>
                </ul>
            </div>

            {error && <Alert type="error" message={error} />}

            {!plan ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-3xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Target Subjects <span className="text-red-500">*</span></label>
                                <input required value={form.subjects} onChange={e => setForm({ ...form, subjects: e.target.value })}
                                    placeholder="Database Management, Data Structures, Algorithms" 
                                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" />
                                <p className="text-[11px] text-slate-500 mt-1.5">Comma separated</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Weak Subjects</label>
                                <input value={form.weakSubjects} onChange={e => setForm({ ...form, weakSubjects: e.target.value })}
                                    placeholder="Algorithms" 
                                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Preferred Shift</label>
                                <div className="relative">
                                    <select value={form.preferredTime} onChange={e => setForm({ ...form, preferredTime: e.target.value })}
                                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow appearance-none">
                                        <option>Anytime</option><option>Early Morning</option><option>Afternoon</option><option>Late Night</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Exam Date <span className="text-red-500">*</span></label>
                                <input required type="date" value={form.examDate} onChange={e => setForm({ ...form, examDate: e.target.value })}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Hours Per Day <span className="text-red-500">*</span></label>
                                <input required type="number" min="1" max="16" value={form.hoursPerDay} onChange={e => setForm({ ...form, hoursPerDay: parseInt(e.target.value) })}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button disabled={loading} type="submit"
                                className="bg-slate-900 text-white font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                                {loading ? <><Loader className="animate-spin" size={16} /> Generating...</> : 'Generate Schedule'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-6 print:space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm print:hidden">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5 block">Status</span>
                            <h2 className="text-sm font-bold text-slate-900">Plan Generated Successfully</h2>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex-1 md:flex-none flex justify-center items-center gap-2 text-xs font-bold bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap">
                                {isDownloading ? <Loader className="animate-spin" size={14} /> : <Download size={14} />} Download PDF
                            </button>
                            <button onClick={() => setPlan(null)} className="flex-1 md:flex-none text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap">Edit Parameters</button>
                        </div>
                    </div>

                    {/* PDF Content Area */}
                    <div className="space-y-6 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm relative print:border-none print:p-0 print:shadow-none print:m-0">
                        {/* Strategy Banner */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 print:bg-white print:border-b">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Active Strategy</span>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">{plan.planData.countdownNotes}</h2>
                            {plan.planData.weeklyOverview && <p className="text-sm text-slate-600">{plan.planData.weeklyOverview}</p>}
                        </div>

                        {/* Daily Routine */}
                        {plan.planData.dailyRoutine && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-2">
                                {[['Morning', plan.planData.dailyRoutine.morning], ['Afternoon', plan.planData.dailyRoutine.afternoon], ['Evening', plan.planData.dailyRoutine.evening], ['Night', plan.planData.dailyRoutine.night]].map(([label, val]) => (
                                    <div key={label} className="bg-slate-50 border border-slate-200 p-5 rounded-xl">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</p>
                                        <ul className="text-[13px] font-medium text-slate-800 list-disc ml-4 space-y-1.5 leading-relaxed">
                                            {typeof val === 'string' ? val.split(/(?:\.\s+|\n|- )/).map(pt => pt.replace(/^\W+/, '').trim()).filter(Boolean).map((pt, i) => (
                                                <li key={i}>{pt}</li>
                                            )) : <li>{val}</li>}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Priority + Revision */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                            <div className="bg-white border border-slate-200 p-6 rounded-xl">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">High Priority Focus</h3>
                                <ul className="space-y-3">
                                    {plan.planData.priorityTopics?.map((t, i) => (
                                        <li key={i} className="flex gap-3 items-start text-sm text-slate-700">
                                            <div className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">{i+1}</div>
                                            <span className="leading-relaxed">{t}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-xl">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Revision Iterations</h3>
                                <ul className="space-y-3">
                                    {plan.planData.revisionSchedule?.map((t, i) => (
                                        <li key={i} className="flex gap-3 items-start text-sm text-slate-700">
                                            <div className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] flex-shrink-0">R</div>
                                            <span className="leading-relaxed">{t}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Day-by-Day */}
                        <div className="pt-4 page-break-before">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Timeline</h3>
                            <div className="space-y-4">
                                {plan.planData.dayWisePlan?.map((day, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-5 rounded-xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid">
                                        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Day</span>
                                            <span className="text-sm font-black text-slate-900">{idx + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className="font-bold text-[13px] text-slate-900">
                                                    Day {idx + 1} ({getDayDate(idx, plan.planData.dayWisePlan.length, plan.examDate)})
                                                </span>
                                                {day.subject && <span className="text-[9px] font-bold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 tracking-wide">{day.subject}</span>}
                                            </div>
                                            <ul className="space-y-2">
                                                {day.tasks?.map((t, i) => (
                                                    <li key={i} className="text-[13px] text-slate-600 flex gap-2.5 items-start leading-relaxed">
                                                        <div className="w-1 h-1 rounded-full bg-slate-300 mt-2 flex-shrink-0"></div>
                                                        <span>{t}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

// ════════════════════════════════════════════════════════════════
//  MODULE 2: DOCUMENT ANALYZER
// ════════════════════════════════════════════════════════════════
const DocumentAnalyzer = () => {
    const [files, setFiles]       = useState([]);
    const [loading, setLoading]   = useState(false);
    const [step, setStep]         = useState(0);
    const [result, setResult]     = useState(null);
    const [error, setError]       = useState('');
    const [customQ, setCustomQ]   = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    const STEPS = ['Initializing readers', 'Extracting plain text', 'Running analysis inference', 'Generating summary'];

    const handleAnalyze = async () => {
        if (!files.length) return;
        setLoading(true); setError(''); setStep(0);
        const interval = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 1800);
        try {
            const res = await analyzeDocuments(files, customQ);
            clearInterval(interval);
            if (res.success) setResult(res.analysis);
            else setError(res.message || 'Analysis failed');
        } catch (err) {
            clearInterval(interval);
            setError(err.message || 'Analysis failed');
        } finally { setLoading(false); }
    };

    const handleDownloadDocPDF = () => {
        setIsDownloading(true);
        setTimeout(() => {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            let y = 20;
            const x = 20;

            // ── Styling Helpers ──
            const addTitle = (text, size = 12) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFontSize(size);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42); // slate-900
                doc.text(text.toUpperCase(), x, y);
                y += 7;
            };

            const addBody = (text, isBullet = false) => {
                if (!text) return;
                let cleanText = String(text).replace(/[\r\n]+/g, ' ').replace(/[^\x00-\x7F]/g, '');
                const lines = doc.splitTextToSize(cleanText, isBullet ? 160 : 170);
                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105); // slate-600
                lines.forEach((line, i) => {
                    if (y > 280) { doc.addPage(); y = 20; }
                    doc.text(isBullet && i === 0 ? `•  ${line}` : (isBullet ? `    ${line}` : line), isBullet ? x + 5 : x, y);
                    y += 5.5;
                });
            };

            const addPointList = (items) => {
                if (!items || !Array.isArray(items)) {
                    if (items) addBody(items);
                    return;
                }
                items.forEach(item => addBody(item, true));
            };

            // ── PDF Composition ──
            // Header
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, 210, 32, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('DOCUMENT ANALYSIS REPORT', 20, 21);
            
            y = 45;

            // Topic Hierarchy
            if (result.topicPriority?.length > 0) {
                addTitle('TOPIC HIERARCHY & PRIORITY');
                result.topicPriority.forEach(tp => {
                    const text = `${tp.topic} [Priority: ${tp.priority}]`;
                    addBody(text, true);
                });
                y += 8;
            }

            // Core Concepts
            if (result.importantTopics?.length > 0) {
                addTitle('CORE CONCEPTS & KEYWORDS');
                addPointList(result.importantTopics);
                y += 8;
            }

            // Summaries
            if (result.summaries?.length > 0) {
                addTitle('CHAPTER SUMMARIES');
                result.summaries.forEach((s, i) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(99, 102, 241);
                    doc.text(s.title.toUpperCase(), x, y);
                    y += 6;
                    addBody(s.summary);
                    y += 4;
                });
                y += 6;
            }

            // Fact Sheet
            if (result.quickNotes?.length > 0) {
                addTitle('FACT SHEET & QUICK NOTES');
                addPointList(result.quickNotes);
                y += 8;
            }

            // Custom Answer
            if (result.customAnswer) {
                doc.addPage();
                y = 20;
                addTitle('AI TARGETED QUERY RESPONSE');
                addPointList(result.customAnswer.split('\n'));
            }

            doc.save('Document_Analysis_Report.pdf');
            setIsDownloading(false);
        }, 50);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Document Analysis</h2>
                <ul className="text-sm text-slate-500 list-disc ml-4 space-y-1">
                    <li>Upload study materials</li>
                    <li>Extract priorities, summaries, and core concepts automatically</li>
                </ul>
            </div>

            {error && <Alert type="error" message={error} />}

            {!result ? (
                loading ? <AnalyzingOverlay steps={STEPS} currentStep={step} /> : (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-3xl">
                        <FileDropzone files={files} setFiles={setFiles} maxFiles={10} />
                        
                        <div className="mt-6 border-t border-slate-100 pt-6">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Custom Query (Optional)</label>
                            <input value={customQ} onChange={e => setCustomQ(e.target.value)}
                                placeholder="Explain the primary concept of chapter 2"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-colors" />
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-500">{files.length} / 10 documents prepared</p>
                            <button disabled={!files.length} onClick={handleAnalyze}
                                className="bg-slate-900 text-white font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">
                                Run Analysis
                            </button>
                        </div>
                    </div>
                )
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                                <CheckCircle size={14} /> Complete
                            </span>
                            <button onClick={handleDownloadDocPDF} disabled={isDownloading} className="flex items-center gap-2 text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                                {isDownloading ? <Loader className="animate-spin" size={12} /> : <Download size={12} />} Download Analysis
                            </button>
                            {result.aiPowered && <span className="text-[10px] font-bold tracking-wide uppercase text-slate-500 border border-slate-200 bg-white px-2 py-0.5 rounded">AI Generated</span>}
                        </div>
                        <button onClick={() => { setResult(null); setFiles([]); }} className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline">
                            Reset & Upload New
                        </button>
                    </div>

                    {result.customAnswer && (
                        <div className="bg-slate-900 text-slate-50 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><MessageSquare size={14} /> AI Response</h3>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.customAnswer}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 p-6 rounded-xl">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Topic Hierarchy</h3>
                            <div className="space-y-2">
                                {result.topicPriority?.map((tp, i) => (
                                    <div key={i} className="flex justify-between items-center py-1">
                                        <span className="text-sm font-medium text-slate-700">{tp.topic}</span>
                                        <PriorityBadge priority={tp.priority} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 p-6 rounded-xl">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Core Concepts</h3>
                            <div className="flex flex-wrap gap-2">
                                {result.importantTopics?.map((t, i) => (
                                    <span key={i} className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-6 rounded-xl">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Content Summaries</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {result.summaries?.map((s, i) => (
                                <div key={i}>
                                    <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase">{s.title}</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">{s.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-6 rounded-xl">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Fact Sheet & Short Notes</h3>
                        <ul className="space-y-3">
                            {result.quickNotes?.map((n, i) => (
                                <li key={i} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{n}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

// ════════════════════════════════════════════════════════════════
//  MODULE 3: PYQ ANALYZER
// ════════════════════════════════════════════════════════════════
const PYQAnalyzer = () => {
    const [files, setFiles]     = useState([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep]       = useState(0);
    const [result, setResult]   = useState(null);
    const [error, setError]     = useState('');
    const [customQ, setCustomQ] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    const STEPS = ['Parsing past papers', 'Extracting question structures', 'Correlating metadata', 'Building insight reports'];

    const handleAnalyze = async () => {
        if (!files.length) return;
        setLoading(true); setError(''); setStep(0);
        const interval = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 1800);
        try {
            const res = await analyzePYQ(files, customQ);
            clearInterval(interval);
            if (res.success) setResult(res.analysis);
            else setError(res.message || 'Analysis failed');
        } catch (err) {
            clearInterval(interval);
            setError(err.message || 'Analysis failed');
        } finally { setLoading(false); }
    };

    const handleDownloadPYQPDF = () => {
        setIsDownloading(true);
        setTimeout(() => {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            let y = 20;
            const x = 20;

            // ── Styling Helpers ──
            const addTitle = (text, size = 12) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFontSize(size);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42); // slate-900
                doc.text(text.toUpperCase(), x, y);
                y += 7;
            };

            const addBody = (text, isBullet = false) => {
                if (!text) return;
                let cleanText = String(text).replace(/[\r\n]+/g, ' ').replace(/[^\x00-\x7F]/g, '');
                const lines = doc.splitTextToSize(cleanText, isBullet ? 160 : 170);
                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105); // slate-600
                lines.forEach((line, i) => {
                    if (y > 280) { doc.addPage(); y = 20; }
                    doc.text(isBullet && i === 0 ? `•  ${line}` : (isBullet ? `    ${line}` : line), isBullet ? x + 5 : x, y);
                    y += 5.5;
                });
            };

            const addPointList = (items) => {
                if (!items || !Array.isArray(items)) {
                    if (items) addBody(items);
                    return;
                }
                items.forEach(item => addBody(item, true));
            };

            // ── PDF Composition ──
            // Header
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, 210, 32, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('PYQ DIAGNOSTIC REPORT', 20, 21);
            
            y = 45;

            // Diagnostic Snapshot Stats
            if (result.diagnosticSnapshot) {
                doc.setFillColor(248, 250, 252); // slate-50
                doc.rect(x - 2, y - 5, 174, 15, 'F');
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.rect(x - 2, y - 5, 174, 15, 'S');

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(100, 116, 139); // slate-500
                doc.text('QUICK SNAPSHOT:', x, y + 4);
                
                doc.setTextColor(15, 23, 42);
                doc.text(`Total Qs found: ${result.diagnosticSnapshot.totalUniqueQuestions || 'N/A'}`, x + 40, y + 4);
                doc.text(`Repeated Qs: ${result.diagnosticSnapshot.repeatedQuestionsCount || '0'}`, x + 90, y + 4);
                doc.text(`Confidence: ${result.diagnosticSnapshot.confidenceScore || 'High'}`, x + 135, y + 4);
                y += 20;
            }

            // Trends (Pointwise)
            addTitle('CORE MACRO TRENDS');
            addPointList(result.topicTrends);
            y += 8;

            // Repeated Questions
            if (result.repeatedQuestions?.length > 0) {
                addTitle('HIGH RECURRENCE PATTERNS');
                result.repeatedQuestions.forEach((r, i) => {
                    const qText = `${r.question} [Repetitions: ${r.repetitions}] ${r.marks && r.marks !== 'N/A' ? `(${r.marks})` : ''}`;
                    addBody(qText, true);
                });
                y += 8;
            }

            // Target Questions
            if (result.importantQuestions?.length > 0) {
                addTitle('PRIORITY TARGET QUESTIONS');
                result.importantQuestions.forEach((q, i) => {
                    const qData = typeof q === 'string' ? q : `${q.question} ${q.marks && q.marks !== 'N/A' ? `(${q.marks})` : ''}`;
                    addBody(qData, true);
                });
                y += 10;
            }

            // Chapter-wise Distribution
            if (result.chapterWisePatterns?.length > 0) {
                if (y > 230) { doc.addPage(); y = 25; }
                addTitle('CHAPTER-WISE MODEL ANALYSIS');
                result.chapterWisePatterns.forEach(ch => {
                    if (y > 260) { doc.addPage(); y = 25; }
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(99, 102, 241); // indigo-500
                    doc.text(ch.chapter.toUpperCase(), x, y);
                    y += 6;
                    addPointList(ch.pattern);
                    y += 4;
                });
            }

            doc.save('PYQ_Diagnostic_Report.pdf');
            setIsDownloading(false);
        }, 50);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Past Paper Diagnostics</h2>
                <ul className="text-sm text-slate-500 list-disc ml-4 space-y-1">
                    <li>Upload legacy question papers</li>
                    <li>Identify recurring questions, topics, and structures</li>
                </ul>
            </div>

            {error && <Alert type="error" message={error} />}

            {!result ? (
                loading ? <AnalyzingOverlay steps={STEPS} currentStep={step} /> : (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-3xl">
                        <FileDropzone files={files} setFiles={setFiles} maxFiles={10} accept=".pdf,.docx,.txt" />
                        
                        <div className="mt-6 border-t border-slate-100 pt-6">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Specific Lookup (Optional)</label>
                            <input value={customQ} onChange={e => setCustomQ(e.target.value)}
                                placeholder="Find 10-mark questions from Unit 3"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-colors" />
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-500">{files.length} / 10 papers queued</p>
                            <button disabled={!files.length} onClick={handleAnalyze}
                                className="bg-slate-900 text-white font-medium text-sm px-6 py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">
                                Execute Diagnostics
                            </button>
                        </div>
                    </div>
                )
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                                <CheckCircle size={14} /> Report Generated
                            </span>
                            <button onClick={handleDownloadPYQPDF} disabled={isDownloading} className="flex items-center gap-2 text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                                {isDownloading ? <Loader className="animate-spin" size={12} /> : <Download size={12} />} Download Report
                            </button>
                        </div>
                        <button onClick={() => { setResult(null); setFiles([]); }} className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline">
                            Analyze Another Batch
                        </button>
                    </div>

                    {result.customAnswer && (
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">Query Result</h3>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{result.customAnswer}</p>
                        </div>
                    )}

                    {result.diagnosticSnapshot && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Found</span>
                                <span className="text-xl font-black text-slate-900">{result.diagnosticSnapshot.totalUniqueQuestions || 'N/A'}</span>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Repeated</span>
                                <span className="text-xl font-black text-emerald-600">{result.diagnosticSnapshot.repeatedQuestionsCount || '0'}</span>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confidence</span>
                                <span className="text-xl font-black text-indigo-600">{result.diagnosticSnapshot.confidenceScore || 'High'}</span>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900 text-slate-50 p-6 rounded-xl">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Macro Trends</h3>
                        <ul className="space-y-3">
                            {Array.isArray(result.topicTrends) ? (
                                result.topicTrends.map((t, i) => (
                                    <li key={i} className="text-sm leading-relaxed flex gap-3 text-slate-200">
                                        <div className="w-1 h-1 rounded-full bg-slate-500 mt-2 flex-shrink-0"></div>
                                        <span>{t}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-sm leading-relaxed text-slate-200">{result.topicTrends}</li>
                            )}
                        </ul>
                    </div>

                    {result.repeatedQuestions?.length > 0 && (
                        <div className="bg-white border border-slate-200 p-6 rounded-xl">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">High Recurrence Questions</h3>
                            <div className="space-y-3">
                                {result.repeatedQuestions.map((r, i) => (
                                    <div key={i} className="flex gap-4 items-center p-3 rounded-lg border border-slate-100 bg-slate-50">
                                        <div className="bg-red-100 text-red-700 border border-red-200 w-8 h-8 flex items-center justify-center font-bold rounded text-xs flex-shrink-0">
                                            {r.repetitions}×
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800 leading-relaxed">{r.question}</p>
                                            {r.marks && r.marks !== 'N/A' && <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">{r.marks}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 p-6 rounded-xl">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Target Problem Sets</h3>
                            <ul className="space-y-3">
                                {result.importantQuestions?.map((q, i) => (
                                    <li key={i} className="text-sm text-slate-700 flex flex-col items-start gap-1 p-3 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="flex gap-3 items-start">
                                            <span className="text-slate-400 font-bold text-[10px] mt-0.5 w-4">Q{i+1}</span>
                                            <span className="leading-relaxed">{typeof q === 'string' ? q : q.question}</span>
                                        </div>
                                        {typeof q !== 'string' && q.marks && q.marks !== 'N/A' && (
                                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded ml-7">{q.marks}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 p-6 rounded-xl">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Distribution Analysis</h3>
                                <ul className="space-y-2">
                                    {result.frequentlyAskedTopics?.map((t, i) => (
                                        <li key={i} className="text-sm text-slate-700 border border-slate-100 bg-slate-50 px-3 py-2 rounded">{t}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white border border-slate-200 p-6 rounded-xl">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Chapter Models</h3>
                                <div className="space-y-4">
                                    {result.chapterWisePatterns?.map((ch, i) => (
                                        <div key={i} className="border-b border-slate-50 pb-3 last:border-0">
                                            <h4 className="text-[11px] font-bold text-slate-900 mb-2">{ch.chapter}</h4>
                                            <ul className="space-y-1.5">
                                                {Array.isArray(ch.pattern) ? (
                                                    ch.pattern.map((p, j) => (
                                                        <li key={j} className="text-[13px] text-slate-600 flex gap-2 leading-relaxed italic">
                                                            <span className="text-slate-300">•</span>
                                                            {p}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="text-[13px] text-slate-600 italic leading-relaxed">{ch.pattern}</li>
                                                )}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default StudyPlannerPro;
