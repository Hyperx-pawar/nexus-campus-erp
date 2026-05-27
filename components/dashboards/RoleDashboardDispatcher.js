'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, BookOpen, Calendar, ClipboardList, Library, Home, Bus, 
  Briefcase, Wallet, FileBox, Settings, Activity, CheckCircle2, 
  Clock, Plus, ArrowRight, ShieldCheck, Star, Sparkles, BookOpenCheck,
  AlertTriangle, CreditCard, ChevronRight, UserCheck, Megaphone, Package
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Link from 'next/link';

// ==========================================
// 1. TEACHER DASHBOARD
// ==========================================
function TeacherDashboard() {
  const { activeUser, activeTenant, sharedClasses, sharedStaff, sharedSubjects, activeRole } = useAuth();
  
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
    </div>
  );
}

// ==========================================
// 2. STUDENT DASHBOARD
// ==========================================
function StudentDashboard() {
  const { activeUser, activeTenant, sharedStudents, sharedClasses, sharedSubjects, sharedCirculations, sharedFeeRecords } = useAuth();

  // Find active student record
  const myStudentProfile = useMemo(() => {
    return sharedStudents.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
  }, [sharedStudents, activeTenant.id, activeUser]);

  const studentClass = useMemo(() => {
    if (!myStudentProfile) return null;
    return sharedClasses.find(c => c.id === myStudentProfile.class_id && c.tenant_id === activeTenant.id);
  }, [myStudentProfile, sharedClasses, activeTenant.id]);

  // Student subjects (courses)
  const studentCourses = useMemo(() => {
    if (!myStudentProfile) return [
      { id: 1, code: 'PH-101', name: 'Introductory Mechanics', progress: 85, teacher: 'Prof. Rajesh Iyer' },
      { id: 2, code: 'CY-102', name: 'Organic Chemistry Core', progress: 60, teacher: 'Dr. Ramesh Kumar' }
    ];
    return sharedSubjects
      .filter(sub => sub.class_id === myStudentProfile.class_id && sub.tenant_id === activeTenant.id)
      .map((sub, idx) => ({
        id: sub.id,
        code: sub.code,
        name: sub.name,
        progress: 85 - (idx * 15),
        teacher: 'Subject Teacher'
      }));
  }, [myStudentProfile, sharedSubjects, activeTenant.id]);

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
    </div>
  );
}

// ==========================================
// 3. PARENT DASHBOARD
// ==========================================
function ParentDashboard() {
  const { 
    sharedStudents, 
    sharedParents, 
    sharedAcademicRecords, 
    sharedFeeRecords, 
    sharedAttendanceRecords, 
    sharedRemarks,
    sharedNotices,
    activeParentId,
    sharedHostelInventoryAllocations,
    activeTenant
  } = useAuth();

  // Find simulated parent profile restricted to active tenant
  const tenantParents = sharedParents.filter(p => p.tenant_id === activeTenant.id);
  const parentProfile = tenantParents.find(p => p.id === activeParentId) || tenantParents[0];

  // Find linked children
  const linkedStudents = sharedStudents.filter(s => s.parent_id === (parentProfile?.id || '') && s.tenant_id === activeTenant.id);

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
            const remarks = sharedRemarks[child.id] || [];
            const fees = sharedFeeRecords[child.id] || { total: 15400, paid: 0, remaining: 15400, status: 'UNPAID', history: [] };

            return (
              <div key={`details-${child.id}`} className="space-y-6 pt-4 border-t border-border">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-border rounded-xl text-text-primary text-xs font-bold font-outfit">
                  <span>Detailed Records for: {child.first_name} {child.last_name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Academic Marks */}
                  <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
                    <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <BookOpenCheck size={14} className="text-accent" />
                      <span>Term 1 Assessment Marks</span>
                    </h3>
                    <div className="space-y-3">
                      {marks.length === 0 ? (
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

                  {/* Right Column: Fee Receipts & Payment Logs */}
                  <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
                    <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <CreditCard size={14} className="text-accent" />
                      <span>Term Fee Receipts & Settlement History</span>
                    </h3>
                    <div className="space-y-3">
                      {fees.history.length === 0 ? (
                        <div className="p-4 bg-slate-50/50 border border-dashed border-border rounded-xl text-center">
                          <p className="text-xs text-text-secondary italic font-medium">No payments processed yet.</p>
                        </div>
                      ) : (
                        fees.history.map((h, i) => (
                          <div key={i} className="p-3.5 bg-bg-main border border-border rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-xs font-mono font-bold text-text-primary">Receipt ID: #{h.id}</p>
                              <span className="text-[9px] text-text-secondary font-semibold">Settled via: {h.method} • {h.date}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-success font-mono">₹{h.amount.toLocaleString('en-IN')}</span>
                              <span className="text-[8px] bg-success/15 border border-success/35 text-success font-black px-1 rounded ml-1.5 uppercase block mt-0.5">Paid</span>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Remaining fees breakdown */}
                      <div className="p-4 bg-slate-100/50 border border-border rounded-xl flex justify-between items-center text-xs">
                        <span className="text-text-secondary font-bold">Outstanding Remaining Balance:</span>
                        <span className={`font-mono font-black ${fees.remaining > 0 ? 'text-warning text-sm' : 'text-success'}`}>
                          ₹{fees.remaining.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hostel Assets & Inventory Fees */}
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
                                <div key={idx} className="p-3 bg-slate-50/50 border border-border rounded-xl flex justify-between items-center text-xs">
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
            <div className="space-y-4">
              {sharedNotices.filter(n => n.tenant_id === activeTenant.id).map((notice) => (
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. ACCOUNTANT DASHBOARD
// ==========================================
function AccountantDashboard() {
  const { activeTenant, sharedStudents, sharedFeeRecords, setSharedFeeRecords, sharedClasses } = useAuth();

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

    const newHistory = [...(currentFee.history || []), {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: payAmt,
      method: 'Cash/UPI Counter'
    }];

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

    toast.success(`Fee settled for ${s.first_name}. Receipt generated.`);
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
