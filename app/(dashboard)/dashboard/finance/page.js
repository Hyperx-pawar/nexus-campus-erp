'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState, useMemo, useRef } from 'react';
import { 
  Wallet, Search, CreditCard, CheckCircle2, 
  ArrowRight, Plus, Receipt, Landmark, ShieldCheck, Download, AlertCircle, BellRing,
  Trash2, Edit3, Bus, Home as HomeIcon, Eye, X, Printer, Bell, Building2, User,
  Zap, BadgeCheck, Clock, Filter, Globe, ChevronDown, ClipboardList
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

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

export default function FinanceFeesPage() {
  const {
    activeTenant, 
    sharedStudents, 
    sharedParents,
    sharedFeeRecords, 
    setSharedFeeRecords,
    sharedClasses,
    sharedFeeStructures,
    setSharedFeeStructures,
    sharedStudentFeeAddons,
    setSharedStudentFeeAddons,
    sharedTransportRoutes,
    sharedHostelBlocks,
    sharedNotices,
    setSharedNotices,
    activeRole,
    activeUser,
    sharedNotifications,
    setSharedNotifications,
    sharedHostelInventoryAllocations,
    setSharedHostelInventoryAllocations
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [verifiedPayments, setVerifiedPayments] = useState(new Set()); // set of tx IDs
  const [viewingReceiptScreenshot, setViewingReceiptScreenshot] = useState(null);
  const [onlineFilter, setOnlineFilter] = useState('all'); // all | pending | verified
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Razorpay UPI');
  const [classFilter, setClassFilter] = useState('all');
  const [expandedDays, setExpandedDays] = useState({});
  const [txFilter, setTxFilter] = useState('all'); // all | online | offline
  const [paymentType, setPaymentType] = useState('tuition'); // 'tuition' | 'hostel_inventory'
  const [selectedInventoryAllocId, setSelectedInventoryAllocId] = useState('');

  // Switch to specific tab if passed in search parameters safely without Suspense
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['overview', 'structures', 'dues', 'online'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  
  // Collect Fee modal quick-search
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectSearch, setCollectSearch] = useState('');
  const [collectClassFilter, setCollectClassFilter] = useState('all');

  // Receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [includeDigitalSignature, setIncludeDigitalSignature] = useState(true);
  const receiptRef = useRef(null);

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

    // Calculate Hostel Inventory totals
    let hostelExpected = 0;
    let hostelCollected = 0;
    let hostelOutstanding = 0;

    (sharedHostelInventoryAllocations || []).filter(a => a.tenant_id === activeTenant.id).forEach(alloc => {
      hostelExpected += alloc.cost || 0;
      hostelCollected += alloc.paid || 0;
      hostelOutstanding += (alloc.cost - (alloc.paid || 0));
    });

    tenantStudents.forEach(s => {
      const fee = sharedFeeRecords[s.id] || { total: 0, paid: 0, remaining: 0 };
      totalExpected += fee.total;
      totalCollected += fee.paid;
      totalOutstanding += fee.remaining;

      // Check if student has unpaid hostel inventory
      const hasUnpaidHostelInv = (sharedHostelInventoryAllocations || [])
        .some(a => a.studentId === s.id && a.tenant_id === activeTenant.id && a.status !== 'PAID');

      if (fee.remaining > 0 || hasUnpaidHostelInv) overdueStudentsCount++;
    });

    const unifiedExpected = totalExpected + hostelExpected;
    const unifiedCollected = totalCollected + hostelCollected;
    const unifiedOutstanding = totalOutstanding + hostelOutstanding;

    return {
      totalExpected: unifiedExpected,
      totalCollected: unifiedCollected,
      totalOutstanding: unifiedOutstanding,
      overdueStudentsCount,
      tuitionExpected: totalExpected,
      tuitionCollected: totalCollected,
      tuitionOutstanding: totalOutstanding,
      hostelExpected,
      hostelCollected,
      hostelOutstanding
    };
  }, [tenantStudents, sharedFeeRecords, sharedHostelInventoryAllocations, activeTenant.id]);

  // Compile transaction logs from all students (including hostel inventory payments)
  const transactionLogs = useMemo(() => {
    const logs = [];
    tenantStudents.forEach(s => {
      const fee = sharedFeeRecords[s.id];
      if (fee && fee.history) {
        fee.history.forEach(tx => {
          logs.push({
            ...tx,
            type: 'FEE',
            studentName: `${s.first_name} ${s.last_name}`,
            classId: s.class_id,
            studentId: s.id
          });
        });
      }
    });

    // Add hostel inventory payments
    (sharedHostelInventoryAllocations || []).filter(a => a.tenant_id === activeTenant.id).forEach(alloc => {
      const stud = tenantStudents.find(s => s.id === alloc.studentId);
      if (stud) {
        (alloc.payments || []).forEach(p => {
          logs.push({
            ...p,
            type: 'HOSTEL',
            item: alloc.item,
            studentName: `${stud.first_name} ${stud.last_name}`,
            classId: stud.class_id,
            studentId: stud.id
          });
        });
      }
    });

    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    return logs;
  }, [tenantStudents, sharedFeeRecords, sharedHostelInventoryAllocations, activeTenant.id]);

  // Group transaction logs to calculate daily fee collection summaries
  const dailyCollections = useMemo(() => {
    const dailyMap = {};
    transactionLogs.forEach(tx => {
      if (tx.status === 'PENDING_VERIFICATION') return;
      const dateStr = tx.date;
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { amount: 0, count: 0 };
      }
      dailyMap[dateStr].amount += tx.amount;
      dailyMap[dateStr].count += 1;
    });

    const array = Object.keys(dailyMap).map(date => ({
      date,
      amount: dailyMap[date].amount,
      count: dailyMap[date].count
    }));
    array.sort((a, b) => new Date(b.date) - new Date(a.date));
    return array;
  }, [transactionLogs]);

  const formatDailyDate = (dateStr) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateStr === todayStr) return 'Today';
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      return dateObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  const isOnlineTx = (tx) => {
    if (!tx || !tx.method) return false;
    const m = tx.method.toLowerCase();
    const id = (tx.id || '').toLowerCase();
    return id.startsWith('onl') || m.includes('upi') || m.includes('card') || m.includes('net banking') || m.includes('qr') || m.includes('online') || m.includes('transfer');
  };

  const onlineTxs = useMemo(() => transactionLogs.filter(tx => isOnlineTx(tx)), [transactionLogs]);
  const offlineTxs = useMemo(() => transactionLogs.filter(tx => !isOnlineTx(tx)), [transactionLogs]);

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

  // Quick collect filtered students
  const collectFilteredStudents = useMemo(() => {
    const term = collectSearch.toLowerCase();
    return tenantStudents.filter(s => {
      const className = getClassName(s.class_id).toLowerCase();
      const matchSearch = !term ||
        s.first_name.toLowerCase().includes(term) ||
        s.last_name.toLowerCase().includes(term) ||
        s.admission_no.toLowerCase().includes(term) ||
        className.includes(term);
      const matchClass = collectClassFilter === 'all' || s.class_id === collectClassFilter;
      
      const fee = sharedFeeRecords[s.id] || { remaining: 0 };
      const pendingHostelInv = (sharedHostelInventoryAllocations || [])
        .filter(a => a.studentId === s.id && a.tenant_id === activeTenant.id && a.status !== 'PAID')
        .reduce((sum, a) => sum + (a.cost - (a.paid || 0)), 0);
      const hasDues = (fee.remaining || 0) > 0 || pendingHostelInv > 0;

      return matchSearch && matchClass && hasDues;
    });
  }, [tenantStudents, collectSearch, collectClassFilter, sharedFeeRecords, sharedHostelInventoryAllocations, activeTenant.id]);

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

    const payAmt = Number(paymentAmount);
    const student = sharedStudents.find(s => s.id === selectedStudentId);
    if (!student) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const receiptId = `RCPT-${paymentType === 'hostel_inventory' ? 'INV-' : ''}${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (paymentType === 'hostel_inventory') {
      if (!selectedInventoryAllocId) {
        toast.error('Please select a hostel inventory item to collect payment for.');
        return;
      }
      const alloc = (sharedHostelInventoryAllocations || []).find(a => a.id === selectedInventoryAllocId);
      if (!alloc) return;

      const outstanding = alloc.cost - (alloc.paid || 0);
      if (payAmt > outstanding) {
        toast.error(`Payment amount (₹${payAmt.toLocaleString('en-IN')}) exceeds outstanding balance (₹${outstanding.toLocaleString('en-IN')}).`);
        return;
      }

      const newPaid = (alloc.paid || 0) + payAmt;
      const newStatus = newPaid >= alloc.cost ? 'PAID' : 'PARTIAL';

      const paymentRecord = {
        id: receiptId,
        date: now.toISOString().split('T')[0],
        amount: payAmt,
        method: paymentMethod
      };

      setSharedHostelInventoryAllocations(prev => prev.map(a => {
        if (a.id === selectedInventoryAllocId) {
          return {
            ...a,
            paid: newPaid,
            status: newStatus,
            payments: [...(a.payments || []), paymentRecord]
          };
        }
        return a;
      }));

      const receipt = {
        id: receiptId,
        date: now.toISOString().split('T')[0],
        dateDisplay: dateStr,
        time: timeStr,
        amount: payAmt,
        method: paymentMethod,
        studentName: `${student.first_name} ${student.last_name}`,
        admissionNo: student.admission_no,
        className: getClassName(student.class_id),
        schoolName: activeTenant.name,
        totalFee: alloc.cost,
        newPaid,
        newRemaining: alloc.cost - newPaid,
        newStatus,
        collectedBy: activeUser?.name?.split(' (')[0] || 'Cashier',
        schoolAddress: activeTenant.address || '',
        schoolPhone: activeTenant.phone || '',
        schoolEmail: activeTenant.email || `admin@${activeTenant.subdomain}.edu.in`,
        schoolAffiliation: activeTenant.affiliation || '',
        schoolEstYear: activeTenant.estYear || '',
        schoolLogo: activeTenant.logo || '',
        schoolSubdomain: activeTenant.subdomain || '',
        feeBreakdown: [
          { label: `${alloc.item} (Hostel Inventory Item)`, code: 'HINV', amount: alloc.cost }
        ]
      };

      setLastReceipt(receipt);
      setShowReceiptModal(true);
      setShowCollectModal(false);
      setPaymentAmount('');
      setDiscountAmount('');
      setSelectedStudentId(null);
      setCollectSearch('');
      setSelectedInventoryAllocId('');
      setPaymentType('tuition'); // Reset

      const notifBase = { date: dateStr, author: `Fee Counter — ${activeTenant.name}`, tenant_id: activeTenant.id };
      const parent = sharedParents?.find(p => p.id === student.parent_id && p.tenant_id === activeTenant.id);

      toast.success(`✅ Receipt ${receiptId} generated! ₹${payAmt.toLocaleString('en-IN')} collected for ${alloc.item}.`);
      setTimeout(() => toast.info(`📨 School Admin notified: Hostel payment of ₹${payAmt.toLocaleString('en-IN')} received.`), 600);
      if (parent) {
        setTimeout(() => toast.success(`👨‍👩‍👧 Parent (${parent.first_name} ${parent.last_name}) notified.`), 1200);
        if (setSharedNotifications) {
          const notifId = `notif-${Date.now()}-${student.id}`;
          setSharedNotifications(prev => [
            {
              id: notifId,
              tenant_id: activeTenant.id,
              recipient_id: parent.id,
              title: `🏠 Hostel Inventory Payment Confirmed: ${student.first_name}`,
              body: `Receipt ${receiptId}: ₹${payAmt.toLocaleString('en-IN')} paid for ${alloc.item}. Outstanding: ₹${(alloc.cost - newPaid).toLocaleString('en-IN')}.`,
              type: 'FEE_PAYMENT',
              date: now.toISOString().split('T')[0],
              read: false,
              metadata: { 
                receiptId, 
                amount: payAmt, 
                studentId: student.id,
                receiptDetails: receipt 
              }
            },
            ...prev
          ]);
        }
      }
      return;
    }

    const currentFee = sharedFeeRecords[selectedStudentId] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [], discount: 0 };
    const discountAmt = Number(discountAmount || 0);

    if (payAmt + discountAmt > currentFee.remaining) {
      toast.error(`Payment + Discount (₹${(payAmt + discountAmt).toLocaleString('en-IN')}) exceeds outstanding balance (₹${currentFee.remaining.toLocaleString('en-IN')}).`);
      return;
    }

    const newPaid = currentFee.paid + payAmt;
    const newDiscount = (currentFee.discount || 0) + discountAmt;
    const newRemaining = Math.max(0, currentFee.total - newPaid - newDiscount);
    const newStatus = newRemaining === 0 ? 'PAID' : (newPaid > 0 || newDiscount > 0) ? 'PARTIAL' : 'UNPAID';

    const receipt = {
      id: receiptId,
      date: now.toISOString().split('T')[0],
      dateDisplay: dateStr,
      time: timeStr,
      amount: payAmt,
      discount: discountAmt,
      method: paymentMethod,
      studentName: `${student.first_name} ${student.last_name}`,
      admissionNo: student.admission_no,
      className: getClassName(student.class_id),
      schoolName: activeTenant.name,
      totalFee: currentFee.total,
      newPaid,
      newRemaining,
      newStatus,
      collectedBy: activeUser?.name?.split(' (')[0] || 'Cashier',
      schoolAddress: activeTenant.address || '',
      schoolPhone: activeTenant.phone || '',
      schoolEmail: activeTenant.email || `admin@${activeTenant.subdomain}.edu.in`,
      schoolAffiliation: activeTenant.affiliation || '',
      schoolEstYear: activeTenant.estYear || '',
      schoolLogo: activeTenant.logo || '',
      schoolSubdomain: activeTenant.subdomain || '',
      feeBreakdown: (() => {
        const structures = sharedFeeStructures.filter(fs => fs.tenant_id === activeTenant.id && fs.class_id === student?.class_id);
        const addons = sharedStudentFeeAddons[selectedStudentId] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
        const rows = structures.map(fs => ({ label: fs.name, code: fs.code, amount: fs.amount }));
        if (addons.transport.enabled && addons.transport.fee > 0) rows.push({ label: 'Transport Fee', code: 'TRP', amount: addons.transport.fee });
        if (addons.hostel.enabled && addons.hostel.fee > 0) rows.push({ label: 'Hostel Fee', code: 'HST', amount: addons.hostel.fee });
        return rows;
      })()
    };

    setSharedFeeRecords(prev => ({
      ...prev,
      [selectedStudentId]: {
        total: currentFee.total,
        paid: newPaid,
        discount: newDiscount,
        remaining: newRemaining,
        status: newStatus,
        history: [{ id: receiptId, date: receipt.date, amount: payAmt, discount: discountAmt, method: paymentMethod }, ...currentFee.history]
      }
    }));

    const notifBase = { date: dateStr, author: `Fee Counter — ${activeTenant.name}`, tenant_id: activeTenant.id };
    const parent = sharedParents?.find(p => p.id === student.parent_id && p.tenant_id === activeTenant.id);

    toast.success(`✅ Receipt ${receiptId} generated! ₹${payAmt.toLocaleString('en-IN')} collected from ${student.first_name} ${student.last_name}.`);
    setTimeout(() => toast.info(`📨 School Admin notified: Fee of ₹${payAmt.toLocaleString('en-IN')} received for ${student.first_name}.`), 600);
    setTimeout(() => toast.success(`📲 Notification sent to student: ${student.first_name} — Payment of ₹${payAmt.toLocaleString('en-IN')} confirmed!`), 1200);
    if (parent) setTimeout(() => toast.success(`👨‍👩‍👧 Parent (${parent.first_name} ${parent.last_name}) notified of fee payment.`), 1800);

    if (parent && setSharedNotifications) {
      const notifId = `notif-${Date.now()}-${student.id}`;
      setSharedNotifications(prev => [
        {
          id: notifId,
          tenant_id: activeTenant.id,
          recipient_id: parent.id,
          title: `📄 Fee Receipt Confirmed: ${student.first_name} ${student.last_name}`,
          body: `Receipt ${receiptId}: ₹${payAmt.toLocaleString('en-IN')} paid via ${paymentMethod}${discountAmt > 0 ? ` (Discount of ₹${discountAmt.toLocaleString('en-IN')} applied)` : ''}. Outstanding balance: ₹${newRemaining.toLocaleString('en-IN')}.`,
          type: 'FEE_PAYMENT',
          date: now.toISOString().split('T')[0],
          read: false,
          metadata: { 
            receiptId, 
            amount: payAmt, 
            discount: discountAmt,
            studentId: student.id,
            receiptDetails: receipt 
          }
        },
        ...prev
      ]);
    }

    if (setSharedNotices) {
      setSharedNotices(prev => [{
        id: Date.now(),
        title: `Fee Receipt: ${student.first_name} ${student.last_name}`,
        body: `Receipt ${receiptId}: ₹${payAmt.toLocaleString('en-IN')} collected via ${paymentMethod}${discountAmt > 0 ? ` with ₹${discountAmt.toLocaleString('en-IN')} discount` : ''}. Balance: ₹${newRemaining.toLocaleString('en-IN')}.`,
        ...notifBase
      }, ...prev]);
    }

    setLastReceipt(receipt);
    setShowReceiptModal(true);
    setShowCollectModal(false);
    setPaymentAmount('');
    setDiscountAmount('');
    setSelectedStudentId(null);
    setCollectSearch('');
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
        const currentRecord = updatedFeeRecords[student.id] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [], discount: 0 };
        const classStructures = [...tenantFeeStructures.filter(fs => fs.class_id === student.class_id), structure];
        const newBaseFee = classStructures.reduce((sum, fs) => sum + fs.amount, 0);
        const addons = sharedStudentFeeAddons[student.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
        const transportFee = addons.transport.enabled ? addons.transport.fee : 0;
        const hostelFee = addons.hostel.enabled ? addons.hostel.fee : 0;
        const newTotal = newBaseFee + transportFee + hostelFee;
        const newRemaining = newTotal - currentRecord.paid - (currentRecord.discount || 0);

        updatedFeeRecords[student.id] = {
          ...currentRecord,
          total: newTotal,
          remaining: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? 'PAID' : (currentRecord.paid > 0 || currentRecord.discount > 0) ? 'PARTIAL' : 'UNPAID'
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
        const currentRecord = updatedFeeRecords[student.id] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [], discount: 0 };
        const remainingStructures = tenantFeeStructures.filter(fs => fs.class_id === student.class_id && fs.id !== structureId);
        const newBaseFee = remainingStructures.reduce((sum, fs) => sum + fs.amount, 0);
        const addons = sharedStudentFeeAddons[student.id] || { transport: { enabled: false, fee: 0 }, hostel: { enabled: false, fee: 0 } };
        const transportFee = addons.transport.enabled ? addons.transport.fee : 0;
        const hostelFee = addons.hostel.enabled ? addons.hostel.fee : 0;
        const newTotal = newBaseFee + transportFee + hostelFee;
        const newRemaining = newTotal - currentRecord.paid - (currentRecord.discount || 0);

        updatedFeeRecords[student.id] = {
          ...currentRecord,
          total: newTotal,
          remaining: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? 'PAID' : (currentRecord.paid > 0 || currentRecord.discount > 0) ? 'PARTIAL' : 'UNPAID'
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
    const currentRecord = sharedFeeRecords[studentId] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [], discount: 0 };
    const newRemaining = newTotal - currentRecord.paid - (currentRecord.discount || 0);

    setSharedFeeRecords(prev => ({
      ...prev,
      [studentId]: {
        ...currentRecord,
        total: newTotal,
        remaining: Math.max(0, newRemaining),
        status: newRemaining <= 0 ? 'PAID' : (currentRecord.paid > 0 || currentRecord.discount > 0) ? 'PARTIAL' : 'UNPAID'
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
            onClick={() => { setShowCollectModal(true); setCollectSearch(''); setCollectClassFilter('all'); setSelectedStudentId(null); setPaymentAmount(''); }}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <CreditCard size={14} />
            <span>Collect Fee</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit flex-wrap">
          {['overview', 'structures', 'dues', 'online', 'transactions'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedStudentId(null); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                activeTab === tab 
                  ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'online' && <Zap size={11} className={activeTab === 'online' ? 'text-accent' : ''} />}
              {tab === 'transactions' && <ClipboardList size={11} className={activeTab === 'transactions' ? 'text-accent' : ''} />}
              {tab === 'structures' ? 'Fee Structures' : tab === 'dues' ? 'Dues & Reminders' : tab === 'online' ? 'Online Payments' : tab === 'transactions' ? 'All Transactions' : 'Overview'}
              {tab === 'online' && (() => {
                const onlineCount = (() => {
                  const logs = [];
                  tenantStudents.forEach(s => {
                    const fee = sharedFeeRecords[s.id];
                    if (fee && fee.history) fee.history.filter(tx => tx.id?.startsWith('ONL-')).forEach(tx => logs.push(tx));
                  });
                  return logs.filter(tx => !verifiedPayments.has(tx.id)).length;
                })();
                return onlineCount > 0 ? (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-accent text-white text-[8px] font-black rounded-full">{onlineCount}</span>
                ) : null;
              })()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black text-success bg-success/5 border border-success/20 px-3.5 py-2 rounded-xl uppercase tracking-wider">
          <ShieldCheck size={14} />
          <span>Auto-Fee Assignment Active</span>
        </div>
      </div>

      {/* KPI Stats Cards — Overview only */}
      {activeTab === 'overview' && (
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
      )}

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Hostel Inventory Payments Summary Banner */}
          <div className="p-5 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/15 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-up">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg">
                  <ClipboardList size={14} />
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 font-outfit">Hostel Inventory Financial Summary</h4>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">Overall counts and outstanding dues of hostel-issued equipment (mattress, lamp, study desk, etc.) for residential students.</p>
            </div>
            <div className="flex gap-4 flex-wrap w-full md:w-auto">
              {[
                { label: 'Inventory Expected', val: metrics.hostelExpected, color: 'text-text-primary' },
                { label: 'Inventory Collected', val: metrics.hostelCollected, color: 'text-success' },
                { label: 'Outstanding Dues', val: metrics.hostelOutstanding, color: 'text-warning' }
              ].map((sub, i) => (
                <div key={i} className="px-4 py-2 bg-white dark:bg-bg-sidebar border border-border rounded-xl min-w-[120px] text-center flex-1 md:flex-none">
                  <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest block">{sub.label}</span>
                  <span className={`text-sm font-black font-mono mt-0.5 block ${sub.color}`}>₹{sub.val.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

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
                          {(() => {
                            const pendingHostelInv = (sharedHostelInventoryAllocations || [])
                              .filter(a => a.studentId === stud.id && a.tenant_id === activeTenant.id && a.status !== 'PAID')
                              .reduce((sum, a) => sum + (a.cost - (a.paid || 0)), 0);
                            return (
                              <>
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
                                  {pendingHostelInv > 0 && (
                                    <span className="text-[8px] font-bold px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-purple-600 dark:text-purple-400 font-mono">
                                      <ClipboardList size={8} className="inline mr-0.5" />Inv: ₹{pendingHostelInv.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>

                                <div className="text-left md:text-right text-[11px] font-mono">
                                  <p className="text-slate-700">Total: ₹{fee.total.toLocaleString('en-IN')}</p>
                                  <p className="text-success font-bold">Paid: ₹{fee.paid.toLocaleString('en-IN')}</p>
                                  {fee.remaining > 0 && <p className="text-warning font-bold">Due: ₹{fee.remaining.toLocaleString('en-IN')}</p>}
                                  {pendingHostelInv > 0 && <p className="text-purple-600 dark:text-purple-400 font-bold">Inv Due: ₹{pendingHostelInv.toLocaleString('en-IN')}</p>}
                                </div>
                              </>
                            );
                          })()}
                          
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

                            {(() => {
                              const pendingHostelInv = (sharedHostelInventoryAllocations || [])
                                .filter(a => a.studentId === stud.id && a.tenant_id === activeTenant.id && a.status !== 'PAID')
                                .reduce((sum, a) => sum + (a.cost - (a.paid || 0)), 0);
                              const hasDues = fee.remaining > 0 || pendingHostelInv > 0;
                              return !hasDues ? (
                                <span className="px-2.5 py-1 bg-success/15 border border-success/35 text-success text-[9px] font-black uppercase rounded">Settled</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(stud.id);
                                    setShowCollectModal(true);
                                    if (fee.remaining > 0) {
                                      setPaymentType('tuition');
                                      setPaymentAmount(fee.remaining);
                                    } else {
                                      const pendingAllocs = (sharedHostelInventoryAllocations || [])
                                        .filter(a => a.studentId === stud.id && a.tenant_id === activeTenant.id && a.status !== 'PAID');
                                      if (pendingAllocs.length > 0) {
                                        setPaymentType('hostel_inventory');
                                        setSelectedInventoryAllocId(pendingAllocs[0].id);
                                        setPaymentAmount(pendingAllocs[0].cost - (pendingAllocs[0].paid || 0));
                                      }
                                    }
                                  }}
                                  className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-text-primary text-[10px] font-bold rounded-lg transition-all"
                                >
                                  Collect
                                </button>
                              );
                            })()}
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

              {/* (Collect Fee modal moved to top-level) */}
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

            {/* Daily Collections Summary */}
            <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                    <Landmark size={14} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-text-primary font-outfit">Daily Collections</h3>
                </div>
                <span className="text-[9px] bg-slate-100 dark:bg-black/20 text-text-secondary px-2 py-0.5 rounded-full font-bold">Per Day Ledger</span>
              </div>
              
              <div className="space-y-3.5 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
                {(() => {
                  const maxAmt = dailyCollections.reduce((max, day) => Math.max(max, day.amount), 1);
                  return dailyCollections.map((day, idx) => {
                    const percentage = Math.round((day.amount / maxAmt) * 100);
                    const isExpanded = !!expandedDays[day.date];
                    return (
                      <div key={idx} className="p-2 hover:bg-slate-50 dark:hover:bg-black/10 rounded-2xl border border-transparent hover:border-border/30 transition-all">
                        <button
                          type="button"
                          onClick={() => setExpandedDays(prev => ({ ...prev, [day.date]: !prev[day.date] }))}
                          className="w-full flex justify-between items-center text-xs text-left"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ChevronDown 
                              size={12} 
                              className={`text-text-secondary shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                            />
                            <div className="truncate">
                              <span className="font-bold text-text-primary">{formatDailyDate(day.date)}</span>
                              <span className="ml-1.5 text-[9px] font-semibold text-text-secondary opacity-60">({day.count})</span>
                            </div>
                          </div>
                          <span className="font-mono font-black text-accent shrink-0">₹{day.amount.toLocaleString('en-IN')}</span>
                        </button>
                        
                        <div className="h-1 bg-slate-100 dark:bg-black/15 rounded-full overflow-hidden mt-2 ml-4.5">
                          <div 
                            className="h-full bg-gradient-to-r from-accent to-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }} 
                          />
                        </div>

                        {/* Collapsible Nested Transactions List */}
                        {isExpanded && (
                          <div className="mt-2.5 ml-4.5 pl-3 border-l border-accent/25 space-y-2.5 animate-fade-in">
                            {transactionLogs
                              .filter(tx => tx.date === day.date && tx.status !== 'PENDING_VERIFICATION')
                              .map((tx, tIdx) => (
                                <div key={tIdx} className="flex justify-between items-center text-[10px] py-1 border-b border-border/40 last:border-b-0 gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-text-primary truncate">{tx.studentName}</p>
                                    <p className="text-[8px] text-text-secondary opacity-85 truncate">
                                      <span className="font-mono">{tx.id}</span> • {tx.method}
                                    </p>
                                  </div>
                                  <span className="font-mono font-bold text-success shrink-0">+₹{tx.amount.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
                {dailyCollections.length === 0 && (
                  <p className="text-center py-6 text-xs text-text-secondary">No collections logged yet.</p>
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
          
          // Hostel Inventory items
          const inventoryAllocations = (sharedHostelInventoryAllocations || [])
            .filter(a => a.studentId === stud.id && a.tenant_id === activeTenant.id);
          const totalInvCost = inventoryAllocations.reduce((sum, a) => sum + a.cost, 0);
          const totalInvPaid = inventoryAllocations.reduce((sum, a) => sum + (a.paid || 0), 0);
          const totalInvRemaining = totalInvCost - totalInvPaid;

          const unifiedTotalExpected = fee.total + totalInvCost;
          const unifiedTotalPaid = fee.paid + totalInvPaid;
          const unifiedTotalRemaining = fee.remaining + totalInvRemaining;

          return (
            <div className="space-y-4">
              <p className="text-xs text-text-primary font-bold border-b border-border pb-2">Student: {stud.first_name} {stud.last_name} ({stud.admission_no})</p>
              <div className="space-y-1.5 text-xs text-text-secondary">
                {/* Tuition Fee Breakdown */}
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
                
                {/* Hostel Inventory Items Breakdown */}
                {inventoryAllocations.length > 0 && (
                  <>
                    <div className="h-px bg-slate-100 my-1.5" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest block mb-1">Hostel Issued Equipment</span>
                    {inventoryAllocations.map((a, i) => (
                      <div key={i} className="flex justify-between text-purple-600 dark:text-purple-400">
                        <span className="flex items-center gap-1"><ClipboardList size={10} /> {a.item} ({a.status})</span>
                        <span className="font-bold font-mono">₹{a.cost.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </>
                )}

                <div className="h-px bg-slate-100 my-1.5" />
                <div className="flex justify-between text-text-primary font-bold">
                  <span>Total Expected</span>
                  <span className="font-mono text-accent font-black">₹{unifiedTotalExpected.toLocaleString('en-IN')}</span>
                </div>
                {fee.discount > 0 && (
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span>Total Discount Applied</span>
                    <span className="font-mono">- ₹{fee.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-success">
                  <span>Total Paid</span>
                  <span className="font-mono font-bold">- ₹{unifiedTotalPaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-warning font-bold text-sm">
                  <span>Outstanding Balance</span>
                  <span className="font-mono">₹{unifiedTotalRemaining.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment History */}
              {(() => {
                const combinedHistory = [...(fee.history || []).map(tx => ({ ...tx, type: 'Tuition' }))];
                inventoryAllocations.forEach(alloc => {
                  (alloc.payments || []).forEach(p => {
                    combinedHistory.push({
                      ...p,
                      type: `${alloc.item} (Inv)`
                    });
                  });
                });
                
                // Sort by date descending
                combinedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

                if (combinedHistory.length === 0) return null;
                return (
                  <div className="mt-4 pt-3 border-t border-border space-y-2">
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Payment Transaction History</span>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {combinedHistory.map((tx, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] p-2 bg-slate-100/50 border border-border rounded-lg">
                          <div>
                            <span className="text-text-secondary font-mono">#{tx.id}</span>
                            <span className="text-text-secondary ml-2 font-bold bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[8px] uppercase">{tx.type}</span>
                            <span className="text-text-secondary ml-2">{tx.method}</span>
                          </div>
                          <div className="text-right">
                            {tx.discount > 0 && (
                              <span className="text-amber-600 font-bold font-mono mr-2">
                                (Disc: ₹{tx.discount.toLocaleString('en-IN')})
                              </span>
                            )}
                            <span className="text-success font-bold font-mono">₹{tx.amount.toLocaleString('en-IN')}</span>
                            <span className="text-text-secondary ml-2 font-mono">{tx.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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

      {/* ===== ONLINE PAYMENTS VERIFICATION TAB ===== */}
      {activeTab === 'online' && (() => {
        // Build complete online payment log (fee payments + hostel inventory)
        const feeTxns = [];
        tenantStudents.forEach(s => {
          const fee = sharedFeeRecords[s.id];
          if (fee && fee.history) {
            fee.history.filter(tx => tx.id?.startsWith('ONL-')).forEach(tx => {
              feeTxns.push({
                ...tx,
                type: 'FEE',
                studentName: `${s.first_name} ${s.last_name}`,
                admissionNo: s.admission_no,
                className: getClassName(s.class_id),
                studentId: s.id
              });
            });
          }
        });

        const hostelTxns = [];
        (sharedHostelInventoryAllocations || []).filter(a => a.tenant_id === activeTenant.id).forEach(alloc => {
          (alloc.payments || []).filter(p => p.id?.startsWith('HINV-ONL-')).forEach(p => {
            const stud = tenantStudents.find(s => s.id === alloc.studentId);
            hostelTxns.push({
              ...p,
              type: 'HOSTEL',
              item: alloc.item,
              studentName: stud ? `${stud.first_name} ${stud.last_name}` : 'Unknown',
              admissionNo: stud?.admission_no || '',
              className: stud ? getClassName(stud.class_id) : '',
              studentId: alloc.studentId,
              allocId: alloc.id
            });
          });
        });

        const allOnlineTxns = [...feeTxns, ...hostelTxns].sort((a, b) => new Date(b.date) - new Date(a.date));

        const filtered = allOnlineTxns.filter(tx => {
          if (onlineFilter === 'pending') return !verifiedPayments.has(tx.id);
          if (onlineFilter === 'verified') return verifiedPayments.has(tx.id);
          return true;
        });

        const totalOnline = allOnlineTxns.reduce((s, t) => s + t.amount, 0);
        const pendingCount = allOnlineTxns.filter(t => !verifiedPayments.has(t.id)).length;
        const verifiedCount = allOnlineTxns.filter(t => verifiedPayments.has(t.id)).length;

        return (
          <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: 'Total Online Received', value: `₹${totalOnline.toLocaleString('en-IN')}`, icon: Globe, color: 'text-accent', bg: 'bg-accent/10' },
                { label: 'Pending Verification', value: pendingCount, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
                { label: 'Verified & Settled', value: verifiedCount, icon: BadgeCheck, color: 'text-success', bg: 'bg-success/10' }
              ].map((kpi, i) => (
                <div key={i} className="p-5 bg-bg-sidebar border border-border rounded-3xl flex items-center gap-4">
                  <div className={`p-3 ${kpi.bg} rounded-2xl ${kpi.color}`}><kpi.icon size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{kpi.label}</p>
                    <p className="text-2xl font-black font-outfit text-text-primary mt-0.5">{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filter + Verify All */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                {['all', 'pending', 'verified'].map(f => (
                  <button key={f} onClick={() => setOnlineFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      onlineFilter === f ? 'bg-accent text-white border-accent' : 'bg-bg-sidebar text-text-secondary border-border hover:border-accent/40'
                    }`}>{f === 'all' ? 'All Transactions' : f === 'pending' ? `Pending (${pendingCount})` : `Verified (${verifiedCount})`}</button>
                ))}
              </div>
              {pendingCount > 0 && (
                <button
                  onClick={() => {
                    const newSet = new Set(verifiedPayments);
                    const updatedRecords = { ...sharedFeeRecords };
                    
                    filtered.filter(tx => !verifiedPayments.has(tx.id)).forEach(tx => {
                      newSet.add(tx.id);
                      
                      if (tx.type === 'FEE') {
                        const sId = tx.studentId;
                        const currentFee = updatedRecords[sId];
                        if (currentFee) {
                          const updatedHistory = (currentFee.history || []).map(h => {
                            if (h.id === tx.id) {
                              return { ...h, status: 'VERIFIED' };
                            }
                            return h;
                          });
                          
                          const newPaid = currentFee.paid + tx.amount;
                          const newRemaining = Math.max(0, currentFee.remaining - tx.amount);
                          const newStatus = newRemaining === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
                          
                          updatedRecords[sId] = {
                            ...currentFee,
                            paid: newPaid,
                            remaining: newRemaining,
                            status: newStatus,
                            history: updatedHistory
                          };

                          // Notify parent
                          const stud = sharedStudents.find(st => st.id === sId);
                          const parent = sharedParents?.find(p => p.id === stud?.parent_id);
                          if (parent && setSharedNotifications) {
                            setSharedNotifications(prev => [
                              {
                                id: `notif-${Date.now()}-${sId}-${tx.id}`,
                                tenant_id: activeTenant.id,
                                recipient_id: parent.id,
                                title: `✅ Online Payment Verified: ${stud?.first_name} ${stud?.last_name}`,
                                body: `Your payment of ₹${tx.amount.toLocaleString('en-IN')} (UTR: ${tx.utr || 'N/A'}) has been verified. Receipt ID: ${tx.id}.`,
                                type: 'FEE_PAYMENT',
                                date: new Date().toISOString().split('T')[0],
                                read: false
                              },
                              ...prev
                            ]);
                          }
                        }
                      }
                    });

                    setSharedFeeRecords(updatedRecords);
                    setVerifiedPayments(newSet);
                    toast.success(`All ${pendingCount} online payment(s) marked as verified!`);
                  }}
                  className="px-5 py-2.5 bg-success hover:bg-success/90 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-2"
                >
                  <BadgeCheck size={13} /> Verify All Pending
                </button>
              )}
            </div>

            {/* Transaction List */}
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="p-12 bg-bg-sidebar border border-dashed border-border rounded-3xl text-center">
                  <Zap size={28} className="text-text-secondary mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-bold text-text-primary">No online payments found</p>
                  <p className="text-xs text-text-secondary mt-1">Online payments made by parents will appear here for verification.</p>
                </div>
              ) : filtered.map((tx, i) => {
                const isVerified = verifiedPayments.has(tx.id);
                return (
                  <div key={i} className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center gap-4 ${
                    isVerified ? 'bg-success/5 border-success/25' : 'bg-bg-sidebar border-border hover:border-warning/30'
                  }`}>
                    {/* Left info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        tx.type === 'HOSTEL' ? 'bg-purple-500/15 text-purple-500' : 'bg-accent/15 text-accent'
                      }`}>
                        {tx.type === 'HOSTEL' ? <HomeIcon size={16} /> : <Zap size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-text-primary">{tx.studentName}</p>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-black uppercase border bg-bg-main text-text-secondary border-border">{tx.className}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase border ${
                            tx.type === 'HOSTEL' ? 'bg-purple-500/10 text-purple-500 border-purple-500/25' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/25'
                          }`}>{tx.type === 'HOSTEL' ? '🏠 Hostel Item' : '⚡ Term Fee'}</span>
                        </div>
                        <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                          Receipt: <span className="font-bold text-accent">{tx.id}</span>
                          {tx.utr && <span className="ml-2 text-text-secondary font-sans font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">UTR: {tx.utr}</span>}
                          {tx.type === 'HOSTEL' && <span className="ml-2 text-text-secondary">• Item: {tx.item}</span>}
                        </p>
                        <p className="text-[10px] text-text-secondary flex items-center gap-1 flex-wrap">
                          <span>Method: <span className="font-semibold">{tx.method}</span> • Date: {tx.date} • Adm: {tx.admissionNo}</span>
                          {tx.receiptImage && (
                            <button
                              type="button"
                              onClick={() => setViewingReceiptScreenshot(tx.receiptImage)}
                              className="ml-2 px-2 py-0.5 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded text-[9px] font-bold transition-all border border-accent/20"
                            >
                              View Screenshot
                            </button>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-black text-success font-mono">₹{tx.amount.toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-text-secondary">Amount Paid</p>
                      </div>
                      {isVerified ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-success/15 border border-success/30 rounded-xl text-success text-[10px] font-black">
                          <BadgeCheck size={14} /> Verified
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const newSet = new Set(verifiedPayments);
                            newSet.add(tx.id);
                            setVerifiedPayments(newSet);
                            
                            // Synchronize details to sharedFeeRecords if this is a fee transaction
                            if (tx.type === 'FEE') {
                              const sId = tx.studentId;
                              const currentFee = sharedFeeRecords[sId];
                              if (currentFee) {
                                const updatedHistory = (currentFee.history || []).map(h => {
                                  if (h.id === tx.id) {
                                    return { ...h, status: 'VERIFIED' };
                                  }
                                  return h;
                                });
                                
                                const newPaid = currentFee.paid + tx.amount;
                                const newRemaining = Math.max(0, currentFee.remaining - tx.amount);
                                const newStatus = newRemaining === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
                                
                                setSharedFeeRecords(prev => ({
                                  ...prev,
                                  [sId]: {
                                    ...currentFee,
                                    paid: newPaid,
                                    remaining: newRemaining,
                                    status: newStatus,
                                    history: updatedHistory
                                  }
                                }));

                                // Notify parent
                                const stud = sharedStudents.find(st => st.id === sId);
                                const parent = sharedParents?.find(p => p.id === stud?.parent_id);
                                if (parent && setSharedNotifications) {
                                  setSharedNotifications(prev => [
                                    {
                                      id: `notif-${Date.now()}-${sId}`,
                                      tenant_id: activeTenant.id,
                                      recipient_id: parent.id,
                                      title: `✅ Online Payment Verified: ${stud?.first_name} ${stud?.last_name}`,
                                      body: `Your payment of ₹${tx.amount.toLocaleString('en-IN')} (UTR: ${tx.utr || 'N/A'}) has been verified. Receipt ID: ${tx.id}.`,
                                      type: 'FEE_PAYMENT',
                                      date: new Date().toISOString().split('T')[0],
                                      read: false
                                    },
                                    ...prev
                                  ]);
                                }
                              }
                            }
                            toast.success(`Payment ${tx.id} for ${tx.studentName} marked as verified!`);
                          }}
                          className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-[10px] font-black rounded-xl transition-all flex items-center gap-1.5 shadow shadow-accent/20"
                        >
                          <ShieldCheck size={12} /> Mark Verified
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info note */}
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl flex items-start gap-3">
              <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">How Online Payment Verification Works</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 leading-relaxed">
                  When a parent pays online via UPI, Card, or Net Banking from their Guardian Portal, it is instantly reflected in this ledger. 
                  The school accountant should cross-check with the bank statement or payment gateway dashboard and then click <strong>"Mark Verified"</strong> to confirm receipt. 
                  Verified payments are permanently settled in the student's fee ledger.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== ALL TRANSACTIONS TAB ===== */}
      {activeTab === 'transactions' && (() => {
        // Build complete list of all transactions (online + offline)
        // Online: starts with ONL- or has online payment methods
        // Offline: standard counter collections, cash, RTGS, etc.
        const allTxns = [];
        tenantStudents.forEach(s => {
          const fee = sharedFeeRecords[s.id];
          if (fee && fee.history) {
            fee.history.forEach(tx => {
              const online = isOnlineTx(tx);
              allTxns.push({
                ...tx,
                isOnline: online,
                type: 'FEE',
                studentName: `${s.first_name} ${s.last_name}`,
                admissionNo: s.admission_no,
                className: getClassName(s.class_id),
                studentId: s.id
              });
            });
          }
        });

        // Add hostel inventory payouts
        (sharedHostelInventoryAllocations || []).filter(a => a.tenant_id === activeTenant.id).forEach(alloc => {
          (alloc.payments || []).forEach(p => {
            const stud = tenantStudents.find(s => s.id === alloc.studentId);
            if (stud) {
              const online = isOnlineTx(p);
              allTxns.push({
                ...p,
                isOnline: online,
                type: 'HOSTEL',
                item: alloc.item,
                studentName: `${stud.first_name} ${stud.last_name}`,
                admissionNo: stud.admission_no,
                className: getClassName(stud.class_id),
                studentId: stud.id
              });
            }
          });
        });

        // Sort descending by date
        allTxns.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calculate counts and sums
        const totalCount = allTxns.length;
        const totalAmount = allTxns.reduce((sum, tx) => sum + tx.amount, 0);

        const onlineList = allTxns.filter(tx => tx.isOnline);
        const onlineCount = onlineList.length;
        const onlineAmount = onlineList.reduce((sum, tx) => sum + tx.amount, 0);

        const offlineList = allTxns.filter(tx => !tx.isOnline);
        const offlineCount = offlineList.length;
        const offlineAmount = offlineList.reduce((sum, tx) => sum + tx.amount, 0);

        // Filter by tab search query and class, and online/offline category
        const filteredTxns = allTxns.filter(tx => {
          const term = searchQuery.toLowerCase();
          const matchesSearch = 
            tx.studentName.toLowerCase().includes(term) ||
            tx.admissionNo.toLowerCase().includes(term) ||
            tx.id.toLowerCase().includes(term) ||
            (tx.utr && tx.utr.toLowerCase().includes(term));
            
          const matchesClass = classFilter === 'all' || tenantStudents.find(s => s.id === tx.studentId)?.class_id === classFilter;
          const matchesType = 
            txFilter === 'all' || 
            (txFilter === 'online' && tx.isOnline) || 
            (txFilter === 'offline' && !tx.isOnline);

          return matchesSearch && matchesClass && matchesType;
        });

        return (
          <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-6 animate-slide-up">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-slate-50/50 border border-border rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">All Transactions</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-black/20 text-text-secondary text-[9px] font-black rounded-full uppercase">{totalCount} count</span>
                </div>
                <p className="text-2xl font-black font-outfit text-text-primary mt-3">₹{totalAmount.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-text-secondary mt-1 opacity-70">Total volume logged</p>
              </div>

              <div className="p-5 bg-accent/5 border border-border rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest">Online Transactions</span>
                  <span className="px-2 py-0.5 bg-accent/15 text-accent text-[9px] font-black rounded-full uppercase">{onlineCount} count</span>
                </div>
                <p className="text-2xl font-black font-outfit text-accent mt-3">₹{onlineAmount.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-text-secondary mt-1 opacity-70">UPI, QR, Cards & Gateways</p>
              </div>

              <div className="p-5 bg-success/5 border border-border rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-success uppercase tracking-widest">Offline Transactions</span>
                  <span className="px-2 py-0.5 bg-success/15 text-success text-[9px] font-black rounded-full uppercase">{offlineCount} count</span>
                </div>
                <p className="text-2xl font-black font-outfit text-success mt-3">₹{offlineAmount.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-text-secondary mt-1 opacity-70">Cash, RTGS & Counter Slips</p>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-text-primary font-outfit">Transactions Ledger</h3>
                  <p className="text-[10px] text-text-secondary">Historical transaction records for the active school.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Category switcher */}
                  <div className="flex p-1 bg-slate-100 dark:bg-black/15 border border-border rounded-xl">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'online', label: 'Online' },
                      { id: 'offline', label: 'Offline' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setTxFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${
                          txFilter === f.id 
                            ? 'bg-white dark:bg-bg-sidebar text-text-primary shadow-sm border border-border/40' 
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative group/txs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={12} />
                    <input 
                      type="text" 
                      placeholder="Receipt or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-100/50 border border-border rounded-xl py-1.5 pl-8 pr-3 outline-none focus:border-accent/40 transition-all text-xs text-text-primary w-36"
                    />
                  </div>

                  {/* Class */}
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="text-xs bg-bg-main text-text-primary py-1.5 px-3 rounded-xl border border-border font-bold"
                  >
                    <option value="all">All Classes</option>
                    {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transactions list table */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                      <th className="pb-3 pl-2">Student</th>
                      <th className="pb-3">Class</th>
                      <th className="pb-3">Receipt ID</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Method</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {filteredTxns.map((tx, idx) => {
                      const isVerificationPending = tx.status === 'PENDING_VERIFICATION';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pl-2 font-bold text-text-primary">
                            <div>
                              <span>{tx.studentName}</span>
                              <span className="block text-[8px] text-text-secondary font-mono leading-none mt-0.5">{tx.admissionNo}</span>
                            </div>
                          </td>
                          <td className="py-3 text-text-secondary text-[10px]">{tx.className}</td>
                          <td className="py-3 font-mono text-text-secondary font-semibold text-[10px]">
                            {tx.id}
                            {tx.utr && <span className="ml-2 text-[8px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-sans font-semibold border border-border">UTR: {tx.utr}</span>}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase border rounded ${
                              tx.type === 'HOSTEL' 
                                ? 'bg-purple-500/10 border-purple-500/25 text-purple-500' 
                                : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-500'
                            }`}>
                              {tx.type === 'HOSTEL' ? '🏠 Hostel' : '⚡ Fee'}
                            </span>
                          </td>
                          <td className="py-3 text-text-secondary font-medium">
                            <span className="inline-flex items-center gap-1">
                              {tx.isOnline ? (
                                <Globe size={11} className="text-accent" />
                              ) : (
                                <Landmark size={11} className="text-success" />
                              )}
                              <span>{tx.method}</span>
                            </span>
                          </td>
                          <td className="py-3 text-text-secondary text-[10px]">{tx.date}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase border rounded ${
                              isVerificationPending
                                ? 'bg-warning/15 border-warning/35 text-warning'
                                : 'bg-success/15 border-success/35 text-success'
                            }`}>
                              {isVerificationPending ? 'Pending' : 'Cleared'}
                            </span>
                          </td>
                          <td className="py-3 text-right pr-2 font-mono font-black text-text-primary">
                            <div>
                              <span>₹{tx.amount.toLocaleString('en-IN')}</span>
                              {tx.discount > 0 && (
                                <span className="block text-[8px] text-amber-600 font-bold leading-none mt-0.5">
                                  Disc: ₹{tx.discount.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredTxns.length === 0 && (
                <p className="text-center py-8 text-xs text-text-secondary italic">No transaction records match the filters.</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ===== COLLECT FEE MODAL (with quick search + class filter) ===== */}
      <Modal
        open={showCollectModal}
        onClose={() => { setShowCollectModal(false); setSelectedStudentId(null); setPaymentAmount(''); setDiscountAmount(''); }}
        title="Collect Fee Payment"
        icon={<CreditCard size={16} />}
        size="lg"
      >
        <div className="space-y-5">
          {/* Step 1: Search + Select Student */}
          {!selectedStudentId ? (
            <div className="space-y-4">
              <p className="text-[11px] text-text-secondary">Search for a student with pending dues to collect payment.</p>

              {/* Quick Search + Class Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                  <input
                    type="text"
                    placeholder="Name, Admission No..."
                    value={collectSearch}
                    onChange={e => setCollectSearch(e.target.value)}
                    autoFocus
                    className="w-full text-xs pl-10 py-3 bg-bg-sidebar border border-border rounded-xl outline-none focus:border-accent/40 text-text-primary placeholder:text-text-secondary"
                  />
                </div>
                <select
                  value={collectClassFilter}
                  onChange={e => setCollectClassFilter(e.target.value)}
                  className="text-xs bg-bg-main text-text-primary py-3 px-4 rounded-xl border border-border"
                >
                  <option value="all">All Classes</option>
                  {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Student list with dues */}
              <div className="space-y-2 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                {collectFilteredStudents.map(s => {
                  const fee = sharedFeeRecords[s.id] || {};
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStudentId(s.id); setPaymentAmount(fee.remaining || ''); }}
                      className="w-full p-4 bg-bg-main border border-border hover:border-accent/40 hover:bg-accent/5 rounded-2xl flex items-center justify-between gap-4 text-left transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black shrink-0">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">{s.first_name} {s.last_name}</p>
                          <p className="text-[9px] text-text-secondary">{getClassName(s.class_id)} &bull; {s.admission_no}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-black text-warning font-mono">Due: ₹{(fee.remaining || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-success font-mono">Paid: ₹{(fee.paid || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </button>
                  );
                })}
                {collectFilteredStudents.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 size={28} className="text-success/40 mx-auto mb-2" />
                    <p className="text-xs text-text-secondary">{collectSearch || collectClassFilter !== 'all' ? 'No matching students with dues found.' : 'All fees are settled! No pending dues.'}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (() => {
            /* Step 2: Record Payment */
            const stud = sharedStudents.find(s => s.id === selectedStudentId);
            const fee = sharedFeeRecords[selectedStudentId] || {};
            const pendingHostelAllocations = (sharedHostelInventoryAllocations || [])
              .filter(a => a.studentId === selectedStudentId && a.tenant_id === activeTenant.id && a.status !== 'PAID');
            const totalPendingHostelInv = pendingHostelAllocations.reduce((sum, a) => sum + (a.cost - (a.paid || 0)), 0);

            return (
              <div className="space-y-4">
                {/* Student context chip */}
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-accent text-[11px] font-black">
                      {stud?.first_name[0]}{stud?.last_name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">{stud?.first_name} {stud?.last_name}</p>
                      <p className="text-[9px] text-text-secondary">{getClassName(stud?.class_id)} &bull; {stud?.admission_no}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedStudentId(null); setPaymentAmount(''); setPaymentType('tuition'); }} className="text-[10px] text-text-secondary hover:text-accent font-bold underline">
                    Change
                  </button>
                </div>

                {/* Target switcher (Academic Fee vs Hostel Inventory) */}
                {pendingHostelAllocations.length > 0 && (
                  <div className="flex p-1 bg-slate-100 dark:bg-black/15 border border-border rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('tuition');
                        setPaymentAmount(fee.remaining || '');
                      }}
                      disabled={fee.remaining === 0}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all uppercase ${
                        paymentType === 'tuition'
                          ? 'bg-white dark:bg-bg-sidebar text-text-primary shadow-sm border border-border/40'
                          : 'text-text-secondary hover:text-text-primary disabled:opacity-50'
                      }`}
                    >
                      ⚡ Academic Fees (Due: ₹{(fee.remaining || 0).toLocaleString('en-IN')})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('hostel_inventory');
                        const firstAlloc = pendingHostelAllocations[0];
                        if (firstAlloc) {
                          setSelectedInventoryAllocId(firstAlloc.id);
                          setPaymentAmount(firstAlloc.cost - (firstAlloc.paid || 0));
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all uppercase ${
                        paymentType === 'hostel_inventory'
                          ? 'bg-white dark:bg-bg-sidebar text-text-primary shadow-sm border border-border/40'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      🏠 Hostel Inventory (Due: ₹{totalPendingHostelInv.toLocaleString('en-IN')})
                    </button>
                  </div>
                )}

                {paymentType === 'tuition' ? (
                  /* Fee summary */
                  <div className="grid grid-cols-3 gap-2 text-center animate-slide-up">
                    {[
                      { label: 'Total Fee', val: `₹${(fee.total || 0).toLocaleString('en-IN')}`, color: 'text-text-primary' },
                      { label: 'Already Paid', val: `₹${(fee.paid || 0).toLocaleString('en-IN')}`, color: 'text-success' },
                      { label: 'Outstanding', val: `₹${(fee.remaining || 0).toLocaleString('en-IN')}`, color: 'text-warning' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 bg-bg-main border border-border rounded-xl">
                        <p className="text-[9px] text-text-secondary uppercase tracking-widest">{item.label}</p>
                        <p className={`text-xs font-black font-mono mt-1 ${item.color}`}>{item.val}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Hostel Inventory selection and details */
                  <div className="space-y-3.5 animate-slide-up">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Pending Inventory Item *</label>
                      <select
                        value={selectedInventoryAllocId}
                        onChange={e => {
                          setSelectedInventoryAllocId(e.target.value);
                          const alloc = pendingHostelAllocations.find(a => a.id === e.target.value);
                          if (alloc) {
                            setPaymentAmount(alloc.cost - (alloc.paid || 0));
                          }
                        }}
                        className="w-full text-xs bg-bg-sidebar text-text-primary py-2.5 px-3 rounded-xl border border-border outline-none focus:border-accent"
                      >
                        {pendingHostelAllocations.map(a => (
                          <option key={a.id} value={a.id}>{a.item} (Total: ₹{a.cost}, Pending: ₹{a.cost - (a.paid || 0)})</option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const selectedAlloc = pendingHostelAllocations.find(a => a.id === selectedInventoryAllocId);
                      if (!selectedAlloc) return null;
                      const outstanding = selectedAlloc.cost - (selectedAlloc.paid || 0);
                      return (
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            { label: 'Item Cost', val: `₹${selectedAlloc.cost.toLocaleString('en-IN')}`, color: 'text-text-primary' },
                            { label: 'Paid So Far', val: `₹${(selectedAlloc.paid || 0).toLocaleString('en-IN')}`, color: 'text-success' },
                            { label: 'Remaining Due', val: `₹${outstanding.toLocaleString('en-IN')}`, color: 'text-warning' },
                          ].map((item, i) => (
                            <div key={i} className="p-3 bg-bg-main border border-border rounded-xl">
                              <p className="text-[9px] text-text-secondary uppercase tracking-widest">{item.label}</p>
                              <p className={`text-xs font-black font-mono mt-1 ${item.color}`}>{item.val}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <form onSubmit={handleCollectPayment} className="space-y-3">
                  <div className={`grid grid-cols-1 ${paymentType === 'tuition' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Amount to Collect (₹) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 5000"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full text-xs font-mono"
                        max={(() => {
                          if (paymentType === 'hostel_inventory') {
                            const alloc = pendingHostelAllocations.find(a => a.id === selectedInventoryAllocId);
                            return alloc ? (alloc.cost - (alloc.paid || 0)) : 0;
                          }
                          return fee.remaining || 0;
                        })()}
                        min={1}
                        required
                        autoFocus
                      />
                    </div>
                    {paymentType === 'tuition' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Discount (Optional) (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 1000"
                          value={discountAmount}
                          onChange={e => setDiscountAmount(e.target.value)}
                          className="w-full text-xs font-mono text-amber-600 font-bold"
                          max={Math.max(0, (fee.remaining || 0) - Number(paymentAmount || 0))}
                          min={0}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Payment Method *</label>
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
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

                  {/* Notification recipients */}
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1.5">
                    <p className="text-[9px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1"><Bell size={10} /> Notifications will be sent to</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { icon: Building2, label: 'School Admin' },
                        { icon: User, label: `Student: ${stud?.first_name}` },
                        { icon: User, label: 'Parent / Guardian' },
                      ].map((r, i) => (
                        <span key={i} className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-white border border-blue-200 px-2 py-1 rounded-lg">
                          <r.icon size={9} />{r.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-success hover:bg-success/90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Receipt size={14} />
                    <span>Collect & Generate Receipt</span>
                  </button>
                </form>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* ===== RECEIPT MODAL ===== */}
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
        {lastReceipt && (
          <div className="space-y-4">

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
                    {lastReceipt.schoolLogo ? (
                      <img src={lastReceipt.schoolLogo} alt="logo" className="w-16 h-16 rounded-xl object-cover bg-white" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white text-2xl font-black">
                        {lastReceipt.schoolName[0]}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-black leading-tight">{lastReceipt.schoolName}</h2>
                      {lastReceipt.schoolAffiliation && (
                        <p className="text-white/70 text-[10px] mt-0.5 font-medium">{lastReceipt.schoolAffiliation}</p>
                      )}
                      {lastReceipt.schoolEstYear && (
                        <p className="text-white/50 text-[9px] mt-0.5">Est. {lastReceipt.schoolEstYear}</p>
                      )}
                    </div>
                  </div>
                  {/* Receipt label */}
                  <div className="text-right shrink-0">
                    <p className="text-white/50 text-[9px] uppercase tracking-widest font-black">Official Receipt</p>
                    <p className="text-white font-mono font-black text-sm mt-0.5">{lastReceipt.id}</p>
                    <p className="text-white/60 text-[10px] mt-0.5">{lastReceipt.dateDisplay} {lastReceipt.time}</p>
                  </div>
                </div>
              </div>

              {/* ── Institution Contact Strip ── */}
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-2.5 flex flex-wrap gap-x-6 gap-y-1">
                {lastReceipt.schoolAddress && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {lastReceipt.schoolAddress}
                  </span>
                )}
                {lastReceipt.schoolPhone && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.42 2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16z"/></svg>
                    {lastReceipt.schoolPhone}
                  </span>
                )}
                {lastReceipt.schoolEmail && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {lastReceipt.schoolEmail}
                  </span>
                )}
                {lastReceipt.schoolSubdomain && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    {lastReceipt.schoolSubdomain}.campus.in
                  </span>
                )}
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* ── Student Details Row ── */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Student Information</p>
                    {[
                      { label: 'Student Name', val: lastReceipt.studentName },
                      { label: 'Admission No.', val: lastReceipt.admissionNo },
                      { label: 'Class / Section', val: lastReceipt.className },
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
                      { label: 'Receipt No.', val: lastReceipt.id },
                      { label: 'Payment Date', val: lastReceipt.dateDisplay },
                      { label: 'Payment Mode', val: lastReceipt.method },
                      { label: 'Collected By', val: lastReceipt.collectedBy },
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
                      {(lastReceipt.feeBreakdown || []).map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="py-2 px-3 text-slate-400 font-mono">{String(i + 1).padStart(2, '0')}</td>
                          <td className="py-2 px-3 text-slate-700 font-medium">{row.label}</td>
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px] uppercase">{row.code}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">₹{row.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                      {(!lastReceipt.feeBreakdown || lastReceipt.feeBreakdown.length === 0) && (
                        <tr className="bg-slate-50">
                          <td colSpan={4} className="py-3 px-3 text-center text-slate-400 text-[10px]">Fee structure details not available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                    {(() => {
                      const rows = [
                        { label: 'Total Fee', val: lastReceipt.totalFee, color: 'text-slate-700', bg: 'bg-white' }
                      ];
                      if (lastReceipt.discount > 0) {
                        rows.push({ label: 'Discount Applied Now', val: lastReceipt.discount, color: 'text-amber-600', bg: 'bg-amber-50', bold: true });
                      }
                      rows.push(
                        { label: 'Previously Paid', val: lastReceipt.newPaid - lastReceipt.amount, color: 'text-slate-500', bg: 'bg-slate-50' },
                        { label: 'Amount Paid Now', val: lastReceipt.amount, color: 'text-emerald-600', bg: 'bg-emerald-50', bold: true },
                        { label: 'Balance Remaining', val: lastReceipt.newRemaining, color: lastReceipt.newRemaining > 0 ? 'text-amber-600' : 'text-emerald-600', bg: 'bg-white', bold: true }
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
                  <span className="text-[10px] text-slate-700 font-medium italic">Rupees {numberToWords(lastReceipt.amount)} Only</span>
                </div>



                {/* ── Signature Section ── */}
                <div className="grid grid-cols-3 gap-6 pt-4">
                  {[
                    { label: 'Student / Parent Signature', sub: 'Received by' },
                    { label: 'Cashier / Accountant', sub: lastReceipt.collectedBy },
                    { label: 'Principal / Authorised Signatory', sub: lastReceipt.schoolName },
                  ].map((sig, i) => (
                    <div key={i} className="text-center space-y-2">
                      <div className="h-14 border-b-2 border-slate-300 border-dashed flex items-end justify-center pb-1 relative">
                        {sig.label === 'Cashier / Accountant' && includeDigitalSignature && (
                          <span className="text-2xl text-blue-600 font-bold select-none transform -rotate-2 tracking-wide font-signature block" style={{ fontFamily: 'var(--font-caveat), cursive' }}>
                            {sig.sub}
                          </span>
                        )}
                        {sig.label === 'Principal / Authorised Signatory' && (
                          <span className="text-xl text-slate-700 font-bold select-none absolute bottom-1 font-signature opacity-80" style={{ fontFamily: 'var(--font-caveat), cursive' }}>
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
                    lastReceipt.newStatus === 'PAID' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : lastReceipt.newStatus === 'PARTIAL'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      lastReceipt.newStatus === 'PAID' ? 'bg-emerald-500' : lastReceipt.newStatus === 'PARTIAL' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    Account Status: {lastReceipt.newStatus}
                  </div>
                  <p className="text-[8px] text-slate-300 italic">This is a computer-generated receipt. No physical signature required.</p>
                </div>
              </div>
            </div>

            {/* Notification banner */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between flex-wrap gap-2 no-print">
              <div className="flex items-center gap-1.5">
                <Bell size={12} className="text-blue-500" />
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Notifications Dispatched</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['School Admin', `Student: ${lastReceipt.studentName.split(' ')[0]}`, 'Parent / Guardian'].map((r, i) => (
                  <span key={i} className="flex items-center gap-1 text-[9px] font-bold text-success bg-success/10 border border-success/20 px-2 py-1 rounded-lg">
                    <CheckCircle2 size={9} />{r}
                  </span>
                ))}
              </div>
            </div>

            {/* Digital Signature Toggle */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl no-print">
              <input
                id="toggle-digital-sig"
                type="checkbox"
                checked={includeDigitalSignature}
                onChange={(e) => setIncludeDigitalSignature(e.target.checked)}
                className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent accent-accent"
              />
              <label htmlFor="toggle-digital-sig" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                Include Cashier / Accountant Digital Signature (Uncheck to sign physically with pen)
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
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

      {/* Receipt Screenshot Viewer Modal */}
      <Modal
        open={!!viewingReceiptScreenshot}
        onClose={() => setViewingReceiptScreenshot(null)}
        title="Payment Receipt Screenshot"
        icon={<Eye size={16} />}
        size="md"
      >
        {viewingReceiptScreenshot && (
          <div className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto border border-border rounded-2xl bg-black flex items-center justify-center p-2">
              <img src={viewingReceiptScreenshot} alt="Payment Receipt Screenshot" className="max-w-full h-auto object-contain rounded-lg animate-fade-in" />
            </div>
            <button
              onClick={() => setViewingReceiptScreenshot(null)}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all"
            >
              Close Preview
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
