'use client';

import RoleGate from '@/components/RoleGate';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Search, Printer, Shield, Sparkles, 
  ChevronRight, RefreshCw, Layers, CheckCircle2, User, Eye, Users
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';

// Reusable SVG Barcode Component
const BarcodeSVG = ({ value }) => {
  const bars = [2, 1, 3, 1, 2, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 4, 1, 2];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg viewBox="0 0 100 24" className="w-28 h-5 text-black dark:text-white" preserveAspectRatio="none">
        <g fill="currentColor">
          {bars.map((w, idx) => (
            <rect key={idx} x={idx * 4} y="0" width={w} height="20" />
          ))}
        </g>
      </svg>
      <span className="text-[6px] font-mono tracking-[0.2em] font-semibold uppercase">{value}</span>
    </div>
  );
};

// Reusable SVG QR Code Component
const QRCodeSVG = ({ value }) => {
  return (
    <svg viewBox="0 0 100 100" className="w-8 h-8 p-0.5 bg-white border border-slate-200 rounded shrink-0">
      {/* Position Detection Patterns */}
      <rect x="0" y="0" width="30" height="30" fill="black" />
      <rect x="5" y="5" width="20" height="20" fill="white" />
      <rect x="10" y="10" width="10" height="10" fill="black" />
      
      <rect x="70" y="0" width="30" height="30" fill="black" />
      <rect x="75" y="5" width="20" height="20" fill="white" />
      <rect x="80" y="10" width="10" height="10" fill="black" />
      
      <rect x="0" y="70" width="30" height="30" fill="black" />
      <rect x="5" y="75" width="20" height="20" fill="white" />
      <rect x="10" y="80" width="10" height="10" fill="black" />

      {/* Alignment Pattern */}
      <rect x="70" y="70" width="10" height="10" fill="black" />
      <rect x="85" y="70" width="15" height="15" fill="black" />
      <rect x="70" y="85" width="15" height="15" fill="black" />

      {/* Fake Data Blocks */}
      <rect x="35" y="5" width="10" height="10" fill="black" />
      <rect x="50" y="15" width="15" height="10" fill="black" />
      <rect x="35" y="35" width="25" height="5" fill="black" />
      <rect x="40" y="45" width="10" height="15" fill="black" />
      <rect x="55" y="55" width="10" height="10" fill="black" />
      <rect x="15" y="40" width="10" height="15" fill="black" />
    </svg>
  );
};

