'use client';

import RoleGate from '@/components/RoleGate';
import React, { useState } from 'react';
import { 
  FileBox, Users, Plus, Search, DollarSign, Wallet, 
  CheckCircle2, CreditCard, Receipt, Loader2, UserPlus, X, Printer
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { uploadFileToBucket } from '@/lib/storage';

export default function HRPayrollPage() {
  const {
    supabase,
    activeTenant, 
    sharedStaff, 
    setSharedStaff,
    activeRole,
    activeUser
  } = useAuth();

  const [viewingSlipEmployee, setViewingSlipEmployee] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    designation: 'Lecturer',
    department: 'Science',
    basic: 55000,
    panNo: '',
    phone: '',
    email: '',
    avatar: '',
    avatarFile: null
  });

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="HR & Staff Payroll" />;
  }

  const isAdmin = activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'ACCOUNTANT';

  // Indian Salary calculations
  // HRA = 24% of basic (Class A cities rate)
  // DA = 50% of basic
  // PF = 12% of basic (Employees Provident Fund)
  // TDS = 10% average tax deduction
  const calculateSalary = (basic) => {
    const hra = basic * 0.24;
    const da = basic * 0.50;
    const pf = basic * 0.12;
    const tds = basic * 0.10;
    const gross = basic + hra + da;
    const deductions = pf + tds;
    const net = gross - deductions;
    return { hra, da, pf, tds, gross, deductions, net };
  };

  // Sync with sharedStaff as the single source of truth, and restrict based on activeRole
  const tenantStaff = sharedStaff.filter(s => {
    if (s.tenant_id !== activeTenant.id) return false;
    if (activeRole === 'TEACHER') {
      const myStaffRecord = sharedStaff.find(st => st.tenant_id === activeTenant.id && st.first_name && activeUser?.name?.includes(st.first_name));
      return s.id === myStaffRecord?.id;
    }
    return true;
  });

  const employees = tenantStaff.map(s => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    employee_id: s.employee_id,
    designation: s.designation,
    basic: s.basic || 50000,
    pan: s.pan_no || 'N/A',
    status: s.status || 'UNPAID',
    paid_at: s.paid_at || null,
    profile_picture_url: s.profile_picture_url
  }));

  const handleDisbursePayroll = (id, name) => {
    const updatedStaff = sharedStaff.map(emp => 
      emp.id === id 
        ? { ...emp, status: 'PAID', paid_at: new Date().toISOString().split('T')[0] } 
        : emp
    );
    setSharedStaff(updatedStaff);
    toast.success(`Salary processed & credited to ${name}'s bank account. SMS slip dispatched.`);
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
        pan_no: uppercasePan,
        phone: formData.phone || '+91 98765 43210',
        email: formData.email,
        tenant_id: activeTenant.id,
        profile_picture_url: profilePicUrl,
        status: 'UNPAID',
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

  const filteredEmployees = employees.filter(e => {
    const term = searchQuery.toLowerCase();
    return (
      e.name.toLowerCase().includes(term) ||
      e.employee_id.toLowerCase().includes(term) ||
      (e.pan && e.pan.toLowerCase().includes(term))
    );
  });

  // Calculate aggregate payroll metrics dynamically
  const totalEmployeesCount = employees.length;
  const totalBasicSalaries = employees.reduce((sum, emp) => sum + Number(emp.basic), 0);
  const totalNetPayouts = employees.reduce((sum, emp) => sum + calculateSalary(emp.basic).net, 0);
  const totalDeductions = employees.reduce((sum, emp) => sum + calculateSalary(emp.basic).deductions, 0);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">HR & Payroll Ledger</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">Configure staff salaries, allowances, TDS tax deductions, and bank payouts.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={14} />
            <span>Onboard Staff</span>
          </button>
        )}
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Staff Count', value: totalEmployeesCount, desc: 'EPF active members', icon: Users },
          { label: 'Basic Salaries (Month)', value: `₹${(totalBasicSalaries / 100000).toFixed(2)} Lakh`, desc: 'Base institutional pay', icon: Wallet },
          { label: 'PF & Tax Deductions', value: `₹${(totalDeductions / 100000).toFixed(2)} Lakh`, desc: 'Disbursed to Govt accounts', icon: FileBox },
          { label: 'Net Payouts', value: `₹${(totalNetPayouts / 100000).toFixed(2)} Lakh`, desc: 'Direct bank settlement', icon: CreditCard }
        ].map((k, i) => (
          <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><k.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3">{k.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
          </div>
        ))}
      </div>

      {/* Payroll Table */}
      <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-md w-full relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, employee ID, PAN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
            />
          </div>
          <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Current Cycle: May 2026
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                <th className="pb-3 pl-2">Staff Member</th>
                <th className="pb-3">PAN Code</th>
                <th className="pb-3">Basic Pay</th>
                <th className="pb-3">Allowances (HRA+DA)</th>
                <th className="pb-3">Deductions (PF+TDS)</th>
                <th className="pb-3">Net Payout</th>
                <th className="pb-3 text-right pr-2">Disbursement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredEmployees.map((emp) => {
                const sal = calculateSalary(emp.basic);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2.5">
                      {emp.profile_picture_url ? (
                        <img 
                          src={emp.profile_picture_url} 
                          alt="Staff Avatar" 
                          className="w-8 h-8 rounded-lg object-cover border border-border shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black shrink-0 font-outfit">
                          {emp.name ? emp.name[0] : 'T'}
                        </div>
                      )}
                      <div>
                        <p>{emp.name}</p>
                        <span className="text-[9px] text-text-secondary uppercase font-mono">{emp.employee_id} • {emp.designation}</span>
                      </div>
                    </td>
                    <td className="py-4 font-mono text-text-secondary">{emp.pan || 'N/A'}</td>
                    <td className="py-4 font-mono font-bold text-text-primary">₹{emp.basic.toLocaleString('en-IN')}</td>
                    <td className="py-4 font-mono text-success">
                      ₹{(sal.hra + sal.da).toLocaleString('en-IN')}
                      <span className="text-[8px] text-text-secondary block font-normal">HRA: {sal.hra.toLocaleString('en-IN')} • DA: {sal.da.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="py-4 font-mono text-danger">
                      ₹{(sal.pf + sal.tds).toLocaleString('en-IN')}
                      <span className="text-[8px] text-text-secondary block font-normal">PF: {sal.pf.toLocaleString('en-IN')} • TDS: {sal.tds.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="py-4 font-mono text-accent font-black">₹{sal.net.toLocaleString('en-IN')}</td>
                    <td className="py-4 text-right pr-2">
                      {emp.status === 'PAID' ? (
                        <div className="flex items-center gap-2 justify-end">
                          <div className="inline-flex flex-col items-end">
                            <span className="px-2.5 py-1 bg-success/15 border border-success/35 text-success text-[9px] font-black uppercase rounded">Settled</span>
                            <span className="text-[8px] text-text-secondary mt-0.5 opacity-55 font-mono">Paid on: {emp.paid_at || 'May 20, 2026'}</span>
                          </div>
                          <button
                            onClick={() => setViewingSlipEmployee(emp)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-border text-text-secondary rounded-lg transition-all"
                            title="Print Pay Slip"
                          >
                            <Receipt size={14} />
                          </button>
                        </div>
                      ) : activeRole === 'TEACHER' ? (
                        <span className="px-2.5 py-1 bg-warning/15 border border-warning/35 text-warning text-[9px] font-black uppercase rounded">Awaiting disbursement</span>
                      ) : (
                        <button 
                          onClick={() => handleDisbursePayroll(emp.id, emp.name)}
                          className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-text-primary text-\[10px] font-bold rounded-lg transition-all"
                        >
                          Disburse Salary
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <p className="text-center py-8 text-xs text-text-secondary">No employee records match your query.</p>
        )}

      </div>

      {/* Onboarding Modal */}
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
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider font-outfit">Staff Profile Picture</h4>
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
                    <span className="text-[10px] text-text-secondary">PNG, JPG up to 5MB</span>
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
              <p className="text-[10px] text-text-secondary mt-1 font-semibold">
                💡 Onboarding Notice: Staff's default login password is set to their PAN (uppercase).
              </p>
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

            {/* Calculations Breakdown */}
            <div className="md:col-span-2 p-4 bg-bg-main border border-border rounded-2xl space-y-2 text-xs">
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Monthly Payroll Estimate</span>
              <div className="grid grid-cols-2 gap-2 text-text-secondary font-medium">
                <div>Basic Pay: <span className="text-text-primary font-bold font-mono">₹{Number(formData.basic).toLocaleString('en-IN')}</span></div>
                <div>Net Disbursed: <span className="text-accent font-black font-mono">₹{calculateSalary(Number(formData.basic) || 0).net.toLocaleString('en-IN')}</span></div>
                <div className="text-[10px]">Allowances (HRA+DA): <span className="text-success font-mono">+ ₹{ ( (Number(formData.basic) || 0) * 0.74 ).toLocaleString('en-IN')}</span></div>
                <div className="text-[10px]">Deductions (PF+TDS): <span className="text-danger font-mono">- ₹{ ( (Number(formData.basic) || 0) * 0.22 ).toLocaleString('en-IN')}</span></div>
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

      {/* Salary Pay Slip Modal */}
      <Modal
        open={!!viewingSlipEmployee}
        onClose={() => setViewingSlipEmployee(null)}
        title="Employee Salary Pay Slip"
        icon={<Receipt size={16} />}
        size="md"
      >
        {viewingSlipEmployee && (() => {
          const sal = calculateSalary(viewingSlipEmployee.basic);
          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center pb-4 border-b border-border">
                <h3 className="text-lg font-black font-outfit text-accent uppercase tracking-tight">{activeTenant.name}</h3>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">Salary Pay Slip • May 2026</p>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-text-secondary font-black uppercase tracking-wider block">Employee Name</span>
                  <span className="font-bold text-text-primary">{viewingSlipEmployee.name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-text-secondary font-black uppercase tracking-wider block">Employee ID</span>
                  <span className="font-bold text-text-primary font-mono">{viewingSlipEmployee.employee_id}</span>
                </div>
                <div>
                  <span className="text-[9px] text-text-secondary font-black uppercase tracking-wider block">Designation</span>
                  <span className="font-bold text-text-primary">{viewingSlipEmployee.designation}</span>
                </div>
                <div>
                  <span className="text-[9px] text-text-secondary font-black uppercase tracking-wider block">PAN Code</span>
                  <span className="font-bold text-text-primary font-mono uppercase">{viewingSlipEmployee.pan}</span>
                </div>
              </div>

              <div className="h-px bg-border my-4" />

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-success uppercase tracking-widest border-b border-success/20 pb-1">Earnings</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Basic Salary</span>
                      <span className="font-mono text-text-primary font-bold">₹{viewingSlipEmployee.basic.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">House Rent Allowance (HRA)</span>
                      <span className="font-mono text-text-primary font-bold">₹{sal.hra.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Dearness Allowance (DA)</span>
                      <span className="font-mono text-text-primary font-bold">₹{sal.da.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="flex justify-between text-success font-bold">
                      <span>Gross Earnings</span>
                      <span className="font-mono">₹{(viewingSlipEmployee.basic + sal.hra + sal.da).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-danger uppercase tracking-widest border-b border-danger/20 pb-1">Deductions</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Provident Fund (PF)</span>
                      <span className="font-mono text-text-primary font-bold">₹{sal.pf.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Tax Deducted at Source (TDS)</span>
                      <span className="font-mono text-text-primary font-bold">₹{sal.tds.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-px bg-slate-100 my-1" />
                    <div className="flex justify-between text-danger font-bold">
                      <span>Total Deductions</span>
                      <span className="font-mono">₹{(sal.pf + sal.tds).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-100/50 border border-border rounded-xl flex justify-between items-center mt-6">
                <div>
                  <span className="text-[9px] text-text-secondary font-black uppercase tracking-wider block">Net Take-Home Salary</span>
                  <span className="text-xs text-text-secondary">Direct Deposit to registered Bank Account</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-accent">₹{sal.net.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border no-print">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-border text-text-primary text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={12} className="text-text-secondary" />
                  <span>Print Pay Slip</span>
                </button>
                <button
                  onClick={() => setViewingSlipEmployee(null)}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
