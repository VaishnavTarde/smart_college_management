import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
    Users, Download, Printer, Search, Plus, Edit2, Trash2,
    CheckCircle, XCircle, Clock, ChevronUp, ChevronDown, ChevronsUpDown,
    ChevronLeft, ChevronRight, Lock, X, Save, RotateCcw, FileText,
    AlignLeft, BarChart2, Calendar, Building2, Layers, Phone,
    Mail, Hash, User, AlertTriangle, CheckSquare, Square, Eye, EyeOff
} from 'lucide-react';
import api from '../services/api';

// ─── Constants ───────────────────────────────────────────────
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const ATTENDANCE_CONFIG = {
    present: { label: 'Present', bg: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle size={12} /> },
    absent:  { label: 'Absent',  bg: 'bg-red-100 text-red-700 border-red-200',   icon: <XCircle size={12} /> },
    pending: { label: 'Pending', bg: 'bg-gray-100 text-gray-600 border-gray-200', icon: <Clock size={12} /> },
};

const DEFAULT_COLUMNS = [
    { key: 'studentName', label: 'Full Name',    sortable: true,  visible: true  },
    { key: 'rollNumber',  label: 'PRN / Roll No', sortable: true, visible: true  },
    { key: 'department',  label: 'Department',    sortable: true,  visible: true  },
    { key: 'division',    label: 'Division',      sortable: true,  visible: true  },
    { key: 'year',        label: 'Year',           sortable: true,  visible: true  },
    { key: 'studentEmail',label: 'Email',          sortable: false, visible: true  },
    { key: 'phone',       label: 'Contact',        sortable: false, visible: true  },
    { key: 'createdAt',   label: 'Reg. Date',      sortable: true,  visible: true  },
    { key: 'attendance',  label: 'Attendance',     sortable: true,  visible: true  },
];

// ─── Utility: CSV download ───────────────────────────────────
const downloadCSV = (rows, filename) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

// ─── Utility: Excel download (SheetJS) ──────────────────────
const downloadExcel = (rows, filename, sheetName = 'Registrations') => {
    if (!rows.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-width columns
    const colWidths = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)) + 2 }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
};

// ─── Utility: format row for export ─────────────────────────
const formatRowForExport = (r, idx, visibleCols) => {
    const colMap = {
        studentName:  'Full Name',
        rollNumber:   'PRN / Roll No',
        department:   'Department',
        division:     'Division',
        year:         'Year',
        studentEmail: 'Email',
        phone:        'Contact',
        createdAt:    'Reg. Date',
        attendance:   'Attendance',
    };
    const out = { 'Sr. No.': idx + 1 };
    visibleCols.forEach(col => {
        const label = colMap[col.key] || col.label;
        if (col.key === 'createdAt') out[label] = new Date(r.createdAt).toLocaleDateString('en-IN');
        else if (col.key === 'attendance') out[label] = r.attendance?.charAt(0).toUpperCase() + r.attendance?.slice(1);
        else out[label] = r[col.key] || '-';
    });
    return out;
};

// ─── Small Components ────────────────────────────────────────
const Skeleton = ({ className = '' }) => <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />;

