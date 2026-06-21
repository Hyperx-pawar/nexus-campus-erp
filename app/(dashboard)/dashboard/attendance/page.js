'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Clock, Search, Calendar, ChevronLeft, ChevronRight, 
  QrCode, UserCheck, ShieldAlert, Sparkles, RefreshCw, Eye, Camera, CheckCircle2, Loader2, BellRing,
  Printer, Lock, Unlock
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

export default function AttendancePage() {
  const {
    activeTenant, sharedStudents, sharedStaff, sharedClasses, sharedParents,
    activeRole, activeUser, sharedSubjects, sharedNotifications, setSharedNotifications,
    sharedAttendanceLogs, setSharedAttendanceLogs, savedAttendanceRegistries, setSavedAttendanceRegistries
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'staff' | 'monthly_report'
  const [selectedDate, setSelectedDate] = useState('2026-05-24');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);

  // Edit/Lock states
  const [isEditing, setIsEditing] = useState(false);

  // Monthly report controls
  const [reportType, setReportType] = useState('students'); // 'students' | 'staff'
  const [reportMonth, setReportMonth] = useState('05');
  const [reportYear, setReportYear] = useState('2026');

  // Daily attendance state: key is 'date_id', value is 'PRESENT' | 'ABSENT' | 'LATE'
  const attendanceLogs = sharedAttendanceLogs || {};
  const setAttendanceLogs = setSharedAttendanceLogs;

  // Simulate loading records from database and reset edit states when filters change
  useEffect(() => {
    setLoading(true);
    setIsEditing(false);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600); // 600ms load simulation
    return () => clearTimeout(timer);
  }, [selectedDate, selectedClass, selectedSubject, activeTab]);

  // Get unique key for the current class/subject/date or staff roster
  const getCurrentRegistryKey = () => {
    if (activeTab === 'students') {
      return `student_${selectedDate}_${selectedClass}_${selectedSubject}`;
    } else {
      return `staff_${selectedDate}`;
    }
  };

  const currentRegistryKey = getCurrentRegistryKey();
  const isCurrentRegistrySaved = !!savedAttendanceRegistries?.[currentRegistryKey];
  const canModifyAttendance = !isCurrentRegistrySaved || isEditing;

  const handleSaveAttendance = () => {
    const key = getCurrentRegistryKey();
    setSavedAttendanceRegistries(prev => ({
      ...prev,
      [key]: true
    }));
    setIsEditing(false);
    
    const rosterType = activeTab === 'students' 
      ? `Student Attendance for ${getClassName(selectedClass)} (${selectedSubject === 'ALL' ? 'All Subjects' : selectedSubject})`
      : 'Staff Daily Attendance';
      
    toast.success(`${rosterType} saved and locked successfully!`);
  };

  const handleEditAttendance = () => {
    setIsEditing(true);
    toast.info('Attendance sheet unlocked for editing.');
  };

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

  const getMonthlyReportData = () => {
    const isStudents = reportType === 'students';
    const list = isStudents ? tenantStudents : tenantStaff;
    
    return list.map(item => {
      let basePresent = 18;
      let baseAbsent = 1;
      let baseLate = 1;
      
      if (isStudents) {
        if (item.id === 'stud-1') {
          basePresent = 20; baseAbsent = 0; baseLate = 0;
        } else if (item.id === 'stud-2') {
          basePresent = 17; baseAbsent = 2; baseLate = 1;
        } else if (item.id === 'stud-3') {
          basePresent = 15; baseAbsent = 3; baseLate = 2;
        } else {
          basePresent = 19; baseAbsent = 1; baseLate = 0;
        }
      } else {
        if (item.id === 'staff-3') {
          basePresent = 17; baseAbsent = 2; baseLate = 1;
        } else {
          basePresent = 19; baseAbsent = 0; baseLate = 1;
        }
      }

      // Count dates in selected month
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      
      for (let day = 1; day <= 31; day++) {
        const dateStr = `${reportYear}-${reportMonth}-${String(day).padStart(2, '0')}`;
        
        if (isStudents) {
          const key = `${dateStr}_ALL_${item.id}`;
          if (attendanceLogs[key]) {
            if (attendanceLogs[key] === 'PRESENT') presentCount++;
            else if (attendanceLogs[key] === 'ABSENT') absentCount++;
            else if (attendanceLogs[key] === 'LATE') lateCount++;
          }
        } else {
          const key = `${dateStr}_${item.id}`;
          if (attendanceLogs[key]) {
            if (attendanceLogs[key] === 'PRESENT') presentCount++;
            else if (attendanceLogs[key] === 'ABSENT') absentCount++;
            else if (attendanceLogs[key] === 'LATE') lateCount++;
          }
        }
      }

      const totalLogged = presentCount + absentCount + lateCount;
      if (totalLogged > 0) {
        const fillerPresent = Math.max(0, 20 - totalLogged);
        presentCount += fillerPresent;
      } else {
        presentCount = basePresent;
        absentCount = baseAbsent;
        lateCount = baseLate;
      }
      
      const totalDays = presentCount + absentCount + lateCount;
      const rate = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : '0.0';
      
      return {
        id: item.id,
        name: `${item.first_name} ${item.last_name}`,
        identifier: isStudents ? item.admission_no : item.employee_id,
        subLabel: isStudents ? getClassName(item.class_id) : item.designation,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        totalDays,
        rate
      };
    });
  };

  // Toggle status
  const handleToggleStatus = (id, newStatus) => {
    if (!canModifyAttendance) {
      toast.error("Roster is locked. Click 'Edit Attendance' at the top to modify.");
      return;
    }

    const logKey = activeTab === 'students'
      ? `${selectedDate}_${selectedSubject}_${id}`
      : `${selectedDate}_${id}`;
      
    setAttendanceLogs(prev => {
      const nextVal = prev[logKey] === newStatus ? undefined : newStatus;
      const updated = {
        ...prev,
        [logKey]: nextVal
      };
      
      if (activeTab === 'students') {
        const allKey = `${selectedDate}_ALL_${id}`;
        updated[allKey] = nextVal;
      }
      return updated;
    });
    
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
    if (!canModifyAttendance) {
      toast.error("Roster is locked. Click 'Edit Attendance' at the top to modify.");
      return;
    }

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
    
    if (parent && setSharedNotifications) {
      const notifId = `notif-${Date.now()}-${student.id}`;
      setSharedNotifications(prev => [
        {
          id: notifId,
          tenant_id: activeTenant.id,
          recipient_id: parent.id,
          title: `🚨 Absence Alert: ${student.first_name} ${student.last_name}`,
          body: `${student.first_name} was marked ABSENT on ${formatHumanDate(selectedDate)} for ${selectedSubject !== 'ALL' ? selectedSubject : 'daily schedule'}.`,
          type: 'ABSENCE',
          date: selectedDate,
          read: false
        },
        ...prev
      ]);
    }

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
      <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit no-print">
        <button
          onClick={() => {
            setActiveTab('students');
            setSearchQuery('');
          }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'students' 
              ? 'bg-white dark:bg-slate-700 text-accent border border-border shadow-sm font-black' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Daily Students
        </button>
        <button
          onClick={() => {
            setActiveTab('staff');
            setSearchQuery('');
          }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'staff' 
              ? 'bg-white dark:bg-slate-700 text-accent border border-border shadow-sm font-black' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Daily Staff
        </button>
        <button
          onClick={() => {
            setActiveTab('monthly_report');
            setSearchQuery('');
          }}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'monthly_report' 
              ? 'bg-white dark:bg-slate-700 text-accent border border-border shadow-sm font-black' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Monthly Report
        </button>
      </div>

      {/* Today's Summary Overview Stats Cards */}
      {activeTab !== 'monthly_report' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Students Today Summary Card */}
          {(() => {
            const sTotal = tenantStudents.length;
            const sPresent = tenantStudents.filter(s => {
              const logKey = `${selectedDate}_${selectedSubject}_${s.id}`;
              return (attendanceLogs[logKey] || 'PRESENT') === 'PRESENT';
            }).length;
            const sAbsent = tenantStudents.filter(s => {
              const logKey = `${selectedDate}_${selectedSubject}_${s.id}`;
              return attendanceLogs[logKey] === 'ABSENT';
            }).length;
            const sLate = tenantStudents.filter(s => {
              const logKey = `${selectedDate}_${selectedSubject}_${s.id}`;
              return attendanceLogs[logKey] === 'LATE';
            }).length;
            const sPct = sTotal > 0 ? ((sPresent / sTotal) * 100).toFixed(1) : '0.0';

            return (
              <div className="p-5 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-md border border-border rounded-3xl relative overflow-hidden group hover:border-accent/15 transition-all">
                <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-success/5 blur-xl group-hover:bg-success/10 transition-all"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                    Student Attendance Today
                  </span>
                  <span className="text-xs font-mono font-bold text-success bg-success/10 px-2 py-0.5 rounded-md">{sPct}% Present</span>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="p-3 bg-bg-main border border-border rounded-2xl text-center">
                    <span className="text-[8px] text-text-secondary uppercase tracking-wider block font-bold">Total</span>
                    <span className="text-sm font-black text-text-primary block mt-0.5">{sTotal}</span>
                  </div>
                  <div className="p-3 bg-bg-main border border-border rounded-2xl text-center">
                    <span className="text-[8px] text-success uppercase tracking-wider block font-bold">Present</span>
                    <span className="text-sm font-black text-success block mt-0.5">{sPresent}</span>
                  </div>
                  <div className="p-3 bg-bg-main border border-border rounded-2xl text-center">
                    <span className="text-[8px] text-danger uppercase tracking-wider block font-bold">Absent</span>
                    <span className="text-sm font-black text-danger block mt-0.5">{sAbsent}</span>
                  </div>
                  <div className="p-3 bg-bg-main border border-border rounded-2xl text-center">
                    <span className="text-[8px] text-warning uppercase tracking-wider block font-bold">Late</span>
                    <span className="text-sm font-black text-warning block mt-0.5">{sLate}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Staff Today Summary Card */}
          {(() => {
            const stTotal = tenantStaff.length;
            const stPresent = tenantStaff.filter(st => {
              const logKey = `${selectedDate}_${st.id}`;
              return (attendanceLogs[logKey] || 'PRESENT') === 'PRESENT';
            }).length;
            const stAbsent = tenantStaff.filter(st => {
              const logKey = `${selectedDate}_${st.id}`;
              return attendanceLogs[logKey] === 'ABSENT';
            }).length;
            const stLate = tenantStaff.filter(st => {
              const logKey = `${selectedDate}_${st.id}`;
              return attendanceLogs[logKey] === 'LATE';
            }).length;
            const stPct = stTotal > 0 ? ((stPresent / stTotal) * 100).toFixed(1) : '0.0';

            return (
              <div className="p-5 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-md border border-border rounded-3xl relative overflow-hidden group hover:border-accent/15 transition-all">
                <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-accent/5 blur-xl group-hover:bg-accent/10 transition-all"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span>
                    Staff Duty Status Today
                  </span>
                  <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">{stPct}% Active</span>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="p-3 bg-bg-main border border-border rounded-2xl text-center">
                    <span className="text-[8px] text-text-secondary uppercase tracking-wider block font-bold">Total</span>
                    <span className="text-sm font-black text-text-primary block mt-0.5">{stTotal}</span>
                  </div>
                  <div className="p-3 bg-bg-main border border-border rounded-2xl text-center">
                    <span className="text-[8px] text-success uppercase tracking-wider block font-bold">Active</span>
                    <span className="text-sm font-black text-success block mt-0.5">{stPresent}</span>
                  </div>
                  <div className="p-3 bg-bg-main border border-border rounded-2xl text-center">
                    <span className="text-[8px] text-danger uppercase tracking-wider block font-bold">Absent</span>
                    <span className="text-sm font-black text-danger block mt-0.5">{stAbsent}</span>
                  </div>
                  <div className="p-3 bg-bg-main border border-border rounded-2xl text-center">
                    <span className="text-[8px] text-warning uppercase tracking-wider block font-bold">Late</span>
                    <span className="text-sm font-black text-warning block mt-0.5">{stLate}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Save/Edit Lock Action Banner */}
      {activeTab !== 'monthly_report' && (
        <div className="p-5 bg-white dark:bg-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3">
            {activeTab === 'students' && selectedClass === 'ALL' ? (
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-text-secondary shrink-0">
                <ShieldAlert size={20} />
              </div>
            ) : isCurrentRegistrySaved ? (
              isEditing ? (
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 animate-pulse">
                  <Unlock size={20} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success shrink-0">
                  <Lock size={20} />
                </div>
              )
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <ShieldAlert size={20} />
              </div>
            )}
            <div>
              {activeTab === 'students' && selectedClass === 'ALL' ? (
                <>
                  <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Select Class to Save</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">Please choose a specific Class and Subject from the filters below to take and save attendance.</p>
                </>
              ) : isCurrentRegistrySaved ? (
                isEditing ? (
                  <>
                    <h4 className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
                      Editing Attendance
                    </h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Editing saved records for <span className="font-bold text-text-primary">{activeTab === 'students' ? `${getClassName(selectedClass)} (${selectedSubject === 'ALL' ? 'All Subjects' : selectedSubject})` : 'Staff Daily Roster'}</span>.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-xs font-black text-success uppercase tracking-wider">Attendance Saved & Locked</h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Roster finalized for <span className="font-bold text-text-primary">{activeTab === 'students' ? `${getClassName(selectedClass)} (${selectedSubject === 'ALL' ? 'All Subjects' : selectedSubject})` : 'Staff Daily Roster'}</span> on {formatHumanDate(selectedDate)}.
                    </p>
                  </>
                )
              ) : (
                <>
                  <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider">Unsaved Attendance Sheet</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Roster not finalized yet for <span className="font-bold text-text-primary">{activeTab === 'students' ? `${getClassName(selectedClass)} (${selectedSubject === 'ALL' ? 'All Subjects' : selectedSubject})` : 'Staff Daily Roster'}</span>.
                  </p>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
            {activeTab === 'students' && selectedClass === 'ALL' ? (
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-border">
                Filter Required
              </span>
            ) : isCurrentRegistrySaved ? (
              isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-text-primary text-xs font-bold rounded-xl transition-all border border-border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAttendance}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-md shadow-accent/10 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle size={14} />
                    <span>Save Changes</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditAttendance}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-700 border border-border text-text-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Unlock size={14} className="text-text-secondary" />
                  <span>Edit Attendance</span>
                </button>
              )
            ) : (
              <button
                onClick={handleSaveAttendance}
                className="px-5 py-2.5 bg-success hover:bg-success/90 text-white text-xs font-bold rounded-xl shadow-md shadow-success/10 transition-all flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                <span>Save Attendance</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'monthly_report' ? (
        /* Filters & Search - Daily Attendance View */
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
                                      disabled={!canModifyAttendance}
                                      onClick={() => handleToggleStatus(stud.id, btn.status)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                                        isActive 
                                          ? btn.activeColor 
                                          : `border-transparent text-text-secondary ${canModifyAttendance ? btn.color : 'opacity-40'}`
                                      } ${!canModifyAttendance ? 'cursor-not-allowed' : ''}`}
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
                                      disabled={!canModifyAttendance}
                                      onClick={() => handleToggleStatus(st.id, btn.status)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                                        isActive 
                                          ? btn.activeColor 
                                          : `border-transparent text-text-secondary ${canModifyAttendance ? btn.color : 'opacity-40'}`
                                      } ${!canModifyAttendance ? 'cursor-not-allowed' : ''}`}
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
                  disabled={!isCurrentRegistrySaved}
                  onClick={handleBulkAbsenteeReminders}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    isCurrentRegistrySaved 
                      ? 'bg-danger hover:bg-danger/80' 
                      : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-text-secondary opacity-50'
                  }`}
                  title={!isCurrentRegistrySaved ? "Save/finalize attendance first before notifying parents" : ""}
                >
                  <BellRing size={12} />
                  <span>Notify All Absentee Parents ({filteredStudents.filter(s => getStatus(s.id) === 'ABSENT').length})</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Monthly Attendance Report View */
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
          {/* Controls bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center no-print">
            {/* Person Type Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full">
              <button
                type="button"
                onClick={() => setReportType('students')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  reportType === 'students'
                    ? 'bg-white dark:bg-slate-700 text-accent shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Students
              </button>
              <button
                type="button"
                onClick={() => setReportType('staff')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  reportType === 'staff'
                    ? 'bg-white dark:bg-slate-700 text-accent shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Staff
              </button>
            </div>

            {/* Month Selector */}
            <div>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="w-full bg-bg-main border border-border rounded-2xl py-3.5 px-4 text-xs text-text-primary outline-none cursor-pointer"
              >
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            {/* Search filter input */}
            <div className="relative group/search flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
              <input
                type="text"
                placeholder={`Search report by name...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-main border border-border rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary"
              />
            </div>

            {/* Print Button */}
            <div className="flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 border border-border text-text-primary text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              >
                <Printer size={14} />
                <span>Print Monthly Report</span>
              </button>
            </div>
          </div>

          {/* Report table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-accent" size={32} />
              <span className="text-xs text-text-secondary font-bold uppercase tracking-wider animate-pulse">Analyzing monthly logs...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Printed heading visible ONLY in print mode */}
              <div className="hidden print:block text-center space-y-2 pb-4 border-b border-slate-300">
                <h2 className="text-xl font-bold text-black">{activeTenant.name}</h2>
                <h3 className="text-sm font-semibold text-slate-700">
                  Monthly Attendance Audit Report - {reportType === 'students' ? 'Students' : 'Staff'}
                </h3>
                <p className="text-xs text-slate-500">
                  Period: {reportMonth === '05' ? 'May' : reportMonth === '06' ? 'June' : reportMonth} {reportYear} • Target count: {getMonthlyReportData().length} active registries
                </p>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                      <th className="pb-3 pl-2">Name</th>
                      <th className="pb-3">{reportType === 'students' ? 'Class' : 'Designation'}</th>
                      <th className="pb-3">Identifier ID</th>
                      <th className="pb-3 text-right">Present Days</th>
                      <th className="pb-3 text-right">Absent Days</th>
                      <th className="pb-3 text-right">Late Days</th>
                      <th className="pb-3 text-right pr-2">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {(() => {
                      const reportRows = getMonthlyReportData().filter(row => 
                        row.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        row.identifier.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      if (reportRows.length === 0) {
                        return (
                          <tr>
                            <td colSpan="7" className="p-8 text-center text-xs text-text-secondary font-bold">
                              No records found for this selection
                            </td>
                          </tr>
                        );
                      }

                      return reportRows.map((row) => {
                        const rateNum = parseFloat(row.rate);
                        const isHealthy = rateNum >= 75.0;

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 pl-2 font-bold text-text-primary flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black print:hidden">
                                {row.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <span className="block font-bold text-text-primary">{row.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 font-semibold text-slate-700">{row.subLabel}</td>
                            <td className="py-3.5 font-mono text-text-secondary">{row.identifier}</td>
                            <td className="py-3.5 text-right font-bold text-success">{row.present} days</td>
                            <td className="py-3.5 text-right font-bold text-danger">{row.absent} days</td>
                            <td className="py-3.5 text-right font-bold text-warning">{row.late} days</td>
                            <td className="py-3.5 text-right pr-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-block border ${
                                isHealthy
                                  ? 'bg-success/10 border-success/20 text-success'
                                  : 'bg-danger/10 border-danger/20 text-danger'
                              }`}>
                                {row.rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
              disabled={qrScanning || !canModifyAttendance}
              className={`flex-1 py-3 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                canModifyAttendance 
                  ? 'bg-accent hover:bg-accent-hover' 
                  : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-50'
              }`}
            >
              <Camera size={14} />
              <span>{qrScanning ? 'Scanning...' : !canModifyAttendance ? 'Roster Locked' : 'Simulate Card Detect'}</span>
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
