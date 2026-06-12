'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Award, Search, Check, X, ShieldAlert, Sparkles, 
  UserCheck, ClipboardList, BookOpen, Loader2, Plus, UserPlus, Bus, Home as HomeIcon, Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { uploadFileToBucket } from '@/lib/storage';

// Helper to suggest alphabetical roll number sequentially per class
const suggestRollNumber = (firstName, classId, existingStudents, tenantId) => {
  if (!firstName || !classId) return '';
  const initial = firstName.trim().charAt(0).toUpperCase();
  if (!/^[A-Z]$/.test(initial)) return '';
  const classStudents = existingStudents.filter(s => s.class_id === classId && (s.tenant_id || 'demo-tenant-1') === tenantId);
  
  const matchRegex = new RegExp(`^${initial}-(\\d+)$`);
  let maxSeq = 0;
  classStudents.forEach(s => {
    if (s.roll_no) {
      const match = s.roll_no.match(matchRegex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  });
  
  const nextSeqStr = String(maxSeq + 1).padStart(2, '0');
  return `${initial}-${nextSeqStr}`;
};

export default function AdmissionsPage() {
  const router = useRouter();
  const {
    supabase,
    activeTenant, 
    sharedAdmissions, 
    setSharedAdmissions, 
    addStudentAndParent,
    sharedClasses,
    sharedStudents,
    sharedTransportRoutes,
    sharedHostelBlocks,
    activeRole
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'merit'
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New application form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    classId: '',
    boardScore: '',
    category: 'GENERAL',
    aadhaarNo: ''
  });

  // Admit student form state (pre-populated on approval)
  const [approveFormData, setApproveFormData] = useState({
    firstName: '',
    lastName: '',
    admissionNo: '',
    rollNo: '',
    dateOfBirth: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    address: 'Saket, New Delhi',
    aadhaarNo: '',
    category: 'GENERAL',
    classId: '',
    
    enableTransport: false,
    transportRouteId: '',
    customTransportFee: '',
    enableHostel: false,
    hostelBlockId: '',
    customHostelFee: '',
    
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
    parentOccupation: 'Government Employee',
    totalFee: 0,
    paidFee: 0,
    discount: '',
    initialAttendance: '90.0%',
    avatar: '',
    avatarFile: null
  });

  // Multi-tenant applications
  const tenantApplications = sharedAdmissions.filter(a => a.tenant_id === activeTenant.id);

  const getClassName = (classId) => {
    const cls = sharedClasses.find(c => c.id === classId);
    return cls ? cls.name : 'Class XI';
  };

  // Calculate totalFee dynamically for approval form
  React.useEffect(() => {
    if (!showApproveModal) return;
    let calculatedClassFee = 0;
    if (approveFormData.classId) {
      const cls = sharedClasses.find(c => c.id === approveFormData.classId);
      if (cls) calculatedClassFee = cls.base_fee;
    }

    let calculatedTransportFee = 0;
    if (approveFormData.enableTransport) {
      if (approveFormData.customTransportFee) {
        calculatedTransportFee = Number(approveFormData.customTransportFee) || 0;
      } else if (approveFormData.transportRouteId) {
        const route = sharedTransportRoutes.find(r => r.id === approveFormData.transportRouteId);
        if (route) calculatedTransportFee = route.fee;
      }
    }

    let calculatedHostelFee = 0;
    if (approveFormData.enableHostel) {
      if (approveFormData.customHostelFee) {
        calculatedHostelFee = Number(approveFormData.customHostelFee) || 0;
      } else if (approveFormData.hostelBlockId) {
        const block = sharedHostelBlocks.find(b => b.id === approveFormData.hostelBlockId);
        if (block) calculatedHostelFee = block.fee;
      }
    }

    const total = calculatedClassFee + calculatedTransportFee + calculatedHostelFee;
    setApproveFormData(prev => ({
      ...prev,
      totalFee: total
    }));
  }, [
    approveFormData.classId,
    approveFormData.enableTransport,
    approveFormData.transportRouteId,
    approveFormData.customTransportFee,
    approveFormData.enableHostel,
    approveFormData.hostelBlockId,
    approveFormData.customHostelFee,
    sharedClasses,
    sharedTransportRoutes,
    sharedHostelBlocks,
    showApproveModal
  ]);

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Online Admissions" />;
  }

  const handleApproveClick = (app) => {
    setSelectedCandidate(app);
    
    const baseClassFee = sharedClasses.find(c => c.id === app.class_id)?.base_fee || 0;
    const suggestedRoll = suggestRollNumber(app.first_name, app.class_id, sharedStudents, activeTenant.id);
    
    // Compute next sequential admission number
    const year = new Date().getFullYear();
    let maxNum = 0;
    sharedStudents.forEach(s => {
      if (s.admission_no && s.admission_no.includes('/')) {
        const parts = s.admission_no.split('/');
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNumStr = String(maxNum + 1).padStart(3, '0');
    const admNo = `ADM${year}/${nextNumStr}`;

    setApproveFormData({
      firstName: app.first_name || '',
      lastName: app.last_name || '',
      admissionNo: admNo,
      rollNo: suggestedRoll,
      dateOfBirth: '2010-06-15',
      gender: 'MALE',
      bloodGroup: 'O+',
      address: 'Saket, New Delhi',
      aadhaarNo: app.aadhaar_no || '',
      category: app.category || 'GENERAL',
      classId: app.class_id || '',
      
      enableTransport: false,
      transportRouteId: sharedTransportRoutes?.[0]?.id || '',
      customTransportFee: '',
      enableHostel: false,
      hostelBlockId: sharedHostelBlocks?.[0]?.id || '',
      customHostelFee: '',
      
      parentFirstName: `Guardian of ${app.first_name}`,
      parentLastName: app.last_name || '',
      parentEmail: app.email || '',
      parentPhone: app.phone || '',
      parentOccupation: 'Government Employee',
      totalFee: baseClassFee,
      paidFee: 0,
      discount: '',
      initialAttendance: '90.0%',
      avatar: '',
      avatarFile: null
    });
    
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!approveFormData.firstName || !approveFormData.lastName || !approveFormData.admissionNo || !approveFormData.classId) {
      toast.error('First Name, Last Name, Class, and Admission Number are required.');
      return;
    }
    if (!approveFormData.parentFirstName || !approveFormData.parentLastName || !approveFormData.parentEmail) {
      toast.error('Parent Name and Contact Email are required to link parent account.');
      return;
    }

    // Basic Aadhaar validation (12 digits)
    const rawAadhaar = approveFormData.aadhaarNo.replace(/\s+/g, '');
    if (rawAadhaar && rawAadhaar.length !== 12) {
      toast.error('Valid 12-digit Aadhaar Card number is required.');
      return;
    }

    try {
      setLoading(true);
      const parentId = `parent-${Math.random().toString(36).substring(7)}`;
      const studentId = `stud-${Math.random().toString(36).substring(7)}`;

      // Upload profile picture if selected
      let profilePicUrl = approveFormData.avatar || '';
      if (approveFormData.avatarFile) {
        const fileExt = approveFormData.avatarFile.name.split('.').pop();
        const fileName = `${studentId}-${Date.now()}.${fileExt}`;
        const filePath = `${activeTenant.id}/avatars/${fileName}`;
        const uploadedUrl = await uploadFileToBucket(supabase, activeTenant.bucket_name, filePath, approveFormData.avatarFile);
        if (uploadedUrl) {
          profilePicUrl = uploadedUrl;
        }
      }

      const formattedAadhaar = rawAadhaar ? rawAadhaar.match(/.{1,4}/g).join(' ') : '';

      // Calculate transport and hostel fees
      let transportFeeValue = 0;
      if (approveFormData.enableTransport) {
        if (approveFormData.customTransportFee) {
          transportFeeValue = Number(approveFormData.customTransportFee) || 0;
        } else if (approveFormData.transportRouteId) {
          const route = sharedTransportRoutes.find(r => r.id === approveFormData.transportRouteId);
          if (route) transportFeeValue = route.fee;
        }
      }
      let hostelFeeValue = 0;
      if (approveFormData.enableHostel) {
        if (approveFormData.customHostelFee) {
          hostelFeeValue = Number(approveFormData.customHostelFee) || 0;
        } else if (approveFormData.hostelBlockId) {
          const block = sharedHostelBlocks.find(b => b.id === approveFormData.hostelBlockId);
          if (block) hostelFeeValue = block.fee;
        }
      }

      const student = {
        id: studentId,
        first_name: approveFormData.firstName,
        last_name: approveFormData.lastName,
        admission_no: approveFormData.admissionNo,
        roll_no: approveFormData.rollNo,
        date_of_birth: approveFormData.dateOfBirth || new Date().toISOString().split('T')[0],
        gender: approveFormData.gender,
        category: approveFormData.category,
        aadhaar_no: formattedAadhaar,
        address: approveFormData.address,
        totalFee: Number(approveFormData.totalFee),
        paidFee: Number(approveFormData.paidFee),
        discount: Number(approveFormData.discount || 0),
        initialAttendance: approveFormData.initialAttendance,
        class_id: approveFormData.classId,
        tenant_id: activeTenant.id,
        enableTransport: approveFormData.enableTransport,
        transportRouteId: approveFormData.transportRouteId,
        transportFee: transportFeeValue,
        enableHostel: approveFormData.enableHostel,
        hostelBlockId: approveFormData.hostelBlockId,
        hostelFee: hostelFeeValue,
        profile_picture_url: profilePicUrl
      };

      const parent = {
        id: parentId,
        first_name: approveFormData.parentFirstName,
        last_name: approveFormData.parentLastName,
        email: approveFormData.parentEmail,
        phone: approveFormData.parentPhone || '+91 99999 88888',
        occupation: approveFormData.parentOccupation
      };

      // Enroll student in directory
      addStudentAndParent(student, parent);

      // Mark the admissions application as APPROVED
      const appIndex = sharedAdmissions.findIndex(a => a.id === selectedCandidate.id);
      if (appIndex !== -1) {
        const updatedApps = [...sharedAdmissions];
        updatedApps[appIndex] = { ...selectedCandidate, status: 'APPROVED' };
        setSharedAdmissions(updatedApps);
      }

      const cleanInitial = approveFormData.firstName.trim().toLowerCase().replace(/\s+/g, '');
      const cleanLast = approveFormData.lastName.trim().toLowerCase().replace(/\s+/g, '');
      const stdEmail = cleanLast ? `${cleanInitial}.${cleanLast}@${activeTenant.subdomain}.edu.in` : `${cleanInitial}@${activeTenant.subdomain}.edu.in`;

      toast.success(
        <div className="space-y-1.5 p-1">
          <p className="font-black text-xs text-emerald-600 uppercase tracking-wider">🎉 Candidate Approved & Enrolled!</p>
          <div className="text-[10px] text-text-secondary space-y-1">
            <div>
              <span className="font-bold text-text-primary block">Student Credentials:</span>
              Login ID: <span className="font-mono text-accent font-bold select-all">{stdEmail}</span><br />
              Password (Aadhaar): <span className="font-mono text-accent font-bold select-all">{rawAadhaar || 'N/A'}</span>
            </div>
            <div className="h-px bg-slate-200/60 my-1" />
            <div>
              <span className="font-bold text-text-primary block">Parent Credentials:</span>
              Login ID: <span className="font-mono text-accent font-bold select-all">{parent.email}</span><br />
              Password (Phone): <span className="font-mono text-accent font-bold select-all">{parent.phone}</span>
            </div>
          </div>
        </div>,
        { duration: 15000 }
      );
      setShowApproveModal(false);
      setLoading(false);

      // Redirect to Student Registry
      setTimeout(() => {
        router.push('/dashboard/students');
      }, 800);

    } catch (err) {
      setLoading(false);
      toast.error('Failed to submit student record.');
    }
  };

  const handleReject = (appId) => {
    const updatedApps = sharedAdmissions.map(a => 
      a.id === appId ? { ...a, status: 'REJECTED' } : a
    );
    setSharedAdmissions(updatedApps);
    toast.error('Admission application rejected.');
  };

  const handleNewApplication = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.classId || !formData.boardScore) {
      toast.error('First/Last Name, Class Preference, Board Score and Contact Email are required.');
      return;
    }

    // Aadhaar check
    const rawAadhaar = formData.aadhaarNo.replace(/\s+/g, '');
    if (rawAadhaar && rawAadhaar.length !== 12) {
      toast.error('Valid 12-digit Aadhaar Card number is required.');
      return;
    }

    const newApp = {
      id: `adm-app-${Date.now()}`,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone || '+91 99999 88888',
      class_id: formData.classId,
      board_score: Number(formData.boardScore),
      category: formData.category,
      status: 'PENDING',
      aadhaar_no: rawAadhaar,
      date: new Date().toISOString().split('T')[0],
      tenant_id: activeTenant.id
    };

    setSharedAdmissions([...sharedAdmissions, newApp]);
    toast.success(`New application for candidate "${formData.firstName} ${formData.lastName}" registered successfully!`);
    
    // Clear form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      classId: '',
      boardScore: '',
      category: 'GENERAL',
      aadhaarNo: ''
    });
    
    setShowNewAppModal(false);
  };

  // Filter lists based on tab
  const pendingApps = tenantApplications.filter(a => a.status === 'PENDING' && 
    `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const approvedApps = tenantApplications.filter(a => a.status === 'APPROVED' && 
    `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Merit List ranks candidates by board score percentage
  const meritList = [...tenantApplications].sort((a, b) => b.board_score - a.board_score);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Admissions Portal</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Review online applications, verify board certificate marks, and filter category merit lists.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNewAppModal(true)}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={14} />
            <span>Submit Application</span>
          </button>

          <div className="flex items-center gap-2 text-[10px] font-black text-warning bg-warning/5 border border-warning/20 px-3.5 py-2 rounded-xl uppercase tracking-wider">
            <ShieldAlert size={14} />
            <span>Category Quota Engine Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit">
        {[
          { id: 'pending', label: 'Pending Reviews' },
          { id: 'approved', label: 'Approved Candidates' },
          { id: 'merit', label: 'Merit List Board' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchQuery('');
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Renders search */}
      {activeTab !== 'merit' && (
        <div className="max-w-md relative group/search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search applicants by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
          />
        </div>
      )}

      {/* Contents based on tab */}
      {activeTab === 'pending' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Pending Admission Desk</h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Candidate</th>
                  <th className="pb-3">Class Preference</th>
                  <th className="pb-3 font-mono">Score %</th>
                  <th className="pb-3">Caste Category</th>
                  <th className="pb-3">Aadhaar Card</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingApps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black">
                        {app.first_name[0]}{app.last_name[0]}
                      </div>
                      <div>
                        <p>{app.first_name} {app.last_name}</p>
                        <span className="text-[9px] text-text-secondary block font-mono">{app.phone} • {app.email}</span>
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-slate-700">{getClassName(app.class_id)}</td>
                    <td className="py-4 font-mono font-bold text-text-primary text-\[13px]">{app.board_score}%</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-accent/15 border border-accent/35 text-accent">
                        {app.category}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-text-secondary">{app.aadhaar_no ? app.aadhaar_no.match(/.{1,4}/g).join(' ') : 'N/A'}</td>
                    <td className="py-4 text-right pr-2">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleApproveClick(app)}
                          className="p-1.5 bg-success/15 border border-success/35 text-success hover:bg-success hover:text-white rounded-lg transition-all"
                          title="Approve & Admit to Student Registry"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="p-1.5 bg-danger/15 border border-danger/35 text-danger hover:bg-danger hover:text-white rounded-lg transition-all"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pendingApps.length === 0 && (
            <p className="text-center py-6 text-xs text-text-secondary">No pending admission reviews.</p>
          )}
        </div>
      )}

      {activeTab === 'approved' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <UserCheck size={16} className="text-success" />
            <span>Admitted Candidates</span>
          </h3>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Candidate</th>
                  <th className="pb-3">Class</th>
                  <th className="pb-3 font-mono">Score %</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right pr-2">Enrollment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {approvedApps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center text-success text-[11px] font-black">
                        {app.first_name[0]}{app.last_name[0]}
                      </div>
                      {app.first_name} {app.last_name}
                    </td>
                    <td className="py-4 font-semibold text-slate-700">{getClassName(app.class_id)}</td>
                    <td className="py-4 font-mono text-text-secondary">{app.board_score}%</td>
                    <td className="py-4 text-text-secondary">{app.category}</td>
                    <td className="py-4 text-right pr-2">
                      <span className="px-2.5 py-1 bg-success/15 border border-success/35 text-success text-[9px] font-black uppercase rounded">Enrolled</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {approvedApps.length === 0 && (
            <p className="text-center py-6 text-xs text-text-secondary">No candidates admitted yet.</p>
          )}
        </div>
      )}

      {activeTab === 'merit' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <ClipboardList size={16} className="text-accent" />
            <span>Dynamic Academic Merit Rankings</span>
          </h3>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Candidate</th>
                  <th className="pb-3">Target Class</th>
                  <th className="pb-3 font-mono">Score %</th>
                  <th className="pb-3">Caste Category</th>
                  <th className="pb-3 text-right pr-2">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {meritList.map((app, index) => (
                  <tr key={app.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-2 font-mono font-bold text-accent text-sm">#{index + 1}</td>
                    <td className="py-4 font-bold text-text-primary">{app.first_name} {app.last_name}</td>
                    <td className="py-4 font-semibold text-slate-700">{getClassName(app.class_id)}</td>
                    <td className="py-4 font-mono text-text-primary text-\[13px] font-black">{app.board_score}%</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-accent/15 border border-accent/35 text-accent">
                        {app.category}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-2">
                      {app.status === 'APPROVED' ? (
                        <span className="px-2 py-0.5 bg-success/15 border border-success/35 text-success text-[9px] font-black rounded uppercase">Approved</span>
                      ) : app.status === 'REJECTED' ? (
                        <span className="px-2 py-0.5 bg-danger/15 border border-danger/35 text-danger text-[9px] font-black rounded uppercase">Rejected</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-warning/15 border border-warning/35 text-warning text-[9px] font-black rounded uppercase">Pending Review</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Candidate Admission Application Modal */}
      <Modal
        open={showNewAppModal}
        onClose={() => setShowNewAppModal(false)}
        title="Submit Candidate Admission Application"
        icon={<UserPlus size={18} />}
        size="lg"
      >
        <form onSubmit={handleNewApplication} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Candidate First Name *</label>
              <input 
                type="text" 
                placeholder="Priya"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Candidate Last Name *</label>
              <input 
                type="text" 
                placeholder="Sen"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Contact Email *</label>
              <input 
                type="email" 
                placeholder="priya.sen@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Contact Phone</label>
              <input 
                type="text" 
                placeholder="+91 91234 56789"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Class Preference *</label>
              <select 
                value={formData.classId}
                onChange={(e) => setFormData({...formData, classId: e.target.value})}
                className="w-full text-xs bg-bg-sidebar text-text-primary"
                required
              >
                <option value="">Choose class...</option>
                {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Board Certificate Score (%) *</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="e.g. 94.20"
                value={formData.boardScore}
                onChange={(e) => setFormData({...formData, boardScore: e.target.value})}
                className="w-full text-xs font-mono"
                max={100}
                min={0}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Caste Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full text-xs bg-bg-sidebar text-text-primary"
              >
                <option value="GENERAL">General</option>
                <option value="OBC">OBC (Other Backward Classes)</option>
                <option value="SC">Scheduled Caste (SC)</option>
                <option value="ST">Scheduled Tribe (ST)</option>
                <option value="EWS">Economically Weaker Section (EWS)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Aadhaar Card No (12 digits) *</label>
              <input 
                type="text" 
                placeholder="e.g. 883912039284"
                value={formData.aadhaarNo}
                onChange={(e) => setFormData({...formData, aadhaarNo: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>

            <button 
              type="submit" 
              className="md:col-span-2 py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all mt-4 flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus size={16} />
              <span>Submit Admission Application</span>
            </button>
          </form>
        </Modal>

      {/* Pre-filled Admit Student Modal (triggered on approval) */}
      <Modal
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Candidate & Link Registry Profile"
        icon={<UserPlus size={18} />}
        size="lg"
      >
        <form onSubmit={handleApproveSubmit} className="space-y-6">
            
            {/* Profile Picture Upload Section (FIRST PLACE) */}
            <div className="p-5 bg-slate-100/50 border border-border rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Student Profile Picture</h4>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar Preview */}
                <div className="relative group">
                  {approveFormData.avatar ? (
                    <img 
                      src={approveFormData.avatar} 
                      alt="Student Avatar Preview" 
                      className="w-24 h-24 rounded-2xl object-cover border border-border" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-3xl font-black font-outfit">
                      {approveFormData.firstName ? approveFormData.firstName[0] : 'S'}
                    </div>
                  )}
                  {approveFormData.avatar && (
                    <button
                      type="button"
                      onClick={() => setApproveFormData({ ...approveFormData, avatar: '', avatarFile: null })}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-danger text-white rounded-lg hover:bg-danger-hover transition-all"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Upload Action / Preset Selector */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/60 border border-border rounded-xl text-[11px] font-bold text-text-primary cursor-pointer transition-all flex items-center gap-1.5 active:scale-95">
                      <UserPlus size={12} className="text-accent" />
                      <span>Upload Photo</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const fileSizeMB = file.size / (1024 * 1024);
                            if (fileSizeMB > 1) {
                              toast.error(`Image size (${fileSizeMB.toFixed(2)} MB) exceeds 1MB limit. Please upload a smaller image.`);
                              return;
                            }
                            toast.success(`Image selected: ${file.name} (${fileSizeMB.toFixed(2)} MB / 1MB limit)`);
                            const reader = new FileReader();
                            reader.onload = () => {
                              setApproveFormData(prev => ({
                                ...prev,
                                avatar: reader.result,
                                avatarFile: file
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                    <span className="text-[10px] text-text-secondary">PNG, JPG up to 1MB</span>
                  </div>

                  {/* Preset Avatars Grid */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Or Choose Template Avatar</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Aarav',
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Diya',
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Kabir',
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Priya',
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Siddharth'
                      ].map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setApproveFormData(prev => ({ ...prev, avatar: presetUrl, avatarFile: null }))}
                          className={`w-9 h-9 rounded-xl border p-1 bg-slate-100 transition-all overflow-hidden flex items-center justify-center ${
                            approveFormData.avatar === presetUrl ? 'border-accent ring-2 ring-accent/20 scale-105' : 'border-border hover:border-border'
                          }`}
                        >
                          <img src={presetUrl} alt="preset" className="w-7 h-7 object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Part 1: Student Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider font-outfit">1. Academic & Student Dossier</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">First Name *</label>
                  <input 
                    type="text" 
                    placeholder="Aarav"
                    value={approveFormData.firstName}
                    onChange={(e) => setApproveFormData({...approveFormData, firstName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Last Name *</label>
                  <input 
                    type="text" 
                    placeholder="Patel"
                    value={approveFormData.lastName}
                    onChange={(e) => setApproveFormData({...approveFormData, lastName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Class * (Auto-assigns base tuition fees)</label>
                  <select 
                    value={approveFormData.classId}
                    onChange={(e) => setApproveFormData({...approveFormData, classId: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                    required
                  >
                    <option value="">Select Academic Class...</option>
                    {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Base Fee: ₹{c.base_fee.toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Admission Number *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ADM2026/049"
                    value={approveFormData.admissionNo}
                    onChange={(e) => setApproveFormData({...approveFormData, admissionNo: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Roll Number</label>
                    <span className="text-[8px] text-accent font-black uppercase tracking-wider bg-accent/5 px-2 py-0.5 rounded border border-accent/10">Auto-suggested</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="e.g. A-01"
                    value={approveFormData.rollNo}
                    onChange={(e) => setApproveFormData({...approveFormData, rollNo: e.target.value})}
                    className="w-full text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Aadhaar Card Number (12 digits) *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 483928409283"
                    value={approveFormData.aadhaarNo}
                    onChange={(e) => setApproveFormData({...approveFormData, aadhaarNo: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                  <p className="text-[10px] text-text-secondary mt-1 font-semibold">
                    💡 Onboarding Notice: Student's default login password is set to their 12-digit Aadhaar Number.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Reservation Category</label>
                  <select 
                    value={approveFormData.category}
                    onChange={(e) => setApproveFormData({...approveFormData, category: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                  >
                    <option value="GENERAL">General</option>
                    <option value="OBC">OBC (Other Backward Classes)</option>
                    <option value="SC">Scheduled Caste (SC)</option>
                    <option value="ST">Scheduled Tribe (ST)</option>
                    <option value="EWS">Economically Weaker Section (EWS)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Date of Birth</label>
                  <input 
                    type="date" 
                    value={approveFormData.dateOfBirth}
                    onChange={(e) => setApproveFormData({...approveFormData, dateOfBirth: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Gender</label>
                  <select 
                    value={approveFormData.gender}
                    onChange={(e) => setApproveFormData({...approveFormData, gender: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Residential Address</label>
                  <input 
                    type="text" 
                    placeholder="House No, Road, City, State, PIN"
                    value={approveFormData.address}
                    onChange={(e) => setApproveFormData({...approveFormData, address: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Optional Commute & Residence Options */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider font-outfit">Optional Commute & Boarding Facilities</h4>
              
              {/* Transport Option */}
              <div className="space-y-3 p-4 bg-slate-100/50 border border-border rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-text-primary uppercase tracking-wider block flex items-center gap-1.5 font-outfit">
                      <Bus size={12} className="text-accent" />
                      <span>Enable Transport Facility</span>
                    </span>
                    <p className="text-[9px] text-text-secondary">Assigned school bus corridors</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={approveFormData.enableTransport}
                    onChange={(e) => setApproveFormData({
                      ...approveFormData, 
                      enableTransport: e.target.checked, 
                      transportRouteId: e.target.checked ? (sharedTransportRoutes?.[0]?.id || '') : '', 
                      customTransportFee: ''
                    })}
                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent bg-bg-main"
                  />
                </div>
                {approveFormData.enableTransport && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Assigned Route</label>
                      <select 
                        value={approveFormData.transportRouteId}
                        onChange={(e) => setApproveFormData({...approveFormData, transportRouteId: e.target.value, customTransportFee: ''})}
                        className="w-full text-[11px] bg-bg-main text-text-primary py-2 px-2.5 rounded-xl border border-border"
                      >
                        {sharedTransportRoutes?.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (₹{r.fee.toLocaleString('en-IN')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Custom Transport Fee (Optional Overrider)</label>
                      <input 
                        type="number" 
                        placeholder="Override route fee (₹)"
                        value={approveFormData.customTransportFee}
                        onChange={(e) => setApproveFormData({...approveFormData, customTransportFee: e.target.value})}
                        className="w-full text-[11px] py-2 px-2.5"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hostel Option */}
              <div className="space-y-3 p-4 bg-slate-100/50 border border-border rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-text-primary uppercase tracking-wider block flex items-center gap-1.5 font-outfit">
                      <HomeIcon size={12} className="text-accent" />
                      <span>Enable Hostel Accommodation</span>
                    </span>
                    <p className="text-[9px] text-text-secondary">Assigned housing blocks & dining mess</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={approveFormData.enableHostel}
                    onChange={(e) => setApproveFormData({
                      ...approveFormData, 
                      enableHostel: e.target.checked, 
                      hostelBlockId: e.target.checked ? (sharedHostelBlocks?.[0]?.id || '') : '', 
                      customHostelFee: ''
                    })}
                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent bg-bg-main"
                  />
                </div>
                {approveFormData.enableHostel && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Assigned Hostel Block</label>
                      <select 
                        value={approveFormData.hostelBlockId}
                        onChange={(e) => setApproveFormData({...approveFormData, hostelBlockId: e.target.value, customHostelFee: ''})}
                        className="w-full text-[11px] bg-bg-main text-text-primary py-2 px-2.5 rounded-xl border border-border"
                      >
                        {sharedHostelBlocks?.map(b => (
                          <option key={b.id} value={b.id}>{b.name} (₹{b.fee.toLocaleString('en-IN')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Custom Hostel Fee (Optional Overrider)</label>
                      <input 
                        type="number" 
                        placeholder="Override block fee (₹)"
                        value={approveFormData.customHostelFee}
                        onChange={(e) => setApproveFormData({...approveFormData, customHostelFee: e.target.value})}
                        className="w-full text-[11px] py-2 px-2.5"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Part 2: Parent Information */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5 font-outfit">
                <LinkIcon size={12} />
                <span>2. Parent / Guardian Credentials (Linking details)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Parent First Name *</label>
                  <input 
                    type="text" 
                    placeholder="Vikram"
                    value={approveFormData.parentFirstName}
                    onChange={(e) => setApproveFormData({...approveFormData, parentFirstName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Parent Last Name *</label>
                  <input 
                    type="text" 
                    placeholder="Patel"
                    value={approveFormData.parentLastName}
                    onChange={(e) => setApproveFormData({...approveFormData, parentLastName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Parent Contact Email *</label>
                  <input 
                    type="email" 
                    placeholder="vikram.patel@gmail.com"
                    value={approveFormData.parentEmail}
                    onChange={(e) => setApproveFormData({...approveFormData, parentEmail: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Parent Contact Phone</label>
                  <input 
                    type="text" 
                    placeholder="+91 98765 43210"
                    value={approveFormData.parentPhone}
                    onChange={(e) => setApproveFormData({...approveFormData, parentPhone: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Occupation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Software Engineer, Business Owner"
                    value={approveFormData.parentOccupation}
                    onChange={(e) => setApproveFormData({...approveFormData, parentOccupation: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Part 3: Metrics Initialization */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider font-outfit">3. Fee Ledger & Attendance Setup</h4>
              
              {/* Summary Breakdown Card */}
              <div className="p-4 bg-bg-main border border-border rounded-2xl space-y-2.5">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Fee Allocation Summary</span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Base Class Tuition:</span>
                    <span className="font-bold font-mono text-text-primary">
                      ₹{(approveFormData.classId ? (sharedClasses.find(c => c.id === approveFormData.classId)?.base_fee || 0) : 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {approveFormData.enableTransport && (
                    <div className="flex justify-between text-text-secondary">
                      <span>Transport Commute Option:</span>
                      <span className="font-bold font-mono text-success">
                        + ₹{(approveFormData.customTransportFee ? Number(approveFormData.customTransportFee) : (sharedTransportRoutes?.find(r => r.id === approveFormData.transportRouteId)?.fee || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {approveFormData.enableHostel && (
                    <div className="flex justify-between text-text-secondary">
                      <span>Hostel Housing & Lodging:</span>
                      <span className="font-bold font-mono text-success">
                        + ₹{(approveFormData.customHostelFee ? Number(approveFormData.customHostelFee) : (sharedHostelBlocks?.find(b => b.id === approveFormData.hostelBlockId)?.fee || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className="h-px bg-slate-100 my-1.5"></div>
                  <div className="flex justify-between text-sm font-black text-text-primary">
                    <span>Total Calculated Term Fee:</span>
                    <span className="font-mono text-accent">₹{(approveFormData.totalFee || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Fee Amount Paid (₹) *</label>
                  <input 
                    type="number" 
                    value={approveFormData.paidFee}
                    onChange={(e) => setApproveFormData({...approveFormData, paidFee: e.target.value})}
                    className="w-full text-xs font-mono"
                    max={approveFormData.totalFee}
                    min={0}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Fee Discount (Optional) (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 1500"
                    value={approveFormData.discount}
                    onChange={(e) => setApproveFormData({...approveFormData, discount: e.target.value})}
                    className="w-full text-xs font-mono text-amber-600 font-bold"
                    max={Math.max(0, (approveFormData.totalFee || 0) - Number(approveFormData.paidFee || 0))}
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Initial Attendance (%)</label>
                  <input 
                    type="text" 
                    value={approveFormData.initialAttendance}
                    onChange={(e) => setApproveFormData({...approveFormData, initialAttendance: e.target.value})}
                    className="w-full text-xs font-mono"
                  />
                </div>
              </div>

              {/* Real-time remaining calculation */}
              <div className="flex justify-between items-center text-xs p-3 bg-slate-50/50 rounded-xl border border-border">
                <span className="text-text-secondary">Outstanding Balance Due:</span>
                <span className="font-mono font-black text-warning">
                  ₹{((approveFormData.totalFee || 0) - (Number(approveFormData.paidFee) || 0) - (Number(approveFormData.discount) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all mt-4 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              <span>Verify & Complete Admission Approval</span>
            </button>
          </form>
      </Modal>
    </div>
  );
}