const StatCard = ({ icon: Icon, label, value, sub, iconBg, iconColor, isSmall }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${isSmall ? 'p-4' : 'p-5'} flex items-start gap-3`}>
        <div className={`p-2 rounded-xl flex-shrink-0 ${iconBg}`}>
            <Icon size={isSmall ? 16 : 20} className={iconColor} />
        </div>
        <div className="min-w-0">
            <p className={`font-extrabold text-gray-900 leading-none ${isSmall ? 'text-xl' : 'text-2xl'}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium truncate">{label}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

const AttendanceBadge = ({ value }) => {
    const c = ATTENDANCE_CONFIG[value] || ATTENDANCE_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${c.bg}`}>
            {c.icon} {c.label}
        </span>
    );
};

// ─── Sort Icon ───────────────────────────────────────────────
const SortIcon = ({ col, sortKey, sortDir }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="text-gray-300 ml-1 flex-shrink-0" />;
    return sortDir === 'asc'
        ? <ChevronUp size={12} className="text-secondary ml-1 flex-shrink-0" />
        : <ChevronDown size={12} className="text-secondary ml-1 flex-shrink-0" />;
};

// ═════════════════════════════════════════════════════════════
// MODALS
// ═════════════════════════════════════════════════════════════

// Add / Edit Student Modal
const StudentFormModal = ({ mode, initialData, eventId, onSuccess, onClose }) => {
    const [form, setForm] = useState({
        studentName: '', studentEmail: '', rollNumber: '',
        department: '', year: '', division: '', phone: '', notes: '',
        ...(initialData || {}),
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.studentName.trim()) return setErr('Name is required');
        if (!form.studentEmail.trim()) return setErr('Email is required');
        if (!form.rollNumber.trim()) return setErr('PRN / Roll No. is required');
        setSaving(true); setErr('');
        try {
            if (mode === 'add') {
                await api.post(`/registrations/event/${eventId}`, form);
            } else {
                await api.put(`/registrations/${initialData._id}`, form);
            }
            onSuccess();
        } catch (e) {
            setErr(e.response?.data?.message || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none transition-all';

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {mode === 'add' ? '+ Add Student Registration' : '✏️ Edit Registration'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                    {err && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            <AlertTriangle size={14} /> {err}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { key: 'studentName', label: 'Full Name *', placeholder: 'e.g. Rahul Sharma', icon: User },
                            { key: 'rollNumber',  label: 'PRN / Roll No. *', placeholder: 'e.g. 2021COMP001', icon: Hash },
                            { key: 'studentEmail',label: 'Email *', placeholder: 'student@mitaoe.ac.in', icon: Mail },
                            { key: 'phone',       label: 'Contact', placeholder: '9xxxxxxxxx', icon: Phone },
                            { key: 'department',  label: 'Department', placeholder: 'COMP / IT / MECH', icon: Building2 },
                            { key: 'year',        label: 'Year', placeholder: 'FY / SY / TY / BE', icon: Layers },
                            { key: 'division',    label: 'Division', placeholder: 'A / B / C', icon: AlignLeft },
                        ].map(({ key, label, placeholder, icon: Icon }) => (
                            <div key={key}>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
                                    <Icon size={12} className="text-secondary" /> {label}
                                </label>
                                <input
                                    type={key === 'studentEmail' ? 'email' : 'text'}
                                    className={inputCls}
                                    placeholder={placeholder}
                                    value={form[key]}
                                    onChange={e => set(key, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
                            <FileText size={12} className="text-secondary" /> Notes (optional)
                        </label>
                        <textarea
                            rows={2}
                            className={`${inputCls} resize-none`}
                            placeholder="Any additional notes..."
                            value={form.notes}
                            onChange={e => set('notes', e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-accent text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50">
                            {saving ? <><RotateCcw size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> {mode === 'add' ? 'Add Student' : 'Save Changes'}</>}
                        </button>
                        <button type="button" onClick={onClose}
                            className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-medium">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Delete Confirmation Modal
const DeleteModal = ({ count, onConfirm, onClose, loading }) => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Delete {count > 1 ? `${count} Records` : 'Record'}?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone. The registration data will be permanently removed.</p>
            <div className="flex gap-3">
                <button onClick={onConfirm} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50">
                    {loading ? <><RotateCcw size={14} className="animate-spin" /> Deleting…</> : <><Trash2 size={14} /> Delete</>}
                </button>
                <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-medium">
                    Cancel
                </button>
            </div>
        </div>
    </div>
);

// Export Options Modal
const ExportModal = ({ selectedCount, totalCount, filteredCount, visibleCols, onExport, onClose }) => {
    const [scope, setScope] = useState(selectedCount > 0 ? 'selected' : 'filtered');
    const [format, setFormat] = useState('excel');
    const [exportCols, setExportCols] = useState(visibleCols.map(c => c.key));

    const toggleCol = (key) => setExportCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const scopeCount = { all: totalCount, filtered: filteredCount, selected: selectedCount };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Export Options</h2>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                    {/* Scope */}
                    <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Export Scope</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { val: 'all', label: 'All Records', count: totalCount },
                                { val: 'filtered', label: 'Filtered', count: filteredCount },
                                { val: 'selected', label: 'Selected', count: selectedCount },
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    disabled={opt.val === 'selected' && selectedCount === 0}
                                    onClick={() => setScope(opt.val)}
                                    className={`p-3 rounded-xl border text-left transition-all ${scope === opt.val ? 'border-secondary bg-secondary/5 text-secondary' : 'border-gray-200 text-gray-600 hover:border-gray-300'} disabled:opacity-40 disabled:cursor-not-allowed`}
                                >
                                    <p className="font-bold text-lg">{opt.count}</p>
                                    <p className="text-xs">{opt.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Format */}
                    <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">File Format</p>
                        <div className="flex gap-2">
                            {[
                                { val: 'excel', label: '📊 Excel (.xlsx)', color: 'text-green-600' },
                                { val: 'csv',   label: '📄 CSV',            color: 'text-blue-600' },
                                { val: 'pdf',   label: '🖨️ Print / PDF',   color: 'text-red-600' },
                            ].map(f => (
                                <button key={f.val} onClick={() => setFormat(f.val)}
                                    className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${format === f.val ? 'border-secondary bg-secondary/5 text-secondary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Columns */}
                    <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Columns to Include</p>
                        <div className="flex flex-wrap gap-2">
                            {DEFAULT_COLUMNS.map(col => (
                                <button key={col.key} onClick={() => toggleCol(col.key)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${exportCols.includes(col.key) ? 'bg-secondary text-white border-secondary' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-secondary/50'}`}>
                                    {exportCols.includes(col.key) ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                    {col.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={() => onExport({ scope, format, exportCols })}
                        className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-accent text-white font-semibold py-3 rounded-xl transition-all">
                        <Download size={16} /> Export Now
                    </button>
                    <button onClick={onClose} className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
                </div>
            </div>
        </div>
    );
};

// ═════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════
const RegistrationManagement = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const isAuthorized = user && (user.role === 'teacher' || user.role === 'admin');

    // ── Data state ───────────────────────────────────────────
    const [events, setEvents]           = useState([]);
    const [selectedEventId, setSelected] = useState('');
    const [registrations, setRegs]      = useState([]);
    const [stats, setStats]             = useState(null);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingRegs, setLoadingRegs] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // ── Filter / Sort / Pagination ───────────────────────────
    const [search, setSearch]           = useState('');
    const [deptFilter, setDeptFilter]   = useState('');
    const [divFilter, setDivFilter]     = useState('');
    const [attFilter, setAttFilter]     = useState('');
    const [sortKey, setSortKey]         = useState('createdAt');
    const [sortDir, setSortDir]         = useState('desc');
    const [page, setPage]               = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    // ── Table state ──────────────────────────────────────────
    const [columns, setColumns]         = useState(DEFAULT_COLUMNS);
    const [selected, setSelectedRows]   = useState(new Set());
    const [showColMenu, setShowColMenu] = useState(false);

    // ── Modals ───────────────────────────────────────────────
    const [addModal, setAddModal]       = useState(false);
    const [editRow, setEditRow]         = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null); // 'bulk' | rowId
    const [showExportModal, setShowExportModal] = useState(false);
    const [deleting, setDeleting]       = useState(false);

    // Redirect guard
    useEffect(() => {
        if (!isAuthorized) navigate('/dashboard');
    }, [isAuthorized, navigate]);

    // ── Load events ──────────────────────────────────────────
    useEffect(() => {
        api.get('/events').then(r => {
            setEvents((r.data?.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
        }).finally(() => setLoadingEvents(false));
    }, []);

    // ── Load registrations + stats ───────────────────────────
    const loadData = useCallback(async (eventId) => {
        if (!eventId) return;
        setLoadingRegs(true);
        setSelectedRows(new Set());
        try {
            const [regsRes, statsRes] = await Promise.all([
                api.get(`/registrations/event/${eventId}`),
                api.get(`/registrations/stats/${eventId}`),
            ]);
            setRegs(regsRes.data?.data || []);
            setStats(statsRes.data?.stats || null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRegs(false);
        }
    }, []);

    const handleEventChange = (e) => {
        setSelected(e.target.value);
        setSearch(''); setDeptFilter(''); setDivFilter(''); setAttFilter('');
        setPage(1); setRegs([]); setStats(null);
        if (e.target.value) loadData(e.target.value);
    };

    // ── Derived filter lists ─────────────────────────────────
    const deptOptions = useMemo(() => [...new Set(registrations.map(r => r.department).filter(Boolean))].sort(), [registrations]);
    const divOptions  = useMemo(() => [...new Set(registrations.map(r => r.division).filter(Boolean))].sort(), [registrations]);

    // ── Filtered + sorted rows ───────────────────────────────
    const visibleRows = useMemo(() => {
        let rows = [...registrations];

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(r =>
                r.studentName?.toLowerCase().includes(q) ||
                r.rollNumber?.toLowerCase().includes(q) ||
                r.studentEmail?.toLowerCase().includes(q) ||
                r.department?.toLowerCase().includes(q) ||
                r.phone?.includes(q)
            );
        }

        // Filters
        if (deptFilter) rows = rows.filter(r => r.department === deptFilter);
        if (divFilter)  rows = rows.filter(r => r.division === divFilter);
        if (attFilter)  rows = rows.filter(r => r.attendance === attFilter);

        // Sort
        rows.sort((a, b) => {
            let aVal = a[sortKey] ?? '';
            let bVal = b[sortKey] ?? '';
            if (sortKey === 'createdAt') { aVal = new Date(aVal); bVal = new Date(bVal); }
            else { aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase(); }
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return rows;
    }, [registrations, search, deptFilter, divFilter, attFilter, sortKey, sortDir]);

    // ── Paginated rows ───────────────────────────────────────
    const totalPages  = Math.max(1, Math.ceil(visibleRows.length / rowsPerPage));
    const pagedRows   = visibleRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const visibleCols = columns.filter(c => c.visible);

    // ── Sort handler ─────────────────────────────────────────
    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
        setPage(1);
    };

    // ── Select rows ──────────────────────────────────────────
    const toggleRow = (id) => setSelectedRows(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const toggleAll = () => {
        if (selected.size === pagedRows.length) setSelectedRows(new Set());
        else setSelectedRows(new Set(pagedRows.map(r => r._id)));
    };
    const allPageSelected = pagedRows.length > 0 && pagedRows.every(r => selected.has(r._id));

    // ── Attendance toggle ────────────────────────────────────
    const cycleAttendance = async (row) => {
        const cycle = { pending: 'present', present: 'absent', absent: 'pending' };
        const next = cycle[row.attendance] || 'pending';
        try {
            await api.patch(`/registrations/${row._id}/attendance`, { attendance: next });
            // Update registrations list — using functional form to avoid stale closure
            setRegs(prev => {
                const updated = prev.map(r => r._id === row._id ? { ...r, attendance: next } : r);
                // Also update stats inline from updated list
                setStats(s => s ? {
                    ...s,
                    totalPresent: updated.filter(r => r.attendance === 'present').length,
                    totalAbsent:  updated.filter(r => r.attendance === 'absent').length,
                    totalPending: updated.filter(r => r.attendance === 'pending').length,
                } : s);
                return updated;
            });
        } catch (e) { console.error('Attendance update failed:', e); }
    };

    // ── Delete ───────────────────────────────────────────────
    const confirmDelete = async () => {
        setDeleting(true);
        try {
            if (deleteTarget === 'bulk') {
                await Promise.all([...selected].map(id => api.delete(`/registrations/${id}`)));
                setRegs(prev => prev.filter(r => !selected.has(r._id)));
                setSelectedRows(new Set());
            } else {
                await api.delete(`/registrations/${deleteTarget}`);
                setRegs(prev => prev.filter(r => r._id !== deleteTarget));
            }
            loadData(selectedEventId); // refresh stats
        } catch (e) { console.error(e); } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    // ── Export handler ───────────────────────────────────────
    const handleExport = ({ scope, format, exportCols: cols }) => {
        const colObjects = DEFAULT_COLUMNS.filter(c => cols.includes(c.key));
        let rows;
        if (scope === 'selected') rows = registrations.filter(r => selected.has(r._id));
        else if (scope === 'filtered') rows = visibleRows;
        else rows = registrations;

        const exportRows = rows.map((r, i) => formatRowForExport(r, i, colObjects));
        const event = events.find(e => e._id === selectedEventId);
        const fname = `${event?.title || 'registrations'}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}`;

        if (format === 'csv') {
            downloadCSV(exportRows, `${fname}.csv`);
        } else if (format === 'excel') {
            downloadExcel(exportRows, `${fname}.xlsx`, event?.title?.slice(0, 31) || 'Registrations');
        } else {
            // PDF = Print
            window.print();
        }
        setShowExportModal(false);
    };

    // ── Column visibility toggle ─────────────────────────────
    const toggleColumn = (key) => {
        setColumns(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
    };

    // ── Access denied ────────────────────────────────────────
    if (!isAuthorized) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Lock size={28} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Access Restricted</h2>
            <p className="text-gray-500 max-w-sm">Only teachers and administrators can access this page.</p>
            <button onClick={() => navigate('/dashboard')} className="mt-2 px-5 py-2.5 bg-secondary text-white rounded-xl font-semibold hover:bg-accent transition-colors">
                Back to Dashboard
            </button>
        </div>
    );

    const selectedEventObj = events.find(e => e._id === selectedEventId);

    return (
        <>
            <style>{`
                @media print {
                    nav, footer, .no-print { display: none !important; }
                    body { background: white !important; font-size: 11px; }
                    .print-table { font-size: 10px; }
                }
            `}</style>

            <div className="space-y-5 pb-10">

                {/* ── Page Header ─────────────────────────────── */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-secondary/10 rounded-xl">
                            <Users size={22} className="text-secondary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Registration Management</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Manage event registrations · Teacher &amp; Admin only</p>
                        </div>
                    </div>
                    <div className="flex gap-2 no-print">
                        <button onClick={() => setShowExportModal(true)} disabled={!selectedEventId || !registrations.length}
                            className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-accent text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-40">
                            <Download size={15} /> Export
                        </button>
                        <button onClick={() => window.print()} disabled={!selectedEventId}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all disabled:opacity-40">
                            <Printer size={15} /> Print
                        </button>
                    </div>
                </div>

                {/* ── Event Selector ───────────────────────────── */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 no-print">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                        <Calendar size={14} className="text-secondary" /> Select Event
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <select
                                value={selectedEventId}
                                onChange={handleEventChange}
                                disabled={loadingEvents}
                                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm text-gray-800 focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none cursor-pointer"
                            >
                                <option value="">{loadingEvents ? 'Loading…' : '— Choose an event —'}</option>
                                {events.map(ev => (
                                    <option key={ev._id} value={ev._id}>
                                        {ev.title} — {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {selectedEventId && (
                            <button onClick={() => { setAddModal(true); }}
                                className="flex items-center gap-2 px-5 py-3 bg-secondary hover:bg-accent text-white font-semibold rounded-xl transition-all shadow-sm text-sm">
                                <Plus size={16} /> Add Student
                            </button>
                        )}
                    </div>
                    {selectedEventObj && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20 font-medium">
                                <Calendar size={10} /> {new Date(selectedEventObj.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {selectedEventObj.venue && (
                                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">
                                    📍 {selectedEventObj.venue}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Stats Cards ──────────────────────────────── */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 no-print">
                        <StatCard icon={Users}      label="Total Registered" value={stats.totalRegistered} iconBg="bg-blue-50"   iconColor="text-secondary" />
                        <StatCard icon={CheckCircle} label="Present"          value={stats.totalPresent}    iconBg="bg-green-50"  iconColor="text-green-500" sub={`${stats.attendanceRate}% rate`} />
                        <StatCard icon={XCircle}    label="Absent"            value={stats.totalAbsent}     iconBg="bg-red-50"    iconColor="text-red-500" />
                        <StatCard icon={Clock}       label="Pending"          value={stats.totalPending}    iconBg="bg-gray-100"  iconColor="text-gray-500" />
                        <StatCard icon={Building2}   label="Departments"       value={Object.keys(stats.departmentCounts || {}).length} iconBg="bg-purple-50" iconColor="text-purple-500" />
                    </div>
                )}

                {/* Dept + Division breakdown pills */}
                {stats && (Object.keys(stats.departmentCounts || {}).length > 0 || Object.keys(stats.divisionCounts || {}).length > 0) && (
                    <div className="flex flex-wrap gap-2 no-print">
                        {Object.entries(stats.departmentCounts || {}).map(([dept, count]) => (
                            <span key={dept} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium cursor-pointer hover:bg-purple-100 transition-colors"
                                onClick={() => { setDeptFilter(dept === deptFilter ? '' : dept); setPage(1); }}>
                                <Building2 size={10} /> {dept}: {count}
                            </span>
                        ))}
                        {Object.entries(stats.divisionCounts || {}).map(([div, count]) => (
                            <span key={div} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => { setDivFilter(div === divFilter ? '' : div); setPage(1); }}>
                                <Layers size={10} /> Div {div}: {count}
                            </span>
                        ))}
                    </div>
                )}

                {/* ── No event selected ────────────────────────── */}
                {!selectedEventId && !loadingEvents && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center gap-4">
                        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center">
                            <Users size={28} className="text-secondary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Select an Event</h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">Choose an event above to manage its student registrations.</p>
                        </div>
                    </div>
                )}

                {/* ── Loading skeleton ─────────────────────────── */}
                {loadingRegs && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                )}

                {/* ── Main Table Card ──────────────────────────── */}
                {selectedEventId && !loadingRegs && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                        {/* Table Top Controls */}
                        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center no-print">
                            {/* Search */}
                            <div className="relative min-w-[180px] flex-1 max-w-xs">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Search name, PRN, email…"
                                    value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                                />
                            </div>

                            {/* Department filter */}
                            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none">
                                <option value="">All Depts</option>
                                {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>

                            {/* Division filter */}
                            <select value={divFilter} onChange={e => { setDivFilter(e.target.value); setPage(1); }}
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none">
                                <option value="">All Divs</option>
                                {divOptions.map(d => <option key={d} value={d}>Div {d}</option>)}
                            </select>

                            {/* Attendance filter */}
                            <select value={attFilter} onChange={e => { setAttFilter(e.target.value); setPage(1); }}
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none">
                                <option value="">All Status</option>
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="pending">Pending</option>
                            </select>

                            {/* Reset filters */}
                            {(search || deptFilter || divFilter || attFilter) && (
                                <button onClick={() => { setSearch(''); setDeptFilter(''); setDivFilter(''); setAttFilter(''); setPage(1); }}
                                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors font-medium">
                                    <RotateCcw size={12} /> Clear
                                </button>
                            )}

                            <div className="ml-auto flex items-center gap-2">
                                {/* Column visibility */}
                                <div className="relative">
                                    <button onClick={() => setShowColMenu(!showColMenu)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                        {showColMenu ? <EyeOff size={14} /> : <Eye size={14} />} Columns
                                    </button>
                                    {showColMenu && (
                                        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-3 min-w-[180px]">
                                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Toggle Columns</p>
                                            {DEFAULT_COLUMNS.map(col => (
                                                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-700 hover:text-secondary">
                                                    <input type="checkbox" checked={columns.find(c => c.key === col.key)?.visible ?? true}
                                                        onChange={() => toggleColumn(col.key)} className="rounded accent-blue-500" />
                                                    {col.label}
                                                </label>
                                            ))}
                                            <button onClick={() => setShowColMenu(false)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Close</button>
                                        </div>
                                    )}
                                </div>

                                {/* Rows per page */}
                                <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                                    className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-600 outline-none">
                                    {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} rows</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Bulk action bar */}
                        {selected.size > 0 && (
                            <div className="px-4 py-2.5 bg-secondary/5 border-b border-secondary/20 flex items-center gap-3 no-print">
                                <span className="text-sm font-semibold text-secondary">{selected.size} selected</span>
                                <button onClick={() => setDeleteTarget('bulk')}
                                    className="flex items-center gap-1 text-xs text-red-600 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors font-medium">
                                    <Trash2 size={12} /> Delete Selected
                                </button>
                                <button onClick={() => setSelectedRows(new Set())}
                                    className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Clear selection</button>
                            </div>
                        )}

                        {/* Table */}
                        <div className="overflow-x-auto print-table">
                            <table className="w-full min-w-[700px] text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        {/* Checkbox column */}
                                        <th className="w-10 px-3 py-3 no-print">
                                            <button onClick={toggleAll} className="text-gray-400 hover:text-secondary transition-colors">
                                                {allPageSelected ? <CheckSquare size={16} className="text-secondary" /> : <Square size={16} />}
                                            </button>
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-10">#</th>
                                        {visibleCols.map(col => (
                                            <th key={col.key} className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                                {col.sortable ? (
                                                    <button onClick={() => handleSort(col.key)}
                                                        className="flex items-center gap-0.5 hover:text-secondary transition-colors group">
                                                        {col.label}
                                                        <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                                                    </button>
                                                ) : col.label}
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide no-print">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pagedRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={visibleCols.length + 3} className="text-center py-16 text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users size={32} className="opacity-30" />
                                                    <p className="font-medium">{registrations.length === 0 ? 'No students registered yet' : 'No results match your filters'}</p>
                                                    <p className="text-xs">{registrations.length > 0 && 'Try clearing the filters above'}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : pagedRows.map((row, idx) => (
                                        <tr key={row._id}
                                            className={`hover:bg-gray-50/80 transition-colors ${selected.has(row._id) ? 'bg-secondary/5' : ''}`}>
                                            {/* Checkbox */}
                                            <td className="px-3 py-3 no-print">
                                                <button onClick={() => toggleRow(row._id)}>
                                                    {selected.has(row._id)
                                                        ? <CheckSquare size={15} className="text-secondary" />
                                                        : <Square size={15} className="text-gray-300 hover:text-gray-400" />}
                                                </button>
                                            </td>
                                            {/* Row number */}
                                            <td className="px-3 py-3 text-xs text-gray-400 font-mono">
                                                {(page - 1) * rowsPerPage + idx + 1}
                                            </td>
                                            {visibleCols.map(col => (
                                                <td key={col.key} className="px-3 py-3 text-sm text-gray-700 max-w-[200px]">
                                                    {col.key === 'attendance' ? (
                                                        <button onClick={() => cycleAttendance(row)} className="cursor-pointer hover:scale-105 transition-transform" title="Click to cycle attendance">
                                                            <AttendanceBadge value={row.attendance} />
                                                        </button>
                                                    ) : col.key === 'createdAt' ? (
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                        </span>
                                                    ) : col.key === 'studentName' ? (
                                                        <div>
                                                            <p className="font-semibold text-gray-900 truncate">{row.studentName}</p>
                                                            <p className="text-xs text-gray-400 truncate">{row.rollNumber}</p>
                                                        </div>
                                                    ) : col.key === 'rollNumber' ? null : (
                                                        <span className="truncate block" title={row[col.key] || ''}>{row[col.key] || <span className="text-gray-300">—</span>}</span>
                                                    )}
                                                </td>
                                            ))}
                                            {/* Actions */}
                                            <td className="px-3 py-3 no-print">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setEditRow(row)} title="Edit"
                                                        className="p-1.5 text-gray-400 hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(row._id)} title="Delete"
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {visibleRows.length > rowsPerPage && (
                            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4 no-print">
                                <p className="text-xs text-gray-500">
                                    Showing <span className="font-semibold text-gray-800">{(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, visibleRows.length)}</span> of <span className="font-semibold text-gray-800">{visibleRows.length}</span>
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button disabled={page === 1} onClick={() => setPage(1)}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        «
                                    </button>
                                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <ChevronLeft size={14} />
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let p;
                                        if (totalPages <= 5) p = i + 1;
                                        else if (page <= 3) p = i + 1;
                                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                                        else p = page - 2 + i;
                                        return (
                                            <button key={p} onClick={() => setPage(p)}
                                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors border ${p === page ? 'bg-secondary text-white border-secondary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                {p}
                                            </button>
                                        );
                                    })}
                                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <ChevronRight size={14} />
                                    </button>
                                    <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        »
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Table footer summary */}
                        {registrations.length > 0 && (
                            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                                <span>Total: <span className="font-bold text-gray-700">{registrations.length}</span></span>
                                <span>Filtered: <span className="font-bold text-gray-700">{visibleRows.length}</span></span>
                                <span>Present: <span className="font-bold text-green-600">{registrations.filter(r => r.attendance === 'present').length}</span></span>
                                <span>Absent: <span className="font-bold text-red-500">{registrations.filter(r => r.attendance === 'absent').length}</span></span>
                                <span>Pending: <span className="font-bold text-gray-500">{registrations.filter(r => r.attendance === 'pending').length}</span></span>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* ── Modals ──────────────────────────────────────── */}
            {addModal && (
                <StudentFormModal mode="add" eventId={selectedEventId} onClose={() => setAddModal(false)}
                    onSuccess={() => { setAddModal(false); loadData(selectedEventId); }} />
            )}
            {editRow && (
                <StudentFormModal mode="edit" initialData={editRow} eventId={selectedEventId} onClose={() => setEditRow(null)}
                    onSuccess={() => { setEditRow(null); loadData(selectedEventId); }} />
            )}
            {deleteTarget && (
                <DeleteModal
                    count={deleteTarget === 'bulk' ? selected.size : 1}
                    loading={deleting}
                    onConfirm={confirmDelete}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
            {showExportModal && (
                <ExportModal
                    selectedCount={selected.size}
                    totalCount={registrations.length}
                    filteredCount={visibleRows.length}
                    visibleCols={visibleCols}
                    onExport={handleExport}
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </>
    );
};

export default RegistrationManagement;
