'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState } from 'react';
import { 
  ClipboardList, Search, Plus, BookOpen, UserCheck, 
  CheckCircle2, ShieldCheck, ArrowRight, Printer, Save, FileText,
  Scan, Sparkles, Upload, Trash2, Loader2, Languages, X
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
    sharedParents,
    sharedQuestions,
    setSharedQuestions,
    sharedExamPapers,
    setSharedExamPapers
  } = useAuth();

  const [activeTab, setActiveTab] = useState('reportcard'); // Initialized to reportcard, updated in useEffect
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Physics Core theory');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isBulkReportMode, setIsBulkReportMode] = useState(false);
  const [selectedBulkReportIds, setSelectedBulkReportIds] = useState([]);

  // Question Maker and Exam Paper states
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showCreatePaperModal, setShowCreatePaperModal] = useState(false);
  const [showPrintPaperModal, setShowPrintPaperModal] = useState(null);
  const [printLayoutMode, setPrintLayoutMode] = useState('primary'); // Always default to primary layout
  const [activeSubTab, setActiveSubTab] = useState('bank'); // 'bank' | 'papers'

  // AI Exam Paper Digitizer states
  const [showDigitizeModal, setShowDigitizeModal] = useState(false);
  const [digitizeRawText, setDigitizeRawText] = useState('');
  const [digitizeClassId, setDigitizeClassId] = useState('');
  const [digitizeSubject, setDigitizeSubject] = useState('');
  const [digitizePreviewQuestions, setDigitizePreviewQuestions] = useState([]);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState([]);
  const [digitizeLang, setDigitizeLang] = useState('English');
  const [digitizeLangSec, setDigitizeLangSec] = useState('Kannada');
  const [digitizeInputMode, setDigitizeInputMode] = useState('upload'); // 'upload' | 'text'
  const digitizeFileInputRef = React.useRef(null);

  const [newQuestionForm, setNewQuestionForm] = useState({
    text: '',
    textSec: '',
    language: 'English',
    languageSec: 'None',
    type: 'MCQ',
    difficulty: 'EASY',
    marks: 1,
    subject: '',
    classId: '',
    options: ['', '', '', ''],
    optionsSec: ['', '', '', ''],
    correct_answer: '',
    imageUrl: ''
  });

  const [newPaperForm, setNewPaperForm] = useState({
    title: '',
    classId: '',
    subject: '',
    duration: '2 Hours',
    instructions: 'Attempt all questions. Total marks: 100.',
    languageLayout: 'primary',
    question_ids: []
  });

  // Filters for Question Bank
  const [qSearchQuery, setQSearchQuery] = useState('');
  const [qClassFilter, setQClassFilter] = useState('');
  const [qSubjectFilter, setQSubjectFilter] = useState('');
  const [qLangFilter, setQLangFilter] = useState('');
  const [qDiffFilter, setQDiffFilter] = useState('');

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
        { id: 'questionmaker', label: 'Exam Question Maker' },
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

  // Filter subjects strictly by active tenant
  const tenantSubjects = React.useMemo(() => {
    return sharedSubjects.filter(sub => sub.tenant_id === activeTenant.id);
  }, [sharedSubjects, activeTenant.id]);

  const [examCategories, setExamCategories] = useState([
    { name: 'Term 1 Mid-Sem Assessment', code: 'MID1', weightage: 30, subject: 'Physics Core theory' },
    { name: 'Term 2 Theory Assessment', code: 'THEO2', weightage: 50, subject: 'Physics Core theory' },
    { name: 'Board Practical Evaluation', code: 'PRAC', weightage: 20, subject: 'Organic Chemistry practical' }
  ]);

  const [newCategory, setNewCategory] = useState({ name: '', code: '', weightage: 20, subject: '' });

  const handleOpenAddCategoryModal = (subjectName = '') => {
    setNewCategory({
      name: '',
      code: '',
      weightage: 20,
      subject: subjectName || (tenantSubjects[0]?.name || '')
    });
    setShowAddCategoryModal(true);
  };

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
      weightage: Number(newCategory.weightage),
      subject: newCategory.subject || (tenantSubjects[0]?.name || '')
    }]);

    toast.success(`Exam structure category "${newCategory.name}" established for subject "${newCategory.subject || 'General'}"!`);
    setNewCategory({ name: '', code: '', weightage: 20, subject: '' });
    setShowAddCategoryModal(false);
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionForm.text && !newQuestionForm.imageUrl) {
      toast.error('Question text or handwritten image is required.');
      return;
    }

    const created = {
      id: `q-manual-${Date.now()}`,
      text: newQuestionForm.text,
      textSec: newQuestionForm.textSec,
      language: newQuestionForm.language,
      languageSec: newQuestionForm.languageSec,
      type: newQuestionForm.type,
      options: newQuestionForm.type === 'MCQ' ? newQuestionForm.options.filter(o => o.trim() !== '') : [],
      optionsSec: newQuestionForm.type === 'MCQ' && newQuestionForm.languageSec !== 'None' ? newQuestionForm.optionsSec.slice(0, newQuestionForm.options.filter(o => o.trim() !== '').length) : [],
      correct_answer: newQuestionForm.correct_answer,
      marks: Number(newQuestionForm.marks) || 1,
      difficulty: newQuestionForm.difficulty,
      subject: newQuestionForm.subject || (tenantSubjects[0]?.name || ''),
      class_id: newQuestionForm.classId || (teacherAllowedClasses[0]?.id || ''),
      tenant_id: activeTenant.id,
      imageUrl: newQuestionForm.imageUrl
    };

    setSharedQuestions([...sharedQuestions, created]);
    toast.success('Successfully added new question to the bank!');
    setShowAddQuestionModal(false);
    
    // Reset form
    setNewQuestionForm({
      text: '',
      textSec: '',
      language: 'English',
      languageSec: 'None',
      type: 'MCQ',
      difficulty: 'EASY',
      marks: 1,
      subject: '',
      classId: '',
      options: ['', '', '', ''],
      optionsSec: ['', '', '', ''],
      correct_answer: '',
      imageUrl: ''
    });
  };

  const handleCreatePaper = (e) => {
    e.preventDefault();
    if (!newPaperForm.title || !newPaperForm.subject || !newPaperForm.classId) {
      toast.error('Please fill in title, class, and subject.');
      return;
    }
    if (newPaperForm.question_ids.length === 0) {
      toast.error('Please select at least one question to compile.');
      return;
    }

    const createdPaper = {
      id: `paper-manual-${Date.now()}`,
      title: newPaperForm.title,
      class_id: newPaperForm.classId,
      subject: newPaperForm.subject,
      duration: newPaperForm.duration,
      instructions: newPaperForm.instructions,
      languageLayout: newPaperForm.languageLayout,
      question_ids: newPaperForm.question_ids,
      created_by: activeUser?.name || 'Faculty Member',
      tenant_id: activeTenant.id
    };

    setSharedExamPapers([...sharedExamPapers, createdPaper]);
    toast.success(`Successfully compiled exam paper "${newPaperForm.title}"!`);
    setShowCreatePaperModal(false);

    // Reset form
    setNewPaperForm({
      title: '',
      classId: '',
      subject: '',
      duration: '2 Hours',
      instructions: 'Attempt all questions. Total marks: 100.',
      languageLayout: 'primary',
      question_ids: []
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleQuestionImageUpload = (file, callback) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const max_size = 600;
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        callback(compressedBase64);
        
        const originalSizeKB = Math.round(file.size / 1024);
        const optimizedSizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
        toast.success(`📷 Image Optimized: ${originalSizeKB} KB ➔ ${optimizedSizeKB} KB (Saved ${Math.round((1 - optimizedSizeKB / originalSizeKB) * 100)}%)`);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // AI Exam Paper Digitizer functions
  const parseQuestionsFromText = (text, classId, subject) => {
    if (!text) return [];
    
    const lines = text.split('\n');
    const questions = [];
    let currentQuestion = null;

    // Regex patterns
    const questionRegex = /^(?:Q|q)?\s*(\d+)[\.\):-]\s*(.*)$/;
    const optionRegex = /^\s*[\[\(]?(A|B|C|D|a|b|c|d)[\]\)\.]\s*(.*)$/;
    const marksRegex = /\[(\d+)\s*(?:marks?|marks?|Mark|Marks)?\]|\((\d+)\s*(?:marks?|marks?|Mark|Marks)?\)/i;

    const finalizeQuestion = (q) => {
      if (q.type === 'SHORT' && q.marks > 3) {
        q.type = 'LONG';
      }
      if (q.type === 'MCQ') {
        q.correct_answer = q.options[0] || 'A';
      } else {
        q.correct_answer = 'Refer to model textbook solution key.';
      }
      return q;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const optionMatch = line.match(optionRegex);
      if (optionMatch && currentQuestion) {
        const optLetter = optionMatch[1].toUpperCase();
        const optTextCombined = optionMatch[2].trim();
        
        let optText = optTextCombined;
        let optTextSec = '';
        if (optTextCombined.includes('/') || optTextCombined.includes('|')) {
          const parts = optTextCombined.split(/\s*[\/|]\s*/);
          optText = parts[0].trim();
          optTextSec = parts.slice(1).join(' / ').trim();
        }

        if (!currentQuestion.options) {
          currentQuestion.options = [];
          currentQuestion.optionsSec = [];
        }
        currentQuestion.options.push(optText);
        currentQuestion.optionsSec.push(optTextSec);
        currentQuestion.type = 'MCQ';
        continue;
      }

      const qMatch = line.match(questionRegex);
      if (qMatch) {
        if (currentQuestion) {
          questions.push(finalizeQuestion(currentQuestion));
        }

        const qNum = qMatch[1];
        const qTextCombined = qMatch[2].trim();

        let marks = 1;
        const marksMatch = qTextCombined.match(marksRegex);
        let textWithoutMarks = qTextCombined;
        if (marksMatch) {
          marks = parseInt(marksMatch[1] || marksMatch[2] || '1', 10);
          textWithoutMarks = qTextCombined.replace(marksRegex, '').trim();
        }

        let textPrimary = textWithoutMarks;
        let textSec = '';
        if (textWithoutMarks.includes('/') || textWithoutMarks.includes('|')) {
          const parts = textWithoutMarks.split(/\s*[\/|]\s*/);
          textPrimary = parts[0].trim();
          textSec = parts.slice(1).join(' / ').trim();
        }

        currentQuestion = {
          id: `q-ocr-${Date.now()}-${qNum}-${Math.random().toString(36).substr(2, 4)}`,
          text: textPrimary,
          textSec: textSec,
          language: digitizeLang || 'English',
          languageSec: textSec ? (digitizeLangSec || 'Kannada') : 'None',
          type: 'SHORT',
          difficulty: marks > 4 ? 'HARD' : marks > 2 ? 'MEDIUM' : 'EASY',
          marks: marks,
          subject: subject,
          class_id: classId,
          options: [],
          optionsSec: [],
          correct_answer: ''
        };
      } else {
        if (currentQuestion) {
          let linePrimary = line;
          let lineSec = '';
          if (line.includes('/') || line.includes('|')) {
            const parts = line.split(/\s*[\/|]\s*/);
            linePrimary = parts[0].trim();
            lineSec = parts.slice(1).join(' / ').trim();
          }

          if (lineSec) {
            currentQuestion.text += ' ' + linePrimary;
            currentQuestion.textSec = (currentQuestion.textSec ? currentQuestion.textSec + ' ' : '') + lineSec;
            currentQuestion.languageSec = digitizeLangSec || 'Kannada';
          } else {
            if (currentQuestion.textSec) {
              currentQuestion.textSec += ' ' + line;
            } else {
              currentQuestion.text += ' ' + line;
            }
          }
        }
      }
    }

    if (currentQuestion) {
      questions.push(finalizeQuestion(currentQuestion));
    }

    return questions;
  };

  const updatePreviewQuestion = (idx, fields) => {
    const updated = [...digitizePreviewQuestions];
    updated[idx] = { ...updated[idx], ...fields };
    setDigitizePreviewQuestions(updated);
  };

  const removePreviewQuestion = (idx) => {
    const updated = digitizePreviewQuestions.filter((_, i) => i !== idx);
    setDigitizePreviewQuestions(updated);
    toast.info("Question segment removed.");
  };

  const handleImportQuestions = () => {
    if (digitizePreviewQuestions.length === 0) {
      toast.error('No questions mapped to import.');
      return;
    }

    const questionsToImport = digitizePreviewQuestions.map((q, idx) => ({
      ...q,
      id: `q-ocr-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      tenant_id: activeTenant.id
    }));

    setSharedQuestions([...sharedQuestions, ...questionsToImport]);
    toast.success(`Successfully imported ${questionsToImport.length} questions into the Question Bank!`);
    setShowDigitizeModal(false);
    
    setDigitizeRawText('');
    setDigitizePreviewQuestions([]);
  };

  const loadSampleOCRText = () => {
    const sampleText = `Q1. What is the SI unit of electric resistance? [1]
(A) Ohm
(B) Volt
(C) Ampere
(D) Watt

Q2. Name the device used to measure electric current in a circuit. [2]

Q3. Write the formula for Ohm's Law and explain the symbols. (3 marks)

Q4. State and explain Faraday's Law of Electromagnetic Induction. [5 marks]

Q5. Calculate the equivalent resistance when three resistors of 2 Ω, 3 Ω, and 6 Ω are connected in parallel. [5]`;

    setDigitizeRawText(sampleText);
    const parsed = parseQuestionsFromText(sampleText, digitizeClassId, digitizeSubject);
    setDigitizePreviewQuestions(parsed);
    toast.success("Physics core study sample loaded!");
  };

  const handleRunManualParser = () => {
    if (!digitizeRawText.trim()) {
      toast.error("Please paste or load text before parsing.");
      return;
    }
    const parsed = parseQuestionsFromText(digitizeRawText, digitizeClassId, digitizeSubject);
    setDigitizePreviewQuestions(parsed);
    toast.success(`Parsed ${parsed.length} questions successfully!`);
  };

  const triggerScanSimulation = (file) => {
    setIsScanningFile(true);
    setScanProgress(0);
    setScanLogs(["[SYSTEM] Initializing scanner engine..."]);
    
    const logs = [
      "[SYSTEM] Loading document file: " + file.name,
      "[OCR] De-skewing page layout and applying thresholding filters...",
      "[OCR] Running deep-learning layout segmenter (Region Detection)...",
      `[OCR] Detected Language: ${digitizeLang}...`,
      "[AI PARSER] Mapping mathematical formulas: [2 Ω, 3 Ω, 6 Ω] resolved...",
      "[AI PARSER] Reconstructing structured exam questions and options...",
      "[SYSTEM] Digitization complete! Transferring to verification desk."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = Math.min(Math.round((currentStep / logs.length) * 100), 100);
      setScanProgress(progress);
      
      setScanLogs(prev => [...prev, logs[currentStep - 1]]);

      if (currentStep >= logs.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsScanningFile(false);
          const sampleText = `Q1. What is the SI unit of electric resistance? [1]
(A) Ohm
(B) Volt
(C) Ampere
(D) Watt

Q2. Name the device used to measure electric current in a circuit. [2]

Q3. Write the formula for Ohm's Law and explain the symbols. (3 marks)

Q4. State and explain Faraday's Law of Electromagnetic Induction. [5 marks]

Q5. Calculate the equivalent resistance when three resistors of 2 Ω, 3 Ω, and 6 Ω are connected in parallel. [5]`;
          
          setDigitizeRawText(sampleText);
          const parsed = parseQuestionsFromText(sampleText, digitizeClassId, digitizeSubject);
          setDigitizePreviewQuestions(parsed);
          toast.success("Exam paper scanned and parsed successfully!");
        }, 300);
      }
    }, 400);
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
              onClick={() => handleOpenAddCategoryModal()}
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
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-bg-sidebar/55 border border-border p-6 rounded-3xl">
            <div>
              <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider">Exam Configurations by Subject</h3>
              <p className="text-xs text-text-secondary mt-1">
                Manage exam weightage and assessment schedules mapped directly to course subjects.
              </p>
            </div>
            <button 
              onClick={() => handleOpenAddCategoryModal()}
              className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              <span>Add Exam Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tenantSubjects.map(sub => {
              const subExams = examCategories.filter(c => c.subject === sub.name);
              const totalWeightage = subExams.reduce((sum, exam) => sum + (exam.weightage || 0), 0);
              
              return (
                <div key={sub.id} className="p-6 bg-bg-sidebar/55 border border-border rounded-3xl flex flex-col justify-between hover:border-accent/15 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-text-primary">{sub.name}</h4>
                        <span className="text-[9px] text-text-primary font-mono uppercase font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-border">{sub.code}</span>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${totalWeightage === 100 ? 'bg-success/15 border border-success/35 text-success' : 'bg-warning/15 border border-warning/35 text-warning'}`}>
                        {totalWeightage}% Total
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {subExams.map((c, i) => (
                        <div key={i} className="p-3.5 bg-bg-card border border-border rounded-2xl flex justify-between items-center gap-4 hover:shadow-md transition-all">
                          <div>
                            <p className="text-xs font-bold text-text-primary">{c.name}</p>
                            <span className="text-[9px] text-text-secondary font-mono font-black">{c.code}</span>
                          </div>
                          <span className="px-2.5 py-0.5 bg-accent/10 text-accent font-black text-[10px] rounded-lg">{c.weightage}%</span>
                        </div>
                      ))}

                      {subExams.length === 0 && (
                        <div className="py-6 text-center border border-dashed border-border rounded-2xl bg-bg-card">
                          <p className="text-[11px] text-text-secondary font-medium">No exam categories mapped yet.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAddCategoryModal(sub.name)}
                    className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={12} />
                    <span>Add Assessment for {sub.name}</span>
                  </button>
                </div>
              );
            })}

            {tenantSubjects.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-border rounded-3xl bg-bg-sidebar/55">
                <p className="text-xs text-text-secondary">No subjects found for this tenant to configure exams.</p>
              </div>
            )}
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Associated Subject *</label>
            <select
              value={newCategory.subject}
              onChange={(e) => setNewCategory({...newCategory, subject: e.target.value})}
              className="w-full text-xs bg-bg-main border border-border rounded-xl py-2 px-3 outline-none cursor-pointer font-bold text-text-primary"
              required
            >
              <option value="">Select Subject...</option>
              {tenantSubjects.map(sub => (
                <option key={sub.id} value={sub.name}>{sub.name} ({sub.code})</option>
              ))}
            </select>
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

      {/* 3. Exam Question Maker Tab View */}
      {activeTab === 'questionmaker' && (
        <div className="space-y-6">
          {/* Sub-tab selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-50 border border-border rounded-3xl no-print">
            <div className="space-y-1">
              <h3 className="text-sm font-black font-outfit text-text-primary uppercase tracking-wider">Exam Question Maker</h3>
              <p className="text-[10px] text-text-secondary">
                Author exam questions (with support for handwritten question photos) and compile print-ready exam papers.
              </p>
            </div>
            
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 border border-border rounded-xl">
              <button
                type="button"
                onClick={() => setActiveSubTab('bank')}
                className={`px-4 py-2 text-center text-xs font-bold uppercase rounded-lg transition-all ${
                  activeSubTab === 'bank'
                    ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Question Bank
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('papers')}
                className={`px-4 py-2 text-center text-xs font-bold uppercase rounded-lg transition-all ${
                  activeSubTab === 'papers'
                    ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Compiled Test Papers
              </button>
            </div>
          </div>

          {activeSubTab === 'bank' && (
            <div className="space-y-6">
              {/* Filters for Question Bank */}
              <div className="p-6 bg-slate-50/50 border border-border rounded-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end no-print">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Search text</label>
                  <input
                    type="text"
                    value={qSearchQuery}
                    onChange={(e) => setQSearchQuery(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full text-xs bg-bg-sidebar border border-border rounded-xl px-3 py-2 text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Class</label>
                  <select
                    value={qClassFilter}
                    onChange={(e) => setQClassFilter(e.target.value)}
                    className="w-full text-xs bg-bg-sidebar border border-border rounded-xl px-3 py-2 text-text-primary outline-none"
                  >
                    <option value="">All Classes</option>
                    {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Subject</label>
                  <select
                    value={qSubjectFilter}
                    onChange={(e) => setQSubjectFilter(e.target.value)}
                    className="w-full text-xs bg-bg-sidebar border border-border rounded-xl px-3 py-2 text-text-primary outline-none"
                  >
                    <option value="">All Subjects</option>
                    {tenantSubjects.map(sub => (
                      <option key={sub.id} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Language</label>
                  <select
                    value={qLangFilter}
                    onChange={(e) => setQLangFilter(e.target.value)}
                    className="w-full text-xs bg-bg-sidebar border border-border rounded-xl px-3 py-2 text-text-primary outline-none"
                  >
                    <option value="">All Languages</option>
                    {['English', 'Kannada', 'Hindi', 'Mathematics'].map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDigitizeClassId(qClassFilter || teacherAllowedClasses[0]?.id || '');
                    setDigitizeSubject(qSubjectFilter || tenantSubjects[0]?.name || '');
                    setDigitizePreviewQuestions([]);
                    setDigitizeRawText('');
                    setShowDigitizeModal(true);
                  }}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 h-[38px] w-full shadow-lg shadow-indigo-600/15"
                >
                  <Scan size={14} />
                  <span>📸 Digitize Paper</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewQuestionForm(prev => ({
                      ...prev,
                      subject: qSubjectFilter || tenantSubjects[0]?.name || '',
                      classId: qClassFilter || teacherAllowedClasses[0]?.id || ''
                    }));
                    setShowAddQuestionModal(true);
                  }}
                  className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 h-[38px] w-full"
                >
                  <Plus size={14} />
                  <span>Add Question</span>
                </button>
              </div>

              {/* Questions List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sharedQuestions
                  .filter(q => q.tenant_id === activeTenant.id)
                  .filter(q => !qSearchQuery || q.text.toLowerCase().includes(qSearchQuery.toLowerCase()))
                  .filter(q => !qClassFilter || q.class_id === qClassFilter)
                  .filter(q => !qSubjectFilter || q.subject === qSubjectFilter)
                  .filter(q => !qLangFilter || q.language === qLangFilter)
                  .map(q => {
                    const matchedClass = sharedClasses.find(c => c.id === q.class_id);
                    return (
                      <div key={q.id} className="p-6 bg-bg-sidebar/55 border border-border rounded-3xl flex flex-col justify-between hover:border-accent/15 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-text-secondary text-[8px] font-bold uppercase rounded border border-border">
                              {matchedClass ? matchedClass.name : 'General'}
                            </span>
                            <span className="px-2 py-0.5 bg-accent/5 text-accent text-[8px] font-black uppercase rounded border border-accent/10">
                              {q.subject}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-text-secondary text-[8px] font-bold rounded border border-border">
                              🗣️ {q.language}
                            </span>
                            <span className={`px-2 py-0.5 text-[8px] font-bold rounded border ${
                              q.difficulty === 'EASY' 
                                ? 'bg-success/5 border-success/20 text-success' 
                                : q.difficulty === 'MEDIUM' 
                                ? 'bg-warning/5 border-warning/20 text-warning' 
                                : 'bg-danger/5 border-danger/20 text-danger'
                            }`}>
                              {q.difficulty}
                            </span>
                            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-text-primary font-black text-[9px] rounded-lg border border-border ml-auto">
                              Marks: {q.marks}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {q.text && <p className="text-xs font-bold text-text-primary leading-relaxed">{q.text}</p>}
                            {q.imageUrl && (
                              <div className="mt-2 border border-border rounded-xl p-2 bg-white w-fit max-w-full">
                                <img src={q.imageUrl} alt="Handwritten Question" className="max-h-40 rounded-lg object-contain" />
                              </div>
                            )}
                          </div>

                          {q.type === 'MCQ' && q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {q.options.map((opt, oIdx) => {
                                const alphabet = String.fromCharCode(65 + oIdx); // A, B, C, D
                                return (
                                  <div key={oIdx} className="p-2.5 bg-bg-card border border-border rounded-xl text-[10px] text-text-secondary font-medium">
                                    <span className="font-bold text-accent mr-1.5">({alphabet})</span>
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="pt-2 border-t border-border/40 text-[10px] flex items-center justify-between">
                            <span className="text-text-secondary font-medium">Type: <strong className="text-text-primary font-bold uppercase">{q.type}</strong></span>
                            {q.correct_answer && (
                              <span className="text-success font-bold flex items-center gap-1">
                                <CheckCircle2 size={10} /> Key: {q.correct_answer}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-border no-print">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this question?')) {
                                setSharedQuestions(sharedQuestions.filter(sq => sq.id !== q.id));
                                toast.success('Question deleted.');
                              }
                            }}
                            className="text-[10px] text-danger hover:underline font-bold"
                          >
                            Remove Question
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {sharedQuestions.filter(q => q.tenant_id === activeTenant.id).length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-border rounded-3xl bg-bg-sidebar/55">
                    <p className="text-xs text-text-secondary">No questions written yet in the bank. Click &quot;Add Question&quot; to begin.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'papers' && (
            <div className="space-y-6">
              {/* Assembled papers list */}
              <div className="flex justify-between items-center bg-bg-sidebar/55 border border-border p-6 rounded-3xl no-print">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Assembled Exam Papers</h4>
                  <p className="text-[10px] text-text-secondary">Verify and print compiled CBSE exam papers.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewPaperForm(prev => ({
                      ...prev,
                      classId: selectedClass || teacherAllowedClasses[0]?.id || '',
                      subject: selectedSubject || tenantSubjects[0]?.name || ''
                    }));
                    setShowCreatePaperModal(true);
                  }}
                  className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  <span>Compile Exam Paper</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sharedExamPapers
                  .filter(p => p.tenant_id === activeTenant.id)
                  .map(p => {
                    const matchedClass = sharedClasses.find(c => c.id === p.class_id);
                    return (
                      <div key={p.id} className="p-6 bg-bg-sidebar/55 border border-border rounded-3xl space-y-4 hover:border-accent/15 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="text-sm font-black text-text-primary">{p.title}</h4>
                              <p className="text-[10px] text-text-secondary font-bold mt-1">Class: {matchedClass ? matchedClass.name : 'General'} | Subject: {p.subject}</p>
                            </div>
                            <span className="px-2.5 py-0.5 bg-accent/10 text-accent font-black text-[9px] rounded-lg">
                              {p.question_ids?.length || 0} Questions
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 border border-border rounded-2xl text-[10px] space-y-1.5">
                            <p className="text-text-secondary leading-relaxed">
                              ⏱️ <strong>Duration:</strong> {p.duration}
                            </p>
                            <p className="text-text-secondary leading-relaxed line-clamp-2">
                              📋 <strong>Instructions:</strong> {p.instructions}
                            </p>
                            <p className="text-text-secondary leading-relaxed">
                              🗣️ <strong>Language:</strong> <span className="font-bold text-accent uppercase">Primary</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border no-print">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this test paper?')) {
                                setSharedExamPapers(sharedExamPapers.filter(sp => sp.id !== p.id));
                                toast.success('Exam paper deleted.');
                              }
                            }}
                            className="text-[10px] text-danger hover:underline font-bold"
                          >
                            Delete
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setShowPrintPaperModal(p);
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-text-primary text-xs font-bold rounded-xl border border-border transition-all flex items-center justify-center gap-1.5"
                          >
                            <Printer size={12} />
                            <span>View & Print</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {sharedExamPapers.filter(p => p.tenant_id === activeTenant.id).length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-border rounded-3xl bg-bg-sidebar/55">
                    <p className="text-xs text-text-secondary">No exam papers compiled yet. Click &quot;Compile Exam Paper&quot; to build one.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Add Question to Bank Modal */}
      <Modal
        open={showAddQuestionModal}
        onClose={() => setShowAddQuestionModal(false)}
        title="Add Question to Bank"
        icon={<Plus size={18} />}
        size="lg"
      >
        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Class/Grade *</label>
              <select
                value={newQuestionForm.classId}
                onChange={(e) => setNewQuestionForm({...newQuestionForm, classId: e.target.value})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl py-3 px-3 text-text-primary outline-none focus:border-accent"
                required
              >
                <option value="">-- Select Class --</option>
                {teacherAllowedClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Subject Mapped *</label>
              <select
                value={newQuestionForm.subject}
                onChange={(e) => setNewQuestionForm({...newQuestionForm, subject: e.target.value})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl py-3 px-3 text-text-primary outline-none focus:border-accent"
                required
              >
                <option value="">-- Select Subject --</option>
                {tenantSubjects.map(sub => (
                  <option key={sub.id} value={sub.name}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Question Type *</label>
              <select
                value={newQuestionForm.type}
                onChange={(e) => setNewQuestionForm({...newQuestionForm, type: e.target.value})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl py-3 px-3 text-text-primary outline-none focus:border-accent"
                required
              >
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="TF">True / False</option>
                <option value="SHORT">Short Answer</option>
                <option value="LONG">Long Essay</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Difficulty *</label>
              <select
                value={newQuestionForm.difficulty}
                onChange={(e) => setNewQuestionForm({...newQuestionForm, difficulty: e.target.value})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl py-3 px-3 text-text-primary outline-none focus:border-accent"
                required
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Marks Weightage *</label>
              <input
                type="number"
                min={1}
                max={20}
                value={newQuestionForm.marks}
                onChange={(e) => setNewQuestionForm({...newQuestionForm, marks: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 border border-border rounded-2xl">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Primary Language *</label>
              <select
                value={newQuestionForm.language}
                onChange={(e) => setNewQuestionForm({...newQuestionForm, language: e.target.value})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl py-2 px-3 text-text-primary"
                required
              >
                {['English', 'Kannada', 'Hindi', 'Mathematics'].map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 p-4 bg-slate-50 border border-border rounded-2xl">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1 block">
              Handwritten Question Image (Optional)
            </label>
            <p className="text-[9px] text-text-secondary mb-2">Upload a photo of your handwritten question. If uploaded, typing the question text below is optional.</p>
            
            {newQuestionForm.imageUrl ? (
              <div className="relative w-fit border border-border rounded-xl p-2 bg-white">
                <img 
                  src={newQuestionForm.imageUrl} 
                  alt="Question Thumbnail" 
                  className="max-h-24 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setNewQuestionForm({...newQuestionForm, imageUrl: ''})}
                  className="absolute -top-2 -right-2 p-1 bg-red-650 text-white rounded-full hover:bg-red-700 shadow flex items-center justify-center w-5 h-5"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleQuestionImageUpload(files[0], (compressedBase64) => {
                      setNewQuestionForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
                    });
                  }
                }}
                className="w-full text-xs text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
              Question Text ({newQuestionForm.language}) {newQuestionForm.imageUrl ? '(Optional)' : '*'}
            </label>
            <textarea
              rows={3}
              value={newQuestionForm.text}
              onChange={(e) => setNewQuestionForm({...newQuestionForm, text: e.target.value})}
              placeholder="Enter question text..."
              className="w-full text-xs bg-bg-main border border-border rounded-xl p-3 text-text-primary resize-none outline-none focus:border-accent"
              required={!newQuestionForm.imageUrl}
            />
          </div>

          {newQuestionForm.type === 'MCQ' && (
            <div className="space-y-3 pt-2 border-t border-border">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block ml-1">Configure Choices (A-D)</span>
              
              {['A', 'B', 'C', 'D'].map((optName, idx) => (
                <div key={optName} className="p-3 bg-slate-50 border border-border rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent">({optName})</span>
                    <input
                      type="text"
                      placeholder={`Option ${optName}`}
                      value={newQuestionForm.options[idx] || ''}
                      onChange={(e) => {
                        const updated = [...newQuestionForm.options];
                        updated[idx] = e.target.value;
                        setNewQuestionForm({...newQuestionForm, options: updated});
                      }}
                      className="w-full text-xs bg-bg-main"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Correct Answer / Key *</label>
            <input
              type="text"
              placeholder={newQuestionForm.type === 'MCQ' ? 'e.g. Volt (must match one of the exact choices)' : 'e.g. Write answer key details...'}
              value={newQuestionForm.correct_answer}
              onChange={(e) => setNewQuestionForm({...newQuestionForm, correct_answer: e.target.value})}
              className="w-full text-xs"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Plus size={14} />
            <span>Save Question to Bank</span>
          </button>
        </form>
      </Modal>

      {/* 5. Compile Exam Paper Modal */}
      <Modal
        open={showCreatePaperModal}
        onClose={() => setShowCreatePaperModal(false)}
        title="Compile Exam Paper"
        icon={<Plus size={18} />}
        size="lg"
      >
        <form onSubmit={handleCreatePaper} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Test Paper Title *</label>
            <input
              type="text"
              placeholder="e.g. Class XII Physics Mid-Sem Examination"
              value={newPaperForm.title}
              onChange={(e) => setNewPaperForm({...newPaperForm, title: e.target.value})}
              className="w-full text-xs font-bold text-text-primary"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Class *</label>
              <select
                value={newPaperForm.classId}
                onChange={(e) => setNewPaperForm({...newPaperForm, classId: e.target.value, question_ids: []})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl py-3 px-3 text-text-primary"
                required
              >
                <option value="">-- Select Class --</option>
                {teacherAllowedClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Subject *</label>
              <select
                value={newPaperForm.subject}
                onChange={(e) => setNewPaperForm({...newPaperForm, subject: e.target.value, question_ids: []})}
                className="w-full text-xs bg-bg-main border border-border rounded-xl py-3 px-3 text-text-primary"
                required
              >
                <option value="">-- Select Subject --</option>
                {tenantSubjects.map(sub => (
                  <option key={sub.id} value={sub.name}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Duration Allowed *</label>
            <input
              type="text"
              placeholder="e.g. 2 Hours or 3 Hours"
              value={newPaperForm.duration}
              onChange={(e) => setNewPaperForm({...newPaperForm, duration: e.target.value})}
              className="w-full text-xs font-semibold text-text-primary"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">General Instructions *</label>
            <textarea
              rows={2}
              value={newPaperForm.instructions}
              onChange={(e) => setNewPaperForm({...newPaperForm, instructions: e.target.value})}
              className="w-full text-xs bg-bg-main border border-border rounded-xl p-3 text-text-primary resize-none"
              required
            />
          </div>

          {/* Pick Questions list */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block ml-1">
              Select Questions to include ({newPaperForm.question_ids.length} selected):
            </span>

            <div className="max-h-48 overflow-y-auto border border-border rounded-2xl bg-slate-50 p-3 divide-y divide-border custom-scrollbar">
              {sharedQuestions
                .filter(q => q.tenant_id === activeTenant.id && q.class_id === newPaperForm.classId && q.subject === newPaperForm.subject)
                .map(q => {
                  const isChecked = newPaperForm.question_ids.includes(q.id);
                  return (
                    <label key={q.id} className="py-2.5 flex items-start gap-3 cursor-pointer hover:bg-slate-100/40 first:pt-0 last:pb-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setNewPaperForm({
                              ...newPaperForm,
                              question_ids: newPaperForm.question_ids.filter(id => id !== q.id)
                            });
                          } else {
                            setNewPaperForm({
                              ...newPaperForm,
                              question_ids: [...newPaperForm.question_ids, q.id]
                            });
                          }
                        }}
                        className="rounded text-accent focus:ring-accent mt-0.5"
                      />
                      <div className="min-w-0 flex-1 text-[11px]">
                        <span className="font-bold text-text-primary block truncate flex items-center gap-2">
                          {q.text || <span className="text-slate-400 italic font-normal">Photo/Handwritten Question</span>}
                          {q.imageUrl && <span className="text-[9px] px-1 py-0.2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded">📷 Image</span>}
                        </span>
                        <span className="text-text-secondary text-[9px] block">
                          Marks: {q.marks} | Difficulty: {q.difficulty} | Type: {q.type}
                        </span>
                      </div>
                    </label>
                  );
                })}

              {sharedQuestions.filter(q => q.tenant_id === activeTenant.id && q.class_id === newPaperForm.classId && q.subject === newPaperForm.subject).length === 0 && (
                <p className="text-center py-6 text-xs text-text-secondary">
                  {newPaperForm.classId && newPaperForm.subject 
                    ? 'No questions found in bank matching this class & subject. Go to Question Bank to write them!'
                    : 'Please select class and subject above to load questions.'}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
          >
            <Plus size={14} />
            <span>Compile Test Paper</span>
          </button>
        </form>
      </Modal>

      {/* 5b. AI Exam Paper Digitizer Modal */}
      <Modal
        open={showDigitizeModal}
        onClose={() => {
          if (!isScanningFile) {
            setShowDigitizeModal(false);
          }
        }}
        title="AI Exam Paper Digitizer"
        icon={<Sparkles className="text-indigo-500 animate-pulse" size={18} />}
        size="xl"
      >
        <div className="space-y-6">
          <style>{`
            @keyframes scan {
              0% { top: 0%; opacity: 0.8; }
              50% { top: 100%; opacity: 1; }
              100% { top: 0%; opacity: 0.8; }
            }
            .scanner-line {
              position: absolute;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, transparent, #6366f1, transparent);
              box-shadow: 0 0 12px #6366f1, 0 0 4px #6366f1;
              animation: scan 2s linear infinite;
              z-index: 10;
            }
            .scanner-glow {
              position: absolute;
              inset: 0;
              background: linear-gradient(180deg, rgba(99, 102, 241, 0.04) 0%, rgba(99, 102, 241, 0.01) 100%);
              pointer-events: none;
              z-index: 5;
            }
          `}</style>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/20 border border-border rounded-2xl">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Class/Grade *</label>
              <select
                value={digitizeClassId}
                onChange={(e) => setDigitizeClassId(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-border rounded-xl py-2 px-3 text-text-primary outline-none focus:border-accent"
              >
                <option value="">Select Class...</option>
                {teacherAllowedClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Subject *</label>
              <select
                value={digitizeSubject}
                onChange={(e) => setDigitizeSubject(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-border rounded-xl py-2 px-3 text-text-primary outline-none focus:border-accent"
              >
                <option value="">Select Subject...</option>
                {tenantSubjects.map(sub => (
                  <option key={sub.id} value={sub.name}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle inputs */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 border border-border rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setDigitizeInputMode('upload')}
              className={`px-4 py-2 text-center text-xs font-bold uppercase rounded-lg transition-all ${
                digitizeInputMode === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Upload Scanned Paper
            </button>
            <button
              type="button"
              onClick={() => setDigitizeInputMode('text')}
              className={`px-4 py-2 text-center text-xs font-bold uppercase rounded-lg transition-all ${
                digitizeInputMode === 'text'
                  ? 'bg-white dark:bg-slate-700 text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Paste Raw OCR Text
            </button>
          </div>

          {/* Input Panel */}
          {digitizeInputMode === 'upload' ? (
            <div className="space-y-4">
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    triggerScanSimulation(files[0]);
                  }
                }}
                onClick={() => digitizeFileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  isScanningFile 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-border hover:border-accent hover:bg-slate-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={digitizeFileInputRef} 
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files.length > 0) {
                      triggerScanSimulation(files[0]);
                    }
                  }} 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                />

                {isScanningFile ? (
                  <div className="space-y-4">
                    <div className="scanner-glow"></div>
                    <div className="scanner-line"></div>
                    
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 size={32} className="text-indigo-600 animate-spin" />
                      <p className="text-xs font-bold text-text-primary">Scanning and extracting text via neural OCR engine...</p>
                      
                      {/* Progress Bar */}
                      <div className="w-64 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-300"
                          style={{ width: `${scanProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-text-secondary">{scanProgress}%</span>
                    </div>

                    {/* Logs terminal */}
                    <div className="max-w-md mx-auto bg-slate-950 text-slate-200 p-3 rounded-xl text-left font-mono text-[9px] h-28 overflow-y-auto space-y-1 border border-slate-800 custom-scrollbar shadow-inner">
                      {scanLogs.map((log, lIdx) => (
                        <p key={lIdx} className="leading-relaxed">
                          <span className="text-green-400">&gt;</span> {log}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3 py-6">
                    <div className="p-4 bg-indigo-50 rounded-full text-indigo-600">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">Drag & drop your scanned exam paper image or PDF</p>
                      <p className="text-[10px] text-text-secondary mt-1">Supports PNG, JPG, JPEG, and PDF documents</p>
                    </div>
                    <span className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-xl shadow-md">
                      Browse Local Files
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Pasted Document Content / Raw Output</label>
                  <button
                    type="button"
                    onClick={loadSampleOCRText}
                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 hover:underline uppercase flex items-center gap-1 bg-transparent p-0 animate-pulse"
                  >
                    <Sparkles size={10} />
                    <span>Load Sample OCR Text</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={digitizeRawText}
                  onChange={(e) => setDigitizeRawText(e.target.value)}
                  placeholder="Paste OCR output or type question paper lines here..."
                  className="w-full text-xs font-mono bg-bg-main border border-border rounded-2xl p-4 text-text-primary resize-none outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleRunManualParser}
                  disabled={!digitizeRawText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
                >
                  <Sparkles size={12} />
                  <span>Run AI Parsing Engine</span>
                </button>
              </div>
            </div>
          )}

          {/* Verification Desk */}
          {digitizePreviewQuestions.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black uppercase text-text-primary tracking-wider font-outfit">Verification Desk</h4>
                  <p className="text-[9px] text-text-secondary">Preview and edit the parsed questions structure. Make adjustments before importing.</p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wider animate-bounce">
                  {digitizePreviewQuestions.length} Questions Parsed
                </span>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                {digitizePreviewQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="p-5 bg-white dark:bg-slate-900 border border-border rounded-2xl space-y-4 hover:shadow-md transition-all border-l-4 border-l-indigo-500">
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-[9px] font-black uppercase text-text-secondary tracking-wider">Extracted Question</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={q.type}
                          onChange={(e) => updatePreviewQuestion(idx, { type: e.target.value })}
                          className="bg-bg-main border border-border rounded-lg py-1 px-2 text-[10px] font-bold text-text-primary outline-none cursor-pointer"
                        >
                          <option value="MCQ">MCQ</option>
                          <option value="SHORT">Short Answer</option>
                          <option value="LONG">Long Essay</option>
                          <option value="TF">True / False</option>
                        </select>

                        <div className="flex items-center gap-1 bg-bg-main border border-border rounded-lg px-2 py-1">
                          <span className="text-[8px] font-black text-text-secondary uppercase">Marks</span>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) => updatePreviewQuestion(idx, { marks: Number(e.target.value) })}
                            className="w-10 bg-transparent border-none p-0 text-center font-mono text-[10px] font-bold outline-none text-text-primary"
                            min={1}
                            max={20}
                          />
                        </div>

                        <select
                          value={q.difficulty}
                          onChange={(e) => updatePreviewQuestion(idx, { difficulty: e.target.value })}
                          className="bg-bg-main border border-border rounded-lg py-1 px-2 text-[10px] font-bold text-text-primary outline-none cursor-pointer"
                        >
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removePreviewQuestion(idx)}
                          className="p-1 hover:bg-danger/10 text-danger rounded-lg transition-all"
                          title="Remove Question"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Question Texts */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Question Text</label>
                      <textarea
                        rows={2}
                        value={q.text}
                        onChange={(e) => updatePreviewQuestion(idx, { text: e.target.value })}
                        className="w-full text-[11px] bg-bg-main border border-border rounded-xl p-2.5 text-text-primary resize-none outline-none focus:border-accent"
                      />
                    </div>

                    {/* MCQ Options */}
                    {q.type === 'MCQ' && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-border rounded-xl space-y-2">
                        <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">MCQ Options Configuration</span>
                        {['A', 'B', 'C', 'D'].map((optName, oIdx) => (
                          <div key={optName} className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg px-2 py-1">
                            <span className="text-[9px] font-black text-accent">({optName})</span>
                            <input
                              type="text"
                              value={q.options[oIdx] || ''}
                              onChange={(e) => {
                                const newOpts = [...(q.options || ['', '', '', ''])];
                                newOpts[oIdx] = e.target.value;
                                updatePreviewQuestion(idx, { options: newOpts });
                              }}
                              className="w-full bg-transparent border-none p-0 text-[10px] text-text-primary outline-none"
                              placeholder={`Option ${optName}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Correct Answer */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Answer Key / Correct Answer Reference</label>
                      <input
                        type="text"
                        value={q.correct_answer || ''}
                        onChange={(e) => updatePreviewQuestion(idx, { correct_answer: e.target.value })}
                        className="w-full text-[10px] bg-bg-main border border-border rounded-lg px-2 py-1 text-text-primary outline-none focus:border-accent"
                        placeholder="Answer detail..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowDigitizeModal(false)}
              disabled={isScanningFile}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-text-primary text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportQuestions}
              disabled={isScanningFile || digitizePreviewQuestions.length === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/15"
            >
              <Languages size={12} />
              <span>Import {digitizePreviewQuestions.length} Questions</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 6. A4 Printable Question Paper Modal */}
      {showPrintPaperModal && (
        <Modal
          open={!!showPrintPaperModal}
          onClose={() => setShowPrintPaperModal(null)}
          title="Print Preview Exam Paper"
          icon={<Printer size={18} />}
          size="lg"
        >
          <div className="space-y-6">
            {/* Header controls (hidden during print) */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-border rounded-2xl no-print">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Exam Paper Preview</span>
                <span className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-black uppercase">
                  Primary Language Layout
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintPaperModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-text-primary text-xs font-bold rounded-xl border border-border transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-accent/15"
                >
                  <Printer size={14} />
                  <span>Print Exam Paper</span>
                </button>
              </div>
            </div>

            {/* A4 Page Render Block */}
            {(() => {
              const paper = showPrintPaperModal;
              const matchedClass = sharedClasses.find(c => c.id === paper.class_id);
              const paperQuestions = sharedQuestions.filter(q => paper.question_ids.includes(q.id));
              
              // Calculate total marks
              const totalMarksSum = paperQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
              
              // Split into sections
              const mcqs = paperQuestions.filter(q => q.type === 'MCQ');
              const subjectives = paperQuestions.filter(q => q.type !== 'MCQ');

              return (
                <div 
                  id="printable-question-paper" 
                  className="max-w-2xl mx-auto p-8 bg-white border border-border text-black rounded-[2rem] space-y-6 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:my-0 print:mx-auto"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                >
                  {/* CBSE Traditional Header */}
                  <div className="text-center pb-4 border-b-2 border-black space-y-1.5">
                    <h2 className="text-xl font-black uppercase tracking-wide font-outfit" style={{ color: '#000000' }}>
                      {activeTenant.name}
                    </h2>
                    <p className="text-[9px] uppercase tracking-[0.25em] font-mono font-black" style={{ color: '#4B5563' }}>
                      {activeTenant.board_affiliation || 'CBSE Board Session 2026 - 2027'}
                    </p>
                    <h3 className="text-sm font-extrabold uppercase tracking-widest pt-1" style={{ color: '#000000' }}>
                      {paper.title}
                    </h3>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 gap-y-2 border-b border-black/25 pb-3 text-[11px] font-bold">
                    <div className="space-y-0.5">
                      <p>Subject: <span className="font-black">{paper.subject}</span></p>
                      <p>Class: <span className="font-black">{matchedClass ? matchedClass.name : 'N/A'}</span></p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p>Time Allowed: <span className="font-black">{paper.duration}</span></p>
                      <p>Maximum Marks: <span className="font-black">{totalMarksSum}</span></p>
                    </div>
                  </div>

                  {/* General Instructions */}
                  <div className="p-3 border border-black/15 rounded-xl text-[10px] space-y-1 bg-slate-50/50 print:bg-transparent print:border-black/20">
                    <p className="font-black uppercase tracking-wider text-black">General Instructions:</p>
                    <p className="leading-relaxed whitespace-pre-line text-slate-800 print:text-black">{paper.instructions}</p>
                  </div>

                  {/* SECTION A: MCQS */}
                  {mcqs.length > 0 && (
                    <div className="space-y-4">
                      <div className="border-b border-black pb-1">
                        <h4 className="text-xs font-black uppercase tracking-widest text-black">Section A (Multiple Choice Questions)</h4>
                      </div>

                      <div className="space-y-4 divide-y divide-black/5">
                        {mcqs.map((q, qIdx) => {
                          return (
                            <div key={q.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-0.5 flex-1">
                                  <div className="font-bold text-black flex items-start gap-1">
                                    <span>Q{qIdx + 1}.</span>
                                    <div className="space-y-2 flex-1">
                                      {q.text && <span>{q.text}</span>}
                                      {q.imageUrl && (
                                        <img src={q.imageUrl} alt={`Question ${qIdx + 1}`} className="max-h-48 object-contain rounded-lg border border-black/10 mt-1 block" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="font-bold text-[10px] shrink-0 font-mono">[{q.marks}]</span>
                              </div>

                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pl-5 pt-1">
                                  {q.options.map((opt, oIdx) => {
                                    const letter = String.fromCharCode(65 + oIdx);
                                    return (
                                      <div key={oIdx} className="text-[11px] leading-relaxed">
                                        <span className="font-bold mr-1">({letter})</span>
                                        <span>{opt}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION B: SUBJECTIVE */}
                  {subjectives.length > 0 && (
                    <div className="space-y-4 pt-4">
                      <div className="border-b border-black pb-1">
                        <h4 className="text-xs font-black uppercase tracking-widest text-black">Section B (Subjective Evaluation)</h4>
                      </div>

                      <div className="space-y-4 divide-y divide-black/5">
                        {subjectives.map((q, qIdx) => {
                          const subjectiveIdx = mcqs.length + qIdx + 1;
                          
                          return (
                            <div key={q.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-0.5 flex-1">
                                  <div className="font-bold text-black flex items-start gap-1">
                                    <span>Q{subjectiveIdx}.</span>
                                    <div className="space-y-2 flex-1">
                                      {q.text && <span>{q.text}</span>}
                                      {q.imageUrl && (
                                        <img src={q.imageUrl} alt={`Question ${subjectiveIdx}`} className="max-h-48 object-contain rounded-lg border border-black/10 mt-1 block" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="font-bold text-[10px] shrink-0 font-mono">[{q.marks}]</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
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
