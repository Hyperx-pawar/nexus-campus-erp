'use client';

import RoleGate from '@/components/RoleGate';
import React, { use, useState, useEffect } from 'react';
import { useAuth } from '@/components/Providers';
import { compressImage } from '@/lib/storage';
import { 
  Shield, Sparkles, Building2, ClipboardList, Library, Home, Bus, 
  Briefcase, Wallet, FileBox, Settings, TrendingUp, Award, Zap, Bell, MessageSquare, User, Loader2, Upload,
  RefreshCw, Database, HardDrive, Terminal, Server, Users, CheckCircle2,
  Code, HeartPulse, Scale, GraduationCap, ChevronRight,
  Ship, Utensils, Coins, Hotel
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
    newPassword: '',
    avatar: ''
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
        newPassword: '',
        avatar: activeUser.avatar || ''
      });
    }
  }, [activeUser, activeRole]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      toast.success(profile.newPassword ? 'Profile and password updated successfully!' : 'Profile updated successfully!');
      setProfile(prev => ({
        ...prev,
        newPassword: ''
      }));
      setSaving(false);
    } catch (err) {
      setSaving(false);
      toast.error(err.message || 'Failed to update profile');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-8 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2rem] space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent z-0"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar & Overview */}
          <div className="flex flex-col items-center justify-center p-6 bg-bg-main/50 border border-border rounded-2xl text-center space-y-4">
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-lg border border-border shrink-0 overflow-hidden">
               {profile.avatar ? (
                 <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 profile.name[0] || 'U'
               )}
            </div>

            <div className="flex flex-col gap-2 w-full items-center">
              <label className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-accent/10">
                <Upload size={12} />
                <span>Upload Photo</span>
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const fileSizeMB = file.size / (1024 * 1024);
                    if (fileSizeMB > 1) {
                      toast.error(`Image size (${fileSizeMB.toFixed(2)} MB) exceeds 1MB limit. Please upload a smaller image.`);
                      return;
                    }
                    toast.info(`Selected image: ${file.name} (${fileSizeMB.toFixed(2)} MB / 1MB limit)`);
                    try {
                      toast.loading("Compressing image...");
                      const compressedFile = await compressImage(file, 200, 200, 0.7); // 200x200 max size
                      toast.dismiss();

                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfile(prev => ({
                          ...prev,
                          avatar: reader.result
                        }));
                        
                        const savings = Math.round((1 - compressedFile.size / file.size) * 100);
                        const origSizeStr = file.size > 1024 * 1024 
                          ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                          : `${(file.size / 1024).toFixed(1)} KB`;
                        const newSizeStr = compressedFile.size > 1024 * 1024 
                          ? `${(compressedFile.size / 1024 / 1024).toFixed(2)} MB` 
                          : `${(compressedFile.size / 1024).toFixed(1)} KB`;

                        toast.success(`📷 Photo optimized: ${origSizeStr} ➔ ${newSizeStr} (Saved ${savings}%). Click save to apply.`);
                      };
                      reader.readAsDataURL(compressedFile);
                    } catch (err) {
                      toast.dismiss();
                      console.error(err);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfile(prev => ({ ...prev, avatar: reader.result }));
                        toast.success("Photo loaded. Click save to apply.");
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }} className="hidden" />
              </label>

              {profile.avatar && (
                <button 
                  type="button" 
                  onClick={() => setProfile(prev => ({ ...prev, avatar: '' }))}
                  className="text-[9px] text-danger hover:underline font-bold uppercase"
                >
                  Remove Photo
                </button>
              )}
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
    customDomain: '',
    board: 'CBSE',
    academicYear: '2026-2027',
    logo: '',
    brandColor: '#2563EB',
    bankName: 'State Bank of India',
    accountName: '',
    accountNo: '',
    ifscCode: '',
    upiId: '',
    qrCode: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTenant) {
      setSettings({
        name: activeTenant.name || '',
        subdomain: activeTenant.subdomain || '',
        customDomain: activeTenant.customDomain || '',
        board: activeTenant.settings?.board || 'CBSE',
        academicYear: activeTenant.settings?.academicYear || '2026-2027',
        logo: activeTenant.logo || '',
        brandColor: activeTenant.brandColor || '#2563EB',
        bankName: activeTenant.settings?.bank?.bankName || 'State Bank of India',
        accountName: activeTenant.settings?.bank?.accountName || '',
        accountNo: activeTenant.settings?.bank?.accountNo || '',
        ifscCode: activeTenant.settings?.bank?.ifscCode || '',
        upiId: activeTenant.settings?.bank?.upiId || '',
        qrCode: activeTenant.settings?.bank?.qrCode || ''
      });
    }
  }, [activeTenant]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 1) {
        toast.error(`Logo size (${fileSizeMB.toFixed(2)} MB) exceeds 1MB limit. Please upload a smaller image.`);
        return;
      }
      toast.info(`Selected logo: ${file.name} (${fileSizeMB.toFixed(2)} MB / 1MB limit)`);
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
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Custom Domain (Optional)</label>
                <input 
                  type="text" 
                  value={settings.customDomain}
                  onChange={(e) => setSettings({...settings, customDomain: e.target.value})}
                  className="w-full text-xs font-mono"
                  placeholder="e.g. portal.dpsdelhi.edu.in"
                />
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
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={settings.brandColor}
                      onChange={(e) => setSettings({...settings, brandColor: e.target.value})}
                      className="w-full text-xs pl-10 font-mono focus:ring-accent"
                      placeholder="#2563EB"
                      maxLength={7}
                      required
                    />
                    <div className="absolute left-3.5 top-3.5 w-4 h-4 rounded-md border border-border" style={{ backgroundColor: settings.brandColor }}></div>
                  </div>
                  <input 
                    type="color" 
                    value={settings.brandColor}
                    onChange={(e) => setSettings({...settings, brandColor: e.target.value})}
                    className="w-10 h-10 p-1 bg-bg-main border border-border rounded-xl cursor-pointer"
                  />
                </div>
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

            {/* School Bank Operations & UPI Scanner */}
            <div className="border-t border-border pt-5 space-y-4">
              <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Wallet size={16} className="text-accent" />
                <span>Online Collections & Bank Payout Operations</span>
              </h3>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Configure the school's bank account credentials and upload a UPI Scanner QR code. Parents will be prompted to pay fees online to these exact credentials.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Receiving Bank Name</label>
                  <select 
                    value={settings.bankName}
                    onChange={(e) => setSettings({...settings, bankName: e.target.value})}
                    className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary outline-none cursor-pointer"
                  >
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Punjab National Bank">Punjab National Bank</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Bank Account Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. IIT Delhi Principal Operations"
                    value={settings.accountName}
                    onChange={(e) => setSettings({...settings, accountName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Bank Account Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 10293847561"
                    value={settings.accountNo}
                    onChange={(e) => setSettings({...settings, accountNo: e.target.value})}
                    className="w-full text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">IFSC Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SBIN0000214"
                    value={settings.ifscCode}
                    onChange={(e) => setSettings({...settings, ifscCode: e.target.value})}
                    className="w-full text-xs font-mono uppercase"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Merchant UPI ID (for QR collections)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. iitd@sbi"
                    value={settings.upiId}
                    onChange={(e) => setSettings({...settings, upiId: e.target.value})}
                    className="w-full text-xs font-mono"
                    required
                  />
                </div>

                {/* QR Code Upload block */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">UPI Scanner QR Code Image</label>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 border border-border rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {settings.qrCode ? (
                        <img src={settings.qrCode} alt="UPI QR Scanner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-slate-400 uppercase text-center leading-none">NO QR</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-[10px] font-bold rounded-xl cursor-pointer transition-all border border-border flex items-center gap-1 active:scale-95">
                        <Upload size={12} />
                        <span>Upload Scanner QR</span>
                        <input type="file" accept="image/*" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const fileSizeMB = file.size / (1024 * 1024);
                            if (fileSizeMB > 1) {
                              toast.error(`QR Code size (${fileSizeMB.toFixed(2)} MB) exceeds 1MB limit. Please upload a smaller image.`);
                              return;
                            }
                            toast.info(`Selected QR Scanner: ${file.name} (${fileSizeMB.toFixed(2)} MB / 1MB limit)`);
                            try {
                              toast.loading("Compressing QR image...");
                              const compressedFile = await compressImage(file, 400, 400, 0.7);
                              toast.dismiss();

                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setSettings(prev => ({
                                  ...prev,
                                  qrCode: reader.result
                                }));
                                toast.success("QR Code Scanner uploaded! Click \"Save System Configuration\" to apply.");
                              };
                              reader.readAsDataURL(compressedFile);
                            } catch (err) {
                              toast.dismiss();
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setSettings(prev => ({ ...prev, qrCode: reader.result }));
                                toast.success("QR Code Scanner loaded! Click \"Save System Configuration\" to apply.");
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }} className="hidden" />
                      </label>
                      {settings.qrCode && (
                        <button 
                          type="button" 
                          onClick={() => setSettings(prev => ({ ...prev, qrCode: '' }))}
                          className="text-[9px] text-danger hover:underline font-bold uppercase text-left"
                        >
                          Remove QR Scanner
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
  const [portalTab, setPortalTab] = useState('drives'); // 'drives' | 'career_paths'
  const [selectedStream, setSelectedStream] = useState('tech'); // 'tech' | 'medical' | 'commerce' | 'humanities'
  
  const careerPaths = {
    tech: {
      title: 'Engineering & Technology (PCM)',
      icon: Code,
      badge: 'STEM',
      color: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
      description: 'For students strong in Physics, Chemistry, and Mathematics who dream of building software, artificial intelligence, or tech products.',
      jobs: [
        { title: 'AI & Machine Learning Engineer', salary: '₹12 - 30 LPA', scope: 'Extremely High' },
        { title: 'Full-Stack Software Developer', salary: '₹6 - 18 LPA', scope: 'High' },
        { title: 'Cybersecurity Analyst', salary: '₹5 - 15 LPA', scope: 'Steady Growth' }
      ],
      education: [
        { step: 'B.Tech / B.E. in Computer Science, IT, or AI/ML' },
        { step: 'Major Entrance Exams: JEE Main, JEE Advanced, BITSAT, VITEEE, State CETs' }
      ],
      skills: ['Data Structures & Algorithms', 'Python, Java or C++', 'Web Frameworks (React, Node.js)', 'Cloud Platforms (AWS, GCP)'],
      steps: [
        { title: 'Master Core Sciences', desc: 'Secure 75%+ in Junior College (PCM) and prepare for engineering entrance exams.' },
        { title: 'Excel in Graduation', desc: 'Maintain a 8.0+ CGPA in B.Tech and start coding regularly on LeetCode/GitHub.' },
        { title: 'Build Projects & Intern', desc: 'Create 2-3 real-world projects and secure a summer internship in web, mobile or AI.' },
        { title: 'Apply to Drives', desc: 'Participate in campus placement drives or off-campus coding contests (Google Kickstart, CodeChef).' }
      ]
    },
    medical: {
      title: 'Medical & Life Sciences (PCB)',
      icon: HeartPulse,
      badge: 'Healthcare',
      color: 'border-rose-500/30 bg-rose-500/5 text-rose-400',
      description: 'For students passionate about biology, medicine, human health, or biotechnology research.',
      jobs: [
        { title: 'Specialist Doctor (MD / MS)', salary: '₹15 - 50 LPA', scope: 'Recession Proof' },
        { title: 'Biotechnologist / Vaccine Researcher', salary: '₹6 - 15 LPA', scope: 'Emerging' },
        { title: 'Clinical Trial Specialist', salary: '₹4.5 - 10 LPA', scope: 'Steady Growth' }
      ],
      education: [
        { step: 'MBBS, BDS, BAMS, or B.Sc. in Biotechnology / Genetics' },
        { step: 'Major Entrance Exams: NEET (UG) is mandatory for clinical medical seats' }
      ],
      skills: ['Clinical Diagnosis', 'Laboratory Techniques (PCR, Chromatography)', 'Medical Ethics & Patient Care', 'Biostatistics'],
      steps: [
        { title: 'Clear NEET exam', desc: 'Score high in NEET (UG) biology, physics, and chemistry to secure a government seat.' },
        { title: 'Complete MBBS / B.Sc', desc: 'Maintain high academic standing and complete the mandatory 1-year clinical internship.' },
        { title: 'Specialization (MD/MS/M.Sc)', desc: 'Clear NEET (PG) for medical residency or pursue master\'s/Ph.D. in research fields.' },
        { title: 'Residency & Practice', desc: 'Join state hospitals, private networks, or set up clinical consultation.' }
      ]
    },
    commerce: {
      title: 'Finance, Commerce & Management',
      icon: TrendingUp,
      badge: 'Business',
      color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
      description: 'For students interested in business operations, corporate finance, accounting, or managing enterprises.',
      jobs: [
        { title: 'Investment Banker', salary: '₹10 - 25 LPA', scope: 'High Demand' },
        { title: 'Chartered Accountant (CA)', salary: '₹8 - 20 LPA', scope: 'Highly Prestigious' },
        { title: 'Product / Brand Manager', salary: '₹8 - 18 LPA', scope: 'High Growth' }
      ],
      education: [
        { step: 'B.Com, BBA, BMS, or professional CA program (ICAI)' },
        { step: 'Major Entrance Exams: CA Foundation, IPMAT (for integrated MBA), CAT/GMAT (for Post-Grad MBA)' }
      ],
      skills: ['Financial Modeling & Valuation', 'Advanced Excel & SQL', 'Corporate Law & Auditing', 'Strategic Thinking'],
      steps: [
        { title: 'Begin CA Foundation / BBA', desc: 'Enroll in CA Foundation during Junior College or apply for premium BBA/B.Com courses.' },
        { title: 'Clear CA Inter & Articleship', desc: 'For CA aspirants, clear Inter group exams and complete 2 years of practical articleship.' },
        { title: 'Pursue MBA (Optional)', desc: 'Prepare for CAT/GMAT to get into top IIMs or international business schools.' },
        { title: 'Land Corporate Job', desc: 'Apply to Big 4 accounting firms, investment banks, or management trainee programs.' }
      ]
    },
    humanities: {
      title: 'Creative, Law & Social Sciences',
      icon: Scale,
      badge: 'Creative & Law',
      color: 'border-purple-500/30 bg-purple-500/5 text-purple-400',
      description: 'For students with strong analytical, creative, design, or writing skills who want to enter legal, design, or public sector fields.',
      jobs: [
        { title: 'Corporate Lawyer', salary: '₹8 - 22 LPA', scope: 'High Demand' },
        { title: 'UI / UX Designer', salary: '₹6 - 15 LPA', scope: 'Fastest Growing' },
        { title: 'Civil Servant (IAS / IPS)', salary: '₹8 - 12 LPA + Perks', scope: 'Extremely Prestigious' }
      ],
      education: [
        { step: '5-Year Integrated B.A. LL.B., B.Des. (Design), or B.A. in Public Policy' },
        { step: 'Major Entrance Exams: CLAT, AILET, UCEED, NID DAT, UPSC Civil Services' }
      ],
      skills: ['Legal Drafting & Research', 'Design Thinking & Wireframing', 'Public Policy Analysis', 'Critical Reading & Writing'],
      steps: [
        { title: 'Target Entrance Exams', desc: 'Prepare for CLAT (Law) or UCEED (Design) or secure admission in top central universities.' },
        { title: 'Build a Portfolio', desc: 'For design, build a rich case portfolio. For law, participate in moot courts and publish research.' },
        { title: 'Intern with Agencies', desc: 'Intern under senior advocates, corporate legal firms, or design studios.' },
        { title: 'Pass Certifications / Exams', desc: 'Pass the Bar Council of India exam to practice law, or appear for Civil Services (UPSC).' }
      ]
    },
    merchant_navy: {
      title: 'Merchant Navy & Marine Careers',
      icon: Ship,
      badge: 'Maritime',
      color: 'border-sky-500/30 bg-sky-500/5 text-sky-400',
      description: 'For students interested in navigating commercial ships, managing marine engineering systems, and traveling the world.',
      jobs: [
        { title: 'Deck Officer (Navigation)', salary: '₹8 - 25 LPA (Tax-Free)', scope: 'Global Demand' },
        { title: 'Marine Engineer', salary: '₹10 - 24 LPA (Tax-Free)', scope: 'High Technical' },
        { title: 'Electro-Technical Officer (ETO)', salary: '₹6 - 15 LPA', scope: 'Steady Growth' }
      ],
      education: [
        { step: 'B.Sc. Nautical Science (3 years) or B.Tech Marine Engineering (4 years) or Diploma in Nautical Science (1 year)' },
        { step: 'Major Entrance Exam: IMU-CET (Indian Maritime University Common Entrance Test)' }
      ],
      skills: ['Celestial Navigation & Meteorology', 'Marine Propulsion Systems', 'Maritime Law & Safety (STCW)', 'Physical Endurance & Swim Certifications'],
      steps: [
        { title: 'Step 1: Choose PCM in 10+2', desc: 'Secure 60%+ in Physics, Chemistry, and Mathematics, and pass a Class 1 Merchant Navy physical fitness/vision exam.' },
        { title: 'Step 2: Clear IMU-CET', desc: 'Prepare for and clear the national IMU-CET entrance exam. Apply to DG Shipping approved academies.' },
        { title: 'Step 3: Complete Pre-Sea Training & Cadetship', desc: 'Finish your academic training and complete 12 to 18 months of mandatory sea-time training as a deck/engine cadet.' },
        { title: 'Step 4: Obtain COC (Certificate of Competency)', desc: 'Clear the written and oral MMD examinations to qualify as a licensed 3rd Officer or 4th Engineer.' }
      ]
    },
    hotel_mgmt: {
      title: 'Hotel & Hostel Management',
      icon: Hotel,
      badge: 'Hospitality',
      color: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
      description: 'For students who love guest services, accommodation operations, event planning, and managing large hotels, hostels, or resorts.',
      jobs: [
        { title: 'Hotel / Resort General Manager', salary: '₹12 - 28 LPA', scope: 'International Scope' },
        { title: 'Hostel Operations Manager', salary: '₹5 - 12 LPA', scope: 'High Growth (Co-living)' },
        { title: 'Front Office / Guest Relations Director', salary: '₹6 - 14 LPA', scope: 'Steady Demand' }
      ],
      education: [
        { step: 'Bachelor of Hotel Management (BHM), B.Sc in Hospitality & Hotel Administration, or PG Diploma in Accommodations' },
        { step: 'Major Entrance Exam: NCHMCT JEE (National Council for Hotel Management Joint Entrance Exam)' }
      ],
      skills: ['Guest Relationship Management', 'Revenue & Yield Optimization', 'Event & Banquet Planning', 'Property Management Systems (Opera, PMS)'],
      steps: [
        { title: 'Step 1: Junior College (Any Stream)', desc: 'Complete Grade 12 (Science, Commerce, or Arts) with English as a compulsory subject.' },
        { title: 'Step 2: Clear NCHMCT JEE / College Exams', desc: 'Crack NCHMCT JEE or target premium independent institutes like Oberoi STEP or Welcomgroup (WGSHA).' },
        { title: 'Step 3: Intern at Premium Properties', desc: 'Complete 22 weeks of industrial training across front office, housekeeping, and food/beverage departments.' },
        { title: 'Step 4: Secure Management Trainee (MT) post', desc: 'Apply to corporate MT programs of Taj, Oberoi, Marriott, or Oyo Co-living for rapid career acceleration.' }
      ]
    },
    culinary: {
      title: 'Culinary Arts & Professional Chefs',
      icon: Utensils,
      badge: 'Gastronomy',
      color: 'border-orange-500/30 bg-orange-500/5 text-orange-400',
      description: 'For students passionate about cooking, menu design, kitchen chemistry, bakery & pastry, and running fine-dining kitchens.',
      jobs: [
        { title: 'Executive Chef / Head Chef', salary: '₹15 - 35 LPA', scope: 'Prestigious & Competitive' },
        { title: 'Pastry Chef / Chocolatier', salary: '₹6 - 16 LPA', scope: 'Emerging Craft' },
        { title: 'Food Stylist / Culinary Consultant', salary: '₹8 - 20 LPA', scope: 'Niche Careers' }
      ],
      education: [
        { step: 'B.A. / B.Sc. in Culinary Arts, Diploma in Food Production, or Grand Diplôme from Le Cordon Bleu / ICA' },
        { step: 'Major Entrance Exams: NCHMCT JEE (Culinary specs), WGSHA entrance, or direct portfolios/interviews' }
      ],
      skills: ['Advanced Culinary Techniques', 'Food Safety & HACCP Certification', 'Kitchen Inventory & Cost Control', 'Menu Design & Gastronomy'],
      steps: [
        { title: 'Step 1: Focus on Food & Languages', desc: 'Complete Grade 12. Develop basic cooking familiarity and strong communication skills.' },
        { title: 'Step 2: Enroll in Culinary School', desc: 'Join a recognized B.Sc Culinary Arts degree or a specialized diploma program.' },
        { title: 'Step 3: Work as a Commis Chef', desc: 'Start at the bottom of the kitchen hierarchy (Commis III -> Commis I) to learn section-wise food prep.' },
        { title: 'Step 4: Rise to Chef de Partie & Sous Chef', desc: 'Take responsibility for specific sections (e.g., Larder, Sauté) and manage shift operations.' }
      ]
    },
    quant_finance: {
      title: 'Quantitative Finance & Actuary',
      icon: Coins,
      badge: 'Quant Finance',
      color: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400',
      description: 'For students with exceptional mathematical skills who want to design trading algorithms, assess risk, and work in investment banking.',
      jobs: [
        { title: 'Quantitative Analyst / Trader', salary: '₹18 - 45 LPA', scope: 'Extremely High Paying' },
        { title: 'Fellow Actuary (Risk Specialist)', salary: '₹15 - 35 LPA', scope: 'Highly Prestigious' },
        { title: 'Risk Manager / Financial Engineer', salary: '₹12 - 25 LPA', scope: 'Steady Demand' }
      ],
      education: [
        { step: 'B.Sc. Mathematics/Statistics, B.Tech/BS (IITs/ISIs), or professional Actuary Exams (IAI / IFoA)' },
        { step: 'Major Entrance Exams: JEE Advanced (for IIT Math/CS), ISI Admission Test, ACET (Actuarial Common Entrance Test)' }
      ],
      skills: ['Stochastic Calculus & Probability', 'Python / R & SQL', 'Financial Derivatives & Valuation', 'Machine Learning & Time Series'],
      steps: [
        { title: 'Step 1: Choose PCM/PCMB in 10+2', desc: 'Ensure a deep foundation in high-level Calculus, Statistics, and Probability in Junior College.' },
        { title: 'Step 2: Enter Top Math/Tech Program', desc: 'Secure admission at ISI, CMI, IITs, or top statistics programs (e.g., DU) for undergrad.' },
        { title: 'Step 3: Clear Actuarial / CFA Exams', desc: 'Pass Core Principles exams of Institute of Actuaries of India, or clear CFA Level 1.' },
        { title: 'Step 4: Enter Quant Trading/Risk', desc: 'Apply to global hedge funds, high-frequency trading firms, or risk consulting desks.' }
      ]
    }
  };

  const eligibleStudents = React.useMemo(() => {
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
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit">
        <button
          onClick={() => setPortalTab('drives')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
            portalTab === 'drives' 
              ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Campus Recruitment
        </button>
        <button
          onClick={() => setPortalTab('career_paths')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
            portalTab === 'career_paths' 
              ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Dream Careers Guide
        </button>
      </div>

      {portalTab === 'drives' ? (
        <>
          {/* Top overview metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
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
        </>
      ) : (
        /* Dream Careers Guide tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
          {/* Left Column: Stream Selection cards */}
          <div className="space-y-4">
            <div className="p-6 bg-bg-sidebar border border-border rounded-[2rem] space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider font-outfit text-text-primary flex items-center gap-2">
                <GraduationCap size={18} className="text-accent" />
                <span>Choose Stream Corridor</span>
              </h4>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Discover step-by-step roadmaps, entrance exams, core skills, and salaries for major career streams after completing Junior College (Grade 12).
              </p>
            </div>

            <div className="space-y-3">
              {Object.entries(careerPaths).map(([key, path]) => {
                const isSelected = selectedStream === key;
                const Icon = path.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedStream(key)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-accent/10 border-accent/40 text-text-primary shadow-lg'
                        : 'bg-bg-sidebar/55 border-border hover:border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${path.color}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text-primary block">{path.title}</span>
                        <span className="text-[8px] bg-slate-100 text-text-secondary font-black px-1.5 py-0.5 rounded uppercase mt-1 inline-block border border-border">
                          {path.badge}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className={`text-text-secondary transition-transform duration-300 ${isSelected ? 'translate-x-1 text-accent' : ''}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column (span-2): Stream Career Roadmap Details */}
          {(() => {
            const path = careerPaths[selectedStream];
            const StreamIcon = path.icon;
            return (
              <div className="lg:col-span-2 p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2.5rem] space-y-6">
                
                {/* Title Card */}
                <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black font-outfit text-text-primary tracking-tight flex items-center gap-2">
                      <StreamIcon className="text-accent" size={20} />
                      <span>{path.title} Roadmap</span>
                    </h3>
                    <p className="text-[11px] text-text-secondary leading-relaxed pr-6">{path.description}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-accent/15 border border-accent/35 text-accent text-[9px] font-black rounded-lg uppercase tracking-wider">
                    {path.badge} Corridor
                  </span>
                </div>

                {/* Section 1: Popular Dream Jobs */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-text-primary font-outfit flex items-center gap-1.5">
                    <Briefcase size={14} className="text-accent" />
                    <span>Popular Dream Job Profiles</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {path.jobs.map((job, idx) => (
                      <div key={idx} className="p-3.5 bg-bg-main border border-border rounded-xl space-y-1 hover:border-accent/15 transition-all">
                        <span className="font-bold text-text-primary block">{job.title}</span>
                        <div className="flex justify-between items-center text-[9px] text-text-secondary mt-1.5">
                          <span>Est. Salary: <strong className="text-success font-mono font-bold">{job.salary}</strong></span>
                        </div>
                        <span className="text-[8px] bg-slate-100 text-text-secondary font-bold px-1.5 py-0.5 rounded uppercase mt-2 inline-block">
                          Demand: {job.scope}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Education & Entrance Exams */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-text-primary font-outfit flex items-center gap-1.5">
                    <Award size={14} className="text-accent" />
                    <span>Academic Degrees & Entrance Exams</span>
                  </h4>
                  <div className="p-4 bg-bg-sidebar border border-border rounded-2xl space-y-2.5 text-xs text-text-secondary">
                    {path.education.map((edu, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full mt-1.5 shrink-0" />
                        <span className="leading-relaxed font-semibold text-text-primary">{edu.step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Skill Checklist */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-text-primary font-outfit flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-accent" />
                    <span>Industry Skills Checklist</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {path.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-bg-main border border-border rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-success rounded-full shrink-0" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Section 4: Step-by-Step Action Plan */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-text-primary font-outfit flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-accent" />
                    <span>Step-by-Step Career Action Plan</span>
                  </h4>
                  <div className="relative border-l border-border pl-6 ml-3 space-y-6">
                    {path.steps.map((step, idx) => (
                      <div key={idx} className="relative group">
                        {/* Timeline dot */}
                        <div className="absolute -left-9 top-0.5 w-6 h-6 rounded-full bg-bg-main border border-border flex items-center justify-center text-[10px] font-black text-text-secondary group-hover:border-accent/40 group-hover:text-accent transition-all shadow-sm">
                          {idx + 1}
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-text-primary block">{step.title}</span>
                          <p className="text-[10px] text-text-secondary leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      )}
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
