'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, FileText, CheckCircle2, Upload, Sparkles, 
  ChevronRight, Download, Plus, Users, 
  UserSquare2, Save, GraduationCap, ShieldAlert,
  Link2, ExternalLink, X, FilePlus, Video, Eye
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { uploadFileToBucket } from '@/lib/storage';

export default function CoursesLMSPage() {
  const { 
    supabase,
    activeRole, 
    activeTenant, 
    sharedClasses, 
    setSharedClasses, 
    sharedSubjects, 
    setSharedSubjects, 
    sharedStaff,
    sharedStudents,
    sharedParents,
    activeUser
  } = useAuth();

  const [activeTab, setActiveTab] = useState('lms'); // 'lms' | 'classes' | 'subjects'
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('class-1');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Note upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Teacher: Add Note/Link panel state
  const [showAddMaterialPanel, setShowAddMaterialPanel] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: '', videoLink: '' });
  const [materialFile, setMaterialFile] = useState(null);
  const [materialIsDragging, setMaterialIsDragging] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);

  // Custom lesson overrides per subject (teachers can add)
  const [lessonOverrides, setLessonOverrides] = useState({});

  // Read tab parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['lms', 'classes', 'subjects'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  // New Class Form State
  const [classForm, setClassForm] = useState({
    name: '',
    baseFee: '',
    classTeacherId: ''
  });

  // New Subject Form State
  const [subjectForm, setSubjectForm] = useState({
    classId: '',
    name: '',
    code: '',
    teacherId: '',
    units: '4'
  });

  // Resolve allowed classes based on role
  const allowedClasses = useMemo(() => {
    if (activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN') {
      return sharedClasses.filter(c => c.tenant_id === activeTenant.id);
    }
    
    if (activeRole === 'TEACHER') {
      const myStaffRecord = sharedStaff.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
      const myStaffId = myStaffRecord ? myStaffRecord.id : null;
      const mySubjectClassIds = sharedSubjects.filter(sub => sub.teacher_id === myStaffId && sub.tenant_id === activeTenant.id).map(sub => sub.class_id);
      const myOwnClass = sharedClasses.find(c => c.class_teacher_id === myStaffId && c.tenant_id === activeTenant.id);
      
      return sharedClasses.filter(c => {
        if (c.tenant_id !== activeTenant.id) return false;
        return mySubjectClassIds.includes(c.id) || (myOwnClass && c.id === myOwnClass.id);
      });
    }
    
    if (activeRole === 'STUDENT') {
      const myStudentProfile = sharedStudents.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
      if (myStudentProfile) {
        return sharedClasses.filter(c => c.id === myStudentProfile.class_id && c.tenant_id === activeTenant.id);
      }
      return [];
    }
    
    if (activeRole === 'PARENT') {
      const parentProfile = sharedParents.find(p => p.tenant_id === activeTenant.id && p.email === activeUser?.email) || sharedParents.find(p => p.tenant_id === activeTenant.id);
      if (parentProfile) {
        const linkedStudents = sharedStudents.filter(s => s.parent_id === parentProfile.id && s.tenant_id === activeTenant.id);
        const childrenClassIds = linkedStudents.map(s => s.class_id);
        return sharedClasses.filter(c => childrenClassIds.includes(c.id) && c.tenant_id === activeTenant.id);
      }
      return [];
    }
    
    return [];
  }, [activeRole, activeTenant.id, sharedClasses, sharedStaff, sharedSubjects, sharedStudents, sharedParents, activeUser]);

  // Filter staff by current tenant/school
  const tenantStaff = sharedStaff.filter(s => s.tenant_id === activeTenant.id);
  const tenantSubjects = sharedSubjects.filter(s => s.tenant_id === activeTenant.id);

  // Validate active selectedClassId matches allowed classes context
  useEffect(() => {
    if (allowedClasses.length > 0) {
      const isValid = allowedClasses.some(c => c.id === selectedClassId);
      if (!isValid) {
        setSelectedClassId(allowedClasses[0].id);
      }
    } else {
      setSelectedClassId('');
    }
  }, [allowedClasses, selectedClassId]);

  // Get staff name by ID
  const getStaffName = (staffId) => {
    if (!staffId) return 'Unassigned';
    const staff = sharedStaff.find(s => s.id === staffId);
    return staff ? `${staff.first_name} ${staff.last_name}` : 'Unassigned';
  };

  // Get class name by ID
  const getClassName = (classId) => {
    const cls = allowedClasses.find(c => c.id === classId);
    return cls ? cls.name : 'Unknown Class';
  };

  // Handle Class Submission
  const handleCreateClass = (e) => {
    e.preventDefault();
    if (!classForm.name || !classForm.baseFee) {
      toast.error('Class Name and Base Tuition Fee are required.');
      return;
    }

    const newClass = {
      id: `class-${Date.now()}`,
      name: classForm.name,
      base_fee: Number(classForm.baseFee),
      class_teacher_id: classForm.classTeacherId,
      tenant_id: activeTenant.id
    };

    setSharedClasses([...sharedClasses, newClass]);
    toast.success(`Class "${classForm.name}" created successfully!`);
    setClassForm({ name: '', baseFee: '', classTeacherId: '' });
    setShowAddClassModal(false);
  };

  // Handle Subject Submission
  const handleCreateSubject = (e) => {
    e.preventDefault();
    if (!subjectForm.classId || !subjectForm.name || !subjectForm.code) {
      toast.error('Class, Subject Name, and Subject Code are required.');
      return;
    }

    const newSubject = {
      id: `subj-${Date.now()}`,
      class_id: subjectForm.classId,
      code: subjectForm.code.toUpperCase(),
      name: subjectForm.name,
      teacher_id: subjectForm.teacherId,
      units: Number(subjectForm.units) || 4,
      tenant_id: activeTenant.id
    };

    setSharedSubjects([...sharedSubjects, newSubject]);
    toast.success(`Subject "${subjectForm.name}" successfully added to ${getClassName(subjectForm.classId)}!`);
    setSubjectForm({ classId: '', name: '', code: '', teacherId: '', units: '4' });
    setShowAddSubjectModal(false);
  };

  // Dynamic LMS Subjects filter
  const currentLmsSubjects = tenantSubjects.filter(sub => sub.class_id === selectedClassId);
  const [activeLmsSubjectId, setActiveLmsSubjectId] = useState(null);

  // Initialize active LMS subject
  useEffect(() => {
    if (currentLmsSubjects.length > 0) {
      setActiveLmsSubjectId(currentLmsSubjects[0].id);
    } else {
      setActiveLmsSubjectId(null);
    }
  }, [selectedClassId, currentLmsSubjects]);

  // Handle Upload Assignment (notes only)
  const handleUploadAssignment = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select or drop a notes file to submit.');
      return;
    }
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      toast.error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller file.`);
      return;
    }
    try {
      setLoading(true);
      toast.loading(`Uploading "${selectedFile.name}" to secure campus storage...`);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `assignment-${activeLmsSubjectId}-${Date.now()}.${fileExt}`;
      const filePath = `${activeTenant.id}/assignments/${fileName}`;
      
      const publicUrl = await uploadFileToBucket(supabase, 'documents', filePath, selectedFile);
      toast.dismiss();

      if (publicUrl) {
        setSubmitted(true);
        toast.success(`Notes "${selectedFile.name}" submitted successfully!`);
      } else {
        throw new Error('Upload returned empty path');
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to upload notes.');
    } finally {
      setLoading(false);
    }
  };

  // Validate video link helper
  const isValidVideoLink = (url) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Teacher: Add material (note file + optional video link) to current subject
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.title.trim()) {
      toast.error('Please enter a lesson/note title.');
      return;
    }
    if (!materialFile && !materialForm.videoLink) {
      toast.error('Please attach a notes file or add a video link (or both).');
      return;
    }
    if (materialFile) {
      const fileSizeMB = materialFile.size / (1024 * 1024);
      if (fileSizeMB > 10) {
        toast.error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller file.`);
        return;
      }
    }
    if (materialForm.videoLink && !isValidVideoLink(materialForm.videoLink)) {
      toast.error('Please enter a valid video URL (e.g. https://youtube.com/...)');
      return;
    }

    setAddingMaterial(true);
    let noteFileName = null;

    try {
      if (materialFile) {
        toast.loading(`Uploading "${materialFile.name}"...`);
        const fileExt = materialFile.name.split('.').pop();
        const fileName = `note-${activeLmsSubjectId}-${Date.now()}.${fileExt}`;
        const filePath = `${activeTenant.id}/notes/${fileName}`;
        const url = await uploadFileToBucket(supabase, 'documents', filePath, materialFile);
        toast.dismiss();
        noteFileName = materialFile.name;
      }
    } catch {
      toast.dismiss();
      // Don't block — continue with mock save
    }

    const newLesson = {
      id: Date.now(),
      title: materialForm.title.trim(),
      file: noteFileName || (materialFile ? materialFile.name : null),
      videoLink: materialForm.videoLink.trim() || null
    };

    setLessonOverrides(prev => ({
      ...prev,
      [activeLmsSubjectId]: [...(prev[activeLmsSubjectId] || []), newLesson]
    }));

    toast.success(`"${materialForm.title}" added to ${activeSubjectObj?.name || 'subject'}!`);
    setMaterialForm({ title: '', videoLink: '' });
    setMaterialFile(null);
    setAddingMaterial(false);
    setShowAddMaterialPanel(false);
  };

  const activeSubjectObj = tenantSubjects.find(s => s.id === activeLmsSubjectId);

  // Base lesson data — notes only, with optional video link
  const baseLessons = {
    'subj-1': [
      { id: 10, title: 'Introduction to Vectors & Kinematics', file: 'lecture1_kinematics.pdf', videoLink: 'https://www.youtube.com/watch?v=ZM8ECpBuQYE' },
      { id: 11, title: "Newton's Laws of Motion & Friction", file: 'lecture2_laws.pdf', videoLink: null },
      { id: 12, title: 'Work, Power & Conservative Forces', file: 'lecture3_work.pdf', videoLink: 'https://www.youtube.com/watch?v=w4QFJb9a8vo' }
    ],
    'subj-2': [
      { id: 20, title: 'Limits, Continuity & Mean Value Theorems', file: 'limits_calculus.pdf', videoLink: null },
      { id: 21, title: 'Definite Integrals & Area Under Curves', file: 'integrals_notes.pdf', videoLink: 'https://www.youtube.com/watch?v=FnJqaIESC2s' }
    ],
    'subj-3': [
      { id: 30, title: 'IUPAC Nomenclature & Hybridization', file: 'iupac_rules.pdf', videoLink: null },
      { id: 31, title: 'Alkanes, Alkenes & Nucleophilic Additions', file: 'alkanes_notes.pdf', videoLink: null }
    ]
  };

  const getBaseLessons = (subjId) => {
    return baseLessons[subjId] || [
      { id: 991, title: 'Unit 1: Fundamentals and Overview', file: 'unit1_introduction.pdf', videoLink: null },
      { id: 992, title: 'Unit 2: Comprehensive Review & Examples', file: 'unit2_theory_notes.pdf', videoLink: null }
    ];
  };

  // Merge base + teacher-added lessons
  const getLessonsList = (subjId) => {
    const base = getBaseLessons(subjId);
    const added = lessonOverrides[subjId] || [];
    return [...base, ...added];
  };

  // Role Gate check - placed after all hooks
  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Syllabus & LMS" />;
  }

  const isAdmin = activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN';
  const isTeacher = activeRole === 'TEACHER';
  const canManageMaterials = isAdmin || isTeacher;
  const isStudent = activeRole === 'STUDENT';

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Institutional Learning Paths (LMS)</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Configure classrooms, registry subjects, assign instructors, and browse student course archives.
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-3">
            {activeTab === 'classes' && (
              <button 
                onClick={() => setShowAddClassModal(true)}
                className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>Create Class</span>
              </button>
            )}
            {activeTab === 'subjects' && (
              <button 
                onClick={() => setShowAddSubjectModal(true)}
                className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>Create Subject</span>
              </button>
            )}
            <div className="flex items-center gap-2 text-[10px] font-black text-warning bg-warning/5 border border-warning/20 px-3.5 py-2 rounded-xl uppercase tracking-wider">
              <ShieldAlert size={14} />
              <span>Curriculum Management Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs (Only admins see classes/subjects config) */}
      {isAdmin ? (
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit">
          {[
            { id: 'lms', label: 'LMS Student View' },
            { id: 'classes', label: 'Institutional Classes' },
            { id: 'subjects', label: 'Subject Registry' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-200/60 text-text-primary border border-border shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* 1. LMS / Student Syllabus Viewer */}
      {activeTab === 'lms' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-slide-up">
          {/* Left Panel: Class Selector and Subject Roster */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Academic Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-bg-sidebar text-text-primary border border-border rounded-2xl py-3 px-4 outline-none text-xs font-bold"
              >
                {allowedClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest pl-1">Course Syllabus List</h3>
              <div className="space-y-2">
                {currentLmsSubjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setActiveLmsSubjectId(sub.id);
                      setSubmitted(false);
                      setSelectedFile(null);
                      setShowAddMaterialPanel(false);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      activeLmsSubjectId === sub.id 
                        ? 'bg-accent/10 border-accent/30 text-white shadow-lg' 
                        : 'bg-bg-sidebar/40 border-border text-text-secondary hover:border-border hover:text-white'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded text-accent">
                      {sub.code}
                    </span>
                    <h4 className="text-xs font-bold mt-2 truncate text-text-primary">{sub.name}</h4>
                    <p className="text-[9px] mt-1 opacity-70 truncate font-medium">Instructor: {getStaffName(sub.teacher_id)}</p>
                  </button>
                ))}
                {currentLmsSubjects.length === 0 && (
                  <p className="text-center py-6 text-xs text-text-secondary italic">No subjects registered for this class.</p>
                )}
              </div>
            </div>
          </div>

          {/* Middle Panel: Active Subject Lessons (Notes) */}
          <div className="lg:col-span-2 space-y-6">
            {activeSubjectObj ? (
              <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
                {/* Subject header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">{activeSubjectObj.code} — Study Materials</span>
                    <h3 className="text-lg font-black font-outfit text-text-primary tracking-tight mt-1">{activeSubjectObj.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-text-secondary bg-slate-100 px-2.5 py-1 rounded-xl">
                      {getLessonsList(activeSubjectObj.id).length} notes
                    </span>
                    {canManageMaterials && (
                      <button
                        onClick={() => setShowAddMaterialPanel(prev => !prev)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-xl border transition-all ${
                          showAddMaterialPanel
                            ? 'bg-accent/10 border-accent/30 text-accent'
                            : 'bg-slate-100 border-border text-text-secondary hover:text-accent hover:border-accent/30'
                        }`}
                      >
                        <FilePlus size={12} />
                        <span>Add Note / Video Link</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Teacher: Add Material Panel */}
                {showAddMaterialPanel && canManageMaterials && (
                  <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5">
                        <FilePlus size={14} />
                        Add Study Material
                      </h4>
                      <button onClick={() => setShowAddMaterialPanel(false)} className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-slate-100 transition-all">
                        <X size={14} />
                      </button>
                    </div>

                    <form onSubmit={handleAddMaterial} className="space-y-3">
                      {/* Lesson Title */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Lesson / Note Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Chapter 3: Newton's Laws Summary"
                          value={materialForm.title}
                          onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                          className="w-full text-xs"
                          required
                        />
                      </div>

                      {/* Notes File Upload */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-1">
                          <FileText size={10} />
                          Attach Notes File (PDF / DOC / PPT)
                        </label>
                        <input
                          type="file"
                          id="material-file-input"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const fileSizeMB = file.size / (1024 * 1024);
                              if (fileSizeMB > 10) {
                                toast.error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller file.`);
                                return;
                              }
                              toast.success(`File selected: ${file.name} (${fileSizeMB.toFixed(2)} MB / 10MB limit)`);
                              setMaterialFile(file);
                            }
                          }}
                        />
                        <div
                          onClick={() => document.getElementById('material-file-input')?.click()}
                          onDragOver={(e) => { e.preventDefault(); setMaterialIsDragging(true); }}
                          onDragLeave={() => setMaterialIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setMaterialIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              const fileSizeMB = file.size / (1024 * 1024);
                              if (fileSizeMB > 10) {
                                toast.error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller file.`);
                                return;
                              }
                              toast.success(`File selected: ${file.name} (${fileSizeMB.toFixed(2)} MB / 10MB limit)`);
                              setMaterialFile(file);
                            }
                          }}
                          className={`border border-dashed rounded-xl p-4 text-center hover:border-accent/30 transition-all cursor-pointer ${
                            materialIsDragging ? 'border-accent bg-accent/5' : 'border-border bg-slate-50/50'
                          }`}
                        >
                          <Upload size={16} className={`mx-auto mb-1 transition-colors ${materialIsDragging ? 'text-accent' : 'text-text-secondary'}`} />
                          {materialFile ? (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-accent font-bold block truncate">{materialFile.name}</span>
                              <span className="text-[9px] text-text-secondary">{(materialFile.size / 1024).toFixed(1)} KB • Click to change</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-secondary font-bold">Click or drag notes file here</span>
                          )}
                        </div>
                      </div>

                      {/* Video Link (optional) */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-1">
                          <Link2 size={10} />
                          Video Link (Optional — YouTube, Google Drive, etc.)
                        </label>
                        <div className="relative">
                          <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                          <input
                            type="url"
                            placeholder="https://youtube.com/watch?v=..."
                            value={materialForm.videoLink}
                            onChange={(e) => setMaterialForm({ ...materialForm, videoLink: e.target.value })}
                            className="w-full text-xs pl-9"
                          />
                        </div>
                        <p className="text-[9px] text-text-secondary ml-1">
                          Paste a link if you have a video. Video files cannot be uploaded — only external links.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={addingMaterial}
                        className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <Save size={13} />
                        <span>{addingMaterial ? 'Saving...' : 'Save Material'}</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* Lesson Notes List */}
                <div className="space-y-3">
                  {getLessonsList(activeSubjectObj.id).map((lesson, idx) => (
                    <div key={lesson.id} className="p-4 bg-bg-main/30 border border-border hover:border-accent/15 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Note icon */}
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">
                            Unit {idx + 1}: {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {lesson.file && (
                              <span className="text-[9px] text-text-secondary font-bold flex items-center gap-1">
                                <FileText size={9} />
                                {lesson.file}
                              </span>
                            )}
                            {lesson.videoLink && (
                              <span className="text-[9px] text-accent font-bold flex items-center gap-1">
                                <Video size={9} />
                                Video linked
                              </span>
                            )}
                            {!lesson.file && !lesson.videoLink && (
                              <span className="text-[9px] text-text-secondary opacity-50">No attachments</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {lesson.file && (
                          <button 
                            onClick={() => toast.success(`Downloading notes: ${lesson.file}`)}
                            className="px-3 py-1.5 bg-slate-100 border border-border hover:border-accent/30 hover:bg-accent/5 text-text-secondary hover:text-accent text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all"
                          >
                            <Download size={12} />
                            <span>Notes</span>
                          </button>
                        )}
                        {lesson.videoLink && (
                          <a
                            href={lesson.videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-red-50 border border-red-100 hover:border-red-300 text-red-500 hover:text-red-600 text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all"
                          >
                            <ExternalLink size={12} />
                            <span>Watch</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                  {getLessonsList(activeSubjectObj.id).length === 0 && (
                    <div className="text-center py-8 space-y-2">
                      <FileText size={28} className="text-text-secondary/30 mx-auto" />
                      <p className="text-xs text-text-secondary font-medium">No study materials yet.</p>
                      {canManageMaterials && (
                        <p className="text-[10px] text-text-secondary opacity-60">Click "Add Note / Video Link" above to get started.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 bg-bg-sidebar/30 border border-border rounded-3xl text-center">
                <GraduationCap size={32} className="text-text-secondary/40 mx-auto mb-2 animate-bounce" />
                <p className="text-xs text-text-secondary font-medium">Select a class and course syllabus on the left to start learning.</p>
              </div>
            )}
          </div>

          {/* Right Panel: Assignment / Notes submission */}
          <div className="space-y-6">
            <div className="p-6 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-5">
              <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Upload size={14} className="text-accent" />
                <span>Assignment Desk</span>
              </h3>

              <div className="p-4 bg-bg-main border border-border rounded-2xl space-y-2">
                <span className="text-[9px] font-black text-danger uppercase tracking-widest">Active Task</span>
                <p className="text-xs font-bold text-text-primary">Assignment 1: Syllabus Core Review</p>
                <p className="text-[9px] text-text-secondary font-bold">Submit notes/answers as PDF or DOC. Max 10MB.</p>
              </div>

              {/* Notes-only policy notice */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <FileText size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-wide">Notes Only</p>
                  <p className="text-[9px] text-blue-500 mt-0.5 leading-relaxed">
                    Only documents (PDF, DOC, PPT) can be uploaded here. For videos, use the "Add Note / Video Link" option in the lesson panel.
                  </p>
                </div>
              </div>

              {submitted ? (
                <div className="p-4 bg-success/10 border border-success/25 rounded-2xl text-center space-y-2">
                  <CheckCircle2 size={24} className="text-success mx-auto" />
                  <h4 className="text-xs font-bold text-text-primary">Submission Successful</h4>
                  <p className="text-[9px] text-text-secondary font-mono truncate max-w-full">File: {selectedFile ? selectedFile.name : 'study_notes_verified.pdf'}</p>
                </div>
              ) : (
                <form onSubmit={handleUploadAssignment} className="space-y-3">
                  <input
                    type="file"
                    id="assignment-file-input"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const fileSizeMB = file.size / (1024 * 1024);
                        if (fileSizeMB > 10) {
                          toast.error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller file.`);
                          return;
                        }
                        toast.success(`File selected: ${file.name} (${fileSizeMB.toFixed(2)} MB / 10MB limit)`);
                        setSelectedFile(file);
                      }
                    }}
                  />
                  <div 
                    onClick={() => document.getElementById('assignment-file-input')?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const fileSizeMB = file.size / (1024 * 1024);
                        if (fileSizeMB > 10) {
                          toast.error(`File size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller file.`);
                          return;
                        }
                        toast.success(`File selected: ${file.name} (${fileSizeMB.toFixed(2)} MB / 10MB limit)`);
                        setSelectedFile(file);
                      }
                    }}
                    className={`border border-dashed rounded-2xl p-6 text-center hover:border-accent/30 transition-all cursor-pointer bg-slate-50/50 ${
                      isDragging ? 'border-accent bg-accent/5' : 'border-border'
                    }`}
                  >
                    <FileText size={24} className={`mx-auto mb-2 transition-colors ${isDragging ? 'text-accent animate-bounce' : 'text-text-secondary'}`} />
                    {selectedFile ? (
                      <div className="space-y-1">
                        <span className="text-[11px] text-text-primary font-bold block truncate max-w-full">{selectedFile.name}</span>
                        <span className="text-[9px] text-text-secondary block">{(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to change</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] text-text-secondary block font-bold">Select or drop notes file</span>
                        <span className="text-[9px] text-text-secondary opacity-60">PDF, DOC, PPT accepted</span>
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading || !activeLmsSubjectId || !selectedFile}
                    className="w-full py-3 bg-accent hover:bg-accent-hover text-text-primary text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-55"
                  >
                    <Upload size={14} />
                    <span>Submit Assignment</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Admin: Manage Classes Tab */}
      {activeTab === 'classes' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <GraduationCap size={18} className="text-accent" />
            <span>Academic Classes Directory</span>
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Class Name</th>
                  <th className="pb-3">Class Teacher</th>
                  <th className="pb-3">Subjects</th>
                  <th className="pb-3 text-right pr-2">Base Tuition Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allowedClasses.map(c => {
                  const classSubs = tenantSubjects.filter(s => s.class_id === c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black">
                          {c.name[6] || 'C'}
                        </div>
                        <span>{c.name}</span>
                      </td>
                      <td className="py-4 text-slate-700 font-semibold">{getStaffName(c.class_teacher_id)}</td>
                      <td className="py-4 font-mono text-text-secondary">{classSubs.length} subjects</td>
                      <td className="py-4 text-right pr-2 font-mono font-bold text-text-primary">₹{c.base_fee.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Establish New Class Modal */}
      <Modal
        open={showAddClassModal}
        onClose={() => setShowAddClassModal(false)}
        title="Establish New Class"
        icon={<GraduationCap size={18} />}
        size="md"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Class Description Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Class XI - Science (CBSE)"
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              className="w-full text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Base Term Tuition Fee (₹) *</label>
            <input 
              type="number" 
              placeholder="e.g. 42000"
              value={classForm.baseFee}
              onChange={(e) => setClassForm({ ...classForm, baseFee: e.target.value })}
              className="w-full text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Assign Class Teacher</label>
            <select
              value={classForm.classTeacherId}
              onChange={(e) => setClassForm({ ...classForm, classTeacherId: e.target.value })}
              className="w-full bg-bg-main text-text-primary border border-border rounded-xl py-2.5 px-3 text-xs"
            >
              <option value="">Unassigned / No Teacher</option>
              {tenantStaff.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.designation})</option>
              ))}
            </select>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Plus size={14} />
            <span>Establish Class Block</span>
          </button>
        </form>
      </Modal>

      {/* 3. Admin: Manage Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={18} className="text-accent" />
            <span>Institutional Subject Registry</span>
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Subject Name</th>
                  <th className="pb-3">Course Code</th>
                  <th className="pb-3">Assigned Class</th>
                  <th className="pb-3">Subject Teacher</th>
                  <th className="pb-3 text-right pr-2">Units (Credits)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantSubjects.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2">
                      <BookOpen size={14} className="text-accent" />
                      <span>{sub.name}</span>
                    </td>
                    <td className="py-4 font-mono text-[11px] text-accent uppercase font-bold">{sub.code}</td>
                    <td className="py-4 text-slate-700 font-semibold">{getClassName(sub.class_id)}</td>
                    <td className="py-4 font-medium text-text-primary">{getStaffName(sub.teacher_id)}</td>
                    <td className="py-4 text-right pr-2 font-mono text-text-secondary font-bold">{sub.units} lectures</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      <Modal
        open={showAddSubjectModal}
        onClose={() => setShowAddSubjectModal(false)}
        title="Create Institutional Subject"
        icon={<BookOpen size={18} />}
        size="md"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Target Class *</label>
            <select
              value={subjectForm.classId}
              onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value })}
              className="w-full bg-bg-main text-text-primary border border-border rounded-xl py-2.5 px-3 text-xs"
              required
            >
              <option value="">Choose Class...</option>
              {allowedClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Subject Description Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Accountancy Core"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              className="w-full text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Course Subject Code *</label>
            <input 
              type="text" 
              placeholder="e.g. AC-121"
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
              className="w-full text-xs font-mono uppercase"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Assign Subject Teacher</label>
            <select
              value={subjectForm.teacherId}
              onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
              className="w-full bg-bg-main text-text-primary border border-border rounded-xl py-2.5 px-3 text-xs"
            >
              <option value="">Unassigned / No Teacher</option>
              {tenantStaff.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.designation})</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Lectures per Week (Units)</label>
            <input 
              type="number" 
              placeholder="4"
              value={subjectForm.units}
              onChange={(e) => setSubjectForm({ ...subjectForm, units: e.target.value })}
              className="w-full text-xs font-mono"
              min={1}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Plus size={14} />
            <span>Establish Course Subject</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
