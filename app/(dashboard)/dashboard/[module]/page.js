'use client';

import RoleGate from '@/components/RoleGate';

import React, { use, useState, useEffect } from 'react';
import { useAuth } from '@/components/Providers';
import { 
  Shield, Sparkles, Building2, ClipboardList, Library, Home, Bus, 
  Briefcase, Wallet, FileBox, Settings, TrendingUp, Award, Zap, Bell, MessageSquare, User, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

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
function SettingsEditor({ activeTenant }) {
  const { updateTenant } = useAuth();
  const [settings, setSettings] = useState({
    name: '',
    subdomain: '',
    board: 'CBSE',
    academicYear: '2026-2027'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTenant) {
      setSettings({
        name: activeTenant.name || '',
        subdomain: activeTenant.subdomain || '',
        board: activeTenant.settings?.board || 'CBSE',
        academicYear: activeTenant.settings?.academicYear || '2026-2027'
      });
    }
  }, [activeTenant]);

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
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
               <Settings size={28} />
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
                  <span className="bg-bg-main border border-l-0 border-border text-[10px] font-bold text-text-secondary px-3 py-3 rounded-r-xl">.nexus.in</span>
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
    indianInfo: 'Nexus localized data registry is operational.',
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
                  <p className="text-xs font-black text-text-primary mt-1">{activeTenant.subdomain}.nexus.in</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
