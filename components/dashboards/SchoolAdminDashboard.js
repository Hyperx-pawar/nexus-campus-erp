'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  Wallet, 
  Megaphone, 
  Calendar, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Search,
  ShieldCheck,
  ClipboardList,
  Zap,
  Library,
  Home,
  Bus,
  FileBox,
  Settings,
  CheckCircle,
  History
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import Link from 'next/link';


export default function SchoolAdminDashboard() {
  const { 
    activeTenant, 
    activeUser, 
    realRole,
    sharedNotices, 
    setSharedNotices,
    sharedStudents,
    sharedStaff,
    sharedClasses,
    sharedAcademicRecords,
    sharedClassTestRecords,
    sharedCirculations,
    sharedHostelInventoryAllocations,
    sharedMaintenanceBills,
    sharedBooks,
    sharedFeeRecords,
    sharedStudentHistory
  } = useAuth();
  
  const [newNotice, setNewNotice] = useState({ title: '', body: '', target: 'ALL' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [auditTab, setAuditTab] = useState('grades');
  const [auditSearch, setAuditSearch] = useState('');

  const adminNotices = useMemo(() => {
    return (sharedNotices || []).filter(n => n.tenant_id === activeTenant.id);
  }, [sharedNotices, activeTenant.id]);

  const tenantStudents = useMemo(() => {
    return (sharedStudents || []).filter(s => s.tenant_id === activeTenant.id);
  }, [sharedStudents, activeTenant.id]);

  const tenantStaff = useMemo(() => {
    return (sharedStaff || []).filter(s => s.tenant_id === activeTenant.id);
  }, [sharedStaff, activeTenant.id]);

  const tenantClasses = useMemo(() => {
    return (sharedClasses || []).filter(c => c.tenant_id === activeTenant.id);
  }, [sharedClasses, activeTenant.id]);

  const totalCollections = useMemo(() => {
    let sum = 0;
    tenantStudents.forEach(s => {
      const fee = sharedFeeRecords[s.id];
      if (fee) {
        sum += fee.paid || 0;
      }
    });
    return sum;
  }, [tenantStudents, sharedFeeRecords]);

  const getClassName = (classId) => {
    const cls = (sharedClasses || []).find(c => c.id === classId);
    return cls ? cls.name : 'Unknown Class';
  };

  const auditAcademicRecords = useMemo(() => {
    const list = [];
    tenantStudents.forEach(s => {
      const records = sharedAcademicRecords[s.id] || [];
      records.forEach(r => {
        list.push({
          studentName: `${s.first_name} ${s.last_name}`,
          classId: s.class_id,
          subject: r.subject,
          marks: r.marks,
          grade: r.grade,
          desc: r.desc || 'Term Examination',
          type: 'Final Exam'
        });
      });
      const ctRecords = sharedClassTestRecords[s.id] || [];
      ctRecords.forEach(r => {
        list.push({
          studentName: `${s.first_name} ${s.last_name}`,
          classId: s.class_id,
          subject: r.subject,
          marks: r.marks,
          grade: r.grade,
          desc: r.desc || 'Periodic Assessment',
          type: 'Class Test'
        });
      });
    });
    return list;
  }, [tenantStudents, sharedAcademicRecords, sharedClassTestRecords]);

  const auditCirculations = useMemo(() => {
    return (sharedCirculations || []).filter(c => c.tenant_id === activeTenant.id).map(c => {
      const stud = (sharedStudents || []).find(s => s.id === c.student_id);
      const book = (sharedBooks || []).find(b => b.id === c.book_id);
      return {
        ...c,
        borrowerName: stud ? `${stud.first_name} ${stud.last_name}` : 'Unknown Borrower',
        bookTitle: book ? book.title : c.title || 'Unknown Book'
      };
    });
  }, [sharedCirculations, sharedStudents, sharedBooks, activeTenant.id]);

  const auditHostelAllocations = useMemo(() => {
    return (sharedHostelInventoryAllocations || []).filter(a => a.tenant_id === activeTenant.id).map(a => {
      const stud = (sharedStudents || []).find(s => s.id === a.studentId);
      return {
        ...a,
        studentName: stud ? `${stud.first_name} ${stud.last_name}` : 'Unknown Resident'
      };
    });
  }, [sharedHostelInventoryAllocations, sharedStudents, activeTenant.id]);

  const auditMaintenanceBills = useMemo(() => {
    return (sharedMaintenanceBills || []).filter(b => b.tenant_id === activeTenant.id);
  }, [sharedMaintenanceBills, activeTenant.id]);

  const filteredAcademicRecords = useMemo(() => {
    return auditAcademicRecords.filter(r => 
      !auditSearch ||
      r.studentName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      r.subject.toLowerCase().includes(auditSearch.toLowerCase()) ||
      r.grade.toLowerCase().includes(auditSearch.toLowerCase())
    );
  }, [auditAcademicRecords, auditSearch]);

  const filteredCirculations = useMemo(() => {
    return auditCirculations.filter(c => 
      !auditSearch ||
      c.borrowerName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      c.bookTitle.toLowerCase().includes(auditSearch.toLowerCase()) ||
      c.status.toLowerCase().includes(auditSearch.toLowerCase())
    );
  }, [auditCirculations, auditSearch]);

  const filteredHostelAllocations = useMemo(() => {
    return auditHostelAllocations.filter(a => 
      !auditSearch ||
      a.studentName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.item.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.status.toLowerCase().includes(auditSearch.toLowerCase())
    );
  }, [auditHostelAllocations, auditSearch]);

  const filteredMaintenanceBills = useMemo(() => {
    return auditMaintenanceBills.filter(b => 
      !auditSearch ||
      b.vehicleNo.toLowerCase().includes(auditSearch.toLowerCase()) ||
      b.description.toLowerCase().includes(auditSearch.toLowerCase()) ||
      b.cost.toString().includes(auditSearch)
    );
  }, [auditMaintenanceBills, auditSearch]);

  const handlePostNotice = (e) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.body) {
      toast.error('Notice title and details are required');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmBroadcast = () => {
    if (!setSharedNotices) {
      toast.error('Unable to broadcast: notices database state is offline.');
      return;
    }
    const notice = {
      id: (sharedNotices || []).length + 1,
      title: newNotice.title,
      body: newNotice.body,
      target: newNotice.target,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      author: activeUser?.name?.split(' (')[0] || 'Principal Office',
      tenant_id: activeTenant.id
    };
    setSharedNotices([notice, ...sharedNotices]);
    setNewNotice({ title: '', body: '', target: 'ALL' });
    setShowConfirmModal(false);
    toast.success(`Campus circular broadcasted successfully to: ${newNotice.target === 'ALL' ? 'All Users' : newNotice.target === 'STUDENT' ? 'Students' : newNotice.target === 'STAFF' ? 'Staff' : 'Parents'}`);
  };


  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome & Campus Banner */}
      <div className="p-8 rounded-[2.5rem] bg-bg-card shadow-sm border border-border relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-indigo-500/5 z-0"></div>
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-accent/10 blur-[80px]"></div>
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-wider">
            <Sparkles size={10} />
            <span>{realRole === 'ADMINISTRATOR' ? 'Campus Office Administrator Portal' : 'Campus Principal Portal'}</span>
          </div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">{activeTenant?.name}</h2>
          <p className="text-text-secondary text-sm font-medium">
            {realRole === 'ADMINISTRATOR' 
              ? 'Welcome back, Office Administrator. Standard Indian Board (CBSE) profiles sync is operational.' 
              : 'Welcome back, Principal Admin. Standard Indian Board (CBSE) profiles sync is operational.'}
          </p>
        </div>
        <div className="relative z-10 flex flex-col items-end shrink-0 bg-slate-100/50 border border-border px-6 py-4 rounded-3xl">
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Academic Year</span>
          <span className="text-xl font-black text-text-primary font-outfit mt-1">2026 - 2027</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Enrolled Students', value: tenantStudents.length.toLocaleString('en-IN'), icon: Users, desc: 'Aadhaar validated profiles' },
          { label: 'Active Faculty', value: tenantStaff.length.toLocaleString('en-IN'), icon: Users, desc: 'EPF/PAN registered staff' },
          { label: 'Academic Classes', value: tenantClasses.length.toLocaleString('en-IN'), icon: BookOpen, desc: 'Active CBSE syllabus tracks' },
          { label: 'Fee Collections (Q1)', value: `₹${(totalCollections / 100000).toFixed(2)} Lakh`, icon: Wallet, desc: 'INR Bank settlement' }
        ].map((kpi, idx) => (
          <div key={idx} className="p-6 bg-bg-sidebar border border-border rounded-3xl relative overflow-hidden group hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{kpi.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><kpi.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-4">{kpi.value}</p>
            <p className="text-[11px] text-text-secondary mt-1 opacity-65">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Grid: Notice Board & Class Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Span): Active Notice Board */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-accent" />
              <h3 className="text-lg font-black font-outfit text-text-primary tracking-tight">Active Circulars & Notices</h3>
            </div>

            <div className="space-y-4">
              {adminNotices.map((notice) => (
                <div key={notice.id} className="p-5 bg-bg-main/40 border border-border rounded-2xl space-y-3 hover:border-accent/10 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-black text-text-primary">{notice.title}</h4>
                      <span className="text-[10px] text-text-secondary opacity-50 font-bold">{notice.date}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{notice.body}</p>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-text-secondary uppercase tracking-widest pt-2 border-t border-border/40 mt-1">
                    <span className="font-black text-accent">{notice.author}</span>
                    <span className="px-1.5 py-0.5 bg-accent/10 text-accent font-black rounded text-[8px]">To: {notice.target || 'ALL'}</span>
                  </div>
                </div>
              ))}
              {adminNotices.length === 0 && (
                <p className="text-xs text-text-secondary italic py-8 text-center border border-dashed border-border rounded-2xl">
                  No active announcements broadcasted yet.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Right Column (1 Span): Broadcast Form & Quick Action List */}
        <div className="space-y-6">
          
          {/* Create Campus Circular Form */}
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-text-primary">
              <Megaphone size={16} className="text-accent" />
              <h3 className="text-sm font-black uppercase tracking-wider font-outfit">Broadcast Circular</h3>
            </div>
            <form onSubmit={handlePostNotice} className="space-y-3">
              <input 
                type="text" 
                placeholder="Circular Title (e.g. CBSE Exams)"
                value={newNotice.title}
                onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
                className="w-full text-xs"
              />
              <textarea 
                placeholder="Circular details and instructions..."
                rows={4}
                value={newNotice.body}
                onChange={(e) => setNewNotice({...newNotice, body: e.target.value})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl p-3 text-text-primary outline-none resize-none"
              />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider block ml-1">Recipient Audience</label>
                <select 
                  value={newNotice.target}
                  onChange={(e) => setNewNotice({...newNotice, target: e.target.value})}
                  className="w-full bg-bg-main border border-border rounded-xl py-2.5 px-3 text-xs text-text-primary outline-none cursor-pointer"
                >
                  <option value="ALL">All Users (Students, Staff, Parents)</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="STAFF">Staff Only</option>
                  <option value="PARENT">Parents Only</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Broadcast Circular</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>

          {/* Quick Stats Panel */}
          <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider font-outfit text-text-primary">Campus Activity Logs</h3>
            <div className="space-y-3">
              {[
                { activity: 'Student Aarav Patel registered for Class XI', time: '10 min ago' },
                { activity: 'Faculty Rajesh Iyer marked Class XII Physics Attendance', time: '1 hour ago' },
                { activity: 'Accountant collected ₹45,000 Term Fee payment', time: '2 hours ago' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 text-xs">
                  <p className="text-text-secondary text-[11px] leading-snug">{item.activity}</p>
                  <span className="text-[9px] text-text-secondary opacity-40 whitespace-nowrap shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Staff Additions & Campus Audit Ledger */}
      <div className="p-8 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2.5rem] space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-black font-outfit text-text-primary tracking-tight">Staff Additions & Campus Audit Ledger</h3>
            <p className="text-xs text-text-secondary font-medium">Real-time inspection ledger for marks, library issues, boarding allocations, and transport bills.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary/50">
              <Search size={14} />
            </span>
            <input 
              type="text" 
              placeholder="Search audit records..." 
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-main border border-border rounded-xl text-xs text-text-primary outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800 border border-border rounded-2xl w-fit">
          {[
            { id: 'grades', label: 'Academic Grades', count: filteredAcademicRecords.length },
            { id: 'library', label: 'Library Circulations', count: filteredCirculations.length },
            { id: 'hostel', label: 'Hostel Allocations', count: filteredHostelAllocations.length },
            { id: 'transport', label: 'Transport Fleet Bills', count: filteredMaintenanceBills.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAuditTab(tab.id)}
              className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${
                auditTab === tab.id 
                  ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Audit Content List */}
        <div className="overflow-hidden border border-border rounded-2xl bg-bg-card">
          {auditTab === 'grades' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">Subject / Course</th>
                    <th className="p-4">Marks</th>
                    <th className="p-4">CBSE Grade</th>
                    <th className="p-4">Assessment Type</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAcademicRecords.map((r, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-slate-50/50 last:border-none">
                      <td className="p-4 font-bold text-text-primary">{r.studentName}</td>
                      <td className="p-4 text-text-secondary">{getClassName(r.classId)}</td>
                      <td className="p-4 font-semibold text-text-primary">{r.subject}</td>
                      <td className="p-4 font-mono font-bold text-slate-700">{r.marks}</td>
                      <td className="p-4 font-mono font-black text-accent">{r.grade}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                          r.type === 'Final Exam' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400'
                        }`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="p-4 text-right text-text-secondary font-medium">{r.desc}</td>
                    </tr>
                  ))}
                  {filteredAcademicRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-secondary italic">No academic marks matching filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {auditTab === 'library' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                    <th className="p-4">Borrower Name</th>
                    <th className="p-4">Book Title</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCirculations.map((c, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-slate-50/50 last:border-none">
                      <td className="p-4 font-bold text-text-primary">{c.borrowerName}</td>
                      <td className="p-4 font-semibold text-text-primary">{c.bookTitle}</td>
                      <td className="p-4 font-mono text-text-secondary">{c.issue_date}</td>
                      <td className="p-4 font-mono text-text-secondary">{c.due_date}</td>
                      <td className="p-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          c.status === 'ISSUED' 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredCirculations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-secondary italic">No library issues matching filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {auditTab === 'hostel' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                    <th className="p-4">Resident Student</th>
                    <th className="p-4">Issued Item</th>
                    <th className="p-4">Unit Cost</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4 text-right">Settlement Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHostelAllocations.map((a, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-slate-50/50 last:border-none">
                      <td className="p-4 font-bold text-text-primary">{a.studentName}</td>
                      <td className="p-4 font-semibold text-text-primary">{a.item}</td>
                      <td className="p-4 font-mono text-slate-700 font-bold">₹{a.cost.toLocaleString('en-IN')}</td>
                      <td className="p-4 font-mono text-text-secondary">{a.date}</td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                          a.status === 'PAID' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredHostelAllocations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-secondary italic">No boarding allocations matching filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {auditTab === 'transport' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                    <th className="p-4">Vehicle Plate No</th>
                    <th className="p-4">Repair & Maintenance Details</th>
                    <th className="p-4 font-black text-rose-600">Invoice Cost</th>
                    <th className="p-4 text-right">Billing Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenanceBills.map((b, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-slate-50/50 last:border-none">
                      <td className="p-4 font-mono font-bold text-text-primary">{b.vehicleNo}</td>
                      <td className="p-4 font-semibold text-text-primary">{b.description}</td>
                      <td className="p-4 font-mono text-rose-600 font-black">₹{b.cost.toLocaleString('en-IN')}</td>
                      <td className="p-4 font-mono text-text-secondary text-right">{b.date}</td>
                    </tr>
                  ))}
                  {filteredMaintenanceBills.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-text-secondary italic">No fleet repair bills matching filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Student Promotions Desk Quick Access Banner */}
      <div className="p-8 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_4px_24px_rgba(16,185,129,0.03)]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Zap size={16} />
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Academic Term Promotions</h3>
          </div>
          <h4 className="text-xl font-black font-outfit text-text-primary tracking-tight">Ready to transition to the next Academic Year?</h4>
          <p className="text-xs text-text-secondary max-w-2xl leading-relaxed">
            Promote eligible students to their next grades, archive their current academic year files (grades, fee logs, attendance history, and remarks), and allocate fresh billing/ledger lists automatically.
          </p>
        </div>
        <Link
          href="/dashboard/students"
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
        >
          <span>Promote Students Now</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Student Academic Year Archives */}
      {(() => {
        const allHistoryEntries = [];
        tenantStudents.forEach(s => {
          const history = (sharedStudentHistory || {})[s.id] || [];
          history.forEach(record => {
            allHistoryEntries.push({
              studentName: `${s.first_name} ${s.last_name}`,
              studentId: s.id,
              admissionNo: s.admission_no,
              ...record
            });
          });
        });
        if (allHistoryEntries.length === 0) return null;
        return (
          <div className="p-8 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2.5rem] space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <History size={18} className="text-accent" />
                <h3 className="text-xl font-black font-outfit text-text-primary tracking-tight">Student Academic Year Archives</h3>
              </div>
              <p className="text-xs text-text-secondary font-medium mt-1">Historical performance records saved during student promotions. Scroll to review past academic year data.</p>
            </div>

            <div className="overflow-hidden border border-border rounded-2xl bg-bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                      <th className="p-4">Student Name</th>
                      <th className="p-4">Admission No.</th>
                      <th className="p-4">Academic Year</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">Attendance</th>
                      <th className="p-4">Fee Status</th>
                      <th className="p-4">Subjects</th>
                      <th className="p-4 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allHistoryEntries.map((entry, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-slate-50/50 last:border-none">
                        <td className="p-4 font-bold text-text-primary">{entry.studentName}</td>
                        <td className="p-4 font-mono text-text-secondary">{entry.admissionNo}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-accent/10 text-accent text-[9px] font-black rounded uppercase">{entry.academic_year}</span>
                        </td>
                        <td className="p-4 font-semibold text-text-primary">{entry.class_name}</td>
                        <td className="p-4 font-mono font-bold text-text-primary">{entry.attendance}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                            entry.fees?.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : entry.fees?.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                          }`}>
                            {entry.fees?.status} (₹{(entry.fees?.paid || 0).toLocaleString('en-IN')} / ₹{(entry.fees?.total || 0).toLocaleString('en-IN')})
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {(entry.academic_records || []).map((ar, arIdx) => (
                              <span key={arIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-border rounded text-[8px] font-bold text-text-primary">
                                {ar.subject.split(' ')[0]}: <span className="text-accent">{ar.grade}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right text-[10px] text-text-secondary italic max-w-[200px] truncate" title={(entry.remarks || [])[0]?.remark || 'No remarks'}>
                          {(entry.remarks || [])[0]?.remark || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Campus Core Modules Launcher */}
      <div className="p-8 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-md border border-border rounded-[2.5rem] space-y-6">
        <div>
          <h3 className="text-xl font-black font-outfit text-text-primary tracking-tight">Campus Application Suite</h3>
          <p className="text-xs text-text-secondary font-medium">Quickly launch administrative and academic modules for the active campus partition.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { name: 'School Monitoring', icon: Zap, href: '/dashboard/pulse', desc: 'Real-time telemetry and database logs feed.', category: 'Telemetry' },
            { name: 'Student Directory', icon: Users, href: '/dashboard/students', desc: 'Manage enrollment registry, roll numbers, and Aadhaar tags.', category: 'Academics' },
            { name: 'Staff Directory', icon: Users, href: '/dashboard/staff', desc: 'Manage school faculty profiles, designations, and details.', category: 'Academics' },
            { name: 'Daily Attendance', icon: CheckCircle, href: '/dashboard/attendance', desc: 'Mark attendance rosters and send absentee alerts.', category: 'Academics' },
            { name: 'Syllabus & LMS', icon: BookOpen, href: '/dashboard/courses', desc: 'Configure courses, CBSE syllabus, and digital study guides.', category: 'Academics' },
            { name: 'Exams & Marksheets', icon: ClipboardList, href: '/dashboard/exams', desc: 'Schedule periodic exams and publish grade cards.', category: 'Academics' },
            { name: 'Library Books', icon: Library, href: '/dashboard/library', desc: 'Scan library books catalog, issue volumes, and log fines.', category: 'Operations' },
            { name: 'Hostels & Boarding', icon: Home, href: '/dashboard/hostel', desc: 'Allocate residential hostel blocks and bunk inventory.', category: 'Operations' },
            { name: 'School Bus & Transport', icon: Bus, href: '/dashboard/transport', desc: 'Track transport buses, drivers, routes, and billing.', category: 'Operations' },
            { name: 'HR & Staff Payroll', icon: FileBox, href: '/dashboard/hr', desc: 'Configure basic salary scales, PF allocations, and taxes.', category: 'Management' },
            { name: 'Fees & Finance', icon: Wallet, href: '/dashboard/finance', desc: 'Track ledger payments, outstanding dues, and receipts.', category: 'Management' },
            { name: 'System Analytics', icon: TrendingUp, href: '/dashboard/analytics', desc: 'Generate visual trends of finance, payroll, and grades.', category: 'Management' },
            { name: 'School Settings', icon: Settings, href: '/dashboard/settings', desc: 'Branding logo configuration and affiliation board settings.', category: 'Management' }
          ].map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Link
                key={idx}
                href={mod.href}
                className="p-5 bg-bg-main border border-border hover:border-accent/20 rounded-[2rem] space-y-3 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.025)] group relative flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-accent/10 rounded-xl text-accent group-hover:bg-accent group-hover:text-white transition-all">
                      <Icon size={16} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-text-secondary bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {mod.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-text-primary group-hover:text-accent transition-colors">
                      {mod.name}
                    </h4>
                    <p className="text-[10px] text-text-secondary leading-relaxed mt-1 font-medium">
                      {mod.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-end text-[9px] text-accent font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open Module ➔</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Announcement Broadcast"
        icon={<Megaphone size={18} />}
        size="md"
      >
        <div className="space-y-5 text-text-primary">
          <p className="text-xs text-text-secondary leading-relaxed">
            You are about to broadcast the following circular to the selected audience. Please review the details below before confirmation:
          </p>

          <div className="p-5 bg-slate-50 dark:bg-slate-800 border border-border rounded-2xl space-y-4">
            <div>
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Recipient Audience</span>
              <span className="text-xs font-black text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded mt-1 inline-block uppercase">
                {newNotice.target === 'ALL' ? 'All (Students, Staff, Parents)' : newNotice.target === 'STUDENT' ? 'Students Only' : newNotice.target === 'STAFF' ? 'Staff Only' : 'Parents Only'}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Circular Title</span>
              <h4 className="text-sm font-black mt-1 text-text-primary">{newNotice.title}</h4>
            </div>
            <div>
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Message Content</span>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{newNotice.body}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-600 text-text-primary text-xs font-bold rounded-xl border border-border transition-all flex items-center justify-center"
            >
              Cancel & Edit
            </button>
            <button
              type="button"
              onClick={handleConfirmBroadcast}
              className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
            >
              <span>Confirm & Broadcast</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
