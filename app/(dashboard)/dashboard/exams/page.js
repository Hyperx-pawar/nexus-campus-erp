'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState } from 'react';
import { 
  ClipboardList, Search, Plus, BookOpen, UserCheck, 
  CheckCircle2, ShieldCheck, ArrowRight, Printer, Save, FileText
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';

export default function ExamsPage() {
  const {
    activeTenant, 
    sharedStudents, 
    sharedAcademicRecords, 
    setSharedAcademicRecords,
    sharedClasses,
    sharedSubjects,
    activeRole,
    activeUser,
    sharedStaff,
    sharedParents
  } = useAuth();

  const [activeTab, setActiveTab] = useState('reportcard'); // Initialized to reportcard, updated in useEffect
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Physics Core theory');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isBulkReportMode, setIsBulkReportMode] = useState(false);
  const [selectedBulkReportIds, setSelectedBulkReportIds] = useState([]);

  // Resolve student ID for student role
  const myStudentProfile = React.useMemo(() => {
    return sharedStudents.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
  }, [sharedStudents, activeTenant.id, activeUser]);
  const myStudentId = myStudentProfile ? myStudentProfile.id : '';

  // Resolve parent profile & children
  const myParentProfile = React.useMemo(() => {
    return sharedParents.find(p => p.tenant_id === activeTenant.id && p.email === activeUser?.email);
  }, [sharedParents, activeTenant.id, activeUser]);

  const parentChildren = React.useMemo(() => {
    if (!myParentProfile) return [];
    return sharedStudents.filter(s => s.parent_id === myParentProfile.id && s.tenant_id === activeTenant.id);
  }, [sharedStudents, myParentProfile, activeTenant.id]);

  // Auto set tab and selected student based on role to prevent unauthorized views
  React.useEffect(() => {
    if (activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'TEACHER') {
      setActiveTab('grade');
    } else {
      setActiveTab('reportcard');
      setIsBulkReportMode(false);
      if (activeRole === 'STUDENT' && myStudentId) {
        setSelectedStudentId(myStudentId);
      } else if (activeRole === 'PARENT' && parentChildren.length > 0) {
        setSelectedStudentId(parentChildren[0].id);
      }
    }
  }, [activeRole, myStudentId, parentChildren]);

  // Resolve allowed tabs based on role
  const availableTabs = React.useMemo(() => {
    if (activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'TEACHER') {
      return [
        { id: 'grade', label: 'Grade Entry Book' },
        { id: 'categories', label: 'Exam Categories' },
        { id: 'reportcard', label: 'Print Report Cards' }
      ];
    }
    return [
      { id: 'reportcard', label: activeRole === 'STUDENT' ? 'My Report Card' : 'Child\'s Report Card' }
    ];
  }, [activeRole]);

  // Resolve allowed classes for teachers (subject-classes + own-class)
  const teacherAllowedClasses = React.useMemo(() => {
    if (activeRole !== 'TEACHER') {
      return sharedClasses.filter(c => c.tenant_id === activeTenant.id);
    }
    const myStaffRecord = sharedStaff.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.includes(s.first_name));
    const myStaffId = myStaffRecord ? myStaffRecord.id : null;
    const mySubjectClassIds = sharedSubjects.filter(sub => sub.teacher_id === myStaffId).map(sub => sub.class_id);
    const myOwnClass = sharedClasses.find(c => c.class_teacher_id === myStaffId);
    
    return sharedClasses.filter(c => {
      if (c.tenant_id !== activeTenant.id) return false;
      return mySubjectClassIds.includes(c.id) || (myOwnClass && c.id === myOwnClass.id);
    });
  }, [activeRole, activeTenant, sharedClasses, sharedStaff, sharedSubjects, activeUser]);

  const teacherAllowedClassIds = React.useMemo(() => teacherAllowedClasses.map(c => c.id), [teacherAllowedClasses]);

  // Filter students by active school and teacher allowed classes
  const tenantStudents = React.useMemo(() => {
    return sharedStudents.filter(s => {
      if (s.tenant_id !== activeTenant.id) return false;
      if (activeRole === 'TEACHER') {
        return teacherAllowedClassIds.includes(s.class_id);
      }
      return true;
    });
  }, [sharedStudents, activeTenant.id, activeRole, teacherAllowedClassIds]);

  // Set default selectedClass on mount or when allowed classes change
  React.useEffect(() => {
    if (teacherAllowedClasses.length > 0) {
      setSelectedClass(teacherAllowedClasses[0].id);
    } else {
      setSelectedClass('');
    }
  }, [teacherAllowedClasses]);

  // Bulk report card students resolved at top level
  const allClassStudents = React.useMemo(() => {
    return selectedClass 
      ? tenantStudents.filter(s => s.class_id === selectedClass)
      : tenantStudents;
  }, [selectedClass, tenantStudents]);

  React.useEffect(() => {
    const newIds = allClassStudents.map(s => s.id);
    setSelectedBulkReportIds(prev => {
      if (prev.length === newIds.length && prev.every((id, idx) => id === newIds[idx])) {
        return prev;
      }
      return newIds;
    });
  }, [allClassStudents]);

  // Load subjects belonging to selected class, or default to all subjects
  const classSubjects = sharedSubjects.filter(sub => sub.tenant_id === activeTenant.id && (!selectedClass || sub.class_id === selectedClass));

  // Set default subject when class changes
  React.useEffect(() => {
    if (classSubjects.length > 0) {
      const matches = classSubjects.some(sub => sub.name === selectedSubject);
      if (!matches) {
        setSelectedSubject(classSubjects[0].name);
      }
    } else {
      setSelectedSubject('');
    }
  }, [selectedClass, sharedSubjects]);

  const [examCategories, setExamCategories] = useState([
    { name: 'Term 1 Mid-Sem Assessment', code: 'MID1', weightage: 30 },
    { name: 'Term 2 Theory Assessment', code: 'THEO2', weightage: 50 },
    { name: 'Board Practical Evaluation', code: 'PRAC', weightage: 20 }
  ]);

  const [newCategory, setNewCategory] = useState({ name: '', code: '', weightage: 20 });
  const [editMarks, setEditMarks] = useState({});

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Exams & Marksheets" />;
  }

  const getClassName = (classId) => {
    const cls = sharedClasses.find(c => c.id === classId);
    return cls ? cls.name : 'Unknown Class';
  };

  // Enforce CBSE grading ranges
  const calculateCBSEGrade = (marksObtained, maxMarks = 100) => {
    const percentage = (marksObtained / maxMarks) * 100;
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    return 'D (Fail)';
  };

  // Load students belonging to selected class
  const classStudents = tenantStudents.filter(s => !selectedClass || s.class_id === selectedClass);

  const handleSaveGrades = (e) => {
    e.preventDefault();
    
    // Update academic records context
    const updatedRecords = { ...sharedAcademicRecords };
    
    Object.keys(editMarks).forEach(studentId => {
      const markValue = Number(editMarks[studentId]);
      if (isNaN(markValue) || markValue < 0 || markValue > 100) {
        toast.error('Marks must be a valid number between 0 and 100.');
        return;
      }

      const currentStudentRecords = updatedRecords[studentId] || [];
      const recordIndex = currentStudentRecords.findIndex(r => r.subject === selectedSubject);
      
      const newRecord = {
        subject: selectedSubject,
        marks: `${markValue} / 100`,
        grade: calculateCBSEGrade(markValue),
        desc: 'Class Avg: 76'
      };

      if (recordIndex !== -1) {
        currentStudentRecords[recordIndex] = newRecord;
      } else {
        currentStudentRecords.push(newRecord);
      }
      
      updatedRecords[studentId] = currentStudentRecords;
    });

    setSharedAcademicRecords(updatedRecords);
    toast.success('Subject marksheets updated and synced with dynamic parent portals successfully!');
    setEditMarks({});
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategory.name || !newCategory.code) {
      toast.error('Exam name and code identifier are required.');
      return;
    }

    setExamCategories([...examCategories, {
      name: newCategory.name,
      code: newCategory.code.toUpperCase(),
      weightage: Number(newCategory.weightage)
    }]);

    toast.success(`Exam structure category "${newCategory.name}" established!`);
    setNewCategory({ name: '', code: '', weightage: 20 });
    setShowAddCategoryModal(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Report Card generation helper
  const reportCardStudent = tenantStudents.find(s => s.id === selectedStudentId);
  const reportCardRecords = reportCardStudent ? (sharedAcademicRecords[reportCardStudent.id] || []) : [];

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Assessments & Board Exams</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Configure marksheet categories, record student academic scores, and generate CBSE report cards.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'categories' && (
            <button 
              onClick={() => setShowAddCategoryModal(true)}
              className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              <span>Add Category</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-[10px] font-black text-accent bg-accent/5 border border-accent/20 px-3.5 py-2 rounded-xl uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>CBSE Grading Engine Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit no-print">
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedClass(teacherAllowedClasses[0]?.id || '');
              if (activeRole !== 'STUDENT' && activeRole !== 'PARENT') {
                setSelectedStudentId(tenantStudents[0]?.id || '');
              }
            }}
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

      {/* Content Area */}
      {activeTab === 'grade' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-border pb-4">
            <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Academic Grade Book</h3>
            
            <div className="flex flex-wrap gap-3 items-center no-print">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-bg-main border border-border rounded-xl py-2 px-3 text-xs text-text-primary outline-none cursor-pointer"
              >
                <option value="">Select Class...</option>
                {teacherAllowedClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-bg-main border border-border rounded-xl py-2 px-3 text-xs text-text-primary outline-none cursor-pointer font-bold"
              >
                {classSubjects.length > 0 ? (
                  classSubjects.map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name} ({sub.code})</option>
                  ))
                ) : (
                  <option value="">No subjects registered</option>
                )}
              </select>
            </div>
          </div>

          <form onSubmit={handleSaveGrades} className="space-y-6">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                    <th className="pb-3 pl-2">Student Name</th>
                    <th className="pb-3">Class</th>
                    <th className="pb-3">Admission No</th>
                    <th className="pb-3">Current Score</th>
                    <th className="pb-3">Subject Grade</th>
                    <th className="pb-3 text-right pr-2">Enter Score (Max 100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {classStudents.map(stud => {
                    const records = sharedAcademicRecords[stud.id] || [];
                    const record = records.find(r => r.subject === selectedSubject) || { marks: 'N/A', grade: 'N/A' };
                    
                    return (
                      <tr key={stud.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 pl-2 font-bold text-text-primary flex items-center gap-2">
                          <BookOpen size={14} className="text-accent" />
                          {stud.first_name} {stud.last_name}
                        </td>
                        <td className="py-3.5 text-slate-700 font-semibold">{getClassName(stud.class_id)}</td>
                        <td className="py-3.5 font-mono text-text-secondary">{stud.admission_no}</td>
                        <td className="py-3.5 font-mono font-bold text-text-primary">{record.marks}</td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 bg-accent/15 border border-accent/35 text-accent text-[9px] font-black rounded font-mono">
                            {record.grade}
                          </span>
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <input 
                            type="number" 
                            placeholder="Enter marks"
                            max={100}
                            min={0}
                            value={editMarks[stud.id] !== undefined ? editMarks[stud.id] : ''}
                            onChange={(e) => setEditMarks({ ...editMarks, [stud.id]: e.target.value })}
                            className="bg-bg-main border border-border rounded-xl px-3 py-1.5 w-24 text-right text-xs font-mono text-text-primary outline-none focus:border-accent/40"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {classStudents.length === 0 && (
              <p className="text-center py-6 text-xs text-text-secondary">No students enrolled in the selected class.</p>
            )}

            {classStudents.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-3 bg-success hover:bg-success-hover text-text-primary text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-success/15 active:scale-95"
                >
                  <Save size={14} />
                  <span>Settle Grades Sheet</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-4">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Exam Configurations</h3>
          <div className="space-y-3">
            {examCategories.map((c, i) => (
              <div key={i} className="p-4 bg-bg-card/85 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-border rounded-2xl flex justify-between items-center gap-4 hover:border-accent/15 transition-all">
                <div>
                  <h4 className="text-sm font-bold text-text-primary">{c.name}</h4>
                  <span className="text-[9px] text-text-secondary font-mono uppercase font-black">{c.code}</span>
                </div>
                <span className="px-3.5 py-1 bg-accent/15 border border-accent/35 text-accent font-black text-xs rounded-xl font-mono">{c.weightage}% weightage</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Exam Category Modal */}
      <Modal
        open={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        title="Add Exam Category"
        icon={<Plus size={18} />}
        size="md"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Category Description *</label>
            <input 
              type="text" 
              placeholder="Category Description"
              value={newCategory.name}
              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
              className="w-full text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Category Code (e.g. MID2) *</label>
            <input 
              type="text" 
              placeholder="Category Code (e.g. MID2)"
              value={newCategory.code}
              onChange={(e) => setNewCategory({...newCategory, code: e.target.value})}
              className="w-full text-xs font-mono uppercase"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Category Weightage % *</label>
            <input 
              type="number" 
              placeholder="Category Weightage %"
              value={newCategory.weightage}
              onChange={(e) => setNewCategory({...newCategory, weightage: e.target.value})}
              className="w-full text-xs font-mono"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Plus size={14} />
            <span>Establish Category</span>
          </button>
        </form>
      </Modal>
      {activeTab === 'reportcard' && (() => {
        const classStudents = allClassStudents.filter(s => selectedBulkReportIds.includes(s.id));

        return (
          <div className="space-y-6">
            
            {/* Filter Bar */}
            {activeRole !== 'STUDENT' && (
              <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl flex flex-wrap gap-4 items-center justify-between no-print">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Mode Selector */}
                  {(activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN' || activeRole === 'TEACHER') && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Print Mode</span>
                      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 border border-border rounded-xl">
                        <button 
                          onClick={() => setIsBulkReportMode(false)}
                          className={`px-3 py-1.5 text-center text-[10px] font-black uppercase rounded-lg transition-all ${!isBulkReportMode ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                          Single Student
                        </button>
                        <button 
                          onClick={() => setIsBulkReportMode(true)}
                          className={`px-3 py-1.5 text-center text-[10px] font-black uppercase rounded-lg transition-all ${isBulkReportMode ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                          Bulk Class Print
                        </button>
                      </div>
                    </div>
                  )}

                  {!isBulkReportMode ? (
                    /* Single Student Selector */
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Select Student</span>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="bg-bg-main border border-border rounded-xl py-2 px-3 text-xs text-text-primary outline-none cursor-pointer font-bold"
                      >
                        <option value="">Choose Student...</option>
                        {activeRole === 'PARENT' ? (
                          parentChildren.map(s => (
                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                          ))
                        ) : (
                          tenantStudents.map(s => (
                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                          ))
                        )}
                      </select>
                    </div>
                  ) : (
                    /* Bulk Class Selector & Student Multi-Select */
                    <>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Target Academic Class</span>
                        <select
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="bg-bg-main border border-border rounded-xl py-2 px-3 text-xs text-text-primary outline-none cursor-pointer font-bold"
                        >
                          <option value="">Select Class...</option>
                          {teacherAllowedClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Selective Student Dropdown / Multi-Select Panel */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Select Students</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedBulkReportIds.length === allClassStudents.length) {
                                setSelectedBulkReportIds([]);
                              } else {
                                setSelectedBulkReportIds(allClassStudents.map(s => s.id));
                              }
                            }}
                            className="text-[9px] font-bold text-accent hover:underline uppercase bg-transparent p-0 ml-4 cursor-pointer"
                          >
                            {selectedBulkReportIds.length === allClassStudents.length ? 'None' : 'All'}
                          </button>
                        </div>

                        <div className="relative">
                          <div className="w-64 max-h-24 overflow-y-auto custom-scrollbar border border-border rounded-xl bg-slate-50 dark:bg-slate-800 p-2 space-y-1">
                            {allClassStudents.map(s => {
                              const isChecked = selectedBulkReportIds.includes(s.id);
                              return (
                                <label key={s.id} className="flex items-center gap-2 cursor-pointer text-[10px] font-semibold text-text-secondary hover:text-text-primary">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setSelectedBulkReportIds(selectedBulkReportIds.filter(id => id !== s.id));
                                      } else {
                                        setSelectedBulkReportIds([...selectedBulkReportIds, s.id]);
                                      }
                                    }}
                                    className="rounded text-accent focus:ring-accent"
                                  />
                                  <span className="truncate flex-1">{s.first_name} {s.last_name}</span>
                                </label>
                              );
                            })}
                            {allClassStudents.length === 0 && (
                              <p className="text-center py-2 text-[9px] text-text-secondary">No students in class</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 self-end"
                >
                  <Printer size={14} />
                  <span>{isBulkReportMode ? `Print Class Roster (${classStudents.length})` : 'Print Report Card'}</span>
                </button>
              </div>
            )}

            {/* If Student, show a simple header with a print button */}
            {activeRole === 'STUDENT' && (
              <div className="flex justify-between items-center bg-bg-sidebar/55 border border-border p-6 rounded-3xl no-print">
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Your Term 1 Academic Performance Summary</h4>
                  <p className="text-[10px] text-text-secondary">Official print-ready report card generated by CBSE core grading module.</p>
                </div>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  <Printer size={14} />
                  <span>Print Report Card</span>
                </button>
              </div>
            )}

            {/* Printable Report Cards Area */}
            {!isBulkReportMode ? (
              reportCardStudent ? (
                /* Single Report Card preview */
                <div className="max-w-2xl mx-auto p-8 bg-bg-card/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none">
                  {/* Institutional Header */}
                  <div className="text-center pb-6 border-b border-border space-y-2 print:border-black/10">
                    <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em] block print:text-blue-600">Academic Roster Certificate</span>
                    <h4 className="text-2xl font-black font-outfit text-text-primary tracking-tight print:text-black">{activeTenant.name}</h4>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">Affiliation: CBSE Core Board Registration • Q1 Term Evaluation</p>
                  </div>

                  {/* Student Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs p-4 bg-bg-main/50 border border-border rounded-2xl print:bg-slate-100 print:text-black print:border-black/15">
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase">Student Name</p>
                      <p className="font-bold text-text-primary print:text-black">{reportCardStudent.first_name} {reportCardStudent.last_name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase">Academic Class</p>
                      <p className="font-bold text-text-primary print:text-black">{getClassName(reportCardStudent.class_id)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase">Admission ID</p>
                      <p className="font-bold text-text-primary font-mono print:text-black">{reportCardStudent.admission_no}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase">Aadhaar Card No</p>
                      <p className="font-bold text-text-primary font-mono print:text-black">{reportCardStudent.aadhaar_no || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Marks Table */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Evaluated Course Modules</span>
                    <div className="overflow-hidden border border-border rounded-2xl print:border-black/10">
                      <table className="w-full text-left border-collapse text-xs print:text-black">
                        <thead>
                          <tr className="bg-slate-100/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest print:bg-slate-200">
                            <th className="p-3">Course Module</th>
                            <th className="p-3">Marks Obtained</th>
                            <th className="p-3">Max Marks</th>
                            <th className="p-3 text-right">CBSE Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportCardRecords.map((score, i) => {
                            const marksNum = Number(score.marks.split(' / ')[0]);
                            return (
                              <tr key={i} className="border-b border-border hover:bg-slate-50/50 last:border-none print:border-black/5">
                                <td className="p-3 font-bold text-text-primary flex items-center gap-1.5 print:text-black">
                                  <FileText size={12} className="text-accent" />
                                  {score.subject}
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-700 print:text-black">{marksNum}</td>
                                <td className="p-3 font-mono text-text-secondary print:text-black">100</td>
                                <td className="p-3 text-right font-mono font-black text-accent print:text-blue-600">{score.grade}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="flex justify-between items-end pt-12 text-[10px] text-text-secondary font-bold font-mono">
                    <div className="text-center space-y-1">
                      <div className="w-32 border-b border-border print:border-black/20"></div>
                      <span>HOD Core Academics</span>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="w-32 border-b border-border print:border-black/20"></div>
                      <span>Office Principal Stamp</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-text-secondary">Please select a student from the dropdown roster above.</p>
              )
            ) : (
              /* Bulk Report Cards preview lists */
              classStudents.length > 0 ? (
                <div className="space-y-8 print:space-y-0">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block text-center no-print">
                    Batch Print Preview ({classStudents.length} Report Cards)
                  </span>
                  {classStudents.map((stud) => {
                    const studentRecords = sharedAcademicRecords[stud.id] || [];
                    return (
                      <div key={stud.id} className="max-w-2xl mx-auto p-8 bg-bg-card/60 border border-border rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none page-break">
                        {/* Institutional Header */}
                        <div className="text-center pb-6 border-b border-border space-y-2 print:border-black/10">
                          <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em] block print:text-blue-600">Academic Roster Certificate</span>
                          <h4 className="text-2xl font-black font-outfit text-text-primary tracking-tight print:text-black">{activeTenant.name}</h4>
                          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">Affiliation: CBSE Core Board Registration • Q1 Term Evaluation</p>
                        </div>

                        {/* Student Metadata */}
                        <div className="grid grid-cols-2 gap-4 text-xs p-4 bg-bg-main/50 border border-border rounded-2xl print:bg-slate-100 print:text-black print:border-black/15">
                          <div>
                            <p className="text-[9px] text-text-secondary uppercase">Student Name</p>
                            <p className="font-bold text-text-primary print:text-black">{stud.first_name} {stud.last_name}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-text-secondary uppercase">Academic Class</p>
                            <p className="font-bold text-text-primary print:text-black">{getClassName(stud.class_id)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-text-secondary uppercase">Admission ID</p>
                            <p className="font-bold text-text-primary font-mono print:text-black">{stud.admission_no}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-text-secondary uppercase">Aadhaar Card No</p>
                            <p className="font-bold text-text-primary font-mono print:text-black">{stud.aadhaar_no || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Marks Table */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block ml-1">Evaluated Course Modules</span>
                          <div className="overflow-hidden border border-border rounded-2xl print:border-black/10">
                            <table className="w-full text-left border-collapse text-xs print:text-black">
                              <thead>
                                <tr className="bg-slate-100/50 border-b border-border text-[9px] font-black uppercase text-text-secondary tracking-widest print:bg-slate-200">
                                  <th className="p-3">Course Module</th>
                                  <th className="p-3">Marks Obtained</th>
                                  <th className="p-3">Max Marks</th>
                                  <th className="p-3 text-right">CBSE Grade</th>
                                </tr>
                              </thead>
                              <tbody>
                                {studentRecords.map((score, i) => {
                                  const marksNum = Number(score.marks.split(' / ')[0]);
                                  return (
                                    <tr key={i} className="border-b border-border hover:bg-slate-50/50 last:border-none print:border-black/5">
                                      <td className="p-3 font-bold text-text-primary flex items-center gap-1.5 print:text-black">
                                        <FileText size={12} className="text-accent" />
                                        {score.subject}
                                      </td>
                                      <td className="p-3 font-mono font-bold text-slate-700 print:text-black">{marksNum}</td>
                                      <td className="p-3 font-mono text-text-secondary print:text-black">100</td>
                                      <td className="p-3 text-right font-mono font-black text-accent print:text-blue-600">{score.grade}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Signatures */}
                        <div className="flex justify-between items-end pt-12 text-[10px] text-text-secondary font-bold font-mono">
                          <div className="text-center space-y-1">
                            <div className="w-32 border-b border-border print:border-black/20"></div>
                            <span>HOD Core Academics</span>
                          </div>
                          <div className="text-center space-y-1">
                            <div className="w-32 border-b border-border print:border-black/20"></div>
                            <span>Office Principal Stamp</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-text-secondary">No students enrolled in selected class.</p>
              )
            )}

          </div>
        );
      })()}
    </div>
  );
}
