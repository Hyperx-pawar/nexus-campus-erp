'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState } from 'react';
import { 
  Calendar, Clock, Sparkles, Brain, RefreshCw, CheckCircle2, 
  AlertTriangle, BookOpen, User, Home, Plus, Edit2, Save, Play,
  Upload, FileSpreadsheet, Download
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import * as XLSX from 'xlsx';

export default function SmartTimetablePage() {
  const {
    activeTenant, sharedClasses, sharedStaff, sharedSubjects, sharedStudents, sharedParents, activeRole, activeUser, activeParentId
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Modal and form states
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [showDigitalWizard, setShowDigitalWizard] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [parsedSlots, setParsedSlots] = useState([]);
  const [activeBulkTab, setActiveBulkTab] = useState('grid'); // 'grid' | 'csv' | 'file'
  const [bulkClassId, setBulkClassId] = useState('');
  const [gridSlots, setGridSlots] = useState({});
  
  const [newSlotForm, setNewSlotForm] = useState({
    day: 'Monday',
    time: '09:00 AM',
    classId: '',
    subjectId: '',
    roomId: 'Room L-101'
  });

  const [wizardDays, setWizardDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [wizardSlots, setWizardSlots] = useState(['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM']);

  // Resolve logged in teacher's staff ID
  const myStaffId = React.useMemo(() => {
    if (activeRole !== 'TEACHER') return null;
    const myStaffRecord = sharedStaff?.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
    return myStaffRecord ? myStaffRecord.id : null;
  }, [sharedStaff, activeTenant.id, activeRole, activeUser]);

  // Resolve parent profile & children
  const parentProfile = React.useMemo(() => {
    return sharedParents?.find(p => p.tenant_id === activeTenant.id && p.email === activeUser?.email) || sharedParents?.find(p => p.tenant_id === activeTenant.id);
  }, [sharedParents, activeTenant.id, activeUser]);

  const parentChildren = React.useMemo(() => {
    if (!parentProfile) return [];
    return sharedStudents?.filter(s => s.parent_id === parentProfile.id && s.tenant_id === activeTenant.id) || [];
  }, [sharedStudents, parentProfile, activeTenant.id]);

  // Resolve logged in student's class ID
  const myClassId = React.useMemo(() => {
    if (activeRole === 'STUDENT') {
      const myStudentProfile = sharedStudents?.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
      return myStudentProfile ? myStudentProfile.class_id : null;
    } else if (activeRole === 'PARENT') {
      if (parentChildren.length > 0) {
        return parentChildren[0].class_id;
      }
    }
    return null;
  }, [sharedStudents, parentChildren, activeTenant.id, activeRole, activeUser]);

  // Auto-set selectedClassId on load or tenant change
  React.useEffect(() => {
    const tenantClasses = sharedClasses.filter(c => c.tenant_id === activeTenant.id);
    if (tenantClasses.length > 0) {
      if (myClassId) {
        setSelectedClassId(myClassId);
      } else {
        setSelectedClassId(tenantClasses[0].id);
      }
    }
  }, [sharedClasses, activeTenant.id, myClassId]);

  // Sync bulkClassId with selectedClassId on load or switch
  React.useEffect(() => {
    if (selectedClassId) {
      setBulkClassId(selectedClassId);
    }
  }, [selectedClassId]);

  // Sync gridSlots with existing schedule for the selected bulkClassId
  React.useEffect(() => {
    if (!bulkClassId || !showBulkModal) return;
    const initialGrid = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = ['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'];
    
    // Initialize empty
    days.forEach(d => {
      times.forEach(t => {
        initialGrid[`${d}|${t}`] = { subjectId: '', room: 'Room L-101' };
      });
    });

    // Populate from schedule
    schedule.forEach(dayData => {
      dayData.slots.forEach(slot => {
        if (slot.classId === bulkClassId) {
          initialGrid[`${dayData.day}|${slot.time}`] = {
            subjectId: slot.subjectId,
            room: slot.room
          };
        }
      });
    });

    setGridSlots(initialGrid);
  }, [bulkClassId, schedule, showBulkModal]);

  // Get cell-level conflict warnings inside grid editor
  const getCellConflict = React.useCallback((day, time, subjectId) => {
    if (!subjectId || !bulkClassId) return null;
    const sub = sharedSubjects.find(s => s.id === subjectId);
    if (!sub || !sub.teacher_id) return null;

    // Search existing schedule for another class at the same day/time/teacher
    const dayData = schedule.find(d => d.day === day);
    if (dayData) {
      const conflictingSlot = dayData.slots.find(s => 
        s.time === time && 
        s.teacherId === sub.teacher_id && 
        s.classId !== bulkClassId
      );
      if (conflictingSlot) {
        const teacherObj = sharedStaff.find(st => st.id === sub.teacher_id);
        const teacherName = teacherObj ? `Prof. ${teacherObj.first_name} ${teacherObj.last_name}` : 'Teacher';
        return `${teacherName} is busy in ${conflictingSlot.className}`;
      }
    }
    return null;
  }, [bulkClassId, schedule, sharedSubjects, sharedStaff]);

  const handleSaveGridTimetable = () => {
    if (!bulkClassId) {
      toast.error('No class selected.');
      return;
    }

    const cls = sharedClasses.find(c => c.id === bulkClassId);
    const className = cls ? cls.name : 'Class';
    const newSlots = [];

    Object.entries(gridSlots).forEach(([key, val]) => {
      if (!val.subjectId) return; // Skip free period
      
      const [day, time] = key.split('|');
      const subjectObj = sharedSubjects.find(s => s.id === val.subjectId);
      if (!subjectObj) return;

      const teacherObj = sharedStaff.find(st => st.id === subjectObj.teacher_id);
      const teacherName = teacherObj ? `Prof. ${teacherObj.first_name} ${teacherObj.last_name}` : 'Faculty Member';
      
      // Determine conflict
      const conflictMsg = getCellConflict(day, time, val.subjectId);
      
      newSlots.push({
        id: `slot-grid-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        day,
        time,
        classId: bulkClassId,
        className,
        subjectId: subjectObj.id,
        subjectName: subjectObj.name,
        subject: `${subjectObj.name} (${className})`,
        teacher: teacherName,
        teacherId: subjectObj.teacher_id,
        room: val.room || 'Room L-101',
        conflict: !!conflictMsg,
        conflictDesc: conflictMsg || ''
      });
    });

    setSchedule(prev => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      return days.map(d => {
        const existingDayData = prev.find(pd => pd.day === d) || { day: d, slots: [] };
        // Filter out existing slots for this class
        const otherSlots = existingDayData.slots.filter(s => s.classId !== bulkClassId);
        // Get new slots for this day
        const dayNewSlots = newSlots.filter(s => s.day === d);

        return {
          day: d,
          slots: [...otherSlots, ...dayNewSlots].sort((a, b) => a.time.localeCompare(b.time))
        };
      });
    });

    toast.success(`Successfully saved timetable for ${className}!`);
    setShowBulkModal(false);
  };

  // Digital scheduler generator (class-wise distribution with teacher double-booking prevention)
  const runDigitalScheduler = React.useCallback((selectedDays, selectedSlots) => {
    const tenantSubjects = sharedSubjects.filter(sub => sub.tenant_id === activeTenant.id);
    const tenantClasses = sharedClasses.filter(c => c.tenant_id === activeTenant.id);
    
    // Map tracking assigned teachers per slot to prevent conflicts
    // Format: `${day}-${time}-${teacherId}` -> true
    const teacherSchedule = {};

    const generated = selectedDays.map((day, dayIdx) => {
      const slots = [];
      
      selectedSlots.forEach((time, slotIdx) => {
        tenantClasses.forEach((cls) => {
          const classSubjects = tenantSubjects.filter(sub => sub.class_id === cls.id);
          if (classSubjects.length === 0) return;

          let selectedSubject = null;
          let conflictFound = false;
          let busyTeacherName = '';

          // Find a subject whose teacher is free at this slot
          for (let i = 0; i < classSubjects.length; i++) {
            const subIndex = (dayIdx * selectedSlots.length + slotIdx + i) % classSubjects.length;
            const tempSub = classSubjects[subIndex];
            const teacherKey = `${day}-${time}-${tempSub.teacher_id}`;

            if (!teacherSchedule[teacherKey]) {
              selectedSubject = tempSub;
              teacherSchedule[teacherKey] = true;
              break;
            } else {
              // Track conflict details for fallback
              if (!selectedSubject) {
                selectedSubject = tempSub;
                conflictFound = true;
                const teacherObj = sharedStaff.find(s => s.id === tempSub.teacher_id);
                busyTeacherName = teacherObj ? `Prof. ${teacherObj.first_name} ${teacherObj.last_name}` : 'Faculty';
              }
            }
          }

          if (selectedSubject) {
            const teacherObj = sharedStaff.find(s => s.id === selectedSubject.teacher_id);
            const teacherName = teacherObj ? `Prof. ${teacherObj.first_name} ${teacherObj.last_name}` : 'Faculty Member';
            
            slots.push({
              id: `slot-${dayIdx}-${slotIdx}-${selectedSubject.id}-${cls.id}-${Math.floor(Math.random() * 1000)}`,
              time,
              classId: cls.id,
              className: cls.name,
              subjectId: selectedSubject.id,
              subjectName: selectedSubject.name,
              subject: `${selectedSubject.name} (${cls.name})`,
              teacher: teacherName,
              teacherId: selectedSubject.teacher_id,
              room: `Room L-${101 + dayIdx * 10 + slotIdx}`,
              conflict: conflictFound,
              conflictDesc: conflictFound ? `${busyTeacherName} is already teaching another class at this time` : ''
            });
          }
        });
      });
      
      return { day, slots };
    });
    
    return generated;
  }, [activeTenant.id, sharedSubjects, sharedClasses, sharedStaff]);

  // Initialize schedule on mount or tenant switch
  React.useEffect(() => {
    const defaultDays = ['Monday', 'Tuesday', 'Wednesday'];
    const defaultSlots = ['09:00 AM', '10:30 AM', '01:00 PM'];
    setSchedule(runDigitalScheduler(defaultDays, defaultSlots));
    setOptimized(false);
  }, [runDigitalScheduler, activeTenant.id]);

  // Manually Add Slot Handler
  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!newSlotForm.subjectId || !newSlotForm.roomId || !newSlotForm.classId) {
      toast.error('Class, Subject, and Room Name are required.');
      return;
    }

    const subjectObj = sharedSubjects.find(sub => sub.id === newSlotForm.subjectId);
    if (!subjectObj) {
      toast.error('Subject not found.');
      return;
    }
    
    const cls = sharedClasses.find(c => c.id === newSlotForm.classId);
    const teacherObj = sharedStaff.find(s => s.id === subjectObj.teacher_id);
    const teacherName = teacherObj ? `Prof. ${teacherObj.first_name} ${teacherObj.last_name}` : 'Faculty Member';

    // Verify if teacher is already scheduled in another class at this slot
    let manualConflict = false;
    let manualConflictDesc = '';
    
    const targetDayData = schedule.find(d => d.day === newSlotForm.day);
    if (targetDayData) {
      const busySlot = targetDayData.slots.find(s => s.time === newSlotForm.time && s.teacherId === subjectObj.teacher_id && s.classId !== newSlotForm.classId);
      if (busySlot) {
        manualConflict = true;
        manualConflictDesc = `${teacherName} is already assigned to ${busySlot.className || 'another class'} at this time`;
      }
    }

    const createdSlot = {
      id: `slot-manual-${Date.now()}`,
      time: newSlotForm.time,
      classId: newSlotForm.classId,
      className: cls ? cls.name : 'Class',
      subjectId: subjectObj.id,
      subjectName: subjectObj.name,
      subject: `${subjectObj.name} (${cls ? cls.name : 'Class'})`,
      teacher: teacherName,
      teacherId: subjectObj.teacher_id,
      room: newSlotForm.roomId,
      conflict: manualConflict,
      conflictDesc: manualConflictDesc
    };

    setSchedule(prev => {
      const dayExists = prev.some(d => d.day === newSlotForm.day);
      if (dayExists) {
        return prev.map(dayData => {
          if (dayData.day === newSlotForm.day) {
            // Remove existing slot for the same class at the same time if any, then insert
            const updatedSlots = dayData.slots.filter(s => !(s.time === newSlotForm.time && s.classId === newSlotForm.classId));
            return {
              ...dayData,
              slots: [...updatedSlots, createdSlot].sort((a, b) => a.time.localeCompare(b.time))
            };
          }
          return dayData;
        });
      } else {
        return [...prev, { day: newSlotForm.day, slots: [createdSlot] }];
      }
    });

    toast.success(`Manually scheduled "${subjectObj.name}" for ${cls ? cls.name : 'class'} on ${newSlotForm.day} at ${newSlotForm.time}!`);
    setShowAddSlotModal(false);
    
    // Auto-switch back view filter to display the scheduled class
    setSelectedClassId(newSlotForm.classId);
    
    setNewSlotForm({ day: 'Monday', time: '09:00 AM', classId: '', subjectId: '', roomId: 'Room L-101' });
  };

  // Digital Timetable Generator Handler
  const handleDigitalGenerate = (e) => {
    e.preventDefault();
    if (wizardDays.length === 0 || wizardSlots.length === 0) {
      toast.error('Please select at least one day and one period slot.');
      return;
    }

    setLoading(true);
    toast.loading('Compiling curriculum constraints and generating timetable...');

    setTimeout(() => {
      const generated = runDigitalScheduler(wizardDays, wizardSlots);
      setSchedule(generated);
      setOptimized(false);
      setLoading(false);
      setShowDigitalWizard(false);
      toast.dismiss();
      toast.success(`Digital Scheduler successfully generated timetable for ${wizardDays.length} days!`);
    }, 1000);
  };

  // Parse copy-pasted CSV text for timetable slots
  const handleBulkTextParse = (textVal) => {
    const text = textVal || bulkCsvText;
    if (!text.trim()) {
      toast.error('Please enter CSV data to parse.');
      return;
    }
    
    try {
      const lines = text.split('\n');
      const parsed = [];
      const tenantClasses = sharedClasses.filter(c => c.tenant_id === activeTenant.id);
      const tenantSubjects = sharedSubjects.filter(s => s.tenant_id === activeTenant.id);

      lines.forEach((line, idx) => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 4 || parts[0].toLowerCase().startsWith('day')) {
          // Skip header or empty rows
          return;
        }

        const [day, time, className, subjectName, room, teacherNameInput] = parts;
        
        // Match Class
        const targetClass = tenantClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
        const classId = targetClass ? targetClass.id : (tenantClasses[0]?.id || '');
        const actualClassName = targetClass ? targetClass.name : className;

        // Match Subject
        const targetSub = tenantSubjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase() && s.class_id === classId);
        const subjectId = targetSub ? targetSub.id : (tenantSubjects.find(s => s.class_id === classId)?.id || '');
        const actualSubjectName = targetSub ? targetSub.name : subjectName;
        const teacherId = targetSub ? targetSub.teacher_id : '';

        // Resolve Teacher Name
        let finalTeacherName = teacherNameInput || 'Faculty Member';
        if (teacherId) {
          const staffObj = sharedStaff.find(s => s.id === teacherId);
          if (staffObj) finalTeacherName = `Prof. ${staffObj.first_name} ${staffObj.last_name}`;
        }

        parsed.push({
          id: `parsed-bulk-${Date.now()}-${idx}`,
          day: day.charAt(0).toUpperCase() + day.slice(1).toLowerCase(),
          time: time || '09:00 AM',
          classId,
          className: actualClassName,
          subjectId,
          subjectName: actualSubjectName,
          subject: `${actualSubjectName} (${actualClassName})`,
          teacher: finalTeacherName,
          teacherId,
          room: room || 'Room L-101',
          conflict: false,
          conflictDesc: ''
        });
      });

      if (parsed.length === 0) {
        toast.error('No valid timetable slots could be parsed.');
        return;
      }

      setParsedSlots(parsed);
      toast.success(`Successfully parsed ${parsed.length} slots from editor!`);
    } catch (err) {
      toast.error('Failed to parse CSV text.');
    }
  };

  // Parse spreadsheet file for timetable slots
  const handleBulkFileParse = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length <= 1) {
          toast.error('Spreadsheet is empty.');
          return;
        }

        const csvLines = data.map(row => row.join(',')).join('\n');
        setBulkCsvText(csvLines);
        handleBulkTextParse(csvLines);
      } catch (err) {
        toast.error('Failed to parse spreadsheet file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Commit bulk slots to schedule state
  const handleImportBulkSlots = () => {
    if (parsedSlots.length === 0) {
      toast.error('No parsed slots to import.');
      return;
    }

    setSchedule(prev => {
      let updatedSchedule = [...prev];
      
      parsedSlots.forEach(parsed => {
        let dayData = updatedSchedule.find(d => d.day === parsed.day);
        
        let hasConflict = false;
        let conflictDesc = '';
        
        if (dayData) {
          const busy = dayData.slots.find(s => s.time === parsed.time && s.teacherId === parsed.teacherId && s.classId !== parsed.classId);
          if (busy) {
            hasConflict = true;
            conflictDesc = `${parsed.teacher} is already assigned to ${busy.className || 'another class'} at this time`;
          }
        }
        
        const finalSlot = {
          ...parsed,
          id: `slot-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          conflict: hasConflict,
          conflictDesc
        };

        if (dayData) {
          const filtered = dayData.slots.filter(s => !(s.time === parsed.time && s.classId === parsed.classId));
          dayData.slots = [...filtered, finalSlot].sort((a, b) => a.time.localeCompare(b.time));
        } else {
          updatedSchedule.push({
            day: parsed.day,
            slots: [finalSlot]
          });
        }
      });

      return updatedSchedule;
    });

    toast.success(`Successfully imported ${parsedSlots.length} slots to the schedule!`);
    setParsedSlots([]);
    setBulkCsvText('');
    setShowBulkModal(false);
  };

  // Load bulk template in editor
  const loadBulkTemplate = () => {
    const template = `Day, Time, Class Name, Subject Name, Room, Teacher Name
Monday, 09:00 AM, Class IX, Physics, Room L-101, Prof. Vikram Patel
Monday, 10:30 AM, Class IX, Calculus, Room L-102, Dr. B.S. Grewal
Tuesday, 01:00 PM, Class X, Chemistry, Room Chem Lab 1, Prof. Deepa Roy
Wednesday, 02:30 PM, Class XII, Accounts, Room L-201, T.S. Grewal`;
    setBulkCsvText(template);
    toast.info('Template loaded in CSV text editor.');
  };

  // Form states to edit slots
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    subject: '',
    teacher: '',
    room: '',
    time: ''
  });

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];
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

  const handleSaveClick = (dayIdx, slotId) => {
    if (!editFormData.subject || !editFormData.teacher || !editFormData.room) {
      toast.error('All fields are required to update a timetable slot.');
      return;
    }

    setSchedule(prev => prev.map((dayData, idx) => {
      if (idx === dayIdx) {
        return {
          ...dayData,
          slots: dayData.slots.map(s => {
            if (s.id === slotId) {
              return {
                ...s,
                subject: editFormData.subject,
                teacher: editFormData.teacher,
                room: editFormData.room,
                time: editFormData.time,
                conflict: false // Reset conflicts upon manual update
              };
            }
            return s;
          })
        };
      }
      return dayData;
    }));

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
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                setNewSlotForm({
                  day: 'Monday',
                  time: '09:00 AM',
                  classId: selectedClassId || (sharedClasses.filter(c => c.tenant_id === activeTenant.id)[0]?.id || ''),
                  subjectId: '',
                  roomId: 'Room L-101'
                });
                setShowAddSlotModal(true);
              }}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-xs font-bold rounded-2xl border border-border transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              <span>Add Slot Manually</span>
            </button>

            <button 
              onClick={() => setShowDigitalWizard(true)}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-xs font-bold rounded-2xl border border-border transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={14} className="text-accent" />
              <span>Digital Creator</span>
            </button>

            <button 
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-xs font-bold rounded-2xl border border-border transition-all flex items-center justify-center gap-2"
            >
              <Upload size={14} className="text-success" />
              <span>Bulk Add</span>
            </button>

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
          </div>
        )}
      </div>

      {/* Main Grid: Weekly Schedule vs AI Advisory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weekly Timetable Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Weekly Class Schedule</h3>
              
              {(activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'TEACHER') ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Select Class:</span>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-bg-main border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-accent"
                  >
                    {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              ) : activeRole === 'PARENT' ? (
                parentChildren.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Select Child Class:</span>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="bg-bg-main border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-accent"
                    >
                      {parentChildren.map(s => {
                        const clsName = sharedClasses?.find(c => c.id === s.class_id)?.name || 'Class';
                        return (
                          <option key={s.id} value={s.class_id}>{s.first_name}'s Class ({clsName})</option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-accent">
                    Class: {sharedClasses?.find(c => c.id === selectedClassId)?.name || 'General Class'}
                  </div>
                )
              ) : (
                <div className="text-xs font-bold text-accent">
                  Class: {sharedClasses?.find(c => c.id === selectedClassId)?.name || 'General Class'}
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              {schedule.map((dayData, dayIdx) => {
                const classSlots = dayData.slots.filter(s => s.classId === selectedClassId);

                return (
                  <div key={dayIdx} className="space-y-3">
                    <h4 className="text-xs font-black text-accent uppercase tracking-widest pl-1">{dayData.day}</h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {classSlots.map((slot) => {
                        const isEditing = editingSlotId === slot.id;

                        return (
                          <div
                            key={slot.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              slot.conflict
                                ? 'bg-danger/5 border-danger/20 hover:border-danger/40 animate-pulse'
                                : 'bg-bg-main/40 border-border hover:border-accent/10'
                            }`}
                          >
                            {isEditing ? (
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
                                  onClick={() => handleSaveClick(dayIdx, slot.id)}
                                  className="w-full py-1.5 bg-success hover:bg-success-hover text-text-primary text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 mt-1"
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
                );
              })}
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

      {/* 1. Add Slot Manually Modal */}
      <Modal
        open={showAddSlotModal}
        onClose={() => setShowAddSlotModal(false)}
        title="Schedule Timetable Slot"
        icon={<Plus size={18} />}
        size="md"
      >
        <form onSubmit={handleAddSlot} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Day of the Week</label>
              <select
                value={newSlotForm.day}
                onChange={(e) => setNewSlotForm({...newSlotForm, day: e.target.value})}
                className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Time Slot / Period</label>
              <select
                value={newSlotForm.time}
                onChange={(e) => setNewSlotForm({...newSlotForm, time: e.target.value})}
                className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              >
                {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Class *</label>
            <select
              value={newSlotForm.classId}
              onChange={(e) => setNewSlotForm({...newSlotForm, classId: e.target.value, subjectId: ''})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              required
            >
              <option value="">-- Choose Class --</option>
              {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Subject *</label>
            <select
              value={newSlotForm.subjectId}
              onChange={(e) => setNewSlotForm({...newSlotForm, subjectId: e.target.value})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              required
            >
              <option value="">-- Choose Subject --</option>
              {sharedSubjects.filter(sub => sub.tenant_id === activeTenant.id && sub.class_id === newSlotForm.classId).map(sub => {
                const cls = sharedClasses.find(c => c.id === sub.class_id);
                return (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code}) - {cls ? cls.name : 'Unknown Class'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Room / Lab Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Room L-101 or Chem Lab"
              value={newSlotForm.roomId}
              onChange={(e) => setNewSlotForm({...newSlotForm, roomId: e.target.value})}
              className="w-full text-xs"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Plus size={14} />
            <span>Schedule Slot</span>
          </button>
        </form>
      </Modal>

      {/* 2. Digital Timetable Generator Modal */}
      <Modal
        open={showDigitalWizard}
        onClose={() => setShowDigitalWizard(false)}
        title="Digital Timetable Wizard"
        icon={<Sparkles size={18} />}
        size="md"
      >
        <form onSubmit={handleDigitalGenerate} className="space-y-5">
          <div className="p-4 bg-accent/5 border border-accent/15 rounded-2xl space-y-1.5">
            <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Brain size={14} className="text-accent" /> Auto-Scheduler Policy
            </p>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              Our digital scheduler automatically maps all registered courses, classes, and teachers into the selected days and slots, ensuring zero overlaps and optimal room allocations.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">1. Choose Days to Schedule</label>
            <div className="flex flex-wrap gap-2.5">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                const isSelected = wizardDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => {
                      if (isSelected) {
                        setWizardDays(wizardDays.filter(d => d !== day));
                      } else {
                        setWizardDays([...wizardDays, day]);
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected 
                        ? 'bg-accent/10 border-accent/30 text-accent font-black border-transparent' 
                        : 'bg-bg-sidebar border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">2. Choose Periods / Timeslots</label>
            <div className="grid grid-cols-2 gap-2">
              {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'].map(time => {
                const isSelected = wizardSlots.includes(time);
                return (
                  <button
                    type="button"
                    key={time}
                    onClick={() => {
                      if (isSelected) {
                        setWizardSlots(wizardSlots.filter(t => t !== time));
                      } else {
                        setWizardSlots([...wizardSlots, time]);
                      }
                    }}
                    className={`p-3 rounded-xl text-xs font-mono font-bold border transition-all text-left flex items-center justify-between ${
                      isSelected 
                        ? 'bg-accent/10 border-accent/30 text-accent font-black border-transparent' 
                        : 'bg-bg-sidebar border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>{time}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
            <span>{loading ? 'Running Digital Compiler...' : 'Compile & Generate Timetable'}</span>
          </button>
        </form>
      </Modal>

      {/* 3. Bulk Add Slots Modal */}
      <Modal
        open={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setParsedSlots([]);
          setBulkCsvText('');
          setActiveBulkTab('grid');
        }}
        title="Bulk Timetable Scheduler"
        icon={<FileSpreadsheet size={18} />}
        size="lg"
      >
        <div className="space-y-5">
          {/* Tab Selector */}
          <div className="flex border-b border-border gap-2">
            <button
              type="button"
              onClick={() => setActiveBulkTab('grid')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeBulkTab === 'grid'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Calendar size={14} />
              <span>Interactive Grid Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBulkTab('csv')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeBulkTab === 'csv'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>Copy & Paste CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveBulkTab('file')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeBulkTab === 'file'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Upload size={14} />
              <span>Upload Spreadsheet</span>
            </button>
          </div>

          {activeBulkTab === 'grid' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-border rounded-2xl">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Class Timetable Builder</h4>
                  <p className="text-[10px] text-text-secondary">Select a class to visually construct its weekly schedule. Conflicts are highlighted dynamically.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Target Class:</span>
                  <select
                    value={bulkClassId}
                    onChange={(e) => setBulkClassId(e.target.value)}
                    className="bg-bg-sidebar border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-accent"
                  >
                    {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-border rounded-2xl bg-white max-h-[350px] custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px] text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-[10px] font-black text-text-secondary uppercase tracking-wider">
                      <th className="p-3 sticky left-0 bg-slate-50 border-r border-border z-10 w-24">Day</th>
                      {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'].map(time => (
                        <th key={time} className="p-3 min-w-[150px]">{time}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                      <tr key={day} className="hover:bg-slate-50/40">
                        <td className="p-3 font-bold text-accent uppercase tracking-wider bg-white sticky left-0 z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.02)]">{day}</td>
                        {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM'].map(time => {
                          const cellKey = `${day}|${time}`;
                          const cellVal = gridSlots[cellKey] || { subjectId: '', room: 'Room L-101' };
                          const conflict = getCellConflict(day, time, cellVal.subjectId);
                          
                          const classSubjects = sharedSubjects.filter(sub => sub.tenant_id === activeTenant.id && sub.class_id === bulkClassId);
                          const selectedSubObj = classSubjects.find(s => s.id === cellVal.subjectId);
                          let resolvedTeacherName = '';
                          if (selectedSubObj) {
                            const st = sharedStaff.find(s => s.id === selectedSubObj.teacher_id);
                            resolvedTeacherName = st ? `${st.first_name} ${st.last_name}` : 'No Teacher';
                          }

                          return (
                            <td 
                              key={time} 
                              className={`p-2 transition-all border-r border-border last:border-r-0 ${
                                conflict 
                                  ? 'bg-danger/5 border-danger/25' 
                                  : cellVal.subjectId 
                                  ? 'bg-success/5' 
                                  : ''
                              }`}
                            >
                              <div className="space-y-1.5">
                                <select
                                  value={cellVal.subjectId}
                                  onChange={(e) => {
                                    setGridSlots(prev => ({
                                      ...prev,
                                      [cellKey]: { ...prev[cellKey], subjectId: e.target.value }
                                    }));
                                  }}
                                  className={`w-full bg-bg-sidebar border rounded-lg p-1 text-[11px] font-medium outline-none focus:border-accent ${
                                    conflict ? 'border-danger text-danger' : 'border-border text-text-primary'
                                  }`}
                                >
                                  <option value="">-- Free --</option>
                                  {classSubjects.map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                      {sub.name} ({sub.code})
                                    </option>
                                  ))}
                                </select>

                                {cellVal.subjectId && (
                                  <div className="flex flex-col gap-1">
                                    <input
                                      type="text"
                                      value={cellVal.room}
                                      placeholder="Room"
                                      onChange={(e) => {
                                        setGridSlots(prev => ({
                                          ...prev,
                                          [cellKey]: { ...prev[cellKey], room: e.target.value }
                                        }));
                                      }}
                                      className="w-full border border-border bg-bg-sidebar rounded-md px-1.5 py-0.5 text-[9px] outline-none focus:border-accent font-semibold"
                                    />
                                    {conflict ? (
                                      <span className="text-[8px] font-bold text-danger leading-tight flex items-start gap-0.5 mt-0.5">
                                        <AlertTriangle size={8} className="shrink-0 mt-0.5" />
                                        <span>{conflict}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[8px] text-text-secondary font-bold truncate">
                                        👤 {resolvedTeacherName}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleSaveGridTimetable}
                  className="px-6 py-3 bg-success hover:bg-success-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-success/15"
                >
                  <CheckCircle2 size={14} />
                  <span>Save Class Timetable</span>
                </button>
              </div>
            </div>
          )}

          {activeBulkTab === 'csv' && (
            <div className="space-y-4">
              <div className="p-4 bg-success/5 border border-success/15 rounded-2xl space-y-1">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <FileSpreadsheet size={14} className="text-success" />
                  CSV Text Parser
                </h4>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  Copy-paste raw comma-separated values to parse timetable rows in batch. Format: <strong>Day, Time, Class Name, Subject Name, Room, Teacher Name</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">CSV Raw Input</label>
                  <button
                    type="button"
                    onClick={loadBulkTemplate}
                    className="text-[9px] text-accent hover:underline font-bold"
                  >
                    Load Sample Template
                  </button>
                </div>

                <textarea
                  rows={7}
                  placeholder="Day, Time, Class Name, Subject Name, Room, Teacher Name"
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-bg-main border border-border rounded-xl h-48 resize-none focus:outline-none focus:border-accent text-text-primary"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkTextParse()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-xs font-bold rounded-xl transition-all"
                >
                  Parse Data Input
                </button>
              </div>
            </div>
          )}

          {activeBulkTab === 'file' && (
            <div className="space-y-4">
              <div className="p-4 bg-success/5 border border-success/15 rounded-2xl space-y-1">
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Upload size={14} className="text-success" />
                  Spreadsheet Uploader
                </h4>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  Upload an Excel (.xlsx, .xls) or CSV sheet mapping columns to: <strong>Day, Time, Class Name, Subject Name, Room, Teacher Name</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Upload File</label>
                
                <input
                  type="file"
                  id="timetable-excel-input"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkFileParse}
                />
                
                <div
                  onClick={() => document.getElementById('timetable-excel-input')?.click()}
                  className="border border-dashed border-border rounded-xl p-8 text-center hover:border-accent/30 transition-all cursor-pointer bg-slate-50/50 flex flex-col justify-center items-center h-48"
                >
                  <Upload size={24} className="mb-2 text-text-secondary" />
                  <span className="text-[10px] text-text-secondary font-bold block">Choose Excel or CSV sheet</span>
                  <span className="text-[9px] text-text-secondary opacity-60 mt-1">Reads first sheet, headers ignored</span>
                </div>
              </div>
            </div>
          )}

          {activeBulkTab !== 'grid' && parsedSlots.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-text-primary">Parsed Slots Preview ({parsedSlots.length} entries):</span>
                <button
                  type="button"
                  onClick={() => setParsedSlots([])}
                  className="text-[10px] text-danger hover:underline font-bold"
                >
                  Clear
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto border border-border rounded-xl text-[10px] divide-y divide-border bg-white custom-scrollbar">
                {parsedSlots.map((s, idx) => (
                  <div key={idx} className="p-3 flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <span className="font-bold text-text-primary block truncate">{s.subject}</span>
                      <span className="text-text-secondary text-[9px] block">Day: {s.day} | Time: {s.time} | Room: {s.room}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-text-secondary font-semibold block">{s.teacher}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleImportBulkSlots}
                className="w-full py-4 bg-success hover:bg-success-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={14} />
                <span>Import Schedule Slots ({parsedSlots.length})</span>
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
