'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState, useEffect } from 'react';
import { 
  Building2, Home, Bed, UserCheck, CheckCircle2, ShieldCheck, 
  Plus, Search, ArrowRight, Trash2, Calendar, ClipboardList, Package,
  DollarSign, CreditCard, Receipt, Clock, X, User, BellRing
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

export default function HostelManagementPage() {
  const {
    activeTenant, 
    sharedStudents, 
    sharedHostelBlocks,
    sharedHostelInventoryAllocations,
    setSharedHostelInventoryAllocations,
    sharedParents,
    activeRole,
    activeUser,
    sharedClasses
  } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'hostels' | 'rooms' | 'allotments' | 'inventory'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals Visibility
  const [showHostelForm, setShowHostelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showAllotmentForm, setShowAllotmentForm] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  
  // Student-specific Dossier selection
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Collect Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    allocationId: '',
    amount: '',
    method: 'Razorpay UPI'
  });

  // Local hostel records (synced with tenant context)
  const [hostels, setHostels] = useState([
    { id: 'hostel-1', name: 'Tagore Hostel - Block A', type: 'BOYS', warden: 'Suresh Chandra', capacity: 120, tenant_id: 'demo-tenant-1' },
    { id: 'hostel-2', name: 'Nehru Girls Hostel - Block B', type: 'GIRLS', warden: 'Sunita Sharma', capacity: 100, tenant_id: 'demo-tenant-1' },
    { id: 'hostel-3', name: 'Sarojini Girls Hostel - Block C', type: 'GIRLS', warden: 'Preeti Deshmukh', capacity: 80, tenant_id: 'demo-tenant-1' }
  ]);

  const [rooms, setRooms] = useState([
    { id: 'room-1', hostelId: 'hostel-1', number: '101', type: 'Double Sharing', beds: 2, occupied: 2, tenant_id: 'demo-tenant-1' },
    { id: 'room-2', hostelId: 'hostel-1', number: '102', type: 'Double Sharing', beds: 2, occupied: 1, tenant_id: 'demo-tenant-1' },
    { id: 'room-3', hostelId: 'hostel-2', number: '201', type: 'Triple Sharing', beds: 3, occupied: 3, tenant_id: 'demo-tenant-1' },
    { id: 'room-4', hostelId: 'hostel-2', number: '202', type: 'Double Sharing', beds: 2, occupied: 0, tenant_id: 'demo-tenant-1' },
    { id: 'room-5', hostelId: 'hostel-3', number: '301', type: 'Single Room', beds: 1, occupied: 1, tenant_id: 'demo-tenant-1' }
  ]);

  const [allotments, setAllotments] = useState([
    { id: 'allot-1', studentId: 'stud-1', hostelId: 'hostel-1', roomNumber: '101', bedNo: 'A', date: '2026-05-01', status: 'Checked In', tenant_id: 'demo-tenant-1' },
    { id: 'allot-2', studentId: 'stud-2', hostelId: 'hostel-2', roomNumber: '201', bedNo: 'B', date: '2026-05-05', status: 'Checked In', tenant_id: 'demo-tenant-1' }
  ]);

  // Predefined equipment catalog
  const inventoryItems = [
    { name: 'Mattress', price: 1500 },
    { name: 'Study Desk Lamp', price: 450 },
    { name: 'Steel Bucket & Mug', price: 300 },
    { name: 'Woolen Blanket', price: 800 },
    { name: 'Room Locker Key', price: 150 },
    { name: 'Standard Uniform Kit', price: 2500 },
    { name: 'Waterproof Laundry Bag', price: 200 }
  ];

  // Form states
  const [newHostel, setNewHostel] = useState({ name: '', type: 'BOYS', warden: '', capacity: 100 });
  const [newRoom, setNewRoom] = useState({ hostelId: '', number: '', type: 'Double Sharing', beds: 2 });
  const [newAllotment, setNewAllotment] = useState({ studentId: '', hostelId: '', roomNumber: '', bedNo: 'A', date: new Date().toISOString().split('T')[0] });
  const [newIssue, setNewIssue] = useState({ studentId: '', date: new Date().toISOString().split('T')[0], items: [{ name: '', quantity: 1, price: '' }] });
  const [issueClassFilter, setIssueClassFilter] = useState('');

  // Resolve student ID for student role
  const myStudentProfile = React.useMemo(() => {
    return sharedStudents.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
  }, [sharedStudents, activeTenant.id, activeUser]);
  const myStudentId = myStudentProfile ? myStudentProfile.id : '';

  // Auto set selectedStudentId for student role
  React.useEffect(() => {
    if (activeRole === 'STUDENT' && myStudentId) {
      setSelectedStudentId(myStudentId);
    }
  }, [activeRole, myStudentId]);

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_WARDEN', 'STUDENT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Hostels & Boarding" />;
  }

  // Multi-tenant isolation filters
  const tenantHostels = hostels.filter(h => h.tenant_id === activeTenant.id);
  const tenantRooms = rooms.filter(r => r.tenant_id === activeTenant.id);
  const tenantAllotments = allotments.filter(a => {
    if (a.tenant_id !== activeTenant.id) return false;
    if (activeRole === 'STUDENT') return a.studentId === myStudentId;
    return true;
  });
  const tenantStudents = sharedStudents.filter(s => s.tenant_id === activeTenant.id);
  const tenantAllocations = sharedHostelInventoryAllocations.filter(a => {
    if (a.tenant_id !== activeTenant.id) return false;
    if (activeRole === 'STUDENT') return a.studentId === myStudentId;
    return true;
  });

  // Dynamic calculations
  const totalHostels = tenantHostels.length;
  const totalCapacity = tenantRooms.reduce((acc, curr) => acc + curr.beds, 0);
  const occupiedBeds = tenantRooms.reduce((acc, curr) => acc + curr.occupied, 0);
  const availableBeds = totalCapacity - occupiedBeds;

  const getHostelName = (hostelId) => {
    const h = tenantHostels.find(x => x.id === hostelId);
    return h ? h.name : 'Unknown Hostel';
  };

  const getStudentName = (studentId) => {
    const s = tenantStudents.find(x => x.id === studentId);
    return s ? `${s.first_name} ${s.last_name}` : 'Unknown Student';
  };

  const getStudentDetails = (studentId) => {
    const s = tenantStudents.find(x => x.id === studentId);
    return s ? s : null;
  };

  // Add Hostel Handler
  const handleAddHostel = (e) => {
    e.preventDefault();
    if (!newHostel.name || !newHostel.warden) {
      toast.error('Hostel Name and Warden details are required.');
      return;
    }
    const created = {
      id: `hostel-${Date.now()}`,
      name: newHostel.name,
      type: newHostel.type,
      warden: newHostel.warden,
      capacity: Number(newHostel.capacity),
      tenant_id: activeTenant.id
    };
    setHostels([...hostels, created]);
    toast.success(`Hostel Block "${newHostel.name}" registered successfully!`);
    setNewHostel({ name: '', type: 'BOYS', warden: '', capacity: 100 });
    setShowHostelForm(false);
  };

  // Add Room Handler
  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoom.hostelId || !newRoom.number) {
      toast.error('Hostel block choice and Room Number are required.');
      return;
    }
    const created = {
      id: `room-${Date.now()}`,
      hostelId: newRoom.hostelId,
      number: newRoom.number,
      type: newRoom.type,
      beds: Number(newRoom.beds),
      occupied: 0,
      tenant_id: activeTenant.id
    };
    setRooms([...rooms, created]);
    toast.success(`Room ${newRoom.number} registered under ${getHostelName(newRoom.hostelId)}!`);
    setNewRoom({ hostelId: '', number: '', type: 'Double Sharing', beds: 2 });
    setShowRoomForm(false);
  };

  // Add Allotment Handler
  const handleAddAllotment = (e) => {
    e.preventDefault();
    if (!newAllotment.studentId || !newAllotment.hostelId || !newAllotment.roomNumber) {
      toast.error('All fields are required to process a room allotment.');
      return;
    }

    // Check room capacity
    const roomIndex = rooms.findIndex(r => r.hostelId === newAllotment.hostelId && r.number === newAllotment.roomNumber && r.tenant_id === activeTenant.id);
    if (roomIndex === -1) {
      toast.error('Specified room does not exist in selected hostel block.');
      return;
    }
    const roomObj = rooms[roomIndex];
    if (roomObj.occupied >= roomObj.beds) {
      toast.error(`Room ${roomObj.number} is fully occupied! No available beds.`);
      return;
    }

    // Process room occupancy increase
    const updatedRooms = [...rooms];
    updatedRooms[roomIndex] = {
      ...roomObj,
      occupied: roomObj.occupied + 1
    };
    setRooms(updatedRooms);

    const created = {
      id: `allot-${Date.now()}`,
      studentId: newAllotment.studentId,
      hostelId: newAllotment.hostelId,
      roomNumber: newAllotment.roomNumber,
      bedNo: newAllotment.bedNo,
      date: newAllotment.date,
      status: 'Checked In',
      tenant_id: activeTenant.id
    };

    setAllotments([created, ...allotments]);
    toast.success(`Room ${newAllotment.roomNumber} (Bed ${newAllotment.bedNo}) allotted to student ${getStudentName(newAllotment.studentId)} successfully!`);
    setNewAllotment({ studentId: '', hostelId: '', roomNumber: '', bedNo: 'A', date: new Date().toISOString().split('T')[0] });
    setShowAllotmentForm(false);
  };

  // Issue Item to Student Handler
  const handleIssueItem = (e) => {
    e.preventDefault();
    if (!newIssue.studentId) {
      toast.error('Please select a student.');
      return;
    }
    
    // Filter out empty items
    const validItems = newIssue.items.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please add at least one item with a valid name.');
      return;
    }

    // Validate prices and quantities
    for (const item of validItems) {
      const qty = Number(item.quantity);
      const price = Number(item.price);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Invalid quantity for item "${item.name}".`);
        return;
      }
      if (isNaN(price) || price < 0) {
        toast.error(`Invalid price for item "${item.name}".`);
        return;
      }
    }

    const newAllocations = validItems.map((item, i) => {
      const qty = Number(item.quantity);
      const price = Number(item.price);
      const totalCost = qty * price;
      
      return {
        id: `all-inv-${Date.now()}-${i}`,
        studentId: newIssue.studentId,
        item: qty > 1 ? `${item.name} (x${qty})` : item.name,
        cost: totalCost,
        paid: 0,
        status: 'UNPAID',
        date: newIssue.date || new Date().toISOString().split('T')[0],
        tenant_id: activeTenant.id,
        payments: []
      };
    });

    setSharedHostelInventoryAllocations([...sharedHostelInventoryAllocations, ...newAllocations]);
    toast.success(`Issued ${newAllocations.length} item(s) to ${getStudentName(newIssue.studentId)} successfully!`);
    setShowIssueModal(false);
    setSelectedStudentId(newIssue.studentId); // open student dossier card
  };

  // Record Allocation Payment
  const handleRecordPayment = (e) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!paymentForm.allocationId || isNaN(amount) || amount <= 0) {
      toast.error('Please select an item and enter a valid payment amount.');
      return;
    }

    const idx = sharedHostelInventoryAllocations.findIndex(a => a.id === paymentForm.allocationId);
    if (idx === -1) return;

    const allocation = sharedHostelInventoryAllocations[idx];
    const outstanding = allocation.cost - allocation.paid;

    if (amount > outstanding) {
      toast.error(`Payment amount exceeds outstanding balance of ₹${outstanding}`);
      return;
    }

    const updatedAllocations = [...sharedHostelInventoryAllocations];
    const newPaid = allocation.paid + amount;
    const newStatus = newPaid === allocation.cost ? 'PAID' : 'PARTIAL';
    const txId = `tx-h${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment = {
      id: txId,
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      method: paymentForm.method
    };

    updatedAllocations[idx] = {
      ...allocation,
      paid: newPaid,
      status: newStatus,
      payments: [...(allocation.payments || []), newPayment]
    };

    setSharedHostelInventoryAllocations(updatedAllocations);
    toast.success(`Recorded payment of ₹${amount} successfully! Receipt: #${txId}`);
    setPaymentForm({ allocationId: '', amount: '', method: 'Razorpay UPI' });
  };

  // Send inventory dues reminder to student/parent
  const handleSendInventoryReminder = (studentId) => {
    const studentName = getStudentName(studentId);
    const student = tenantStudents.find(s => s.id === studentId);
    const parent = student ? sharedParents.find(p => p.id === student.parent_id) : null;
    const studentAllocations = tenantAllocations.filter(a => a.studentId === studentId && a.status !== 'PAID');
    const totalDues = studentAllocations.reduce((sum, a) => sum + (a.cost - a.paid), 0);

    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: `Sending inventory dues reminder to ${studentName}'s parent...`,
        success: `Inventory dues reminder (₹${totalDues.toLocaleString('en-IN')}) sent to ${parent ? parent.first_name : 'guardian'} for ${studentName}!`,
        error: 'Failed to send reminder'
      }
    );
  };

  // Bulk send reminders for all students with outstanding inventory dues
  const handleBulkInventoryReminders = () => {
    const studentsWithDues = [...new Set(
      tenantAllocations
        .filter(a => a.status !== 'PAID')
        .map(a => a.studentId)
    )];
    if (studentsWithDues.length === 0) {
      toast.info('No outstanding inventory dues. All accounts are settled!');
      return;
    }
    studentsWithDues.forEach((studentId, i) => {
      setTimeout(() => handleSendInventoryReminder(studentId), i * 400);
    });
    toast.success(`Dispatching reminders to ${studentsWithDues.length} student(s) with pending inventory dues...`);
  };

  // Filter students who are in the inventory desk search query
  const searchedInventoryStudents = tenantStudents.filter(s => {
    const term = searchQuery.toLowerCase();
    const matchesQuery = `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) || s.admission_no.toLowerCase().includes(term);
    
    // Check if the student has a room allotment to isolate to hostel residents
    const isHostelResident = tenantAllotments.some(a => a.studentId === s.id);
    return matchesQuery && (isHostelResident || searchQuery.length > 0);
  });

  if (activeRole === 'STUDENT') {
    // Resolve student allotment
    const myAllotment = allotments.find(a => a.studentId === myStudentId && a.tenant_id === activeTenant.id);
    const myAllocations = sharedHostelInventoryAllocations.filter(a => a.studentId === myStudentId && a.tenant_id === activeTenant.id);
    
    // Sums
    const totalCharges = myAllocations.reduce((acc, c) => acc + c.cost, 0);
    const totalSettled = myAllocations.reduce((acc, c) => acc + c.paid, 0);
    const outstanding = totalCharges - totalSettled;

    return (
      <div className="space-y-8 animate-slide-up pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">My Hostel Desk</h2>
            <p className="text-text-secondary text-sm font-medium mt-1">
              View your room assignment details, issued equipment, and billing status.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-success bg-success/5 border border-success/20 px-3.5 py-2.5 rounded-xl uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Hostel Ledger Secured</span>
          </div>
        </div>

        {/* Room Assignment Section */}
        <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2.5rem] space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Home size={16} className="text-accent" />
            <span>My Room Assignment</span>
          </h3>
          {myAllotment ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase font-black block">Hostel Block</span>
                <span className="font-bold text-text-primary text-sm mt-1 block">{getHostelName(myAllotment.hostelId)}</span>
              </div>
              <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase font-black block">Room Number</span>
                <span className="font-bold text-text-primary text-sm mt-1 block">Room {myAllotment.roomNumber}</span>
              </div>
              <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase font-black block">Bed Number</span>
                <span className="font-bold text-text-primary text-sm mt-1 block">Bed {myAllotment.bedNo}</span>
              </div>
              <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase font-black block">Allotment Date</span>
                <span className="font-bold text-text-primary font-mono text-sm mt-1 block">{myAllotment.date}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-secondary italic py-4 text-center border border-dashed border-border rounded-xl">
              No hostel room is currently allotted to you. Please contact the campus warden office for booking assistance.
            </p>
          )}
        </div>

        {/* Inventory Dossier Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Issued Items Table */}
          <div className="lg:col-span-2 p-6 bg-bg-sidebar border border-border rounded-[2.5rem] space-y-6">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Package size={16} className="text-accent" />
              <span>Issued Equipment Ledger</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-bg-main/50 border border-border rounded-2xl">
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest block">Total Cost</span>
                <span className="text-sm font-black font-mono text-text-primary mt-1 block">₹{totalCharges.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 bg-bg-main/50 border border-border rounded-2xl">
                <span className="text-[8px] font-black text-success uppercase tracking-widest block">Total Settled</span>
                <span className="text-sm font-black font-mono text-success mt-1 block">₹{totalSettled.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 bg-bg-main/50 border border-border rounded-2xl">
                <span className="text-[8px] font-black text-warning uppercase tracking-widest block">Outstanding</span>
                <span className="text-sm font-black font-mono text-warning mt-1 block">₹{outstanding.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-border rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                    <th className="p-3 pl-4">Item Name</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3 font-mono">Cost</th>
                    <th className="p-3 font-mono">Paid</th>
                    <th className="p-3 text-right pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myAllocations.map(alloc => (
                    <tr key={alloc.id} className="hover:bg-slate-50/50">
                      <td className="p-3 pl-4 font-bold text-text-primary flex items-center gap-1.5">
                        <Package size={12} className="text-accent" />
                        {alloc.item}
                      </td>
                      <td className="p-3 text-text-secondary font-medium font-mono">{alloc.date}</td>
                      <td className="p-3 font-mono text-slate-700 font-semibold">₹{alloc.cost}</td>
                      <td className="p-3 font-mono text-success">₹{alloc.paid}</td>
                      <td className="p-3 text-right pr-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          alloc.status === 'PAID' 
                            ? 'bg-success/15 border border-success/35 text-success'
                            : alloc.status === 'PARTIAL'
                            ? 'bg-warning/15 border border-warning/35 text-warning'
                            : 'bg-danger/15 border border-danger/35 text-danger'
                        }`}>
                          {alloc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {myAllocations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-xs text-text-secondary italic">
                        No equipment items issued to your profile.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Payment Receipts History */}
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2.5rem] space-y-4">
            <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Receipt size={14} className="text-accent" />
              <span>Settlement Receipts</span>
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {myAllocations
                .flatMap(a => (a.payments || []).map(p => ({ ...p, item: a.item })))
                .map((pay, i) => (
                  <div key={i} className="p-3.5 bg-bg-main border border-border rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-mono font-bold text-text-primary">Receipt: #{pay.id}</p>
                      <span className="text-[9px] text-text-secondary">{pay.item} • {pay.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-success block">₹{pay.amount}</span>
                      <span className="text-[8px] bg-success/10 text-success font-black px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">Settled</span>
                    </div>
                  </div>
                ))
              }
              {myAllocations.flatMap(a => a.payments || []).length === 0 && (
                <p className="text-center py-6 text-xs text-text-secondary/70 italic border border-dashed border-border rounded-xl">
                  No payment transactions logged yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up pb-12">
      {/* Header with Dynamic Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Hostel Management</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Manage hostel buildings, rooms, and student allotments.
          </p>
        </div>
        
        {activeTab !== 'overview' && activeRole !== 'STUDENT' && (
          <button 
            onClick={() => {
              if (activeTab === 'hostels') setShowHostelForm(true);
              if (activeTab === 'rooms') setShowRoomForm(true);
              if (activeTab === 'allotments') setShowAllotmentForm(true);
              if (activeTab === 'inventory') {
                setNewIssue({ 
                  studentId: selectedStudentId || (tenantStudents[0]?.id || ''), 
                  date: new Date().toISOString().split('T')[0], 
                  items: [{ name: '', quantity: 1, price: '' }] 
                });
                setShowIssueModal(true);
              }
            }}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
          >
            <Plus size={14} />
            <span>
              {activeTab === 'hostels' && 'Add Hostel'}
              {activeTab === 'rooms' && 'Add Room'}
              {activeTab === 'allotments' && 'New Allotment'}
              {activeTab === 'inventory' && 'Issue Item'}
            </span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit">
        {(activeRole === 'STUDENT' ? ['overview', 'inventory'] : ['overview', 'hostels', 'rooms', 'allotments', 'inventory']).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSearchQuery('');
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
              activeTab === tab 
                ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stats Overview Panel */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Hostels', value: totalHostels, icon: Building2, desc: 'Registered blocks', color: 'text-accent' },
            { label: 'Total Capacity', value: `${totalCapacity} Beds`, icon: Bed, desc: 'Total beds cataloged', color: 'text-warning' },
            { label: 'Occupied Beds', value: occupiedBeds, icon: UserCheck, desc: 'Beds check-in rosters', color: 'text-success' },
            { label: 'Available Beds', value: availableBeds, icon: CheckCircle2, desc: 'Vacancies left', color: 'text-cyan-400' }
          ].map((k, i) => (
            <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
                <div className={`p-2 bg-accent/10 rounded-xl ${k.color}`}><k.icon size={16} /></div>
              </div>
              <p className="text-3xl font-black font-outfit text-text-primary mt-3">{k.value}</p>
              <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
            </div>
          ))}
        </div>
      )}


      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Allotments */}
          <div className="lg:col-span-2 p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <ClipboardList size={16} className="text-accent" />
              <span>Recent Bed Allotments</span>
            </h3>
            
            <div className="space-y-3">
              {tenantAllotments.map(al => (
                <div key={al.id} className="p-4 bg-bg-card/85 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border rounded-2xl flex justify-between items-center gap-4 hover:border-accent/15 transition-all">
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{getStudentName(al.studentId)}</h4>
                    <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                      Hostel: {getHostelName(al.hostelId)} • Room: {al.roomNumber} • Bed: {al.bedNo}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-success/10 border border-success/30 text-success text-[9px] font-black rounded uppercase">Checked In</span>
                    <p className="text-[8px] text-text-secondary mt-1 font-mono">{al.date}</p>
                  </div>
                </div>
              ))}
              {tenantAllotments.length === 0 && (
                <p className="text-center py-6 text-xs text-text-secondary">No allotments processed yet.</p>
              )}
            </div>
          </div>

          {/* Hostel Occupancy Capacity Ratios */}
          <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
            <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider">Hostel Capacity Status</h3>
            <div className="space-y-4 pt-2">
              {tenantHostels.map(h => {
                const hRooms = tenantRooms.filter(r => r.hostelId === h.id);
                const hCap = hRooms.reduce((acc, curr) => acc + curr.beds, 0);
                const hOcc = hRooms.reduce((acc, curr) => acc + curr.occupied, 0);
                const percentage = hCap > 0 ? Math.round((hOcc / hCap) * 100) : 0;
                
                return (
                  <div key={h.id} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-text-secondary">
                      <span className="font-bold text-text-primary">{h.name}</span>
                      <span className="font-mono">{hOcc} / {hCap} beds ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentage > 85 ? 'bg-danger' : percentage > 50 ? 'bg-warning' : 'bg-success'
                        }`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Hostels */}
      {activeTab === 'hostels' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Block Name</th>
                  <th className="pb-3">Block Gender</th>
                  <th className="pb-3">Warden</th>
                  <th className="pb-3 text-right pr-2">Target Beds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantHostels.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                        <Building2 size={14} />
                      </div>
                      {h.name}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase border rounded ${
                        h.type === 'BOYS' 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                          : h.type === 'GIRLS'
                          ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
                          : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      }`}>
                        {h.type}
                      </span>
                    </td>
                    <td className="py-4 text-text-secondary font-semibold">{h.warden}</td>
                    <td className="py-4 text-right pr-2 font-mono text-text-primary font-bold">{h.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Rooms */}
      {activeTab === 'rooms' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          {/* Capsule headers row styling */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Room No</th>
                  <th className="pb-3">Hostel</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Capacity</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantRooms.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                        <Home size={14} />
                      </div>
                      Room {r.number}
                    </td>
                    <td className="py-4 text-slate-700 font-semibold">{getHostelName(r.hostelId)}</td>
                    <td className="py-4 text-text-secondary font-mono">{r.type}</td>
                    <td className="py-4 font-mono text-text-primary font-bold">{r.occupied} / {r.beds} Occupied</td>
                    <td className="py-4 font-mono">
                      {r.beds - r.occupied > 0 ? (
                        <span className="px-2 py-0.5 bg-success/15 border border-success/35 text-success text-[9px] font-black rounded uppercase">
                          {r.beds - r.occupied} Bed Free
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-danger/15 border border-danger/35 text-danger text-[9px] font-black rounded uppercase">FULL</span>
                      )}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <button className="text-text-secondary hover:text-text-primary transition-all text-[11px] font-bold">
                        Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Allotments */}
      {activeTab === 'allotments' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Student</th>
                  <th className="pb-3">Hostel & Room</th>
                  <th className="pb-3 font-mono">Allotment Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantAllotments.map(al => (
                  <tr key={al.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                        <User size={14} />
                      </div>
                      {getStudentName(al.studentId)}
                    </td>
                    <td className="py-4 text-slate-700 font-semibold">
                      {getHostelName(al.hostelId)} • Room {al.roomNumber} (Bed {al.bedNo})
                    </td>
                    <td className="py-4 font-mono text-text-secondary">{al.date}</td>
                    <td className="py-4">
                      <span className="px-2.5 py-0.5 bg-success/15 border border-success/35 text-success text-[9px] font-black rounded uppercase">
                        {al.status}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <button className="text-danger hover:text-danger-hover hover:underline text-[11px] font-bold">
                        Checkout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Inventory (Dynamic Student-Wise Billing Roster) */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Search + Bulk Reminder Row */}
          {activeRole !== 'STUDENT' && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="max-w-md relative group/search flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedStudentId(null);
                  }}
                  className="w-full bg-slate-100/50 border border-border rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
                />
              </div>
              {tenantAllocations.filter(a => a.status !== 'PAID').length > 0 && (
                <button
                  onClick={handleBulkInventoryReminders}
                  className="px-4 py-2.5 bg-danger hover:bg-danger/80 text-text-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                >
                  <BellRing size={12} />
                  <span>Send Bulk Dues Reminders ({[...new Set(tenantAllocations.filter(a => a.status !== 'PAID').map(a => a.studentId))].length} students)</span>
                </button>
              )}
            </div>
          )}

          {selectedStudentId ? (
            /* Student-wise Card/Dossier Card */
            <div className={`grid grid-cols-1 ${activeRole === 'STUDENT' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-8 animate-slide-up`}>
              
              {/* Left Column: Dossier Ledger */}
              <div className={`${activeRole === 'STUDENT' ? 'lg:col-span-1' : 'lg:col-span-2'} p-6 bg-bg-sidebar/80 border border-border rounded-[2.5rem] space-y-6 relative overflow-hidden shadow-2xl`}>
                <div className="absolute top-0 right-0 p-4">
                  <button 
                    onClick={() => setSelectedStudentId(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-text-secondary hover:text-text-primary transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/15 border border-accent/30 rounded-2xl flex items-center justify-center font-black text-accent text-lg">
                    {getStudentName(selectedStudentId)[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-outfit text-text-primary tracking-tight">{getStudentName(selectedStudentId)}</h3>
                    <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest font-mono">
                      Hostel Equipment Dossier Ledger
                    </p>
                  </div>
                </div>

                {/* Costs Summation Cards */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/50 border border-border rounded-2xl">
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest block">Total Charges</span>
                    <span className="text-base font-black font-mono text-text-primary mt-1 block">
                      ₹{tenantAllocations
                        .filter(a => a.studentId === selectedStudentId)
                        .reduce((acc, c) => acc + c.cost, 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/50 border border-border rounded-2xl">
                    <span className="text-[8px] font-black text-success uppercase tracking-widest block">Total Settled</span>
                    <span className="text-base font-black font-mono text-success mt-1 block">
                      ₹{tenantAllocations
                        .filter(a => a.studentId === selectedStudentId)
                        .reduce((acc, c) => acc + c.paid, 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/50 border border-border rounded-2xl">
                    <span className="text-[8px] font-black text-warning uppercase tracking-widest block">Outstanding</span>
                    <span className="text-base font-black font-mono text-warning mt-1 block">
                      ₹{(
                        tenantAllocations.filter(a => a.studentId === selectedStudentId).reduce((acc, c) => acc + c.cost, 0) -
                        tenantAllocations.filter(a => a.studentId === selectedStudentId).reduce((acc, c) => acc + c.paid, 0)
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Issued Items & Billing</span>
                  <div className="overflow-x-auto border border-border rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest">
                          <th className="p-3 pl-4">Item Name</th>
                          <th className="p-3">Issue Date</th>
                          <th className="p-3 font-mono">Cost</th>
                          <th className="p-3 font-mono">Paid</th>
                          <th className="p-3 text-right pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {tenantAllocations
                          .filter(a => a.studentId === selectedStudentId)
                          .map(alloc => (
                            <tr key={alloc.id} className="hover:bg-slate-50/50">
                              <td className="p-3 pl-4 font-bold text-text-primary flex items-center gap-1.5">
                                <Package size={12} className="text-accent" />
                                {alloc.item}
                              </td>
                              <td className="p-3 text-text-secondary font-medium font-mono">{alloc.date}</td>
                              <td className="p-3 font-mono text-slate-700 font-semibold">₹{alloc.cost}</td>
                              <td className="p-3 font-mono text-success">₹{alloc.paid}</td>
                              <td className="p-3 text-right pr-4">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  alloc.status === 'PAID' 
                                    ? 'bg-success/15 border border-success/35 text-success'
                                    : alloc.status === 'PARTIAL'
                                    ? 'bg-warning/15 border border-warning/35 text-warning'
                                    : 'bg-danger/15 border border-danger/35 text-danger'
                                }`}>
                                  {alloc.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        }
                        {tenantAllocations.filter(a => a.studentId === selectedStudentId).length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-xs text-text-secondary italic">
                              No inventory items issued to this student yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Transaction History Log for Student */}
                <div className="space-y-2 pt-2">
                  <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1 flex items-center gap-1">
                    <Receipt size={11} />
                    <span>Inventory Payment Receipts Log</span>
                  </span>
                  
                  <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                    {tenantAllocations
                      .filter(a => a.studentId === selectedStudentId)
                      .flatMap(a => (a.payments || []).map(p => ({ ...p, item: a.item })))
                      .map((pay, i) => (
                        <div key={i} className="p-3.5 bg-bg-card/85 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border rounded-xl flex justify-between items-center">
                          <div>
                            <p className="text-[11px] font-mono font-bold text-text-primary">Receipt: #{pay.id} • {pay.item}</p>
                            <span className="text-[9px] text-text-secondary font-semibold">Method: {pay.method} • {pay.date}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-success font-mono">₹{pay.amount}</span>
                            <span className="text-[8px] bg-success/15 text-success font-black px-1.5 rounded uppercase ml-2">Settled</span>
                          </div>
                        </div>
                      ))
                    }
                    {tenantAllocations
                      .filter(a => a.studentId === selectedStudentId)
                      .flatMap(a => a.payments || []).length === 0 && (
                        <p className="text-center py-4 text-xs text-text-secondary/70 italic border border-dashed border-border rounded-xl">
                          No transaction history logged.
                        </p>
                    )}
                  </div>
                </div>

              </div>

              {activeRole !== 'STUDENT' && (
                /* Right Column: Settle Payments Form */
                <div className="space-y-6">
                  <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-wider font-outfit text-text-primary flex items-center gap-2">
                      <CreditCard size={15} className="text-accent" />
                      <span>Collect Counter Payment</span>
                    </h3>
                    
                    <form onSubmit={handleRecordPayment} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest ml-1">Choose Outstanding Item *</label>
                        <select
                          value={paymentForm.allocationId}
                          onChange={(e) => {
                            const alloc = tenantAllocations.find(a => a.id === e.target.value);
                            setPaymentForm({
                              ...paymentForm,
                              allocationId: e.target.value,
                              amount: alloc ? (alloc.cost - alloc.paid).toString() : ''
                            });
                          }}
                          className="w-full bg-bg-main text-text-primary border border-border rounded-xl py-2.5 px-3 text-xs cursor-pointer"
                          required
                        >
                          <option value="">Select equipment charges...</option>
                          {tenantAllocations
                            .filter(a => a.studentId === selectedStudentId && a.status !== 'PAID')
                            .map(a => (
                              <option key={a.id} value={a.id}>
                                {a.item} (₹{a.cost - a.paid} outstanding)
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest ml-1">Payment Amount (₹) *</label>
                        <input 
                          type="number"
                          placeholder="e.g. 500"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          className="w-full text-xs font-mono"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest ml-1">Payment Mode *</label>
                        <select
                          value={paymentForm.method}
                          onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                          className="w-full bg-bg-main text-text-primary border border-border rounded-xl py-2.5 px-3 text-xs"
                          required
                        >
                          <option value="Razorpay UPI">Razorpay UPI</option>
                          <option value="Cash Counter">Cash Counter</option>
                          <option value="Net Banking">Net Banking</option>
                          <option value="Demand Draft">Demand Draft (DD)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-success hover:bg-success-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-success/15 active:scale-95 mt-2"
                      >
                        <CheckCircle2 size={13} />
                        <span>Settle Equipment Bill</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Students Roster table matching the capsule headers row in allotments */
            <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                      <th className="pb-3 pl-2">Hostel Student</th>
                      <th className="pb-3">Admission No</th>
                      <th className="pb-3">Issued Items</th>
                      <th className="pb-3 font-mono">Total Cost</th>
                      <th className="pb-3 font-mono">Total Paid</th>
                      <th className="pb-3 font-mono">Outstanding</th>
                      <th className="pb-3 text-right pr-2">Dossier Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {searchedInventoryStudents.map(stud => {
                      const studentAllos = tenantAllocations.filter(a => a.studentId === stud.id);
                      const totalC = studentAllos.reduce((acc, c) => acc + c.cost, 0);
                      const totalP = studentAllos.reduce((acc, c) => acc + c.paid, 0);
                      const outstanding = totalC - totalP;
                      
                      return (
                        <tr key={stud.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black">
                              {stud.first_name[0]}{stud.last_name[0]}
                            </div>
                            {stud.first_name} {stud.last_name}
                          </td>
                          <td className="py-4 font-mono text-text-secondary">{stud.admission_no}</td>
                          <td className="py-4 text-slate-700 font-semibold">{studentAllos.length} items</td>
                          <td className="py-4 font-mono font-bold text-text-primary">₹{totalC}</td>
                          <td className="py-4 font-mono text-success">₹{totalP}</td>
                          <td className="py-4 font-mono">
                            {outstanding > 0 ? (
                              <span className="text-warning font-bold">₹{outstanding}</span>
                            ) : (
                              <span className="text-success font-black">₹0</span>
                            )}
                          </td>
                          <td className="py-4 text-right pr-2">
                            <button
                              onClick={() => setSelectedStudentId(stud.id)}
                              className="px-3 py-1.5 bg-accent/10 border border-accent/20 hover:bg-accent text-accent hover:text-text-primary text-\[10px] font-bold rounded-lg transition-all"
                            >
                              Manage dossier
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {searchedInventoryStudents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-xs text-text-secondary italic">
                          No student records found. Only active hostel residents appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: ADD HOSTEL BLOCK */}
      <Modal
        open={showHostelForm}
        onClose={() => setShowHostelForm(false)}
        title="Add Hostel Block"
        icon={<Building2 size={20} />}
        size="md"
      >
        <form onSubmit={handleAddHostel} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Hostel Block Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Tagore Hostel - Block A"
              value={newHostel.name}
              onChange={(e) => setNewHostel({...newHostel, name: e.target.value})}
              className="w-full text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Boarding Gender *</label>
            <select
              value={newHostel.type}
              onChange={(e) => setNewHostel({...newHostel, type: e.target.value})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
            >
              <option value="BOYS">BOYS ONLY</option>
              <option value="GIRLS">GIRLS ONLY</option>
              <option value="CO-ED">CO-ED BOARDING</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Warden Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Suresh Chandra"
              value={newHostel.warden}
              onChange={(e) => setNewHostel({...newHostel, warden: e.target.value})}
              className="w-full text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Capacity (Beds count) *</label>
            <input 
              type="number" 
              placeholder="e.g. 120"
              value={newHostel.capacity}
              onChange={(e) => setNewHostel({...newHostel, capacity: e.target.value})}
              className="w-full text-xs font-mono"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 mt-2"
          >
            <Plus size={14} />
            <span>Establish Block</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 2: REGISTER ROOM */}
      <Modal
        open={showRoomForm}
        onClose={() => setShowRoomForm(false)}
        title="Register Room"
        icon={<Home size={20} />}
        size="md"
      >
        <form onSubmit={handleAddRoom} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Choose Hostel Block *</label>
            <select
              value={newRoom.hostelId}
              onChange={(e) => setNewRoom({...newRoom, hostelId: e.target.value})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              required
            >
              <option value="">Select block...</option>
              {tenantHostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Room Number *</label>
            <input 
              type="text" 
              placeholder="e.g. 104"
              value={newRoom.number}
              onChange={(e) => setNewRoom({...newRoom, number: e.target.value})}
              className="w-full text-xs font-mono"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Sharing Configuration *</label>
            <select
              value={newRoom.type}
              onChange={(e) => {
                const beds = e.target.value === 'Single Room' ? 1 : e.target.value === 'Double Sharing' ? 2 : 3;
                setNewRoom({...newRoom, type: e.target.value, beds: beds});
              }}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
            >
              <option value="Single Room">Single Room (1 Bed)</option>
              <option value="Double Sharing">Double Sharing (2 Beds)</option>
              <option value="Triple Sharing">Triple Sharing (3 Beds)</option>
            </select>
          </div>
          <button 
            type="submit"
            className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 mt-2"
          >
            <Plus size={14} />
            <span>Establish Room</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 3: ALLOT BED ROOM */}
      <Modal
        open={showAllotmentForm}
        onClose={() => setShowAllotmentForm(false)}
        title="New Bed Allotment"
        icon={<Bed size={20} />}
        size="md"
      >
        <form onSubmit={handleAddAllotment} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Student *</label>
            <select
              value={newAllotment.studentId}
              onChange={(e) => setNewAllotment({...newAllotment, studentId: e.target.value})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              required
            >
              <option value="">Select student...</option>
              {tenantStudents.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Hostel Block *</label>
            <select
              value={newAllotment.hostelId}
              onChange={(e) => setNewAllotment({...newAllotment, hostelId: e.target.value, roomNumber: ''})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              required
            >
              <option value="">Select Block...</option>
              {tenantHostels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Room *</label>
            <select
              value={newAllotment.roomNumber}
              onChange={(e) => setNewAllotment({...newAllotment, roomNumber: e.target.value})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              required
              disabled={!newAllotment.hostelId}
            >
              <option value="">Choose Room...</option>
              {tenantRooms
                .filter(r => r.hostelId === newAllotment.hostelId)
                .map(r => (
                  <option key={r.id} value={r.number} disabled={r.occupied >= r.beds}>
                    Room {r.number} ({r.beds - r.occupied} bed free)
                  </option>
                ))
              }
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Bed No *</label>
              <select
                value={newAllotment.bedNo}
                onChange={(e) => setNewAllotment({...newAllotment, bedNo: e.target.value})}
                className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
                required
              >
                <option value="A">Bed A</option>
                <option value="B">Bed B</option>
                <option value="C">Bed C</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Check-in Date *</label>
              <input 
                type="date" 
                value={newAllotment.date}
                onChange={(e) => setNewAllotment({...newAllotment, date: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 mt-2"
          >
            <Plus size={14} />
            <span>Allot Bed Room</span>
          </button>
        </form>
      </Modal>

      {/* MODAL 4: ISSUE EQUIPMENT ITEM */}
      <Modal
        open={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="Issue Items to Student"
        icon={<Package size={20} />}
        size="lg"
      >
        <form onSubmit={handleIssueItem} className="space-y-6">
          <p className="text-xs text-text-secondary -mt-3">Record multiple items given to students at once.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Filter by Class</label>
              <select
                value={issueClassFilter}
                onChange={(e) => {
                  setIssueClassFilter(e.target.value);
                  setNewIssue(prev => ({ ...prev, studentId: '' }));
                }}
                className="w-full bg-bg-sidebar border border-border rounded-xl py-3 px-3 text-xs text-text-primary cursor-pointer"
              >
                <option value="">All Classes</option>
                {sharedClasses?.filter(c => c.tenant_id === activeTenant.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Student *</label>
              <select
                value={newIssue.studentId}
                onChange={(e) => setNewIssue({...newIssue, studentId: e.target.value})}
                className="w-full bg-bg-sidebar border border-border rounded-xl py-3 px-3 text-xs text-text-primary cursor-pointer"
                required
              >
                <option value="">Select Hostel Student</option>
                {tenantStudents
                  .filter(s => !issueClassFilter || s.class_id === issueClassFilter)
                  .map(s => {
                    const cls = sharedClasses?.find(c => c.id === s.class_id);
                    const classNameStr = cls ? ` [${cls.name}]` : '';
                    return (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}{classNameStr} ({s.admission_no})
                      </option>
                    );
                  })
                }
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Issuance Date *</label>
              <input 
                type="date"
                value={newIssue.date}
                onChange={(e) => setNewIssue({...newIssue, date: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* Line Items Header */}
          <div className="flex justify-between items-center border-t border-border pt-4">
            <span className="text-xs font-black text-text-primary uppercase tracking-wider font-outfit">Line Items</span>
            <button
              type="button"
              onClick={() => {
                setNewIssue(prev => ({
                  ...prev,
                  items: [...prev.items, { name: '', quantity: 1, price: '' }]
                }));
              }}
              className="px-3.5 py-2 bg-accent/10 border border-accent/25 hover:bg-accent text-accent hover:text-white text-[10px] font-bold rounded-xl transition-all flex items-center gap-1 active:scale-95 animate-in fade-in"
            >
              <Plus size={11} />
              <span>Add Item</span>
            </button>
          </div>

          {/* Line Items List */}
          <div className="space-y-3 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">
              <div className="col-span-6">Item Name</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-3">Unit Price (₹)</div>
              <div className="col-span-1 text-center">Delete</div>
            </div>

            {newIssue.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center animate-in slide-in-from-top-1 duration-150">
                <div className="col-span-6">
                  <input
                    type="text"
                    placeholder="e.g. Books, Pen, Paper"
                    value={item.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewIssue(prev => {
                        const updated = [...prev.items];
                        updated[index] = { ...updated[index], name: val };
                        return { ...prev, items: updated };
                      });
                    }}
                    className="w-full py-2.5 px-3 text-xs bg-bg-sidebar text-text-primary"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewIssue(prev => {
                        const updated = [...prev.items];
                        updated[index] = { ...updated[index], quantity: val };
                        return { ...prev, items: updated };
                      });
                    }}
                    className="w-full py-2.5 px-3 text-xs font-mono bg-bg-sidebar text-text-primary text-center"
                    min={1}
                    required
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    placeholder="₹"
                    value={item.price}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewIssue(prev => {
                        const updated = [...prev.items];
                        updated[index] = { ...updated[index], price: val };
                        return { ...prev, items: updated };
                      });
                    }}
                    className="w-full py-2.5 px-3 text-xs font-mono bg-bg-sidebar text-text-primary"
                    min={0}
                    required
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setNewIssue(prev => {
                        const updated = prev.items.filter((_, i) => i !== index);
                        return { ...prev, items: updated.length === 0 ? [{ name: '', quantity: 1, price: '' }] : updated };
                      });
                    }}
                    className="p-2 text-text-secondary hover:text-danger hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Summary Bar */}
          {(() => {
            const total = newIssue.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price) || 0), 0);
            return (
              <div className="p-5 bg-slate-900 rounded-[1.5rem] flex justify-between items-center text-white mt-4 shadow-xl">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Bill Amount</span>
                  <span className="text-xl font-black font-mono text-white mt-0.5 block">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-accent/20"
                  >
                    Issue & Save Bill
                  </button>
                </div>
              </div>
            );
          })()}
          
        </form>
      </Modal>

    </div>
  );
}
