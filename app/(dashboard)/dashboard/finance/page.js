'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState, useMemo } from 'react';
import { 
  Wallet, Search, CreditCard, CheckCircle2, 
  ArrowRight, Plus, Receipt, Landmark, HelpCircle, ShieldCheck, Download, AlertCircle, BellRing,
  Trash2, Edit3, Bus, Home as HomeIcon, ChevronDown, ChevronUp, Eye, X, Filter, Printer
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

export default function FinanceFeesPage() {
  const {
    activeTenant, 
    sharedStudents, 
    sharedFeeRecords, 
    setSharedFeeRecords,
    sharedClasses,
    sharedFeeStructures,
    setSharedFeeStructures,
    sharedStudentFeeAddons,
    setSharedStudentFeeAddons,
    sharedTransportRoutes,
    sharedHostelBlocks,
    activeRole
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Razorpay UPI');
  const [classFilter, setClassFilter] = useState('all');
  
  // Fee structure form
  const [showAddStructure, setShowAddStructure] = useState(false);
  const [newStructure, setNewStructure] = useState({ class_id: '', name: '', code: '', amount: '', period: 'Per Term', type: 'Academic' });
  const [structureClassFilter, setStructureClassFilter] = useState('all');
  
  // Student add-on editor
  const [editingAddonStudentId, setEditingAddonStudentId] = useState(null);
  const [addonForm, setAddonForm] = useState({ enableTransport: false, routeId: '', enableHostel: false, blockId: '' });

  // Student invoice viewer
  const [viewingInvoiceStudentId, setViewingInvoiceStudentId] = useState(null);

  const getClassName = (classId) => {
    const cls = sharedClasses.find(c => c.id === classId);
    return cls ? cls.name : 'Unassigned';
  };

  // Filter students by active campus tenant_id
  const tenantStudents = sharedStudents.filter(s => s.tenant_id === activeTenant.id);
  const tenantFeeStructures = sharedFeeStructures.filter(fs => fs.tenant_id === activeTenant.id);

  // Helper: calculate a student's fee breakdown
  const getStudentFeeBreakdown = (student) => {
    const classStructures = tenantFeeStructures.filter(fs => fs.class_id === student.class_id);
    const baseFee = classStructures.reduce((sum, fs) => sum + fs.amount, 0);
    const addons = sharedStudentFeeAddons[student.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
    const transportFee = addons.transport.enabled ? addons.transport.fee : 0;
    const hostelFee = addons.hostel.enabled ? addons.hostel.fee : 0;
    const total = baseFee + transportFee + hostelFee;
    return { baseFee, transportFee, hostelFee, total, classStructures, addons };
  };

  // Dynamic Metrics Calculation
  const metrics = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueStudentsCount = 0;

    tenantStudents.forEach(s => {
      const fee = sharedFeeRecords[s.id] || { total: 0, paid: 0, remaining: 0 };
      totalExpected += fee.total;
      totalCollected += fee.paid;
      totalOutstanding += fee.remaining;
      if (fee.remaining > 0) overdueStudentsCount++;
    });

    return { totalExpected, totalCollected, totalOutstanding, overdueStudentsCount };
  }, [tenantStudents, sharedFeeRecords]);

  // Compile transaction logs from all students
  const transactionLogs = useMemo(() => {
    const logs = [];
    tenantStudents.forEach(s => {
      const fee = sharedFeeRecords[s.id];
      if (fee && fee.history) {
        fee.history.forEach(tx => {
          logs.push({ ...tx, studentName: `${s.first_name} ${s.last_name}`, classId: s.class_id, studentId: s.id });
        });
      }
    });
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    return logs;
  }, [tenantStudents, sharedFeeRecords]);

  // Filter students by search and class
  const filteredStudents = tenantStudents.filter(s => {
    const term = searchQuery.toLowerCase();
    const className = getClassName(s.class_id).toLowerCase();
    const classId = (s.class_id || '').toLowerCase();
    const matchesSearch = 
      s.first_name.toLowerCase().includes(term) || 
      s.last_name.toLowerCase().includes(term) || 
      s.admission_no.toLowerCase().includes(term) ||
      className.includes(term) ||
      classId.includes(term);
    const matchesClass = classFilter === 'all' || s.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  // Group fee structures by class
  const structuresByClass = useMemo(() => {
    const filtered = structureClassFilter === 'all' 
      ? tenantFeeStructures 
      : tenantFeeStructures.filter(fs => fs.class_id === structureClassFilter);
    
    const grouped = {};
    filtered.forEach(fs => {
      if (!grouped[fs.class_id]) grouped[fs.class_id] = [];
      grouped[fs.class_id].push(fs);
    });
    return grouped;
  }, [tenantFeeStructures, structureClassFilter]);

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Fees & Finance" />;
  }

  const handleCollectPayment = (e) => {
    e.preventDefault();
    if (!selectedStudentId || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please select a student and enter a valid payment amount.');
      return;
    }

    const currentFee = sharedFeeRecords[selectedStudentId] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [] };
    const payAmt = Number(paymentAmount);

    if (payAmt > currentFee.remaining) {
      toast.error(`Payment amount (₹${payAmt.toLocaleString('en-IN')}) exceeds outstanding balance (₹${currentFee.remaining.toLocaleString('en-IN')}).`);
      return;
    }

    const newPaid = currentFee.paid + payAmt;
    const newRemaining = currentFee.total - newPaid;
    const newStatus = newRemaining === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
    
    const receipt = {
      id: `rcpt-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      amount: payAmt,
      method: paymentMethod
    };

    setSharedFeeRecords(prev => ({
      ...prev,
      [selectedStudentId]: {
        total: currentFee.total,
        paid: newPaid,
        remaining: newRemaining,
        status: newStatus,
        history: [receipt, ...currentFee.history]
      }
    }));

    const student = sharedStudents.find(s => s.id === selectedStudentId);
    toast.success(`Receipt ${receipt.id} generated! ₹${payAmt.toLocaleString('en-IN')} credited for ${student.first_name} ${student.last_name}.`);
    
    setPaymentAmount('');
    setSelectedStudentId(null);
  };

  const handleCreateFeeStructure = (e) => {
    e.preventDefault();
    if (!newStructure.class_id || !newStructure.name || !newStructure.code || !newStructure.amount) {
      toast.error('Class, fee name, code, and amount are required.');
      return;
    }

    const newId = `fs-${Date.now()}`;
    const structure = {
      id: newId,
      class_id: newStructure.class_id,
      name: newStructure.name,
      code: newStructure.code.toUpperCase(),
      amount: Number(newStructure.amount),
      period: newStructure.period,
      type: newStructure.type,
      tenant_id: activeTenant.id
    };

    setSharedFeeStructures(prev => [...prev, structure]);

    // Recalculate fees for all students in this class
    const affectedStudents = tenantStudents.filter(s => s.class_id === newStructure.class_id);
    if (affectedStudents.length > 0) {
      const updatedFeeRecords = { ...sharedFeeRecords };
      affectedStudents.forEach(student => {
        const currentRecord = updatedFeeRecords[student.id] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [] };
        const classStructures = [...tenantFeeStructures.filter(fs => fs.class_id === student.class_id), structure];
        const newBaseFee = classStructures.reduce((sum, fs) => sum + fs.amount, 0);
        const addons = sharedStudentFeeAddons[student.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
        const transportFee = addons.transport.enabled ? addons.transport.fee : 0;
        const hostelFee = addons.hostel.enabled ? addons.hostel.fee : 0;
        const newTotal = newBaseFee + transportFee + hostelFee;
        const newRemaining = newTotal - currentRecord.paid;

        updatedFeeRecords[student.id] = {
          ...currentRecord,
          total: newTotal,
          remaining: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? 'PAID' : currentRecord.paid > 0 ? 'PARTIAL' : 'UNPAID'
        };
      });
      setSharedFeeRecords(updatedFeeRecords);
    }

    toast.success(`Fee structure "${newStructure.name}" added to ${getClassName(newStructure.class_id)}. ${affectedStudents.length} student(s) auto-updated.`);
    setNewStructure({ class_id: '', name: '', code: '', amount: '', period: 'Per Term', type: 'Academic' });
    setShowAddStructure(false);
  };

  const handleDeleteStructure = (structureId) => {
    const structure = sharedFeeStructures.find(fs => fs.id === structureId);
    if (!structure) return;

    setSharedFeeStructures(prev => prev.filter(fs => fs.id !== structureId));

    // Recalculate fees for affected students
    const affectedStudents = tenantStudents.filter(s => s.class_id === structure.class_id);
    if (affectedStudents.length > 0) {
      const updatedFeeRecords = { ...sharedFeeRecords };
      affectedStudents.forEach(student => {
        const currentRecord = updatedFeeRecords[student.id] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [] };
        const remainingStructures = tenantFeeStructures.filter(fs => fs.class_id === student.class_id && fs.id !== structureId);
        const newBaseFee = remainingStructures.reduce((sum, fs) => sum + fs.amount, 0);
        const addons = sharedStudentFeeAddons[student.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
        const transportFee = addons.transport.enabled ? addons.transport.fee : 0;
        const hostelFee = addons.hostel.enabled ? addons.hostel.fee : 0;
        const newTotal = newBaseFee + transportFee + hostelFee;
        const newRemaining = newTotal - currentRecord.paid;

        updatedFeeRecords[student.id] = {
          ...currentRecord,
          total: newTotal,
          remaining: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? 'PAID' : currentRecord.paid > 0 ? 'PARTIAL' : 'UNPAID'
        };
      });
      setSharedFeeRecords(updatedFeeRecords);
    }

    toast.success(`Fee component "${structure.name}" removed. ${affectedStudents.length} student(s) auto-updated.`);
  };

  const handleSaveAddons = (studentId) => {
    const student = tenantStudents.find(s => s.id === studentId);
    if (!student) return;

    const transportFee = addonForm.enableTransport 
      ? (sharedTransportRoutes.find(r => r.id === addonForm.routeId)?.fee || 0)
      : 0;
    const hostelFee = addonForm.enableHostel
      ? (sharedHostelBlocks.find(b => b.id === addonForm.blockId)?.fee || 0)
      : 0;

    // Update add-ons
    setSharedStudentFeeAddons(prev => ({
      ...prev,
      [studentId]: {
        transport: { enabled: addonForm.enableTransport, routeId: addonForm.routeId, fee: transportFee },
        hostel: { enabled: addonForm.enableHostel, blockId: addonForm.blockId, fee: hostelFee }
      }
    }));

    // Recalculate this student's total fee
    const classStructures = tenantFeeStructures.filter(fs => fs.class_id === student.class_id);
    const baseFee = classStructures.reduce((sum, fs) => sum + fs.amount, 0);
    const newTotal = baseFee + transportFee + hostelFee;
    const currentRecord = sharedFeeRecords[studentId] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [] };
    const newRemaining = newTotal - currentRecord.paid;

    setSharedFeeRecords(prev => ({
      ...prev,
      [studentId]: {
        ...currentRecord,
        total: newTotal,
        remaining: Math.max(0, newRemaining),
        status: newRemaining <= 0 ? 'PAID' : currentRecord.paid > 0 ? 'PARTIAL' : 'UNPAID'
      }
    }));

    toast.success(`Add-ons updated for ${student.first_name} ${student.last_name}. New total: ₹${newTotal.toLocaleString('en-IN')}`);
    setEditingAddonStudentId(null);
  };

  const handleSendReminder = (student) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: `Sending fee reminder to guardian of ${student.first_name}...`,
        success: `Dues notification sent to parent of ${student.first_name} ${student.last_name}!`,
        error: 'Reminder failed'
      }
    );
  };

  const handleDownloadReport = () => {
    toast.success('Compiling campus financial ledger. PDF report download started!');
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Fee Management</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Class-wise fee structures, automatic billing, and payment collections.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadReport}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-xs font-bold rounded-2xl border border-border transition-all flex items-center gap-2"
          >
            <Download size={14} />
            <span>Download Report</span>
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('overview');
              if (tenantStudents.length > 0) {
                setSelectedStudentId(tenantStudents[0].id);
                const fee = sharedFeeRecords[tenantStudents[0].id];
                if (fee) setPaymentAmount(fee.remaining);
              }
              toast.info('Select a student to record payment.');
            }}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <CreditCard size={14} />
            <span>Collect Fee</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit">
          {['overview', 'structures', 'dues'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedStudentId(null); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                activeTab === tab 
                  ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'structures' ? 'Fee Structures' : tab === 'dues' ? 'Dues & Reminders' : 'Overview'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black text-success bg-success/5 border border-success/20 px-3.5 py-2 rounded-xl uppercase tracking-wider">
          <ShieldCheck size={14} />
          <span>Auto-Fee Assignment Active</span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Expected', value: `₹${metrics.totalExpected.toLocaleString('en-IN')}`, icon: Landmark, desc: 'Projected receipts', color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Total Collected', value: `₹${metrics.totalCollected.toLocaleString('en-IN')}`, icon: CheckCircle2, desc: 'Direct credits', color: 'text-success', bg: 'bg-success/10' },
          { label: 'Outstanding', value: `₹${metrics.totalOutstanding.toLocaleString('en-IN')}`, icon: Wallet, desc: 'Dues remaining', color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Overdue Students', value: metrics.overdueStudentsCount, icon: AlertCircle, desc: 'Accounts with balance', color: 'text-danger', bg: 'bg-danger/10' }
        ].map((kpi, idx) => (
          <div key={idx} className="p-6 bg-bg-sidebar border border-border rounded-3xl relative overflow-hidden group hover:border-accent/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{kpi.label}</span>
              <div className={`p-2 ${kpi.bg} rounded-xl ${kpi.color}`}><kpi.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-4">{kpi.value}</p>
            <p className="text-[11px] text-text-secondary mt-1 opacity-65">{kpi.desc}</p>
            {/* Collection percentage bar for first two cards */}
            {idx === 0 && metrics.totalExpected > 0 && (
              <div className="mt-3">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent to-success rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (metrics.totalCollected / metrics.totalExpected) * 100)}%` }} />
                </div>
                <span className="text-[9px] text-text-secondary mt-1 block">{((metrics.totalCollected / metrics.totalExpected) * 100).toFixed(1)}% collected</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Student Collections Ledger */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Fee Collections Desk</h3>
                <span className="text-[10px] font-bold text-text-secondary">Select student to collect payments</span>
              </div>

              {/* Search + Class Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative group/search">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search student by name or admission number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
                  />
                </div>
                <select 
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="text-xs bg-bg-main text-text-primary py-3 px-4 rounded-2xl border border-border min-w-[180px]"
                >
                  <option value="all">All Classes</option>
                  {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Student list */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
                {filteredStudents.map((stud) => {
                  const fee = sharedFeeRecords[stud.id] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [] };
                  const breakdown = getStudentFeeBreakdown(stud);
                  const isSelected = selectedStudentId === stud.id;
                  const isViewingInvoice = viewingInvoiceStudentId === stud.id;
                  
                  return (
                    <div key={stud.id} className="space-y-0">
                      <div 
                        className={`p-4 rounded-2xl ${isViewingInvoice ? 'rounded-b-none' : ''} border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                          isSelected 
                            ? 'bg-accent/15 border-accent/40 text-white' 
                            : 'bg-bg-main/85 border-border text-text-secondary hover:border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black">
                            {stud.first_name[0]}{stud.last_name[0]}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-text-primary">{stud.first_name} {stud.last_name}</h4>
                            <p className="text-[10px] text-text-secondary">{getClassName(stud.class_id)} • {stud.admission_no}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
                          {/* Breakdown chips */}
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="text-[8px] font-bold px-2 py-0.5 bg-slate-100 border border-border rounded text-text-secondary font-mono">
                              Base: ₹{breakdown.baseFee.toLocaleString('en-IN')}
                            </span>
                            {breakdown.transportFee > 0 && (
                              <span className="text-[8px] font-bold px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 font-mono">
                                <Bus size={8} className="inline mr-0.5" />₹{breakdown.transportFee.toLocaleString('en-IN')}
                              </span>
                            )}
                            {breakdown.hostelFee > 0 && (
                              <span className="text-[8px] font-bold px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 font-mono">
                                <HomeIcon size={8} className="inline mr-0.5" />₹{breakdown.hostelFee.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          <div className="text-left md:text-right text-[11px] font-mono">
                            <p className="text-slate-700">Total: ₹{fee.total.toLocaleString('en-IN')}</p>
                            <p className="text-success font-bold">Paid: ₹{fee.paid.toLocaleString('en-IN')}</p>
                            {fee.remaining > 0 && <p className="text-warning font-bold">Due: ₹{fee.remaining.toLocaleString('en-IN')}</p>}
                          </div>
                          
                          <div className="shrink-0 flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (isViewingInvoice) {
                                  setViewingInvoiceStudentId(null);
                                } else {
                                  setViewingInvoiceStudentId(stud.id);
                                }
                              }}
                              className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-slate-100 transition-all"
                              title="View Invoice Breakdown"
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              onClick={() => {
                                if (editingAddonStudentId === stud.id) {
                                  setEditingAddonStudentId(null);
                                } else {
                                  const addons = sharedStudentFeeAddons[stud.id] || { transport: { enabled: false, routeId: '' }, hostel: { enabled: false, blockId: '' } };
                                  setAddonForm({
                                    enableTransport: addons.transport.enabled,
                                    routeId: addons.transport.routeId || (sharedTransportRoutes[0]?.id || ''),
                                    enableHostel: addons.hostel.enabled,
                                    blockId: addons.hostel.blockId || (sharedHostelBlocks[0]?.id || '')
                                  });
                                  setEditingAddonStudentId(stud.id);
                                }
                              }}
                              className="p-1.5 text-text-secondary hover:text-accent rounded-lg hover:bg-accent/5 transition-all"
                              title="Edit Transport/Hostel Add-ons"
                            >
                              <Edit3 size={14} />
                            </button>

                            {fee.status === 'PAID' ? (
                              <span className="px-2.5 py-1 bg-success/15 border border-success/35 text-success text-[9px] font-black uppercase rounded">Settled</span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedStudentId(isSelected ? null : stud.id);
                                  if (!isSelected) setPaymentAmount(fee.remaining);
                                }}
                                className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-text-primary text-\[10px] font-bold rounded-lg transition-all"
                              >
                                {isSelected ? 'Cancel' : 'Collect'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>


                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <p className="text-center py-6 text-xs text-text-secondary">No student accounts found.</p>
                )}
              </div>

              {/* Collect Payment Modal */}
              <Modal
                open={!!selectedStudentId}
                onClose={() => { setSelectedStudentId(null); setPaymentAmount(''); }}
                title={`Record Payment: ${sharedStudents.find(s => s.id === selectedStudentId)?.first_name || ''} ${sharedStudents.find(s => s.id === selectedStudentId)?.last_name || ''}`}
                icon={<Receipt size={16} />}
                size="md"
              >
                {selectedStudentId && (
                  <form onSubmit={handleCollectPayment} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Amount (₹) *</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 5000"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full text-xs font-mono"
                          max={sharedFeeRecords[selectedStudentId]?.remaining || 0}
                          min={1}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Payment Method *</label>
                        <select 
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full text-xs bg-bg-sidebar text-text-primary"
                        >
                          <option value="Razorpay UPI">Razorpay UPI Gateway</option>
                          <option value="Cash Counter">Cash Counter Receipt</option>
                          <option value="RTGS Bank Transfer">RTGS / NEFT Bank Transfer</option>
                          <option value="Demand Draft">Demand Draft (DD)</option>
                          <option value="Cheque">Cheque Deposit</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-success hover:bg-success-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Receipt size={14} />
                      <span>Settle Dues & Issue Receipt</span>
                    </button>
                  </form>
                )}
              </Modal>
            </div>
          </div>

          {/* Right Panel: Recent Transactions + Quick Search */}
          <div className="space-y-6">
            <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary font-outfit">Recent Transactions</h3>
                <button
                  onClick={() => setActiveTab('dues')}
                  className="text-[10px] text-accent hover:text-accent-hover font-bold flex items-center gap-1"
                >
                  View All <ArrowRight size={10} />
                </button>
              </div>
              <div className="space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                {transactionLogs.slice(0, 20).map((tx, i) => (
                  <div key={i} className="p-3 bg-slate-50/50 border border-border rounded-xl space-y-1.5 hover:border-accent/15 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-text-primary leading-tight">{tx.studentName}</p>
                        <span className="text-[8px] text-text-secondary font-mono">Receipt: #{tx.id}</span>
                      </div>
                      <span className="text-[10px] font-bold text-success font-mono">+ ₹{tx.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-text-secondary">
                      <span>Method: {tx.method}</span>
                      <span className="font-mono">{tx.date}</span>
                    </div>
                  </div>
                ))}
                {transactionLogs.length === 0 && (
                  <p className="text-center py-6 text-xs text-text-secondary">No receipts cataloged.</p>
                )}
              </div>
            </div>

            {/* Quick Search widget */}
            <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary font-outfit">Quick Search</h3>
              <div className="relative group/qs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                <input 
                  type="text" 
                  placeholder="Student ID or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100/50 border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-accent/40 transition-all text-xs text-text-primary placeholder:text-text-secondary"
                />
              </div>
              {/* Class-wise summary */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Collection By Class</span>
                {sharedClasses.filter(c => c.tenant_id === activeTenant.id).slice(0, 4).map(cls => {
                  const classStudents = tenantStudents.filter(s => s.class_id === cls.id);
                  const classCollected = classStudents.reduce((sum, s) => sum + (sharedFeeRecords[s.id]?.paid || 0), 0);
                  const classTotal = classStudents.reduce((sum, s) => sum + (sharedFeeRecords[s.id]?.total || 0), 0);
                  const pct = classTotal > 0 ? (classCollected / classTotal) * 100 : 0;
                  return (
                    <div key={cls.id} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-text-secondary truncate max-w-[65%]">{cls.name}</span>
                        <span className="font-mono text-text-primary font-bold">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ===== FEE STRUCTURES TAB ===== */}
      {activeTab === 'structures' && (
        <div className="space-y-6">
          {/* Header for Structures */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <select 
                value={structureClassFilter}
                onChange={(e) => setStructureClassFilter(e.target.value)}
                className="text-xs bg-bg-main text-text-primary py-2.5 px-4 rounded-xl border border-border"
              >
                <option value="all">All Classes</option>
                {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="text-[10px] text-text-secondary">{tenantFeeStructures.length} fee components defined</span>
            </div>
            <button
              onClick={() => setShowAddStructure(true)}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-text-primary text-xs font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Add Structure</span>
            </button>
          </div>

          {/* Add Structure Form Modal */}
          <Modal
            open={showAddStructure}
            onClose={() => setShowAddStructure(false)}
            title="Define New Fee Component"
            icon={<Plus size={16} />}
            size="lg"
          >
            <form onSubmit={handleCreateFeeStructure} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Assign to Class *</label>
                  <select 
                    value={newStructure.class_id}
                    onChange={(e) => setNewStructure({...newStructure, class_id: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                    required
                  >
                    <option value="">Select Class...</option>
                    {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Fee Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Science Laboratory Fee"
                    value={newStructure.name}
                    onChange={(e) => setNewStructure({...newStructure, name: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Code *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. LAB"
                    value={newStructure.code}
                    onChange={(e) => setNewStructure({...newStructure, code: e.target.value})}
                    className="w-full text-xs font-mono uppercase"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Amount (₹) *</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 5000"
                    value={newStructure.amount}
                    onChange={(e) => setNewStructure({...newStructure, amount: e.target.value})}
                    className="w-full text-xs font-mono"
                    min={0}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Billing Period</label>
                  <select 
                    value={newStructure.period}
                    onChange={(e) => setNewStructure({...newStructure, period: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                  >
                    <option value="Per Term">Per Term</option>
                    <option value="Per Annum">Per Annum</option>
                    <option value="One-Time">One-Time</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Category</label>
                  <select 
                    value={newStructure.type}
                    onChange={(e) => setNewStructure({...newStructure, type: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                  >
                    <option value="Academic">Academic Fees</option>
                    <option value="Resource">Facilities & Labs</option>
                    <option value="Registration">Registration & Exam</option>
                    <option value="Extra-Curricular">Sports & Cultural</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>Create Fee Structure & Auto-Assign to Students</span>
              </button>
            </form>
          </Modal>

          {/* Class-wise fee structure cards */}
          {Object.keys(structuresByClass).length === 0 && (
            <div className="p-12 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl text-center">
              <p className="text-text-secondary text-sm">No fee structures defined yet. Click &quot;Add Structure&quot; to get started.</p>
            </div>
          )}

          {Object.entries(structuresByClass).map(([classId, structures]) => {
            const classTotal = structures.reduce((sum, fs) => sum + fs.amount, 0);
            const classStudentCount = tenantStudents.filter(s => s.class_id === classId).length;
            
            return (
              <div key={classId} className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-black font-outfit text-text-primary">{getClassName(classId)}</h3>
                    <span className="text-[10px] text-text-secondary">{classStudentCount} student(s) enrolled • {structures.length} fee component(s)</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Total Class Fee</p>
                    <p className="text-lg font-black font-mono text-accent">₹{classTotal.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {structures.map((fs) => (
                    <div key={fs.id} className="p-4 bg-bg-card/85 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border rounded-2xl flex items-center justify-between group hover:border-border transition-all">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-text-primary truncate">{fs.name}</h4>
                        <span className="text-[9px] text-text-secondary font-mono uppercase font-black">{fs.code} • {fs.type}</span>
                        <p className="text-lg font-black font-mono text-text-primary mt-1">₹{fs.amount.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-2.5 py-1 bg-accent/15 border border-accent/35 text-accent text-[9px] font-black uppercase rounded">{fs.period}</span>
                        <button
                          onClick={() => handleDeleteStructure(fs.id)}
                          className="p-1 text-text-secondary hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove fee component"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== DUES & REMINDERS TAB ===== */}
      {activeTab === 'dues' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                <BellRing size={16} className="text-accent" />
                <span>Outstanding Dues</span>
              </h3>
              <p className="text-text-secondary text-[11px] mt-0.5">Students with pending fee payments.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative group/ds">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                <input 
                  type="text" 
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-100/50 border border-border rounded-xl py-2 pl-9 pr-3 outline-none focus:border-accent/40 transition-all text-xs text-text-primary placeholder:text-text-secondary w-48"
                />
              </div>
              <select 
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="text-xs bg-bg-main text-text-primary py-2 px-3 rounded-xl border border-border"
              >
                <option value="all">All Classes</option>
                {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  const dueStudents = filteredStudents.filter(s => (sharedFeeRecords[s.id]?.remaining || 0) > 0);
                  dueStudents.forEach(s => handleSendReminder(s));
                  if (dueStudents.length === 0) toast.info('No outstanding dues to remind.');
                }}
                className="px-4 py-2 bg-danger hover:bg-danger/80 text-text-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <BellRing size={12} />
                <span>Send Bulk Reminders</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Student</th>
                  <th className="pb-3">Class</th>
                  <th className="pb-3">Base</th>
                  <th className="pb-3">Hostel</th>
                  <th className="pb-3">Trans.</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Paid</th>
                  <th className="pb-3">Balance</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredStudents
                  .filter(s => {
                    const fee = sharedFeeRecords[s.id] || { remaining: 0 };
                    return fee.remaining > 0;
                  })
                  .map((stud) => {
                    const fee = sharedFeeRecords[stud.id] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID' };
                    const breakdown = getStudentFeeBreakdown(stud);
                    return (
                      <tr key={stud.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-2 font-bold text-text-primary">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[10px] font-black">
                              {stud.first_name[0]}{stud.last_name[0]}
                            </div>
                            <div>
                              <span className="block">{stud.first_name} {stud.last_name}</span>
                              <span className="text-[9px] text-text-secondary font-mono">{stud.admission_no}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-text-secondary text-[10px]">{getClassName(stud.class_id)}</td>
                        <td className="py-4 font-mono text-text-primary">₹{breakdown.baseFee.toLocaleString('en-IN')}</td>
                        <td className="py-4 font-mono text-purple-400">{breakdown.hostelFee > 0 ? `₹${breakdown.hostelFee.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="py-4 font-mono text-blue-400">{breakdown.transportFee > 0 ? `₹${breakdown.transportFee.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="py-4 font-mono text-text-primary font-bold">₹{fee.total.toLocaleString('en-IN')}</td>
                        <td className="py-4 font-mono text-success font-bold">₹{fee.paid.toLocaleString('en-IN')}</td>
                        <td className="py-4 font-mono text-warning font-bold">₹{fee.remaining.toLocaleString('en-IN')}</td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase border rounded ${
                              fee.status === 'PARTIAL' 
                                ? 'bg-warning/15 border-warning/35 text-warning' 
                                : 'bg-danger/15 border-danger/35 text-danger'
                            }`}>
                              {fee.status}
                            </span>
                            <button
                              onClick={() => handleSendReminder(stud)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-accent hover:text-white border border-border hover:border-accent/30 text-text-secondary text-[10px] font-bold rounded-lg transition-all"
                            >
                              Remind
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('overview');
                                setSelectedStudentId(stud.id);
                                setPaymentAmount(fee.remaining);
                              }}
                              className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-text-primary text-\[10px] font-bold rounded-lg transition-all"
                            >
                              Collect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {filteredStudents.filter(s => (sharedFeeRecords[s.id]?.remaining || 0) > 0).length === 0 && (
            <p className="text-center py-6 text-xs text-text-secondary">No outstanding dues found.</p>
          )}
        </div>
      )}

      {/* Invoice Breakdown Modal */}
      <Modal
        open={!!viewingInvoiceStudentId}
        onClose={() => setViewingInvoiceStudentId(null)}
        title={`Fee Invoice Breakdown`}
        icon={<Eye size={16} />}
        size="md"
      >
        {viewingInvoiceStudentId && (() => {
          const stud = sharedStudents.find(s => s.id === viewingInvoiceStudentId);
          if (!stud) return null;
          const fee = sharedFeeRecords[stud.id] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [] };
          const breakdown = getStudentFeeBreakdown(stud);
          return (
            <div className="space-y-4">
              <p className="text-xs text-text-primary font-bold border-b border-border pb-2">Student: {stud.first_name} {stud.last_name} ({stud.admission_no})</p>
              <div className="space-y-1.5 text-xs text-text-secondary">
                {breakdown.classStructures.map((fs, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{fs.name} <span className="text-[8px] font-mono opacity-50">({fs.code})</span></span>
                    <span className="font-bold font-mono text-text-primary">₹{fs.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {breakdown.classStructures.length === 0 && (
                  <p className="text-[10px] opacity-60">No fee structure defined for this class yet.</p>
                )}
                {breakdown.transportFee > 0 && (
                  <div className="flex justify-between text-blue-400">
                    <span className="flex items-center gap-1"><Bus size={10} /> Transport Fee</span>
                    <span className="font-bold font-mono">+ ₹{breakdown.transportFee.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {breakdown.hostelFee > 0 && (
                  <div className="flex justify-between text-purple-400">
                    <span className="flex items-center gap-1"><HomeIcon size={10} /> Hostel Fee</span>
                    <span className="font-bold font-mono">+ ₹{breakdown.hostelFee.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="h-px bg-slate-100 my-1.5" />
                <div className="flex justify-between text-text-primary font-bold">
                  <span>Total Expected</span>
                  <span className="font-mono text-accent">₹{fee.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-success">
                  <span>Total Paid</span>
                  <span className="font-mono font-bold">- ₹{fee.paid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-warning font-bold text-sm">
                  <span>Outstanding Balance</span>
                  <span className="font-mono">₹{fee.remaining.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment History */}
              {fee.history && fee.history.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Payment Transaction History</span>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {fee.history.map((tx, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] p-2 bg-slate-100/50 border border-border rounded-lg">
                        <div>
                          <span className="text-text-secondary font-mono">#{tx.id}</span>
                          <span className="text-text-secondary ml-2">{tx.method}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-success font-bold font-mono">₹{tx.amount.toLocaleString('en-IN')}</span>
                          <span className="text-text-secondary ml-2 font-mono">{tx.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-6 flex justify-end gap-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-border text-text-primary text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={12} className="text-text-secondary" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setViewingInvoiceStudentId(null)}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Manage Add-ons Modal */}
      <Modal
        open={!!editingAddonStudentId}
        onClose={() => setEditingAddonStudentId(null)}
        title={`Manage Transport & Hostel Add-ons`}
        icon={<Edit3 size={16} />}
        size="md"
      >
        {editingAddonStudentId && (() => {
          const stud = sharedStudents.find(s => s.id === editingAddonStudentId);
          if (!stud) return null;
          return (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary mb-2">Configure extra boarding/commute amenities for {stud.first_name} {stud.last_name}.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Transport */}
                <div className="p-4 bg-slate-100/50 border border-border rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Bus size={12} className="text-blue-400" /> Transport
                    </span>
                    <input 
                      type="checkbox" 
                      checked={addonForm.enableTransport}
                      onChange={(e) => setAddonForm({ ...addonForm, enableTransport: e.target.checked })}
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent bg-bg-main"
                    />
                  </div>
                  {addonForm.enableTransport && (
                    <select 
                      value={addonForm.routeId}
                      onChange={(e) => setAddonForm({ ...addonForm, routeId: e.target.value })}
                      className="w-full text-xs bg-bg-sidebar text-text-primary py-2 px-2 border border-border rounded-lg"
                    >
                      {sharedTransportRoutes.map(r => (
                        <option key={r.id} value={r.id}>{r.name} (₹{r.fee.toLocaleString('en-IN')})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Hostel */}
                <div className="p-4 bg-slate-100/50 border border-border rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <HomeIcon size={12} className="text-purple-400" /> Hostel
                    </span>
                    <input 
                      type="checkbox" 
                      checked={addonForm.enableHostel}
                      onChange={(e) => setAddonForm({ ...addonForm, enableHostel: e.target.checked })}
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent bg-bg-main"
                    />
                  </div>
                  {addonForm.enableHostel && (
                    <select 
                      value={addonForm.blockId}
                      onChange={(e) => setAddonForm({ ...addonForm, blockId: e.target.value })}
                      className="w-full text-xs bg-bg-sidebar text-text-primary py-2 px-2 border border-border rounded-lg"
                    >
                      {sharedHostelBlocks.map(b => (
                        <option key={b.id} value={b.id}>{b.name} (₹{b.fee.toLocaleString('en-IN')})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleSaveAddons(stud.id)}
                  className="flex-1 py-3 bg-accent hover:bg-accent-hover text-text-primary text-xs font-bold rounded-xl transition-all"
                >
                  Save & Recalculate Fee
                </button>
                <button
                  onClick={() => setEditingAddonStudentId(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
