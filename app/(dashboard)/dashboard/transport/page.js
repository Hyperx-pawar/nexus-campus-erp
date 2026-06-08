'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState } from 'react';
import { 
  Bus, Search, Plus, Wrench, Calendar, 
  CreditCard, UserCheck, ShieldCheck, ArrowRight, Navigation, MapPin
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

export default function TransportLogisticsPage() {
  const {
    activeTenant, 
    sharedTransportRoutes, 
    setSharedTransportRoutes,
    sharedMaintenanceBills,
    setSharedMaintenanceBills,
    sharedStudents,
    activeRole,
    activeUser
  } = useAuth();

  // Resolve student ID for student role
  const myStudentProfile = React.useMemo(() => {
    return sharedStudents.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
  }, [sharedStudents, activeTenant.id, activeUser]);

  const myRoute = React.useMemo(() => {
    if (!myStudentProfile || !myStudentProfile.enableTransport || !myStudentProfile.transportRouteId) {
      return null;
    }
    return sharedTransportRoutes.find(r => r.id === myStudentProfile.transportRouteId);
  }, [myStudentProfile, sharedTransportRoutes]);

  const [activeTab, setActiveTab] = useState('routes'); // 'routes' | 'maintenance'
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTrackRoute, setSelectedTrackRoute] = useState(null);
  
  const activeTrackedRoute = React.useMemo(() => {
    if (!selectedTrackRoute) return null;
    return sharedTransportRoutes.find(r => r.id === selectedTrackRoute.id);
  }, [selectedTrackRoute, sharedTransportRoutes]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusOption, setSelectedBusOption] = useState('NEW');

  const [newRoute, setNewRoute] = useState({
    name: '',
    busReg: '',
    driverName: '',
    driverPhone: '',
    fee: 6000,
    gpsEnabled: false
  });
 
  const [newBill, setNewBill] = useState({
    vehicleId: '',
    service: '',
    cost: '',
    date: new Date().toISOString().split('T')[0]
  });
 
  // Transit statuses to simulate GPS/RTO live tracking
  const [transitStatuses] = useState({
    'route-1': 'IN_TRANSIT',
    'route-2': 'PARKED',
    'route-3': 'MAINTENANCE'
  });
 
  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'STUDENT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="School Bus & Transport" />;
  }
 
  const handleAddRoute = (e) => {
    e.preventDefault();
    if (!newRoute.name || !newRoute.busReg || !newRoute.driverName) {
      toast.error('Route Name, Vehicle Registration, and Driver Name are required.');
      return;
    }
 
    const uppercaseReg = newRoute.busReg.toUpperCase();
    const newRouteItem = {
      id: `route-${Date.now()}`,
      name: newRoute.name,
      fee: Number(newRoute.fee),
      bus: uppercaseReg,
      driver: newRoute.driverName,
      phone: newRoute.driverPhone || '+91 99999 88888',
      tenant_id: activeTenant.id,
      gpsEnabled: newRoute.gpsEnabled,
      latitude: newRoute.gpsEnabled ? 28.5276 : undefined,
      longitude: newRoute.gpsEnabled ? 77.2100 : undefined,
      etaMinutes: newRoute.gpsEnabled ? 12 : undefined,
      lastUpdated: newRoute.gpsEnabled ? new Date().toISOString() : undefined
    };
 
    setSharedTransportRoutes([...sharedTransportRoutes, newRouteItem]);
    toast.success(`Transit corridor "${newRoute.name}" registered successfully with vehicle ${uppercaseReg}!`);
    
    setNewRoute({
      name: '',
      busReg: '',
      driverName: '',
      driverPhone: '',
      fee: 6000,
      gpsEnabled: false
    });
    setSelectedBusOption('NEW');
    setShowAddForm(false);
  };

  const handleAddBill = (e) => {
    e.preventDefault();
    if (!newBill.vehicleId || !newBill.service || !newBill.cost) {
      toast.error('Vehicle choice, Service Details, and Bill Amount are required.');
      return;
    }

    const newBillItem = {
      id: `bill-${Date.now()}`,
      vehicle: newBill.vehicleId,
      service: newBill.service,
      cost: Number(newBill.cost),
      date: newBill.date,
      tenant_id: activeTenant.id
    };

    setSharedMaintenanceBills([newBillItem, ...sharedMaintenanceBills]);
    toast.success(`Maintenance bill of ₹${Number(newBill.cost).toLocaleString('en-IN')} logged successfully!`);
    
    setNewBill({
      vehicleId: '',
      service: '',
      cost: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowAddForm(false);
  };

  // Filter routes and bills by active campus tenant_id
  const tenantRoutes = sharedTransportRoutes.filter(r => r.tenant_id === activeTenant.id);
  const tenantBills = sharedMaintenanceBills.filter(b => b.tenant_id === activeTenant.id);
  const tenantStudents = sharedStudents.filter(s => s.tenant_id === activeTenant.id);

  // Get all unique vehicles (buses) in the system for the active tenant, grouped strictly by license plate
  const existingBuses = [];
  const seenBuses = new Set();
  tenantRoutes.forEach(r => {
    const plate = r.bus.trim().toUpperCase();
    if (!seenBuses.has(plate)) {
      seenBuses.add(plate);
      existingBuses.push({
        bus: plate,
        driver: r.driver,
        phone: r.phone
      });
    }
  });

  // Count unique buses
  const uniqueBusesCount = existingBuses.length;

  // Cumulative maintenance expenditures
  const totalMaintenanceExpense = tenantBills.reduce((acc, curr) => acc + curr.cost, 0);

  // Calculate enrolled student count (simulated)
  // Aarav Patel has stud-1 which is route-1 assigned by default in demo
  const enrolledStudentsCount = tenantStudents.length > 0 ? Math.round(tenantStudents.length * 0.7) : 0; 

  const filteredRoutes = tenantRoutes.filter(r => {
    const term = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      r.bus.toLowerCase().includes(term) ||
      r.driver.toLowerCase().includes(term)
    );
  });

  if (activeRole === 'STUDENT') {
    return (
      <div className="space-y-8 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">My Transport Desk</h2>
            <p className="text-text-secondary text-sm font-medium mt-1">
              View your assigned school bus route, driver details, and monthly corridor fees.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-success bg-success/5 border border-success/20 px-3.5 py-2.5 rounded-xl uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Transit Registry Secured</span>
          </div>
        </div>

        {/* Assigned Route details */}
        <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2.5rem] space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Bus size={16} className="text-accent" />
            <span>My School Bus Route Assignment</span>
          </h3>
          {myRoute ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
              <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase block">Route Corridor</span>
                <span className="font-bold text-text-primary text-sm mt-1 block">{myRoute.name}</span>
              </div>
              <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase block">Bus Number Plate</span>
                <span className="font-bold text-text-primary font-mono text-sm mt-1 block">{myRoute.bus}</span>
              </div>
              <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase block">Driver Name</span>
                <span className="font-bold text-text-primary text-sm mt-1 block">{myRoute.driver}</span>
              </div>
              <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase block">Driver Contact</span>
                <span className="font-bold text-text-primary font-mono text-sm mt-1 block">{myRoute.phone || '+91 99999 88888'}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-secondary italic py-6 text-center border border-dashed border-border rounded-xl">
              You are currently registered as a day scholar. No transport route or bus assignment found for your profile.
            </p>
          )}
        </div>

        {/* Dynamic fee statement if assigned */}
        {myRoute && (
          <div className="p-6 bg-bg-sidebar border border-border rounded-[2.5rem] space-y-4 max-w-md">
            <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider">Transport Fee Statement</h3>
            <div className="p-4 bg-bg-main/50 border border-border rounded-2xl flex justify-between items-center text-xs">
              <span className="text-text-secondary font-bold">Monthly Corridor Charge:</span>
              <span className="font-mono font-black text-text-primary text-sm">
                ₹{myRoute.fee.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Transport Management</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Manage school bus routes, vehicles, and maintenance billing.
          </p>
        </div>
        
        {activeRole !== 'STUDENT' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            <span>{activeTab === 'routes' ? 'Add New Route' : 'Log Maintenance Bill'}</span>
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit">
          <button
            onClick={() => {
              setActiveTab('routes');
              setShowAddForm(false);
            }}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'routes' 
                ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Routes & Tracking
          </button>
          {activeRole !== 'STUDENT' && (
            <button
              onClick={() => {
                setActiveTab('maintenance');
                setShowAddForm(false);
              }}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'maintenance' 
                  ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Maintenance & Billing
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black text-accent bg-accent/5 border border-accent/20 px-3.5 py-2 rounded-xl uppercase tracking-wider">
          <ShieldCheck size={14} />
          <span>Security Partition Lock</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Routes', value: tenantRoutes.length, desc: 'Registered corridors', icon: Bus },
          { label: 'Active Vehicles', value: uniqueBusesCount, desc: 'Buses under contract', icon: Navigation },
          { label: 'Students Enrolled', value: enrolledStudentsCount, desc: 'Student commuters onboard', icon: UserCheck }
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

      {/* Add Route / Maintenance Bill Modal */}
      <Modal
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        title={activeTab === 'routes' ? 'Map Transit Route' : 'Log Vehicle Upkeep Expenditure'}
        icon={activeTab === 'routes' ? <Bus size={18} /> : <Wrench size={18} />}
        size={activeTab === 'routes' ? 'lg' : 'md'}
      >
        {activeTab === 'routes' ? (
          <form onSubmit={handleAddRoute} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Vehicle Assignment *</label>
              <select
                value={selectedBusOption}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBusOption(val);
                  if (val === 'NEW') {
                    setNewRoute(prev => ({
                      ...prev,
                      busReg: '',
                      driverName: '',
                      driverPhone: ''
                    }));
                  } else {
                    const selectedBus = existingBuses.find(b => b.bus === val);
                    if (selectedBus) {
                      setNewRoute(prev => ({
                        ...prev,
                        busReg: selectedBus.bus,
                        driverName: selectedBus.driver,
                        driverPhone: selectedBus.phone
                      }));
                    }
                  }
                }}
                className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary cursor-pointer"
              >
                <option value="NEW">Register & Assign New Bus / Vehicle Profile</option>
                {existingBuses.map((b, idx) => (
                  <option key={idx} value={b.bus}>
                    {b.bus} — {b.driver} ({b.phone})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Route Corridor Name *</label>
              <input 
                type="text" 
                placeholder="Route D - West Delhi Sector"
                value={newRoute.name}
                onChange={(e) => setNewRoute({...newRoute, name: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Bus Number Plate *</label>
              <input 
                type="text" 
                placeholder="DL 1PD 8492"
                value={newRoute.busReg}
                onChange={(e) => setNewRoute({...newRoute, busReg: e.target.value})}
                className="w-full text-xs font-mono uppercase"
                required
                disabled={selectedBusOption !== 'NEW'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Driver Name *</label>
              <input 
                type="text" 
                placeholder="Harpreet Singh"
                value={newRoute.driverName}
                onChange={(e) => setNewRoute({...newRoute, driverName: e.target.value})}
                className="w-full text-xs"
                required
                disabled={selectedBusOption !== 'NEW'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Driver Contact Phone</label>
              <input 
                type="text" 
                placeholder="+91 98765 43210"
                value={newRoute.driverPhone}
                onChange={(e) => setNewRoute({...newRoute, driverPhone: e.target.value})}
                className="w-full text-xs"
                disabled={selectedBusOption !== 'NEW'}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Route Term Fee (₹) *</label>
              <input 
                type="number" 
                value={newRoute.fee}
                onChange={(e) => setNewRoute({...newRoute, fee: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between p-3.5 bg-bg-main border border-border rounded-xl">
              <div>
                <span className="text-[10px] font-bold text-text-primary block">Install Live GPS Hardware Tracker</span>
                <span className="text-[8px] text-text-secondary uppercase tracking-wider block font-bold mt-0.5">Optional Service Integration</span>
              </div>
              <input 
                type="checkbox" 
                checked={newRoute.gpsEnabled}
                onChange={(e) => setNewRoute({...newRoute, gpsEnabled: e.target.checked})}
                className="w-4 h-4 cursor-pointer accent-accent"
              />
            </div>
            <button 
              type="submit"
              className="md:col-span-2 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Plus size={14} />
              <span>Establish Transit Route</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleAddBill} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Target Fleet Vehicle *</label>
              <select 
                value={newBill.vehicleId}
                onChange={(e) => setNewBill({...newBill, vehicleId: e.target.value})}
                className="w-full text-xs bg-bg-sidebar text-text-primary"
                required
              >
                <option value="">Choose active bus...</option>
                {tenantRoutes.map(r => (
                  <option key={r.id} value={`${r.bus} (${r.name})`}>{r.bus} - {r.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Maintenance Service Details *</label>
              <input 
                type="text" 
                placeholder="Brake replacement / Engine Tuning"
                value={newBill.service}
                onChange={(e) => setNewBill({...newBill, service: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Expenditure Amount (₹) *</label>
                <input 
                  type="number" 
                  placeholder="Amount in Rupees"
                  value={newBill.cost}
                  onChange={(e) => setNewBill({...newBill, cost: e.target.value})}
                  className="w-full text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Service Date *</label>
                <input 
                  type="date" 
                  value={newBill.date}
                  onChange={(e) => setNewBill({...newBill, date: e.target.value})}
                  className="w-full text-xs font-mono"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Plus size={14} />
              <span>Log Upkeep Invoice</span>
            </button>
          </form>
        )}
      </Modal>

      {/* Content Area */}
      {activeTab === 'routes' ? (
        /* Routes List */
        <div className="space-y-6">
          {activeRole === 'STUDENT' && myRoute && (
            <div className="p-6 bg-accent/5 border border-accent/20 rounded-[2.5rem] space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center text-accent">
                  <Navigation size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">Your Assigned Transport Route</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Live details for your campus commute</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
                <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase block">Route Corridor</span>
                  <span className="font-bold text-text-primary text-sm mt-1 block">{myRoute.name}</span>
                </div>
                <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase block">Vehicle Registration</span>
                  <span className="font-bold text-text-primary font-mono text-sm mt-1 block">{myRoute.bus}</span>
                </div>
                <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase block">Assigned Driver</span>
                  <span className="font-bold text-text-primary text-sm mt-1 block">{myRoute.driver}</span>
                </div>
                <div className="p-4 bg-bg-sidebar border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase block">Driver Phone</span>
                  <span className="font-bold text-text-primary font-mono text-sm mt-1 block">{myRoute.phone || '+91 99999 88888'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
            <div className="max-w-md relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search active routes, driver names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
            />
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Transit Corridor</th>
                  <th className="pb-3">Vehicle / License</th>
                  <th className="pb-3">Driver Name</th>
                  <th className="pb-3">Contact Phone</th>
                  <th className="pb-3">Term Fee</th>
                  <th className="pb-3 text-right pr-2">Live GPS Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredRoutes.map((route) => {
                  const status = transitStatuses[route.id] || 'IN_TRANSIT';
                  return (
                    <tr key={route.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2">
                        <MapPin size={14} className="text-accent" />
                        {route.name}
                      </td>
                      <td className="py-4 font-mono font-bold text-slate-700">{route.bus}</td>
                      <td className="py-4 text-text-secondary font-medium">{route.driver}</td>
                      <td className="py-4 font-mono text-text-secondary">{route.phone}</td>
                      <td className="py-4 font-mono text-accent font-black">₹{route.fee.toLocaleString('en-IN')}</td>
                      <td className="py-4 text-right pr-2">
                        {route.gpsEnabled ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success/15 border border-success/35 text-success text-[9px] font-black uppercase rounded">
                              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                              Online
                            </span>
                            <button
                              onClick={() => setSelectedTrackRoute(route)}
                              className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-[9px] font-black uppercase rounded transition-all flex items-center gap-1 cursor-pointer no-print"
                            >
                              <Navigation size={10} className="rotate-45" />
                              <span>Track Live</span>
                            </button>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 border border-border text-text-secondary text-[9px] font-black uppercase rounded">
                            GPS Offline
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRoutes.length === 0 && (
            <p className="text-center py-6 text-xs text-text-secondary">No transit corridors registered.</p>
          )}
        </div>
        </div>
      ) : (
        /* Maintenance logs and repair bills list */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Repair logs list */}
          <div className="lg:col-span-2 p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Wrench size={16} className="text-accent" />
              <span>Fleet Maintenance Logs</span>
            </h3>
            
            <div className="space-y-3">
              {tenantBills.map((bill) => (
                <div key={bill.id} className="p-4 bg-bg-card/85 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border rounded-2xl flex justify-between items-center gap-4 hover:border-danger/15 transition-all">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">Service: {bill.service}</h4>
                    <p className="text-[9px] text-text-secondary font-mono mt-0.5">Vehicle Target: {bill.vehicle} • Date: {bill.date}</p>
                  </div>
                  <span className="text-danger font-black text-xs font-mono">₹{bill.cost.toLocaleString('en-IN')}</span>
                </div>
              ))}
              {tenantBills.length === 0 && (
                <p className="text-center py-6 text-xs text-text-secondary">No upkeep expenditures logged.</p>
              )}
            </div>
          </div>

          {/* Cumulative maintenance costs details */}
          <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
            <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider">Fleet Upkeep Cost Summary</h3>
            <div className="p-5 bg-danger/5 border border-danger/20 rounded-2xl text-center space-y-2">
              <span className="text-[9px] font-black text-danger uppercase tracking-widest block">Aggregated Cost</span>
              <p className="text-3xl font-black font-outfit text-danger">₹{totalMaintenanceExpense.toLocaleString('en-IN')}</p>
              <span className="text-[9px] text-text-secondary block">Cumulative repair costs this cycle</span>
            </div>
          </div>
        </div>
      )}
      {/* Live GPS Tracking Modal */}
      <Modal
        open={!!activeTrackedRoute}
        onClose={() => setSelectedTrackRoute(null)}
        title={`Live Transit Tracking — ${activeTrackedRoute?.bus || ''}`}
        icon={<Navigation size={18} className="text-success animate-pulse rotate-45" />}
        size="lg"
      >
        {activeTrackedRoute && (() => {
          const eta = activeTrackedRoute.etaMinutes || 12;
          const pct = Math.max(5, Math.min(95, ((15 - eta) / 14) * 100));
          const speed = eta > 1 ? 35 + Math.floor((pct % 7) * 2) : 0;
          
          return (
            <div className="space-y-6 text-text-primary">
              {/* Route Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Commute Corridor</span>
                  <span className="text-sm font-black mt-1 block">{activeTrackedRoute.name}</span>
                </div>
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Estimated Arrival (ETA)</span>
                  <span className="text-sm font-black text-success mt-1 block flex items-center gap-1.5">
                    <Clock size={14} className="animate-pulse" />
                    {eta > 1 ? `${eta} mins` : 'Arrived at Campus'}
                  </span>
                </div>
                <div className="p-4 bg-bg-main border border-border rounded-2xl">
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold">Last GPS Coordinate Ping</span>
                  <span className="text-xs font-mono font-bold text-text-secondary mt-1 block">
                    {activeTrackedRoute.latitude?.toFixed(6)}, {activeTrackedRoute.longitude?.toFixed(6)}
                  </span>
                </div>
              </div>

              {/* High-Fidelity SVG Route Tracker */}
              <div className="p-6 bg-slate-950 text-white rounded-3xl border border-slate-800 relative overflow-hidden h-64 flex flex-col justify-between">
                {/* Visual grid pattern background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
                
                <div className="flex justify-between items-center z-10">
                  <span className="text-[10px] bg-success/20 text-success border border-success/30 px-2.5 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-success rounded-full animate-ping"></span>
                    Live GPS Telemetry active
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Last ping: {activeTrackedRoute.lastUpdated ? new Date(activeTrackedRoute.lastUpdated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>

                {/* SVG Route Line & Moving Bus */}
                <div className="relative my-auto z-10 py-6">
                  {/* SVG Map Path */}
                  <svg className="w-full h-12" viewBox="0 0 100 12" preserveAspectRatio="none">
                    {/* Background path line */}
                    <path d="M 5 6 Q 25 1, 50 6 T 95 6" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
                    {/* Active completed path line */}
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

                  {/* Pulsing Bus Vehicle Pointer */}
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

                  {/* Stations/Stops along path */}
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

                {/* Telemetry Footer */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-900 pt-3 z-10 font-mono">
                  <span>Speed: <strong className="text-white">{speed} km/h</strong></span>
                  <span>Sats: <strong className="text-white">12 Connected</strong></span>
                  <span>Precision (HDOP): <strong className="text-success">0.82 (Excellent)</strong></span>
                  <span>Hardware Status: <strong className="text-success">Healthy</strong></span>
                </div>
              </div>

              {/* Live coordinates feed log */}
              <div className="p-4 bg-bg-main border border-border rounded-2xl">
                <span className="text-[9px] text-text-secondary uppercase tracking-widest block font-bold mb-2 ml-1">Live Telemetry Packet Pings</span>
                <div className="bg-slate-900 text-slate-300 font-mono text-[9px] p-3 rounded-xl max-h-24 overflow-y-auto space-y-1 custom-scrollbar">
                  <div>[{new Date().toLocaleTimeString()}] GPS ping acknowledged: {activeTrackedRoute.latitude?.toFixed(6)}, {activeTrackedRoute.longitude?.toFixed(6)} | Speed: {speed} km/h | satellites: 12</div>
                  <div className="opacity-70">[{new Date(Date.now() - 5000).toLocaleTimeString()}] GPS ping acknowledged: {(activeTrackedRoute.latitude - 0.0001)?.toFixed(6)}, {(activeTrackedRoute.longitude - 0.0001)?.toFixed(6)} | Speed: {speed > 0 ? speed - 2 : 0} km/h | satellites: 12</div>
                  <div className="opacity-40">[{new Date(Date.now() - 10000).toLocaleTimeString()}] GPS ping acknowledged: {(activeTrackedRoute.latitude - 0.0002)?.toFixed(6)}, {(activeTrackedRoute.longitude - 0.0002)?.toFixed(6)} | Speed: {speed > 0 ? speed - 1 : 0} km/h | satellites: 11</div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