export default function IDCardGeneratorPage() {
  const {
    activeTenant, 
    sharedStudents, 
    sharedStaff, 
    activeRole,
    activeUser,
    sharedClasses
  } = useAuth();

  // Filter students & staff by tenant
  const tenantStudents = useMemo(() => sharedStudents.filter(s => s.tenant_id === activeTenant.id), [sharedStudents, activeTenant.id]);
  const tenantStaff = useMemo(() => sharedStaff.filter(s => s.tenant_id === activeTenant.id), [sharedStaff, activeTenant.id]);
  const tenantClasses = useMemo(() => sharedClasses.filter(c => c.tenant_id === activeTenant.id), [sharedClasses, activeTenant.id]);

  // States
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('ALL');
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);
  
  const [selectedType, setSelectedType] = useState('student'); // 'student' | 'staff'
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [orientation, setOrientation] = useState('vertical'); // 'vertical' | 'horizontal'
  const [theme, setTheme] = useState('royal'); // 'royal' | 'emerald' | 'dark'
  
  // Customization Toggles
  const [showBloodGroup, setShowBloodGroup] = useState(true);
  const [showAadhaarPan, setShowAadhaarPan] = useState(true);
  const [showEmergencyPhone, setShowEmergencyPhone] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  // Auto-resolve which person to select based on role
  useEffect(() => {
    if (activeRole === 'STUDENT') {
      setSelectedType('student');
      const me = tenantStudents.find(s => s.first_name && activeUser.name.includes(s.first_name)) || tenantStudents[0];
      if (me) setSelectedPersonId(me.id);
    } else if (activeRole === 'PARENT') {
      setSelectedType('student');
      const child = tenantStudents.find(s => s.parent_id === activeUser.id) || tenantStudents[0];
      if (child) setSelectedPersonId(child.id);
    } else if (activeRole === 'TEACHER') {
      setSelectedType('staff');
      const me = tenantStaff.find(s => s.first_name && activeUser.name.includes(s.first_name)) || tenantStaff[0];
      if (me) setSelectedPersonId(me.id);
    } else {
      setSelectedType('student');
      if (tenantStudents.length > 0) setSelectedPersonId(tenantStudents[0].id);
    }
  }, [activeRole, activeUser, activeTenant]);

  // List of people for the search selector
  const availablePeople = selectedType === 'student' ? tenantStudents : tenantStaff;
  
  // Find active person record (if single mode)
  const activeRecord = selectedType === 'student' 
    ? tenantStudents.find(s => s.id === selectedPersonId)
    : tenantStaff.find(s => s.id === selectedPersonId);

  // Bulk records resolved
  const allBulkRecords = useMemo(() => {
    return selectedType === 'student'
      ? (bulkClassId === 'ALL' ? tenantStudents : tenantStudents.filter(s => s.class_id === bulkClassId))
      : tenantStaff;
  }, [selectedType, bulkClassId, tenantStudents, tenantStaff]);

  const bulkRecords = allBulkRecords.filter(r => selectedBulkIds.includes(r.id));

  // Sync selectedBulkIds when filters change
  useEffect(() => {
    const newIds = allBulkRecords.map(r => r.id);
    setSelectedBulkIds(prev => {
      if (prev.length === newIds.length && prev.every((id, idx) => id === newIds[idx])) {
        return prev;
      }
      return newIds;
    });
  }, [allBulkRecords]);

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="ID Card Generator" />;
  }

  const filteredPeople = availablePeople.filter(p => {
    const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const idCode = (selectedType === 'student' ? p.admission_no : p.employee_id || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || idCode.includes(searchQuery.toLowerCase());
  });

  const getClassName = (classId) => {
    const cls = sharedClasses.find(c => c.id === classId);
    return cls ? cls.name : 'General Class';
  };

  const handlePrint = () => {
    window.print();
  };

  // Theme Styles config
  const themeStyles = {
    royal: {
      primary: 'bg-blue-600',
      text: 'text-blue-600',
      accent: 'border-blue-500/30',
      gradient: 'from-blue-600/10 to-indigo-600/5',
      badge: 'bg-blue-600/10 text-blue-700 border-blue-500/20',
      badgeDark: 'bg-blue-600 text-white'
    },
    emerald: {
      primary: 'bg-emerald-600',
      text: 'text-emerald-600',
      accent: 'border-emerald-500/30',
      gradient: 'from-emerald-600/10 to-teal-600/5',
      badge: 'bg-emerald-600/10 text-emerald-700 border-emerald-500/20',
      badgeDark: 'bg-emerald-600 text-white'
    },
    dark: {
      primary: 'bg-slate-900',
      text: 'text-slate-900 dark:text-slate-200',
      accent: 'border-slate-800/55',
      gradient: 'from-slate-900/90 to-slate-800/40',
      badge: 'bg-slate-900/10 text-slate-800 border-slate-900/20 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      badgeDark: 'bg-slate-950 text-white border border-slate-800'
    }
  }[theme];

  // Helper Card Renders
  const renderCard = (record) => {
    if (!record) return null;
    return (
      <div 
        className={`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xl relative overflow-hidden select-none flex flex-col justify-between font-inter card-print-block ${
          orientation === 'vertical' 
            ? 'w-[204px] h-[324px] rounded-[14px]'
            : 'w-[324px] h-[204px] rounded-[14px] flex-row p-3 gap-3'
        }`}
        style={{
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          breakInside: 'avoid'
        }}
      >
        {/* ── VERTICAL BADGE LAYOUT ── */}
        {orientation === 'vertical' && (
          <>
            {/* Background Header Wave */}
            <div className={`h-[84px] ${themeStyles.primary} relative p-3 flex flex-col items-center justify-between text-white text-center`}>
              <div className="absolute inset-0 opacity-15 bg-gradient-to-b from-white to-transparent"></div>
              
              {/* Logo & School Header */}
              <div className="flex flex-col items-center gap-0.5 relative z-10 w-full">
                {showLogo && (
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
                    <Shield size={10} className="text-white fill-white/10" />
                  </div>
                )}
                <h4 className="text-[8px] font-black font-outfit uppercase tracking-wider truncate max-w-full leading-none mt-1">
                  {activeTenant.name}
                </h4>
                <span className="text-[6px] tracking-widest opacity-80 uppercase leading-none mt-0.5 font-bold">
                  Identity Badge
                </span>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col items-center justify-between p-3.5 pt-0 -mt-7 relative z-10 w-full">
              {/* Photo / Initials */}
              <div className="relative group/avatar mb-1">
                <div className="absolute inset-0 bg-accent rounded-full blur-[4px] opacity-10 group-hover/avatar:opacity-20 transition-opacity"></div>
                {record.profile_picture_url ? (
                  <img 
                    src={record.profile_picture_url} 
                    alt="Avatar" 
                    className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-md relative z-10" 
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-md relative z-10">
                    <User size={24} className="text-slate-400" />
                  </div>
                )}
              </div>

              {/* Name & Role */}
              <div className="text-center w-full">
                <h3 className="text-xs font-black font-outfit uppercase tracking-tight text-slate-900 dark:text-white truncate">
                  {record.first_name} {record.last_name}
                </h3>
                <span className={`inline-block text-[7px] font-black tracking-[0.18em] uppercase px-2 py-0.5 mt-1 rounded ${themeStyles.badge}`}>
                  {selectedType === 'student' ? 'Student' : record.designation || 'Staff'}
                </span>
              </div>

              {/* Info grid */}
              <div className="w-full grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] border-t border-b border-slate-100 dark:border-slate-800/60 py-1.5 my-1.5 leading-tight font-medium text-slate-600 dark:text-slate-400">
                <div>
                  <span className="text-[6px] opacity-50 block uppercase">ID CODE</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-white">
                    {selectedType === 'student' ? record.admission_no : record.employee_id}
                  </span>
                </div>
                <div>
                  <span className="text-[6px] opacity-50 block uppercase">
                    {selectedType === 'student' ? 'CLASS' : 'DEPT'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white truncate block">
                    {selectedType === 'student' ? getClassName(record.class_id) : 'Academics'}
                  </span>
                </div>
                {showBloodGroup && (
                  <div>
                    <span className="text-[6px] opacity-50 block uppercase">BLOOD GP</span>
                    <span className="font-bold text-red-500 font-mono">
                      {record.blood_group || 'O+'}
                    </span>
                  </div>
                )}
                {showAadhaarPan && (
                  <div>
                    <span className="text-[6px] opacity-50 block uppercase">
                      {selectedType === 'student' ? 'AADHAAR' : 'PAN CODE'}
                    </span>
                    <span className="font-bold font-mono text-slate-800 dark:text-white">
                      {selectedType === 'student' ? (record.aadhaar_no || 'N/A') : (record.pan_no || 'N/A')}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer: Signature / Barcode */}
              <div className="w-full flex items-center justify-between gap-2 mt-auto">
                {showBarcode ? (
                  <BarcodeSVG value={selectedType === 'student' ? record.admission_no : record.employee_id} />
                ) : (
                  <div className="flex-1"></div>
                )}

                {showSignature && (
                  <div className="text-right shrink-0">
                    <svg className="w-10 h-5 text-accent opacity-75 inline-block" viewBox="0 0 100 40">
                      <path d="M10 30 Q 30 10, 50 30 T 90 20" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="text-[5px] block font-black uppercase text-slate-400 tracking-wider">Dean Office</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── HORIZONTAL BADGE LAYOUT ── */}
        {orientation === 'horizontal' && (
          <>
            {/* Left Stripe: Header, Crest, QR Code */}
            <div className={`w-[84px] shrink-0 ${themeStyles.primary} rounded-lg p-2 flex flex-col justify-between items-center text-white relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-15 bg-gradient-to-b from-white to-transparent"></div>
              
              {showLogo && (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center border border-white/30 relative z-10">
                  <span className="text-[9px] text-white font-black font-outfit uppercase">
                    {activeTenant?.name ? activeTenant.name.charAt(0) : 'C'}
                  </span>
                </div>
              )}
              
              <QRCodeSVG value={selectedType === 'student' ? record.admission_no : record.employee_id} />
              
              <div className="text-center relative z-10 w-full">
                <span className="text-[5px] tracking-widest uppercase leading-none font-black block">
                  {activeTenant?.subdomain ? activeTenant.subdomain.toUpperCase() : 'CAMPUS'}
                </span>
                <span className="text-[4px] tracking-widest opacity-75 uppercase leading-none block mt-0.5">Verified</span>
              </div>
            </div>

            {/* Right Area: Info details */}
            <div className="flex-1 flex flex-col justify-between py-1 pr-1 text-slate-800 dark:text-slate-100">
              {/* Institutional name */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between items-start gap-1">
                <h4 className="text-[7px] font-black font-outfit uppercase tracking-wider truncate max-w-[75%]">
                  {activeTenant.name}
                </h4>
                <span className={`inline-block text-[5px] font-black tracking-widest uppercase px-1 py-0.5 rounded leading-none ${themeStyles.badge}`}>
                  {selectedType === 'student' ? 'Student' : record.designation || 'Staff'}
                </span>
              </div>

              {/* Header row: Avatar + Name */}
              <div className="flex items-center gap-2 my-1">
                {record.profile_picture_url ? (
                  <img 
                    src={record.profile_picture_url} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shadow" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow">
                    <User size={18} className="text-slate-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-[10px] font-black font-outfit uppercase tracking-tight text-slate-900 dark:text-white truncate">
                    {record.first_name} {record.last_name}
                  </h3>
                  <span className="text-[6px] font-mono text-slate-400 font-bold block uppercase leading-none mt-0.5">
                    {selectedType === 'student' ? record.admission_no : record.employee_id}
                  </span>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7px] leading-tight font-medium text-slate-500">
                <div>
                  <span className="text-[5px] opacity-50 uppercase">
                    {selectedType === 'student' ? 'Class' : 'Dept'}
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">
                    {selectedType === 'student' ? getClassName(record.class_id) : 'Academics'}
                  </span>
                </div>
                {showBloodGroup && (
                  <div>
                    <span className="text-[5px] opacity-50 uppercase">Blood</span>
                    <span className="font-bold text-red-500 font-mono">
                      {record.blood_group || 'O+'}
                    </span>
                  </div>
                )}
                {showAadhaarPan && (
                  <div>
                    <span className="text-[5px] opacity-50 uppercase">
                      {selectedType === 'student' ? 'Aadhaar' : 'PAN'}
                    </span>
                    <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                      {selectedType === 'student' ? (record.aadhaar_no || 'N/A') : (record.pan_no || 'N/A')}
                    </span>
                  </div>
                )}
                {showEmergencyPhone && (
                  <div>
                    <span className="text-[5px] opacity-50 uppercase">Emergency</span>
                    <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                      +91 98765 43210
                    </span>
                  </div>
                )}
              </div>

              {/* Footer line: Barcode or signature */}
              <div className="mt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-1">
                {showBarcode ? (
                  <BarcodeSVG value={selectedType === 'student' ? record.admission_no : record.employee_id} />
                ) : (
                  <div className="flex-1"></div>
                )}

                {showSignature && (
                  <div className="text-right shrink-0">
                    <span className="text-[4px] block font-black uppercase text-slate-400 tracking-wider">Dean Office</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">ID Card Badge Generator</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Design, customize, and print CR80 standard identity badges for <span className="text-accent font-bold">{activeTenant.name}</span>.
          </p>
        </div>

        <button 
          onClick={handlePrint}
          className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <Printer size={14} />
          <span>{isBulkMode ? `Print All (${bulkRecords.length})` : 'Print ID Card'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Panel: Customize Controls (no-print) */}
        <div className="lg:col-span-5 space-y-6 no-print">
          
          {/* Print Mode Selector */}
          <div className="p-6 bg-bg-sidebar/55 border border-border rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase text-accent tracking-widest font-outfit">Select Selection Mode</h3>
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 border border-border rounded-xl">
              <button 
                onClick={() => setIsBulkMode(false)}
                className={`flex-1 py-2 text-center text-[10px] font-black uppercase rounded-lg transition-all ${!isBulkMode ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Single Recipient
              </button>
              {['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'].includes(activeRole) && (
                <button 
                  onClick={() => setIsBulkMode(true)}
                  className={`flex-1 py-2 text-center text-[10px] font-black uppercase rounded-lg transition-all ${isBulkMode ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Bulk Batch Print
                </button>
              )}
            </div>
          </div>

          {/* Card Selection */}
          <div className="p-6 bg-bg-sidebar/55 border border-border rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase text-accent tracking-widest font-outfit">
              {isBulkMode ? 'Bulk Batch Criteria' : 'Select Card Recipient'}
            </h3>
            
            {['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'].includes(activeRole) ? (
              <div className="space-y-3">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 border border-border rounded-xl">
                  <button 
                    onClick={() => {
                      setSelectedType('student');
                      setSearchQuery('');
                      const firstStud = tenantStudents[0];
                      if (firstStud) setSelectedPersonId(firstStud.id);
                    }}
                    className={`flex-1 py-2 text-center text-[10px] font-black uppercase rounded-lg transition-all ${selectedType === 'student' ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Students
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedType('staff');
                      setSearchQuery('');
                      const firstStaff = tenantStaff[0];
                      if (firstStaff) setSelectedPersonId(firstStaff.id);
                    }}
                    className={`flex-1 py-2 text-center text-[10px] font-black uppercase rounded-lg transition-all ${selectedType === 'staff' ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Faculty / Staff
                  </button>
                </div>

                {!isBulkMode ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                      <input 
                        type="text" 
                        placeholder={`Search ${selectedType === 'student' ? 'student' : 'staff'} by name or ID...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-100/50 border border-border rounded-xl py-2.5 pl-9 pr-3 text-xs text-text-primary outline-none focus:border-accent/40"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-border rounded-xl divide-y divide-border bg-slate-50/50">
                      {filteredPeople.map(p => {
                        const isSelected = p.id === selectedPersonId;
                        const name = `${p.first_name} ${p.last_name}`;
                        const idCode = selectedType === 'student' ? p.admission_no : p.employee_id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPersonId(p.id)}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${isSelected ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-slate-100 text-text-secondary'}`}
                          >
                            <span className="text-[11px] truncate max-w-[70%]">{name}</span>
                            <span className="text-[9px] font-mono opacity-65">{idCode}</span>
                          </button>
                        );
                      })}
                      {filteredPeople.length === 0 && (
                        <p className="text-center py-4 text-[10px] text-text-secondary">No matching records found.</p>
                      )}
                    </div>
                  </>
                ) : (
                  // Bulk parameters
                  selectedType === 'student' ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Class Filter</span>
                        <select 
                          value={bulkClassId} 
                          onChange={(e) => setBulkClassId(e.target.value)}
                          className="w-full text-xs"
                        >
                          <option value="ALL">All Enrolled Classes (DPS/IIT/Stephens)</option>
                          {tenantClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Recipient Selection Checkbox List */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Select Recipients</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedBulkIds.length === allBulkRecords.length) {
                                setSelectedBulkIds([]);
                              } else {
                                setSelectedBulkIds(allBulkRecords.map(r => r.id));
                              }
                            }}
                            className="text-[9px] font-bold text-accent hover:underline uppercase bg-transparent p-0 cursor-pointer"
                          >
                            {selectedBulkIds.length === allBulkRecords.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto custom-scrollbar border border-border rounded-xl divide-y divide-border bg-slate-50/50 p-1">
                          {allBulkRecords.map(r => {
                            const isChecked = selectedBulkIds.includes(r.id);
                            const name = `${r.first_name} ${r.last_name}`;
                            return (
                              <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs font-semibold text-text-secondary hover:text-text-primary">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedBulkIds(selectedBulkIds.filter(id => id !== r.id));
                                    } else {
                                      setSelectedBulkIds([...selectedBulkIds, r.id]);
                                    }
                                  }}
                                  className="rounded text-accent focus:ring-accent"
                                />
                                <span className="truncate flex-1">{name}</span>
                                <span className="text-[9px] font-mono opacity-50">{r.admission_no}</span>
                              </label>
                            );
                          })}
                          {allBulkRecords.length === 0 && (
                            <p className="text-center py-4 text-[10px] text-text-secondary">No records found.</p>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] text-text-secondary font-semibold mt-1 block">
                        ⚙️ This batch will generate {bulkRecords.length} student ID cards.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Recipient Selection Checkbox List */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Select Recipients</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedBulkIds.length === allBulkRecords.length) {
                                setSelectedBulkIds([]);
                              } else {
                                setSelectedBulkIds(allBulkRecords.map(r => r.id));
                              }
                            }}
                            className="text-[9px] font-bold text-accent hover:underline uppercase bg-transparent p-0 cursor-pointer"
                          >
                            {selectedBulkIds.length === allBulkRecords.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto custom-scrollbar border border-border rounded-xl divide-y divide-border bg-slate-50/50 p-1">
                          {allBulkRecords.map(r => {
                            const isChecked = selectedBulkIds.includes(r.id);
                            const name = `${r.first_name} ${r.last_name}`;
                            return (
                              <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs font-semibold text-text-secondary hover:text-text-primary">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedBulkIds(selectedBulkIds.filter(id => id !== r.id));
                                    } else {
                                      setSelectedBulkIds([...selectedBulkIds, r.id]);
                                    }
                                  }}
                                  className="rounded text-accent focus:ring-accent"
                                />
                                <span className="truncate flex-1">{name}</span>
                                <span className="text-[9px] font-mono opacity-50">{r.employee_id}</span>
                              </label>
                            );
                          })}
                          {allBulkRecords.length === 0 && (
                            <p className="text-center py-4 text-[10px] text-text-secondary">No records found.</p>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-100/50 border border-border rounded-xl text-[11px] text-text-secondary">
                        ⚙️ This batch will generate ID cards for {bulkRecords.length} campus faculty/staff members.
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              // Student/Parent Lock View
              <div className="p-4 bg-slate-100/60 border border-border rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">Security Context Locked</span>
                  <span className="text-xs font-bold text-text-primary">Viewing: {activeRecord ? `${activeRecord.first_name} ${activeRecord.last_name}` : activeUser.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Layout & Orientation */}
          <div className="p-6 bg-bg-sidebar/55 border border-border rounded-3xl space-y-4">
            <h3 className="text-xs font-black uppercase text-accent tracking-widest font-outfit">Layout & Theme</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Orientation</span>
                <select 
                  value={orientation} 
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="vertical">Vertical Badge</option>
                  <option value="horizontal">Horizontal Card</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Theme Palette</span>
                <select 
                  value={theme} 
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full text-xs font-bold"
                >
                  <option value="royal">Classic Royal Blue</option>
                  <option value="emerald">Modern Emerald Green</option>
                  <option value="dark">Sleek Dark Mode</option>
                </select>
              </div>
            </div>
          </div>

          {/* Field Toggles */}
          <div className="p-6 bg-bg-sidebar/55 border border-border rounded-3xl space-y-3.5">
            <h3 className="text-xs font-black uppercase text-accent tracking-widest font-outfit">Toggle Card Fields</h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs font-medium text-text-secondary">
              <label className="flex items-center gap-2 cursor-pointer hover:text-text-primary transition-all">
                <input type="checkbox" checked={showLogo} onChange={() => setShowLogo(!showLogo)} className="rounded" />
                <span>School Logo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-text-primary transition-all">
                <input type="checkbox" checked={showBloodGroup} onChange={() => setShowBloodGroup(!showBloodGroup)} className="rounded" />
                <span>Blood Group</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-text-primary transition-all">
                <input type="checkbox" checked={showAadhaarPan} onChange={() => setShowAadhaarPan(!showAadhaarPan)} className="rounded" />
                <span>{selectedType === 'student' ? 'Aadhaar' : 'PAN Code'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-text-primary transition-all">
                <input type="checkbox" checked={showEmergencyPhone} onChange={() => setShowEmergencyPhone(!showEmergencyPhone)} className="rounded" />
                <span>Emergency Contact</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-text-primary transition-all">
                <input type="checkbox" checked={showBarcode} onChange={() => setShowBarcode(!showBarcode)} className="rounded" />
                <span>Barcode / QR</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-text-primary transition-all">
                <input type="checkbox" checked={showSignature} onChange={() => setShowSignature(!showSignature)} className="rounded" />
                <span>Principal Sign</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Panel: Live Badge Preview Canvas */}
        <div className="lg:col-span-7 flex justify-center items-center py-6 px-4 bg-slate-100/40 dark:bg-slate-900/10 border border-border rounded-[2.5rem] relative overflow-hidden min-h-[450px]">
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          
          {!isBulkMode ? (
            activeRecord ? (
              <div className="relative scale-95 sm:scale-100 transition-all duration-300" id="printable-idcard-grid">
                {renderCard(activeRecord)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
                <CreditCard size={32} className="text-text-secondary" />
                <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">No recipient record loaded.</p>
              </div>
            )
          ) : (
            bulkRecords.length > 0 ? (
              <div className="w-full space-y-4">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block text-center no-print">
                  Batch Print Preview ({bulkRecords.length} Cards)
                </span>
                <div 
                  id="printable-idcard-grid" 
                  className={`grid gap-6 justify-items-center w-full ${orientation === 'vertical' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}
                >
                  {bulkRecords.map(r => (
                    <div key={r.id} className="scale-90 origin-top">
                      {renderCard(r)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
                <Users size={32} className="text-text-secondary" />
                <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">No records in selected class batch.</p>
              </div>
            )
          )}
        </div>

      </div>

      {/* CSS injection for print view sizing of CR80 Card */}
      <style jsx global>{`
        @media print {
          /* Hide EVERYTHING except our badge wrapper grid */
          body * {
            visibility: hidden;
            box-shadow: none !important;
          }
          
          #printable-idcard-grid, #printable-idcard-grid * {
            visibility: visible;
          }
          
          #printable-idcard-grid {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 24px !important;
            padding: 10px !important;
            margin: 0 !important;
          }

          .card-print-block {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
