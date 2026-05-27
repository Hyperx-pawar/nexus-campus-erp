'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Wallet, 
  Zap, 
  Plus, 
  ShieldCheck, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  Trash2,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';

export default function SuperAdminDashboard() {
  const { supabase, availableTenants } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSchool, setNewSchool] = useState({ name: '', subdomain: '', email: '', phone: '' });
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', firstName: '', lastName: '', tenantId: '' });

  // Fetch current schools
  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTenants(data);
    } catch (err) {
      console.error('Failed to fetch tenants:', err?.message || err);
      // Fallback to demo tenants
      setTenants(availableTenants.map(t => ({
        ...t,
        created_at: new Date().toISOString(),
        email: `contact@${t.subdomain}.edu.in`,
        phone: '+91 98765 43210'
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    if (!newSchool.name || !newSchool.subdomain) {
      toast.error('Name and Subdomain are required');
      return;
    }
    try {
      const { data, error } = await supabase.from('tenants').insert([
        {
          name: newSchool.name,
          subdomain: newSchool.subdomain.toLowerCase(),
          email: newSchool.email,
          phone: newSchool.phone
        }
      ]).select();

      if (error) throw error;
      toast.success(`School "${newSchool.name}" successfully onboarded!`);
      setNewSchool({ name: '', subdomain: '', email: '', phone: '' });
      fetchTenants();
    } catch (err) {
      toast.error(err.message || 'Error onboarding school');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.password || !newAdmin.tenantId) {
      toast.error('Email, Password, and Campus selection are required');
      return;
    }
    try {
      // Direct signup with raw_app_meta_data to trigger the profile setup
      const { data, error } = await supabase.auth.signUp({
        email: newAdmin.email,
        password: newAdmin.password,
        options: {
          data: {
            first_name: newAdmin.firstName,
            last_name: newAdmin.lastName,
            role: 'SCHOOL_ADMIN',
            tenant_id: newAdmin.tenantId
          }
        }
      });

      if (error) throw error;
      toast.success(`Admin user "${newAdmin.email}" created and assigned successfully!`);
      setNewAdmin({ email: '', password: '', firstName: '', lastName: '', tenantId: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to create admin user');
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Overview Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Super Admin Portal</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">Global management overview across all registered school campuses.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-100/50 border border-border px-4 py-2.5 rounded-2xl">
          <Activity size={14} className="text-success animate-pulse" />
          <span className="text-[11px] font-black uppercase text-text-secondary tracking-wider">System: ONLINE (India Hub)</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Onboarded Campuses', value: tenants.length, icon: Building2, desc: 'Active colleges/schools' },
          { label: 'Total Faculty Base', value: '480+', icon: Users, desc: 'Across all departments' },
          { label: 'Total Active Students', value: '8,450+', icon: Users, desc: 'Enrolled under Board registries' },
          { label: 'Global Collections', value: '₹4.8 Cr', icon: Wallet, desc: 'This fiscal year' }
        ].map((kpi, idx) => (
          <div key={idx} className="p-6 bg-bg-sidebar border border-border rounded-3xl relative overflow-hidden group hover:border-accent/30 transition-all duration-300">
            <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-accent/5 blur-xl group-hover:bg-accent/15 transition-all"></div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{kpi.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><kpi.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-4">{kpi.value}</p>
            <p className="text-[11px] text-text-secondary mt-1 opacity-65">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Grid: Onboarded Schools & Management Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Schools Registry */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-md border border-border rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-outfit text-text-primary tracking-tight">Onboarded Institutional Campuses</h3>
              <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-1 rounded-md uppercase tracking-wider">Active</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-accent" size={24} /></div>
            ) : (
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="p-4 bg-bg-main border border-border hover:border-accent/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-text-primary">{tenant.name}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-secondary">
                        <span className="font-bold text-accent">{tenant.subdomain}.nexus.in</span>
                        <span className="opacity-40">•</span>
                        <span>{tenant.email || 'No email'}</span>
                        <span className="opacity-40">•</span>
                        <span>{tenant.phone || 'No phone'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase bg-success/15 border border-success/35 text-success px-2 py-0.5 rounded">Operational</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Onboarding Panel Forms */}
        <div className="space-y-6">
          
          {/* Form 1: Onboard New School */}
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-md border border-border rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-text-primary">
              <Building2 size={18} className="text-accent" />
              <h3 className="text-sm font-black uppercase tracking-wider font-outfit">Onboard New School</h3>
            </div>
            <form onSubmit={handleCreateSchool} className="space-y-3">
              <input 
                type="text" 
                placeholder="Institution Name (e.g. DPS Delhi)"
                value={newSchool.name}
                onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                className="w-full text-xs"
              />
              <input 
                type="text" 
                placeholder="Subdomain (e.g. dpsdelhi)"
                value={newSchool.subdomain}
                onChange={(e) => setNewSchool({...newSchool, subdomain: e.target.value})}
                className="w-full text-xs"
              />
              <input 
                type="email" 
                placeholder="Contact Email"
                value={newSchool.email}
                onChange={(e) => setNewSchool({...newSchool, email: e.target.value})}
                className="w-full text-xs"
              />
              <input 
                type="text" 
                placeholder="Contact Phone"
                value={newSchool.phone}
                onChange={(e) => setNewSchool({...newSchool, phone: e.target.value})}
                className="w-full text-xs"
              />
              <button 
                type="submit" 
                className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>Onboard Institution</span>
              </button>
            </form>
          </div>

          {/* Form 2: Create School Admin */}
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-md border border-border rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-text-primary">
              <ShieldCheck size={18} className="text-accent" />
              <h3 className="text-sm font-black uppercase tracking-wider font-outfit">Create School Admin</h3>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <select 
                value={newAdmin.tenantId}
                onChange={(e) => setNewAdmin({...newAdmin, tenantId: e.target.value})}
                className="w-full text-xs bg-bg-main"
              >
                <option value="">Select Campus Target...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="First Name"
                  value={newAdmin.firstName}
                  onChange={(e) => setNewAdmin({...newAdmin, firstName: e.target.value})}
                  className="w-full text-xs"
                />
                <input 
                  type="text" 
                  placeholder="Last Name"
                  value={newAdmin.lastName}
                  onChange={(e) => setNewAdmin({...newAdmin, lastName: e.target.value})}
                  className="w-full text-xs"
                />
              </div>
              <input 
                type="email" 
                placeholder="Admin Email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                className="w-full text-xs"
              />
              <input 
                type="password" 
                placeholder="Admin Password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                className="w-full text-xs"
              />
              <button 
                type="submit" 
                className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck size={14} />
                <span>Onboard School Admin</span>
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
