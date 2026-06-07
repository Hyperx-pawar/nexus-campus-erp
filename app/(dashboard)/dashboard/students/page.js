'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Shield, Sparkles, 
  Trash2, ChevronRight, FileText, ArrowLeft, Loader2, Link as LinkIcon, Bus, Home as HomeIcon, X, Plus, Edit, ArrowUpCircle
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { uploadFileToBucket } from '@/lib/storage';
import * as XLSX from 'xlsx';
export default function StudentRegistryPage() {
  const {
    supabase, 
    activeTenant, 
    sharedStudents, 
    setSharedStudents,
    sharedParents, 
    setSharedParents,
    addStudentAndParent,
    sharedClasses,
    sharedTransportRoutes,
    sharedHostelBlocks,
    activeRole,
    activeUser,
    sharedStaff,
    sharedSubjects,
    sharedFeeRecords,
    setSharedFeeRecords,
    sharedAttendanceRecords,
    setSharedAttendanceRecords,
    sharedStudentFeeAddons,
    sharedFeeStructures,
    sharedNotifications,
    setSharedNotifications,
    sharedRemarks,
    setSharedRemarks,
    sharedAcademicRecords,
    setSharedAcademicRecords,
    sharedStudentHistory,
    setSharedStudentHistory
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [parsedStudents, setParsedStudents] = useState([]);

  // Student Promotion States
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStudentForPromotion, setSelectedStudentForPromotion] = useState(null);
  const [promotionClassId, setPromotionClassId] = useState('');
  const [resetFees, setResetFees] = useState(true);
  const [activeDossierTab, setActiveDossierTab] = useState('documents');

  // Pre-fill next logical class helper
  const getNextLogicalClassId = (currentClassId) => {
    const currentClass = sharedClasses.find(c => c.id === currentClassId);
    if (!currentClass) return '';
    
    let targetPattern = '';
    if (currentClass.name.includes('Class XI')) {
      targetPattern = currentClass.name.replace('Class XI', 'Class XII');
    } else if (currentClass.name.includes('Class X') && !currentClass.name.includes('Class XII')) {
      targetPattern = currentClass.name.replace('Class X', 'Class XI');
      if (currentClass.name === 'Class X - General') {
        targetPattern = 'Class XI - Science';
      }
    } else if (currentClass.name.includes('Class IX')) {
      targetPattern = currentClass.name.replace('Class IX', 'Class X');
    }
    
    if (targetPattern) {
      const nextClass = sharedClasses.find(c => c.tenant_id === activeTenant.id && c.name.toLowerCase().includes(targetPattern.toLowerCase()));
      if (nextClass) return nextClass.id;
    }
    
    const otherClass = sharedClasses.find(c => c.tenant_id === activeTenant.id && c.id !== currentClassId);
    return otherClass ? otherClass.id : '';
  };

  const handlePromoteStudent = () => {
    if (!selectedStudentForPromotion || !promotionClassId) return;

    // Archive previous year record before promotion resets active profile records
    const studentId = selectedStudentForPromotion.id;
    const currentClassId = selectedStudentForPromotion.class_id;
    const currentClassName = getClassName(currentClassId);
    const currentYear = activeTenant.settings?.academicYear || '2025-2026';

    const prevAttendance = sharedAttendanceRecords[studentId] || '0.0%';
    const prevFees = sharedFeeRecords[studentId] || { total: 0, paid: 0, remaining: 0, status: 'UNPAID', history: [] };
    const prevMarks = sharedAcademicRecords[studentId] || [];
    const prevRemarks = sharedRemarks[studentId] || [];

    const archivedRecord = {
      academic_year: currentYear,
      class_id: currentClassId,
      class_name: currentClassName,
      attendance: prevAttendance,
      fees: { ...prevFees },
      academic_records: [...prevMarks],
      remarks: [...prevRemarks]
    };

    setSharedStudentHistory(prev => {
      const studentHistory = prev[studentId] || [];
      const filteredHistory = studentHistory.filter(h => h.academic_year !== currentYear);
      return {
        ...prev,
        [studentId]: [...filteredHistory, archivedRecord]
      };
    });

    // Reset active marks and remarks for the new grade
    setSharedAcademicRecords(prev => ({
      ...prev,
      [studentId]: []
    }));

    setSharedRemarks(prev => ({
      ...prev,
      [studentId]: []
    }));

    // 1. Update student class_id
    const updatedStudents = sharedStudents.map(s => {
      if (s.id === selectedStudentForPromotion.id) {
        return {
          ...s,
          class_id: promotionClassId
        };
      }
      return s;
    });
    setSharedStudents(updatedStudents);

    // 2. Reset fees and configure new term billing if selected
    if (resetFees) {
      const classFeeStructures = sharedFeeStructures.filter(
        fs => fs.class_id === promotionClassId && fs.tenant_id === activeTenant.id
      );
      const baseFeeTotal = classFeeStructures.reduce((sum, fs) => sum + fs.amount, 0);

      const studentAddons = sharedStudentFeeAddons[selectedStudentForPromotion.id] || {
        transport: { enabled: false, fee: 0 },
        hostel: { enabled: false, fee: 0 }
      };

      const transportFee = studentAddons.transport?.enabled ? studentAddons.transport.fee : 0;
      const hostelFee = studentAddons.hostel?.enabled ? studentAddons.hostel.fee : 0;
      const totalFee = baseFeeTotal + transportFee + hostelFee;

      setSharedFeeRecords(prev => ({
        ...prev,
        [selectedStudentForPromotion.id]: {
          total: totalFee,
          paid: 0,
          remaining: totalFee,
          status: 'UNPAID',
          history: []
        }
      }));

      setSharedAttendanceRecords(prev => ({
        ...prev,
        [selectedStudentForPromotion.id]: '100.0%'
      }));
    }

    // 3. Dispatch promotion notification to parent dashboard alerts
    if (selectedStudentForPromotion.parent_id) {
      const targetClass = sharedClasses.find(c => c.id === promotionClassId);
      const className = targetClass ? targetClass.name : 'Next Grade';

      const newNotification = {
        id: `noti-${Date.now()}`,
        parent_id: selectedStudentForPromotion.parent_id,
        student_id: selectedStudentForPromotion.id,
        title: '🎓 Student Promoted to Next Grade',
        body: `Congratulations! Your child ${selectedStudentForPromotion.first_name} has been promoted to ${className} for the new academic year. New term fee structure has been allocated.`,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        read: false,
        type: 'promotion'
      };

      setSharedNotifications(prev => [newNotification, ...prev]);
    }

    toast.success(`Student "${selectedStudentForPromotion.first_name} ${selectedStudentForPromotion.last_name}" promoted successfully!`);
    setShowPromoteModal(false);
    setSelectedStudentForPromotion(null);
  };

  const handleOpenEditForm = (student) => {
    const parent = sharedParents.find(p => p.id === student.parent_id) || {};
    setEditingStudentId(student.id);
    const rawAadhaar = student.aadhaar_no ? student.aadhaar_no.replace(/\s+/g, '') : '';
    setFormData({
      firstName: student.first_name || '',
      lastName: student.last_name || '',
      admissionNo: student.admission_no || '',
      rollNo: student.roll_no || '',
      dateOfBirth: student.date_of_birth || '',
      gender: student.gender || 'MALE',
      bloodGroup: student.blood_group || 'O+',
      address: student.address || '',
      aadhaarNo: rawAadhaar,
      category: student.category || 'GENERAL',
      classId: student.class_id || '',
      enableTransport: student.enableTransport || false,
      transportRouteId: student.transportRouteId || sharedTransportRoutes?.[0]?.id || '',
      customTransportFee: student.transportFee || '',
      enableHostel: student.enableHostel || false,
      hostelBlockId: student.hostelBlockId || sharedHostelBlocks?.[0]?.id || '',
      customHostelFee: student.hostelFee || '',
      parentFirstName: parent.first_name || '',
      parentLastName: parent.last_name || '',
      parentEmail: parent.email || '',
      parentPhone: parent.phone || '',
      parentOccupation: parent.occupation || 'Business Owner',
      totalFee: student.totalFee || 0,
      paidFee: student.paidFee || 0,
      initialAttendance: student.initialAttendance || '85.0%',
      avatar: student.profile_picture_url || '',
      avatarFile: null
    });
    setShowAddForm(true);
  };
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    admissionNo: '',
    rollNo: '',
    dateOfBirth: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    address: '',
    aadhaarNo: '',
    category: 'GENERAL',
    classId: '',
    
    // Facilities (Transport & Hostel Options)
    enableTransport: false,
    transportRouteId: '',
    customTransportFee: '',
    enableHostel: false,
    hostelBlockId: '',
    customHostelFee: '',
    
    // Parent details
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
    parentOccupation: 'Business Owner',
    totalFee: 0,
    paidFee: 0,
    initialAttendance: '85.0%',
    avatar: '',
    avatarFile: null
  });

  const handleUploadDocument = async (file, docType) => {
    if (!file || !selectedStudentForDossier) return;
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      toast.error(`Document size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller file.`);
      return;
    }
    toast.info(`Uploading document: ${file.name} (${fileSizeMB.toFixed(2)} MB / 10MB limit)`);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedStudentForDossier.id}-${docType.replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;
      const filePath = `${activeTenant.id}/documents/${fileName}`;
      
      toast.loading(`Uploading ${docType} to Supabase...`);
      const publicUrl = await uploadFileToBucket(supabase, 'documents', filePath, file);
      toast.dismiss();

      if (publicUrl) {
        const updatedStudents = sharedStudents.map(s => {
          if (s.id === selectedStudentForDossier.id) {
            const currentDocs = s.documents || [];
            return {
              ...s,
              documents: [...currentDocs, { name: docType, url: publicUrl, fileName: file.name, date: new Date().toLocaleDateString() }]
            };
          }
          return s;
        });
        setSharedStudents(updatedStudents);
        
        setSelectedStudentForDossier(prev => ({
          ...prev,
          documents: [...(prev.documents || []), { name: docType, url: publicUrl, fileName: file.name, date: new Date().toLocaleDateString() }]
        }));
        
        toast.success(`${docType} uploaded successfully!`);
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to upload document.');
    }
  };

  // Calculate totalFee dynamically based on Class, Transport, and Hostel selections
  useEffect(() => {
    let calculatedClassFee = 0;
    if (formData.classId) {
      const cls = sharedClasses.find(c => c.id === formData.classId);
      if (cls) calculatedClassFee = cls.base_fee;
    }

    let calculatedTransportFee = 0;
    if (formData.enableTransport) {
      if (formData.customTransportFee) {
        calculatedTransportFee = Number(formData.customTransportFee) || 0;
      } else if (formData.transportRouteId) {
        const route = sharedTransportRoutes.find(r => r.id === formData.transportRouteId);
        if (route) calculatedTransportFee = route.fee;
      }
    }

    let calculatedHostelFee = 0;
    if (formData.enableHostel) {
      if (formData.customHostelFee) {
        calculatedHostelFee = Number(formData.customHostelFee) || 0;
      } else if (formData.hostelBlockId) {
        const block = sharedHostelBlocks.find(b => b.id === formData.hostelBlockId);
        if (block) calculatedHostelFee = block.fee;
      }
    }

    const total = calculatedClassFee + calculatedTransportFee + calculatedHostelFee;
    setFormData(prev => ({
      ...prev,
      totalFee: total
    }));
  }, [
    formData.classId,
    formData.enableTransport,
    formData.transportRouteId,
    formData.customTransportFee,
    formData.enableHostel,
    formData.hostelBlockId,
    formData.customHostelFee,
    sharedClasses,
    sharedTransportRoutes,
    sharedHostelBlocks
  ]);

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.admissionNo || !formData.classId) {
      toast.error('First Name, Last Name, Class, and Admission Number are required.');
      return;
    }
    if (!formData.parentFirstName || !formData.parentLastName || !formData.parentEmail) {
      toast.error('Parent Name and Contact Email are required to link parent account.');
      return;
    }

    // Basic Aadhaar validation (12 digits)
    const rawAadhaar = formData.aadhaarNo.replace(/\s+/g, '');
    if (rawAadhaar && rawAadhaar.length !== 12) {
      toast.error('Valid 12-digit Aadhaar Card number is required.');
      return;
    }

    try {
      setLoading(true);
      const parentId = `parent-${Math.random().toString(36).substring(7)}`;
      const studentId = `stud-${Math.random().toString(36).substring(7)}`;

      // Upload profile picture if selected
      let profilePicUrl = formData.avatar || '';
      if (formData.avatarFile) {
        const fileExt = formData.avatarFile.name.split('.').pop();
        const fileName = `${editingStudentId || studentId}-${Date.now()}.${fileExt}`;
        const filePath = `${activeTenant.id}/avatars/${fileName}`;
        const uploadedUrl = await uploadFileToBucket(supabase, 'avatars', filePath, formData.avatarFile);
        if (uploadedUrl) {
          profilePicUrl = uploadedUrl;
        }
      }

      const formattedAadhaar = rawAadhaar ? rawAadhaar.match(/.{1,4}/g).join(' ') : '';

      // Calculate transport and hostel fees for the addStudentAndParent function
      let transportFeeValue = 0;
      if (formData.enableTransport) {
        if (formData.customTransportFee) {
          transportFeeValue = Number(formData.customTransportFee) || 0;
        } else if (formData.transportRouteId) {
          const route = sharedTransportRoutes.find(r => r.id === formData.transportRouteId);
          if (route) transportFeeValue = route.fee;
        }
      }
      let hostelFeeValue = 0;
      if (formData.enableHostel) {
        if (formData.customHostelFee) {
          hostelFeeValue = Number(formData.customHostelFee) || 0;
        } else if (formData.hostelBlockId) {
          const block = sharedHostelBlocks.find(b => b.id === formData.hostelBlockId);
          if (block) hostelFeeValue = block.fee;
        }
      }

      if (editingStudentId) {
        // --- EDIT MODE ---
        const existingStudent = sharedStudents.find(s => s.id === editingStudentId);
        if (!existingStudent) throw new Error('Student record not found');

        const updatedStudent = {
          ...existingStudent,
          first_name: formData.firstName,
          last_name: formData.lastName,
          admission_no: formData.admissionNo,
          roll_no: formData.rollNo,
          date_of_birth: formData.dateOfBirth || new Date().toISOString().split('T')[0],
          gender: formData.gender,
          category: formData.category,
          aadhaar_no: formattedAadhaar,
          address: formData.address,
          totalFee: Number(formData.totalFee),
          paidFee: Number(formData.paidFee),
          initialAttendance: formData.initialAttendance,
          class_id: formData.classId,
          enableTransport: formData.enableTransport,
          transportRouteId: formData.transportRouteId,
          transportFee: transportFeeValue,
          enableHostel: formData.enableHostel,
          hostelBlockId: formData.hostelBlockId,
          hostelFee: hostelFeeValue,
          profile_picture_url: profilePicUrl
        };

        const updatedParents = sharedParents.map(p => {
          if (p.id === existingStudent.parent_id) {
            return {
              ...p,
              first_name: formData.parentFirstName,
              last_name: formData.parentLastName,
              email: formData.parentEmail,
              phone: formData.parentPhone,
              occupation: formData.parentOccupation
            };
          }
          return p;
        });

        const updatedStudents = sharedStudents.map(s => s.id === editingStudentId ? updatedStudent : s);

        setSharedStudents(updatedStudents);
        setSharedParents(updatedParents);
        toast.success(`Student "${formData.firstName}" updated successfully!`);
      } else {
        // --- ADD MODE ---
        const student = {
          id: studentId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          admission_no: formData.admissionNo,
          roll_no: formData.rollNo,
          date_of_birth: formData.dateOfBirth || new Date().toISOString().split('T')[0],
          gender: formData.gender,
          category: formData.category,
          aadhaar_no: formattedAadhaar,
          address: formData.address,
          totalFee: Number(formData.totalFee),
          paidFee: Number(formData.paidFee),
          initialAttendance: formData.initialAttendance,
          class_id: formData.classId,
          tenant_id: activeTenant.id,
          enableTransport: formData.enableTransport,
          transportRouteId: formData.transportRouteId,
          transportFee: transportFeeValue,
          enableHostel: formData.enableHostel,
          hostelBlockId: formData.hostelBlockId,
          hostelFee: hostelFeeValue,
          profile_picture_url: profilePicUrl
        };

        const parent = {
          id: parentId,
          first_name: formData.parentFirstName,
          last_name: formData.parentLastName,
          email: formData.parentEmail,
          phone: formData.parentPhone || '+91 99999 88888',
          occupation: formData.parentOccupation
        };

        addStudentAndParent(student, parent);
        toast.success(`Student "${formData.firstName}" and Parent "${formData.parentFirstName}" linked successfully! (Term Fee: ₹${(formData.totalFee || 0).toLocaleString('en-IN')})`);
      }
      
      // Reset form
      setFormData({
        firstName: '', lastName: '', admissionNo: '', rollNo: '',
        dateOfBirth: '', gender: 'MALE', bloodGroup: 'O+', address: '',
        aadhaarNo: '', category: 'GENERAL', classId: '',
        enableTransport: false, transportRouteId: '', customTransportFee: '',
        enableHostel: false, hostelBlockId: '', customHostelFee: '',
        parentFirstName: '', parentLastName: '', parentEmail: '', parentPhone: '', parentOccupation: 'Business Owner',
        totalFee: 0, paidFee: 0, initialAttendance: '85.0%',
        avatar: '', avatarFile: null
      });
      setEditingStudentId(null);
      setShowAddForm(false);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      toast.error('Failed to submit student record.');
    }
  };

  const getParentName = (parentId) => {
    const parent = sharedParents.find(p => p.id === parentId);
    return parent ? `${parent.first_name} ${parent.last_name}` : 'Unlinked';
  };

  const getParentContact = (parentId) => {
    const parent = sharedParents.find(p => p.id === parentId);
    return parent ? `${parent.phone} | ${parent.email}` : 'No details';
  };

  const getClassName = (classId) => {
    const cls = sharedClasses.find(c => c.id === classId);
    return cls ? cls.name : 'Unknown Class';
  };

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

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Student Directory" />;
  }

  const isAdmin = activeRole === 'SUPER_ADMIN' || activeRole === 'SCHOOL_ADMIN';

  const filteredStudents = sharedStudents.filter(s => {
    const studentTenantId = s.tenant_id || 'demo-tenant-1';
    if (studentTenantId !== activeTenant.id) return false;

    // Teacher Restriction
    if (activeRole === 'TEACHER') {
      if (!teacherAllowedClassIds.includes(s.class_id)) return false;
    }

    // Parent Restriction
    if (activeRole === 'PARENT') {
      const myParentProfile = sharedParents.find(p => p.tenant_id === activeTenant.id && p.email === activeUser?.email);
      const myParentId = myParentProfile ? myParentProfile.id : null;
      if (s.parent_id !== myParentId) return false;
    }

    const term = searchQuery.toLowerCase();
    const parent = sharedParents.find(p => p.id === s.parent_id);
    const parentName = parent ? `${parent.first_name} ${parent.last_name}` : '';
    const className = getClassName(s.class_id);
    
    return (
      s.first_name.toLowerCase().includes(term) ||
      s.last_name.toLowerCase().includes(term) ||
      s.admission_no.toLowerCase().includes(term) ||
      (s.aadhaar_no && s.aadhaar_no.includes(term)) ||
      parentName.toLowerCase().includes(term) ||
      className.toLowerCase().includes(term)
    );
  });

  const handleOpenAddForm = () => {
    // Generate next sequential admission number
    const year = new Date().getFullYear();
    let maxNum = 0;
    sharedStudents.forEach(s => {
      if (s.admission_no && s.admission_no.includes('/')) {
        const parts = s.admission_no.split('/');
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNumStr = String(maxNum + 1).padStart(3, '0');
    const nextAdmNo = `ADM${year}/${nextNumStr}`;

    setFormData({
      firstName: '',
      lastName: '',
      admissionNo: nextAdmNo,
      rollNo: '',
      dateOfBirth: '',
      gender: 'MALE',
      bloodGroup: 'O+',
      address: '',
      aadhaarNo: '',
      category: 'GENERAL',
      classId: '',
      enableTransport: false,
      transportRouteId: sharedTransportRoutes?.[0]?.id || '',
      customTransportFee: '',
      enableHostel: false,
      hostelBlockId: sharedHostelBlocks?.[0]?.id || '',
      customHostelFee: '',
      parentFirstName: '',
      parentLastName: '',
      parentEmail: '',
      parentPhone: '',
      parentOccupation: 'Business Owner',
      totalFee: 0,
      paidFee: 0,
      initialAttendance: '85.0%',
      avatar: '',
      avatarFile: null,
      profilePic: '',
      aadhaarDoc: '',
      incomeDoc: ''
    });
    setShowAddForm(true);
  };

  const loadPdfJS = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const parsePdfFile = async (file) => {
    const pdfjsLib = await loadPdfJS();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      const strings = text.items.map(item => item.str);
      textContent += strings.join(' ') + '\n';
    }
    return textContent;
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        let csvLines = [];
        data.forEach(row => {
          if (row.length > 0) {
            csvLines.push(row.join(','));
          }
        });
        setBulkText(csvLines.join('\n'));
        toast.success(`Excel file "${file.name}" parsed! Review and click Validate & Preview.`);
      } catch (err) {
        toast.error('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      toast.error(`PDF size (${fileSizeMB.toFixed(2)} MB) exceeds 10MB limit. Please upload a smaller PDF.`);
      return;
    }
    toast.success(`PDF selected: ${file.name} (${fileSizeMB.toFixed(2)} MB / 10MB limit)`);

    toast.loading('Parsing PDF text elements...');
    try {
      const text = await parsePdfFile(file);
      toast.dismiss();
      
      const lines = text.split('\n');
      const csvLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.includes(',')) return trimmed;
        const cols = trimmed.split(/\s{2,}/);
        return cols.join(', ');
      }).filter(line => line.trim() !== '');

      setBulkText(csvLines.join('\n'));
      toast.success(`PDF file "${file.name}" parsed! Review and click Validate & Preview.`);
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to parse PDF file.');
    }
  };

  const handleValidateBulkStudents = () => {
    if (!bulkText.trim()) {
      toast.error('Please paste some CSV or Excel data first.');
      return;
    }

    const lines = bulkText.split('\n');
    const result = [];

    // Calculate next sequential admission number base
    const year = new Date().getFullYear();
    let maxNum = 0;
    sharedStudents.forEach(s => {
      if (s.admission_no && s.admission_no.includes('/')) {
        const parts = s.admission_no.split('/');
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const cols = trimmed.split(',').map(c => c.trim());
      if (cols.length < 2) return; // Ignore malformed lines

      const [firstName, lastName, className, aadhaar, parentFirstName, parentLastName, parentEmail, parentPhone] = cols;

      if (!firstName) {
        toast.error(`Line ${idx + 1}: First Name is required.`);
        return;
      }

      // Map Class name to Class ID
      const resolvedClass = sharedClasses.find(c => 
        c.tenant_id === activeTenant.id && 
        c.name.toLowerCase().replace(/\s+/g, '') === (className || '').toLowerCase().replace(/\s+/g, '')
      ) || sharedClasses.find(c => c.tenant_id === activeTenant.id) || { id: 'class-1', name: 'Class IX', base_fee: 28000 };

      // Compute sequential Admission No
      const nextNumStr = String(maxNum + 1 + result.length).padStart(3, '0');
      const admNo = `ADM${year}/${nextNumStr}`;

      result.push({
        student: {
          id: `stud-bulk-${idx}-${Date.now()}`,
          first_name: firstName,
          last_name: lastName || '',
          admission_no: admNo,
          roll_no: Math.floor(10 + Math.random() * 80).toString(),
          date_of_birth: '2010-06-15',
          gender: 'MALE',
          blood_group: 'O+',
          address: 'Saket, New Delhi',
          aadhaar_no: aadhaar || '123456789012',
          category: 'GENERAL',
          class_id: resolvedClass.id,
          enableTransport: false,
          transportRouteId: '',
          transportFee: 0,
          enableHostel: false,
          hostelBlockId: '',
          hostelFee: 0,
          totalFee: resolvedClass.base_fee,
          paidFee: 0,
          initialAttendance: '85.0%',
          profile_picture_url: '',
          tenant_id: activeTenant.id
        },
        parent: {
          id: `parent-bulk-${idx}-${Date.now()}`,
          first_name: parentFirstName || `Guardian of ${firstName}`,
          last_name: parentLastName || lastName || '',
          email: parentEmail || `${firstName.toLowerCase()}-parent@example.com`,
          phone: parentPhone || '+91 99999 88888',
          occupation: 'Business Owner'
        }
      });
    });

    setParsedStudents(result);
    toast.success(`Successfully parsed ${result.length} student and parent records!`);
  };

  const handleImportBulkStudents = () => {
    if (parsedStudents.length === 0) {
      toast.error('No parsed records to onboard.');
      return;
    }

    parsedStudents.forEach(item => {
      addStudentAndParent(item.student, item.parent);
    });

    toast.success(`Successfully admitted all ${parsedStudents.length} students in bulk with linked parent accounts!`);
    setBulkText('');
    setParsedStudents([]);
    setShowBulkModal(false);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Student Registry</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">Manage admissions, reservation categories, Aadhaar registries, and family accounts.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowBulkModal(true)}
              className="px-5 py-3 bg-bg-sidebar hover:bg-slate-50 border border-border text-text-primary text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} className="text-accent" />
              <span>Bulk Admission</span>
            </button>
            <button 
              onClick={handleOpenAddForm}
              className="px-5 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={14} />
              <span>Admit Student</span>
            </button>
          </div>
        )}
      </div>

      <Modal
        open={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setBulkText('');
          setParsedStudents([]);
        }}
        title="Bulk Student Admissions"
        icon={<Plus size={18} />}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Onboard multiple students at once. Copy & paste CSV rows or Excel columns, or upload a <strong>.csv / .xlsx / .pdf</strong> file:
            <br />
            <strong className="text-text-primary block mt-1 bg-slate-100/50 p-2 rounded-lg font-mono text-[10px]">
              First Name, Last Name, Class, Aadhaar, Parent First Name, Parent Last Name, Parent Email, Parent Phone
            </strong>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            {/* File Upload Buttons */}
            <div className="flex gap-2">
              <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-[10px] font-bold rounded-xl cursor-pointer transition-all border border-border flex items-center gap-1.5">
                <FileText size={12} className="text-accent" />
                <span>Upload Excel / CSV</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>
              
              <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-[10px] font-bold rounded-xl cursor-pointer transition-all border border-border flex items-center gap-1.5">
                <FileText size={12} className="text-danger" />
                <span>Upload PDF</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBulkText(
                  "Aarav, Sharma, Class IX, 123456789012, Rajesh, Sharma, rajesh@example.com, +91 9876543210\n" +
                  "Diya, Patel, Class XII, 987654321098, Amit, Patel, amit@example.com, +91 9999988888"
                )}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-text-primary text-[10px] font-bold rounded-xl transition-all"
              >
                Load Example Template
              </button>
            </div>
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Paste your CSV content here..."
            className="w-full h-36 font-mono text-xs p-3 bg-bg-main border border-border rounded-xl outline-none focus:border-accent"
          />

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleValidateBulkStudents}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-text-primary text-xs font-bold rounded-xl transition-all"
            >
              Validate & Preview
            </button>
            <button
              type="button"
              disabled={parsedStudents.length === 0}
              onClick={handleImportBulkStudents}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              Admit Batch ({parsedStudents.length} Students)
            </button>
          </div>

          {parsedStudents.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar border border-border rounded-xl">
              <table className="w-full text-left border-collapse text-[11px] p-2">
                <thead>
                  <tr className="bg-slate-100 border-b border-border text-[9px] font-black uppercase text-text-secondary">
                    <th className="p-2">Name</th>
                    <th className="p-2">Admission No</th>
                    <th className="p-2">Class</th>
                    <th className="p-2">Aadhaar</th>
                    <th className="p-2">Parent Name</th>
                    <th className="p-2">Parent Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedStudents.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-bold text-text-primary">
                        {item.student.first_name} {item.student.last_name}
                      </td>
                      <td className="p-2 font-mono text-text-secondary">{item.student.admission_no}</td>
                      <td className="p-2 font-semibold">
                        {sharedClasses.find(c => c.id === item.student.class_id)?.name || 'Class IX'}
                      </td>
                      <td className="p-2 font-mono text-text-secondary">{item.student.aadhaar_no}</td>
                      <td className="p-2 text-text-primary">
                        {item.parent.first_name} {item.parent.last_name}
                      </td>
                      <td className="p-2 font-mono text-text-secondary text-[10px]">
                        {item.parent.phone} | {item.parent.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setEditingStudentId(null);
        }}
        title={editingStudentId ? "Edit Student & Parent Details" : "New Student & Parent Enrollment"}
        icon={editingStudentId ? <Edit size={18} /> : <UserPlus size={18} />}
        size="lg"
      >
        <form onSubmit={handleOnboard} className="space-y-6">
            
            {/* Profile Picture Upload Section (FIRST PLACE) */}
            <div className="p-5 bg-slate-100/50 border border-border rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Student Profile Picture</h4>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar Preview */}
                <div className="relative group">
                  {formData.avatar ? (
                    <img 
                      src={formData.avatar} 
                      alt="Student Avatar Preview" 
                      className="w-24 h-24 rounded-2xl object-cover border border-border" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-3xl font-black font-outfit">
                      {formData.firstName ? formData.firstName[0] : 'S'}
                    </div>
                  )}
                  {formData.avatar && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: '', avatarFile: null })}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-danger text-white rounded-lg hover:bg-danger-hover transition-all"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Upload Action / Preset Selector */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/60 border border-border rounded-xl text-[11px] font-bold text-text-primary cursor-pointer transition-all flex items-center gap-1.5 active:scale-95">
                      <UserPlus size={12} className="text-accent" />
                      <span>Upload Photo</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const fileSizeMB = file.size / (1024 * 1024);
                            if (fileSizeMB > 1) {
                              toast.error(`Image size (${fileSizeMB.toFixed(2)} MB) exceeds 1MB limit. Please upload a smaller image.`);
                              return;
                            }
                            toast.success(`Image selected: ${file.name} (${fileSizeMB.toFixed(2)} MB / 1MB limit)`);
                            const reader = new FileReader();
                            reader.onload = () => {
                              setFormData(prev => ({
                                ...prev,
                                avatar: reader.result,
                                avatarFile: file
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                    <span className="text-[10px] text-text-secondary">PNG, JPG up to 1MB</span>
                  </div>

                  {/* Preset Avatars Grid */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Or Choose Template Avatar</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Aarav',
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Diya',
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Kabir',
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Priya',
                        'https://api.dicebear.com/7.x/bottts/svg?seed=Siddharth'
                      ].map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatar: presetUrl, avatarFile: null }))}
                          className={`w-9 h-9 rounded-xl border p-1 bg-slate-100 transition-all overflow-hidden flex items-center justify-center ${
                            formData.avatar === presetUrl ? 'border-accent ring-2 ring-accent/20 scale-105' : 'border-border hover:border-border'
                          }`}
                        >
                          <img src={presetUrl} alt="preset" className="w-7 h-7 object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Part 1: Student Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider">1. Academic & Student Dossier</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">First Name *</label>
                  <input 
                    type="text" 
                    placeholder="Aarav"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Last Name *</label>
                  <input 
                    type="text" 
                    placeholder="Patel"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Class * (Auto-assigns base tuition fees)</label>
                  <select 
                    value={formData.classId}
                    onChange={(e) => setFormData({...formData, classId: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                    required
                  >
                    <option value="">Select Academic Class...</option>
                    {teacherAllowedClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Base Fee: ₹{c.base_fee.toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Admission Number *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ADM2026/049"
                    value={formData.admissionNo}
                    onChange={(e) => setFormData({...formData, admissionNo: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Aadhaar Card Number (12 digits) *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 483928409283"
                    value={formData.aadhaarNo}
                    onChange={(e) => setFormData({...formData, aadhaarNo: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                  <p className="text-[10px] text-text-secondary mt-1 font-semibold">
                    💡 Onboarding Notice: Student's default login password is set to their 12-digit Aadhaar Number.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Reservation Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                  >
                    <option value="GENERAL">General</option>
                    <option value="OBC">OBC (Other Backward Classes)</option>
                    <option value="SC">Scheduled Caste (SC)</option>
                    <option value="ST">Scheduled Tribe (ST)</option>
                    <option value="EWS">Economically Weaker Section (EWS)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Date of Birth</label>
                  <input 
                    type="date" 
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full text-xs bg-bg-sidebar text-text-primary"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Residential Address</label>
                  <input 
                    type="text" 
                    placeholder="House No, Road, City, State, PIN"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Optional Commute & Residence Options */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider">Optional Commute & Boarding Facilities</h4>
              
              {/* Transport Option */}
              <div className="space-y-3 p-4 bg-slate-100/50 border border-border rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-text-primary uppercase tracking-wider block flex items-center gap-1.5">
                      <Bus size={12} className="text-accent" />
                      <span>Enable Transport Facility</span>
                    </span>
                    <p className="text-[9px] text-text-secondary">Assigned school bus corridors</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.enableTransport}
                    onChange={(e) => setFormData({
                      ...formData, 
                      enableTransport: e.target.checked, 
                      transportRouteId: e.target.checked ? (sharedTransportRoutes[0]?.id || '') : '', 
                      customTransportFee: ''
                    })}
                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent bg-bg-main"
                  />
                </div>
                {formData.enableTransport && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block block ml-1">Assigned Route</label>
                      <select 
                        value={formData.transportRouteId}
                        onChange={(e) => setFormData({...formData, transportRouteId: e.target.value, customTransportFee: ''})}
                        className="w-full text-[11px] bg-bg-main text-text-primary py-2 px-2.5 rounded-xl border border-border"
                      >
                        {sharedTransportRoutes.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (₹{r.fee.toLocaleString('en-IN')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Custom Transport Fee (Optional Overrider)</label>
                      <input 
                        type="number" 
                        placeholder="Override route fee (₹)"
                        value={formData.customTransportFee}
                        onChange={(e) => setFormData({...formData, customTransportFee: e.target.value})}
                        className="w-full text-[11px] py-2 px-2.5"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hostel Option */}
              <div className="space-y-3 p-4 bg-slate-100/50 border border-border rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-text-primary uppercase tracking-wider block flex items-center gap-1.5">
                      <HomeIcon size={12} className="text-accent" />
                      <span>Enable Hostel Accommodation</span>
                    </span>
                    <p className="text-[9px] text-text-secondary">Assigned housing blocks & dining mess</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.enableHostel}
                    onChange={(e) => setFormData({
                      ...formData, 
                      enableHostel: e.target.checked, 
                      hostelBlockId: e.target.checked ? (sharedHostelBlocks[0]?.id || '') : '', 
                      customHostelFee: ''
                    })}
                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent bg-bg-main"
                  />
                </div>
                {formData.enableHostel && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Assigned Hostel Block</label>
                      <select 
                        value={formData.hostelBlockId}
                        onChange={(e) => setFormData({...formData, hostelBlockId: e.target.value, customHostelFee: ''})}
                        className="w-full text-[11px] bg-bg-main text-text-primary py-2 px-2.5 rounded-xl border border-border"
                      >
                        {sharedHostelBlocks.map(b => (
                          <option key={b.id} value={b.id}>{b.name} (₹{b.fee.toLocaleString('en-IN')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block ml-1">Custom Hostel Fee (Optional Overrider)</label>
                      <input 
                        type="number" 
                        placeholder="Override block fee (₹)"
                        value={formData.customHostelFee}
                        onChange={(e) => setFormData({...formData, customHostelFee: e.target.value})}
                        className="w-full text-[11px] py-2 px-2.5"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Part 2: Parent Information */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon size={12} />
                <span>2. Parent / Guardian Credentials (Linking details)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Parent First Name *</label>
                  <input 
                    type="text" 
                    placeholder="Vikram"
                    value={formData.parentFirstName}
                    onChange={(e) => setFormData({...formData, parentFirstName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Parent Last Name *</label>
                  <input 
                    type="text" 
                    placeholder="Patel"
                    value={formData.parentLastName}
                    onChange={(e) => setFormData({...formData, parentLastName: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Parent Contact Email *</label>
                  <input 
                    type="email" 
                    placeholder="vikram.patel@gmail.com"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                    className="w-full text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Parent Contact Phone</label>
                  <input 
                    type="text" 
                    placeholder="+91 98765 43210"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Occupation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Software Engineer, Business Owner"
                    value={formData.parentOccupation}
                    onChange={(e) => setFormData({...formData, parentOccupation: e.target.value})}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Part 3: Metrics Initialization */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider">3. Fee Ledger & Attendance Setup</h4>
              
              {/* Summary Breakdown Card */}
              <div className="p-4 bg-bg-main border border-border rounded-2xl space-y-2.5">
                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Fee Allocation Summary</span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Base Class Tuition:</span>
                    <span className="font-bold font-mono text-text-primary">
                      ₹{(formData.classId ? (sharedClasses.find(c => c.id === formData.classId)?.base_fee || 0) : 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {formData.enableTransport && (
                    <div className="flex justify-between text-text-secondary">
                      <span>Transport Commute Option:</span>
                      <span className="font-bold font-mono text-success">
                        + ₹{(formData.customTransportFee ? Number(formData.customTransportFee) : (sharedTransportRoutes.find(r => r.id === formData.transportRouteId)?.fee || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {formData.enableHostel && (
                    <div className="flex justify-between text-text-secondary">
                      <span>Hostel Housing & Lodging:</span>
                      <span className="font-bold font-mono text-success">
                        + ₹{(formData.customHostelFee ? Number(formData.customHostelFee) : (sharedHostelBlocks.find(b => b.id === formData.hostelBlockId)?.fee || 0)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  <div className="h-px bg-slate-100 my-1.5"></div>
                  <div className="flex justify-between text-sm font-black text-text-primary">
                    <span>Total Calculated Term Fee:</span>
                    <span className="font-mono text-accent">₹{(formData.totalFee || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Fee Amount Paid (₹) *</label>
                  <input 
                    type="number" 
                    value={formData.paidFee}
                    onChange={(e) => setFormData({...formData, paidFee: e.target.value})}
                    className="w-full text-xs font-mono"
                    max={formData.totalFee}
                    min={0}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Initial Attendance (%)</label>
                  <input 
                    type="text" 
                    value={formData.initialAttendance}
                    onChange={(e) => setFormData({...formData, initialAttendance: e.target.value})}
                    className="w-full text-xs font-mono"
                  />
                </div>
              </div>

              {/* Real-time remaining calculation */}
              <div className="flex justify-between items-center text-xs p-3 bg-slate-50/50 rounded-xl border border-border">
                <span className="text-text-secondary">Outstanding Balance Due:</span>
                <span className="font-mono font-black text-warning">
                  ₹{((formData.totalFee || 0) - (Number(formData.paidFee) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all mt-4 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : (editingStudentId ? <Edit size={16} /> : <UserPlus size={16} />)}
              <span>{editingStudentId ? 'Save Student & Parent Changes' : 'Link Profiles & Register Admission Record'}</span>
            </button>
          </form>
      </Modal>

      {/* STUDENT DOCUMENT DOSSIER MODAL */}
      <Modal
        open={!!selectedStudentForDossier}
        onClose={() => {
          setSelectedStudentForDossier(null);
          setActiveDossierTab('documents');
        }}
        title="Student Documents & Dossier"
        icon={<FileText size={20} />}
        size="lg"
      >
        {selectedStudentForDossier && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-100/50 border border-border rounded-2xl">
              {selectedStudentForDossier.profile_picture_url ? (
                <img 
                  src={selectedStudentForDossier.profile_picture_url} 
                  alt="Student Avatar" 
                  className="w-14 h-14 rounded-xl object-cover border border-border" 
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xl font-black font-outfit">
                  {selectedStudentForDossier.first_name[0]}{selectedStudentForDossier.last_name[0]}
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-text-primary">{selectedStudentForDossier.first_name} {selectedStudentForDossier.last_name}</h4>
                <p className="text-[10px] text-text-secondary uppercase">Admission No: {selectedStudentForDossier.admission_no} • Class: {getClassName(selectedStudentForDossier.class_id)}</p>
              </div>
            </div>

            {/* Segmented Tabs */}
            <div className="flex gap-2 border-b border-border pb-px">
              <button
                type="button"
                onClick={() => setActiveDossierTab('documents')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  activeDossierTab === 'documents'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Documents Registry
              </button>
              <button
                type="button"
                onClick={() => setActiveDossierTab('history')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  activeDossierTab === 'history'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Academic History Logs
              </button>
            </div>

            {activeDossierTab === 'documents' ? (
              <div className="space-y-6">
                {/* Document Upload Selector */}
                <div className="p-5 bg-bg-main border border-border rounded-2xl space-y-4">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest block">Upload New Dossier Document</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Document Category</label>
                      <select 
                        id="docTypeSelector"
                        className="w-full text-xs bg-bg-sidebar text-text-primary py-2.5 px-3 rounded-xl border border-border"
                      >
                        <option value="Aadhaar Card Copy">Aadhaar Card Copy</option>
                        <option value="Birth Certificate">Birth Certificate</option>
                        <option value="Prior Marksheet (CBSE/State)">Prior Marksheet (CBSE/State)</option>
                        <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                        <option value="Medical Certificate">Medical Health Dossier</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95">
                        <Plus size={14} />
                        <span>Choose File & Upload</span>
                        <input 
                          type="file" 
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            const docType = document.getElementById('docTypeSelector').value;
                            if (file) {
                              handleUploadDocument(file, docType);
                            }
                          }}
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Documents List */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block ml-1">Registered Documents Registry</span>
                  <div className="space-y-2">
                    {(selectedStudentForDossier.documents || []).map((doc, idx) => (
                      <div key={idx} className="p-4 bg-bg-main border border-border hover:border-border rounded-2xl flex justify-between items-center transition-all font-inter">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-text-primary">{doc.name}</p>
                          <p className="text-[9px] text-text-secondary font-mono">{doc.fileName} • Uploaded on {doc.date}</p>
                        </div>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-\[10px] font-bold rounded-lg border border-border transition-all"
                        >
                          View File
                        </a>
                      </div>
                    ))}
                    {(selectedStudentForDossier.documents || []).length === 0 && (
                      <p className="text-xs text-text-secondary italic text-center py-6 border border-dashed border-border rounded-2xl">
                        No documents uploaded. Click above to register educational/identity certificates.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Academic History View */}
                {(() => {
                  const historyRecords = sharedStudentHistory[selectedStudentForDossier.id] || [];
                  if (historyRecords.length === 0) {
                    return (
                      <p className="text-xs text-text-secondary italic text-center py-12 border border-dashed border-border rounded-2xl bg-bg-main/30">
                        No archived academic history found. Student has not been promoted through any term yet.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-8 max-h-[500px] overflow-y-auto pr-1">
                      {historyRecords.map((record, index) => (
                        <div key={index} className="relative pl-6 border-l-2 border-accent/20 space-y-4">
                          <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-bg-sidebar"></div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black uppercase text-accent tracking-widest">Academic Year {record.academic_year}</span>
                              <h4 className="text-sm font-bold text-text-primary mt-0.5">{record.class_name}</h4>
                            </div>
                            <div className="flex gap-2">
                              <span className="px-2.5 py-1 bg-accent/5 border border-accent/10 rounded-lg text-[10px] font-bold text-text-primary">
                                Attendance: {record.attendance}
                              </span>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                record.fees?.status === 'PAID'
                                  ? 'bg-success/5 border-success/15 text-success'
                                  : record.fees?.status === 'PARTIAL'
                                  ? 'bg-warning/5 border-warning/15 text-warning'
                                  : 'bg-danger/5 border-danger/15 text-danger'
                              }`}>
                                Fees: {record.fees?.status} (₹{record.fees?.paid?.toLocaleString('en-IN')} / ₹{record.fees?.total?.toLocaleString('en-IN')})
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Performance */}
                            <div className="bg-bg-main/60 border border-border p-4 rounded-xl space-y-3">
                              <span className="text-[9px] font-black uppercase text-text-secondary tracking-wider block">Performance Sheet</span>
                              {record.academic_records && record.academic_records.length > 0 ? (
                                <div className="space-y-2">
                                  {record.academic_records.map((ar, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-border/50 last:border-0">
                                      <span className="font-medium text-text-secondary truncate pr-2">{ar.subject}</span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-bold text-text-primary">{ar.marks}</span>
                                        <span className="px-1.5 py-0.5 bg-accent/10 text-[9px] font-black text-accent rounded uppercase">{ar.grade}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-text-secondary italic">No marksheet records compiled for this year.</p>
                              )}
                            </div>

                            {/* Remarks */}
                            <div className="bg-bg-main/60 border border-border p-4 rounded-xl space-y-3">
                              <span className="text-[9px] font-black uppercase text-text-secondary tracking-wider block">Teacher Assessments</span>
                              {record.remarks && record.remarks.length > 0 ? (
                                <div className="space-y-3">
                                  {record.remarks.map((rem, idx) => (
                                    <div key={idx} className="p-2.5 bg-bg-sidebar border border-border/60 rounded-lg space-y-1">
                                      <p className="text-[11px] text-text-primary font-medium italic">"{rem.remark}"</p>
                                      <div className="flex justify-between items-center text-[9px] text-text-secondary font-semibold">
                                        <span>{rem.teacher}</span>
                                        <span>{rem.date}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-text-secondary italic">No teacher remarks documented for this term.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* STUDENT PROMOTION MODAL */}
      <Modal
        open={showPromoteModal}
        onClose={() => {
          setShowPromoteModal(false);
          setSelectedStudentForPromotion(null);
        }}
        title="Promote Student to Next Grade"
        icon={<ArrowUpCircle size={20} />}
        size="md"
      >
        {selectedStudentForPromotion && (
          <div className="space-y-5">
            <div className="p-4 bg-accent/5 border border-accent/15 rounded-2xl">
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Active Candidate Info</h4>
              <p className="text-sm font-bold text-text-primary mt-1">
                {selectedStudentForPromotion.first_name} {selectedStudentForPromotion.last_name}
              </p>
              <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                Current Class: <span className="font-bold text-text-primary">{getClassName(selectedStudentForPromotion.class_id)}</span> • Adm No: {selectedStudentForPromotion.admission_no}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Target Promotion Grade *</label>
                <select
                  value={promotionClassId}
                  onChange={(e) => setPromotionClassId(e.target.value)}
                  className="w-full text-xs bg-bg-sidebar text-text-primary border border-border rounded-xl py-3 px-3 outline-none"
                  required
                >
                  <option value="" disabled>Select target class...</option>
                  {sharedClasses
                    .filter(c => c.tenant_id === activeTenant.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Base Fee: ₹{c.base_fee.toLocaleString('en-IN')})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="flex items-center gap-2 p-1.5 ml-1">
                <input
                  type="checkbox"
                  id="resetFeesToggle"
                  checked={resetFees}
                  onChange={(e) => setResetFees(e.target.checked)}
                  className="accent-accent"
                />
                <label htmlFor="resetFeesToggle" className="text-xs text-text-primary font-medium cursor-pointer">
                  Reset and allocate new term billing structure
                </label>
              </div>

              <p className="text-[10px] text-text-secondary leading-relaxed italic ml-1">
                💡 Note: Resetting fees will configure new term balances based on the target class tuition fee, carry over transport/hostel selections (if active), set paid amount to ₹0, and clear previous payment history for the new year.
              </p>
            </div>

            <div className="flex gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowPromoteModal(false);
                  setSelectedStudentForPromotion(null);
                }}
                className="flex-1 py-3 bg-bg-sidebar border border-border hover:border-slate-300 text-text-primary text-xs font-bold rounded-xl transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromoteStudent}
                disabled={!promotionClassId}
                className="flex-1 py-3 bg-success hover:bg-success-hover text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                Confirm Promotion
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Students Table */}
      <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
        
        {/* Search Bar */}
        <div className="max-w-md relative group/search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search by student name, Aadhaar, class, parent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
          />
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                <th className="pb-3 pl-2">Student Name</th>
                <th className="pb-3">Class</th>
                <th className="pb-3">Admission No</th>
                <th className="pb-3">Roll No</th>
                <th className="pb-3">Aadhaar Card</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Parent / Guardian</th>
                <th className="pb-3">Parent Contact info</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2">
                    {student.profile_picture_url ? (
                      <img 
                        src={student.profile_picture_url} 
                        alt="Student Avatar" 
                        className="w-8 h-8 rounded-lg object-cover border border-border shrink-0" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-[11px] font-black font-outfit shrink-0">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                    )}
                    <div>
                      <span>{student.first_name} {student.last_name}</span>
                      <span className="text-[9px] text-text-secondary block font-normal">{student.address || 'Address unlisted'}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="px-2.5 py-1 rounded bg-bg-main border border-border text-[10px] font-bold text-text-primary">
                      {getClassName(student.class_id)}
                    </span>
                  </td>
                  <td className="py-4 font-mono text-text-secondary">{student.admission_no}</td>
                  <td className="py-4 font-mono text-text-primary font-bold">{student.roll_no || 'N/A'}</td>
                  <td className="py-4 font-mono text-text-secondary text-[11px]">{student.aadhaar_no || 'N/A'}</td>
                  <td className="py-4">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-accent/15 border border-accent/35 text-accent">
                      {student.category}
                    </span>
                  </td>
                  <td className="py-4 font-bold text-text-primary">
                    {getParentName(student.parent_id)}
                  </td>
                  <td className="py-4 text-text-secondary font-mono text-[10px]">
                    {getParentContact(student.parent_id)}
                  </td>
                  <td className="py-4 text-right pr-2">
                    <div className="flex justify-end gap-1.5">
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => handleOpenEditForm(student)}
                            className="p-1.5 text-text-secondary hover:text-accent rounded-lg hover:bg-slate-100 transition-all"
                            title="Edit Student & Parent Details"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedStudentForPromotion(student);
                              setPromotionClassId(getNextLogicalClassId(student.class_id));
                              setShowPromoteModal(true);
                            }}
                            className="p-1.5 text-text-secondary hover:text-success rounded-lg hover:bg-slate-100 transition-all"
                            title="Promote Student"
                          >
                            <ArrowUpCircle size={14} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => setSelectedStudentForDossier(student)}
                        className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-slate-100 transition-all"
                        title="Student Documents & Dossier"
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <p className="text-center py-8 text-xs text-text-secondary">No student records match your query.</p>
        )}

      </div>
    </div>
  );
}
