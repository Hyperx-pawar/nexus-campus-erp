'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, BookOpen, Calendar, ClipboardList, Library, Home, Bus, 
  Briefcase, Wallet, FileBox, Settings, Activity, CheckCircle2, 
  Clock, Plus, ArrowRight, ShieldCheck, Star, Sparkles, BookOpenCheck,
  AlertTriangle, CreditCard, ChevronRight, UserCheck, Megaphone, Package,
  BellRing, Receipt, Printer, Smartphone, Globe, Lock, Zap, IndianRupee,
  QrCode, Building2, X, RefreshCw, BadgeCheck, History, Navigation
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { compressImage } from '@/lib/storage';


// ── Number → Words helper (Indian system) ──────────────────────────────────
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numToWords(n) {
  if (n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + numToWords(-n);
  let words = '';
  if (n >= 10000000) { words += numToWords(Math.floor(n / 10000000)) + ' Crore '; n %= 10000000; }
  if (n >= 100000)   { words += numToWords(Math.floor(n / 100000)) + ' Lakh '; n %= 100000; }
  if (n >= 1000)     { words += numToWords(Math.floor(n / 1000)) + ' Thousand '; n %= 1000; }
  if (n >= 100)      { words += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
  if (n >= 20)       { words += tens[Math.floor(n / 10)] + ' '; n %= 10; }
  if (n > 0)         { words += ones[n] + ' '; }
  return words.trim();
}

function numberToWords(amount) {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let result = numToWords(rupees);
  if (paise > 0) result += ` and ${numToWords(paise)} Paise`;
  return result;
}
// ────────────────────────────────────────────────────────────────────────────

// ==========================================
// 1. TEACHER DASHBOARD
// ==========================================
function TeacherDashboard() {
  const { activeUser, activeTenant, sharedClasses, sharedStaff, sharedSubjects, activeRole, sharedNotices } = useAuth();

  
  // Resolve active teacher staff profile
  const myStaffRecord = React.useMemo(() => {
    return sharedStaff.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
  }, [sharedStaff, activeTenant.id, activeUser]);
  const myStaffId = myStaffRecord ? myStaffRecord.id : null;

  // Teacher classes
  const myClasses = React.useMemo(() => {
    const mySubjectClassIds = sharedSubjects.filter(sub => sub.teacher_id === myStaffId && sub.tenant_id === activeTenant.id).map(sub => sub.class_id);
    const myOwnClass = sharedClasses.find(c => c.class_teacher_id === myStaffId && c.tenant_id === activeTenant.id);
    return sharedClasses.filter(c => {
      if (c.tenant_id !== activeTenant.id) return false;
      return mySubjectClassIds.includes(c.id) || (myOwnClass && c.id === myOwnClass.id);
    });
  }, [activeTenant.id, sharedClasses, sharedSubjects, myStaffId]);

  // Today's lectures list
  const classesList = React.useMemo(() => {
    return myClasses.map((cls, idx) => {
      // Find subjects taught by this teacher in this class
      const subs = sharedSubjects.filter(s => s.class_id === cls.id && s.teacher_id === myStaffId);
      const subNames = subs.map(s => s.name).join(', ') || 'Class Teaching';
      return {
        id: cls.id,
        name: `${cls.name} (${subNames})`,
        students: 25 + (idx * 6), 
        time: idx === 0 ? '09:30 AM - 10:15 AM' : idx === 1 ? '11:00 AM - 11:45 AM' : '01:30 PM - 02:15 PM',
        room: `L-10${idx + 1}`
      };
    });
  }, [myClasses, myStaffId, sharedSubjects]);

  const totalStudentsCount = React.useMemo(() => {
    return classesList.reduce((sum, c) => sum + c.students, 0);
  }, [classesList]);

  const [pendingGrading] = useState([
    { id: 101, title: 'Term Assessment File', subject: 'Class Assignment', count: 12, dueDate: 'Today' },
    { id: 102, title: 'Syllabus Quiz', subject: 'Subject Evaluation', count: 8, dueDate: 'Tomorrow' }
  ]);

  const handleGrade = (title) => {
    toast.success(`Loaded grading sheets for "${title}"`);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Faculty Dashboard</h2>
        <p className="text-text-secondary text-sm font-medium mt-1">Academic control center for {activeUser?.name || 'Professor'}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Classes Handled', value: String(myClasses.length), desc: 'Active batches', icon: BookOpen },
          { label: 'Total Students Under Care', value: String(totalStudentsCount), desc: 'Under instruction', icon: Users },
          { label: 'Academic Institution', value: activeTenant.name, desc: 'Your active school', icon: Home }
        ].map((k, i) => (
          <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><k.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3">{k.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Classes List */}
        <div className="lg:col-span-2 p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            <span>Today's Lecture Timetable</span>
          </h3>
          <div className="space-y-3">
            {classesList.map((cls) => (
              <div key={cls.id} className="p-4 bg-bg-main/50 border border-border hover:border-accent/15 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-text-primary">{cls.name}</p>
                  <p className="text-[10px] text-text-secondary font-bold">Room: {cls.room} • {cls.students} students</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-accent font-semibold">{cls.time}</span>
                  <Link href="/dashboard/attendance" className="px-3 py-1.5 bg-accent/10 text-accent text-[10px] font-bold rounded-lg border border-accent/20 hover:bg-accent hover:text-white transition-all">
                    Mark Attendance
                  </Link>
                </div>
              </div>
            ))}
            {classesList.length === 0 && (
              <p className="text-xs text-text-secondary italic text-center py-8">No lectures scheduled today for your classes.</p>
            )}
          </div>
        </div>

        {/* Grading List */}
        <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
          <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <ClipboardList size={14} className="text-accent" />
            <span>Pending Assessments</span>
          </h3>
          <div className="space-y-3">
            {pendingGrading.map(g => (
              <div key={g.id} className="p-4 bg-slate-50/50 border border-border rounded-xl hover:border-accent/20 transition-all flex flex-col gap-2">
                <div>
                  <p className="text-xs font-bold text-text-primary">{g.title}</p>
                  <span className="text-[9px] text-text-secondary uppercase font-black">{g.subject}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span className="text-danger font-bold">Due: {g.dueDate} ({g.count} submissions)</span>
                  <button onClick={() => handleGrade(g.title)} className="text-accent hover:underline flex items-center gap-1 font-bold">
                    Grade <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teacher Announcements Notice Board */}
      <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
        <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
          <Megaphone size={16} className="text-accent" />
          <span>Faculty & Staff Circulars</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(() => {
            const staffNotices = (sharedNotices || []).filter(n => n.tenant_id === activeTenant.id && (n.target === 'ALL' || n.target === 'STAFF' || !n.target));
            if (staffNotices.length === 0) {
              return (
                <p className="text-xs text-text-secondary italic py-8 text-center border border-dashed border-border rounded-2xl col-span-3">
                  No active announcements today.
                </p>
              );
            }
            return staffNotices.map((notice) => (
              <div key={notice.id} className="p-5 bg-bg-sidebar border border-border rounded-2xl space-y-3 hover:border-accent/10 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-text-primary">{notice.title}</h4>
                    <span className="text-[9px] text-text-secondary opacity-50 font-bold">{notice.date}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">{notice.body}</p>
                </div>
                <div className="flex items-center justify-between text-[8px] text-text-secondary uppercase tracking-widest pt-2 border-t border-border/40 mt-2">
                  <span className="font-black text-accent">{notice.author}</span>
                  <span className="px-1.5 py-0.5 bg-accent/10 text-accent font-black rounded">{notice.target || 'ALL'}</span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. STUDENT DASHBOARD
// ==========================================
function StudentDashboard() {
  const { 
    activeUser, 
    activeTenant, 
    sharedStudents, 
    sharedClasses, 
    sharedSubjects, 
    sharedCirculations, 
    sharedFeeRecords,
    sharedHostelInventoryAllocations,
    sharedStudentFeeAddons,
    sharedNotices,
    sharedTransportRoutes,
    sharedFinalExamsPublished,
    sharedAcademicRecords,
    sharedClassTestRecords,
    sharedStudentHistory,
    sharedAttendanceLogs
  } = useAuth();
  const [selectedTrackRoute, setSelectedTrackRoute] = useState(null);
  const activeTrackedRoute = useMemo(() => {
    if (!selectedTrackRoute) return null;
    return (sharedTransportRoutes || []).find(r => r.id === selectedTrackRoute.id);
  }, [selectedTrackRoute, sharedTransportRoutes]);

  // Find active student record
  const myStudentProfile = useMemo(() => {
    return sharedStudents.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
  }, [sharedStudents, activeTenant.id, activeUser]);

  const myHostelItems = useMemo(() => {
    if (!myStudentProfile) return [];
    return (sharedHostelInventoryAllocations || []).filter(a => a.studentId === myStudentProfile.id);
  }, [myStudentProfile, sharedHostelInventoryAllocations]);

  const isHostelResident = useMemo(() => {
    if (!myStudentProfile) return false;
    const addons = sharedStudentFeeAddons?.[myStudentProfile.id];
    return addons?.hostel?.enabled === true || myHostelItems.length > 0;
  }, [myStudentProfile, sharedStudentFeeAddons, myHostelItems]);

  const studentNotices = useMemo(() => {
    return (sharedNotices || []).filter(n => {
      if (n.tenant_id !== activeTenant.id) return false;
      const target = n.target || 'ALL';
      return target === 'ALL' || target === 'STUDENT';
    });
  }, [sharedNotices, activeTenant.id]);

  const myTransportRoute = useMemo(() => {
    if (!myStudentProfile) return null;
    const addons = sharedStudentFeeAddons?.[myStudentProfile.id];
    if (!addons?.transport?.enabled || !addons?.transport?.routeId) return null;
    return (sharedTransportRoutes || []).find(r => r.id === addons.transport.routeId && r.tenant_id === activeTenant.id);
  }, [myStudentProfile, sharedStudentFeeAddons, sharedTransportRoutes, activeTenant.id]);




  const studentClass = useMemo(() => {
    if (!myStudentProfile) return null;
    return sharedClasses.find(c => c.id === myStudentProfile.class_id && c.tenant_id === activeTenant.id);
  }, [myStudentProfile, sharedClasses, activeTenant.id]);

  // Student subjects (courses) with dynamic attendance calculations
  const studentCourses = useMemo(() => {
    if (!myStudentProfile) return [
      { id: 1, code: 'PH-101', name: 'Introductory Mechanics', progress: 85, teacher: 'Prof. Rajesh Iyer', attendance: '18/20 days (90.0%)' },
      { id: 2, code: 'CY-102', name: 'Organic Chemistry Core', progress: 60, teacher: 'Dr. Ramesh Kumar', attendance: '17/20 days (85.0%)' }
    ];

    const logs = sharedAttendanceLogs || {};
    
    return sharedSubjects
      .filter(sub => sub.class_id === myStudentProfile.class_id && sub.tenant_id === activeTenant.id)
      .map((sub, idx) => {
        // Count actual logs for this subject and student
        let present = 0;
        let absent = 0;
        let late = 0;
        
        // Loop over known dates in May 2026 to scan logs
        const dates = ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'];
        dates.forEach(date => {
          const key = `${date}_${sub.code}_${myStudentProfile.id}`;
          if (logs[key]) {
            if (logs[key] === 'PRESENT') present++;
            else if (logs[key] === 'ABSENT') absent++;
            else if (logs[key] === 'LATE') late++;
          }
        });
        
        const totalLogged = present + absent + late;
        let totalPresent, totalAbsent, totalLate;
        
        if (totalLogged > 0) {
          totalPresent = present + 15;
          totalAbsent = absent;
          totalLate = late;
        } else {
          totalPresent = idx === 0 ? 19 : idx === 1 ? 17 : 18;
          totalAbsent = idx === 0 ? 1 : idx === 1 ? 2 : 1;
          totalLate = idx === 0 ? 0 : idx === 1 ? 1 : 1;
        }
        
        const totalDays = totalPresent + totalAbsent + totalLate;
        const rate = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : '0.0';
        
        return {
          id: sub.id,
          code: sub.code,
          name: sub.name,
          progress: 85 - (idx * 15),
          teacher: 'Subject Teacher',
          attendance: `${totalPresent}/${totalDays} days (${rate}%)`
        };
      });
  }, [myStudentProfile, sharedSubjects, activeTenant.id, sharedAttendanceLogs]);

  // Outstanding dues
  const outstandingDues = useMemo(() => {
    if (!myStudentProfile) return '₹0.00';
    const fee = sharedFeeRecords[myStudentProfile.id] || { remaining: (myStudentProfile.totalFee || 32000) - (myStudentProfile.paidFee || 0) };
    return `₹${fee.remaining.toLocaleString('en-IN')}`;
  }, [myStudentProfile, sharedFeeRecords]);

  // Library borrows
  const libraryBorrows = useMemo(() => {
    if (!myStudentProfile) return '0 Books';
    const count = sharedCirculations.filter(c => c.student_id === myStudentProfile.id && c.tenant_id === activeTenant.id && c.status === 'ISSUED').length;
    return `${count} Book${count !== 1 ? 's' : ''}`;
  }, [myStudentProfile, sharedCirculations, activeTenant.id]);

  const attendanceAvg = myStudentProfile ? myStudentProfile.initialAttendance || '85%' : '88.5%';

  const myAcademicRecords = useMemo(() => {
    if (!myStudentProfile) return [];
    return sharedAcademicRecords[myStudentProfile.id] || [];
  }, [myStudentProfile, sharedAcademicRecords]);

  const myClassTests = useMemo(() => {
    if (!myStudentProfile) return [];
    return sharedClassTestRecords[myStudentProfile.id] || [];
  }, [myStudentProfile, sharedClassTestRecords]);

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Student Academic Desk</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">Portal for {myStudentProfile ? `${myStudentProfile.first_name} ${myStudentProfile.last_name}` : activeUser?.name || 'Student'}.</p>
        </div>
        <div className="flex items-center gap-2 bg-bg-sidebar border border-border px-4 py-2 rounded-2xl">
          <UserCheck size={14} className="text-accent" />
          <span className="text-[11px] font-bold text-text-primary">Class: {studentClass ? studentClass.name : 'CBSE General'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Attendance Average', value: attendanceAvg, desc: 'Threshold limit 75%', icon: UserCheck, color: 'text-success' },
          { label: 'Current GPA Score', value: '8.4 / 10.0', desc: 'Top 15% of class', icon: Star, color: 'text-warning' },
          { label: 'Library Borrows', value: libraryBorrows, desc: 'Active issued items', icon: Library, color: 'text-accent' },
          { label: 'Outstanding Dues', value: outstandingDues, desc: 'Remaining unpaid term fees', icon: Wallet, color: 'text-success' }
        ].map((k, i) => (
          <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
              <div className={`p-2 bg-accent/10 rounded-xl ${k.color}`}><k.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3">{k.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enrolled Courses */}
        <div className="lg:col-span-2 p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">My Semester Subjects</h3>
          <div className="space-y-3">
            {studentCourses.map(c => (
              <div key={c.id} className="p-4 bg-bg-main/40 border border-border rounded-2xl space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded font-black">{c.code}</span>
                    <h4 className="text-sm font-bold text-text-primary mt-1">{c.name}</h4>
                    <p className="text-[10px] text-text-secondary">Instructor: {c.teacher}</p>
                    {/* Dynamic subject-wise attendance total */}
                    <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/40 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-900/30 px-2 py-0.5 rounded-lg w-fit">
                      <UserCheck size={11} />
                      <span>Attendance: {c.attendance}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-text-primary">{c.progress}% completed</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${c.progress}%` }}></div>
                </div>
              </div>
            ))}
            {studentCourses.length === 0 && (
              <p className="text-xs text-text-secondary italic text-center py-8">No subjects registered for your class.</p>
            )}
          </div>
        </div>

        {/* Calendar and Deadlines */}
        <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
          <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider">Assignments & Submissions</h3>
          <div className="space-y-3">
            {[
              { title: 'Mechanics Problem Set 3', due: 'May 28', sub: 'Physics' },
              { title: 'Practical Report: Esters', due: 'May 30', sub: 'Chemistry' }
            ].map((asg, idx) => (
              <div key={idx} className="p-3 bg-slate-50/50 border border-border rounded-xl flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-text-primary">{asg.title}</p>
                  <span className="text-[9px] text-text-secondary uppercase">{asg.sub}</span>
                </div>
                <span className="text-[10px] text-warning font-semibold whitespace-nowrap">Due: {asg.due}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Academic Marks Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Class Tests */}
        <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={14} className="text-accent" />
            <span>My Class Test Marks</span>
          </h3>
          <div className="space-y-3">
            {myClassTests.length === 0 ? (
              <p className="text-xs text-text-secondary italic text-center py-6">No class test results recorded yet.</p>
            ) : (
              myClassTests.map((ct, idx) => (
                <div key={idx} className="p-3.5 bg-bg-main/30 border border-border rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-text-primary">{ct.subject}</p>
                    <span className="text-[9px] text-text-secondary">{ct.desc}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-text-primary">{ct.marks}</span>
                    <span className="text-[9px] bg-accent/10 text-accent font-black px-1.5 py-0.5 rounded ml-2">{ct.grade}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Term Exam Marks */}
        <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <BookOpenCheck size={14} className="text-accent" />
              <span>Term Final Exam Marks</span>
            </h3>
            {!sharedFinalExamsPublished && (
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-wider rounded-lg animate-pulse">
                Pending Release
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            {!sharedFinalExamsPublished ? (
              <div className="p-8 border border-dashed border-border rounded-2xl text-center space-y-2">
                <p className="text-xs font-bold text-text-primary">Final Marks Pending Publication</p>
                <p className="text-[10px] text-text-secondary">Official term marksheet is restricted and will be unlocked once released by the school admin.</p>
              </div>
            ) : myAcademicRecords.length === 0 ? (
              <p className="text-xs text-text-secondary italic text-center py-6">No final marks graded yet for this term.</p>
            ) : (
              myAcademicRecords.map((score, idx) => (
                <div key={idx} className="p-3.5 bg-bg-main/30 border border-border rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-text-primary">{score.subject}</p>
                    <span className="text-[9px] text-text-secondary">{score.desc}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-text-primary">{score.marks}</span>
                    <span className="text-[9px] bg-accent/10 text-accent font-black px-1.5 py-0.5 rounded ml-2">{score.grade}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notice Board & Hostel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notices Board */}
        <div className={`${isHostelResident ? 'lg:col-span-1' : 'lg:col-span-3'} p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4`}>
          <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Megaphone size={14} className="text-accent" />
            <span>Campus Announcements</span>
          </h3>
          <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar">
            {studentNotices.map((notice) => (
              <div key={notice.id} className="p-4 bg-bg-main/40 border border-border rounded-2xl space-y-2 hover:border-accent/10 transition-all">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-text-primary">{notice.title}</h4>
                  <span className="text-[9px] text-text-secondary opacity-50 font-bold">{notice.date}</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">{notice.body}</p>
                <div className="flex items-center gap-2 text-[8px] text-text-secondary uppercase tracking-widest">
                  <span className="font-black text-accent">{notice.author}</span>
                </div>
              </div>
            ))}
            {studentNotices.length === 0 && (
              <p className="text-xs text-text-secondary italic py-8 text-center border border-dashed border-border rounded-2xl">
                No active announcements today.
              </p>
            )}
          </div>
        </div>

        {/* Hostel Issued Items & Bills */}
        {isHostelResident && (
          <div className="lg:col-span-2 p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Package size={16} className="text-accent" />
              <span>Hostel Issued Items & Bills Ledger</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Equipment items */}
              <div className="space-y-3">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Issued Items Ledger</span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {myHostelItems.map((item, idx) => {
                    const remaining = item.cost - item.paid;
                    return (
                      <div key={idx} className="p-3 bg-bg-main/40 border border-border rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-text-primary">{item.item}</p>
                          <span className="text-[9px] text-text-secondary">Issued: {item.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-text-primary block">₹{item.cost}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-1 inline-block ${
                            item.status === 'PAID' 
                              ? 'bg-success/15 text-success border border-success/35'
                              : item.status === 'PARTIAL'
                              ? 'bg-warning/15 text-warning border border-warning/35'
                              : 'bg-danger/15 text-danger border border-danger/35'
                          }`}>
                            {item.status === 'PAID' ? 'Paid' : `₹${remaining} Outstanding`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {myHostelItems.length === 0 && (
                    <p className="text-xs text-text-secondary italic py-4 text-center border border-dashed border-border rounded-xl">
                      No hostel equipment issued.
                    </p>
                  )}
                </div>
              </div>

              {/* Transaction receipts history */}
              <div className="space-y-3">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Equipment Settlement Receipts</span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {myHostelItems
                    .flatMap(a => (a.payments || []).map(p => ({ ...p, item: a.item })))
                    .map((pay, i) => (
                      <div key={i} className="p-3 bg-bg-card/85 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <p className="font-mono font-bold text-text-primary">Receipt: #{pay.id}</p>
                          <span className="text-[9px] text-text-secondary">{pay.item} • {pay.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-success">₹{pay.amount}</span>
                          <span className="text-[8px] bg-success/10 text-success font-black px-1.5 py-0.5 rounded uppercase ml-1.5">Paid</span>
                        </div>
                      </div>
                    ))
                  }
                  {myHostelItems.flatMap(a => a.payments || []).length === 0 && (
                    <p className="text-xs text-text-secondary italic py-4 text-center border border-dashed border-border rounded-xl">
                      No equipment payments recorded.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* School Bus & Transport Details */}
      {myTransportRoute && (
        <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border pb-3">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Bus size={16} className="text-accent" />
              <span>Assigned School Bus & Route</span>
            </h3>
            {myTransportRoute.gpsEnabled && (
              <button
                onClick={() => setSelectedTrackRoute(myTransportRoute)}
                className="px-4 py-2 bg-success hover:bg-success-hover text-black text-xs font-black uppercase rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
              >
                <Navigation size={12} className="rotate-45" />
                <span>Track Live ETA: {activeTrackedRoute?.etaMinutes || myTransportRoute.etaMinutes || 12}m</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-bg-main/40 border border-border rounded-2xl space-y-3">
              <div>
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Route Description</span>
                <p className="text-sm font-bold text-text-primary mt-1">{myTransportRoute.name}</p>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
                <span className="text-text-secondary">Monthly Corridor Fee:</span>
                <span className="font-mono font-bold text-text-primary">₹{myTransportRoute.fee.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="p-4 bg-bg-main/40 border border-border rounded-2xl space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Bus License No.</span>
                  <span className="text-xs font-mono font-black text-accent">{myTransportRoute.bus}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Driver Name</span>
                  <span className="text-xs font-bold text-text-primary">{myTransportRoute.driver}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
                <span className="text-text-secondary">Driver Contact:</span>
                <span className="font-mono font-bold text-text-primary">{myTransportRoute.phone}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Past Academic Years History */}
      {(() => {
        const myHistory = myStudentProfile ? (sharedStudentHistory[myStudentProfile.id] || []) : [];
        if (myHistory.length === 0) return null;
        return (
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-5">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <History size={16} className="text-accent" />
              <span>Past Academic Years</span>
            </h3>
            <div className="space-y-6">
              {myHistory.map((record, index) => (
                <div key={index} className="relative pl-5 border-l-2 border-accent/20 space-y-3">
                  <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg-sidebar"></div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-accent tracking-widest">Academic Year {record.academic_year}</span>
                      <h4 className="text-sm font-bold text-text-primary mt-0.5">{record.class_name}</h4>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-accent/5 border border-accent/10 rounded-lg text-[10px] font-bold text-text-primary">
                        Attendance: {record.attendance}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        record.fees?.status === 'PAID'
                          ? 'bg-success/5 border-success/15 text-success'
                          : record.fees?.status === 'PARTIAL'
                          ? 'bg-warning/5 border-warning/15 text-warning'
                          : 'bg-danger/5 border-danger/15 text-danger'
                      }`}>
                        Fees: {record.fees?.status}
                      </span>
                    </div>
                  </div>

                  {record.academic_records && record.academic_records.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {record.academic_records.map((ar, idx) => (
                        <div key={idx} className="p-3 bg-bg-main/40 border border-border rounded-xl flex justify-between items-center text-xs">
                          <span className="font-medium text-text-secondary truncate pr-2">{ar.subject}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-text-primary">{ar.marks}</span>
                            <span className="px-1.5 py-0.5 bg-accent/10 text-[9px] font-black text-accent rounded uppercase">{ar.grade}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {record.remarks && record.remarks.length > 0 && (
                    <div className="space-y-2">
                      {record.remarks.map((rem, idx) => (
                        <div key={idx} className="p-2.5 bg-bg-sidebar border border-border/60 rounded-lg">
                          <p className="text-[11px] text-text-primary font-medium italic">"{rem.remark}"</p>
                          <div className="flex justify-between items-center text-[9px] text-text-secondary font-semibold mt-1">
                            <span>{rem.teacher}</span>
                            <span>{rem.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {/* Live GPS Tracking Modal */}
      <Modal
        open={!!activeTrackedRoute}
        onClose={() => setSelectedTrackRoute(null)}
        title={`Live Commute Tracking — ${activeTrackedRoute?.bus || ''}`}
        icon={<Navigation size={18} className="text-success animate-pulse rotate-45" />}
        size="lg"
      >
        {activeTrackedRoute && (() => {
          const eta = activeTrackedRoute.etaMinutes || 12;
          const pct = Math.max(5, Math.min(95, ((15 - eta) / 14) * 100));
          const speed = eta > 1 ? 35 + Math.floor((pct % 7) * 2) : 0;
          
          return (
            <div className="space-y-6 text-text-primary">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Commute Route</span>
                  <span className="text-sm font-black mt-0.5 block">{activeTrackedRoute.name}</span>
                </div>
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Estimated Arrival</span>
                  <span className="text-sm font-black text-success mt-0.5 block flex items-center gap-1.5">
                    <Clock size={14} className="animate-pulse" />
                    {eta > 1 ? `${eta} mins` : 'Arrived at Campus'}
                  </span>
                </div>
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Driver Info</span>
                  <span className="text-xs font-bold text-text-primary mt-0.5 block">
                    {activeTrackedRoute.driver} ({activeTrackedRoute.phone})
                  </span>
                </div>
              </div>

              {/* GPS Hardware Configuration */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border border-border rounded-2xl space-y-3">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">
                  {activeTrackedRoute.trackingMethod === 'MOBILE' ? 'GPS Mobile App Registration' : 'GPS Hardware Device Registration'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
                  <div className="p-3.5 bg-white dark:bg-slate-950/40 border border-border rounded-xl">
                    <span className="text-[8px] text-text-secondary uppercase block font-bold">
                      {activeTrackedRoute.trackingMethod === 'MOBILE' ? 'Mobile Client OS' : 'Hardware Model'}
                    </span>
                    <span className="font-bold text-text-primary mt-1 block">
                      {activeTrackedRoute.gpsModel || (activeTrackedRoute.trackingMethod === 'MOBILE' ? 'Android App' : 'Teltonika FMB920')}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-950/40 border border-border rounded-xl">
                    <span className="text-[8px] text-text-secondary uppercase block font-bold">
                      {activeTrackedRoute.trackingMethod === 'MOBILE' ? 'Driver Device Token' : 'Device ID / IMEI'}
                    </span>
                    <span className="font-bold font-mono text-text-primary mt-1 block uppercase">
                      {activeTrackedRoute.gpsDeviceID || 'GPS-N/A'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-950/40 border border-border rounded-xl">
                    <span className="text-[8px] text-text-secondary uppercase block font-bold">
                      {activeTrackedRoute.trackingMethod === 'MOBILE' ? 'Driver Mobile Number' : 'Cellular SIM Number'}
                    </span>
                    <span className="font-bold font-mono text-text-primary mt-1 block">
                      {activeTrackedRoute.gpsSimNo || activeTrackedRoute.phone || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* High-Fidelity SVG Route Tracker */}
              <div className="p-6 bg-slate-950 text-white rounded-3xl border border-slate-800 relative overflow-hidden h-64 flex flex-col justify-between">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
                
                <div className="flex justify-between items-center z-10">
                  <span className={`text-[10px] ${activeTrackedRoute.trackingMethod === 'MOBILE' && !activeTrackedRoute.driverBroadcasting ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-success/20 text-success border-success/30'} px-2.5 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 ${activeTrackedRoute.trackingMethod === 'MOBILE' && !activeTrackedRoute.driverBroadcasting ? 'bg-amber-500' : 'bg-success animate-ping'} rounded-full`}></span>
                    {activeTrackedRoute.trackingMethod === 'MOBILE' 
                      ? (activeTrackedRoute.driverBroadcasting ? 'Mobile App Streaming' : 'Awaiting Driver Broadcast') 
                      : 'Live GPS Telemetry Active'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Last ping: {activeTrackedRoute.lastUpdated ? new Date(activeTrackedRoute.lastUpdated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>

                <div className="relative my-auto z-10 py-6">
                  <svg className="w-full h-12" viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M 5 6 Q 25 1, 50 6 T 95 6" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
                    <path 
                      d={`M 5 6 Q 25 1, 50 6 T 95 6`} 
                      fill="none" 
                      stroke="url(#accentGradient)" 
                      strokeWidth="2" 
                      strokeDasharray="100"
                      strokeDashoffset={100 - pct} 
                    />
                    
                    <defs>
                      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div 
                    className="absolute -translate-y-9 -translate-x-1/2 transition-all duration-1000 ease-out flex flex-col items-center animate-pulse"
                    style={{ left: `${pct}%` }}
                  >
                    <div className="px-2 py-1 bg-success text-[8px] font-black text-black rounded-lg shadow-lg border border-success-hover uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Bus size={10} />
                      <span>{activeTrackedRoute.bus}</span>
                    </div>
                    <div className="w-4 h-4 bg-success rounded-full border-4 border-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                  </div>

                  <div className="absolute left-[5%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-950"></div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Depot</span>
                  </div>
                  <div className="absolute left-[35%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-950"></div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Stop A</span>
                  </div>
                  <div className="absolute left-[65%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-950"></div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Stop B</span>
                  </div>
                  <div className="absolute left-[95%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                    <span className="text-[8px] text-emerald-400 font-black mt-1.5 uppercase tracking-wider">Campus Gate</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-900 pt-3 z-10 font-mono">
                  <span>Speed: <strong className="text-white">{speed} km/h</strong></span>
                  <span>Sats: <strong className="text-white">12 Connected</strong></span>
                  <span>Accuracy: <strong className="text-success">0.82 (High)</strong></span>
                  <span>Signal: <strong className="text-success">Strong</strong></span>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ==========================================
// 3. PARENT DASHBOARD
// ==========================================
// ─────────────────────────────────────────────────────────────────
// Online Payment Modal
// ─────────────────────────────────────────────────────────────────
function OnlinePaymentModal({ child, fees, feeBreakdown, totalFee, onClose, onSuccess }) {
  const { activeTenant } = useAuth();
  const [step, setStep] = useState('method'); // method | detail | processing | success
  const [method, setMethod] = useState(null); // BANK_QR | CARD | NETBANKING
  const [upiId, setUpiId] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [bank, setBank] = useState('');
  const [progress, setProgress] = useState(0);
  const [processingMsg, setProcessingMsg] = useState('Initiating secure payment...');
  
  // UTR QR & Bank inputs
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI'); // UPI | IMPS | NEFT_RTGS
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [customAmount, setCustomAmount] = useState(fees.remaining);
  const amountToPay = Number(customAmount) || 0;

  const methods = [
    { id: 'BANK_QR', label: 'Scan QR / Bank Transfer', desc: 'Scan school QR or pay to Bank Account', icon: QrCode, color: 'indigo' },
    { id: 'CARD', label: 'Debit / Credit Card', desc: 'Visa, Mastercard, RuPay accepted', icon: CreditCard, color: 'violet' },
    { id: 'NETBANKING', label: 'Net Banking', desc: 'SBI, HDFC, ICICI, Axis & more', icon: Building2, color: 'sky' },
  ];

  const banks = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank'];

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 2) {
      toast.error(`Receipt image size (${fileSizeMB.toFixed(2)} MB) exceeds 2MB limit.`);
      return;
    }
    
    try {
      setUploadingImage(true);
      const compressedFile = await compressImage(file, 600, 600, 0.7);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result);
        setReceiptPreview(reader.result);
        setUploadingImage(false);
        toast.success("Receipt screenshot uploaded & compressed!");
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error(err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result);
        setReceiptPreview(reader.result);
        setUploadingImage(false);
        toast.success("Receipt screenshot preloaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProceed = () => {
    if (amountToPay <= 0) {
      toast.error('Please enter a valid payment amount (minimum ₹1).');
      return;
    }
    if (amountToPay > fees.remaining) {
      toast.error(`Payment amount cannot exceed outstanding balance of ₹${fees.remaining.toLocaleString('en-IN')}.`);
      return;
    }
    if (method === 'BANK_QR') {
      if (!utrNumber.trim()) {
        toast.error('Please enter the transaction UTR / Reference number.');
        return;
      }
      if (utrNumber.trim().length < 6) {
        toast.error('UTR / Reference number should be at least 6 digits.');
        return;
      }
      setStep('processing');
      runProcessingAnimation();
      return;
    }
    if (method === 'UPI' && !upiId.trim()) { toast.error('Please enter a valid UPI ID.'); return; }
    if (method === 'CARD' && (!cardNo || !cardExpiry || !cardCvv || !cardName)) { toast.error('Please fill all card details.'); return; }
    if (method === 'NETBANKING' && !bank) { toast.error('Please select your bank.'); return; }
    setStep('processing');
    runProcessingAnimation();
  };

  const runProcessingAnimation = () => {
    const msgs = method === 'BANK_QR' ? [
      'Submitting transaction receipt...',
      'Uploading deposit screenshot...',
      'Registering UTR number...',
      'Generating pending verification voucher...',
      'Awaiting administrator review...'
    ] : [
      'Initiating secure payment...',
      'Connecting to payment gateway...',
      'Verifying payment credentials...',
      'Processing with your bank...',
      'Awaiting confirmation...',
      'Settlement confirmed!'
    ];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setProgress(Math.min(Math.round((i / msgs.length) * 100), 100));
      setProcessingMsg(msgs[Math.min(i, msgs.length - 1)]);
      if (i >= msgs.length) {
        clearInterval(interval);
        setTimeout(() => setStep('success'), 600);
      }
    }, 550);
  };

  const colorMap = { indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/25 dark:border-indigo-700/40 dark:text-indigo-300', violet: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/25 dark:border-violet-700/40 dark:text-violet-300', sky: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/25 dark:border-sky-700/40 dark:text-sky-300' };
  const ringMap = { indigo: 'ring-indigo-500', violet: 'ring-violet-500', sky: 'ring-sky-500' };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40" onClick={(e) => e.target === e.currentTarget && step !== 'processing' && onClose()}>
      <div className="w-full max-w-lg bg-bg-card rounded-3xl border border-border shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <Lock size={16} />
            </div>
            <div>
              <p className="text-sm font-black text-text-primary">Secure Online Payment</p>
              <p className="text-[10px] text-text-secondary font-semibold flex items-center gap-1"><Lock size={8} /> 256-bit SSL encrypted</p>
            </div>
          </div>
          {step !== 'processing' && <button onClick={onClose} className="p-2 hover:bg-bg-sidebar rounded-xl transition-all text-text-secondary"><X size={16} /></button>}
        </div>

        {/* Amount summary bar */}
        <div className="px-6 py-3 bg-accent/5 border-b border-border flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Payment for {child.first_name} {child.last_name}</p>
            <p className="text-[10px] text-text-secondary">Adm: {child.admission_no} • Outstanding: ₹{fees.remaining.toLocaleString('en-IN')}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[9px] text-text-secondary font-black uppercase tracking-widest block mb-0.5">Amount to Pay</span>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-accent font-black text-xs">₹</span>
              <input
                type="number"
                min="1"
                max={fees.remaining}
                value={customAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (isNaN(val)) {
                    setCustomAmount('');
                  } else {
                    setCustomAmount(Math.min(val, fees.remaining));
                  }
                }}
                className="w-28 pl-6 pr-2 py-1 bg-white dark:bg-black/35 border border-border rounded-xl text-right font-outfit font-black text-accent text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                disabled={step === 'processing' || step === 'success'}
              />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Step: Method Selection */}
          {step === 'method' && (
            <>
              <p className="text-xs font-black text-text-primary uppercase tracking-wider">Choose Payment Method</p>
              <div className="space-y-3">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (amountToPay <= 0) {
                        toast.error('Please enter a valid payment amount (minimum ₹1).');
                        return;
                      }
                      if (amountToPay > fees.remaining) {
                        toast.error(`Payment amount cannot exceed outstanding balance of ₹${fees.remaining.toLocaleString('en-IN')}.`);
                        return;
                      }
                      setMethod(m.id);
                      setStep('detail');
                    }}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all hover:scale-[1.01] ${
                      colorMap[m.color]
                    }`}
                  >
                    <div className="p-2.5 bg-white/50 dark:bg-black/20 rounded-xl"><m.icon size={20} /></div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold">{m.label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{m.desc}</p>
                    </div>
                    <ArrowRight size={16} className="opacity-50" />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 justify-center pt-2">
                <ShieldCheck size={12} className="text-success" />
                <span className="text-[10px] text-text-secondary">Secured by RazorpayX Payment Gateway • PCI-DSS Compliant</span>
              </div>
            </>
          )}

          {/* Step: Method Detail */}
          {step === 'detail' && (
            <>
              <button onClick={() => setStep('method')} className="flex items-center gap-1 text-[10px] text-accent font-bold hover:underline mb-1">
                <ArrowRight size={10} className="rotate-180" /> Back to methods
              </button>

              {method === 'BANK_QR' && (
                <div className="space-y-4">
                  <div className="p-4 bg-accent/5 border border-border rounded-2xl space-y-3">
                    <p className="text-[10px] font-black uppercase text-accent tracking-widest mb-1">School bank account credentials</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {[
                        { label: 'Bank Name', value: activeTenant.settings?.bank?.bankName || 'State Bank of India' },
                        { label: 'Account Name', value: activeTenant.settings?.bank?.accountName || 'School Fee Operations' },
                        { label: 'Account Number', value: activeTenant.settings?.bank?.accountNo || '10293847561' },
                        { label: 'IFSC Code', value: activeTenant.settings?.bank?.ifscCode || 'SBIN0000214' },
                        { label: 'UPI ID', value: activeTenant.settings?.bank?.upiId || 'school@upi' }
                      ].map((f, i) => (
                        <div key={i} className="p-2.5 bg-bg-sidebar border border-border rounded-xl flex items-center justify-between group/field">
                          <div className="min-w-0 pr-2">
                            <span className="text-[8px] text-text-secondary uppercase font-bold block">{f.label}</span>
                            <span className="font-bold font-mono text-text-primary text-[11px] truncate block mt-0.5" title={f.value}>{f.value}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(f.value);
                              toast.success(`Copied ${f.label} to clipboard!`);
                            }}
                            className="p-1 text-[9px] font-bold text-accent bg-accent/10 hover:bg-accent hover:text-white rounded transition-all shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* QR Scanner Image Container */}
                  <div className="flex flex-col items-center gap-3 p-5 bg-bg-sidebar rounded-2xl border border-border">
                    {activeTenant.settings?.bank?.qrCode ? (
                      <div className="relative group/qr">
                        <img 
                          src={activeTenant.settings.bank.qrCode} 
                          alt="School UPI QR Scanner" 
                          className="w-32 h-32 object-contain rounded-xl shadow-md border-2 border-accent/20 bg-white"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/qr:opacity-100 rounded-xl flex items-center justify-center transition-all">
                          <span className="text-[10px] text-white font-bold bg-accent/90 px-2.5 py-1 rounded-full flex items-center gap-1"><QrCode size={10} /> Scan UPI</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-28 h-28 bg-white/80 rounded-xl flex flex-col items-center justify-center border border-border text-text-secondary">
                        <QrCode size={48} className="opacity-40" />
                        <span className="text-[8px] text-text-secondary mt-1 font-bold text-center px-2">No QR uploaded by school</span>
                      </div>
                    )}
                    <p className="text-[10px] text-text-secondary font-semibold text-center leading-normal">Scan the QR scanner using any UPI App (GPay/PhonePe/Paytm) or transfer directly to the Bank Account above.</p>
                  </div>

                  {/* Inputs for parent to confirm payment details */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary block mb-1.5">Payment Mode *</label>
                        <select 
                          className="w-full px-3 py-2 text-xs bg-bg-sidebar border border-border rounded-xl focus:outline-none focus:border-accent transition-all text-text-primary font-bold"
                          value={paymentMode}
                          onChange={e => setPaymentMode(e.target.value)}
                        >
                          <option value="UPI">UPI App Payment</option>
                          <option value="IMPS">IMPS Transfer</option>
                          <option value="NEFT_RTGS">NEFT / RTGS Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary block mb-1.5">Transaction UTR / Ref No *</label>
                        <input 
                          type="text" 
                          className="w-full px-3 py-2 text-xs bg-bg-sidebar border border-border rounded-xl focus:outline-none focus:border-accent transition-all font-mono text-text-primary"
                          placeholder="e.g. 12-digit number"
                          value={utrNumber}
                          onChange={e => setUtrNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary block mb-1.5">Upload Payment Receipt Screenshot</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleReceiptUpload}
                          className="hidden"
                          id="receipt-screenshot-uploader"
                        />
                        <label 
                          htmlFor="receipt-screenshot-uploader"
                          className="px-4 py-2 bg-bg-sidebar border border-border hover:border-accent/40 rounded-xl cursor-pointer text-[10px] font-bold text-text-primary transition-all flex items-center gap-1.5"
                        >
                          {uploadingImage ? "Compressing..." : "Choose Screenshot"}
                        </label>
                        {receiptPreview && (
                          <div className="w-9 h-9 rounded bg-slate-100 border border-border overflow-hidden relative group shrink-0">
                            <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {method === 'CARD' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary block mb-1.5">Card Number</label>
                    <input className="w-full px-3 py-2.5 text-sm bg-bg-sidebar border border-border rounded-xl focus:outline-none focus:border-accent transition-all font-mono" placeholder="•••• •••• •••• ••••" maxLength={19} value={cardNo} onChange={e => setCardNo(e.target.value.replace(/[^0-9]/g,'').replace(/(.{4})/g,'$1 ').trim())} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary block mb-1.5">Expiry MM/YY</label>
                      <input className="w-full px-3 py-2.5 text-sm bg-bg-sidebar border border-border rounded-xl focus:outline-none focus:border-accent transition-all font-mono" placeholder="MM/YY" maxLength={5} value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary block mb-1.5">CVV</label>
                      <input className="w-full px-3 py-2.5 text-sm bg-bg-sidebar border border-border rounded-xl focus:outline-none focus:border-accent transition-all font-mono" placeholder="•••" maxLength={4} type="password" value={cardCvv} onChange={e => setCardCvv(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-secondary block mb-1.5">Name on Card</label>
                    <input className="w-full px-3 py-2.5 text-sm bg-bg-sidebar border border-border rounded-xl focus:outline-none focus:border-accent transition-all" placeholder="As printed on card" value={cardName} onChange={e => setCardName(e.target.value)} />
                  </div>
                </div>
              )}

              {method === 'NETBANKING' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-text-secondary">Select your bank to proceed to net banking portal:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {banks.map(b => (
                      <button key={b} onClick={() => setBank(b)} className={`p-3 text-[10px] font-bold rounded-xl border-2 text-left transition-all ${
                        bank === b ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-sidebar text-text-primary hover:border-accent/40'
                      }`}>{b}</button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleProceed}
                className="w-full py-3.5 bg-accent hover:bg-accent/90 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm mt-2 shadow-lg shadow-accent/20"
              >
                <Lock size={14} />
                {method === 'BANK_QR' ? 'Submit Payment Receipt' : `Pay ₹${amountToPay.toLocaleString('en-IN')} Securely`}
              </button>
            </>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-6 py-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-accent/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-accent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <IndianRupee size={24} className="text-accent" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-text-primary">{processingMsg}</p>
                <p className="text-[10px] text-text-secondary">Please do not close this window</p>
              </div>
              <div className="w-full bg-bg-sidebar rounded-full h-2 overflow-hidden border border-border">
                <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-[9px] text-text-secondary font-mono">{progress}% complete</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className={`w-20 h-20 ${method === 'BANK_QR' ? 'bg-warning/15 border-warning/30' : 'bg-success/15 border-success/30'} rounded-full flex items-center justify-center border-2`}>
                {method === 'BANK_QR' ? (
                  <Clock size={40} className="text-warning animate-pulse" />
                ) : (
                  <BadgeCheck size={40} className="text-success" />
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-black text-text-primary">
                  {method === 'BANK_QR' ? 'Payment Receipt Submitted!' : 'Payment Successful!'}
                </p>
                <p className="text-[11px] text-text-secondary">
                  ₹{amountToPay.toLocaleString('en-IN')} paid for {child.first_name} {child.last_name}
                </p>
              </div>
              
              {method === 'BANK_QR' ? (
                <div className="w-full p-4 bg-bg-sidebar rounded-2xl border border-border space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-text-secondary">Method Channel</span><span className="font-bold text-text-primary">Bank QR / Transfer ({paymentMode})</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">UTR / Reference No</span><span className="font-mono font-bold text-accent">{utrNumber}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Receipt Screenshot</span><span className="text-text-secondary font-semibold">{receiptImage ? 'Uploaded' : 'Not Provided'}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Verification Status</span><span className="text-[9px] bg-warning/15 text-warning font-black px-2 py-0.5 rounded uppercase">Pending Review</span></div>
                </div>
              ) : (
                <div className="w-full p-4 bg-bg-sidebar rounded-2xl border border-border space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-text-secondary">Payment Method</span><span className="font-bold text-text-primary">{method === 'UPI' ? `UPI (${upiId})` : method === 'CARD' ? 'Debit/Credit Card' : `Net Banking – ${bank}`}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Transaction ID</span><span className="font-mono font-bold text-accent">TXN{Date.now().toString().slice(-10)}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Amount Settled</span><span className="font-black text-success">₹{amountToPay.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Status</span><span className="text-[9px] bg-success/15 text-success font-black px-2 py-0.5 rounded uppercase">Cleared</span></div>
                </div>
              )}
              
              <button 
                onClick={() => {
                  if (method === 'BANK_QR') {
                    onSuccess(`QR/Bank Transfer (${paymentMode})`, { utr: utrNumber, mode: paymentMode, receiptImage }, amountToPay);
                  } else {
                    const label = method === 'UPI' ? `UPI (${upiId})` : method === 'CARD' ? 'Debit/Credit Card' : `Net Banking – ${bank}`;
                    onSuccess(label, null, amountToPay);
                  }
                }} 
                className={`w-full py-3 ${method === 'BANK_QR' ? 'bg-warning hover:bg-warning/90 shadow-warning/20' : 'bg-success hover:bg-success/90 shadow-success/20'} text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg`}
              >
                {method === 'BANK_QR' ? (
                  <>
                    <CheckCircle2 size={14} /> Close & Await Review
                  </>
                ) : (
                  <>
                    <Receipt size={14} /> View Official Receipt
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParentDashboard() {
  const { 
    sharedStudents, 
    sharedParents, 
    sharedAcademicRecords, 
    sharedFeeRecords,
    setSharedFeeRecords,
    sharedAttendanceRecords, 
    sharedRemarks,
    sharedNotices,
    activeParentId,
    sharedHostelInventoryAllocations,
    setSharedHostelInventoryAllocations,
    activeTenant,
    sharedNotifications,
    setSharedNotifications,
    sharedSchoolAlerts,
    setSharedSchoolAlerts,
    sharedClasses,
    sharedFeeStructures,
    sharedStudentFeeAddons,
    sharedTransportRoutes,
    sharedFinalExamsPublished,
    sharedClassTestRecords,
    sharedStudentHistory
  } = useAuth();

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const receiptRef = React.useRef(null);
  const [paymentTarget, setPaymentTarget] = useState(null); // { child, fees, feeBreakdown, totalFee }
  const [hostelPayTarget, setHostelPayTarget] = useState(null); // { child, alloc }
  const [selectedTrackRoute, setSelectedTrackRoute] = useState(null);
  const activeTrackedRoute = useMemo(() => {
    if (!selectedTrackRoute) return null;
    return (sharedTransportRoutes || []).find(r => r.id === selectedTrackRoute.id);
  }, [selectedTrackRoute, sharedTransportRoutes]);

  // Find simulated parent profile restricted to active tenant
  const tenantParents = sharedParents.filter(p => p.tenant_id === activeTenant.id);
  const parentProfile = tenantParents.find(p => p.id === activeParentId) || tenantParents[0];

  // Find linked children
  const linkedStudents = sharedStudents.filter(s => s.parent_id === (parentProfile?.id || '') && s.tenant_id === activeTenant.id);

  const isChildHostelResident = React.useCallback((childId) => {
    const addons = sharedStudentFeeAddons?.[childId];
    const hasHostelEnabled = addons?.hostel?.enabled === true;
    const hasAllocations = (sharedHostelInventoryAllocations || []).some(a => a.studentId === childId);
    return hasHostelEnabled || hasAllocations;
  }, [sharedStudentFeeAddons, sharedHostelInventoryAllocations]);

  const childTransportRoute = React.useCallback((childId) => {
    const addons = sharedStudentFeeAddons?.[childId];
    if (!addons?.transport?.enabled || !addons?.transport?.routeId) return null;
    return (sharedTransportRoutes || []).find(r => r.id === addons.transport.routeId && r.tenant_id === activeTenant.id);
  }, [sharedStudentFeeAddons, sharedTransportRoutes, activeTenant.id]);



  const parentNotifications = React.useMemo(() => {
    return (sharedNotifications || []).filter(
      n => n.tenant_id === activeTenant.id && n.recipient_id === (parentProfile?.id || '')
    );
  }, [sharedNotifications, activeTenant.id, parentProfile]);

  const handleViewReceiptFromHistory = (child, payment) => {
    if (payment.status === 'PENDING_VERIFICATION') {
      toast.info(`Transaction ${payment.id} is pending verification. Official receipt will be available once verified.`);
      return;
    }
    const classStructures = sharedFeeStructures.filter(fs => fs.tenant_id === activeTenant.id && fs.class_id === child.class_id);
    const addons = sharedStudentFeeAddons[child.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
    const feeBreakdown = classStructures.map(fs => ({ label: fs.name, code: fs.code, amount: fs.amount }));
    if (addons.transport.enabled && addons.transport.fee > 0) feeBreakdown.push({ label: 'Transport Fee', code: 'TRP', amount: addons.transport.fee });
    if (addons.hostel.enabled && addons.hostel.fee > 0) feeBreakdown.push({ label: 'Hostel Fee', code: 'HST', amount: addons.hostel.fee });

    const totalFee = classStructures.reduce((sum, fs) => sum + fs.amount, 0) + 
      (addons.transport.enabled ? addons.transport.fee : 0) + 
      (addons.hostel.enabled ? addons.hostel.fee : 0);

    const receipt = {
      id: payment.id,
      date: payment.date,
      dateDisplay: new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: '12:00 PM',
      amount: payment.amount,
      method: payment.method,
      studentName: `${child.first_name} ${child.last_name}`,
      admissionNo: child.admission_no,
      className: sharedClasses.find(c => c.id === child.class_id)?.name || 'General Class',
      schoolName: activeTenant.name,
      totalFee,
      newPaid: totalFee - (sharedFeeRecords[child.id]?.remaining || 0),
      newRemaining: sharedFeeRecords[child.id]?.remaining || 0,
      newStatus: sharedFeeRecords[child.id]?.status || 'PAID',
      collectedBy: 'Authorized Cashier',
      schoolAddress: activeTenant.address || '',
      schoolPhone: activeTenant.phone || '',
      schoolEmail: activeTenant.email || `admin@${activeTenant.subdomain}.edu.in`,
      schoolAffiliation: activeTenant.affiliation || '',
      schoolEstYear: activeTenant.estYear || '',
      schoolLogo: activeTenant.logo || '',
      schoolSubdomain: activeTenant.subdomain || '',
      feeBreakdown
    };

    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const handleOnlinePaymentPending = (child, paymentMethodLabel, pendingDetails, amountPaidOverride) => {
    const classStructures = sharedFeeStructures.filter(fs => fs.tenant_id === activeTenant.id && fs.class_id === child.class_id);
    const addons = sharedStudentFeeAddons[child.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
    const feeBreakdown = classStructures.map(fs => ({ label: fs.name, code: fs.code, amount: fs.amount }));
    if (addons.transport.enabled && addons.transport.fee > 0) feeBreakdown.push({ label: 'Transport Fee', code: 'TRP', amount: addons.transport.fee });
    if (addons.hostel.enabled && addons.hostel.fee > 0) feeBreakdown.push({ label: 'Hostel Fee', code: 'HST', amount: addons.hostel.fee });

    const totalFee = classStructures.reduce((sum, fs) => sum + fs.amount, 0)
      + (addons.transport.enabled ? addons.transport.fee : 0)
      + (addons.hostel.enabled ? addons.hostel.fee : 0);

    const prevFees = sharedFeeRecords[child.id] || { total: totalFee, paid: 0, remaining: totalFee, status: 'UNPAID', history: [] };
    const amountPaid = amountPaidOverride !== undefined ? amountPaidOverride : prevFees.remaining;
    const receiptId = `ONL-UTR-${pendingDetails.utr}`;
    const today = new Date().toISOString().split('T')[0];

    const pendingTx = {
      id: receiptId,
      date: today,
      amount: amountPaid,
      method: paymentMethodLabel,
      status: 'PENDING_VERIFICATION',
      utr: pendingDetails.utr,
      receiptImage: pendingDetails.receiptImage || ''
    };

    const updatedRecord = {
      ...prevFees,
      history: [
        ...(prevFees.history || []),
        pendingTx
      ]
    };
    setSharedFeeRecords(prev => ({ ...prev, [child.id]: updatedRecord }));

    const notif = {
      id: `notif-${Date.now()}`,
      tenant_id: activeTenant.id,
      recipient_id: parentProfile?.id || '',
      type: 'FEE_PAYMENT',
      title: `⏳ Online Payment Verification Pending – ${child.first_name} ${child.last_name}`,
      body: `₹${amountPaid.toLocaleString('en-IN')} submitted via Bank QR / UTR ${pendingDetails.utr}. Awaiting verification by accountant.`,
      date: today,
      read: false
    };
    setSharedNotifications(prev => [notif, ...(prev || [])]);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setSharedSchoolAlerts(prev => [{
      id: `school-alert-${Date.now()}`,
      type: 'ONLINE_PAYMENT',
      icon: '⚡',
      title: `New Online Fee Payment Submitted`,
      body: `${child.first_name} ${child.last_name} submitted ₹${amountPaid.toLocaleString('en-IN')} via QR / Bank Transfer. UTR Reference: ${pendingDetails.utr}. Please verify in Finance.`,
      time: `Today at ${timeStr}`,
      read: false,
      receiptId,
      studentId: child.id,
      tenant_id: activeTenant.id
    }, ...(prev || [])]);

    setPaymentTarget(null);
    toast.success(`Payment receipt submitted successfully! Review pending verification.`);
  };


  const handleOnlinePaymentSuccess = (child, paymentMethodLabel, amountPaidOverride) => {
    const classStructures = sharedFeeStructures.filter(fs => fs.tenant_id === activeTenant.id && fs.class_id === child.class_id);
    const addons = sharedStudentFeeAddons[child.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
    const feeBreakdown = classStructures.map(fs => ({ label: fs.name, code: fs.code, amount: fs.amount }));
    if (addons.transport.enabled && addons.transport.fee > 0) feeBreakdown.push({ label: 'Transport Fee', code: 'TRP', amount: addons.transport.fee });
    if (addons.hostel.enabled && addons.hostel.fee > 0) feeBreakdown.push({ label: 'Hostel Fee', code: 'HST', amount: addons.hostel.fee });

    const totalFee = classStructures.reduce((sum, fs) => sum + fs.amount, 0)
      + (addons.transport.enabled ? addons.transport.fee : 0)
      + (addons.hostel.enabled ? addons.hostel.fee : 0);

    const prevFees = sharedFeeRecords[child.id] || { total: totalFee, paid: 0, remaining: totalFee, status: 'UNPAID', history: [], discount: 0 };
    const amountPaid = amountPaidOverride !== undefined ? amountPaidOverride : prevFees.remaining;
    const newPaid = prevFees.paid + amountPaid;
    const newRemaining = Math.max(0, totalFee - newPaid - (prevFees.discount || 0));
    const newStatus = newRemaining === 0 ? 'PAID' : (newPaid > 0 || (prevFees.discount || 0) > 0) ? 'PARTIAL' : 'UNPAID';
    const receiptId = `ONL-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    // Update fee records
    const updatedRecord = {
      ...prevFees,
      total: totalFee,
      paid: newPaid,
      remaining: newRemaining,
      status: newStatus,
      history: [
        ...(prevFees.history || []),
        { id: receiptId, date: today, amount: amountPaid, method: paymentMethodLabel }
      ]
    };
    setSharedFeeRecords(prev => ({ ...prev, [child.id]: updatedRecord }));

    // Build receipt object for modal
    const receipt = {
      id: receiptId,
      date: today,
      dateDisplay: new Date(today).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      amount: amountPaid,
      method: paymentMethodLabel,
      studentName: `${child.first_name} ${child.last_name}`,
      admissionNo: child.admission_no,
      className: sharedClasses.find(c => c.id === child.class_id)?.name || 'General Class',
      schoolName: activeTenant.name,
      totalFee,
      newPaid,
      newRemaining,
      newStatus,
      collectedBy: 'Online Payment Gateway',
      schoolAddress: activeTenant.address || '',
      schoolPhone: activeTenant.phone || '',
      schoolEmail: activeTenant.email || `admin@${activeTenant.subdomain}.edu.in`,
      schoolAffiliation: activeTenant.affiliation || '',
      schoolEstYear: activeTenant.estYear || '',
      schoolLogo: activeTenant.logo || '',
      schoolSubdomain: activeTenant.subdomain || '',
      feeBreakdown
    };

    // Push payment notification to parent
    const notif = {
      id: `notif-${Date.now()}`,
      tenant_id: activeTenant.id,
      recipient_id: parentProfile?.id || '',
      type: 'FEE_PAYMENT',
      title: `✅ Fee Payment Confirmed – ${child.first_name} ${child.last_name}`,
      body: `₹${amountPaid.toLocaleString('en-IN')} successfully paid online via ${paymentMethodLabel}. Receipt ID: ${receiptId}.`,
      date: today,
      metadata: { receiptDetails: receipt }
    };
    setSharedNotifications(prev => [notif, ...(prev || [])]);

    // Push real-time alert to school staff notification bell
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setSharedSchoolAlerts(prev => [{
      id: `school-alert-${Date.now()}`,
      type: 'ONLINE_PAYMENT',
      icon: '⚡',
      title: `Online Fee Payment Received`,
      body: `${child.first_name} ${child.last_name} paid ₹${amountPaid.toLocaleString('en-IN')} via ${paymentMethodLabel}. Receipt: ${receiptId}. Go to Finance → Online Payments to verify.`,
      time: `Today at ${timeStr}`,
      read: false,
      receiptId,
      studentId: child.id,
      tenant_id: activeTenant.id
    }, ...(prev || [])]);

    // Close payment modal, show receipt
    setPaymentTarget(null);
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
    toast.success(`₹${amountPaid.toLocaleString('en-IN')} paid successfully! Receipt generated.`);
  };

  const handleHostelItemPaySuccess = (child, alloc, methodLabel, amountPaidOverride) => {
    const prevOutstanding = alloc.cost - alloc.paid;
    const amountPaid = amountPaidOverride !== undefined ? amountPaidOverride : prevOutstanding;
    const newPaid = alloc.paid + amountPaid;
    const newStatus = newPaid >= alloc.cost ? 'PAID' : 'PARTIAL';
    const receiptId = `HINV-ONL-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Update the hostel inventory allocation: mark as PAID, add payment entry
    setSharedHostelInventoryAllocations(prev =>
      prev.map(a =>
        a.id === alloc.id
          ? {
              ...a,
              paid: newPaid,
              status: newStatus,
              payments: [
                ...(a.payments || []),
                { id: receiptId, date: today, amount: amountPaid, method: methodLabel }
              ]
            }
          : a
      )
    );

    // Push notification to parent
    const notif = {
      id: `notif-hinv-${Date.now()}`,
      tenant_id: activeTenant.id,
      recipient_id: parentProfile?.id || '',
      type: 'FEE_PAYMENT',
      title: `✅ Hostel Item Payment Confirmed – ${alloc.item}`,
      body: `₹${amountPaid.toLocaleString('en-IN')} paid online via ${methodLabel} for "${alloc.item}". Receipt: ${receiptId}.`,
      date: today,
      metadata: {}
    };
    setSharedNotifications(prev => [notif, ...(prev || [])]);

    // Push real-time alert to school staff notification bell
    const alertTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setSharedSchoolAlerts(prev => [{
      id: `school-hostel-alert-${Date.now()}`,
      type: 'HOSTEL_PAYMENT',
      icon: '🏠',
      title: `Hostel Item Payment Received`,
      body: `${child.first_name} ${child.last_name} paid ₹${amountPaid.toLocaleString('en-IN')} for "${alloc.item}" via ${methodLabel}. Receipt: ${receiptId}. Verify in Finance → Online Payments.`,
      time: `Today at ${alertTimeStr}`,
      read: false,
      receiptId,
      studentId: child.id,
      tenant_id: activeTenant.id
    }, ...(prev || [])]);

    setHostelPayTarget(null);
    toast.success(`₹${amountPaid.toLocaleString('en-IN')} paid for "${alloc.item}"! Receipt ${receiptId} generated.`);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Guardian Portal</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Monitoring academic activities and fee statements for children of {parentProfile?.first_name} {parentProfile?.last_name}.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-bg-sidebar border border-border px-4 py-2 rounded-2xl">
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Linked Kids:</span>
          <span className="text-xs font-bold text-white bg-accent/25 px-2 py-0.5 rounded">{linkedStudents.length} Profiles</span>
        </div>
      </div>

      {linkedStudents.length === 0 ? (
        <div className="p-8 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl text-center">
          <p className="text-sm text-text-secondary">No linked student records found for parent account: <span className="text-text-primary font-bold">{parentProfile?.email || 'N/A'}</span></p>
          <p className="text-xs text-text-secondary/60 mt-1">Onboard a student and link this parent in the Student Registry to test this view.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Parent Alert Center */}
          {parentNotifications.length > 0 && (
            <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
              <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                <BellRing size={16} className="text-accent animate-bounce" />
                <span>Real-Time Alerts & Notifications</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parentNotifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 border rounded-2xl flex flex-col justify-between gap-3 transition-all ${
                      notif.type === 'ABSENCE'
                        ? 'bg-red-50/50 border-red-100 hover:border-red-200 dark:bg-red-950/15 dark:border-red-900/35'
                        : 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-200 dark:bg-emerald-950/15 dark:border-emerald-900/35'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          notif.type === 'ABSENCE'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          {notif.type === 'ABSENCE' ? 'Absent Alert' : 'Payment Alert'}
                        </span>
                        <span className="text-[9px] text-text-secondary opacity-50 font-bold font-mono">{notif.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-text-primary mt-2">{notif.title}</h4>
                      <p className="text-[11px] text-text-secondary mt-1">{notif.body}</p>
                    </div>

                    {notif.type === 'FEE_PAYMENT' && notif.metadata?.receiptDetails && (
                      <button
                        onClick={() => {
                          setSelectedReceipt(notif.metadata.receiptDetails);
                          setShowReceiptModal(true);
                        }}
                        className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                      >
                        <FileBox size={12} />
                        <span>View & Print Receipt</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Children Profiles Roster */}
          <div className="space-y-4">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Linked Children Profiles</h3>
            <div className="grid grid-cols-1 gap-4">
              {linkedStudents.map((child) => {
                const att = sharedAttendanceRecords[child.id] || 'N/A';
                const fees = sharedFeeRecords[child.id] || { total: 15400, paid: 0, remaining: 15400, status: 'UNPAID', history: [] };
                
                return (
                  <div key={child.id} className="p-6 bg-bg-sidebar/80 border border-border rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/10 border border-accent/25 rounded-2xl flex items-center justify-center font-black text-accent text-lg">
                        {child.first_name[0]}{child.last_name[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">{child.first_name} {child.last_name}</h4>
                        <p className="text-[10px] text-text-secondary font-semibold">Adm No: {child.admission_no} • Roll No: {child.roll_no || 'N/A'}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[9px] bg-success/15 border border-success/35 text-success px-1.5 py-0.5 rounded font-black">
                            Attendance: {att}
                          </span>
                          <span className="text-[9px] bg-accent/15 border border-accent/35 text-accent px-1.5 py-0.5 rounded font-black">
                            CBSE Registry Verified
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end w-full md:w-auto">
                      <span className="text-[9px] text-text-secondary uppercase font-black">Fee Balance Status</span>
                      <span className="text-lg font-black text-text-primary mt-0.5">₹{fees.remaining.toLocaleString('en-IN')} Due</span>
                      {fees.status === 'PAID' ? (
                        <span className="text-[9px] text-success font-bold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Paid (Razorpay UPI settled)
                        </span>
                      ) : fees.status === 'PARTIAL' ? (
                        <span className="text-[9px] text-warning font-bold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Partially Settled (₹{fees.paid.toLocaleString('en-IN')} paid)
                        </span>
                      ) : (
                        <span className="text-[9px] text-danger font-bold mt-0.5">
                          Outstanding (₹{fees.total.toLocaleString('en-IN')} pending)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Academic Records & Receipts for each child */}
          {linkedStudents.map((child) => {
            const marks = sharedAcademicRecords[child.id] || [];
            const classTests = sharedClassTestRecords[child.id] || [];
            const remarks = sharedRemarks[child.id] || [];
            const fees = sharedFeeRecords[child.id] || { total: 15400, paid: 0, remaining: 15400, status: 'UNPAID', history: [] };

            return (
              <div key={`details-${child.id}`} className="space-y-6 pt-4 border-t border-border">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-border rounded-xl text-text-primary text-xs font-bold font-outfit">
                  <span>Detailed Records for: {child.first_name} {child.last_name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Academic Marks */}
                  <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
                    {/* Term 1 Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                          <BookOpenCheck size={14} className="text-accent" />
                          <span>Term 1 Assessment Marks</span>
                        </h3>
                        {!sharedFinalExamsPublished && (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-wider rounded-lg animate-pulse">
                            Pending Release
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {!sharedFinalExamsPublished ? (
                          <div className="p-4 bg-slate-50 border border-dashed border-border rounded-2xl text-center">
                            <p className="text-[11px] text-text-secondary font-medium">Final term marksheet has not been published yet.</p>
                          </div>
                        ) : marks.length === 0 ? (
                          <p className="text-xs text-text-secondary italic text-center py-4">No marks graded for this term.</p>
                        ) : (
                          marks.map((score, i) => (
                            <div key={i} className="p-3.5 bg-bg-main/30 border border-border rounded-xl flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold text-text-primary">{score.subject}</p>
                                <span className="text-[9px] text-text-secondary">{score.desc}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-text-primary">{score.marks}</span>
                                <span className="text-[9px] bg-accent/10 text-accent font-black px-1.5 py-0.5 rounded ml-2">{score.grade}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Class Tests Section */}
                    <div className="space-y-4 pt-4 border-t border-border/60">
                      <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                        <BookOpen size={14} className="text-accent" />
                        <span>Class Tests & periodic marks</span>
                      </h3>
                      <div className="space-y-3">
                        {classTests.length === 0 ? (
                          <p className="text-xs text-text-secondary italic text-center py-4">No class tests recorded yet.</p>
                        ) : (
                          classTests.map((ct, i) => (
                            <div key={i} className="p-3.5 bg-bg-main/30 border border-border rounded-xl flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold text-text-primary">{ct.subject}</p>
                                <span className="text-[9px] text-text-secondary">{ct.desc}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-text-primary">{ct.marks}</span>
                                <span className="text-[9px] bg-accent/10 text-accent font-black px-1.5 py-0.5 rounded ml-2">{ct.grade}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Fee Receipts & Payment Logs */}
                  <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
                    <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <CreditCard size={14} className="text-accent" />
                      <span>Term Fee Receipts & Settlement History</span>
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const hasPendingVerification = fees.history?.some(h => h.status === 'PENDING_VERIFICATION');
                        return (
                          <>
                            {fees.history.length === 0 ? (
                              <div className="p-4 bg-slate-50/50 border border-dashed border-border rounded-xl text-center">
                                <p className="text-xs text-text-secondary italic font-medium">No payments processed yet.</p>
                              </div>
                            ) : (
                              fees.history.map((h, i) => {
                                const isPending = h.status === 'PENDING_VERIFICATION';
                                return (
                                  <div 
                                    key={i} 
                                    onClick={() => handleViewReceiptFromHistory(child, h)}
                                    className={`p-3.5 bg-bg-main border border-border rounded-xl flex items-center justify-between cursor-pointer transition-all group/receipt ${
                                      isPending ? 'border-warning/30 hover:border-warning/50' : 'hover:border-accent/20'
                                    }`}
                                    title={isPending ? "Verification is pending" : "Click to view and print official receipt"}
                                  >
                                    <div className="min-w-0 flex-1 pr-2">
                                      <p className={`text-xs font-mono font-bold text-text-primary ${!isPending ? 'group-hover/receipt:text-accent' : ''} transition-colors truncate`}>
                                        {isPending ? `Verification Pending (UTR: ${h.utr})` : `Receipt ID: #${h.id}`}
                                      </p>
                                      <span className="text-[9px] text-text-secondary font-semibold block mt-0.5">
                                        {isPending ? `Submitted via: ${h.method} • ${h.date}` : `Settled via: ${h.method} • ${h.date}`}
                                      </span>
                                    </div>
                                    <div className="text-right flex items-center gap-3 shrink-0">
                                      <div>
                                        <span className={`text-sm font-black font-mono font-bold ${isPending ? 'text-warning' : 'text-success'}`}>
                                          ₹{h.amount.toLocaleString('en-IN')}
                                        </span>
                                        <span className={`text-[8px] border font-black px-1 rounded ml-1.5 uppercase block mt-0.5 text-center ${
                                          isPending 
                                            ? 'bg-warning/15 border-warning/35 text-warning' 
                                            : 'bg-success/15 border-success/35 text-success'
                                        }`}>
                                          {isPending ? 'Pending' : 'Paid'}
                                        </span>
                                      </div>
                                      {!isPending && <ChevronRight size={14} className="text-text-secondary opacity-0 group-hover/receipt:opacity-100 group-hover/receipt:translate-x-0.5 transition-all" />}
                                    </div>
                                  </div>
                                );
                              })
                            )}

                            {/* Remaining fees breakdown */}
                            <div className="p-4 bg-slate-100/50 border border-border rounded-xl flex justify-between items-center text-xs">
                              <span className="text-text-secondary font-bold">Outstanding Remaining Balance:</span>
                              <span className={`font-mono font-black ${fees.remaining > 0 ? 'text-warning text-sm' : 'text-success'}`}>
                                ₹{fees.remaining.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Online Pay Now Button */}
                            {fees.remaining > 0 ? (
                              hasPendingVerification ? (
                                <div className="space-y-2">
                                  <div className="p-4 bg-warning/5 border border-warning/20 rounded-2xl text-xs text-warning flex items-start gap-2.5">
                                    <Clock size={16} className="shrink-0 mt-0.5 text-warning" />
                                    <div>
                                      <p className="font-bold text-text-primary text-[11px]">Verification In Progress</p>
                                      <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                                        Your payment receipt is currently under review by the finance desk. You will be notified once settled.
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    disabled
                                    className="w-full py-3.5 bg-slate-100 text-text-secondary font-black rounded-2xl cursor-not-allowed flex items-center justify-center gap-2 text-sm border border-border"
                                  >
                                    <Lock size={15} /> Payment Under Verification
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    const classStructures = sharedFeeStructures.filter(fs => fs.tenant_id === activeTenant.id && fs.class_id === child.class_id);
                                    const addons = sharedStudentFeeAddons[child.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
                                    const bd = classStructures.map(fs => ({ label: fs.name, code: fs.code, amount: fs.amount }));
                                    if (addons.transport.enabled && addons.transport.fee > 0) bd.push({ label: 'Transport Fee', code: 'TRP', amount: addons.transport.fee });
                                    if (addons.hostel.enabled && addons.hostel.fee > 0) bd.push({ label: 'Hostel Fee', code: 'HST', amount: addons.hostel.fee });
                                    const tot = classStructures.reduce((s, f) => s + f.amount, 0) + (addons.transport.enabled ? addons.transport.fee : 0) + (addons.hostel.enabled ? addons.hostel.fee : 0);
                                    setPaymentTarget({ child, fees, feeBreakdown: bd, totalFee: tot });
                                  }}
                                  className="w-full py-3.5 bg-gradient-to-r from-accent to-indigo-500 hover:from-accent/90 hover:to-indigo-500/90 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-accent/20 active:scale-[0.98]"
                                >
                                  <Zap size={15} className="fill-white" />
                                  Pay ₹{fees.remaining.toLocaleString('en-IN')} Online Now
                                </button>
                              )
                            ) : (
                              <div className="w-full py-3 bg-success/10 border border-success/30 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-success">
                                <BadgeCheck size={14} /> Fee Fully Settled — No Balance Due
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>


                  {/* Hostel Assets & Inventory Fees */}
                  {isChildHostelResident(child.id) && (
                    <div className="lg:col-span-2 p-6 bg-bg-sidebar/40 border border-border rounded-3xl space-y-4">
                      <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                        <Package size={14} className="text-accent" />
                        <span>Hostel Assets & Inventory Fees Ledger</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Equipment items */}
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Issued Items Ledger</span>
                          <div className="space-y-2">
                            {(sharedHostelInventoryAllocations || [])
                              .filter(a => a.studentId === child.id)
                              .map((item, idx) => {
                                const remaining = item.cost - item.paid;
                                return (
                                  <div key={idx} className="p-3 bg-slate-50/50 border border-border rounded-xl flex justify-between items-center text-xs gap-3">
                                    <div>
                                      <p className="font-bold text-text-primary">{item.item}</p>
                                      <span className="text-[9px] text-text-secondary">Issued: {item.date}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-mono font-bold text-text-primary block">₹{item.cost}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-1 inline-block ${
                                        item.status === 'PAID' 
                                          ? 'bg-success/15 text-success border border-success/35'
                                          : item.status === 'PARTIAL'
                                          ? 'bg-warning/15 text-warning border border-warning/35'
                                          : 'bg-danger/15 text-danger border border-danger/35'
                                      }`}>
                                        {item.status === 'PAID' ? 'Paid' : `₹${remaining} Due`}
                                      </span>
                                      {item.status !== 'PAID' && (
                                        <button
                                          onClick={() => setHostelPayTarget({ child, alloc: item })}
                                          className="mt-1.5 px-2 py-1 bg-gradient-to-r from-accent to-indigo-500 text-white text-[8px] font-black rounded-lg flex items-center gap-1 w-full justify-center hover:opacity-90 transition-all"
                                        >
                                          <Zap size={8} className="fill-white" /> Pay Online
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            {(sharedHostelInventoryAllocations || []).filter(a => a.studentId === child.id).length === 0 && (
                              <p className="text-xs text-text-secondary italic py-4 text-center border border-dashed border-border rounded-xl">
                                No hostel equipment issued to child.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Transaction receipts history */}
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Equipment Settlement Receipts</span>
                          <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                            {(sharedHostelInventoryAllocations || [])
                              .filter(a => a.studentId === child.id)
                              .flatMap(a => (a.payments || []).map(p => ({ ...p, item: a.item })))
                              .map((pay, i) => (
                                <div key={i} className="p-3.5 bg-bg-card/85 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border rounded-xl flex justify-between items-center text-xs">
                                  <div>
                                    <p className="font-mono font-bold text-text-primary">Receipt: #{pay.id}</p>
                                    <span className="text-[9px] text-text-secondary">{pay.item} • {pay.date}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-black text-success">₹{pay.amount}</span>
                                    <span className="text-[8px] bg-success/10 text-success font-black px-1.5 py-0.5 rounded uppercase ml-1.5">Paid</span>
                                  </div>
                                </div>
                              ))
                            }
                            {(sharedHostelInventoryAllocations || [])
                              .filter(a => a.studentId === child.id)
                              .flatMap(a => a.payments || []).length === 0 && (
                                <p className="text-xs text-text-secondary italic py-4 text-center border border-dashed border-border rounded-xl">
                                  No equipment payments recorded.
                                </p>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Child School Bus & Transport Details */}
                  {childTransportRoute(child.id) && (() => {
                    const route = childTransportRoute(child.id);
                    return (
                      <div className="lg:col-span-2 p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border pb-3">
                          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                            <Bus size={14} className="text-accent" />
                            <span>Assigned School Bus & Route</span>
                          </h3>
                          {route.gpsEnabled && (
                            <button
                              onClick={() => setSelectedTrackRoute(route)}
                              className="px-4 py-2 bg-success hover:bg-success-hover text-black text-xs font-black uppercase rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
                            >
                              <Navigation size={12} className="rotate-45" />
                              <span>Track Live ETA: {route.id === activeTrackedRoute?.id ? activeTrackedRoute?.etaMinutes : route.etaMinutes || 12}m</span>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 bg-bg-main/40 border border-border rounded-2xl space-y-3">
                            <div>
                              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Route Description</span>
                              <p className="text-sm font-bold text-text-primary mt-1">{route.name}</p>
                            </div>
                            <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
                              <span className="text-text-secondary">Monthly Corridor Fee:</span>
                              <span className="font-mono font-bold text-text-primary">₹{route.fee.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <div className="p-4 bg-bg-main/40 border border-border rounded-2xl space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Bus License No.</span>
                                <span className="text-xs font-mono font-black text-accent">{route.bus}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Driver Name</span>
                                <span className="text-xs font-bold text-text-primary">{route.driver}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
                              <span className="text-text-secondary">Driver Contact:</span>
                              <span className="font-mono font-bold text-text-primary">{route.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}



                  {/* Remarks Row */}
                  <div className="lg:col-span-2 p-6 bg-slate-50/50 border border-border rounded-3xl space-y-4">
                    <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider">Teacher Remarks & Contacts</h3>
                    <div className="space-y-3">
                      {remarks.length === 0 ? (
                        <p className="text-xs text-text-secondary italic">No faculty remarks entered yet.</p>
                      ) : (
                        remarks.map((rm, i) => (
                          <div key={i} className="p-3 bg-bg-main/30 border border-border rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-text-primary">{rm.teacher}</span>
                              <span className="text-[9px] text-text-secondary opacity-50 font-bold">{rm.date}</span>
                            </div>
                            <p className="text-[11px] text-text-secondary italic">"{rm.remark}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Past Academic Years for Child */}
                  {(() => {
                    const childHistory = sharedStudentHistory[child.id] || [];
                    if (childHistory.length === 0) return null;
                    return (
                      <div className="lg:col-span-2 p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-5">
                        <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                          <History size={14} className="text-accent" />
                          <span>Past Academic Years — {child.first_name}</span>
                        </h3>
                        <div className="space-y-5">
                          {childHistory.map((record, hIdx) => (
                            <div key={hIdx} className="relative pl-5 border-l-2 border-accent/20 space-y-3">
                              <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg-sidebar"></div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-black uppercase text-accent tracking-widest">Year {record.academic_year}</span>
                                  <h4 className="text-xs font-bold text-text-primary mt-0.5">{record.class_name}</h4>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 bg-accent/5 border border-accent/10 rounded text-[9px] font-bold text-text-primary">
                                    Attendance: {record.attendance}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                    record.fees?.status === 'PAID'
                                      ? 'bg-success/5 border-success/15 text-success'
                                      : record.fees?.status === 'PARTIAL'
                                      ? 'bg-warning/5 border-warning/15 text-warning'
                                      : 'bg-danger/5 border-danger/15 text-danger'
                                  }`}>
                                    Fees: {record.fees?.status}
                                  </span>
                                </div>
                              </div>
                              {record.academic_records && record.academic_records.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {record.academic_records.map((ar, arIdx) => (
                                    <div key={arIdx} className="p-2.5 bg-bg-main/40 border border-border rounded-lg flex justify-between items-center text-[11px]">
                                      <span className="font-medium text-text-secondary truncate pr-2">{ar.subject}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="font-bold text-text-primary">{ar.marks}</span>
                                        <span className="px-1 py-0.5 bg-accent/10 text-[8px] font-black text-accent rounded">{ar.grade}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {record.remarks && record.remarks.length > 0 && (
                                <div className="space-y-1.5">
                                  {record.remarks.map((rem, rIdx) => (
                                    <div key={rIdx} className="p-2 bg-bg-sidebar border border-border/50 rounded-lg">
                                      <p className="text-[10px] text-text-primary italic">"{rem.remark}"</p>
                                      <span className="text-[8px] text-text-secondary font-semibold">{rem.teacher} — {rem.date}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {/* School Notices section */}
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
            <div className="flex items-center gap-2 text-text-primary">
              <Megaphone size={18} className="text-accent" />
              <h3 className="text-lg font-black font-outfit">Circulars & Announcements</h3>
            </div>
              {(() => {
                const parentNotices = sharedNotices.filter(n => n.tenant_id === activeTenant.id && (n.target === 'ALL' || n.target === 'PARENT' || !n.target));
                if (parentNotices.length === 0) {
                  return (
                    <p className="text-xs text-text-secondary italic py-8 text-center border border-dashed border-border rounded-2xl">
                      No active announcements today.
                    </p>
                  );
                }
                return parentNotices.map((notice) => (
                  <div key={notice.id} className="p-5 bg-bg-main/40 border border-border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-black text-text-primary">{notice.title}</h4>
                      <span className="text-[10px] text-text-secondary opacity-50 font-bold">{notice.date}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{notice.body}</p>
                    <div className="flex items-center gap-2 text-[9px] text-text-secondary uppercase tracking-widest">
                      <span className="font-black text-accent">{notice.author}</span>
                    </div>
                  </div>
                ));
              })()}

          </div>
        </div>
      )}

      {/* ===== ONLINE PAYMENT MODAL ===== */}
      {paymentTarget && (
        <OnlinePaymentModal
          child={paymentTarget.child}
          fees={paymentTarget.fees}
          feeBreakdown={paymentTarget.feeBreakdown}
          totalFee={paymentTarget.totalFee}
          onClose={() => setPaymentTarget(null)}
          onSuccess={(methodLabel, pendingDetails, amountPaid) => {
            if (pendingDetails) {
              handleOnlinePaymentPending(
                paymentTarget.child,
                methodLabel || 'Scan QR / Bank Transfer',
                pendingDetails,
                amountPaid
              );
            } else {
              handleOnlinePaymentSuccess(
                paymentTarget.child,
                methodLabel || paymentTarget._method || 'Online Payment',
                amountPaid
              );
            }
          }}
        />
      )}

      {/* ===== HOSTEL ITEM ONLINE PAYMENT MODAL ===== */}
      {hostelPayTarget && (() => {
        const { child, alloc } = hostelPayTarget;
        const outstanding = alloc.cost - alloc.paid;
        const syntheticFees = { remaining: outstanding, total: alloc.cost, paid: alloc.paid, status: alloc.status, history: [] };
        const syntheticBreakdown = [{ label: alloc.item, code: 'HINV', amount: alloc.cost }];
        return (
          <OnlinePaymentModal
            child={{ ...child, admission_no: child.admission_no }}
            fees={syntheticFees}
            feeBreakdown={syntheticBreakdown}
            totalFee={alloc.cost}
            onClose={() => setHostelPayTarget(null)}
            onSuccess={(methodLabel, pendingDetails, amountPaid) => handleHostelItemPaySuccess(child, alloc, methodLabel || 'Online Payment', amountPaid)}
          />
        );
      })()}

      {/* ===== RECEIPT MODAL FOR PARENTS ===== */}
      <style>{`
        @page {
          size: portrait;
          margin: 8mm 6mm;
        }
        @media print {
          /* General resets for printer */
          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide main app shell components */
          main, aside, header, nav, .no-print, button, footer {
            display: none !important;
          }
          
          /* Target React Portal backdrop overlay */
          div[class*="backdrop-blur-md"],
          div[class*="fixed"][class*="inset-0"] {
            position: absolute !important;
            inset: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            z-index: auto !important;
          }
          
          /* Expand modal card container to cover page */
          div[class*="bg-bg-card"][class*="rounded-"] {
            max-width: 100% !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            transform: none !important;
          }
          
          /* Hide modal title header */
          div[class*="border-b"][class*="flex"][class*="justify-between"] {
            display: none !important;
          }
          
          /* Expand modal scrollable content wrapper */
          div[class*="max-h-"][class*="overflow-y-auto"] {
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Reset receipt card container */
          #fee-receipt-print-root {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            position: relative !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print-receipt {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Compress vertical spacing and elements for single-page print */
          .print-receipt .bg-gradient-to-r {
            padding: 12px 16px !important;
          }
          .print-receipt .px-8 {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          .print-receipt .py-6 {
            padding-top: 12px !important;
            padding-bottom: 12px !important;
          }
          .print-receipt .py-2.5 {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          .print-receipt .space-y-6 > * + * {
            margin-top: 10px !important;
          }
          .print-receipt .grid {
            gap: 12px !important;
          }
          .print-receipt table th,
          .print-receipt table td {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
            font-size: 9px !important;
          }
          .print-receipt .h-14 {
            height: 36px !important;
          }
          .print-receipt .text-xl {
            font-size: 14px !important;
          }
          .print-receipt .text-lg {
            font-size: 11px !important;
          }
          .print-receipt .text-sm {
            font-size: 11px !important;
          }
          .print-receipt .text-[11px] {
            font-size: 9px !important;
          }
          .print-receipt .p-3 {
            padding: 6px 10px !important;
          }
          .print-receipt .pt-4 {
            padding-top: 8px !important;
          }
        }
      `}</style>


      <Modal
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Official Fee Receipt"
        icon={<Receipt size={16} />}
        size="lg"
      >
        {selectedReceipt && (
          <div className="space-y-4 text-black">
            {/* === PRINTABLE RECEIPT === */}
            <div
              id="fee-receipt-print-root"
              ref={receiptRef}
              className="print-receipt bg-white border border-slate-200 rounded-2xl overflow-hidden"
              style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
            >
              {/* ── Institution Header ── */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-8 py-6">
                <div className="flex items-center justify-between gap-4">
                  {/* Logo + Name */}
                  <div className="flex items-center gap-4">
                    {selectedReceipt.schoolLogo ? (
                      <img src={selectedReceipt.schoolLogo} alt="logo" className="w-16 h-16 rounded-xl object-cover bg-white" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white text-2xl font-black">
                        {selectedReceipt.schoolName[0]}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-black leading-tight">{selectedReceipt.schoolName}</h2>
                      {selectedReceipt.schoolAffiliation && (
                        <p className="text-white/70 text-[10px] mt-0.5 font-medium">{selectedReceipt.schoolAffiliation}</p>
                      )}
                      {selectedReceipt.schoolEstYear && (
                        <p className="text-white/50 text-[9px] mt-0.5">Est. {selectedReceipt.schoolEstYear}</p>
                      )}
                    </div>
                  </div>
                  {/* Receipt label */}
                  <div className="text-right shrink-0">
                    <p className="text-white/50 text-[9px] uppercase tracking-widest font-black">Official Receipt</p>
                    <p className="text-white font-mono font-black text-sm mt-0.5">{selectedReceipt.id}</p>
                    <p className="text-white/60 text-[10px] mt-0.5">{selectedReceipt.dateDisplay} {selectedReceipt.time}</p>
                  </div>
                </div>
              </div>

              {/* ── Institution Contact Strip ── */}
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-2.5 flex flex-wrap gap-x-6 gap-y-1">
                {selectedReceipt.schoolAddress && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {selectedReceipt.schoolAddress}
                  </span>
                )}
                {selectedReceipt.schoolPhone && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.42 2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16z"/></svg>
                    {selectedReceipt.schoolPhone}
                  </span>
                )}
                {selectedReceipt.schoolEmail && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {selectedReceipt.schoolEmail}
                  </span>
                )}
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* ── Student Details Row ── */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Student Information</p>
                    {[
                      { label: 'Student Name', val: selectedReceipt.studentName },
                      { label: 'Admission No.', val: selectedReceipt.admissionNo },
                      { label: 'Class / Section', val: selectedReceipt.className },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-baseline">
                        <span className="text-[10px] text-slate-400">{row.label}</span>
                        <span className="text-[11px] font-bold text-slate-800">{row.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Payment Information</p>
                    {[
                      { label: 'Receipt No.', val: selectedReceipt.id },
                      { label: 'Payment Date', val: selectedReceipt.dateDisplay },
                      { label: 'Payment Mode', val: selectedReceipt.method },
                      { label: 'Collected By', val: selectedReceipt.collectedBy },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-baseline">
                        <span className="text-[10px] text-slate-400">{row.label}</span>
                        <span className="text-[11px] font-bold text-slate-800 font-mono">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Fee Breakdown Table ── */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fee Breakdown</p>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="text-left py-2 px-3 text-[9px] font-black uppercase tracking-wider rounded-tl-lg">#</th>
                        <th className="text-left py-2 px-3 text-[9px] font-black uppercase tracking-wider">Fee Component</th>
                        <th className="text-left py-2 px-3 text-[9px] font-black uppercase tracking-wider">Code</th>
                        <th className="text-right py-2 px-3 text-[9px] font-black uppercase tracking-wider rounded-tr-lg">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReceipt.feeBreakdown || []).map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="py-2 px-3 text-slate-400 font-mono">{String(i + 1).padStart(2, '0')}</td>
                          <td className="py-2 px-3 text-slate-700 font-medium">{row.label}</td>
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px] uppercase">{row.code}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">₹{row.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                    {(() => {
                      const rows = [
                        { label: 'Total Fee', val: selectedReceipt.totalFee, color: 'text-slate-700', bg: 'bg-white' }
                      ];
                      if (selectedReceipt.discount > 0) {
                        rows.push({ label: 'Discount Applied Now', val: selectedReceipt.discount, color: 'text-amber-600', bg: 'bg-amber-50', bold: true });
                      }
                      rows.push(
                        { label: 'Previously Paid', val: selectedReceipt.newPaid - selectedReceipt.amount, color: 'text-slate-500', bg: 'bg-slate-50' },
                        { label: 'Amount Paid Now', val: selectedReceipt.amount, color: 'text-emerald-600', bg: 'bg-emerald-50', bold: true },
                        { label: 'Balance Remaining', val: selectedReceipt.newRemaining, color: selectedReceipt.newRemaining > 0 ? 'text-amber-600' : 'text-emerald-600', bg: 'bg-white', bold: true }
                      );
                      return rows.map((r, i) => (
                        <div key={i} className={`flex justify-between items-center px-4 py-2 ${r.bg} ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                          <span className={`text-[11px] ${r.color} ${r.bold ? 'font-black' : ''}`}>{r.label}</span>
                          <span className={`text-[11px] font-mono ${r.color} ${r.bold ? 'font-black' : ''}`}>
                            {r.val === 0 && r.label === 'Balance Remaining' ? 'FULLY CLEARED' : `₹${r.val.toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* ── Amount in Words ── */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Amount in Words: </span>
                  <span className="text-[10px] text-slate-700 font-medium italic">Rupees {numberToWords(selectedReceipt.amount)} Only</span>
                </div>

                {/* ── Signature Section ── */}
                <div className="grid grid-cols-3 gap-6 pt-4">
                  {[
                    { label: 'Student / Parent Signature', sub: 'Received by' },
                    { label: 'Cashier / Accountant', sub: selectedReceipt.collectedBy },
                    { label: 'Principal / Authorised Signatory', sub: selectedReceipt.schoolName },
                  ].map((sig, i) => (
                    <div key={i} className="text-center space-y-2">
                      <div className="h-14 border-b-2 border-slate-300 border-dashed flex items-end justify-center pb-1 relative">
                        {sig.label === 'Cashier / Accountant' && (
                          <span className="text-2xl text-blue-600 font-bold select-none transform -rotate-2 tracking-wide block" style={{ fontFamily: 'var(--font-caveat), cursive' }}>
                            {sig.sub}
                          </span>
                        )}
                        {sig.label === 'Principal / Authorised Signatory' && (
                          <span className="text-xl text-slate-700 font-bold select-none absolute bottom-1 opacity-80" style={{ fontFamily: 'var(--font-caveat), cursive' }}>
                            {sig.sub.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{sig.label}</p>
                        <p className="text-[8px] text-slate-400 mt-0.5 truncate">{sig.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Status Badge + Footer Note ── */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedReceipt.newStatus === 'PAID' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : selectedReceipt.newStatus === 'PARTIAL'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      selectedReceipt.newStatus === 'PAID' ? 'bg-emerald-500' : selectedReceipt.newStatus === 'PARTIAL' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    Account Status: {selectedReceipt.newStatus}
                  </div>
                  <p className="text-[8px] text-slate-300 italic">This is a computer-generated receipt. No physical signature required.</p>
                </div>
              </div>
            </div>

            {/* Print Action Bar */}
            <div className="flex justify-end gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
              >
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Live GPS Tracking Modal */}
      <Modal
        open={!!activeTrackedRoute}
        onClose={() => setSelectedTrackRoute(null)}
        title={`Live Child Commute Tracking — ${activeTrackedRoute?.bus || ''}`}
        icon={<Navigation size={18} className="text-success animate-pulse rotate-45" />}
        size="lg"
      >
        {activeTrackedRoute && (() => {
          const eta = activeTrackedRoute.etaMinutes || 12;
          const pct = Math.max(5, Math.min(95, ((15 - eta) / 14) * 100));
          const speed = eta > 1 ? 35 + Math.floor((pct % 7) * 2) : 0;
          
          return (
            <div className="space-y-6 text-text-primary">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Commute Route</span>
                  <span className="text-sm font-black mt-0.5 block">{activeTrackedRoute.name}</span>
                </div>
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Estimated Arrival</span>
                  <span className="text-sm font-black text-success mt-0.5 block flex items-center gap-1.5">
                    <Clock size={14} className="animate-pulse" />
                    {eta > 1 ? `${eta} mins` : 'Arrived at Campus'}
                  </span>
                </div>
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Driver Info</span>
                  <span className="text-xs font-bold text-text-primary mt-0.5 block">
                    {activeTrackedRoute.driver} ({activeTrackedRoute.phone})
                  </span>
                </div>
              </div>

              {/* GPS Hardware Configuration */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border border-border rounded-2xl space-y-3">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">
                  {activeTrackedRoute.trackingMethod === 'MOBILE' ? 'GPS Mobile App Registration' : 'GPS Hardware Device Registration'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
                  <div className="p-3.5 bg-white dark:bg-slate-950/40 border border-border rounded-xl">
                    <span className="text-[8px] text-text-secondary uppercase block font-bold">
                      {activeTrackedRoute.trackingMethod === 'MOBILE' ? 'Mobile Client OS' : 'Hardware Model'}
                    </span>
                    <span className="font-bold text-text-primary mt-1 block">
                      {activeTrackedRoute.gpsModel || (activeTrackedRoute.trackingMethod === 'MOBILE' ? 'Android App' : 'Teltonika FMB920')}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-950/40 border border-border rounded-xl">
                    <span className="text-[8px] text-text-secondary uppercase block font-bold">
                      {activeTrackedRoute.trackingMethod === 'MOBILE' ? 'Driver Device Token' : 'Device ID / IMEI'}
                    </span>
                    <span className="font-bold font-mono text-text-primary mt-1 block uppercase">
                      {activeTrackedRoute.gpsDeviceID || 'GPS-N/A'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-950/40 border border-border rounded-xl">
                    <span className="text-[8px] text-text-secondary uppercase block font-bold">
                      {activeTrackedRoute.trackingMethod === 'MOBILE' ? 'Driver Mobile Number' : 'Cellular SIM Number'}
                    </span>
                    <span className="font-bold font-mono text-text-primary mt-1 block">
                      {activeTrackedRoute.gpsSimNo || activeTrackedRoute.phone || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* High-Fidelity SVG Route Tracker */}
              <div className="p-6 bg-slate-950 text-white rounded-3xl border border-slate-800 relative overflow-hidden h-64 flex flex-col justify-between">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
                
                <div className="flex justify-between items-center z-10">
                  <span className={`text-[10px] ${activeTrackedRoute.trackingMethod === 'MOBILE' && !activeTrackedRoute.driverBroadcasting ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-success/20 text-success border-success/30'} px-2.5 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 ${activeTrackedRoute.trackingMethod === 'MOBILE' && !activeTrackedRoute.driverBroadcasting ? 'bg-amber-500' : 'bg-success animate-ping'} rounded-full`}></span>
                    {activeTrackedRoute.trackingMethod === 'MOBILE' 
                      ? (activeTrackedRoute.driverBroadcasting ? 'Mobile App Streaming' : 'Awaiting Driver Broadcast') 
                      : 'Live GPS Telemetry Active'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Last ping: {activeTrackedRoute.lastUpdated ? new Date(activeTrackedRoute.lastUpdated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>

                <div className="relative my-auto z-10 py-6">
                  <svg className="w-full h-12" viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M 5 6 Q 25 1, 50 6 T 95 6" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
                    <path 
                      d={`M 5 6 Q 25 1, 50 6 T 95 6`} 
                      fill="none" 
                      stroke="url(#accentGradient)" 
                      strokeWidth="2" 
                      strokeDasharray="100"
                      strokeDashoffset={100 - pct} 
                    />
                    
                    <defs>
                      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div 
                    className="absolute -translate-y-9 -translate-x-1/2 transition-all duration-1000 ease-out flex flex-col items-center animate-pulse"
                    style={{ left: `${pct}%` }}
                  >
                    <div className="px-2 py-1 bg-success text-[8px] font-black text-black rounded-lg shadow-lg border border-success-hover uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Bus size={10} />
                      <span>{activeTrackedRoute.bus}</span>
                    </div>
                    <div className="w-4 h-4 bg-success rounded-full border-4 border-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                  </div>

                  <div className="absolute left-[5%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-950"></div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Depot</span>
                  </div>
                  <div className="absolute left-[35%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-950"></div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Stop A</span>
                  </div>
                  <div className="absolute left-[65%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-950"></div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Stop B</span>
                  </div>
                  <div className="absolute left-[95%] top-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                    <span className="text-[8px] text-emerald-400 font-black mt-1.5 uppercase tracking-wider">Campus Gate</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-900 pt-3 z-10 font-mono">
                  <span>Speed: <strong className="text-white">{speed} km/h</strong></span>
                  <span>Sats: <strong className="text-white">12 Connected</strong></span>
                  <span>Accuracy: <strong className="text-success">0.82 (High)</strong></span>
                  <span>Signal: <strong className="text-success">Strong</strong></span>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ==========================================
// 4. ACCOUNTANT DASHBOARD
// ==========================================
function AccountantDashboard() {
  const { 
    activeTenant, sharedStudents, sharedFeeRecords, setSharedFeeRecords, 
    sharedClasses, sharedParents, setSharedNotifications, sharedFeeStructures, 
    sharedStudentFeeAddons 
  } = useAuth();

  const feeInvoices = useMemo(() => {
    return sharedStudents
      .filter(s => s.tenant_id === activeTenant.id)
      .map(s => {
        const fee = sharedFeeRecords[s.id] || { total: s.totalFee || 32000, paid: s.paidFee || 0, remaining: (s.totalFee || 32000) - (s.paidFee || 0), status: 'UNPAID', history: [] };
        const cls = sharedClasses.find(c => c.id === s.class_id);
        return {
          id: s.id,
          student: `${s.first_name} ${s.last_name}`,
          cls: cls ? cls.name : 'General Class',
          amount: fee.remaining,
          status: fee.remaining <= 0 ? 'PAID' : 'DUE'
        };
      })
      .slice(0, 15);
  }, [sharedStudents, sharedFeeRecords, sharedClasses, activeTenant.id]);

  const handlePay = (studentId) => {
    const s = sharedStudents.find(std => std.id === studentId);
    if (!s) return;
    const currentFee = sharedFeeRecords[studentId] || { total: s.totalFee || 32000, paid: s.paidFee || 0, remaining: (s.totalFee || 32000) - (s.paidFee || 0), status: 'UNPAID', history: [] };
    const payAmt = currentFee.remaining;

    const receiptId = `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toISOString().split('T')[0];
    const dateDisplay = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const newHistory = [{
      id: receiptId,
      date: nowStr,
      amount: payAmt,
      method: 'Cash/UPI Counter'
    }, ...currentFee.history];

    setSharedFeeRecords(prev => ({
      ...prev,
      [studentId]: {
        ...currentFee,
        paid: currentFee.paid + payAmt,
        remaining: 0,
        status: 'PAID',
        history: newHistory
      }
    }));

    // Generate full receipt details for parent notification
    const cls = sharedClasses.find(c => c.id === s.class_id);
    const structures = sharedFeeStructures.filter(fs => fs.tenant_id === activeTenant.id && fs.class_id === s.class_id);
    const addons = sharedStudentFeeAddons[studentId] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
    const feeBreakdown = structures.map(fs => ({ label: fs.name, code: fs.code, amount: fs.amount }));
    if (addons.transport.enabled && addons.transport.fee > 0) feeBreakdown.push({ label: 'Transport Fee', code: 'TRP', amount: addons.transport.fee });
    if (addons.hostel.enabled && addons.hostel.fee > 0) feeBreakdown.push({ label: 'Hostel Fee', code: 'HST', amount: addons.hostel.fee });

    const receipt = {
      id: receiptId,
      date: nowStr,
      dateDisplay,
      time: timeStr,
      amount: payAmt,
      method: 'Cash/UPI Counter',
      studentName: `${s.first_name} ${s.last_name}`,
      admissionNo: s.admission_no,
      className: cls ? cls.name : 'General Class',
      schoolName: activeTenant.name,
      totalFee: currentFee.total,
      newPaid: currentFee.paid + payAmt,
      newRemaining: 0,
      newStatus: 'PAID',
      collectedBy: 'Accountant Counter',
      schoolAddress: activeTenant.address || '',
      schoolPhone: activeTenant.phone || '',
      schoolEmail: activeTenant.email || `admin@${activeTenant.subdomain}.edu.in`,
      schoolAffiliation: activeTenant.affiliation || '',
      schoolEstYear: activeTenant.estYear || '',
      schoolLogo: activeTenant.logo || '',
      schoolSubdomain: activeTenant.subdomain || '',
      feeBreakdown
    };

    const parent = sharedParents?.find(p => p.id === s.parent_id);
    if (parent && setSharedNotifications) {
      setSharedNotifications(prev => [
        {
          id: `notif-${Date.now()}-${s.id}`,
          tenant_id: activeTenant.id,
          recipient_id: parent.id,
          title: `📄 Fee Receipt Confirmed: ${s.first_name} ${s.last_name}`,
          body: `Receipt ${receiptId}: ₹${payAmt.toLocaleString('en-IN')} paid via Cash/UPI Counter. Outstanding balance: ₹0.`,
          type: 'FEE_PAYMENT',
          date: nowStr,
          read: false,
          metadata: {
            receiptId,
            amount: payAmt,
            studentId: s.id,
            receiptDetails: receipt
          }
        },
        ...prev
      ]);
    }

    toast.success(`Fee settled for ${s.first_name}. Receipt generated and sent to parent.`);
  };

  const totalExpected = useMemo(() => {
    return sharedStudents
      .filter(s => s.tenant_id === activeTenant.id)
      .reduce((sum, s) => sum + (s.totalFee || 32000), 0);
  }, [sharedStudents, activeTenant.id]);

  const totalCollected = useMemo(() => {
    return sharedStudents
      .filter(s => s.tenant_id === activeTenant.id)
      .reduce((sum, s) => {
        const fee = sharedFeeRecords[s.id] || { paid: s.paidFee || 0 };
        return sum + Number(fee.paid || 0);
      }, 0);
  }, [sharedStudents, sharedFeeRecords, activeTenant.id]);

  const totalOutstanding = totalExpected - totalCollected;

  const collectionsLakhs = (totalCollected / 100000).toFixed(2);
  const outstandingCount = sharedStudents.filter(s => {
    if (s.tenant_id !== activeTenant.id) return false;
    const fee = sharedFeeRecords[s.id] || { remaining: (s.totalFee || 32000) - (s.paidFee || 0) };
    return fee.remaining > 0;
  }).length;

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Finance Control Panel</h2>
        <p className="text-text-secondary text-sm font-medium mt-1 font-outfit">Accounting, collections, and payroll ledger for <span className="text-accent font-bold">{activeTenant.name}</span>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Collections Today', value: `₹${collectionsLakhs} L`, desc: 'Direct RTGS / UPI inward', icon: Wallet },
          { label: 'Outstanding Accounts', value: String(outstandingCount), desc: 'Pending fee balance', icon: FileBox },
          { label: 'Total Outstanding Balance', value: `₹${totalOutstanding.toLocaleString('en-IN')}`, desc: 'Expected recovery assets', icon: Users },
          { label: 'Overall Recovery', value: totalExpected > 0 ? `${((totalCollected / totalExpected) * 100).toFixed(1)}%` : '100%', desc: 'Paid vs outstanding', icon: CheckCircle2 }
        ].map((k, i) => (
          <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><k.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3 font-mono">{k.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dues Ledger */}
        <div className="lg:col-span-2 p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Fee Collection Ledger</h3>
          <div className="space-y-3">
            {feeInvoices.map(inv => (
              <div key={inv.id} className="p-4 bg-bg-main/40 border border-border rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all">
                <div>
                  <p className="text-sm font-bold text-text-primary">{inv.student}</p>
                  <p className="text-[10px] text-text-secondary font-bold">{inv.cls} • Student ID: #{inv.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-text-primary">₹{inv.amount.toLocaleString('en-IN')}</span>
                  {inv.status === 'DUE' ? (
                    <button 
                      onClick={() => handlePay(inv.id)}
                      className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-lg transition-all"
                    >
                      Receive Cash / UPI
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 bg-success/15 border border-success/35 text-success text-[9px] font-black uppercase rounded">Settled</span>
                  )}
                </div>
              </div>
            ))}
            {feeInvoices.length === 0 && (
              <p className="text-xs text-text-secondary italic text-center py-8">No billing invoices found in registry.</p>
            )}
          </div>
        </div>

        {/* Ledger Shortcuts */}
        <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
          <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider">Accounting Shortcuts</h3>
          <div className="space-y-2">
            {[
              { name: 'Define Fee Categories', icon: Plus },
              { name: 'Process Salary/Payroll', icon: FileBox },
              { name: 'Generate Bank Statements', icon: Wallet },
              { name: 'TDS & PF Calculations', icon: Settings }
            ].map((btn, idx) => (
              <button key={idx} className="w-full flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-white/[0.04] border border-border hover:border-accent/20 rounded-xl transition-all text-xs font-semibold text-text-secondary hover:text-text-primary text-left">
                <span className="flex items-center gap-2.5">
                  <btn.icon size={14} className="text-accent" />
                  {btn.name}
                </span>
                <ChevronRight size={12} className="opacity-40" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. LIBRARIAN DASHBOARD
// ==========================================
function LibrarianDashboard() {
  const { activeTenant, sharedBooks, sharedCirculations, sharedStudents } = useAuth();

  const activeIssues = useMemo(() => {
    return sharedCirculations
      .filter(c => c.tenant_id === activeTenant.id && c.status === 'ISSUED')
      .map(c => {
        const book = sharedBooks.find(b => b.id === c.book_id);
        const student = sharedStudents.find(s => s.id === c.student_id);
        return {
          id: c.id,
          title: book ? book.title : 'Library Volume',
          borrower: student ? `${student.first_name} ${student.last_name}` : 'Student/Staff',
          roll: student ? student.roll_no || 'N/A' : 'N/A',
          due: c.return_date || 'May 28, 2026',
          fine: c.fine || 0
        };
      })
      .slice(0, 10);
  }, [sharedCirculations, sharedBooks, sharedStudents, activeTenant.id]);

  const totalBooksCount = useMemo(() => {
    return sharedBooks
      .filter(b => b.tenant_id === activeTenant.id)
      .reduce((sum, b) => sum + Number(b.stock || 0), 0);
  }, [sharedBooks, activeTenant.id]);

  const totalCirculationsCount = useMemo(() => {
    return sharedCirculations.filter(c => c.tenant_id === activeTenant.id && c.status === 'ISSUED').length;
  }, [sharedCirculations, activeTenant.id]);

  const overdueCount = useMemo(() => {
    return activeIssues.filter(i => i.fine > 0).length;
  }, [activeIssues]);

  const totalFines = useMemo(() => {
    return activeIssues.reduce((sum, i) => sum + Number(i.fine), 0);
  }, [activeIssues]);

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Library Catalog</h2>
        <p className="text-text-secondary text-sm font-medium mt-1 font-outfit">Book catalog, circulation ledger, and library fine tracking for <span className="text-accent font-bold">{activeTenant.name}</span>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Books Cataloged', value: String(totalBooksCount), desc: 'Barcoded records', icon: Library },
          { label: 'Active Circulations', value: String(totalCirculationsCount), desc: 'Issued items', icon: BookOpenCheck },
          { label: 'Overdue Books', value: String(overdueCount), desc: 'Letters broadcasted', icon: AlertTriangle },
          { label: 'Outstanding Fines', value: `₹${totalFines.toLocaleString('en-IN')}`, desc: 'Late fee pending', icon: Wallet }
        ].map((k, i) => (
          <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><k.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3 font-mono">{k.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
          </div>
        ))}
      </div>

      {/* Circulation Logs */}
      <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
        <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Book Check-out & Return Circulation</h3>
        <div className="space-y-3">
          {activeIssues.map(b => (
            <div key={b.id} className="p-4 bg-bg-main/40 border border-border hover:border-accent/15 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all">
              <div>
                <p className="text-sm font-bold text-text-primary">"{b.title}"</p>
                <p className="text-[10px] text-text-secondary font-bold font-mono">Issued to: {b.borrower} ({b.roll})</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-text-secondary font-bold font-mono">Return Deadline: {b.due}</p>
                  {b.fine > 0 && <span className="text-[9px] text-danger font-bold">Fine Accrued: ₹{b.fine}</span>}
                </div>
                <Link href="/dashboard/library?tab=returns" className="px-3.5 py-1.5 bg-slate-100 border border-border hover:border-accent/30 text-text-primary text-[10px] font-bold rounded-lg transition-all">
                  Receive Return
                </Link>
              </div>
            </div>
          ))}
          {activeIssues.length === 0 && (
            <p className="text-xs text-text-secondary italic text-center py-8">No books checked out currently.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. TRANSPORT MANAGER DASHBOARD
// ==========================================
function TransportDashboard() {
  const { activeTenant, sharedTransportRoutes } = useAuth();

  const routesList = useMemo(() => {
    return sharedTransportRoutes
      .filter(r => r.tenant_id === activeTenant.id)
      .map(r => ({
        id: r.id,
        route: r.route_name || r.name,
        bus: r.vehicle_no || r.bus,
        driver: r.driver_name || r.driver,
        passengers: 35,
        status: r.status || 'PARKED'
      }));
  }, [sharedTransportRoutes, activeTenant.id]);

  const activeRoutesCount = routesList.length;
  const assignedPassengers = routesList.reduce((sum, r) => sum + r.passengers, 0);

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Fleet Control Room</h2>
        <p className="text-text-secondary text-sm font-medium mt-1 font-outfit">Bus routes mapping, fleet status logs, and student rosters for <span className="text-accent font-bold">{activeTenant.name}</span>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Bus Routes', value: String(activeRoutesCount), desc: 'Indian route registries', icon: Bus },
          { label: 'Assigned Passengers', value: `${assignedPassengers} Students`, desc: 'Enrolled profiles (estimated)', icon: Users },
          { label: 'Operational Fleet', value: `${activeRoutesCount} / ${activeRoutesCount}`, desc: 'Active transit vehicles', icon: Settings }
        ].map((k, i) => (
          <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><k.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3 font-mono">{k.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
          </div>
        ))}
      </div>

      {/* Routes List */}
      <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
        <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Fleet Route Status</h3>
        <div className="space-y-3">
          {routesList.map(r => (
            <div key={r.id} className="p-4 bg-bg-main/40 border border-border rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="text-sm font-bold text-text-primary font-outfit">{r.route}</p>
                <p className="text-[10px] text-text-secondary font-bold font-mono">Vehicle: {r.bus} • Driver: {r.driver} ({r.passengers} passengers)</p>
              </div>
              <div>
                {r.status === 'IN_TRANSIT' && <span className="px-2.5 py-1 bg-success/15 border border-success/35 text-success text-[9px] font-black uppercase rounded">In Transit</span>}
                {r.status === 'PARKED' && <span className="px-2.5 py-1 bg-slate-100 border border-border text-text-secondary text-[9px] font-black uppercase rounded">Parked</span>}
                {r.status === 'MAINTENANCE' && <span className="px-2.5 py-1 bg-danger/15 border border-danger/35 text-danger text-[9px] font-black uppercase rounded">In Workshop</span>}
              </div>
            </div>
          ))}
          {routesList.length === 0 && (
            <p className="text-xs text-text-secondary italic text-center py-8">No bus routes cataloged currently.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. HOSTEL WARDEN DASHBOARD
// ==========================================
function HostelDashboard() {
  const { activeTenant, sharedHostelBlocks } = useAuth();

  const blocksList = useMemo(() => {
    return sharedHostelBlocks.filter(b => b.tenant_id === activeTenant.id);
  }, [sharedHostelBlocks, activeTenant.id]);

  const roomsList = useMemo(() => {
    return blocksList.map((block, idx) => ({
      id: block.id,
      block: block.name,
      room: String(101 + idx),
      type: idx % 2 === 0 ? 'Double Sharing' : 'Triple Sharing',
      occup: idx % 2 === 0 ? '2 / 2' : '2 / 3',
      status: idx % 2 === 0 ? 'FULL' : 'VACANT'
    }));
  }, [blocksList]);

  const totalBlocksCount = blocksList.length;
  const totalBedsCount = blocksList.reduce((sum, b) => sum + 120, 0);

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Hostel Desk</h2>
        <p className="text-text-secondary text-sm font-medium mt-1 font-outfit">Hostel blocks room allocations, bed capacity, and mess records for <span className="text-accent font-bold">{activeTenant.name}</span>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Hostel Blocks', value: String(totalBlocksCount), desc: 'Boys and Girls residential blocks', icon: Home },
          { label: 'Warden Capacity', value: `${totalBedsCount} Beds`, desc: 'Beds pre-allocated', icon: Users },
          { label: 'Mess Operations', value: 'Active', desc: 'Dining mess corridors active', icon: Settings }
        ].map((k, i) => (
          <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><k.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3 font-mono">{k.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
          </div>
        ))}
      </div>

      {/* Hostel Allocation */}
      <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
        <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Hostel Room Allocation Dossier</h3>
        <div className="space-y-3">
          {roomsList.map(r => (
            <div key={r.id} className="p-4 bg-bg-main/40 border border-border rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <p className="text-sm font-bold text-text-primary font-outfit">{r.block} • Room {r.room}</p>
                <p className="text-[10px] text-text-secondary font-bold font-mono">Configuration: {r.type} ({r.occup} Beds Occupied)</p>
              </div>
              <div>
                {r.status === 'FULL' ? (
                  <span className="px-2.5 py-1 bg-danger/15 border border-danger/35 text-danger text-[9px] font-black uppercase rounded">No Vacancy</span>
                ) : (
                  <span className="px-2.5 py-1 bg-success/15 border border-success/35 text-success text-[9px] font-black uppercase rounded">Bed Available</span>
                )}
              </div>
            </div>
          ))}
          {roomsList.length === 0 && (
            <p className="text-xs text-text-secondary italic text-center py-8">No residential blocks registered currently.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MASTER DISPATCHER
// ==========================================
export default function RoleDashboardDispatcher({ role }) {
  switch (role) {
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'STUDENT':
      return <StudentDashboard />;
    case 'PARENT':
      return <ParentDashboard />;
    case 'ACCOUNTANT':
      return <AccountantDashboard />;
    case 'LIBRARIAN':
      return <LibrarianDashboard />;
    case 'TRANSPORT_MANAGER':
      return <TransportDashboard />;
    case 'HOSTEL_WARDEN':
      return <HostelDashboard />;
    default:
      return (
        <div className="p-8 text-center glass rounded-2xl">
          <p className="text-sm text-text-secondary font-bold">Unable to dispatch view for role: {role}</p>
        </div>
      );
  }
}
