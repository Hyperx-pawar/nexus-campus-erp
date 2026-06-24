'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Shield, Sparkles, 
  Trash2, ChevronRight, FileText, ArrowLeft, Loader2, Link as LinkIcon, Bus, Home as HomeIcon, X, Plus, Edit, ArrowUpCircle,
  GraduationCap, ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import { uploadFileToBucket } from '@/lib/storage';
import * as XLSX from 'xlsx';

// Helper to suggest alphabetical roll number sequentially per class
const suggestRollNumber = (firstName, classId, existingStudents, tenantId) => {
  if (!firstName || !classId) return '';
  const initial = firstName.trim().charAt(0).toUpperCase();
  if (!/^[A-Z]$/.test(initial)) return '';
  const classStudents = existingStudents.filter(s => s.class_id === classId && (s.tenant_id || 'demo-tenant-1') === tenantId);
  
  const matchRegex = new RegExp(`^${initial}-(\\d+)$`);
  let maxSeq = 0;
  classStudents.forEach(s => {
    if (s.roll_no) {
      const match = s.roll_no.match(matchRegex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  });
  
  const nextSeqStr = String(maxSeq + 1).padStart(2, '0');
  return `${initial}-${nextSeqStr}`;
};

export default function StudentRegistryPage() {
  const [isRollNoManuallyEdited, setIsRollNoManuallyEdited] = useState(false);
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

  // Bulk Selection & Promotion States
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);
  const [bulkPromotionTargetClassId, setBulkPromotionTargetClassId] = useState('');
  const [bulkPromotionResetFees, setBulkPromotionResetFees] = useState(true);

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

  const handleBulkPromoteStudents = () => {
    if (selectedStudentIds.length === 0 || !bulkPromotionTargetClassId) return;

    const currentYear = activeTenant.settings?.academicYear || '2025-2026';
    const targetClass = sharedClasses.find(c => c.id === bulkPromotionTargetClassId);
    const targetClassName = targetClass ? targetClass.name : 'Next Logical Class';

    // 1. Prepare history snapshots
    const historyUpdates = {};
    const academicRecordsUpdates = {};
    const remarksUpdates = {};
    const feeRecordsUpdates = {};
    const newAlerts = [];

    selectedStudentIds.forEach((studentId, idx) => {
      const student = sharedStudents.find(s => s.id === studentId);
      if (!student) return;

      const currentClassId = student.class_id;
      const currentClassName = getClassName(currentClassId);

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

      // We will accumulate updates
      historyUpdates[studentId] = archivedRecord;
      academicRecordsUpdates[studentId] = [];
      remarksUpdates[studentId] = [];

      // Fee Reset Calculations
      if (bulkPromotionResetFees) {
        const classFeeStructures = sharedFeeStructures.filter(
          fs => fs.class_id === bulkPromotionTargetClassId && fs.tenant_id === activeTenant.id
        );
        const baseFeeTotal = classFeeStructures.reduce((sum, fs) => sum + fs.amount, 0);

        const studentAddons = sharedStudentFeeAddons[studentId] || {
          transport: { enabled: false, routeId: '', fee: 0 },
          hostel: { enabled: false, blockId: '', fee: 0 }
        };

        const finalTotal = baseFeeTotal + (studentAddons.transport?.fee || 0) + (studentAddons.hostel?.fee || 0);

        feeRecordsUpdates[studentId] = {
          total: finalTotal,
          paid: 0,
          remaining: finalTotal,
          status: 'UNPAID',
          history: []
        };
      }

      // Alerts
      if (student.parent_id) {
        newAlerts.push({
          id: `alert-${Date.now()}-${studentId}-${idx}`,
          parent_id: student.parent_id,
          student_id: student.id,
          title: '🎓 Student Promoted to Next Grade (Bulk)',
          body: `Congratulations! Your child ${student.first_name} has been promoted to ${targetClassName} for the new academic year. New term fee structure has been allocated.`,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          read: false,
          type: 'promotion'
        });
      }
    });

    // 2. Commit history updates
    setSharedStudentHistory(prev => {
      const updated = { ...prev };
      Object.keys(historyUpdates).forEach(studentId => {
        const studentHistory = updated[studentId] || [];
        const filteredHistory = studentHistory.filter(h => h.academic_year !== currentYear);
        updated[studentId] = [...filteredHistory, historyUpdates[studentId]];
      });
      return updated;
    });

    // 3. Reset active marks and remarks
    setSharedAcademicRecords(prev => {
      const updated = { ...prev };
      Object.keys(academicRecordsUpdates).forEach(studentId => {
        updated[studentId] = [];
      });
      return updated;
    });

    setSharedRemarks(prev => {
      const updated = { ...prev };
      Object.keys(remarksUpdates).forEach(studentId => {
        updated[studentId] = [];
      });
      return updated;
    });

    // 4. Update student class_ids
    const updatedStudents = sharedStudents.map(s => {
      if (selectedStudentIds.includes(s.id)) {
        return {
          ...s,
          class_id: bulkPromotionTargetClassId
        };
      }
      return s;
    });
    setSharedStudents(updatedStudents);

    // 5. Reset fee records
    if (bulkPromotionResetFees) {
      setSharedFeeRecords(prev => {
        const updated = { ...prev };
        Object.keys(feeRecordsUpdates).forEach(studentId => {
          updated[studentId] = feeRecordsUpdates[studentId];
        });
        return updated;
      });
    }

    // 6. Notifications
    if (newAlerts.length > 0) {
      setSharedNotifications(prev => [...newAlerts, ...prev]);
    }

    toast.success(`Successfully promoted ${selectedStudentIds.length} students to ${targetClassName}!`);
    setSelectedStudentIds([]);
    setShowBulkPromoteModal(false);
  };

  const handleBulkPassOutStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    
    const confirmMsg = `Are you sure you want to mark the ${selectedStudentIds.length} selected students as Pass Out / Alumni? This will automatically deactivate their portal accounts.`;
    if (!confirm(confirmMsg)) return;

    const updatedStudents = sharedStudents.map(s => 
      selectedStudentIds.includes(s.id) ? {
        ...s,
        is_alumni: true,
        is_active: false
      } : s
    );
    setSharedStudents(updatedStudents);

    if (supabase) {
      try {
        const { error: studentErr } = await supabase
          .from('students')
          .update({ is_alumni: true })
          .in('id', selectedStudentIds);

        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ is_active: false })
          .in('id', selectedStudentIds);

        if (studentErr || profileErr) {
          console.error("Bulk passout error:", studentErr || profileErr);
          toast.error("Failed to update database status, but updated local state.");
        } else {
          toast.success(`Successfully graduated ${selectedStudentIds.length} students and blocked their portal accounts!`);
        }
      } catch (err) {
        console.error(err);
        toast.error("An unexpected error occurred during bulk graduation.");
      }
    } else {
      toast.success(`[Demo Mode] Successfully graduated ${selectedStudentIds.length} students!`);
    }

    setSelectedStudentIds([]);
  };

  const handleOpenEditForm = (student) => {
    const parent = sharedParents.find(p => p.id === student.parent_id) || {};
    setEditingStudentId(student.id);
    setIsRollNoManuallyEdited(true);
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
      discount: sharedFeeRecords[student.id]?.discount || 0,
      initialAttendance: student.initialAttendance || '85.0%',
      avatar: student.profile_picture_url || '',
      avatarFile: null,
      isAlumni: student.is_alumni || false,
      isActive: student.is_active !== false
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
    discount: '',
    initialAttendance: '85.0%',
    avatar: '',
    avatarFile: null,
    isAlumni: false,
    isActive: true
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
      const publicUrl = await uploadFileToBucket(supabase, activeTenant.bucket_name, filePath, file);
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

  // Auto-generate roll number based on First Name and Class ID when not manually edited
  useEffect(() => {
    if (!editingStudentId && !isRollNoManuallyEdited) {
      const suggestion = suggestRollNumber(
        formData.firstName,
        formData.classId,
        sharedStudents,
        activeTenant.id
      );
      setFormData(prev => ({
        ...prev,
        rollNo: suggestion
      }));
    }
  }, [formData.firstName, formData.classId, editingStudentId, isRollNoManuallyEdited, sharedStudents, activeTenant.id]);

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
        const uploadedUrl = await uploadFileToBucket(supabase, activeTenant.bucket_name, filePath, formData.avatarFile);
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
          profile_picture_url: profilePicUrl,
          is_alumni: formData.isAlumni,
          is_active: formData.isActive
        };

        if (supabase) {
          try {
            await supabase
              .from('profiles')
              .update({ is_active: formData.isActive })
              .eq('id', editingStudentId);
            await supabase
              .from('students')
              .update({ is_alumni: formData.isAlumni })
              .eq('id', editingStudentId);
          } catch (dbErr) {
            console.error('Failed to sync status to Supabase:', dbErr);
          }
        }

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

        if (setSharedFeeRecords) {
          setSharedFeeRecords(prev => {
            const currentFee = prev[editingStudentId] || { total: Number(formData.totalFee), paid: Number(formData.paidFee), remaining: Number(formData.totalFee) - Number(formData.paidFee), status: 'UNPAID', history: [], discount: 0 };
            const newDiscount = Number(formData.discount || 0);
            const newTotal = Number(formData.totalFee);
            const newPaid = Number(formData.paidFee);
            const newRemaining = Math.max(0, newTotal - newPaid - newDiscount);
            return {
              ...prev,
              [editingStudentId]: {
                ...currentFee,
                total: newTotal,
                paid: newPaid,
                discount: newDiscount,
                remaining: newRemaining,
                status: newRemaining === 0 ? 'PAID' : (newPaid > 0 || newDiscount > 0) ? 'PARTIAL' : 'UNPAID'
              }
            };
          });
        }

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
          discount: Number(formData.discount || 0),
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
        
        const cleanInitial = formData.firstName.trim().toLowerCase().replace(/\s+/g, '');
        const cleanLast = formData.lastName.trim().toLowerCase().replace(/\s+/g, '');
        const stdEmail = cleanLast ? `${cleanInitial}.${cleanLast}@${activeTenant.subdomain}.edu.in` : `${cleanInitial}@${activeTenant.subdomain}.edu.in`;

        toast.success(
          <div className="space-y-1.5 p-1">
            <p className="font-black text-xs text-emerald-600 uppercase tracking-wider">🎉 Enrollment Success!</p>
            <div className="text-[10px] text-text-secondary space-y-1">
              <div>
                <span className="font-bold text-text-primary block">Student Credentials:</span>
                Login ID: <span className="font-mono text-accent font-bold select-all">{stdEmail}</span><br />
                Password (Aadhaar): <span className="font-mono text-accent font-bold select-all">{rawAadhaar || 'N/A'}</span>
              </div>
              <div className="h-px bg-slate-200/60 my-1" />
              <div>
                <span className="font-bold text-text-primary block">Parent Credentials:</span>
                Login ID: <span className="font-mono text-accent font-bold select-all">{parent.email}</span><br />
                Password (Phone): <span className="font-mono text-accent font-bold select-all">{parent.phone}</span>
              </div>
              <div className="text-[8.5px] text-text-secondary mt-1 block">
                Term Tuition Fee Allocated: <span className="font-bold text-text-primary">₹{(formData.totalFee || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>,
          { duration: 15000 }
        );
      }
      
      // Reset form
      setFormData({
        firstName: '', lastName: '', admissionNo: '', rollNo: '',
        dateOfBirth: '', gender: 'MALE', bloodGroup: 'O+', address: '',
        aadhaarNo: '', category: 'GENERAL', classId: '',
        enableTransport: false, transportRouteId: '', customTransportFee: '',
        enableHostel: false, hostelBlockId: '', customHostelFee: '',
        parentFirstName: '', parentLastName: '', parentEmail: '', parentPhone: '', parentOccupation: 'Business Owner',
        totalFee: 0, paidFee: 0, discount: '', initialAttendance: '85.0%',
        avatar: '', avatarFile: null,
        isAlumni: false, isActive: true
      });
      setEditingStudentId(null);
      setShowAddForm(false);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      toast.error('Failed to submit student record.');
    }
  };

  const handleToggleStudentActiveStatus = async (student) => {
    const newStatus = student.is_active === false;
    const confirmMsg = newStatus
      ? `Are you sure you want to reactivate the portal login access for "${student.first_name} ${student.last_name}"?`
      : `Are you sure you want to block/deactivate the portal login access for "${student.first_name} ${student.last_name}"?`;

    if (!confirm(confirmMsg)) return;

    const updatedStudents = sharedStudents.map(s => 
      s.id === student.id ? { ...s, is_active: newStatus } : s
    );
    setSharedStudents(updatedStudents);

    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(student.id);
    if (supabase && isUUID) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: newStatus })
          .eq('id', student.id);
        if (error) throw error;
        toast.success(`Student portal access ${newStatus ? 'activated' : 'blocked'} successfully!`);
      } catch (err) {
        console.error('Failed to sync student block status:', err);
        toast.error('Local change saved, but failed to sync to database.');
      }
    } else {
      toast.success(`Student portal access ${newStatus ? 'activated' : 'blocked'} successfully!`);
    }
  };

  const handleToggleStudentAlumniStatus = async (student) => {
    const isAlumniVal = !student.is_alumni;
    const confirmMsg = isAlumniVal
      ? `Are you sure you want to mark "${student.first_name} ${student.last_name}" as Pass Out / Alumni? This will automatically deactivate their portal account.`
      : `Are you sure you want to re-admit "${student.first_name} ${student.last_name}" as an Active Student?`;

    if (!confirm(confirmMsg)) return;

    const updatedStudents = sharedStudents.map(s => 
      s.id === student.id ? { 
        ...s, 
        is_alumni: isAlumniVal,
        is_active: isAlumniVal ? false : s.is_active 
      } : s
    );
    setSharedStudents(updatedStudents);

    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(student.id);
    if (supabase && isUUID) {
      try {
        await supabase
          .from('students')
          .update({ is_alumni: isAlumniVal })
          .eq('id', student.id);

        if (isAlumniVal) {
          await supabase
            .from('profiles')
            .update({ is_active: false })
            .eq('id', student.id);
        }
        toast.success(`Student marked as ${isAlumniVal ? 'Pass Out' : 'Active'} successfully!`);
      } catch (err) {
        console.error('Failed to sync student alumni status:', err);
        toast.error('Local change saved, but failed to sync to database.');
      }
    } else {
      toast.success(`Student marked as ${isAlumniVal ? 'Pass Out' : 'Active'} successfully!`);
    }
  };

  const handleRegenerateRollNumbers = () => {
    if (!selectedClassFilter) return;
    const targetClass = sharedClasses.find(c => c.id === selectedClassFilter);
    const className = targetClass ? targetClass.name : 'Selected Class';

    if (!confirm(`Are you sure you want to auto-assign alphabetical roll numbers starting from 01 for all students in ${className}? This will overwrite their current roll numbers.`)) {
      return;
    }

    // Filter students in this class
    const classStudents = sharedStudents.filter(s => s.class_id === selectedClassFilter && (s.tenant_id || 'demo-tenant-1') === activeTenant.id);
    
    if (classStudents.length === 0) {
      toast.error(`No students found in ${className} to assign roll numbers.`);
      return;
    }

    // Sort them alphabetically by First Name, then Last Name
    const sorted = [...classStudents].sort((a, b) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Generate roll numbers: sequential per initial
    const initialCounts = {};
    const updatedRollNos = {};
    sorted.forEach(s => {
      const initial = (s.first_name || 'A').trim().charAt(0).toUpperCase();
      const cleanInitial = /^[A-Z]$/.test(initial) ? initial : 'A';
      if (!initialCounts[cleanInitial]) {
        initialCounts[cleanInitial] = 0;
      }
      initialCounts[cleanInitial] += 1;
      updatedRollNos[s.id] = `${cleanInitial}-${String(initialCounts[cleanInitial]).padStart(2, '0')}`;
    });

    // Update state
    const updatedStudentsList = sharedStudents.map(s => {
      if (s.class_id === selectedClassFilter && (s.tenant_id || 'demo-tenant-1') === activeTenant.id) {
        return {
          ...s,
          roll_no: updatedRollNos[s.id] || s.roll_no
        };
      }
      return s;
    });

    setSharedStudents(updatedStudentsList);
    toast.success(`Successfully auto-sequenced roll numbers alphabetically for all ${sorted.length} students in ${className}!`);
  };

  const handlePrintDirectory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocker is preventing export. Please allow pop-ups for this site.');
      return;
    }

    const className = selectedClassFilter ? getClassName(selectedClassFilter) : 'All Classes';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // Generate table rows
    const rowsHtml = filteredStudents.map((s, idx) => {
      const initial = s.first_name.trim().toLowerCase().replace(/\s+/g, '');
      const last = s.last_name.trim().toLowerCase().replace(/\s+/g, '');
      const stdEmail = last ? `${initial}.${last}@${activeTenant.subdomain}.edu.in` : `${initial}@${activeTenant.subdomain}.edu.in`;
      
      const parent = sharedParents.find(p => p.id === s.parent_id) || {};
      const parentName = parent.first_name ? `${parent.first_name} ${parent.last_name || ''}` : 'Unlinked';
      const parentEmail = parent.email || 'N/A';

      // Format Aadhaar
      const rawAadhaar = s.aadhaar_no ? s.aadhaar_no.replace(/\s+/g, '') : 'N/A';

      return `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight: bold;">${s.first_name} ${s.last_name}</td>
          <td>${getClassName(s.class_id)}</td>
          <td style="font-family: monospace;">${s.admission_no}</td>
          <td style="font-family: monospace; font-weight: bold;">${s.roll_no || 'N/A'}</td>
          <td style="font-family: monospace;">${stdEmail}</td>
          <td>${parentName}<br/><small style="color: #64748b;">${parentEmail}</small></td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${activeTenant.name} - Student Directory Ledger</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              color: #0f172a;
              padding: 40px;
              margin: 0;
              background-color: #ffffff;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 26px;
              font-weight: 900;
              margin: 0 0 4px 0;
              letter-spacing: -0.025em;
              color: ${activeTenant.brandColor || '#3b82f6'};
            }
            .header h2 {
              font-size: 11px;
              font-weight: 700;
              margin: 0 0 10px 0;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.1em;
            }
            .meta-grid {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 25px;
              font-weight: 500;
              color: #475569;
              background-color: #f8fafc;
              padding: 12px 18px;
              border-radius: 16px;
              border: 1px solid #f1f5f9;
            }
            .meta-grid div:last-child {
              text-align: right;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              text-align: left;
            }
            th {
              background-color: #f8fafc;
              border-bottom: 2px solid #e2e8f0;
              color: #334155;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.05em;
              padding: 12px 10px;
            }
            td {
              border-bottom: 1px solid #f1f5f9;
              padding: 12px 10px;
              vertical-align: middle;
            }
            tr:nth-child(even) td {
              background-color: #fafafa;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            @media print {
              body {
                padding: 10px;
              }
              .meta-grid {
                background-color: transparent !important;
                border: none;
                padding: 12px 0;
              }
              th {
                background-color: transparent !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${activeTenant.name}</h1>
            <h2>Student Directory & Access Credentials Ledger</h2>
          </div>
          <div class="meta-grid">
            <div>
              <strong>Class Filter:</strong> ${className}<br/>
              <strong>Total Records:</strong> ${filteredStudents.length} Students
            </div>
            <div>
              <strong>Academic Session:</strong> ${(activeTenant.settings?.academicYear || '2025-2026')}<br/>
              <strong>Exported On:</strong> ${dateStr}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">S.No</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Admission No</th>
                <th>Roll No</th>
                <th>Student Login ID</th>
                <th>Parent Info</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            Generated by ${activeTenant.name} ERP Administration Portal • Secure Credentials Sheet
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

    // Class Filter Selection
    if (selectedClassFilter && s.class_id !== selectedClassFilter) return false;

    // Status Filter Selection
    if (statusFilter === 'active') {
      if (s.is_active === false || s.is_alumni) return false;
    } else if (statusFilter === 'blocked') {
      if (s.is_active !== false) return false;
    } else if (statusFilter === 'alumni') {
      if (!s.is_alumni) return false;
    }

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

    setIsRollNoManuallyEdited(false);
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
      discount: '',
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

    const batchRollSequence = {};

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

      // Calculate next sequential alphabetical roll number
      const initial = firstName.trim().charAt(0).toUpperCase();
      let rollNo = 'A-01'; // Fallback
      if (/^[A-Z]$/.test(initial)) {
        const classKey = `${resolvedClass.id}_${initial}`;
        if (batchRollSequence[classKey] === undefined) {
          // Find max existing sequence in database
          const classStudents = sharedStudents.filter(s => s.class_id === resolvedClass.id && (s.tenant_id || 'demo-tenant-1') === activeTenant.id);
          const matchRegex = new RegExp(`^${initial}-(\\d+)$`);
          let maxSeq = 0;
          classStudents.forEach(s => {
            if (s.roll_no) {
              const match = s.roll_no.match(matchRegex);
              if (match) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq) maxSeq = seq;
              }
            }
          });
          batchRollSequence[classKey] = maxSeq;
        }
        batchRollSequence[classKey] += 1;
        rollNo = `${initial}-${String(batchRollSequence[classKey]).padStart(2, '0')}`;
      }

      result.push({
        student: {
          id: `stud-bulk-${idx}-${Date.now()}`,
          first_name: firstName,
          last_name: lastName || '',
          admission_no: admNo,
          roll_no: rollNo,
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
              onClick={handlePrintDirectory}
              className="px-5 py-3 bg-bg-sidebar hover:bg-slate-50 border border-border text-text-primary text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              title="Print active student list or save as PDF"
            >
              <FileText size={14} className="text-accent" />
              <span>Export PDF / Print</span>
            </button>
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Roll Number</label>
                    {!editingStudentId && (
                      <span className="text-[8px] text-accent font-black uppercase tracking-wider bg-accent/5 px-2 py-0.5 rounded border border-accent/10">Auto-suggesting</span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder="e.g. A-01"
                    value={formData.rollNo}
                    onChange={(e) => {
                      setIsRollNoManuallyEdited(true);
                      setFormData({...formData, rollNo: e.target.value});
                    }}
                    className="w-full text-xs font-mono"
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Fee Discount (Optional) (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 1500"
                    value={formData.discount}
                    onChange={(e) => setFormData({...formData, discount: e.target.value})}
                    className="w-full text-xs font-mono text-amber-600 font-bold"
                    max={Math.max(0, (formData.totalFee || 0) - Number(formData.paidFee || 0))}
                    min={0}
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
                  ₹{((formData.totalFee || 0) - (Number(formData.paidFee) || 0) - (Number(formData.discount) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Part 4: Account & Enrolment Status (Only shown when editing) */}
            {editingStudentId && (
              <div className="space-y-4 pt-4 border-t border-border animate-in fade-in duration-200">
                <h4 className="text-xs font-bold text-accent uppercase tracking-wider">4. Account & Enrolment Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Academic Status</label>
                    <select 
                      value={formData.isAlumni ? 'PASS_OUT' : 'ACTIVE'}
                      onChange={(e) => {
                        const isAlumniVal = e.target.value === 'PASS_OUT';
                        setFormData({
                          ...formData, 
                          isAlumni: isAlumniVal,
                          isActive: isAlumniVal ? false : formData.isActive
                        });
                      }}
                      className="w-full text-xs bg-bg-sidebar text-text-primary py-2 px-3 rounded-xl border border-border"
                    >
                      <option value="ACTIVE">Active Student</option>
                      <option value="PASS_OUT">Pass Out / Alumni (Deactivates Portal)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Portal Account Login</label>
                    <select 
                      value={formData.isActive ? 'ACTIVE' : 'BLOCKED'}
                      onChange={(e) => setFormData({...formData, isActive: e.target.value === 'ACTIVE'})}
                      className="w-full text-xs bg-bg-sidebar text-text-primary py-2 px-3 rounded-xl border border-border"
                    >
                      <option value="ACTIVE">Active (Allowed to Log In)</option>
                      <option value="BLOCKED">Blocked / Deactivated</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-slate-100/50 border border-border rounded-2xl">
              <div className="flex items-center gap-4">
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
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                    {selectedStudentForDossier.first_name} {selectedStudentForDossier.last_name}
                    {selectedStudentForDossier.is_alumni && (
                      <span className="text-[7px] font-black uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                        Pass Out
                      </span>
                    )}
                    {selectedStudentForDossier.is_active === false && (
                      <span className="text-[7px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded">
                        Blocked
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-text-secondary uppercase">Admission No: {selectedStudentForDossier.admission_no} • Class: {getClassName(selectedStudentForDossier.class_id)}</p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setSelectedStudentForPromotion(selectedStudentForDossier);
                    setPromotionClassId(getNextLogicalClassId(selectedStudentForDossier.class_id));
                    setShowPromoteModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all shadow-sm shrink-0"
                  title="Promote Student"
                >
                  <ArrowUpCircle size={14} />
                  <span>Promote Student</span>
                </button>
              )}
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

      {/* BULK PROMOTION MODAL */}
      <Modal
        open={showBulkPromoteModal}
        onClose={() => {
          setShowBulkPromoteModal(false);
        }}
        title="Bulk Promote Students to Next Grade"
        icon={<ArrowUpCircle size={18} />}
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-slate-100/50 border border-border rounded-2xl space-y-2">
            <span className="text-[10px] font-black text-accent uppercase tracking-widest block">Selected Candidates ({selectedStudentIds.length})</span>
            <div className="max-h-24 overflow-y-auto text-xs text-text-primary font-medium divide-y divide-border/40">
              {selectedStudentIds.map(id => {
                const s = sharedStudents.find(stud => stud.id === id);
                return s ? (
                  <div key={id} className="py-1 flex justify-between items-center">
                    <span>{s.first_name} {s.last_name}</span>
                    <span className="text-[10px] text-text-secondary">{getClassName(s.class_id)}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Target Promotion Grade *</label>
              <select
                value={bulkPromotionTargetClassId}
                onChange={(e) => setBulkPromotionTargetClassId(e.target.value)}
                className="w-full bg-slate-100/50 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-accent/40 text-xs text-text-primary"
              >
                <option value="">Select Promotion Class</option>
                {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <input
                type="checkbox"
                id="bulkResetFees"
                checked={bulkPromotionResetFees}
                onChange={(e) => setBulkPromotionResetFees(e.target.checked)}
                className="rounded border-gray-300 text-accent focus:ring-accent w-4 h-4 cursor-pointer"
              />
              <label htmlFor="bulkResetFees" className="text-xs text-text-primary leading-relaxed cursor-pointer select-none">
                <span className="font-black block text-amber-800 dark:text-amber-400">Reset Billing structures for new class</span>
                Automatically clears active term fees ledger, sets outstanding balance to the new class base fee, and keeps active transport/hostel subscriptions.
              </label>
            </div>

            <div className="p-4 bg-slate-100/50 border border-border rounded-2xl text-[11px] text-text-secondary leading-relaxed">
              <span className="font-bold text-text-primary block mb-1">⚠️ Warning:</span>
              Confirming this bulk promotion will archive the current year files (grades, fee logs, attendance history, and remarks) for all {selectedStudentIds.length} students under academic year <span className="font-bold text-text-primary">{(activeTenant.settings?.academicYear || '2025-2026')}</span>, clear active terms marks/remarks, and increment their enrolled class. This action cannot be undone.
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setShowBulkPromoteModal(false);
              }}
              className="px-4 py-2 border border-border hover:bg-slate-50 text-text-secondary hover:text-text-primary font-black text-xs uppercase tracking-wider rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!bulkPromotionTargetClassId}
              onClick={handleBulkPromoteStudents}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
            >
              Confirm Bulk Promotion
            </button>
          </div>
        </div>
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
        
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Bar */}
          <div className="flex-1 max-w-md relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search by student name, Aadhaar, class, parent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
            />
          </div>

          {/* Class Filter Dropdown & Auto-Sequence Roll Numbers */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100/50 border border-border rounded-2xl px-4 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary whitespace-nowrap">Filter Class:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => {
                  setSelectedClassFilter(e.target.value);
                  setSelectedStudentIds([]); // Reset bulk selections on class change
                }}
                className="bg-transparent text-xs text-text-primary outline-none py-1.5 cursor-pointer font-bold font-outfit"
              >
                <option value="" className="bg-bg-sidebar">All Classes</option>
                {sharedClasses.filter(c => c.tenant_id === activeTenant.id).map(cls => (
                  <option key={cls.id} value={cls.id} className="bg-bg-sidebar">{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-100/50 border border-border rounded-2xl px-4 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary whitespace-nowrap">Account Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSelectedStudentIds([]);
                }}
                className="bg-transparent text-xs text-text-primary outline-none py-1.5 cursor-pointer font-bold font-outfit"
              >
                <option value="all" className="bg-bg-sidebar">All Accounts</option>
                <option value="active" className="bg-bg-sidebar">Active (Studying)</option>
                <option value="blocked" className="bg-bg-sidebar">Blocked Portal</option>
                <option value="alumni" className="bg-bg-sidebar">Pass Out (Alumni)</option>
              </select>
            </div>

            {isAdmin && selectedClassFilter && (
              <button
                type="button"
                onClick={handleRegenerateRollNumbers}
                className="px-4 py-2 bg-accent/10 border border-accent/30 hover:bg-accent hover:text-white text-accent text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                title="Sort all students in this class alphabetically and assign sequential roll numbers (e.g. A-01, A-02, B-01...)"
              >
                <Sparkles size={12} />
                <span>Auto-Sequence Roll Nos</span>
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {isAdmin && selectedStudentIds.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black">
                {selectedStudentIds.length}
              </span>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                students selected for bulk academic promotion
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentIds([]);
                }}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => {
                  const firstStudent = sharedStudents.find(s => s.id === selectedStudentIds[0]);
                  if (firstStudent) {
                    setBulkPromotionTargetClassId(getNextLogicalClassId(firstStudent.class_id));
                  }
                  setShowBulkPromoteModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/15 active:scale-95 transition-all"
              >
                <ArrowUpCircle size={14} />
                <span>Bulk Promote</span>
              </button>
              <button
                type="button"
                onClick={handleBulkPassOutStudents}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/15 active:scale-95 transition-all"
              >
                <GraduationCap size={14} />
                <span>Bulk Pass Out</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                {isAdmin && (
                  <th className="pb-3 pl-2 w-10">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(filteredStudents.map(s => s.id));
                        } else {
                          setSelectedStudentIds([]);
                        }
                      }}
                      className="rounded border-border bg-bg-sidebar text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                )}
                <th className="pb-3 pl-2">Student Name</th>
                <th className="pb-3">Class</th>
                <th className="pb-3">Admission No</th>
                <th className="pb-3">Roll No</th>
                <th className="pb-3">Aadhaar Card</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Parent / Guardian</th>
                <th className="pb-3">Parent Contact info</th>
                <th className="pb-3">Portal Access</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                  {isAdmin && (
                    <td className="py-4 pl-2 w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds(prev => [...prev, student.id]);
                          } else {
                            setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                        className="rounded border-border bg-bg-sidebar text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                  )}
                  <td 
                    onClick={() => setSelectedStudentForDossier(student)}
                    className="py-4 pl-2 font-bold text-text-primary flex items-center gap-2 cursor-pointer hover:text-accent transition-colors"
                  >
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
                      <span className="block flex items-center gap-1.5">
                        <span>{student.first_name} {student.last_name}</span>
                        {student.is_alumni && (
                          <span className="text-[7px] font-black uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                            Pass Out
                          </span>
                        )}
                        {student.is_active === false && (
                          <span className="text-[7px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded">
                            Blocked
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-text-secondary block font-semibold font-mono select-all mt-0.5" title="Student Login ID">
                        {(() => {
                          const initial = student.first_name.trim().toLowerCase().replace(/\s+/g, '');
                          const last = student.last_name.trim().toLowerCase().replace(/\s+/g, '');
                          return last ? `${initial}.${last}@${activeTenant.subdomain}.edu.in` : `${initial}@${activeTenant.subdomain}.edu.in`;
                        })()}
                      </span>
                      <span className="text-[8px] text-text-secondary/80 block font-normal">{student.address || 'Address unlisted'}</span>
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
                  <td className="py-4">
                    <div className="flex items-center gap-1.5">
                      {student.is_alumni ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded">
                            Pass Out
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleStudentAlumniStatus(student)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 text-[8px] font-black rounded border border-slate-200 transition-all active:scale-95"
                              title="Restore to Active Student"
                            >
                              Re-admit
                            </button>
                          )}
                        </div>
                      ) : student.is_active === false ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded">
                            Blocked
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleStudentActiveStatus(student)}
                              className="px-1.5 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[8px] font-black rounded transition-all active:scale-95 shadow-xs"
                              title="Activate Portal Access"
                            >
                              Unblock
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded">
                            Active
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleStudentActiveStatus(student)}
                              className="px-1.5 py-0.5 bg-red-500 hover:bg-red-600 text-white text-[8px] font-black rounded transition-all active:scale-95 shadow-xs"
                              title="Deactivate Portal Access"
                            >
                              Block
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleStudentAlumniStatus(student)}
                              className="px-1.5 py-0.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[8px] font-black rounded transition-all active:scale-95 shadow-xs"
                              title="Graduate Student"
                            >
                              Graduate
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all shadow-xs"
                            title="Promote Student"
                          >
                            <ArrowUpCircle size={12} />
                            <span>Promote</span>
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
