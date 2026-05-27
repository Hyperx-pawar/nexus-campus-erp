'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Clock, Search, Calendar, ChevronLeft, ChevronRight, 
  QrCode, UserCheck, ShieldAlert, Sparkles, RefreshCw, Eye, Camera, CheckCircle2, Loader2, BellRing,
  Printer
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

export default function AttendancePage() {
  const {
    activeTenant, sharedStudents, sharedStaff, sharedClasses, sharedParents,
    activeRole, activeUser, sharedSubjects
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'staff'
  const [selectedDate, setSelectedDate] = useState('2026-05-24');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);

  // Daily attendance state: key is 'date_id', value is 'PRESENT' | 'ABSENT' | 'LATE'
  const [attendanceLogs, setAttendanceLogs] = useState({});

  // Simulate loading records from database to resolve the "stuck loading" bug
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600); // 600ms load simulation
    return () => clearTimeout(timer);
  }, [selectedDate, activeTab]);

  // Format date to human-readable string: e.g. "May 24th, 2026"
  const formatHumanDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    
    // Add ordinal suffix: st, nd, rd, th
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';

    return `${month} ${day}${suffix}, ${year}`;
  };

  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Resolve allowed classes for teachers (subject-classes + own-class)
  const teacherAllowedClasses = React.useMemo(() => {
    if (activeRole !== 'TEACHER') {
      return sharedClasses.filter(c => c.tenant_id === activeTenant.id);
    }
    const myStaffRecord = sharedStaff.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.includes(s.first_name));
    const myStaffId = myStaffRecord ? myStaffRecord.id : null;
    const mySubjectClassIds = sharedSubjects.filter(sub => sub.teacher_id === myStaffId).map(sub => sub.class_id);
    const myOwnClass = sharedClasses.find(c => c.class_teacher_id === myStaffId);
    
    return sharedClasses.filter(c => {
      if (c.tenant_id !== activeTenant.id) return false;
      return mySubjectClassIds.includes(c.id) || (myOwnClass && c.id === myOwnClass.id);
    });
  }, [activeRole, activeTenant, sharedClasses, sharedStaff, sharedSubjects, activeUser]);

  const teacherAllowedClassIds = React.useMemo(() => teacherAllowedClasses.map(c => c.id), [teacherAllowedClasses]);

  const classSubjects = React.useMemo(() => {
    return sharedSubjects.filter(sub => {
      if (sub.tenant_id !== activeTenant.id) return false;
      if (activeRole === 'TEACHER') {
        if (!teacherAllowedClassIds.includes(sub.class_id)) return false;
      }
      if (selectedClass !== 'ALL' && sub.class_id !== selectedClass) return false;
      return true;
    });
  }, [sharedSubjects, activeTenant.id, selectedClass, activeRole, teacherAllowedClassIds]);

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Daily Attendance" />;
  }

  // Get current roster filtered by tenant and teacher allowed classes
  const tenantStudents = sharedStudents.filter(s => {
    if (s.tenant_id !== activeTenant.id) return false;
    if (activeRole === 'TEACHER') {
      return teacherAllowedClassIds.includes(s.class_id);
    }
    return true;
  });
  const tenantStaff = sharedStaff.filter(s => s.tenant_id === activeTenant.id);

  const getClassName = (classId) => {
    const cls = sharedClasses.find(c => c.id === classId);
    return cls ? cls.name : 'General Class';
  };

  // Filter students based on UI selections
  const filteredStudents = tenantStudents.filter(s => {
    const matchesSearch = 
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.roll_no && s.roll_no.includes(searchQuery));
    
    const matchesClass = selectedClass === 'ALL' || s.class_id === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  // Filter staff based on UI selections
  const filteredStaff = tenantStaff.filter(s => {
    return (
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.designation.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Toggle status
  const handleToggleStatus = (id, newStatus) => {
    const logKey = activeTab === 'students'
      ? `${selectedDate}_${selectedSubject}_${id}`
      : `${selectedDate}_${id}`;
    setAttendanceLogs(prev => ({
      ...prev,
      [logKey]: prev[logKey] === newStatus ? undefined : newStatus
    }));
    
    const name = activeTab === 'students' 
      ? tenantStudents.find(s => s.id === id)?.first_name 
      : tenantStaff.find(s => s.id === id)?.first_name;
      
    toast.success(`${name} marked ${newStatus.toLowerCase()} for ${formatHumanDate(selectedDate)}`);
  };

  const getStatus = (id) => {
    const logKey = activeTab === 'students'
      ? `${selectedDate}_${selectedSubject}_${id}`
      : `${selectedDate}_${id}`;
    return attendanceLogs[logKey] || 'PRESENT'; // Default to PRESENT for demo flow
  };

  // Simulated QR Scan Action
  const handleTriggerQRScan = () => {
    setQrScanning(true);
    setScannedResult(null);
    
    setTimeout(() => {
      // Pick a random student or staff to scan
      let target;
      if (activeTab === 'students' && tenantStudents.length > 0) {
        target = tenantStudents[Math.floor(Math.random() * tenantStudents.length)];
      } else if (tenantStaff.length > 0) {
        target = tenantStaff[Math.floor(Math.random() * tenantStaff.length)];
      }

      if (target) {
        const logKey = activeTab === 'students'
          ? `${selectedDate}_${selectedSubject}_${target.id}`
          : `${selectedDate}_${target.id}`;
        const randomStatus = Math.random() > 0.15 ? 'PRESENT' : 'LATE';
        
        setAttendanceLogs(prev => ({
          ...prev,
          [logKey]: randomStatus
        }));
        
        setScannedResult({
          name: `${target.first_name} ${target.last_name}`,
          code: activeTab === 'students' ? target.admission_no : target.employee_id,
          role: activeTab === 'students' ? 'Student' : 'Staff',
          status: randomStatus
        });
        
        toast.success(`QR Check-in Success: ${target.first_name} marked ${randomStatus}!`);
      } else {
        toast.error('No records available to simulate scan.');
      }
      setQrScanning(false);
    }, 1500);
  };

  // Send absentee notification to parent
  const handleSendAbsenteeReminder = (student) => {
    const parent = sharedParents.find(p => p.id === student.parent_id);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: `Notifying parent of ${student.first_name}'s absence on ${formatHumanDate(selectedDate)}...`,
        success: `Absence alert sent to ${parent ? parent.first_name + ' ' + parent.last_name : 'guardian'} for ${student.first_name} ${student.last_name}!`,
        error: 'Failed to send notification'
      }
    );
  };

  // Bulk send absence notifications
  const handleBulkAbsenteeReminders = () => {
    const absentStudents = filteredStudents.filter(s => getStatus(s.id) === 'ABSENT');
    if (absentStudents.length === 0) {
      toast.info('No absentees found for this date. All students are present!');
      return;
    }
    absentStudents.forEach((s, i) => {
      setTimeout(() => handleSendAbsenteeReminder(s), i * 300);
    });
    toast.success(`Dispatching absence alerts for ${absentStudents.length} student(s) to their parents...`);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Attendance Management</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Track and manage presence for students and staff at <span className="text-accent font-bold">{activeTenant.name}</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="px-5 py-3 bg-slate-100 dark:bg-slate-800 border border-border text-text-primary text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 no-print"
          >
            <Printer size={14} className="text-text-secondary" />
            <span>Print Roster</span>
          </button>

          <button 
            onClick={() => setShowQRModal(true)}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 no-print"
          >
            <QrCode size={14} />
            <span>Scan QR Attendance</span>
          </button>
          
          <div className="flex items-center bg-bg-sidebar border border-border rounded-2xl p-1 no-print">
            <button 
              onClick={handlePrevDate}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-xl transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-black text-text-primary font-mono flex items-center gap-2">
              <Calendar size={12} className="text-accent" />
              {formatHumanDate(selectedDate)}
            </span>
            <button 
              onClick={handleNextDate}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-xl transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit">
        <button
          onClick={() => {
            setActiveTab('students');
            setSearchQuery('');
          }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'students' 
              ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Students
        </button>
        <button
          onClick={() => {
            setActiveTab('staff');
            setSearchQuery('');
          }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'staff' 
              ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Staff
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab === 'students' ? 'students by name or ID' : 'staff by name or employee ID'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 border border-border rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
            />
          </div>

          {activeTab === 'students' && (
            <>
              <div>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-bg-main border border-border rounded-2xl py-3.5 px-4 text-xs text-text-primary outline-none cursor-pointer"
                >
                  <option value="ALL">All Classes</option>
                  {teacherAllowedClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-bg-main border border-border rounded-2xl py-3.5 px-4 text-xs text-text-primary outline-none cursor-pointer"
                >
                  <option value="ALL">All Subjects</option>
                  {classSubjects.map(sub => (
                    <option key={sub.id} value={sub.code}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {activeTab === 'staff' && (
            <div className="md:col-span-2 flex items-center justify-end">
              <div className="flex items-center gap-2 text-[10px] font-black text-warning bg-warning/5 border border-warning/20 px-4 py-2 rounded-xl uppercase tracking-wider">
                <ShieldAlert size={14} />
                <span>Duty Roaster Mode Active</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Area / Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="animate-spin text-accent" size={32} />
            <span className="text-xs text-text-secondary font-bold uppercase tracking-wider animate-pulse">Syncing attendance roster...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                    <th className="pb-3 pl-2">{activeTab === 'students' ? 'Student' : 'Staff Member'}</th>
                    <th className="pb-3">{activeTab === 'students' ? 'Class' : 'Designation'}</th>
                    <th className="pb-3">{activeTab === 'students' ? 'Identifier' : 'Employee ID'}</th>
                    <th className="pb-3 text-right pr-2">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {activeTab === 'students' ? (
                    filteredStudents.map((stud) => {
                      const status = getStatus(stud.id);
                      return (
                        <tr key={stud.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black">
                              {stud.first_name[0]}{stud.last_name[0]}
                            </div>
                            <div>
                              <span>{stud.first_name} {stud.last_name}</span>
                              <span className="text-[9px] text-text-secondary block font-normal">Roll No: {stud.roll_no || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-4 font-semibold text-slate-700">
                            {getClassName(stud.class_id)}
                          </td>
                          <td className="py-4 font-mono text-text-secondary">{stud.admission_no}</td>
                          <td className="py-4 text-right pr-2">
                            <div className="inline-flex gap-1.5 bg-slate-50/50 border border-border p-1 rounded-xl">
                              {[
                                { status: 'PRESENT', label: 'Present', icon: CheckCircle, color: 'text-success hover:bg-success/15 hover:border-success/30', activeColor: 'bg-success/20 border-success/40 text-success' },
                                { status: 'LATE', label: 'Late', icon: Clock, color: 'text-warning hover:bg-warning/15 hover:border-warning/30', activeColor: 'bg-warning/20 border-warning/40 text-warning' },
                                { status: 'ABSENT', label: 'Absent', icon: XCircle, color: 'text-danger hover:bg-danger/15 hover:border-danger/30', activeColor: 'bg-danger/20 border-danger/40 text-danger' }
                              ].map((btn) => {
                                const isActive = status === btn.status;
                                return (
                                  <button
                                    key={btn.status}
                                    onClick={() => handleToggleStatus(stud.id, btn.status)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                                      isActive 
                                        ? btn.activeColor 
                                        : `border-transparent text-text-secondary ${btn.color}`
                                    }`}
                                  >
                                    <btn.icon size={11} />
                                    <span>{btn.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    filteredStaff.map((st) => {
                      const status = getStatus(st.id);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black">
                              {st.first_name[0]}{st.last_name[0]}
                            </div>
                            <div>
                              <span>{st.first_name} {st.last_name}</span>
                              <span className="text-[9px] text-text-secondary block font-normal">{st.email}</span>
                            </div>
                          </td>
                          <td className="py-4 font-semibold text-slate-700">
                            {st.designation}
                          </td>
                          <td className="py-4 font-mono text-text-secondary">{st.employee_id}</td>
                          <td className="py-4 text-right pr-2">
                            <div className="inline-flex gap-1.5 bg-slate-50/50 border border-border p-1 rounded-xl">
                              {[
                                { status: 'PRESENT', label: 'Present', icon: CheckCircle, color: 'text-success hover:bg-success/15 hover:border-success/30', activeColor: 'bg-success/20 border-success/40 text-success' },
                                { status: 'LATE', label: 'Late', icon: Clock, color: 'text-warning hover:bg-warning/15 hover:border-warning/30', activeColor: 'bg-warning/20 border-warning/40 text-warning' },
                                { status: 'ABSENT', label: 'Absent', icon: XCircle, color: 'text-danger hover:bg-danger/15 hover:border-danger/30', activeColor: 'bg-danger/20 border-danger/40 text-danger' }
                              ].map((btn) => {
                                const isActive = status === btn.status;
                                return (
                                  <button
                                    key={btn.status}
                                    onClick={() => handleToggleStatus(st.id, btn.status)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                                      isActive 
                                        ? btn.activeColor 
                                        : `border-transparent text-text-secondary ${btn.color}`
                                    }`}
                                  >
                                    <btn.icon size={11} />
                                    <span>{btn.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {((activeTab === 'students' && filteredStudents.length === 0) || 
              (activeTab === 'staff' && filteredStaff.length === 0)) && (
              <p className="text-center py-8 text-xs text-text-secondary">No matching records found for this filters.</p>
            )}
          </div>
        )}

        {/* Bulk Absentee Reminder Action */}
        {activeTab === 'students' && !loading && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-xs text-text-secondary">
              <span className="font-bold text-text-primary">{filteredStudents.length}</span> students listed • 
              <span className="text-danger font-bold ml-1">{filteredStudents.filter(s => getStatus(s.id) === 'ABSENT').length}</span> absent • 
              <span className="text-warning font-bold ml-1">{filteredStudents.filter(s => getStatus(s.id) === 'LATE').length}</span> late
            </div>
            {filteredStudents.filter(s => getStatus(s.id) === 'ABSENT').length > 0 && (
              <button
                onClick={handleBulkAbsenteeReminders}
                className="px-4 py-2 bg-danger hover:bg-danger/80 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <BellRing size={12} />
                <span>Notify All Absentee Parents ({filteredStudents.filter(s => getStatus(s.id) === 'ABSENT').length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* QR Code Scanner Dialog Modal */}
      <Modal
        open={showQRModal}
        onClose={() => {
          setShowQRModal(false);
          setScannedResult(null);
        }}
        title="Simulated QR Code Scanner"
        icon={<QrCode size={18} />}
        size="md"
      >
        <div className="space-y-6 text-center text-text-primary">
          <p className="text-xs text-text-secondary">
            Point QR Card to camera framework. Simulating checking in {activeTab === 'students' ? 'students' : 'staff'} using barcoded ID card.
          </p>

          {/* Camera Simulation Screen */}
          <div className="w-56 h-56 mx-auto bg-black rounded-3xl border border-border relative overflow-hidden flex items-center justify-center shadow-inner">
            {qrScanning ? (
              <div className="space-y-3">
                <RefreshCw className="animate-spin text-accent mx-auto" size={32} />
                <span className="text-[10px] font-black text-accent uppercase tracking-widest block">Decoding Code...</span>
              </div>
            ) : scannedResult ? (
              <div className="p-4 space-y-2 text-center animate-in fade-in duration-300">
                <CheckCircle2 className="text-success mx-auto" size={36} />
                <h4 className="text-xs font-bold text-text-primary leading-tight">{scannedResult.name}</h4>
                <p className="text-[9px] text-text-secondary font-mono">{scannedResult.code} ({scannedResult.role})</p>
                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase border mt-1 ${
                  scannedResult.status === 'PRESENT' 
                    ? 'bg-success/15 border-success/35 text-success' 
                    : 'bg-warning/15 border-warning/35 text-warning'
                }`}>
                  {scannedResult.status}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Camera className="text-text-secondary mx-auto opacity-30 animate-pulse" size={40} />
                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-widest block">Camera Offline</span>
              </div>
            )}

            {/* Laser Scanning Line */}
            {qrScanning && (
              <div className="absolute left-0 right-0 h-0.5 bg-accent/80 shadow-[0_0_10px_rgba(59,130,246,0.8)] top-0 animate-bounce"></div>
            )}
            
            {/* Frame borders */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl"></div>
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br"></div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleTriggerQRScan}
              disabled={qrScanning}
              className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Camera size={14} />
              <span>{qrScanning ? 'Scanning...' : 'Simulate Card Detect'}</span>
            </button>
            
            {scannedResult && (
              <button
                onClick={() => setScannedResult(null)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-xs font-bold rounded-xl border border-border transition-all flex items-center justify-center"
                title="Scan Next"
              >
                Scan Next
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
