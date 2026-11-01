import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import JSZip from 'jszip';
import { 
    Upload, 
    FileText, 
    Trophy, 
    Search, 
    Filter, 
    Download, 
    Trash2, 
    Eye, 
    CheckCircle2, 
    AlertCircle,
    Loader2,
    Settings,
    Layout,
    Type
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { generateCertificatePDF } from '../../utils/CertificateGenerator';
import mitLogoImg from '../../assets/mitaoe_logo.png';
import medalsImg from '../../assets/medals.png';

const CertificateSection = ({ clubId, clubName, clubLogo, initialCoordinator, canManage }) => {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRank, setFilterRank] = useState('all');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Customization State
    const [selectedTheme, setSelectedTheme] = useState('institutional');
    const [showSettings, setShowSettings] = useState(false);
    
    // Logos State (Base64)
    const [mitBase64, setMitBase64] = useState('');
    const [clubBase64, setClubBase64] = useState('');
    
    const [eventSettings, setEventSettings] = useState({
        mode: 'auto', // 'auto' or 'manual'
        manualName: '',
        manualDescription: ''
    });

    const [bulkLoading, setBulkLoading] = useState(false);
    const [badges, setBadges] = useState({ 1: '', 2: '', 3: '' });

    const [signatures, setSignatures] = useState([
        { id: 1, name: initialCoordinator || '', title: 'Faculty Coordinator', active: true },
        { id: 2, name: '', title: 'HOD', active: false },
        { id: 3, name: '', title: 'Director', active: false },
        { id: 4, name: '', title: 'Guest Lecture', active: false }
    ]);

    useEffect(() => {
        fetchAchievements();
        preloadLogos();
    }, [clubId]);

    const preloadLogos = async () => {
        const toBase64 = url => fetch(url)
            .then(response => response.blob())
            .then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }))
            .catch(() => '');

        // Preload MIT Logo (Local)
        const mit = await toBase64(mitLogoImg);
        setMitBase64(mit);

        // Preload Club Logo (External/Cloudinary)
        if (clubLogo) {
            const club = await toBase64(clubLogo);
            setClubBase64(club);
        }

        // Preload and Extract Medals
        const extractMedals = async (url) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    // The source image has 3 medals horizontally: 2 (left), 1 (center), 3 (right)
                    const w = img.width / 3;
                    const h = img.height;
                    
                    const crop = (idx) => {
                        canvas.width = w;
                        canvas.height = h;
                        let sx = 0;
                        if (idx === 1) sx = w;
                        else if (idx === 2) sx = 0;
                        else if (idx === 3) sx = w * 2;
                        
                        ctx.clearRect(0, 0, w, h);
                        ctx.drawImage(img, sx, 0, w, h, 0, 0, w, h);
                        return canvas.toDataURL('image/png');
                    };
                    
                    resolve({
                        1: crop(1),
                        2: crop(2),
                        3: crop(3)
                    });
                };
                img.src = url;
            });
        };
        try {
            const medals = await extractMedals(medalsImg);
            setBadges(medals);
        } catch (e) {
            console.error("Medal extraction failed", e);
        }
    };

    const fetchAchievements = async () => {
        try {
            const res = await api.get(`/achievements/club/${clubId}`);
            setAchievements(res.data.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching achievements:', err);
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                setUploading(true);
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Standardize keys (handling potential case sensitivity)
                const standardizedData = data.map(item => ({
                    studentName: item.Name || item.name || item.studentName,
                    studentEmail: item.Email || item.email || item.studentEmail,
                    department: item.Department || item.department || item.Dept,
                    year: item.Year || item.year,
                    eventName: item['Event Name'] || item.eventName || item.Event,
                    rank: item.Rank || item.rank || 'Participation'
                })).filter(item => item.studentName && item.studentEmail);

                if (standardizedData.length === 0) {
                    throw new Error("No valid data found in file. Ensure columns: Name, Email, Department, Year, Event Name, Rank");
                }

                // Send to backend
                await api.post('/achievements/upload', {
                    clubId,
                    achievements: standardizedData
                });

                setMessage({ type: 'success', text: `Successfully uploaded ${standardizedData.length} records!` });
                fetchAchievements();
            } catch (err) {
                console.error('Upload error:', err);
                setMessage({ type: 'error', text: err.message || 'Failed to process file' });
            } finally {
                setUploading(false);
                e.target.value = null; // Reset input
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this achievement record?")) return;
        try {
            await api.delete(`/achievements/${id}`);
            setAchievements(prev => prev.filter(a => a._id !== id));
            setMessage({ type: 'success', text: 'Record deleted' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete record' });
        }
    };

    const handleDownload = (achievement) => {
        // Filter active signatures and map to what generator expects
        const activeSignatures = signatures
            .filter(s => s.active && s.name.trim() !== '')
            .map(s => ({ name: s.name, title: s.title }));

        // Determine rank badge
        const r = achievement.rank.toString().toLowerCase();
        let rankBadge = '';
        if (r.includes('1')) rankBadge = badges[1];
        else if (r.includes('2')) rankBadge = badges[2];
        else if (r.includes('3')) rankBadge = badges[3];

        generateCertificatePDF({
            studentName: achievement.studentName,
            eventName: eventSettings.mode === 'manual' ? eventSettings.manualName : achievement.eventName,
            manualDescription: eventSettings.mode === 'manual' ? eventSettings.manualDescription : '',
            rank: achievement.rank,
            certificateId: achievement.certificateId,
            date: achievement.issuedAt,
            theme: selectedTheme,
            mitLogo: mitBase64,
            clubLogo: clubBase64,
            rankBadge: rankBadge,
            signatures: activeSignatures
        });
    };

    const handleDownloadAll = async () => {
        if (filteredAchievements.length === 0) return;
        
        try {
            setBulkLoading(true);
            const zip = new JSZip();
            
            // Map signatures once
            const activeSignatures = signatures
                .filter(s => s.active && s.name.trim() !== '')
                .map(s => ({ name: s.name, title: s.title }));
            
            for (const ach of filteredAchievements) {
                const r = ach.rank.toString().toLowerCase();
                let rankBadge = '';
                if (r.includes('1')) rankBadge = badges[1];
                else if (r.includes('2')) rankBadge = badges[2];
                else if (r.includes('3')) rankBadge = badges[3];
                
                const blob = await generateCertificatePDF({
                    studentName: ach.studentName,
                    eventName: eventSettings.mode === 'manual' ? eventSettings.manualName : ach.eventName,
                    manualDescription: eventSettings.mode === 'manual' ? eventSettings.manualDescription : '',
                    rank: ach.rank,
                    certificateId: ach.certificateId,
                    date: ach.issuedAt,
                    theme: selectedTheme,
                    mitLogo: mitBase64,
                    clubLogo: clubBase64,
                    rankBadge: rankBadge,
                    signatures: activeSignatures,
                    returnBlob: true
                });
                
                zip.file(`${ach.studentName.replace(/\s+/g, '_')}_Certificate.pdf`, blob);
            }
            
            const content = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${clubName.replace(/\s+/g, '_')}_Certificates.zip`;
            link.click();
            window.URL.revokeObjectURL(url);
            
            setMessage({ type: 'success', text: `Successfully generated ZIP with ${filteredAchievements.length} certificates.` });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to generate bulk ZIP' });
        } finally {
            setBulkLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("⚠️ CRITICAL: This will permanently delete ALL certificates in this dashboard. This action cannot be undone. Are you sure?")) return;
        
        try {
            setLoading(true);
            await api.delete(`/achievements/club/${clubId}`);
            setAchievements([]);
            setMessage({ type: 'success', text: 'All certificates cleared successfully!' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to clear dashboard' });
        } finally {
            setLoading(false);
        }
    };

    const toggleSignature = (id) => {
        setSignatures(signatures.map(s => s.id === id ? { ...s, active: !s.active } : s));
    };

    const updateSignature = (id, field, value) => {
        setSignatures(signatures.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const filteredAchievements = achievements.filter(a => {
        const matchesSearch = 
            a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            a.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRank = filterRank === 'all' || 
            (filterRank === 'prize' && ['1', '2', '3', '1st', '2nd', '3rd'].includes(a.rank.toString().toLowerCase())) ||
            (filterRank === 'participation' && !['1', '2', '3', '1st', '2nd', '3rd'].includes(a.rank.toString().toLowerCase()));
            
        return matchesSearch && matchesRank;
    });

    if (loading) return (
        <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-secondary" size={40} />
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Admin Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Achievements & Certificates
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage event participants and generate official certificates.</p>
                </div>

                <div className="flex items-center gap-3">
                    {canManage && (
                        <button 
                            onClick={handleDownloadAll}
                            disabled={bulkLoading || filteredAchievements.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm border bg-white text-secondary border-secondary/20 hover:bg-blue-50 shadow-sm disabled:opacity-50`}
                        >
                            {bulkLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {bulkLoading ? "Generating ZIP..." : `Download All (${filteredAchievements.length})`}
                        </button>
                    )}
                    {canManage && (
                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm border ${
                                showSettings 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-inner' 
                                : 'bg-white text-secondary border-secondary/20 hover:bg-blue-50 shadow-sm'
                            }`}
                        >
                            <Settings size={18} />
                            {showSettings ? "Close Designer" : "Customize Certificate"}
                        </button>
                    )}
                    {canManage && (
                        <button 
                            onClick={handleClearAll}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-all font-bold text-sm shadow-sm"
                        >
                            <Trash2 size={18} />
                            Clear Dashboard
                        </button>
                    )}
                    {canManage && (
                        <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl hover:bg-accent transition-all shadow-md cursor-pointer font-bold text-sm">
                            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            {uploading ? "Processing..." : "Upload CSV / Excel"}
                            <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    )}
                </div>
            </div>

            {/* Design & Signature Settings */}
            {canManage && showSettings && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gray-50 rounded-2xl p-6 border border-gray-200 overflow-hidden"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 1. Event Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                <Type size={16} className="text-indigo-500" /> Event Information
                            </h3>
                            
                            <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
                                <button
                                    onClick={() => setEventSettings({...eventSettings, mode: 'auto'})}
                                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${eventSettings.mode === 'auto' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Automatic (CSV)
                                </button>
                                <button
                                    onClick={() => setEventSettings({...eventSettings, mode: 'manual'})}
                                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${eventSettings.mode === 'manual' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Manual Override
                                </button>
                            </div>

                            {eventSettings.mode === 'manual' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Event Display Name</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. National Tech Symposium 2026"
                                            value={eventSettings.manualName}
                                            onChange={(e) => setEventSettings({...eventSettings, manualName: e.target.value})}
                                            className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Custom Description</label>
                                        <textarea 
                                            placeholder="e.g. for outstanding leadership and project execution..."
                                            rows={3}
                                            value={eventSettings.manualDescription}
                                            onChange={(e) => setEventSettings({...eventSettings, manualDescription: e.target.value})}
                                            className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                                        />
                                    </div>
                                </motion.div>
                            )}
                            
                            {eventSettings.mode === 'auto' && (
                                <div className="p-4 bg-white rounded-xl border border-dashed border-gray-200 text-center">
                                    <p className="text-[10px] text-gray-400">Pulls event and rank details directly from your uploaded CSV file.</p>
                                </div>
                            )}
                        </div>

                        {/* 2. Signature Configuration */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                <CheckCircle2 size={16} className="text-green-500" /> Signatures
                            </h3>
                            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {signatures.map((sig) => (
                                    <div key={sig.id} className={`p-3 rounded-xl border transition-all ${sig.active ? 'bg-white border-green-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={sig.active} 
                                                    onChange={() => toggleSignature(sig.id)}
                                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                />
                                                <span className="text-[10px] font-bold text-gray-700">{sig.active ? 'ACTIVE' : 'INACTIVE'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <input 
                                                type="text"
                                                placeholder="Name"
                                                disabled={!sig.active}
                                                value={sig.name}
                                                onChange={(e) => updateSignature(sig.id, 'name', e.target.value)}
                                                className="w-full text-[10px] p-2 rounded-lg border border-gray-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            />
                                            <input 
                                                type="text"
                                                placeholder="Designation"
                                                disabled={!sig.active}
                                                value={sig.title}
                                                onChange={(e) => updateSignature(sig.id, 'title', e.target.value)}
                                                className="w-full text-[10px] p-2 rounded-lg border border-gray-100 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Theme Selection & Preview */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                <Layout size={16} className="text-amber-500" /> Theme & Preview
                            </h3>
                            <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                                {['institutional', 'modern', 'classical'].map((theme) => (
                                    <button
                                        key={theme}
                                        onClick={() => setSelectedTheme(theme)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${selectedTheme === theme ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                                    >
                                        {theme}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="bg-slate-900 rounded-2xl p-5 shadow-xl relative group">
                                <div className={`aspect-[4/3] w-full rounded shadow-2xl relative overflow-hidden bg-white flex flex-col items-center justify-center ${
                                    selectedTheme === 'institutional' ? 'border-[3px] border-blue-900' : 
                                    selectedTheme === 'modern' ? 'border-[3px] border-indigo-500' : 'border-[3px] border-blue-400 bg-white'
                                }`}>
                                    <div className="absolute top-2 left-2 w-10 h-3 bg-indigo-100 rounded"></div>
                                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-100 rounded-full"></div>
                                    
                                    <div className="text-[10px] font-bold mt-2 tracking-tighter">CERTIFICATE</div>
                                    <div className="text-[5px] opacity-40 mb-3">OF PARTICIPATION</div>
                                    
                                    <div className="text-[12px] italic font-serif text-indigo-900">Student Name</div>
                                    
                                    <div className="w-2/3 h-0.5 bg-gray-50 mt-2"></div>
                                    <div className="w-1/2 h-0.2 bg-gray-50 mt-1"></div>

                                    <div className="absolute bottom-4 inset-x-0 flex justify-around px-2">
                                        {signatures.filter(s => s.active).map(s => <div key={s.id} className="w-8 h-px bg-gray-200"></div>)}
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                                    <div className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-indigo-700 shadow-lg">LIVE PREVIEW</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Notifications */}
            {message.text && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                >
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-medium">{message.text}</span>
                    <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto text-current opacity-50 hover:opacity-100">&times;</button>
                </motion.div>
            )}

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by student name, email, or event..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/50 outline-none transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/50 outline-none transition-all text-sm appearance-none"
                        value={filterRank}
                        onChange={(e) => setFilterRank(e.target.value)}
                    >
                        <option value="all">All Certificates</option>
                        <option value="prize">Prizes (1st, 2nd, 3rd)</option>
                        <option value="participation">Participation</option>
                    </select>
                </div>
            </div>

            {/* Achievements Table/Grid */}
            {filteredAchievements.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Event & Rank</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredAchievements.map((item) => (
                                <tr key={item._id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{item.studentName}</div>
                                        <div className="text-xs text-gray-500">{item.studentEmail}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-700">{item.department}</div>
                                        <div className="text-xs text-gray-500">{item.year}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-gray-800">{item.eventName}</div>
                                        <div className={`text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full ${
                                            ['1','2','3','1st','2nd','3rd'].includes(item.rank.toString().toLowerCase()) 
                                            ? 'bg-yellow-100 text-yellow-700' 
                                            : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {['1','2','3','1st','2nd','3rd'].includes(item.rank.toString().toLowerCase()) ? `${item.rank} Rank` : 'Participation'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleDownload(item)}
                                                className="p-2 text-secondary hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Download Certificate"
                                            >
                                                <Download size={18} />
                                            </button>
                                            {canManage && (
                                                <button 
                                                    onClick={() => handleDelete(item._id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="flex justify-center mb-4 text-gray-300">
                        <FileText size={64} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No Records Found</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2 text-sm">
                        {canManage 
                            ? "Start by uploading a CSV or Excel file with student achievement data." 
                            : "No achievements have been recorded for this club yet."}
                    </p>
                    {canManage && (
                        <div className="mt-8 p-4 bg-white rounded-xl border border-gray-100 max-w-lg mx-auto text-left shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Required CSV Columns:</h4>
                            <code className="text-[10px] bg-gray-50 p-2 block rounded border border-gray-100 text-gray-600">
                                Name, Email, Department, Year, Event Name, Rank
                            </code>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CertificateSection;
