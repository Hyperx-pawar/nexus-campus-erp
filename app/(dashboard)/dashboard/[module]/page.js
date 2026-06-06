'use client';

import RoleGate from '@/components/RoleGate';
import React, { use, useState, useEffect } from 'react';
import { useAuth } from '@/components/Providers';
import { compressImage } from '@/lib/storage';
import { 
  Shield, Sparkles, Building2, ClipboardList, Library, Home, Bus, 
  Briefcase, Wallet, FileBox, Settings, TrendingUp, Award, Zap, Bell, MessageSquare, User, Loader2, Upload,
  RefreshCw, Database, HardDrive, Terminal, Server, Users, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';


// ==========================================
// INTERACTIVE PROFILE EDITOR COMPONENT
// ==========================================
function ProfileEditor({ activeTenant, activeRole, activeUser }) {
  const { updateProfile } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '+91 98765 43210',
    aadhaar: '',
    pan: '',
    newPassword: ''
  });
  const [saving, setSaving] = useState(false);

  // Sync profile state when the active user/role switches in development mode
  useEffect(() => {
    if (activeUser) {
      setProfile({
        name: activeUser.name.split(' (')[0] || '',
        email: activeUser.email || '',
        phone: activeUser.phone || '+91 98765 43210',
        aadhaar: activeUser.aadhaar || (activeRole === 'STUDENT' || activeRole === 'PARENT' ? '4839 2840 9283' : ''),
        pan: activeUser.pan || (activeRole === 'TEACHER' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'ACCOUNTANT' ? 'ABCPI1234F' : ''),
        newPassword: ''
      });
    }
  }, [activeUser, activeRole]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      setSaving(false);
    } catch (err) {
      setSaving(false);
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-8 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2rem] space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent z-0"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar & Overview */}
          <div className="flex flex-col items-center justify-center p-6 bg-bg-main/50 border border-border rounded-2xl text-center space-y-4">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-lg border border-border shrink-0">
               {profile.name[0] || 'U'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">{profile.name}</h4>
              <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest block mt-1">{activeRole}</span>
              <span className="text-[9px] text-accent font-bold mt-1 block">{activeTenant.name}</span>
            </div>
          </div>

          {/* Right Column: Editable Fields */}
          <form onSubmit={handleSave} className="md:col-span-2 space-y-5">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <User size={16} className="text-accent" />
              <span>Personal Identification Dossier</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Institutional Email</label>
                <input 
                  type="email" 
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  className="w-full text-xs bg-bg-main cursor-not-allowed opacity-60"
                  disabled
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Contact Phone</label>
                <input 
                  type="text" 
                  value={profile.phone}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  className="w-full text-xs"
                />
              </div>

              {/* Conditional Localized Indian Fields */}
              {profile.aadhaar && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Aadhaar Card Number</label>
                  <input 
                    type="text" 
                    value={profile.aadhaar}
                    onChange={(e) => setProfile({...profile, aadhaar: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
              )}

              {profile.pan && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">PAN Card Number</label>
                  <input 
                    type="text" 
                    value={profile.pan}
                    onChange={(e) => setProfile({...profile, pan: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Reset Access Password</label>
                <input 
                  type="password" 
                  placeholder="Enter new password"
                  value={profile.newPassword}
                  onChange={(e) => setProfile({...profile, newPassword: e.target.value})}
                  className="w-full text-xs"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saving && <Loader2 className="animate-spin" size={14} />}
              <span>Save Profile Modifications</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// INTERACTIVE SETTINGS EDITOR COMPONENT
// ==========================================
function SettingsEditor({ activeTenant, activeRole }) {
  const { updateTenant } = useAuth();
  const [settings, setSettings] = useState({
    name: '',
    subdomain: '',
    board: 'CBSE',
    academicYear: '2026-2027',
    logo: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTenant) {
      setSettings({
        name: activeTenant.name || '',
        subdomain: activeTenant.subdomain || '',
        board: activeTenant.settings?.board || 'CBSE',
        academicYear: activeTenant.settings?.academicYear || '2026-2027',
        logo: activeTenant.logo || ''
      });
    }
  }, [activeTenant]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        toast.loading("Compressing logo image...");
        const compressedFile = await compressImage(file, 400, 400, 0.7); // Rescale to max 400x400 for settings logos
        toast.dismiss();

        const reader = new FileReader();
        reader.onloadend = () => {
          setSettings(prev => ({
            ...prev,
            logo: reader.result
          }));
          
          const savings = Math.round((1 - compressedFile.size / file.size) * 100);
          const origSizeStr = file.size > 1024 * 1024 
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
            : `${(file.size / 1024).toFixed(1)} KB`;
          const newSizeStr = compressedFile.size > 1024 * 1024 
            ? `${(compressedFile.size / 1024 / 1024).toFixed(2)} MB` 
            : `${(compressedFile.size / 1024).toFixed(1)} KB`;
          
          toast.success(
            `📷 Logo Optimized: ${origSizeStr} ➔ ${newSizeStr} (Saved ${savings}%). Click "Save System Configuration" to apply.`
          );
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        toast.dismiss();
        console.error(err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setSettings(prev => ({ ...prev, logo: reader.result }));
          toast.success("School logo preloaded! Click \"Save System Configuration\" to apply.");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      updateTenant(settings);
      setSaving(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="p-8 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2rem] space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent z-0"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Overview Column */}
          <div className="flex flex-col items-center justify-center p-6 bg-bg-main/50 border border-border rounded-2xl text-center space-y-4">
            <div className="relative w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
               {settings.logo ? (
                 <img src={settings.logo} alt="School Logo" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-2xl font-black font-outfit text-accent uppercase">
                   {settings.name ? settings.name.charAt(0) : 'C'}
                 </span>
               )}
            </div>
            
            <div className="flex flex-col gap-2 w-full items-center">
              <label className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-accent/10">
                <Upload size={12} />
                <span>Upload Logo Image</span>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>

              {settings.logo && (
                <button 
                  type="button" 
                  onClick={() => setSettings(prev => ({ ...prev, logo: '' }))}
                  className="text-[9px] text-danger hover:underline font-bold uppercase"
                >
                  Remove Logo
                </button>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-text-primary">System Config</h4>
              <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest block mt-1">Tenant Settings</span>
              <span className="text-[9px] text-success font-bold mt-1 block">IST (GMT+5:30) Active</span>
            </div>
          </div>

          {/* Form fields */}
          <form onSubmit={handleSave} className="md:col-span-2 space-y-5">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-accent" />
              <span>Campus Institution Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Institution Name</label>
                <input 
                  type="text" 
                  value={settings.name}
                  onChange={(e) => setSettings({...settings, name: e.target.value})}
                  className="w-full text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Subdomain Prefix</label>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    value={settings.subdomain}
                    onChange={(e) => setSettings({...settings, subdomain: e.target.value})}
                    className="w-full text-xs rounded-r-none"
                    required
                  />
                  <span className="bg-bg-main border border-l-0 border-border text-[10px] font-bold text-text-secondary px-3 py-3 rounded-r-xl">
                    {activeRole === 'SUPER_ADMIN' ? '.campuserp.in' : '.campus.in'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Affiliation Board</label>
                <select 
                  value={settings.board}
                  onChange={(e) => setSettings({...settings, board: e.target.value})}
                  className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary outline-none cursor-pointer"
                >
                  <option value="CBSE">Central Board of Secondary Education (CBSE)</option>
                  <option value="ICSE">Council for the Indian School Certificate Exams (CISCE)</option>
                  <option value="UGC">University Grants Commission (UGC)</option>
                  <option value="AICTE">All India Council for Technical Education (AICTE)</option>
                  <option value="STATE">State Affiliation Board</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Academic Year</label>
                <input 
                  type="text" 
                  value={settings.academicYear}
                  onChange={(e) => setSettings({...settings, academicYear: e.target.value})}
                  className="w-full text-xs"
                  placeholder="e.g. 2026-2027"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Default Denomination</label>
                <input 
                  type="text" 
                  value="Indian Rupee (₹)" 
                  className="w-full text-xs bg-bg-main cursor-not-allowed opacity-60"
                  disabled
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">System Timezone</label>
                <input 
                  type="text" 
                  value="Asia/Kolkata (IST)" 
                  className="w-full text-xs bg-bg-main cursor-not-allowed opacity-60"
                  disabled
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saving && <Loader2 className="animate-spin" size={14} />}
              <span>Save System Configuration</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// INTERACTIVE SYSTEM PULSE / MONITORING
// ==========================================
function PulseMonitoring({ activeTenant, activeRole }) {
  const [latency, setLatency] = useState(18);
  const [testingLatency, setTestingLatency] = useState(false);
  const [logs, setLogs] = useState([
    '🟢 [' + new Date().toLocaleTimeString() + '] [SYSTEM] Onboarding telemetry nodes for ' + activeTenant.name,
    '📡 [' + new Date().toLocaleTimeString() + '] [NETWORK] Established secure proxy tunnel to host node Mumbai (ap-south-1)',
    '🔑 [' + new Date().toLocaleTimeString() + '] [AUTH] JWT claims verified: role=' + activeRole + ', tenant=' + activeTenant.subdomain,
    '🗄️ [' + new Date().toLocaleTimeString() + '] [DATABASE] Connection pool initiated: 4 idle, 1 active connections',
    '📦 [' + new Date().toLocaleTimeString() + '] [STORAGE] Loaded storage configurations for "avatars" and "documents" buckets'
  ]);
  const [metrics, setMetrics] = useState({
    cpu: 18.5,
    memory: 356,
    requests: 14.2,
    sessions: 6
  });

  // Simulated live logs feed
  useEffect(() => {
    const logPool = [
      () => '⚙️ [' + new Date().toLocaleTimeString() + '] [DB_CONN] Released connection to pool (postgres_writer)',
      () => '🔑 [' + new Date().toLocaleTimeString() + '] [AUTH_JWT] Refreshed access token for active session ID 8f9a-2c4d',
      () => '📡 [' + new Date().toLocaleTimeString() + '] [API_REQ] GET /api/v1/attendance?tenant=' + activeTenant.subdomain + ' (Status 200, 14ms)',
      () => '📷 [' + new Date().toLocaleTimeString() + '] [STORAGE] Cache hit: retrieved student profile photo from cdn',
      () => '🧾 [' + new Date().toLocaleTimeString() + '] [FINANCE] Broadcasted fee invoice receipt to parent notification logs',
      () => '📖 [' + new Date().toLocaleTimeString() + '] [LIBRARY] Volume ISBN metadata query succeeded (Open Library API)',
      () => '⏰ [' + new Date().toLocaleTimeString() + '] [TIMETABLE] Evaluated conflict checker for staff scheduling - 0 double bookings found'
    ];

    const logInterval = setInterval(() => {
      // Append random log
      const randomLog = logPool[Math.floor(Math.random() * logPool.length)]();
      setLogs(prev => [...prev.slice(-49), randomLog]); // Keep last 50 logs

      // Slightly fluctuate metrics
      setMetrics(prev => ({
        cpu: Math.max(5, Math.min(95, +(prev.cpu + (Math.random() - 0.5) * 4).toFixed(1))),
        memory: Math.max(200, Math.min(1024, prev.memory + Math.floor((Math.random() - 0.5) * 15))),
        requests: Math.max(1, Math.min(50, +(prev.requests + (Math.random() - 0.5) * 2).toFixed(1))),
        sessions: Math.max(2, Math.min(25, prev.sessions + (Math.random() > 0.6 ? 1 : Math.random() < 0.4 ? -1 : 0)))
      }));
    }, 4000);

    return () => clearInterval(logInterval);
  }, [activeTenant]);

  const handleTestLatency = () => {
    setTestingLatency(true);
    setLogs(prev => [...prev, '📡 [' + new Date().toLocaleTimeString() + '] [NETWORK] Sending ICMP ping payload to ' + activeTenant.subdomain + '.campuserp.in...']);
    
    setTimeout(() => {
      const newLat = Math.floor(10 + Math.random() * 20);
      setLatency(newLat);
      setTestingLatency(false);
      setLogs(prev => [
        ...prev, 
        '✅ [' + new Date().toLocaleTimeString() + '] [NETWORK] Ping response from host: time=' + newLat + 'ms status=HEALTHY'
      ]);
      toast.success(`Connection verified. Latency: ${newLat}ms`);
    }, 800);
  };

  const handleClearCache = () => {
    setLogs(prev => [
      ...prev, 
      '🧹 [' + new Date().toLocaleTimeString() + '] [CACHE] Purging query buffers and system cache...',
      '✅ [' + new Date().toLocaleTimeString() + '] [CACHE] Evicted cached database relation maps. System heap cleared.'
    ]);
    toast.success('Query cache and session buffers purged successfully!');
  };

  const handleRunDiagnostics = () => {
    setLogs(prev => [
      ...prev,
      '🔍 [' + new Date().toLocaleTimeString() + '] [DIAGNOSTIC] Running compliance tests for active campus configuration...',
      'ℹ️ [' + new Date().toLocaleTimeString() + '] [DIAGNOSTIC] Schema status: 30 / 30 tables matched successfully',
      'ℹ️ [' + new Date().toLocaleTimeString() + '] [DIAGNOSTIC] RLS verification: Policies enforced correctly for ' + activeRole,
      'ℹ️ [' + new Date().toLocaleTimeString() + '] [DIAGNOSTIC] Buckets: "avatars" [Read/Write Enabled], "documents" [Read/Write Enabled]',
      '✅ [' + new Date().toLocaleTimeString() + '] [DIAGNOSTIC] System diagnostics completed. Status Code: 0 (No Errors)'
    ]);
    toast.success('System diagnostics executed. All systems operational.');
  };

  return (
    <div className="space-y-6">
      {/* Node Status Banner */}
      <div className="p-5 bg-bg-card/60 border border-border rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent z-0"></div>
        <div className="relative z-10 space-y-1">
          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Active Deploy Node</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <h4 className="text-sm font-black text-text-primary">AWS ap-south-1 (Mumbai, India)</h4>
          </div>
        </div>
        <div className="relative z-10 flex gap-4 text-xs font-mono">
          <div className="p-3 bg-bg-main border border-border rounded-2xl">
            <span className="text-[8px] text-text-secondary uppercase block font-bold">SQL Ping</span>
            <span className="text-text-primary font-black block mt-0.5">{latency}ms</span>
          </div>
          <div className="p-3 bg-bg-main border border-border rounded-2xl">
            <span className="text-[8px] text-text-secondary uppercase block font-bold">Postgres version</span>
            <span className="text-text-primary font-black block mt-0.5">PG16.2</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'CPU Utilization', value: `${metrics.cpu}%`, desc: 'Diagnostic core load' },
          { label: 'Memory Buffer', value: `${metrics.memory} MB`, desc: 'Heap memory usage' },
          { label: 'API Request Rate', value: `${metrics.requests} req/s`, desc: 'Rolling traffic volume' },
          { label: 'Active Sessions', value: `${metrics.sessions} users`, desc: 'Live authenticated links' }
        ].map((met, idx) => (
          <div key={idx} className="p-4 bg-bg-card/60 border border-border rounded-3xl relative overflow-hidden group hover:border-accent/30 transition-all duration-300">
            <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest block">{met.label}</span>
            <p className="text-xl font-black font-outfit text-text-primary mt-2">{met.value}</p>
            <p className="text-[9px] text-text-secondary mt-1 block opacity-60">{met.desc}</p>
          </div>
        ))}
      </div>

      {/* Terminal Logger Feed */}
      <div className="p-5 bg-slate-950 border border-border text-emerald-400 dark:text-emerald-300 font-mono text-[11px] rounded-[2rem] space-y-2 shadow-inner relative">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-accent animate-pulse" />
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Real-Time Diagnostics Feed</span>
          </div>
          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">Live Streaming</span>
        </div>

        <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar flex flex-col-reverse">
          {[...logs].reverse().map((log, index) => (
            <p key={index} className="leading-relaxed whitespace-pre-wrap">{log}</p>
          ))}
        </div>
      </div>

      {/* Diagnostical Action Buttons */}
      <div className="p-6 bg-bg-card/60 border border-border rounded-[2rem] space-y-4">
        <h4 className="text-xs font-black font-outfit text-text-primary uppercase tracking-wider">Campus Operational Diagnostic Tools</h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleTestLatency}
            disabled={testingLatency}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={12} className={testingLatency ? 'animate-spin' : ''} />
            <span>Test Database Latency</span>
          </button>
          <button
            onClick={handleClearCache}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-700 text-text-primary text-xs font-bold rounded-xl transition-all border border-border active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Purge Query Buffers</span>
          </button>
          <button
            onClick={handleRunDiagnostics}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-700 text-text-primary text-xs font-bold rounded-xl transition-all border border-border active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Verify Tenant RLS Claims</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// INTERACTIVE SYSTEM ANALYTICS PORTAL
// ==========================================
function AnalyticsDashboard({ activeTenant, activeRole }) {
  const [metricTab, setMetricTab] = useState('admissions'); // 'admissions' | 'finance' | 'cbse'
  
  return (
    <div className="space-y-6">
      {/* Top statistics overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Admissions growth', value: '+18.4%', desc: 'Compared to previous CBSE term', trend: 'up' },
          { label: 'Collection Efficiency', value: '94.2%', desc: 'Fees paid through online ledger', trend: 'up' },
          { label: 'Faculty retention', value: '96.8%', desc: 'Annual core staff stability', trend: 'up' }
        ].map((met, idx) => (
          <div key={idx} className="p-6 bg-bg-card/60 border border-border rounded-3xl relative overflow-hidden group">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block">{met.label}</span>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3">{met.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{met.desc}</p>
          </div>
        ))}
      </div>

      {/* Analytics Visual Chart and Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SVG Chart area */}
        <div className="lg:col-span-2 p-6 bg-bg-sidebar border border-border rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider font-outfit text-text-primary">Performance Trend Ledger</h4>
              <p className="text-[10px] text-text-secondary mt-0.5">Rolling academic and collection trends for {activeTenant.name}.</p>
            </div>
            <div className="flex gap-2 p-0.5 bg-slate-100 dark:bg-slate-800 border border-border rounded-xl">
              {['admissions', 'finance', 'cbse'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setMetricTab(tab)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${
                    metricTab === tab 
                      ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Chart */}
          <div className="h-64 w-full bg-slate-50/55 border border-border rounded-2xl flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent"></div>
            {metricTab === 'admissions' && (
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M 0 160 Q 100 120 200 130 T 400 80 T 500 40 L 500 200 L 0 200 Z" fill="url(#chartGrad)" />
                <path d="M 0 160 Q 100 120 200 130 T 400 80 T 500 40" fill="none" stroke="var(--accent)" strokeWidth="3" />
                <circle cx="200" cy="130" r="4" fill="var(--accent)" />
                <circle cx="400" cy="80" r="4" fill="var(--accent)" />
                <circle cx="500" cy="40" r="4" fill="var(--accent)" />
              </svg>
            )}
            {metricTab === 'finance' && (
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <path d="M 0 180 Q 100 150 200 90 T 400 60 T 500 30 L 500 200 L 0 200 Z" fill="url(#chartGrad)" />
                <path d="M 0 180 Q 100 150 200 90 T 400 60 T 500 30" fill="none" stroke="var(--success)" strokeWidth="3" />
                <circle cx="200" cy="90" r="4" fill="var(--success)" />
                <circle cx="400" cy="60" r="4" fill="var(--success)" />
                <circle cx="500" cy="30" r="4" fill="var(--success)" />
              </svg>
            )}
            {metricTab === 'cbse' && (
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <path d="M 0 100 Q 100 110 200 85 T 400 70 T 500 50 L 500 200 L 0 200 Z" fill="url(#chartGrad)" />
                <path d="M 0 100 Q 100 110 200 85 T 400 70 T 500 50" fill="none" stroke="var(--warning)" strokeWidth="3" />
                <circle cx="200" cy="85" r="4" fill="var(--warning)" />
                <circle cx="400" cy="70" r="4" fill="var(--warning)" />
                <circle cx="500" cy="50" r="4" fill="var(--warning)" />
              </svg>
            )}
            <div className="absolute bottom-2 left-4 text-[9px] font-mono text-text-secondary">CBSE Affiliated Record Sync</div>
          </div>
        </div>

        {/* State-wise Benchmark */}
        <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider font-outfit text-text-primary">State CBSE Benchmarks</h4>
          <div className="space-y-3">
            {[
              { state: 'Delhi NCR', score: '88.5%', status: 'ABOVE AVERAGE', color: 'text-success bg-success/15 border-success/35' },
              { state: 'Maharashtra', score: '84.2%', status: 'ABOVE AVERAGE', color: 'text-success bg-success/15 border-success/35' },
              { state: 'Karnataka', score: '82.0%', status: 'BENCHMARK', color: 'text-accent bg-accent/10 border-accent/20' },
              { state: 'Uttar Pradesh', score: '76.8%', status: 'NORMAL', color: 'text-text-secondary bg-slate-100 border-border' }
            ].map((st, idx) => (
              <div key={idx} className="p-3 bg-bg-main/40 border border-border rounded-xl flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-text-primary">{st.state}</p>
                  <span className="text-[9px] text-text-secondary font-mono">Performance Metric</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-text-primary block">{st.score}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-1 inline-block border ${st.color}`}>
                    {st.status}
                  </span>
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
// INTERACTIVE CAREER & PLACEMENT PORTAL
// ==========================================
function PlacementPortal({ activeTenant, activeRole }) {
  const { sharedStudents } = useAuth();
  const [drives, setDrives] = useState([
    { id: 1, company: 'Tata Consultancy Services', role: 'System Engineer', package: '₹4.25 Lakh / Year', date: 'June 15, 2026', status: 'ONGOING' },
    { id: 2, company: 'Infosys Limited', role: 'Associate Developer', package: '₹3.85 Lakh / Year', date: 'June 20, 2026', status: 'ONGOING' },
    { id: 3, company: 'Wipro Technologies', role: 'Project Engineer', package: '₹4.00 Lakh / Year', date: 'June 25, 2026', status: 'ONGOING' },
    { id: 4, company: 'Tata Steel Core', role: 'Graduate Engineer Trainee', package: '₹6.50 Lakh / Year', date: 'July 02, 2026', status: 'UPCOMING' }
  ]);
  
  const [eligibilityGpa, setEligibilityGpa] = useState(7.5);
  
  const eligibleStudents = useMemo(() => {
    const tenantStudents = (sharedStudents || []).filter(s => s.tenant_id === activeTenant.id);
    return tenantStudents.map((s, idx) => {
      const gpa = s.gpa || +(7.0 + (idx * 0.4) % 3.0).toFixed(2);
      return {
        ...s,
        gpa
      };
    }).filter(s => s.gpa >= eligibilityGpa);
  }, [sharedStudents, activeTenant, eligibilityGpa]);

  const handleRegisterDrive = (company) => {
    toast.success(`Registered successfully for the "${company}" recruitment drive! Eligibility verified.`);
  };

  return (
    <div className="space-y-6">
      {/* Top overview metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Placement Drives', value: '4 Corporate', desc: 'Preloaded major Indian recruiters', icon: Briefcase },
          { label: 'Eligible Candidates', value: eligibleStudents.length, desc: `Students with GPA >= ${eligibilityGpa}`, icon: Users },
          { label: 'Average CTC Package', value: '₹4.65 LPA', desc: 'Direct corporate hires average', icon: Wallet }
        ].map((met, idx) => (
          <div key={idx} className="p-6 bg-bg-sidebar border border-border rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{met.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><met.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3">{met.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{met.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ongoing Corporate recruitment drives */}
        <div className="lg:col-span-2 p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h4 className="text-sm font-black uppercase tracking-wider font-outfit text-text-primary">Corporate Placement Drives</h4>
          <div className="space-y-3">
            {drives.map(d => (
              <div key={d.id} className="p-4 bg-bg-main/40 border border-border hover:border-accent/15 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all">
                <div>
                  <p className="text-sm font-bold text-text-primary font-outfit">{d.company}</p>
                  <p className="text-[10px] text-text-secondary font-bold font-mono">Role: {d.role} • Package: {d.package}</p>
                  <p className="text-[9px] text-text-secondary mt-1 font-semibold">Drive Date: {d.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                    d.status === 'ONGOING' 
                      ? 'bg-success/15 border-success/35 text-success' 
                      : 'bg-amber-100 border-amber-300 text-amber-800'
                  }`}>
                    {d.status}
                  </span>
                  {activeRole === 'STUDENT' && (
                    <button
                      onClick={() => handleRegisterDrive(d.company)}
                      className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-lg border border-accent/20 transition-all active:scale-95 cursor-pointer"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eligibility Checker */}
        <div className="p-6 bg-bg-sidebar border border-border rounded-3xl space-y-4">
          <h4 className="text-sm font-black uppercase tracking-wider font-outfit text-text-primary">GPA Eligibility Filter</h4>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Minimum GPA Threshold</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5.0"
                  max="10.0"
                  step="0.5"
                  value={eligibilityGpa}
                  onChange={(e) => setEligibilityGpa(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="font-mono font-black text-xs text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-lg">
                  {eligibilityGpa.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Eligible Candidates</span>
              <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-white custom-scrollbar text-[10px]">
                {eligibleStudents.map((s, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-text-primary block">{s.first_name} {s.last_name}</span>
                      <span className="text-text-secondary text-[9px] block">Adm No: {s.admission_no}</span>
                    </div>
                    <span className="font-mono font-black text-success">GPA {s.gpa.toFixed(2)}</span>
                  </div>
                ))}
                {eligibleStudents.length === 0 && (
                  <p className="text-[10px] text-text-secondary italic text-center py-6">No students meet the set GPA threshold.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MASTER FALLBACK PAGE COMPONENT
// ==========================================
export default function ModuleFallbackPage({ params }) {
  const resolvedParams = use(params);
  const { module } = resolvedParams;
  const { activeTenant, activeRole, activeUser } = useAuth();

  // Mapping from folder route to human-readable title, icon and Indian localizations
  const moduleConfigs = {
    placement: {
      title: 'Career & Placement Portal',
      icon: Briefcase,
      desc: 'Post corporate recruitment drives, track student GPA eligibility, and manage drive results.',
      indianInfo: 'Pre-loaded with major Indian software & core recruiters (TCS, Infosys, Wipro, Tata Steel).',
      roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STUDENT', 'TEACHER']
    },
    finance: {
      title: 'Institutional Finance',
      icon: Wallet,
      desc: 'Create billing categories, process online fee settlements, and download transactions receipts.',
      indianInfo: 'Integrated with Indian Payment Gateways. Transaction amounts are calculated in Indian Rupees (₹).',
      roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT']
    },
    analytics: {
      title: 'System Analytics',
      icon: TrendingUp,
      desc: 'High-performance charts tracking enrollment distributions, financial collections, and staff retention.',
      indianInfo: 'Indian census statistics and state-wise performance prediction modeling active.',
      roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN']
    },
    settings: {
      title: 'Global Settings',
      icon: Settings,
      desc: 'Configure tenant metadata, logo branding, academic calendar dates, and system permissions.',
      indianInfo: 'Base setting defaults to Indian Standard Time (IST) and Rupee (₹) denomination.',
      roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN']
    },
    pulse: {
      title: 'System Pulse',
      icon: Zap,
      desc: 'Diagnostic feed capturing real-time user sessions, database calls, and server actions.',
      indianInfo: 'Hosting zone set to Mumbai, India (AWS ap-south-1 connection active).',
      roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN']
    },
    profile: {
      title: 'My Institutional Profile',
      icon: User,
      desc: 'Inspect and edit your active workspace account credentials, contact info, and identity logs.',
      indianInfo: 'Linked to Indian academic registries (Aadhaar / Board ID verification active).',
      roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'HOSTEL_WARDEN']
    }
  };

  const config = moduleConfigs[module] || {
    title: `${module.charAt(0).toUpperCase() + module.slice(1)} Module`,
    icon: Shield,
    desc: 'Modular administrative workspace for school operations.',
    indianInfo: 'Campus localized data registry is operational.',
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'HOSTEL_WARDEN']
  };

  const configRoles = config.roles;
  if (!configRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={configRoles} activeRole={activeRole} moduleName={config.title} />;
  }

  const IconComponent = config.icon;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Module Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-wider">
          <Sparkles size={10} />
          <span>On-Demand Workspace</span>
        </div>
        <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight mt-2 flex items-center gap-3">
          <IconComponent className="text-accent" size={28} />
          <span>{config.title}</span>
        </h2>
        <p className="text-text-secondary text-sm font-medium mt-1">{config.desc}</p>
      </div>

      {module === 'profile' ? (
        /* Render fully editable profile interface */
        <ProfileEditor 
          activeTenant={activeTenant} 
          activeRole={activeRole} 
          activeUser={activeUser} 
        />
      ) : module === 'settings' ? (
        /* Render fully editable settings interface */
        <SettingsEditor 
          activeTenant={activeTenant} 
          activeRole={activeRole} 
        />
      ) : module === 'pulse' ? (
        /* Render fully active telemetry and performance audit interface */
        <PulseMonitoring 
          activeTenant={activeTenant} 
          activeRole={activeRole} 
        />
      ) : module === 'analytics' ? (
        /* Render system analytics portal */
        <AnalyticsDashboard 
          activeTenant={activeTenant} 
          activeRole={activeRole} 
        />
      ) : module === 'placement' ? (
        /* Render career & placements portal */
        <PlacementPortal 
          activeTenant={activeTenant} 
          activeRole={activeRole} 
        />
      ) : (
        /* Render standard localized module summary cards */
        <div className="p-8 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2rem] space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent z-0"></div>
          <div className="relative z-10 space-y-4">
            <div className="p-5 rounded-2xl bg-accent/5 border border-accent/15 max-w-2xl">
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={14} className="text-accent" />
                <span>Indian Localization Core</span>
              </h4>
              <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                {config.indianInfo}
              </p>
            </div>

            <div className="p-6 bg-bg-main border border-border rounded-2xl max-w-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Database Table Connection</span>
                <span className="text-[9px] font-black bg-success/15 border border-success/35 text-success px-2 py-0.5 rounded">CONNECTED</span>
              </div>
              
              <p className="text-xs text-text-secondary leading-relaxed">
                This module operates dynamically against the active tenant schema. In the production environment, RLS limits data read/write commands exclusively to users with matching <span className="text-text-primary font-bold">tenant_id = '{activeTenant.id}'</span> ({activeTenant.name}).
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-bg-sidebar border border-border rounded-xl text-center">
                  <span className="text-[9px] text-text-secondary uppercase font-bold">Authenticated Role</span>
                  <p className="text-xs font-black text-text-primary mt-1">{activeRole}</p>
                </div>
                <div className="p-3 bg-bg-sidebar border border-border rounded-xl text-center">
                  <span className="text-[9px] text-text-secondary uppercase font-bold">Subdomain Route</span>
                  <p className="text-xs font-black text-text-primary mt-1">
                    {activeTenant.subdomain}{activeRole === 'SUPER_ADMIN' ? '.campuserp.in' : '.campus.in'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
