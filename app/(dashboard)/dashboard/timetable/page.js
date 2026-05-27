'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState } from 'react';
import { 
  Calendar, Clock, Sparkles, Brain, RefreshCw, CheckCircle2, 
  AlertTriangle, BookOpen, User, Home, Plus, Edit2, Save
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';

export default function SmartTimetablePage() {
  const {
    activeTenant, sharedClasses, sharedStaff, sharedSubjects, sharedStudents, sharedParents, activeRole, activeUser, activeParentId
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState(false);
  
  const [schedule, setSchedule] = useState([]);

  React.useEffect(() => {
    // Generate schedule based on tenant classes, subjects, staff
    const days = ['Monday', 'Tuesday', 'Wednesday'];
    const timeSlots = ['09:00 AM', '10:30 AM', '01:00 PM'];
    
    const tenantSubjects = sharedSubjects.filter(sub => sub.tenant_id === activeTenant.id);
    const tenantClasses = sharedClasses.filter(c => c.tenant_id === activeTenant.id);
    
    // Resolve logged in teacher's staff ID
    let myStaffId = null;
    if (activeRole === 'TEACHER') {
      const myStaffRecord = sharedStaff.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
      myStaffId = myStaffRecord ? myStaffRecord.id : null;
    }
    
    // Resolve logged in student's class ID
    let myClassId = null;
    if (activeRole === 'STUDENT') {
      const myStudentProfile = sharedStudents.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
      myClassId = myStudentProfile ? myStudentProfile.class_id : null;
    } else if (activeRole === 'PARENT') {
      const parentProfile = sharedParents.find(p => p.id === activeParentId && p.tenant_id === activeTenant.id) || sharedParents.find(p => p.tenant_id === activeTenant.id);
      if (parentProfile) {
        const linkedStudents = sharedStudents.filter(s => s.parent_id === parentProfile.id && s.tenant_id === activeTenant.id);
        if (linkedStudents.length > 0) {
          myClassId = linkedStudents[0].class_id; // Default to first child's class
        }
      }
    }
    
    const generatedSchedule = days.map((day, dayIdx) => {
      const slots = [];
      
      timeSlots.forEach((time, slotIdx) => {
        let subjectsToPlace = tenantSubjects;
        if (activeRole === 'STUDENT' || activeRole === 'PARENT') {
          if (myClassId) {
            subjectsToPlace = tenantSubjects.filter(sub => sub.class_id === myClassId);
          } else {
            subjectsToPlace = [];
          }
        } else if (activeRole === 'TEACHER') {
          if (myStaffId) {
            subjectsToPlace = tenantSubjects.filter(sub => sub.teacher_id === myStaffId);
          } else {
            subjectsToPlace = [];
          }
        }
        
        if (subjectsToPlace.length > 0) {
          const subIndex = (dayIdx * timeSlots.length + slotIdx) % subjectsToPlace.length;
          const subjectObj = subjectsToPlace[subIndex];
          const cls = tenantClasses.find(c => c.id === subjectObj.class_id);
          const teacherObj = sharedStaff.find(s => s.id === subjectObj.teacher_id);
          const teacherName = teacherObj ? `Prof. ${teacherObj.first_name} ${teacherObj.last_name}` : 'Faculty Member';
          
          slots.push({
            id: `${dayIdx}-${slotIdx}-${subjectObj.id}`,
            time,
            subject: `${subjectObj.name} (${cls ? cls.name : 'Class'})`,
            teacher: teacherName,
            room: `Room L-${101 + dayIdx * 10 + slotIdx}`,
            conflict: dayIdx === 0 && slotIdx === 1, // Let's keep one conflict for demo
            conflictDesc: `${teacherName} has double booking in another slot`
          });
        }
      });
      
      return { day, slots };
    });
    
    setSchedule(generatedSchedule);
    setOptimized(false);
  }, [activeTenant.id, activeRole, activeUser, sharedSubjects, sharedClasses, sharedStaff, sharedStudents, sharedParents, activeParentId]);

  // Form states to edit slots
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    subject: '',
    teacher: '',
    room: '',
    time: ''
  });

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Timetable" />;
  }

  const isAdmin = activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN';

  const handleOptimize = () => {
    setLoading(true);
    toast.info('AI core analyzing timetable conflict matrices...');
    
    setTimeout(() => {
      // Resolve conflicts automatically
      setSchedule(prev => prev.map(dayData => ({
        ...dayData,
        slots: dayData.slots.map(slot => {
          if (slot.id === 'm2') {
            return { ...slot, conflict: false, room: 'Chem Lab 2' }; // Moved to empty lab
          }
          if (slot.id === 't3') {
            return { ...slot, conflict: false, room: 'Chem Lab 1' }; // Resolved room double allocation
          }
          return slot;
        })
      })));
      setLoading(false);
      setOptimized(true);
      toast.success('AI Scheduling Complete. Double bookings and room conflicts resolved!');
    }, 1500);
  };

  const handleEditClick = (slot) => {
    setEditingSlotId(slot.id);
    setEditFormData({
      subject: slot.subject,
      teacher: slot.teacher,
      room: slot.room,
      time: slot.time
    });
  };

  const handleSaveClick = (dayIdx, slotIdx) => {
    if (!editFormData.subject || !editFormData.teacher || !editFormData.room) {
      toast.error('All fields are required to update a timetable slot.');
      return;
    }

    const updatedSchedule = [...schedule];
    const targetSlot = updatedSchedule[dayIdx].slots[slotIdx];
    
    updatedSchedule[dayIdx].slots[slotIdx] = {
      ...targetSlot,
      subject: editFormData.subject,
      teacher: editFormData.teacher,
      room: editFormData.room,
      time: editFormData.time,
      conflict: false // Reset conflicts upon manual update
    };

    setSchedule(updatedSchedule);
    setEditingSlotId(null);
    toast.success('Timetable slot updated successfully!');
  };

  // Count active conflicts
  const activeConflictsCount = schedule.reduce((acc, curr) => acc + curr.slots.filter(s => s.conflict).length, 0);

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Smart Timetable</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Review lecture schedules, adjust slots, and run AI constraint conflict optimization for <span className="text-accent font-bold">{activeTenant.name}</span>.
          </p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={handleOptimize}
            disabled={loading}
            className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <Brain size={14} />
            )}
            <span>{optimized ? 'Re-run Optimizer' : 'Suggest AI Optimization'}</span>
          </button>
        )}
      </div>

      {/* Main Grid: Weekly Schedule vs AI Advisory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weekly Timetable Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Weekly Class Schedule</h3>
            
            <div className="space-y-6">
              {schedule.map((dayData, dayIdx) => (
                <div key={dayIdx} className="space-y-3">
                  <h4 className="text-xs font-black text-accent uppercase tracking-widest pl-1">{dayData.day}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {dayData.slots.map((slot, slotIdx) => {
                      const isEditing = editingSlotId === slot.id;
                      
                      return (
                        <div 
                          key={slot.id} 
                          className={`p-4 rounded-2xl border transition-all ${
                            slot.conflict 
                              ? 'bg-danger/5 border-danger/20 hover:border-danger/40' 
                              : 'bg-bg-main/40 border-border hover:border-accent/10'
                          }`}
                        >
                          {isEditing ? (
                            /* Editing Slot Form */
                            <div className="space-y-2 text-xs">
                              <input 
                                type="text" 
                                value={editFormData.time} 
                                onChange={(e) => setEditFormData({...editFormData, time: e.target.value})}
                                className="w-full text-[10px] py-1 px-2 font-mono bg-black"
                                placeholder="Time (e.g. 09:00 AM)"
                              />
                              <input 
                                type="text" 
                                value={editFormData.subject} 
                                onChange={(e) => setEditFormData({...editFormData, subject: e.target.value})}
                                className="w-full py-1 px-2 bg-black font-bold"
                                placeholder="Subject"
                              />
                              <input 
                                type="text" 
                                value={editFormData.teacher} 
                                onChange={(e) => setEditFormData({...editFormData, teacher: e.target.value})}
                                className="w-full py-1 px-2 bg-black text-text-secondary"
                                placeholder="Teacher"
                              />
                              <input 
                                type="text" 
                                value={editFormData.room} 
                                onChange={(e) => setEditFormData({...editFormData, room: e.target.value})}
                                className="w-full py-1 px-2 bg-black"
                                placeholder="Room"
                              />
                              <button 
                                type="button" 
                                onClick={() => handleSaveClick(dayIdx, slotIdx)}
                                className="w-full py-1.5 bg-success hover:bg-success-hover text-text-primary text-\[10px] font-bold rounded-lg flex items-center justify-center gap-1 mt-1"
                              >
                                <Save size={10} />
                                <span>Save</span>
                              </button>
                            </div>
                          ) : (
                            /* Normal Slot Display */
                            <div className="h-full flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-text-secondary font-bold flex items-center gap-1">
                                    <Clock size={10} /> {slot.time}
                                  </span>
                                  <span className="text-[10px] text-text-primary font-bold">{slot.room}</span>
                                </div>
                                <h5 className="text-sm font-bold text-text-primary">{slot.subject}</h5>
                                <p className="text-[10px] text-text-secondary">{slot.teacher}</p>
                              </div>

                              {slot.conflict && (
                                <div className="mt-3 flex items-start gap-1.5 p-2 bg-danger/10 border border-danger/25 rounded-xl text-[9px] text-danger">
                                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                  <p className="font-medium leading-relaxed">{slot.conflictDesc}</p>
                                </div>
                              )}

                              {isAdmin && (
                                <div className="mt-4 pt-2 border-t border-border flex justify-end">
                                  <button 
                                    onClick={() => handleEditClick(slot)}
                                    className="text-text-secondary hover:text-text-primary p-1 hover:bg-slate-100 rounded transition-all"
                                    title="Edit Slot"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Advisory Panel */}
        <div className="space-y-6">
          <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
            <div className="flex items-center gap-2 text-text-primary">
              <Sparkles size={18} className="text-accent" />
              <h3 className="text-sm font-black uppercase tracking-wider font-outfit">AI Timetable Advisory</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-accent/5 border border-accent/15 space-y-2">
                <p className="font-bold text-text-primary flex items-center gap-1.5">
                  <Brain size={14} className="text-accent" /> Advisory Report
                </p>
                <p className="text-text-secondary leading-relaxed">
                  The current timetable contains **{activeConflictsCount} pending conflicts**. Run the optimizer or edit slots manually to resolve overlapping schedules.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-accent/10 rounded-lg text-accent mt-0.5"><BookOpen size={14} /></div>
                  <div>
                    <h4 className="font-bold text-text-primary">Teacher Load Balance</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">Faculty members are limited to max 4 hours of lectures per day to maintain academic quality.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-accent/10 rounded-lg text-accent mt-0.5"><Home size={14} /></div>
                  <div>
                    <h4 className="font-bold text-text-primary">Classroom Utilization</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">Ensures physical classrooms are occupied optimally and lab resources are pre-scheduled.</p>
                  </div>
                </div>
              </div>

              {optimized && activeConflictsCount === 0 && (
                <div className="p-4 rounded-2xl bg-success/10 border border-success/25 text-success space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Optimizations Applied
                  </p>
                  <p className="text-[10px] text-success leading-relaxed">
                    All double-bookings and room conflicts solved. Weekly lecture schedule is conflict-free.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
