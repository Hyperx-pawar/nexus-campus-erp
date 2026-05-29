'use client';

import RoleGate from '@/components/RoleGate';
import React, { useState, useMemo, useRef } from 'react';
import { 
  Award, FileText, Printer, Search, CheckCircle2, 
  Sparkles, Clock, User, Landmark, ShieldCheck, 
  Download, Calendar, UserCheck, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';

export default function CertificateGeneratorPage() {
  const {
    activeTenant, 
    sharedStudents, 
    sharedParents, 
    sharedClasses, 
    activeRole, 
    activeUser
  } = useAuth();

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [certType, setCertType] = useState('bonafide'); // 'bonafide' | 'leaving' | 'character' | 'achievement'
  
  // Customization inputs
  const [purpose, setPurpose] = useState('Passport Application');
  const [leavingReason, setLeavingReason] = useState('Completed Secondary Education');
  const [leavingDate, setLeavingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [characterGrade, setCharacterGrade] = useState('Exemplary');
  const [extraCurricular, setExtraCurricular] = useState('Represented School in State Level Athletics');
  const [examPassed, setExamPassed] = useState('Class XII Board Examination');
  const [examRollNo, setExamRollNo] = useState('');
  const [passingYear, setPassingYear] = useState('2026');
  const [obtainedMarks, setObtainedMarks] = useState('92.4%');
  const [customTitle, setCustomTitle] = useState('Meritorious Scholarship Award');

  // Search/Filter states (for staff/admin)
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // Generation log
  const [historyLogs, setHistoryLogs] = useState([
    { id: 'CERT-BF-1002', studentName: 'Aarav Patel', type: 'Bonafide', date: '2026-05-24', purpose: 'Passport Application', serial: 'IITD/2026/BF/049' },
    { id: 'CERT-LC-0892', studentName: 'Diya Sharma', type: 'Leaving Certificate', date: '2026-05-20', purpose: 'Higher Studies Transfer', serial: 'IITD/2026/LC/102' }
  ]);

  const certificateRef = useRef(null);

  const allowedRoles = useMemo(() => ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'], []);
  const isAdminOrTeacher = activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'TEACHER';

  // Helper: Get class name
  const getClassName = (classId) => {
    const cls = sharedClasses.find(c => c.id === classId);
    return cls ? cls.name : 'Unassigned';
  };

  // Filter students based on role and search criteria
  const tenantStudents = useMemo(() => {
    return sharedStudents.filter(s => s.tenant_id === activeTenant.id);
  }, [sharedStudents, activeTenant.id]);

  const displayStudents = useMemo(() => {
    if (!isAdminOrTeacher) {
      // If student is logged in, find their own record
      return tenantStudents.filter(s => {
        return activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase());
      });
    }

    // Otherwise show filtered list for admin/teachers
    return tenantStudents.filter(s => {
      const term = searchQuery.toLowerCase();
      const className = getClassName(s.class_id).toLowerCase();
      const matchesSearch = 
        s.first_name.toLowerCase().includes(term) || 
        s.last_name.toLowerCase().includes(term) || 
        s.admission_no.toLowerCase().includes(term) ||
        className.includes(term);
      const matchesClass = classFilter === 'all' || s.class_id === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [tenantStudents, searchQuery, classFilter, isAdminOrTeacher, activeUser]);

  // Set initial student context
  React.useEffect(() => {
    if (displayStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(displayStudents[0].id);
    }
  }, [displayStudents, selectedStudentId]);

  // Resolve active student details
  const currentStudent = useMemo(() => {
    return tenantStudents.find(s => s.id === selectedStudentId);
  }, [tenantStudents, selectedStudentId]);

  // Resolve parent details
  const currentParent = useMemo(() => {
    if (!currentStudent) return null;
    return sharedParents.find(p => p.id === currentStudent.parent_id);
  }, [sharedParents, currentStudent]);

  // Generate Serial Number
  const generatedSerial = useMemo(() => {
    if (!currentStudent) return '—';
    const initials = activeTenant.subdomain ? activeTenant.subdomain.toUpperCase() : 'SCH';
    const typeCode = certType === 'bonafide' ? 'BF' : certType === 'leaving' ? 'LC' : certType === 'character' ? 'CC' : 'AW';
    const admPart = currentStudent.admission_no.split('/').pop() || currentStudent.id;
    return `${initials}/2026/${typeCode}/${admPart}`;
  }, [currentStudent, certType, activeTenant.subdomain]);

  // Authenticate role AFTER hooks are declared
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Certificate Hub" />;
  }

  const handlePrint = () => {
    if (!selectedStudentId) {
      toast.error('Please select a student first.');
      return;
    }

    // Add to history log
    const typeLabel = 
      certType === 'bonafide' ? 'Bonafide' : 
      certType === 'leaving' ? 'Leaving Certificate' : 
      certType === 'character' ? 'Character' : 'Achievement';

    const newLog = {
      id: `CERT-${Date.now().toString().slice(-4)}`,
      studentName: currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'Unknown Student',
      type: typeLabel,
      date: new Date().toISOString().split('T')[0],
      purpose: certType === 'bonafide' ? purpose : certType === 'leaving' ? leavingReason : certType === 'character' ? characterGrade : customTitle,
      serial: generatedSerial
    };

    setHistoryLogs(prev => [newLog, ...prev]);
    toast.success(`📜 Logged Certificate issuance for ${newLog.studentName}. Opening print dialog...`);
    
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Printable page layout adjustments */}
      <style>{`
        @media print {
          /* Hide main app components */
          main, aside, header, nav, .no-print, button, .sidebar, .header-container {
            display: none !important;
          }
          
          /* Full dimension resets */
          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }

          /* Force centering of the certificate block */
          #certificate-print-root {
            display: block !important;
            width: 297mm !important; /* A4 landscape dimension */
            height: 210mm !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 10mm !important;
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Official Certificate Hub</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Design, verify, and generate Indian legal academic certificates for verified students.
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] font-black text-accent bg-accent/5 border border-accent/20 px-3.5 py-2.5 rounded-xl uppercase tracking-wider">
          <ShieldCheck size={14} className="text-accent" />
          <span>Affiliated to {activeTenant.settings?.board || 'Central Board of Education'}</span>
        </div>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls Panel (5 Columns) */}
        <div className="lg:col-span-5 space-y-6 no-print">
          <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-5">
            <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2.5">
              <Sparkles size={16} className="text-accent" />
              <span>Generation Controls</span>
            </h3>

            {/* 1. Student search & select */}
            {isAdminOrTeacher ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Select Student *</label>
                  <span className="text-[9px] font-bold text-accent">{displayStudents.length} matches</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                    <input 
                      type="text" 
                      placeholder="Name, Roll No, Adm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 py-2.5 bg-bg-main border border-border rounded-xl outline-none focus:border-accent/40 text-text-primary"
                    />
                  </div>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="text-xs bg-bg-main border border-border rounded-xl px-2 py-2 text-text-primary outline-none"
                  >
                    <option value="all">All Classes</option>
                    {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs bg-bg-main border border-border rounded-xl p-3 text-text-primary outline-none focus:border-accent"
                >
                  <option value="">-- Choose verified student record --</option>
                  {displayStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({getClassName(s.class_id)} • Roll {s.roll_no})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              // Student Role view (Read-only student field)
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">Target Student Profile</label>
                <div className="p-3 bg-bg-main border border-border rounded-xl text-xs font-bold text-text-primary flex items-center gap-2">
                  <User size={14} className="text-accent" />
                  <span>{currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'No verified Student profile found'}</span>
                </div>
              </div>
            )}

            {/* 2. Certificate Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">Certificate Template Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'bonafide', label: 'Bonafide Cert.' },
                  { value: 'leaving', label: 'Leaving Cert. (LC)' },
                  { value: 'character', label: 'Character Cert.' },
                  { value: 'achievement', label: 'Academic Excellence' }
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCertType(t.value)}
                    className={`px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all text-center ${
                      certType === t.value 
                        ? 'bg-accent/10 border-accent text-accent' 
                        : 'bg-bg-main border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Conditional Customization Parameters */}
            <div className="space-y-4 pt-2 border-t border-border">
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block pl-1">Customize Template Fields</span>
              
              {/* BONAFIDE */}
              {certType === 'bonafide' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">Certificate Purpose *</label>
                  <select 
                    value={purpose} 
                    onChange={e => setPurpose(e.target.value)}
                    className="w-full text-xs bg-bg-main border border-border rounded-xl p-2.5 text-text-primary outline-none"
                  >
                    <option value="Passport Application">Passport Application & Police Verification</option>
                    <option value="Education Loan Application">Education Loan Sanction</option>
                    <option value="Bus Pass Procurement">State Transport Bus Pass</option>
                    <option value="Savings Bank Account Opening">Student Savings Bank Account</option>
                    <option value="Higher Studies Application">Admission Verification</option>
                  </select>
                </div>
              )}

              {/* LEAVING CERTIFICATE */}
              {certType === 'leaving' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">Reason for Leaving *</label>
                    <input 
                      type="text" 
                      value={leavingReason}
                      onChange={e => setLeavingReason(e.target.value)}
                      className="w-full text-xs"
                      placeholder="e.g. Higher studies transfer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-1">Leaving Date</label>
                      <input 
                        type="date" 
                        value={leavingDate}
                        onChange={e => setLeavingDate(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-1">Student Conduct</label>
                      <select
                        value={characterGrade}
                        onChange={e => setCharacterGrade(e.target.value)}
                        className="w-full text-xs bg-bg-main border border-border rounded-xl p-2 text-text-primary outline-none"
                      >
                        <option value="Exemplary">Exemplary</option>
                        <option value="Very Good">Very Good</option>
                        <option value="Good">Good</option>
                        <option value="Satisfactory">Satisfactory</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* CHARACTER CERTIFICATE */}
              {certType === 'character' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">General Conduct Evaluation *</label>
                    <select
                      value={characterGrade}
                      onChange={e => setCharacterGrade(e.target.value)}
                      className="w-full text-xs bg-bg-main border border-border rounded-xl p-2.5 text-text-primary outline-none"
                    >
                      <option value="Exemplary & Outstanding">Exemplary & Outstanding</option>
                      <option value="Very Good & Dutiful">Very Good & Dutiful</option>
                      <option value="Good & Well-Behaved">Good & Well-Behaved</option>
                      <option value="Satisfactory & Disciplined">Satisfactory & Disciplined</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">Extra-Curricular Highlights</label>
                    <input 
                      type="text" 
                      value={extraCurricular}
                      onChange={e => setExtraCurricular(e.target.value)}
                      className="w-full text-xs"
                      placeholder="e.g. Winner of Inter-School Essay Writing"
                    />
                  </div>
                </div>
              )}

              {/* ACHIEVEMENT CERTIFICATE */}
              {certType === 'achievement' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">Custom Title / Category</label>
                    <input 
                      type="text" 
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      className="w-full text-xs"
                      placeholder="e.g. Meritorious Academic Achievement"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-1">Examination / Board</label>
                      <input 
                        type="text" 
                        value={examPassed}
                        onChange={e => setExamPassed(e.target.value)}
                        className="w-full text-xs"
                        placeholder="e.g. Class XII CBSE Examination"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-1">Academic Year</label>
                      <input 
                        type="text" 
                        value={passingYear}
                        onChange={e => setPassingYear(e.target.value)}
                        className="w-full text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-1">Board Roll Number</label>
                      <input 
                        type="text" 
                        value={examRollNo}
                        onChange={e => setExamRollNo(e.target.value)}
                        className="w-full text-xs font-mono"
                        placeholder="e.g. 263948293"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-1">Obtained Percentage / CGPA</label>
                      <input 
                        type="text" 
                        value={obtainedMarks}
                        onChange={e => setObtainedMarks(e.target.value)}
                        className="w-full text-xs font-mono"
                        placeholder="e.g. 92.4% or 9.5 CGPA"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions button */}
            <div className="pt-2">
              <button
                onClick={handlePrint}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-slate-800/10 active:scale-[0.98] transition-all"
              >
                <Printer size={14} />
                <span>Verify & Print Certificate</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Live Preview (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Header block for live preview panel */}
          <div className="w-full max-w-[700px] flex items-center justify-between px-2 mb-2 no-print">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">A4 Landscape Certificate Preview</span>
            <span className="text-[9px] font-black bg-success/15 border border-success/35 text-success px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle size={10} /> DRAFT VERIFIED
            </span>
          </div>

          {/* PRINTABLE CONTAINER ROOT */}
          <div
            id="certificate-print-root"
            ref={certificateRef}
            className="w-full max-w-[700px] aspect-[1.414] bg-[#faf8f5] border-[12px] border-double border-slate-800 p-6 flex flex-col justify-between relative shadow-xl rounded-lg overflow-hidden select-none"
            style={{ fontFamily: "'Georgia', 'Outfit', sans-serif" }}
          >
            {/* Watermark Seal Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
              <Award size={400} className="text-slate-800" />
            </div>

            {/* 1. Header Section */}
            <div className="text-center space-y-1 relative z-10 border-b-2 border-slate-800/20 pb-3">
              <h1 className="text-base font-black uppercase text-slate-800 tracking-wider font-outfit leading-none">
                {activeTenant.name}
              </h1>
              <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">
                {activeTenant.affiliation}
              </p>
              <p className="text-[8px] text-slate-400">
                {activeTenant.address} • Ph: {activeTenant.phone}
              </p>
            </div>

            {/* 2. Title & Metadata */}
            <div className="text-center space-y-2 relative z-10 my-1">
              <h2 className="text-lg font-black uppercase text-slate-800 tracking-widest underline decoration-double decoration-slate-800 underline-offset-4">
                {certType === 'bonafide' && 'Certificate of Bonafide'}
                {certType === 'leaving' && 'College Leaving Certificate'}
                {certType === 'character' && 'Character & Conduct Certificate'}
                {certType === 'achievement' && 'Certificate of Excellence'}
              </h2>
              
              <div className="flex justify-between px-6 text-[8px] font-mono text-slate-500">
                <span>Certificate No: <strong className="text-slate-700">{generatedSerial}</strong></span>
                <span>Date of Issue: <strong className="text-slate-700">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
              </div>
            </div>

            {/* 3. Certificate Body Wording */}
            <div className="px-8 text-center text-[10.5px] leading-relaxed text-slate-700 font-medium relative z-10 space-y-3.5 my-2">
              
              {/* BONAFIDE TEXT */}
              {certType === 'bonafide' && (
                <p>
                  This is to certify that Master / Miss{' '}
                  <strong className="text-slate-900 border-b border-slate-700/40 px-1 font-bold text-[11px]">
                    {currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'STUDENT NAME'}
                  </strong>
                  , son / daughter of{' '}
                  <strong className="text-slate-800 border-b border-slate-700/40 px-1">
                    {currentParent ? `Shri ${currentParent.first_name} ${currentParent.last_name}` : 'GUARDIAN NAME'}
                  </strong>
                  , is a bonafide student of this institution. He / She is currently enrolled in{' '}
                  <strong className="text-slate-900 border-b border-slate-700/40 px-1">
                    {currentStudent ? getClassName(currentStudent.class_id) : 'CLASS DETAILS'}
                  </strong>{' '}
                  under Roll Number{' '}
                  <strong className="text-slate-800 font-mono">
                    {currentStudent ? currentStudent.roll_no : 'XX'}
                  </strong>{' '}
                  for the academic session <strong className="text-slate-800 font-mono">2026 - 2027</strong>.
                  <br />
                  <span className="block mt-2.5">
                    As per our official registry, his / her date of birth is{' '}
                    <strong className="text-slate-900 font-mono">
                      {currentStudent ? new Date(currentStudent.date_of_birth).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'DATE OF BIRTH'}
                    </strong>
                    . This certificate is officially issued to him / her upon request for the specific purpose of{' '}
                    <strong className="text-slate-900 italic border-b border-slate-700/30 px-1">{purpose}</strong>.
                  </span>
                </p>
              )}

              {/* LEAVING CERTIFICATE TEXT */}
              {certType === 'leaving' && (
                <p>
                  This is to certify that{' '}
                  <strong className="text-slate-900 border-b border-slate-700/40 px-1 font-bold text-[11px]">
                    {currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'STUDENT NAME'}
                  </strong>
                  , Admission No:{' '}
                  <strong className="text-slate-800 font-mono border-b border-slate-700/40 px-1">
                    {currentStudent ? currentStudent.admission_no : 'ADM-XXXX'}
                  </strong>
                  , was admitted to this institution on <strong className="text-slate-800 font-mono">12-Jun-2024</strong> and has left the institution on{' '}
                  <strong className="text-slate-900 font-mono border-b border-slate-700/40 px-1">
                    {new Date(leavingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </strong>{' '}
                  having cleared all outstanding financial dues.
                  <br />
                  <span className="block mt-2">
                    He / She was studying in{' '}
                    <strong className="text-slate-900 border-b border-slate-700/40 px-1">
                      {currentStudent ? getClassName(currentStudent.class_id) : 'CLASS DETAILS'}
                    </strong>{' '}
                    and has successfully cleared the curriculum with reason: {' '}
                    <strong className="text-slate-900 border-b border-slate-700/30 px-1">{leavingReason}</strong>.
                  </span>
                  <span className="block mt-2">
                    His / Her general character and conduct during the enrollment period were observed to be{' '}
                    <strong className="text-slate-900 italic border-b border-slate-700/30 px-1">{characterGrade}</strong>. We wish him / her all success in future academic endeavors.
                  </span>
                </p>
              )}

              {/* CHARACTER TEXT */}
              {certType === 'character' && (
                <p>
                  This is to certify that Master / Miss{' '}
                  <strong className="text-slate-900 border-b border-slate-700/40 px-1 font-bold text-[11px]">
                    {currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'STUDENT NAME'}
                  </strong>
                  , Admission No:{' '}
                  <strong className="text-slate-800 font-mono border-b border-slate-700/40 px-1">
                    {currentStudent ? currentStudent.admission_no : 'ADM-XXXX'}
                  </strong>
                  , son / daughter of{' '}
                  <strong className="text-slate-800 border-b border-slate-700/40 px-1">
                    {currentParent ? `Shri ${currentParent.first_name} ${currentParent.last_name}` : 'GUARDIAN NAME'}
                  </strong>
                  , was a student of this college/school during the academic term 2024 - 2026.
                  <br />
                  <span className="block mt-2.5">
                    To the best of our knowledge and records, his / her general conduct, discipline, and moral character have been{' '}
                    <strong className="text-slate-900 italic border-b border-slate-700/30 px-1">{characterGrade}</strong>. He / She actively participated in co-curricular operations, specifically:{' '}
                    <strong className="text-slate-800 border-b border-slate-700/30 px-1">{extraCurricular}</strong>.
                  </span>
                  <span className="block mt-2.5">
                    He / She bears no adverse record of any breach of institutional code. We wish him / her a prosperous career.
                  </span>
                </p>
              )}

              {/* ACHIEVEMENT TEXT */}
              {certType === 'achievement' && (
                <p>
                  This Certificate of Honor is proudly conferred upon{' '}
                  <strong className="text-slate-900 border-b border-slate-700/40 px-1 font-bold text-[12px] block my-1">
                    {currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'STUDENT NAME'}
                  </strong>
                  in recognition of his / her meritorious performance in the{' '}
                  <strong className="text-slate-900 border-b border-slate-700/40 px-1">
                    {examPassed}
                  </strong>{' '}
                  held during the academic year <strong className="text-slate-800 font-mono">{passingYear}</strong>.
                  <br />
                  <span className="block mt-2.5">
                    Under Board Roll Number{' '}
                    <strong className="text-slate-900 font-mono border-b border-slate-700/40 px-1">
                      {examRollNo || '263948293'}
                    </strong>
                    , he / she secured an outstanding evaluation aggregate of{' '}
                    <strong className="text-slate-900 font-mono border-b border-slate-700/40 px-1 text-[11px]">
                      {obtainedMarks}
                    </strong>
                    , ranking among the top students in{' '}
                    <strong className="text-slate-800">{currentStudent ? getClassName(currentStudent.class_id) : 'CLASS'}</strong>.
                  </span>
                  <span className="block mt-2.5 text-[9.5px] italic text-slate-500">
                    Awarded this day in witness of the academic council. Title category: &quot;{customTitle}&quot;.
                  </span>
                </p>
              )}
            </div>

            {/* 4. Signatures Section */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/10 text-center relative z-10 my-1">
              <div className="space-y-1">
                <div className="h-6 border-b border-slate-400 border-dashed flex items-end justify-center pb-0.5 relative">
                  <span className="text-[11px] text-blue-600 font-signature tracking-wider font-semibold select-none transform -rotate-1">
                    Anjali.S
                  </span>
                </div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Class Teacher</p>
              </div>
              <div className="space-y-1">
                <div className="h-6 border-b border-slate-400 border-dashed flex items-end justify-center pb-0.5 relative">
                  <span className="text-[11px] text-blue-600 font-signature tracking-wider font-semibold select-none transform -rotate-1">
                    R.K.Deewan
                  </span>
                </div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Registrar / Dean</p>
              </div>
              <div className="space-y-1">
                <div className="h-6 border-b border-slate-400 border-dashed flex items-end justify-center pb-0.5 relative">
                  <div className="absolute w-8 h-8 rounded-full border border-red-500/20 flex items-center justify-center text-[5px] text-red-500 font-bold uppercase tracking-tighter transform -rotate-12 bg-red-500/[0.02] bottom-1">
                    SEAL
                  </div>
                  <span className="text-[11.5px] text-blue-700 font-signature tracking-wider font-semibold select-none transform -rotate-2">
                    Vikram.P
                  </span>
                </div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Principal / Director</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Issuance History Log (no-print) */}
      <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary font-outfit flex items-center gap-1.5">
            <Clock size={14} className="text-accent" />
            <span>Issuance & Printing Logs</span>
          </h3>
          <span className="text-[9px] font-bold text-text-secondary">Historical register of legal document codes</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                <th className="pb-2.5 pl-2">Serial Number</th>
                <th className="pb-2.5">Student Name</th>
                <th className="pb-2.5">Certificate Type</th>
                <th className="pb-2.5">Date Issued</th>
                <th className="pb-2.5">Details / Purpose</th>
                <th className="pb-2.5 text-right pr-2">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-text-secondary">
              {historyLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 pl-2 font-mono font-bold text-text-primary">{log.serial}</td>
                  <td className="py-3 font-bold text-text-primary">{log.studentName}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 bg-accent/5 border border-accent/20 rounded-md text-[9px] font-bold text-accent">
                      {log.type}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[10px]">{log.date}</td>
                  <td className="py-3 italic text-[10.5px] max-w-[200px] truncate" title={log.purpose}>{log.purpose}</td>
                  <td className="py-3 text-right pr-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-success uppercase">
                      <UserCheck size={10} />
                      <span>DigiLocker Verified</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
