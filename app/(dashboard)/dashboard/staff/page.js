'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState } from 'react';
import { 
  Users, UserPlus, Search, Shield, Sparkles, 
  Trash2, CreditCard, ArrowLeft, Loader2, FileBox, ShieldAlert, X, Plus, FileText
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { uploadFileToBucket } from '@/lib/storage';
import * as XLSX from 'xlsx';

export default function StaffRegistryPage() {
  const {
    supabase,
    activeTenant, 
    sharedStaff, 
    setSharedStaff,
    activeRole
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffForDossier, setSelectedStaffForDossier] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [parsedStaff, setParsedStaff] = useState([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    designation: 'Lecturer',
    department: 'Science',
    basic: 55000,
    allowances: 0,
    deductions: 0,
    panNo: '',
    phone: '',
    email: '',
    avatar: '',
    avatarFile: null
  });

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Staff Directory" />;
  }

  const handleUploadDocument = async (file, docType) => {
    if (!file || !selectedStaffForDossier) return;
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      toast.error(`Document size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller file.`);
      return;
    }
    toast.info(`Uploading document: ${file.name} (${fileSizeMB.toFixed(2)} MB / 10MB limit)`);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedStaffForDossier.id}-${docType.replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;
      const filePath = `${activeTenant.id}/documents/${fileName}`;
      
      toast.loading(`Uploading ${docType} to Supabase...`);
      const publicUrl = await uploadFileToBucket(supabase, 'documents', filePath, file);
      toast.dismiss();

      if (publicUrl) {
        const updatedStaff = sharedStaff.map(s => {
          if (s.id === selectedStaffForDossier.id) {
            const currentDocs = s.documents || [];
            return {
              ...s,
              documents: [...currentDocs, { name: docType, url: publicUrl, fileName: file.name, date: new Date().toLocaleDateString() }]
            };
          }
          return s;
        });
        setSharedStaff(updatedStaff);
        
        setSelectedStaffForDossier(prev => ({
          ...prev,
          documents: [...(prev.documents || []), { name: docType, url: publicUrl, fileName: file.name, date: new Date().toLocaleDateString() }]
        }));
        
        toast.success(`${docType} uploaded successfully!`);
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to upload document.');
    }
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.panNo || !formData.email) {
      toast.error('First Name, Last Name, Email, and PAN Card number are required.');
      return;
    }

    // PAN Validation: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const uppercasePan = formData.panNo.toUpperCase();
    if (!panPattern.test(uppercasePan)) {
      toast.error('Invalid PAN Card Format. Standard format: ABCDE1234F (5 letters, 4 digits, 1 letter).');
      return;
    }

    try {
      setLoading(true);
      const staffId = `staff-${Date.now()}`;
      
      // Upload profile picture if selected
      let profilePicUrl = formData.avatar || '';
      if (formData.avatarFile) {
        const fileExt = formData.avatarFile.name.split('.').pop();
        const fileName = `${staffId}-${Date.now()}.${fileExt}`;
        const filePath = `${activeTenant.id}/avatars/${fileName}`;
        const uploadedUrl = await uploadFileToBucket(supabase, 'avatars', filePath, formData.avatarFile);
        if (uploadedUrl) {
          profilePicUrl = uploadedUrl;
        }
      }

      const deptCodes = {
        Science: 'SCI',
        Humanities: 'HUM',
        Administration: 'ADM',
        Support: 'SUP'
      };
      const deptCode = deptCodes[formData.department] || 'GEN';
      const randomCode = Math.floor(100 + Math.random() * 900);
      const empId = `EMP-${deptCode}-${randomCode}`;

      const newStaff = {
        id: staffId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        employee_id: empId,
        designation: formData.designation,
        department: formData.department,
        basic: Number(formData.basic),
        allowances: Number(formData.allowances || 0),
        deductions: Number(formData.deductions || 0),
        pan_no: uppercasePan,
        phone: formData.phone || '+91 98765 43210',
        email: formData.email,
        tenant_id: activeTenant.id,
        profile_picture_url: profilePicUrl,
        documents: []
      };

      setSharedStaff([newStaff, ...sharedStaff]);
      toast.success(`Faculty member "${formData.firstName} ${formData.lastName}" onboarded successfully with ID: ${empId}!`);
      
      setFormData({
        firstName: '',
        lastName: '',
        designation: 'Lecturer',
        department: 'Science',
        basic: 55000,
        allowances: 0,
        deductions: 0,
        panNo: '',
        phone: '',
        email: '',
        avatar: '',
        avatarFile: null
      });
      setShowAddForm(false);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      toast.error('Failed to onboard staff member.');
    }
  };

  const loadPdfJS = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const parsePdfFile = async (file) => {
    const pdfjsLib = await loadPdfJS();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      const strings = text.items.map(item => item.str);
      textContent += strings.join(' ') + '\n';
    }
    return textContent;
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        let csvLines = [];
        data.forEach(row => {
          if (row.length > 0) {
            csvLines.push(row.join(','));
          }
        });
        setBulkText(csvLines.join('\n'));
        toast.success(`Excel file "${file.name}" parsed! Review and click Validate & Preview.`);
      } catch (err) {
        toast.error('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 2) {
      toast.error(`PDF size (${fileSizeMB.toFixed(2)} MB) exceeds 2MB limit. Please upload a smaller PDF.`);
      return;
    }
    toast.success(`PDF selected: ${file.name} (${fileSizeMB.toFixed(2)} MB / 2MB limit)`);

    toast.loading('Parsing PDF text elements...');
    try {
      const text = await parsePdfFile(file);
      toast.dismiss();
      
      const lines = text.split('\n');
      const csvLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.includes(',')) return trimmed;
        const cols = trimmed.split(/\s{2,}/);
        return cols.join(', ');
      }).filter(line => line.trim() !== '');

      setBulkText(csvLines.join('\n'));
      toast.success(`PDF file "${file.name}" parsed! Review and click Validate & Preview.`);
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to parse PDF file.');
    }
  };

  const handleValidateBulkStaff = () => {
    if (!bulkText.trim()) {
      toast.error('Please paste some CSV or Excel data first.');
      return;
    }

    const lines = bulkText.split('\n');
    const result = [];
    const deptCodes = {
      'Science': 'SCI',
      'Mathematics': 'MAT',
      'Humanities': 'HUM',
      'Commerce': 'COM',
      'Arts': 'ART',
      'Administration': 'ADM'
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const cols = trimmed.split(',').map(c => c.trim());
      if (cols.length < 2) return; 

      const [firstName, lastName, designation, department, basic, panNo, email, phone] = cols;

      if (!firstName) {
        toast.error(`Line ${idx + 1}: First Name is required.`);
        return;
      }

      const basicNum = Number(basic) || 45000;
      const panUpper = (panNo || '').toUpperCase();
      const validPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panUpper);

      const deptCode = deptCodes[department] || 'GEN';
      const randomCode = Math.floor(100 + Math.random() * 900);
      const empId = `EMP-${deptCode}-${randomCode}`;

      result.push({
        id: `staff-bulk-${idx}-${Date.now()}`,
        first_name: firstName,
        last_name: lastName || '',
        employee_id: empId,
        designation: designation || 'Lecturer',
        department: department || 'Science',
        basic: basicNum,
        pan_no: validPan ? panUpper : 'PANPENDING',
        phone: phone || '+91 98765 43210',
        email: email || `${firstName.toLowerCase()}@example.com`,
        tenant_id: activeTenant.id,
        profile_picture_url: '',
        documents: []
      });
    });

    setParsedStaff(result);
    toast.success(`Successfully parsed ${result.length} staff records!`);
  };

  const handleImportBulkStaff = () => {
    if (parsedStaff.length === 0) {
      toast.error('No parsed records to onboard.');
      return;
    }

    setSharedStaff([...parsedStaff, ...sharedStaff]);
    toast.success(`Successfully onboarded all ${parsedStaff.length} faculty/staff members in bulk!`);
    setBulkText('');
    setParsedStaff([]);
    setShowBulkModal(false);
  };

  // Manual Salary calculations (Strictly Basic + manual allowances - manual deductions)
  const calculateSalary = (basic, allowances = 0, deductions = 0) => {
    const gross = Number(basic) + Number(allowances);
    const net = gross - Number(deductions);
    return { hra: 0, da: 0, pf: 0, tds: 0, allowances: Number(allowances), deductions: Number(deductions), gross, net };
  };

  // Multi-tenant filter: Only show staff belonging to active school/campus
  const tenantStaff = sharedStaff.filter(s => s.tenant_id === activeTenant.id);

  const filteredStaff = tenantStaff.filter(s => {
    const term = searchQuery.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(term) ||
      s.last_name.toLowerCase().includes(term) ||
      s.employee_id.toLowerCase().includes(term) ||
      s.designation.toLowerCase().includes(term) ||
      (s.pan_no && s.pan_no.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Faculty & Staff Registry</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Manage instructors, administrative heads, and support staff for <span className="text-accent font-bold">{activeTenant.name}</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowBulkModal(true)}
            className="px-5 py-3 bg-bg-sidebar hover:bg-slate-50 border border-border text-text-primary text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} className="text-accent" />
            <span>Bulk Onboard</span>
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={14} />
            <span>Onboard Staff</span>
          </button>
        </div>
      </div>

      <Modal
        open={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setBulkText('');
          setParsedStaff([]);
        }}
        title="Bulk Staff Onboarding"
        icon={<Plus size={18} />}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Onboard multiple faculty and staff members at once. Copy & paste CSV rows or Excel columns, or upload a <strong>.csv / .xlsx / .pdf</strong> file:
            <br />
            <strong className="text-text-primary block mt-1 bg-slate-100/50 p-2 rounded-lg font-mono text-[10px]">
              First Name, Last Name, Designation, Department, Basic Salary, PAN Number, Email, Phone
            </strong>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            {/* File Upload Buttons */}
            <div className="flex gap-2">
              <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-[10px] font-bold rounded-xl cursor-pointer transition-all border border-border flex items-center gap-1.5">
                <FileText size={12} className="text-accent" />
                <span>Upload Excel / CSV</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>
              
              <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-[10px] font-bold rounded-xl cursor-pointer transition-all border border-border flex items-center gap-1.5">
                <FileText size={12} className="text-danger" />
                <span>Upload PDF</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBulkText(
                  "Sunita, Verma, Professor, Science, 75000, ABCDE1234F, sunita@example.com, +91 9123456789\n" +
                  "Vikram, Gupta, Accountant, Commerce, 45000, WXYZR9876Q, vikram@example.com, +91 9876501234"
                )}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-[10px] font-bold rounded-xl transition-all"
              >
                Load Example Template
              </button>
            </div>
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Paste your CSV content here..."
            className="w-full h-36 font-mono text-xs p-3 bg-bg-main border border-border rounded-xl outline-none focus:border-accent"
          />

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleValidateBulkStaff}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-text-primary text-xs font-bold rounded-xl transition-all"
            >
              Validate & Preview
            </button>
            <button
              type="button"
              disabled={parsedStaff.length === 0}
              onClick={handleImportBulkStaff}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              Onboard Batch ({parsedStaff.length} Staff)
            </button>
          </div>

          {parsedStaff.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar border border-border rounded-xl">
              <table className="w-full text-left border-collapse text-[11px] p-2">
                <thead>
                  <tr className="bg-slate-100 border-b border-border text-[9px] font-black uppercase text-text-secondary">
                    <th className="p-2">Name</th>
                    <th className="p-2">Employee ID</th>
                    <th className="p-2">Designation / Dept</th>
                    <th className="p-2">Basic Salary</th>
                    <th className="p-2">PAN Code</th>
                    <th className="p-2">Contact Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedStaff.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-text-primary">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="p-2 font-mono text-text-secondary">{s.employee_id}</td>
                      <td className="p-2 font-semibold">
                        {s.designation} ({s.department})
                      </td>
                      <td className="p-2 font-mono font-bold text-slate-700">₹{s.basic.toLocaleString('en-IN')}</td>
                      <td className="p-2 font-mono text-text-secondary">{s.pan_no}</td>
                      <td className="p-2 font-mono text-text-secondary text-[10px]">
                        {s.phone} | {s.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Staff Member Onboarding Dossier"
        icon={<UserPlus size={18} />}
        size="lg"
      >
        <form onSubmit={handleOnboard} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Profile Picture Upload Section (FIRST PLACE) */}
            <div className="md:col-span-2 p-5 bg-slate-100/50 border border-border rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Staff Profile Picture</h4>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar Preview */}
                <div className="relative group">
                  {formData.avatar ? (
                    <img 
                      src={formData.avatar} 
                      alt="Staff Avatar Preview" 
                      className="w-24 h-24 rounded-2xl object-cover border border-border" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-3xl font-black font-outfit">
                      {formData.firstName ? formData.firstName[0] : 'T'}
                    </div>
                  )}
                  {formData.avatar && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: '', avatarFile: null })}
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
                              setFormData(prev => ({
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
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh',
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=Pooja',
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit',
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=Neha',
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=Sanjay'
                      ].map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatar: presetUrl, avatarFile: null }))}
                          className={`w-9 h-9 rounded-xl border p-1 bg-slate-100 transition-all overflow-hidden flex items-center justify-center ${
                            formData.avatar === presetUrl ? 'border-accent ring-2 ring-accent/20 scale-105' : 'border-border hover:border-border'
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">First Name *</label>
              <input 
                type="text" 
                placeholder="Rajesh"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Last Name *</label>
              <input 
                type="text" 
                placeholder="Iyer"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Email Address *</label>
              <input 
                type="email" 
                placeholder="rajesh.iyer@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Phone Number</label>
              <input 
                type="text" 
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Designation Role</label>
              <input 
                type="text" 
                placeholder="e.g. HOD Physics, Principal Office, Librarian"
                value={formData.designation}
                onChange={(e) => setFormData({...formData, designation: e.target.value})}
                className="w-full text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Department Core</label>
              <select 
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full text-xs bg-bg-sidebar text-text-primary"
              >
                <option value="Science">Science (Core Academics)</option>
                <option value="Humanities">Humanities & Languages</option>
                <option value="Administration">Administration & Accounting</option>
                <option value="Support">Support & Hostels</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">PAN Card Number *</label>
              <input 
                type="text" 
                placeholder="e.g. ABCDE1234F (10 digits)"
                value={formData.panNo}
                onChange={(e) => setFormData({...formData, panNo: e.target.value})}
                className="w-full text-xs font-mono uppercase"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Basic Salary (₹ / month) *</label>
              <input 
                type="number" 
                value={formData.basic}
                onChange={(e) => setFormData({...formData, basic: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Allowances (₹ / month)</label>
              <input 
                type="number" 
                value={formData.allowances}
                onChange={(e) => setFormData({...formData, allowances: e.target.value})}
                className="w-full text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Deductions (₹ / month)</label>
              <input 
                type="number" 
                value={formData.deductions}
                onChange={(e) => setFormData({...formData, deductions: e.target.value})}
                className="w-full text-xs font-mono"
              />
            </div>

            {/* Calculations Breakdown */}
            <div className="md:col-span-2 p-4 bg-bg-main border border-border rounded-2xl space-y-2 text-xs">
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Monthly Payroll Estimate</span>
              <div className="grid grid-cols-2 gap-2 text-text-secondary font-medium">
                <div>Basic Pay: <span className="text-text-primary font-bold font-mono">₹{Number(formData.basic || 0).toLocaleString('en-IN')}</span></div>
                <div>Net Disbursed: <span className="text-accent font-black font-mono">₹{calculateSalary(Number(formData.basic) || 0, Number(formData.allowances) || 0, Number(formData.deductions) || 0).net.toLocaleString('en-IN')}</span></div>
                <div className="text-[10px]">Allowances: <span className="text-success font-mono">+ ₹{(Number(formData.allowances) || 0).toLocaleString('en-IN')}</span></div>
                <div className="text-[10px]">Deductions: <span className="text-danger font-mono">- ₹{(Number(formData.deductions) || 0).toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="md:col-span-2 py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all mt-4 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
              <span>Register Faculty Member</span>
            </button>
          </form>
      </Modal>

      {/* STAFF DOCUMENT DOSSIER MODAL */}
      <Modal
        open={!!selectedStaffForDossier}
        onClose={() => setSelectedStaffForDossier(null)}
        title="Staff Documents & Dossier"
        icon={<FileBox size={20} />}
        size="lg"
      >
        {selectedStaffForDossier && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-100/50 border border-border rounded-2xl">
              {selectedStaffForDossier.profile_picture_url ? (
                <img 
                  src={selectedStaffForDossier.profile_picture_url} 
                  alt="Staff Avatar" 
                  className="w-14 h-14 rounded-xl object-cover border border-border" 
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xl font-black font-outfit">
                  {selectedStaffForDossier.first_name[0]}{selectedStaffForDossier.last_name[0]}
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-text-primary">{selectedStaffForDossier.first_name} {selectedStaffForDossier.last_name}</h4>
                <p className="text-[10px] text-text-secondary uppercase font-mono">ID: {selectedStaffForDossier.employee_id} • Designation: {selectedStaffForDossier.designation}</p>
              </div>
            </div>

            {/* Document Upload Selector */}
            <div className="p-5 bg-bg-main border border-border rounded-2xl space-y-4">
              <span className="text-[10px] font-black text-accent uppercase tracking-widest block">Upload New Dossier Document</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Document Category</label>
                  <select 
                    id="staffDocTypeSelector"
                    className="w-full text-xs bg-bg-sidebar text-text-primary py-2.5 px-3 rounded-xl border border-border font-sans"
                  >
                    <option value="PAN Card Copy">PAN Card Copy</option>
                    <option value="Aadhaar Card Copy">Aadhaar Card Copy</option>
                    <option value="Curriculum Vitae (CV)">Curriculum Vitae (CV)</option>
                    <option value="Educational Degrees">Educational Degrees</option>
                    <option value="Experience Certificates">Experience Certificates</option>
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
                    <Plus size={14} />
                    <span>Choose File & Upload</span>
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,.jpg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        const docType = document.getElementById('staffDocTypeSelector').value;
                        if (file) {
                          handleUploadDocument(file, docType);
                        }
                      }}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block ml-1">Registered Documents Registry</span>
              <div className="space-y-2">
                {(selectedStaffForDossier.documents || []).map((doc, idx) => (
                  <div key={idx} className="p-4 bg-bg-main border border-border hover:border-border rounded-2xl flex justify-between items-center transition-all font-inter">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-text-primary">{doc.name}</p>
                      <p className="text-[9px] text-text-secondary font-mono">{doc.fileName} • Uploaded on {doc.date}</p>
                    </div>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-\[10px] font-bold rounded-lg border border-border transition-all"
                    >
                      View File
                    </a>
                  </div>
                ))}
                {(selectedStaffForDossier.documents || []).length === 0 && (
                  <p className="text-xs text-text-secondary italic text-center py-6 border border-dashed border-border rounded-2xl">
                    No documents uploaded. Click above to register identity/qualification certificates.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Staff Table */}
      <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
        
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-md w-full relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search staff name, ID, PAN number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
            />
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-black text-warning bg-warning/5 border border-warning/20 px-3.5 py-2 rounded-xl">
            <ShieldAlert size={14} />
            <span>Multi-Tenant Lockdown: Active</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                <th className="pb-3 pl-2">Staff Member</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">PAN Code</th>
                <th className="pb-3">Basic Pay</th>
                <th className="pb-3">Allowances</th>
                <th className="pb-3">Deductions</th>
                <th className="pb-3">Net Payout</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredStaff.map((staff) => {
                const sal = calculateSalary(staff.basic, staff.allowances, staff.deductions);
                return (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2.5">
                      {staff.profile_picture_url ? (
                        <img 
                          src={staff.profile_picture_url} 
                          alt="Staff Avatar" 
                          className="w-8 h-8 rounded-lg object-cover border border-border shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black shrink-0">
                          {staff.first_name[0]}{staff.last_name[0]}
                        </div>
                      )}
                      <div>
                        <p>{staff.first_name} {staff.last_name}</p>
                        <span className="text-[9px] text-text-secondary uppercase">{staff.employee_id} • {staff.designation}</span>
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-slate-700">{staff.department}</td>
                    <td className="py-4 font-mono text-text-secondary">{staff.pan_no || 'N/A'}</td>
                    <td className="py-4 font-mono text-text-secondary">₹{staff.basic.toLocaleString('en-IN')}</td>
                    <td className="py-4 font-mono text-success">₹{(sal.allowances || 0).toLocaleString('en-IN')}</td>
                    <td className="py-4 font-mono text-danger">₹{(sal.deductions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-4 font-mono text-accent font-black">₹{sal.net.toLocaleString('en-IN')}</td>
                    <td className="py-4 text-right pr-2">
                      <button 
                        onClick={() => setSelectedStaffForDossier(staff)}
                        className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-slate-100 transition-all"
                        title="Staff Documents & Dossier"
                      >
                        <FileBox size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStaff.length === 0 && (
          <p className="text-center py-8 text-xs text-text-secondary">No faculty records found for this campus.</p>
        )}

      </div>
    </div>
  );
}
