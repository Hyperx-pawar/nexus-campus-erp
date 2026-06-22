'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Video, Calendar, Clock, Plus, Search, User, Tv, 
  Users, CheckCircle2, AlertCircle, X, ChevronRight, 
  Sparkles, Laptop, BookOpen, GraduationCap, Play, Lock
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

export default function VirtualClassroomPage() {
  const { 
    activeRole, 
    activeTenant, 
    activeUser,
    sharedClasses, 
    sharedSubjects, 
    sharedStaff,
    sharedStudents,
    sharedVirtualClasses,
    setSharedVirtualClasses,
    setSharedNotifications
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null); // Currently open meeting IFrame
  
  // Schedule Form State
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    topic: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    duration: '45'
  });

  const isAdmin = activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN';
  const isTeacher = activeRole === 'TEACHER';

  // Find staff record for teacher to restrict access
  const teacherRecord = useMemo(() => {
    if (!isTeacher) return null;
    return (sharedStaff || []).find(
      s => s.tenant_id === activeTenant?.id && s.first_name && activeUser?.name?.includes(s.first_name)
    );
  }, [isTeacher, sharedStaff, activeTenant, activeUser]);

  // Find student record to restrict to their own class
  const studentRecord = useMemo(() => {
    if (activeRole !== 'STUDENT') return null;
    return (sharedStudents || []).find(
      s => s.tenant_id === activeTenant?.id && s.email === activeUser?.email
    ) || (sharedStudents || []).find(s => s.tenant_id === activeTenant?.id);
  }, [activeRole, sharedStudents, activeTenant, activeUser]);

  // Filter subjects available for scheduling
  const availableSubjects = useMemo(() => {
    if (!activeTenant) return [];
    return (sharedSubjects || []).filter(s => {
      if (s.tenant_id !== activeTenant.id) return false;
      // Teachers can only schedule their assigned subjects
      if (isTeacher && teacherRecord) {
        return s.teacher_id === teacherRecord.id;
      }
      return true;
    });
  }, [sharedSubjects, activeTenant, isTeacher, teacherRecord]);

  // Filter classes available for scheduling
  const availableClasses = useMemo(() => {
    if (!activeTenant) return [];
    return (sharedClasses || []).filter(c => c.tenant_id === activeTenant.id);
  }, [sharedClasses, activeTenant]);

  // Filter schedules visible to the current user
  const visibleSchedules = useMemo(() => {
    if (!activeTenant) return [];
    return (sharedVirtualClasses || []).filter(vc => {
      if (vc.tenantId !== activeTenant.id) return false;
      
      // Student can only see classes for their own Class/Grade
      if (activeRole === 'STUDENT' && studentRecord) {
        return vc.classId === studentRecord.class_id;
      }
      // Teacher can only see classes they teach
      if (isTeacher && teacherRecord) {
        return vc.teacherId === teacherRecord.id;
      }
      return true;
    });
  }, [sharedVirtualClasses, activeTenant, activeRole, studentRecord, isTeacher, teacherRecord]);

  // Apply search query
  const filteredSchedules = useMemo(() => {
    return visibleSchedules.filter(vc => {
      const subject = (sharedSubjects || []).find(s => s.id === vc.subjectId);
      const topicMatches = vc.topic.toLowerCase().includes(searchQuery.toLowerCase());
      const subjectMatches = subject ? subject.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      return topicMatches || subjectMatches;
    });
  }, [visibleSchedules, sharedSubjects, searchQuery]);

  // Compute metrics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayClasses = visibleSchedules.filter(c => c.date === todayStr);
    return {
      todayCount: todayClasses.length,
      liveCount: todayClasses.filter(c => c.status === 'LIVE').length,
      completedCount: visibleSchedules.filter(c => c.status === 'COMPLETED').length
    };
  }, [visibleSchedules]);

  // Update subjects in form when class changes
  const filteredFormSubjects = useMemo(() => {
    if (!formData.classId) return [];
    return availableSubjects.filter(s => s.class_id === formData.classId);
  }, [formData.classId, availableSubjects]);

  // Schedule a new online class
  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!formData.classId || !formData.subjectId || !formData.topic) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const durationNum = Number(formData.duration);
    const [hours, minutes] = formData.startTime.split(':').map(Number);
    const startMins = hours * 60 + minutes;
    const endMins = startMins + durationNum;
    const endHours = Math.floor(endMins / 60) % 24;
    const endMinutes = endMins % 60;
    const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    // Unique Jitsi meeting room name with strict Tenant isolation prefix
    const meetingRoom = `nexus-meet-${activeTenant.id}-${formData.subjectId}-${formData.classId}-${Date.now()}`;

    const newClass = {
      id: `meet-${Date.now()}`,
      subjectId: formData.subjectId,
      classId: formData.classId,
      teacherId: isTeacher ? (teacherRecord?.id || 'staff-1') : 'staff-1',
      topic: formData.topic,
      date: formData.date,
      startTime: formData.startTime,
      endTime: endTimeStr,
      meetingRoom,
      status: 'SCHEDULED',
      tenantId: activeTenant.id
    };

    setSharedVirtualClasses(prev => [newClass, ...(prev || [])]);

    // Send notifications to the class students & parents
    const targetClass = (sharedClasses || []).find(c => c.id === formData.classId);
    const targetSubject = (sharedSubjects || []).find(s => s.id === formData.subjectId);
    
    if (setSharedNotifications) {
      const notification = {
        id: `notif-class-${Date.now()}`,
        tenant_id: activeTenant.id,
        recipient_id: 'parent-1', // Target notification group
        type: 'VIRTUAL_CLASS',
        title: `📅 Online Class Scheduled: ${targetSubject?.name || 'Class'}`,
        body: `Virtual lecture on "${formData.topic}" scheduled for ${formData.date} at ${formData.startTime}.`,
        date: formData.date,
        read: false
      };
      setSharedNotifications(prev => [notification, ...(prev || [])]);
    }

    toast.success(`Online lecture scheduled successfully! Notification dispatched to students.`);
    setShowScheduleModal(false);
    setFormData({
      classId: '',
      subjectId: '',
      topic: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      duration: '45'
    });
  };

  // Start Session (Teacher)
  const handleStartSession = (meeting) => {
    // Set status to LIVE
    setSharedVirtualClasses(prev => 
      prev.map(c => c.id === meeting.id ? { ...c, status: 'LIVE' } : c)
    );

    // Notify students real-time
    const subject = (sharedSubjects || []).find(s => s.id === meeting.subjectId);
    if (setSharedNotifications) {
      const alertNotif = {
        id: `notif-live-${Date.now()}`,
        tenant_id: activeTenant.id,
        recipient_id: 'parent-1',
        type: 'VIRTUAL_CLASS',
        title: `⚡ Live Class Started: ${subject?.name || 'Subject'}`,
        body: `Instructor has started the virtual lecture on "${meeting.topic}". Join now!`,
        date: new Date().toISOString().split('T')[0],
        read: false
      };
      setSharedNotifications(prev => [alertNotif, ...(prev || [])]);
    }

    setActiveMeeting({ ...meeting, status: 'LIVE' });
    toast.success(`Virtual lecture room created. You are now LIVE!`);
  };

  // Join Session (Student)
  const handleJoinSession = (meeting) => {
    setActiveMeeting(meeting);
    toast.success(`Connected to virtual classroom.`);
  };

  // End Session (Teacher)
  const handleEndSession = (meetingId) => {
    setSharedVirtualClasses(prev => 
      prev.map(c => c.id === meetingId ? { ...c, status: 'COMPLETED' } : c)
    );
    setActiveMeeting(null);
    toast.info(`Virtual lecture session closed and completed.`);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      
      {/* Active IFrame Meeting Mode */}
      {activeMeeting ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl animate-pulse">
                <Video size={18} />
              </div>
              <div>
                <h3 className="text-base font-black font-outfit text-white tracking-tight">{activeMeeting.topic}</h3>
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest block mt-0.5">
                  {((sharedSubjects || []).find(s => s.id === activeMeeting.subjectId))?.name} • 
                  {((sharedClasses || []).find(c => c.id === activeMeeting.classId))?.name}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 text-[9px] font-black uppercase rounded-lg tracking-wider animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                <span>Live Broadcast</span>
              </span>
              
              {(isTeacher || isAdmin) ? (
                <button
                  onClick={() => handleEndSession(activeMeeting.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-900/10 active:scale-95"
                >
                  End Lecture
                </button>
              ) : (
                <button
                  onClick={() => setActiveMeeting(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                >
                  Leave Lecture
                </button>
              )}
            </div>
          </div>

          {/* Embedded WebRTC IFrame */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
            <iframe
              src={`https://p2p.mirotalk.com/join?room=${activeMeeting.meetingRoom}&name=${encodeURIComponent(activeUser?.name || 'Nexus User')}`}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write; web-share"
              className="w-full h-full min-h-[600px]"
              frameBorder="0"
              allowFullScreen
            />
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            💡 <b>Virtual Class Toolkit</b>: Screen sharing, interactive whiteboard, participant text chat, and raised hands are fully supported. Make sure to allow browser camera & microphone permissions when prompted.
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Virtual Classroom Desk</h2>
              <p className="text-text-secondary text-sm font-medium mt-1">Host, schedule, and join interactive live video lectures directly in the portal.</p>
            </div>
            {(isTeacher || isAdmin) && (
              <button 
                onClick={() => setShowScheduleModal(true)}
                className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>Schedule Lecture</span>
              </button>
            )}
          </div>

          {/* Metrics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Scheduled Today', value: stats.todayCount, desc: 'Lectures scheduled for date cycle', icon: Calendar },
              { label: 'Classes Currently Live', value: stats.liveCount, desc: 'Active video broadcast streams', icon: Video, highlight: stats.liveCount > 0 },
              { label: 'Completed Sessions', value: stats.completedCount, desc: 'Successfully archived logs', icon: CheckCircle2 }
            ].map((k, i) => (
              <div key={i} className={`p-6 bg-bg-sidebar border rounded-3xl transition-all ${k.highlight ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
                  <div className={`p-2 rounded-xl ${k.highlight ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}><k.icon size={16} /></div>
                </div>
                <p className="text-3xl font-black font-outfit text-text-primary mt-3">{k.value}</p>
                <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
              </div>
            ))}
          </div>

          {/* Filter & Listing Card */}
          <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
            <div className="max-w-md w-full relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search by topic or subject name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
              />
            </div>

            {/* Timetable schedule grid */}
            {filteredSchedules.length === 0 ? (
              <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-2">
                <Laptop size={32} className="text-text-secondary mx-auto opacity-30" />
                <p className="text-sm font-bold text-text-secondary">No lectures scheduled</p>
                <p className="text-xs text-text-secondary/60">There are no upcoming virtual class sessions matching your query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredSchedules.map((meeting) => {
                  const subject = (sharedSubjects || []).find(s => s.id === meeting.subjectId);
                  const cls = (sharedClasses || []).find(c => c.id === meeting.classId);
                  const isLive = meeting.status === 'LIVE';
                  const isCompleted = meeting.status === 'COMPLETED';

                  return (
                    <div 
                      key={meeting.id} 
                      className={`p-5 border rounded-3xl transition-all duration-300 flex flex-col justify-between h-[210px] ${
                        isLive 
                          ? 'bg-red-500/5 border-red-500/30 shadow-[0_4px_20px_rgba(239,68,68,0.08)] scale-[1.01]' 
                          : isCompleted 
                            ? 'bg-slate-50/50 border-border/60 opacity-60' 
                            : 'bg-white border-border hover:shadow-lg'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-4">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            isLive 
                              ? 'bg-red-100 text-red-700 animate-pulse' 
                              : isCompleted 
                                ? 'bg-slate-100 text-slate-600' 
                                : 'bg-accent/10 text-accent'
                          }`}>
                            {meeting.status}
                          </span>
                          <span className="text-[9px] text-text-secondary font-bold font-mono flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{meeting.date}</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-text-primary truncate">{meeting.topic}</h4>
                          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-0.5 block">
                            {subject?.name} • {cls?.name}
                          </span>
                        </div>
                      </div>

                      {/* Bottom row: Time particulars and Call to action */}
                      <div className="flex justify-between items-center border-t border-border/60 pt-3">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-text-secondary font-black uppercase tracking-widest leading-none">Class Timing</span>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-text-primary mt-1 font-mono">
                            <Clock size={11} className="text-text-secondary" />
                            <span>{meeting.startTime} - {meeting.endTime}</span>
                          </div>
                        </div>

                        {/* Join / Start Actions */}
                        <div>
                          {isCompleted ? (
                            <span className="text-[10px] text-text-secondary font-bold opacity-60">Finished</span>
                          ) : isLive ? (
                            <button
                              onClick={() => handleJoinSession(meeting)}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-xl transition-all shadow-md shadow-red-900/10 active:scale-95 animate-pulse"
                            >
                              { (isTeacher || isAdmin) ? 'Join Broadcast' : 'Join Class' }
                            </button>
                          ) : (
                            (isTeacher || isAdmin) ? (
                              <button
                                onClick={() => handleStartSession(meeting)}
                                className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1"
                              >
                                <Play size={10} fill="currentColor" />
                                <span>Start Class</span>
                              </button>
                            ) : (
                              <button
                                disabled
                                className="px-3.5 py-1.5 bg-slate-100 border border-border text-text-secondary text-[10px] font-bold rounded-xl cursor-not-allowed opacity-50 flex items-center gap-1"
                              >
                                <Lock size={10} />
                                <span>Waiting...</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Schedule Lecture Modal */}
      <Modal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Virtual Classroom Lecture"
        icon={<Video size={16} />}
        size="md"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <p className="text-[10px] text-text-secondary leading-relaxed">
            Specify the target Grade and Subject for this virtual class. A notification alert will be broadcasted to students' and parents' dashboards instantly upon scheduling.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Target Class / Grade</label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value, subjectId: '' })}
                className="w-full bg-slate-100 border border-border rounded-xl py-2.5 px-3 text-xs text-text-primary outline-none cursor-pointer"
                required
              >
                <option value="">Select Grade...</option>
                {availableClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Target Subject</label>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full bg-slate-100 border border-border rounded-xl py-2.5 px-3 text-xs text-text-primary outline-none cursor-pointer disabled:opacity-50"
                disabled={!formData.classId}
                required
              >
                <option value="">Select Subject...</option>
                {filteredFormSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Session Topic / Title</label>
              <input
                type="text"
                placeholder="e.g. Thermodynamics and Laws of Heat"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full text-xs bg-slate-100 border border-border rounded-xl py-2.5 px-4 outline-none focus:border-accent"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Schedule Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full text-xs bg-slate-100 border border-border rounded-xl py-2.5 px-4 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Start Time (IST)</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full text-xs bg-slate-100 border border-border rounded-xl py-2.5 px-4 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Lecture Duration</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full bg-slate-100 border border-border rounded-xl py-2.5 px-3 text-xs text-text-primary outline-none cursor-pointer"
                required
              >
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
                <option value="90">90 Minutes</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border no-print">
            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-border text-text-primary text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all"
            >
              Confirm & Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
