'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export default function Providers({ children }) {
  const router = useRouter();
  const [supabase] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
    )
  );

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Theme support
  const [theme, setTheme] = useState('light');

  // Dev-mode state for switching roles and tenants instantly to preview dashboards
  const [activeRole, setActiveRole] = useState('SCHOOL_ADMIN');
  const [activeTenant, setActiveTenant] = useState({
    id: 'demo-tenant-1',
    name: 'Indian Institute of Technology (IIT) Delhi',
    subdomain: 'iitd',
    address: 'Hauz Khas, New Delhi – 110016, Delhi, India',
    phone: '+91-11-2659-1777',
    email: 'admin@iitd.edu.in',
    affiliation: 'UGC / AICTE Approved • NAAC A++ Accredited',
    estYear: '1961',
    settings: { 
      currency: '₹',
      board: 'UGC',
      academicYear: '2026-2027',
      bank: {
        bankName: 'State Bank of India',
        accountName: 'IIT Delhi Operations',
        accountNo: '10293847561',
        ifscCode: 'SBIN0000214',
        upiId: 'iitd@sbi',
        qrCode: ''
      }
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('campus-erp-theme') || localStorage.getItem('nexus-theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    }
  }, []);

  // Live GPS simulation for enabled transit buses
  useEffect(() => {
    const timer = setInterval(() => {
      setSharedTransportRoutes(prevRoutes => 
        prevRoutes.map(route => {
          if (!route.gpsEnabled) return route;
          if (route.trackingMethod === 'MOBILE' && route.driverBroadcasting) return route;
          
          // Randomly shift coordinates slightly to simulate transit movement
          const latDelta = (Math.random() - 0.48) * 0.0004;
          const lngDelta = (Math.random() - 0.48) * 0.0004;
          
          let nextEta = route.etaMinutes;
          if (Math.random() > 0.7) {
            nextEta = route.etaMinutes > 1 ? route.etaMinutes - 1 : 15;
          }
          
          return {
            ...route,
            latitude: Number((route.latitude + latDelta).toFixed(6)),
            longitude: Number((route.longitude + lngDelta).toFixed(6)),
            etaMinutes: nextEta,
            lastUpdated: new Date().toISOString()
          };
        })
      );
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);


  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('campus-erp-theme', nextTheme);
      document.documentElement.className = nextTheme;
    }
    toast.success(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} Mode`);
  };

  const [activeUser, setActiveUser] = useState({
    name: 'Smt. Anjali Sharma (School Principal)',
    email: 'anjali.sharma@iitd.edu.in',
    role: 'SCHOOL_ADMIN'
  });

  const [availableTenants, setAvailableTenants] = useState([
    { 
      id: 'demo-tenant-1', 
      name: 'Indian Institute of Technology (IIT) Delhi', 
      subdomain: 'iitd', 
      logo: '', 
      address: 'Hauz Khas, New Delhi – 110016, Delhi, India', 
      phone: '+91-11-2659-1777', 
      email: 'admin@iitd.edu.in', 
      affiliation: 'UGC / AICTE Approved • NAAC A++ Accredited', 
      estYear: '1961',
      settings: {
        board: 'UGC',
        academicYear: '2026-2027',
        bank: {
          bankName: 'State Bank of India',
          accountName: 'IIT Delhi Operations',
          accountNo: '10293847561',
          ifscCode: 'SBIN0000214',
          upiId: 'iitd@sbi',
          qrCode: ''
        }
      }
    },
    { 
      id: 'demo-tenant-2', 
      name: 'Delhi Public School (DPS) RK Puram', 
      subdomain: 'dpsrkp', 
      logo: '', 
      address: 'Sector 4, R.K. Puram, New Delhi – 110022', 
      phone: '+91-11-2617-6940', 
      email: 'admin@dpsrkp.edu.in', 
      affiliation: 'CBSE Affiliated • School No. 1620009', 
      estYear: '1972',
      settings: {
        board: 'CBSE',
        academicYear: '2026-2027',
        bank: {
          bankName: 'HDFC Bank',
          accountName: 'DPS RK Puram Accounts',
          accountNo: '998877665544',
          ifscCode: 'HDFC0000104',
          upiId: 'dpsrkp@hdfc',
          qrCode: ''
        }
      }
    },
    { 
      id: 'demo-tenant-3', 
      name: "St. Stephen's College", 
      subdomain: 'ststephens', 
      logo: '', 
      address: 'University Enclave, Delhi – 110007', 
      phone: '+91-11-2766-7271', 
      email: 'admin@ststephens.edu.in', 
      affiliation: 'University of Delhi • NAAC A Accredited', 
      estYear: '1881',
      settings: {
        board: 'STATE',
        academicYear: '2026-2027',
        bank: {
          bankName: 'ICICI Bank',
          accountName: 'St Stephens College Fees',
          accountNo: '556677889900',
          ifscCode: 'ICIC0000011',
          upiId: 'stephens@icici',
          qrCode: ''
        }
      }
    }
  ]);

  // Shared state for multi-role dynamic simulation
  const [sharedStudents, setSharedStudents] = useState([
    { id: 'stud-1', first_name: 'Aarav', last_name: 'Patel', admission_no: 'ADM2026/049', roll_no: '24', date_of_birth: '2010-04-12', gender: 'MALE', category: 'GENERAL', aadhaar_no: '4839 2840 9283', address: 'Saket, New Delhi', parent_id: 'parent-1', class_id: 'class-1', tenant_id: 'demo-tenant-1' },
    { id: 'stud-2', first_name: 'Diya', last_name: 'Sharma', admission_no: 'ADM2026/102', roll_no: '12', date_of_birth: '2011-08-19', gender: 'FEMALE', category: 'OBC', aadhaar_no: '9283 4839 1049', address: 'Indiranagar, Bangalore', parent_id: 'parent-2', class_id: 'class-2', tenant_id: 'demo-tenant-1' },
    { id: 'stud-3', first_name: 'Kabir', last_name: 'Verma', admission_no: 'ADM2026/182', roll_no: '08', date_of_birth: '2010-12-05', gender: 'MALE', category: 'SC', aadhaar_no: '8839 2039 1204', address: 'Salt Lake, Kolkata', parent_id: 'parent-3', class_id: 'class-3', tenant_id: 'demo-tenant-1' }
  ]);

  const [sharedParents, setSharedParents] = useState([
    { id: 'parent-1', first_name: 'Vikram', last_name: 'Patel', email: 'vikram.patel@gmail.com', phone: '+91 98765 43210', occupation: 'Software Architect', tenant_id: 'demo-tenant-1' },
    { id: 'parent-2', first_name: 'Suresh', last_name: 'Sharma', email: 'suresh.sharma@yahoo.com', phone: '+91 87654 32109', occupation: 'Government Employee', tenant_id: 'demo-tenant-1' },
    { id: 'parent-3', first_name: 'Rajesh', last_name: 'Verma', email: 'rajesh.verma@outlook.com', phone: '+91 76543 21098', occupation: 'Business Owner', tenant_id: 'demo-tenant-1' }
  ]);

  const [sharedNotices, setSharedNotices] = useState([
    { id: 1, title: 'Summer Vacation Circular', date: 'May 22, 2026', author: 'Principal Office', body: 'Campus will remain closed from June 1st to July 5th for summer vacations. Online classes will resume thereafter.', tenant_id: 'demo-tenant-1' },
    { id: 2, title: 'IIT JEE Prep Classes', date: 'May 20, 2026', author: 'Academic Dean', body: 'Special JEE/NEET prep modules for Class XI & XII starting next Monday. Registration is mandatory.', tenant_id: 'demo-tenant-1' },
    { id: 3, title: 'Sports Day Registration', date: 'May 18, 2026', author: 'PE Dept', body: 'Annual Sports Meet registrations close tomorrow. Contact physical education heads for trials.', tenant_id: 'demo-tenant-1' },
    // Tenant 2 (DPS) notices
    { id: 4, title: 'Annual Cultural Festival (DPS)', date: 'May 24, 2026', author: 'Principal Office', body: 'DPS RK Puram is hosting the inter-school cultural meet "AURA 2026" next Saturday.', tenant_id: 'demo-tenant-2' },
    // Tenant 3 (St. Stephen's) notices
    { id: 5, title: 'St. Stephen Seminar Schedule', date: 'May 23, 2026', author: 'Dean of Students', body: 'Mandatory history and humanities seminar in the college seminar hall this Wednesday.', tenant_id: 'demo-tenant-3' }
  ]);

  const [sharedAcademicRecords, setSharedAcademicRecords] = useState({
    'stud-1': [
      { subject: 'Physics Core theory', marks: '92 / 100', grade: 'A1', desc: 'Class Avg: 78' },
      { subject: 'Advanced Calculus math', marks: '88 / 100', grade: 'A2', desc: 'Class Avg: 72' },
      { subject: 'Organic Chemistry practical', marks: '45 / 50', grade: 'A1', desc: 'Class Avg: 41' }
    ],
    'stud-2': [
      { subject: 'Physics Core theory', marks: '78 / 100', grade: 'B1', desc: 'Class Avg: 78' },
      { subject: 'Advanced Calculus math', marks: '95 / 100', grade: 'A1', desc: 'Class Avg: 72' },
      { subject: 'Organic Chemistry practical', marks: '40 / 50', grade: 'A2', desc: 'Class Avg: 41' }
    ],
    'stud-3': [
      { subject: 'Physics Core theory', marks: '85 / 100', grade: 'A2', desc: 'Class Avg: 78' },
      { subject: 'Advanced Calculus math', marks: '65 / 100', grade: 'C1', desc: 'Class Avg: 72' },
      { subject: 'Organic Chemistry practical', marks: '48 / 50', grade: 'A1', desc: 'Class Avg: 41' }
    ]
  });

  // Class-wise fee structures: each class has multiple fee components
  const [sharedFeeStructures, setSharedFeeStructures] = useState([
    { id: 'fs-1', class_id: 'class-1', name: 'Base Tuition Fee', code: 'TUIT', amount: 35000, period: 'Per Term', type: 'Academic', tenant_id: 'demo-tenant-1' },
    { id: 'fs-2', class_id: 'class-1', name: 'Science Laboratory Fee', code: 'LAB', amount: 5000, period: 'Per Term', type: 'Resource', tenant_id: 'demo-tenant-1' },
    { id: 'fs-3', class_id: 'class-1', name: 'Board Examination Fee', code: 'EXAM', amount: 5000, period: 'Per Annum', type: 'Registration', tenant_id: 'demo-tenant-1' },
    { id: 'fs-4', class_id: 'class-2', name: 'Base Tuition Fee', code: 'TUIT', amount: 30000, period: 'Per Term', type: 'Academic', tenant_id: 'demo-tenant-1' },
    { id: 'fs-5', class_id: 'class-2', name: 'Commerce Lab Fee', code: 'LAB', amount: 3000, period: 'Per Term', type: 'Resource', tenant_id: 'demo-tenant-1' },
    { id: 'fs-6', class_id: 'class-2', name: 'Board Examination Fee', code: 'EXAM', amount: 5000, period: 'Per Annum', type: 'Registration', tenant_id: 'demo-tenant-1' },
    { id: 'fs-7', class_id: 'class-3', name: 'Base Tuition Fee', code: 'TUIT', amount: 32000, period: 'Per Term', type: 'Academic', tenant_id: 'demo-tenant-1' },
    { id: 'fs-8', class_id: 'class-3', name: 'Science Laboratory Fee', code: 'LAB', amount: 5000, period: 'Per Term', type: 'Resource', tenant_id: 'demo-tenant-1' },
    { id: 'fs-9', class_id: 'class-3', name: 'Sports & Cultural Fee', code: 'CULT', amount: 5000, period: 'Per Term', type: 'Extra-Curricular', tenant_id: 'demo-tenant-1' }
  ]);

  // Per-student add-ons tracking (transport/hostel)
  const [sharedStudentFeeAddons, setSharedStudentFeeAddons] = useState({
    'stud-1': { transport: { enabled: false, routeId: '', fee: 0 }, hostel: { enabled: false, blockId: '', fee: 0 } },
    'stud-2': { transport: { enabled: true, routeId: 'route-1', fee: 6000 }, hostel: { enabled: false, blockId: '', fee: 0 } },
    'stud-3': { transport: { enabled: false, routeId: '', fee: 0 }, hostel: { enabled: true, blockId: 'block-1', fee: 12000 } }
  });

  const [sharedFeeRecords, setSharedFeeRecords] = useState({
    'stud-1': { total: 45000, paid: 45000, remaining: 0, status: 'PAID', history: [{ id: 'rcpt-101', date: '2026-05-15', amount: 45000, method: 'Razorpay UPI' }] },
    'stud-2': { total: 44000, paid: 5000, remaining: 39000, status: 'PARTIAL', history: [{ id: 'rcpt-102', date: '2026-05-10', amount: 5000, method: 'Net Banking' }] },
    'stud-3': { total: 54000, paid: 0, remaining: 54000, status: 'UNPAID', history: [] }
  });

  const [sharedAttendanceRecords, setSharedAttendanceRecords] = useState({
    'stud-1': '88.5%',
    'stud-2': '92.0%',
    'stud-3': '75.2%'
  });

  const [sharedAttendanceLogs, setSharedAttendanceLogs] = useState(() => {
    const logs = {};
    const dates = ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'];
    const students = ['stud-1', 'stud-2', 'stud-3'];
    const staff = ['staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5'];
    
    dates.forEach((date, dIdx) => {
      // Students
      students.forEach((studentId) => {
        const subjects = studentId === 'stud-2' 
          ? ['AC-121', 'BS-122'] 
          : ['PH-121', 'MA-122', 'CY-123'];
          
        subjects.forEach(subj => {
          let status = 'PRESENT';
          if (studentId === 'stud-2' && dIdx === 2) {
            status = 'ABSENT';
          } else if (studentId === 'stud-3') {
            if (dIdx === 1) status = 'ABSENT';
            else if (dIdx === 3) status = 'LATE';
          }
          logs[`${date}_${subj}_${studentId}`] = status;
          logs[`${date}_ALL_${studentId}`] = status;
        });
      });
      
      // Staff
      staff.forEach((staffId) => {
        let status = 'PRESENT';
        if (staffId === 'staff-3' && dIdx === 2) {
          status = 'ABSENT';
        }
        logs[`${date}_${staffId}`] = status;
      });
    });
    
    return logs;
  });

  const [sharedRemarks, setSharedRemarks] = useState({
    'stud-1': [
      { teacher: 'Prof. Rajesh Iyer (Physics)', remark: 'Excellent understanding of concepts. Active participant in lab sessions.', date: 'May 15, 2026' },
      { teacher: 'Dr. Ramesh Kumar (Chemistry)', remark: 'Good analytical skills but needs to submit practical records on time.', date: 'May 10, 2026' }
    ],
    'stud-2': [
      { teacher: 'Prof. Rajesh Iyer (Physics)', remark: 'Attentive but needs practice in electrodynamics problems.', date: 'May 14, 2026' }
    ],
    'stud-3': [
      { teacher: 'Dr. Ramesh Kumar (Chemistry)', remark: 'Outstanding lab work. Very dedicated to experiments.', date: 'May 16, 2026' }
    ]
  });

  const [sharedStudentHistory, setSharedStudentHistory] = useState({
    'stud-1': [
      {
        academic_year: '2024-2025',
        class_id: 'class-3',
        class_name: 'Class XI - Science (CBSE)',
        attendance: '91.4%',
        fees: {
          total: 42000,
          paid: 42000,
          remaining: 0,
          status: 'PAID',
          history: [
            { id: 'rcpt-prev-101', date: '2025-05-10', amount: 42000, method: 'Net Banking' }
          ]
        },
        academic_records: [
          { subject: 'Physics Core Theory', marks: '88 / 100', grade: 'A2', desc: 'Class Avg: 75' },
          { subject: 'Advanced Calculus Math', marks: '90 / 100', grade: 'A1', desc: 'Class Avg: 72' },
          { subject: 'Organic Chemistry Practical', marks: '44 / 50', grade: 'A1', desc: 'Class Avg: 40' }
        ],
        remarks: [
          { teacher: 'Prof. Rajesh Iyer (Physics)', remark: 'Shows keen interest in experimental concepts. Consistent performer.', date: 'May 10, 2025' }
        ]
      },
      {
        academic_year: '2023-2024',
        class_id: 'class-5',
        class_name: 'Class X - General',
        attendance: '88.7%',
        fees: {
          total: 30000,
          paid: 30000,
          remaining: 0,
          status: 'PAID',
          history: [
            { id: 'rcpt-prev-050', date: '2024-03-15', amount: 30000, method: 'UPI' }
          ]
        },
        academic_records: [
          { subject: 'Mathematics', marks: '92 / 100', grade: 'A1', desc: 'Board Exam' },
          { subject: 'Science', marks: '85 / 100', grade: 'A2', desc: 'Board Exam' },
          { subject: 'English', marks: '78 / 100', grade: 'B1', desc: 'Board Exam' },
          { subject: 'Social Science', marks: '81 / 100', grade: 'A2', desc: 'Board Exam' },
          { subject: 'Hindi', marks: '75 / 100', grade: 'B1', desc: 'Board Exam' }
        ],
        remarks: [
          { teacher: 'Mrs. Sunita Mehta (Class Teacher)', remark: 'Excellent CBSE board result. Recommended for Science stream.', date: 'Apr 2, 2024' }
        ]
      }
    ],
    'stud-2': [
      {
        academic_year: '2024-2025',
        class_id: 'class-4',
        class_name: 'Class XI - Commerce (CBSE)',
        attendance: '94.2%',
        fees: {
          total: 36000,
          paid: 36000,
          remaining: 0,
          status: 'PAID',
          history: [
            { id: 'rcpt-prev-201', date: '2025-04-22', amount: 36000, method: 'UPI' }
          ]
        },
        academic_records: [
          { subject: 'Accountancy', marks: '82 / 100', grade: 'A2', desc: 'Class Avg: 68' },
          { subject: 'Business Studies', marks: '88 / 100', grade: 'A2', desc: 'Class Avg: 71' },
          { subject: 'Economics', marks: '79 / 100', grade: 'B1', desc: 'Class Avg: 65' },
          { subject: 'English Core', marks: '85 / 100', grade: 'A2', desc: 'Class Avg: 73' }
        ],
        remarks: [
          { teacher: 'Mr. Vikram Das (Accounts)', remark: 'Strong analytical skills. Active in class discussions and debate competitions.', date: 'May 5, 2025' }
        ]
      }
    ],
    'stud-3': [
      {
        academic_year: '2024-2025',
        class_id: 'class-5',
        class_name: 'Class X - General',
        attendance: '87.5%',
        fees: {
          total: 30000,
          paid: 25000,
          remaining: 5000,
          status: 'PARTIAL',
          history: [
            { id: 'rcpt-prev-301', date: '2025-06-01', amount: 25000, method: 'Cash' }
          ]
        },
        academic_records: [
          { subject: 'Mathematics', marks: '76 / 100', grade: 'B1', desc: 'Class Avg: 65' },
          { subject: 'Science', marks: '82 / 100', grade: 'A2', desc: 'Class Avg: 70' },
          { subject: 'English', marks: '71 / 100', grade: 'B1', desc: 'Class Avg: 68' },
          { subject: 'Social Science', marks: '69 / 100', grade: 'B2', desc: 'Class Avg: 62' }
        ],
        remarks: [
          { teacher: 'Ms. Priya Kapoor (Science)', remark: 'Good progress in practicals. Needs to focus more on theory subjects.', date: 'May 18, 2025' }
        ]
      }
    ]
  });

  const [activeParentId, setActiveParentId] = useState('parent-1');

  // Shared fee structure definitions for auto-allocation
  const [sharedClasses, setSharedClasses] = useState([
    { id: 'class-1', name: 'Class XII - Science (CBSE)', base_fee: 45000, class_teacher_id: 'staff-1', tenant_id: 'demo-tenant-1' },
    { id: 'class-2', name: 'Class XII - Commerce (CBSE)', base_fee: 38000, class_teacher_id: 'staff-2', tenant_id: 'demo-tenant-1' },
    { id: 'class-3', name: 'Class XI - Science (CBSE)', base_fee: 42000, class_teacher_id: 'staff-3', tenant_id: 'demo-tenant-1' },
    { id: 'class-4', name: 'Class XI - Commerce (CBSE)', base_fee: 36000, class_teacher_id: '', tenant_id: 'demo-tenant-1' },
    { id: 'class-5', name: 'Class X - General', base_fee: 30000, class_teacher_id: '', tenant_id: 'demo-tenant-1' },
    { id: 'class-6', name: 'Class IX - General', base_fee: 28000, class_teacher_id: '', tenant_id: 'demo-tenant-1' },
    // Demo Tenant 2 (DPS) classes
    { id: 'class-7', name: 'Class XII - Science A (DPS)', base_fee: 55000, class_teacher_id: '', tenant_id: 'demo-tenant-2' },
    { id: 'class-8', name: 'Class XII - Commerce A (DPS)', base_fee: 48000, class_teacher_id: '', tenant_id: 'demo-tenant-2' },
    // Demo Tenant 3 (St. Stephen's) classes
    { id: 'class-9', name: 'B.A. English Honours (Stephens)', base_fee: 65000, class_teacher_id: '', tenant_id: 'demo-tenant-3' },
    { id: 'class-10', name: 'B.Sc. Physics Honours (Stephens)', base_fee: 72000, class_teacher_id: '', tenant_id: 'demo-tenant-3' }
  ]);

  const [sharedTransportRoutes, setSharedTransportRoutes] = useState([
    { 
      id: 'route-1', 
      name: 'Route A - Saket / South Delhi Corridor', 
      fee: 6000, 
      bus: 'DL 1PD 8492', 
      driver: 'Harpreet Singh', 
      phone: '+91 98765 43210', 
      tenant_id: 'demo-tenant-1',
      gpsEnabled: true,
      trackingMethod: 'HARDWARE',
      gpsDeviceID: 'GPS-DL1PD8492-9620',
      gpsModel: 'Teltonika FMB920',
      gpsSimNo: '+91 98888 77777',
      latitude: 28.5276,
      longitude: 77.2100,
      etaMinutes: 12,
      lastUpdated: new Date().toISOString()
    },
    { 
      id: 'route-2', 
      name: 'Route B - Dwarka Expressway', 
      fee: 8000, 
      bus: 'DL 1PA 7730', 
      driver: 'Rajinder Yadav', 
      phone: '+91 87654 32109', 
      tenant_id: 'demo-tenant-1',
      gpsEnabled: false
    },
    { 
      id: 'route-3', 
      name: 'Route C - Noida / NCR Sector 62', 
      fee: 9000, 
      bus: 'UP 14 AT 2233', 
      driver: 'Anil Kumar', 
      phone: '+91 76543 21098', 
      tenant_id: 'demo-tenant-1',
      gpsEnabled: false
    }
  ]);

  const [sharedHostelBlocks, setSharedHostelBlocks] = useState([
    { id: 'block-1', name: 'Tagore Hostel - Block A (Double Sharing)', fee: 12000, tenant_id: 'demo-tenant-1' },
    { id: 'block-2', name: 'Nehru Girls Hostel - Block B (Triple Sharing)', fee: 10000, tenant_id: 'demo-tenant-1' },
    { id: 'block-3', name: 'Sarojini Girls Hostel - Block C (Single Room)', fee: 18000, tenant_id: 'demo-tenant-1' }
  ]);

  // Shared Roster for employees
  const [sharedStaff, setSharedStaff] = useState([
    { id: 'staff-1', first_name: 'Rajesh', last_name: 'Iyer', employee_id: 'EMP-PHY-01', designation: 'HOD Physics', role: 'TEACHER', basic: 75000, allowances: 0, deductions: 0, pan_no: 'ABCPI1234F', phone: '+91 98765 43210', email: 'rajesh.iyer@iitd.edu.in', tenant_id: 'demo-tenant-1', bank_name: 'State Bank of India', account_no: '998877665544', ifsc_code: 'SBIN0000214' },
    { id: 'staff-2', first_name: 'Anjali', last_name: 'Sharma', employee_id: 'EMP-ADM-02', designation: 'Dean Academics', role: 'SCHOOL_ADMIN', basic: 90000, allowances: 0, deductions: 0, pan_no: 'KLMPR9876Q', phone: '+91 87654 32109', email: 'anjali.sharma@iitd.edu.in', tenant_id: 'demo-tenant-1', bank_name: 'HDFC Bank', account_no: '112233445566', ifsc_code: 'HDFC0000104' },
    { id: 'staff-3', first_name: 'Deepa', last_name: 'Roy', employee_id: 'EMP-LIB-05', designation: 'Chief Librarian', role: 'LIBRARIAN', basic: 50000, allowances: 0, deductions: 0, pan_no: 'BGHPR5432J', phone: '+91 76543 21098', email: 'deepa.roy@dpsrkp.edu.in', tenant_id: 'demo-tenant-2', bank_name: 'ICICI Bank', account_no: '556677889900', ifsc_code: 'ICIC0000011' },
    { id: 'staff-4', first_name: 'Karan', last_name: 'Johar', employee_id: 'EMP-ADM-03', designation: 'Bursar', role: 'ACCOUNTANT', basic: 65000, allowances: 0, deductions: 0, pan_no: 'KJHOP1234E', phone: '+91 91234 56780', email: 'karan.johar@iitd.edu.in', tenant_id: 'demo-tenant-1', bank_name: 'Axis Bank', account_no: '887766554433', ifsc_code: 'UTIB0000082' },
    { id: 'staff-5', first_name: 'Vinod', last_name: 'Mehta', employee_id: 'EMP-ADM-04', designation: 'Office Administrator', role: 'ADMINISTRATOR', basic: 68000, allowances: 0, deductions: 0, pan_no: 'VNMTH5678D', phone: '+91 98765 12345', email: 'vinod.mehta@iitd.edu.in', tenant_id: 'demo-tenant-1', bank_name: 'State Bank of India', account_no: '223344556677', ifsc_code: 'SBIN0000214' }
  ]);

  // Shared fleet maintenance logs
  const [sharedMaintenanceBills, setSharedMaintenanceBills] = useState([
    { id: 'bill-1', vehicle: 'DL 1PD 8492 (Route A)', service: 'Engine Overhaul & Oil Change', date: '2026-05-10', cost: 18500, tenant_id: 'demo-tenant-1' },
    { id: 'bill-2', vehicle: 'DL 1PA 7730 (Route B)', service: 'Front Tire Replacement', date: '2026-05-14', cost: 12000, tenant_id: 'demo-tenant-1' }
  ]);

  // Shared Library Books Catalog
  const [sharedBooks, setSharedBooks] = useState([
    { id: 'book-1', title: 'Concepts of Physics (Vol I & II)', author: 'Dr. H.C. Verma', category: 'Physics', isbn: '978-8177091878', stock: 15, tenant_id: 'demo-tenant-1' },
    { id: 'book-2', title: 'Higher Engineering Mathematics', author: 'Dr. B.S. Grewal', category: 'Mathematics', isbn: '978-8193328491', stock: 10, tenant_id: 'demo-tenant-1' },
    { id: 'book-3', title: 'Modern Organic Chemistry practicals', author: 'Prof. R.K. Bansal', category: 'Chemistry', isbn: '978-8122413557', stock: 8, tenant_id: 'demo-tenant-1' },
    { id: 'book-4', title: 'Standard Accounting Fundamentals', author: 'T.S. Grewal', category: 'Commerce', isbn: '978-9388836528', stock: 12, tenant_id: 'demo-tenant-1' }
  ]);

  // Shared Book loans / circulations
  const [sharedCirculations, setSharedCirculations] = useState([
    { id: 'circ-1', studentId: 'stud-1', bookId: 'book-1', checkoutDate: '2026-05-10', dueDate: '2026-05-24', fine: 0, status: 'ISSUED', tenant_id: 'demo-tenant-1' },
    { id: 'circ-2', studentId: 'stud-2', bookId: 'book-3', checkoutDate: '2026-05-02', dueDate: '2026-05-16', fine: 40, status: 'OVERDUE', tenant_id: 'demo-tenant-1' }
  ]);

  // Shared Online Admissions applications
  const [sharedAdmissions, setSharedAdmissions] = useState([
    { id: 'adm-app-1', first_name: 'Priya', last_name: 'Sen', email: 'priya.sen@gmail.com', phone: '+91 91234 56789', class_id: 'class-1', board_score: 94.2, category: 'OBC', status: 'PENDING', aadhaar_no: '883912039284', date: '2026-05-20', tenant_id: 'demo-tenant-1' },
    { id: 'adm-app-2', first_name: 'Siddharth', last_name: 'Roy', email: 'siddharth.roy@yahoo.com', phone: '+91 82345 67890', class_id: 'class-2', board_score: 88.5, category: 'GENERAL', status: 'PENDING', aadhaar_no: '228392841029', date: '2026-05-22', tenant_id: 'demo-tenant-1' }
  ]);

  // Shared notification alerts scoped to parents (e.g. absences & receipts)
  const [sharedNotifications, setSharedNotifications] = useState([
    {
      id: 'notif-1',
      tenant_id: 'demo-tenant-1',
      recipient_id: 'parent-1',
      title: '🚨 Absence Alert: Aarav Patel',
      body: 'Aarav Patel was marked ABSENT for daily schedule on May 24th, 2026.',
      type: 'ABSENCE',
      date: '2026-05-24',
      read: false
    },
    {
      id: 'notif-2',
      tenant_id: 'demo-tenant-1',
      recipient_id: 'parent-1',
      title: '📄 Fee Receipt Confirmed: Aarav Patel',
      body: 'Receipt RCPT-2026-8492: ₹45,000 paid via Razorpay UPI. Outstanding balance is now ₹0.',
      type: 'FEE_PAYMENT',
      date: '2026-05-15',
      read: true,
      metadata: { 
        receiptId: 'rcpt-101', 
        amount: 45000, 
        studentId: 'stud-1',
        receiptDetails: {
          id: 'rcpt-101',
          date: '2026-05-15',
          dateDisplay: '15-May-2026',
          time: '11:30 AM',
          amount: 45000,
          method: 'Razorpay UPI',
          studentName: 'Aarav Patel',
          admissionNo: 'ADM2026/049',
          className: 'Class XII - Science (CBSE)',
          schoolName: 'Indian Institute of Technology (IIT) Delhi',
          totalFee: 45000,
          newPaid: 45000,
          newRemaining: 0,
          newStatus: 'PAID',
          collectedBy: 'Anjali Sharma',
          schoolAddress: 'Hauz Khas, New Delhi – 110016, Delhi, India',
          schoolPhone: '+91-11-2659-1777',
          schoolEmail: 'admin@iitd.edu.in',
          schoolAffiliation: 'UGC / AICTE Approved • NAAC A++ Accredited',
          schoolEstYear: '1961',
          feeBreakdown: [
            { label: 'Base Tuition Fee', code: 'TUIT', amount: 35000 },
            { label: 'Science Laboratory Fee', code: 'LAB', amount: 5000 },
            { label: 'Board Examination Fee', code: 'EXAM', amount: 5000 }
          ]
        }
      }
    }
  ]);

  const [sharedSubjects, setSharedSubjects] = useState([
    { id: 'subj-1', class_id: 'class-1', code: 'PH-121', name: 'Physics Core theory', teacher_id: 'staff-1', units: 4, tenant_id: 'demo-tenant-1' },
    { id: 'subj-2', class_id: 'class-1', code: 'MA-122', name: 'Advanced Calculus math', teacher_id: 'staff-2', units: 5, tenant_id: 'demo-tenant-1' },
    { id: 'subj-3', class_id: 'class-1', code: 'CY-123', name: 'Organic Chemistry practical', teacher_id: 'staff-2', units: 3, tenant_id: 'demo-tenant-1' },
    { id: 'subj-4', class_id: 'class-2', code: 'AC-121', name: 'Accountancy Core', teacher_id: 'staff-3', units: 4, tenant_id: 'demo-tenant-1' },
    { id: 'subj-5', class_id: 'class-2', code: 'BS-122', name: 'Business Studies', teacher_id: 'staff-2', units: 3, tenant_id: 'demo-tenant-1' },
    // Demo Tenant 2 (DPS) subjects
    { id: 'subj-6', class_id: 'class-7', code: 'PHY-DPS', name: 'DPS Physics Lab & Theory', teacher_id: '', units: 4, tenant_id: 'demo-tenant-2' },
    { id: 'subj-7', class_id: 'class-8', code: 'ACC-DPS', name: 'DPS Advanced Accountancy', teacher_id: '', units: 4, tenant_id: 'demo-tenant-2' },
    // Demo Tenant 3 (St. Stephen's) subjects
    { id: 'subj-8', class_id: 'class-9', code: 'ENG-301', name: 'Victorian Literature & Poetry', teacher_id: '', units: 5, tenant_id: 'demo-tenant-3' },
    { id: 'subj-9', class_id: 'class-10', code: 'PHY-301', name: 'Classical Mechanics & Relativity', teacher_id: '', units: 6, tenant_id: 'demo-tenant-3' }
  ]);

  const [sharedQuestions, setSharedQuestions] = useState([
    {
      id: 'q-1',
      text: 'What is the SI unit of electric potential difference?',
      textSec: '',
      language: 'English',
      languageSec: 'None',
      type: 'MCQ',
      options: ['Volt', 'Ampere', 'Ohm', 'Watt'],
      optionsSec: [],
      correct_answer: 'Volt',
      marks: 1,
      difficulty: 'EASY',
      subject: 'Physics Core theory',
      class_id: 'class-1',
      tenant_id: 'demo-tenant-1'
    },
    {
      id: 'q-2',
      text: "State Faraday's law of electromagnetic induction.",
      textSec: '',
      language: 'English',
      languageSec: 'None',
      type: 'SHORT',
      options: [],
      optionsSec: [],
      correct_answer: 'The induced electromotive force in any closed circuit is equal to the negative of the time rate of change of the magnetic flux enclosed by the circuit.',
      marks: 3,
      difficulty: 'MEDIUM',
      subject: 'Physics Core theory',
      class_id: 'class-1',
      tenant_id: 'demo-tenant-1'
    },
    {
      id: 'q-3',
      text: 'Describe the construction and working of a cyclotron with a neat diagram.',
      textSec: '',
      language: 'English',
      languageSec: 'None',
      type: 'LONG',
      options: [],
      optionsSec: [],
      correct_answer: 'Cyclotron working principles include magnetic field deflection, electric field acceleration, and resonant frequency synchronization.',
      marks: 5,
      difficulty: 'HARD',
      subject: 'Physics Core theory',
      class_id: 'class-1',
      tenant_id: 'demo-tenant-1'
    },
    {
      id: 'q-4',
      text: 'Which of the following is a transition element?',
      textSec: '',
      language: 'English',
      languageSec: 'None',
      type: 'MCQ',
      options: ['Iron', 'Sodium', 'Calcium', 'Magnesium'],
      optionsSec: [],
      correct_answer: 'Iron',
      marks: 1,
      difficulty: 'EASY',
      subject: 'Organic Chemistry practical',
      class_id: 'class-1',
      tenant_id: 'demo-tenant-1'
    },
    {
      id: 'q-5',
      text: 'Find the value of integral ∫ (3x^2 + 2x) dx from 0 to 1.',
      textSec: '',
      language: 'Mathematics',
      languageSec: 'None',
      type: 'MCQ',
      options: ['2', '3', '1', '4'],
      optionsSec: [],
      correct_answer: '2',
      marks: 2,
      difficulty: 'MEDIUM',
      subject: 'Advanced Calculus math',
      class_id: 'class-1',
      tenant_id: 'demo-tenant-1'
    },
    {
      id: 'q-6',
      text: "Identify the correct passive voice of: 'She is writing a letter.'",
      textSec: '',
      language: 'English',
      languageSec: 'None',
      type: 'MCQ',
      options: ['A letter is being written by her.', 'A letter was written by her.', 'A letter is written by her.', 'A letter will be written by her.'],
      optionsSec: [],
      correct_answer: 'A letter is being written by her.',
      marks: 1,
      difficulty: 'EASY',
      subject: 'Physics Core theory',
      class_id: 'class-1',
      tenant_id: 'demo-tenant-1'
    }
  ]);

  const [sharedExamPapers, setSharedExamPapers] = useState([
    {
      id: 'paper-1',
      title: 'Physics Mid-Sem Exam 2026',
      class_id: 'class-1',
      subject: 'Physics Core theory',
      duration: '2 Hours',
      instructions: 'Section A contains Multiple Choice Questions. Section B contains Subjective Questions. Non-programmable calculators are allowed.',
      languageLayout: 'primary',
      question_ids: ['q-1', 'q-2', 'q-3', 'q-6'],
      created_by: 'Prof. Rajesh Iyer',
      tenant_id: 'demo-tenant-1'
    }
  ]);

  const [sharedHostelInventoryAllocations, setSharedHostelInventoryAllocations] = useState([
    { id: 'all-inv-1', studentId: 'stud-1', item: 'Mattress', cost: 1500, paid: 0, status: 'UNPAID', date: '2026-05-15', tenant_id: 'demo-tenant-1', payments: [] },
    { id: 'all-inv-2', studentId: 'stud-1', item: 'Steel Bucket & Mug', cost: 300, paid: 300, status: 'PAID', date: '2026-05-15', tenant_id: 'demo-tenant-1', payments: [{ id: 'tx-h1', date: '2026-05-16', amount: 300, method: 'Cash' }] },
    { id: 'all-inv-3', studentId: 'stud-2', item: 'Study Desk Lamp', cost: 450, paid: 0, status: 'UNPAID', date: '2026-05-18', tenant_id: 'demo-tenant-1', payments: [] }
  ]);

  const [sharedFinalExamsPublished, setSharedFinalExamsPublished] = useState(true);

  // School-staff real-time payment alert feed (populated when parents pay online)
  const [sharedSchoolAlerts, setSharedSchoolAlerts] = useState([]);
  const [sharedClassTestRecords, setSharedClassTestRecords] = useState({
    'stud-1': [
      { subject: 'Physics Class Test', marks: '22 / 25', grade: 'A1', desc: 'Class Avg: 19' },
      { subject: 'Advanced Calculus Class Test', marks: '18 / 25', grade: 'B1', desc: 'Class Avg: 16' },
      { subject: 'Organic Chemistry Class Test', marks: '24 / 25', grade: 'A1', desc: 'Class Avg: 20' }
    ],
    'stud-2': [
      { subject: 'Physics Class Test', marks: '19 / 25', grade: 'B1', desc: 'Class Avg: 19' },
      { subject: 'Advanced Calculus Class Test', marks: '23 / 25', grade: 'A1', desc: 'Class Avg: 16' },
      { subject: 'Organic Chemistry Class Test', marks: '20 / 25', grade: 'B2', desc: 'Class Avg: 20' }
    ],
    'stud-3': [
      { subject: 'Physics Class Test', marks: '21 / 25', grade: 'A2', desc: 'Class Avg: 19' },
      { subject: 'Advanced Calculus Class Test', marks: '15 / 25', grade: 'C1', desc: 'Class Avg: 16' },
      { subject: 'Organic Chemistry Class Test', marks: '22 / 25', grade: 'A2', desc: 'Class Avg: 20' }
    ]
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          const role = session.user.app_metadata?.role || 'STUDENT';
          const tenantId = session.user.app_metadata?.tenant_id;
          setActiveRole(role);
          setActiveUser({
            name: session.user.user_metadata?.first_name 
              ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name || ''}`
              : session.user.email.split('@')[0],
            email: session.user.email,
            role: role,
            avatar: session.user.user_metadata?.avatar || ''
          });
        }
      } catch (err) {
        console.error('Auth initialization error', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const role = session.user.app_metadata?.role || 'STUDENT';
        setActiveRole(role);
        setActiveUser({
          name: session.user.user_metadata?.first_name 
            ? `${session.user.user_metadata.first_name} ${session.user.user_metadata.last_name || ''}`
            : session.user.email.split('@')[0],
          email: session.user.email,
          role: role,
          avatar: session.user.user_metadata?.avatar || ''
        });
      } else {
        // Fallback to dev mode default if logged out
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Restore active role from cookies on mount (for demo/simulation persistent refreshes)
  useEffect(() => {
    if (typeof window !== 'undefined' && !session?.user) {
      const match = document.cookie.match(/sb-demo-role=([^;]+)/);
      if (match && match[1]) {
        const role = match[1];
        setActiveRole(role);
        
        const names = {
          SUPER_ADMIN: 'Dr. Ramesh Kumar (Super Admin)',
          SCHOOL_ADMIN: 'Smt. Anjali Sharma (School Principal)',
          TEACHER: 'Prof. Rajesh Iyer (HOD Physics)',
          STUDENT: 'Aarav Patel (B.Tech Year 3)',
          PARENT: 'Vikram Patel (Guardian)',
          ACCOUNTANT: 'Karan Johar (Bursar)',
          LIBRARIAN: 'Deepa Roy (Chief Librarian)',
          TRANSPORT_MANAGER: 'Harpreet Singh (Fleet Head)',
          HOSTEL_WARDEN: 'Suresh Chandra (Warden Block A)',
          ADMINISTRATOR: 'Shri. Vinod Mehta (Office Administrator)'
        };
        
        let email = activeTenant?.subdomain ? `user@${activeTenant.subdomain}.edu.in` : 'user@school.edu.in';
        if (role === 'SUPER_ADMIN') {
          email = 'ramesh.kumar@campuserp.in';
        } else if (role === 'PARENT') {
          const parent = sharedParents[0];
          names.PARENT = `${parent.first_name} ${parent.last_name} (Guardian)`;
          email = parent.email;
        } else {
          const staffName = names[role].split(' (')[0]
            .replace('Smt. ', '')
            .replace('Prof. ', '')
            .replace('Dr. ', '')
            .replace('Shri. ', '')
            .replace('Karan Johar', 'karan.johar')
            .replace('Suresh Chandra', 'suresh.chandra')
            .replace('Harpreet Singh', 'harpreet.singh')
            .replace('Aarav Patel', 'aarav.patel')
            .replace('Vinod Mehta', 'vinod.mehta')
            .toLowerCase()
            .replace(' ', '.');
          email = `${staffName}@${activeTenant.subdomain}.edu.in`;
        }

        setActiveUser({
          name: names[role] || 'User Profile',
          email: email,
          role: role
        });
      }
    }
  }, [session, activeTenant, sharedParents]);

  // Login handler
  const login = async (email, password) => {
    try {
      // Allow demo login bypass for any onboarded staff member by email
      const foundStaff = (sharedStaff || []).find(s => s.email?.toLowerCase() === email?.toLowerCase());
      if (foundStaff) {
        simulateStaffSession(foundStaff);
        return { success: true };
      }

      if (typeof window !== 'undefined') {
        document.cookie = "sb-demo-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "sb-demo-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Access session authenticated successfully');
      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
      return { success: false, error: err };
    }
  };

  // Sign out handler
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      if (typeof window !== 'undefined') {
        document.cookie = "sb-demo-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "sb-demo-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      toast.success('Session terminated successfully');
      router.push('/login');
    } catch (err) {
      toast.error('Sign out error');
    }
  };

  // Dev tools role switcher
  const switchRole = (role) => {
    setActiveRole(role);
    if (typeof window !== 'undefined') {
      document.cookie = "sb-demo-session=true; path=/; max-age=86400";
      document.cookie = `sb-demo-role=${role}; path=/; max-age=86400`;
    }
    const names = {
      SUPER_ADMIN: 'Dr. Ramesh Kumar (Super Admin)',
      SCHOOL_ADMIN: 'Smt. Anjali Sharma (School Principal)',
      TEACHER: 'Prof. Rajesh Iyer (HOD Physics)',
      STUDENT: 'Aarav Patel (B.Tech Year 3)',
      PARENT: 'Vikram Patel (Guardian)',
      ACCOUNTANT: 'Karan Johar (Bursar)',
      LIBRARIAN: 'Deepa Roy (Chief Librarian)',
      TRANSPORT_MANAGER: 'Harpreet Singh (Fleet Head)',
      HOSTEL_WARDEN: 'Suresh Chandra (Warden Block A)',
      ADMINISTRATOR: 'Shri. Vinod Mehta (Office Administrator)'
    };
    
    let email = activeTenant?.subdomain ? `user@${activeTenant.subdomain}.edu.in` : 'user@school.edu.in';
    if (role === 'SUPER_ADMIN') {
      email = 'ramesh.kumar@campuserp.in';
    } else if (role === 'PARENT') {
      const parent = sharedParents.find(p => p.id === activeParentId) || sharedParents[0];
      names.PARENT = `${parent.first_name} ${parent.last_name} (Guardian)`;
      email = parent.email;
    } else {
      const staffName = names[role].split(' (')[0]
        .replace('Smt. ', '')
        .replace('Prof. ', '')
        .replace('Dr. ', '')
        .replace('Shri. ', '')
        .replace('Karan Johar', 'karan.johar')
        .replace('Suresh Chandra', 'suresh.chandra')
        .replace('Harpreet Singh', 'harpreet.singh')
        .replace('Aarav Patel', 'aarav.patel')
        .replace('Vinod Mehta', 'vinod.mehta')
        .toLowerCase()
        .replace(' ', '.');
      email = `${staffName}@${activeTenant.subdomain}.edu.in`;
    }

    setActiveUser(prev => ({
      ...prev,
      name: names[role] || 'User Profile',
      email: email,
      role: role
    }));
    toast.success(`Switched dashboard context to: ${role}`);
  };

  const switchTenant = (tenantId) => {
    const tenant = availableTenants.find(t => t.id === tenantId);
    if (tenant) {
      setActiveTenant(tenant);
      
      // Update simulated user's email subdomain dynamically if they are not super admin or parent
      if (activeRole !== 'SUPER_ADMIN' && activeRole !== 'PARENT') {
        setActiveUser(prev => {
          const emailParts = prev.email.split('@');
          if (emailParts.length === 2) {
            const localPart = emailParts[0];
            return {
              ...prev,
              email: `${localPart}@${tenant.subdomain}.edu.in`
            };
          }
          return prev;
        });
      }
      toast.success(`Switched school campus to: ${tenant.name}`);
    }
  };

  const simulateStaffSession = (staff) => {
    // Determine active role from staff.role, fallback to matching designation
    let role = staff.role;
    if (!role) {
      const desc = (staff.designation || '').toLowerCase();
      if (desc.includes('principal') || desc.includes('dean')) role = 'SCHOOL_ADMIN';
      else if (desc.includes('accountant') || desc.includes('bursar') || desc.includes('finance')) role = 'ACCOUNTANT';
      else if (desc.includes('librarian')) role = 'LIBRARIAN';
      else if (desc.includes('transport') || desc.includes('fleet')) role = 'TRANSPORT_MANAGER';
      else if (desc.includes('warden')) role = 'HOSTEL_WARDEN';
      else if (desc.includes('administrator') || desc.includes('admin')) role = 'ADMINISTRATOR';
      else role = 'TEACHER';
    }

    setActiveRole(role);
    setActiveUser({
      name: `${staff.first_name} ${staff.last_name} (${staff.designation})`,
      email: staff.email,
      role: role,
      avatar: staff.profile_picture_url || ''
    });

    if (typeof window !== 'undefined') {
      document.cookie = "sb-demo-session=true; path=/; max-age=86400";
      document.cookie = `sb-demo-role=${role}; path=/; max-age=86400`;
    }

    toast.success(`Switched active session to staff: ${staff.first_name} ${staff.last_name} (${role})`);
    router.push('/dashboard');
  };

  const switchParent = (parentId) => {
    setActiveParentId(parentId);
    const parent = sharedParents.find(p => p.id === parentId);
    if (parent) {
      setActiveUser(prev => ({
        ...prev,
        name: `${parent.first_name} ${parent.last_name} (Guardian)`,
        email: parent.email,
        role: 'PARENT'
      }));
      toast.success(`Simulating Parent: ${parent.first_name} ${parent.last_name}`);
    }
  };

  const addStudentAndParent = (studentData, parentData) => {
    const existingParent = sharedParents.find(p => p.email === parentData.email);
    const parentId = existingParent ? existingParent.id : (parentData.id || `parent-${Date.now()}`);
    const studentId = studentData.id || `stud-${Date.now()}`;
    const finalTenantId = studentData.tenant_id || activeTenant.id;

    // Add parent if not already exists
    if (!existingParent) {
      setSharedParents(prev => [...prev, { ...parentData, id: parentId, tenant_id: finalTenantId }]);
    }

    // Add student
    setSharedStudents(prev => [
      ...prev,
      { ...studentData, id: studentId, parent_id: parentId, tenant_id: finalTenantId }
    ]);

    // Initialize mock records
    setSharedAttendanceRecords(prev => ({
      ...prev,
      [studentId]: studentData.initialAttendance || '100.0%'
    }));

    setSharedAcademicRecords(prev => ({
      ...prev,
      [studentId]: [
        { subject: 'Physics Core theory', marks: '85 / 100', grade: 'A2', desc: 'Class Avg: 78' },
        { subject: 'Advanced Calculus math', marks: '80 / 100', grade: 'B1', desc: 'Class Avg: 72' },
        { subject: 'Organic Chemistry practical', marks: '42 / 50', grade: 'A2', desc: 'Class Avg: 41' }
      ]
    }));

    // Auto-calculate total fee from class fee structures + optional transport + hostel
    const classFeeStructures = sharedFeeStructures.filter(fs => fs.class_id === studentData.class_id && fs.tenant_id === finalTenantId);
    const baseFeeTotal = classFeeStructures.reduce((sum, fs) => sum + fs.amount, 0);
    
    // Determine transport & hostel add-ons from the student registration data
    const transportFee = studentData.transportFee || 0;
    const hostelFee = studentData.hostelFee || 0;
    const totalFee = studentData.totalFee || (baseFeeTotal + transportFee + hostelFee);
    const paidFee = studentData.paidFee || 0;
    const remainingFee = totalFee - paidFee;

    // Store student fee add-ons
    setSharedStudentFeeAddons(prev => ({
      ...prev,
      [studentId]: {
        transport: {
          enabled: studentData.enableTransport || false,
          routeId: studentData.transportRouteId || '',
          fee: transportFee
        },
        hostel: {
          enabled: studentData.enableHostel || false,
          blockId: studentData.hostelBlockId || '',
          fee: hostelFee
        }
      }
    }));

    setSharedFeeRecords(prev => ({
      ...prev,
      [studentId]: {
        total: totalFee,
        paid: paidFee,
        remaining: remainingFee,
        status: paidFee === totalFee ? 'PAID' : paidFee > 0 ? 'PARTIAL' : 'UNPAID',
        history: paidFee > 0 ? [{ id: `rcpt-${Date.now()}`, date: new Date().toISOString().split('T')[0], amount: paidFee, method: 'Razorpay UPI' }] : []
      }
    }));

    setSharedRemarks(prev => ({
      ...prev,
      [studentId]: [
        { teacher: 'Prof. Rajesh Iyer (Physics)', remark: 'Newly admitted student. Initial class performance is good.', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
      ]
    }));
  };

  const updateProfile = async (profileData) => {
    setActiveUser(prev => ({
      ...prev,
      name: profileData.name,
      phone: profileData.phone,
      aadhaar: profileData.aadhaar,
      pan: profileData.pan,
      avatar: profileData.avatar
    }));

    if (session?.user) {
      try {
        const updateParams = {
          data: {
            first_name: profileData.name.split(' ')[0] || '',
            last_name: profileData.name.split(' ').slice(1).join(' ') || '',
            phone: profileData.phone,
            avatar: profileData.avatar
          }
        };

        if (profileData.newPassword) {
          updateParams.password = profileData.newPassword;
        }

        const { error } = await supabase.auth.updateUser(updateParams);
        if (error) throw error;
        
        await supabase
          .from('profiles')
          .update({ phone: profileData.phone })
          .eq('id', session.user.id);
        
        const firstName = profileData.name.split(' ')[0] || '';
        const lastName = profileData.name.split(' ').slice(1).join(' ') || '';
        const role = session.user.app_metadata?.role || 'STUDENT';
        
        if (role === 'STUDENT') {
          await supabase
            .from('students')
            .update({ 
              first_name: firstName, 
              last_name: lastName,
              aadhaar_no: profileData.aadhaar
            })
            .eq('id', session.user.id);
        } else if (role === 'PARENT') {
          await supabase
            .from('parents')
            .update({ 
              first_name: firstName, 
              last_name: lastName
            })
            .eq('id', session.user.id);
        } else {
          await supabase
            .from('staff')
            .update({ 
              first_name: firstName, 
              last_name: lastName,
              aadhaar_no: profileData.aadhaar,
              pan_no: profileData.pan
            })
            .eq('id', session.user.id);
        }
      } catch (err) {
        console.error('Failed to sync profile change to Supabase database:', err);
        throw err;
      }
    }
    return { success: true };
  };

  const updateTenant = (tenantData) => {
    setActiveTenant(prev => ({
      ...prev,
      name: tenantData.name,
      subdomain: tenantData.subdomain,
      logo: tenantData.logo,
      settings: {
        ...prev.settings,
        board: tenantData.board,
        academicYear: tenantData.academicYear,
        bank: {
          bankName: tenantData.bankName,
          accountName: tenantData.accountName,
          accountNo: tenantData.accountNo,
          ifscCode: tenantData.ifscCode,
          upiId: tenantData.upiId,
          qrCode: tenantData.qrCode
        }
      }
    }));
    
    setAvailableTenants(prev => prev.map(t => 
      t.id === activeTenant.id 
        ? { 
            ...t, 
            name: tenantData.name, 
            subdomain: tenantData.subdomain, 
            logo: tenantData.logo,
            settings: {
              ...t.settings,
              board: tenantData.board,
              academicYear: tenantData.academicYear,
              bank: {
                bankName: tenantData.bankName,
                accountName: tenantData.accountName,
                accountNo: tenantData.accountNo,
                ifscCode: tenantData.ifscCode,
                upiId: tenantData.upiId,
                qrCode: tenantData.qrCode
              }
            }
          } 
        : t
    ));
    
    toast.success('System configuration saved successfully!');
  };

  return (
    <AuthContext.Provider value={{
      supabase,
      session,
      loading,
      activeUser,
      activeRole: activeRole === 'ADMINISTRATOR' ? 'SCHOOL_ADMIN' : activeRole,
      realRole: activeRole,
      activeTenant,
      availableTenants,
      login,
      logout,
      switchRole,
      switchTenant,
      updateProfile,
      updateTenant,
      theme,
      toggleTheme,
      sharedStudents,
      setSharedStudents,
      sharedParents,
      setSharedParents,
      sharedNotices,
      setSharedNotices,
      sharedAcademicRecords,
      setSharedAcademicRecords,
      sharedFeeRecords,
      setSharedFeeRecords,
      sharedAttendanceRecords,
      setSharedAttendanceRecords,
      sharedAttendanceLogs,
      setSharedAttendanceLogs,
      sharedRemarks,
      setSharedRemarks,
      activeParentId,
      switchParent,
      simulateStaffSession,
      addStudentAndParent,
      sharedClasses,
      setSharedClasses,
      sharedSubjects,
      setSharedSubjects,
      sharedHostelInventoryAllocations,
      setSharedHostelInventoryAllocations,
      sharedTransportRoutes,
      setSharedTransportRoutes,
      sharedHostelBlocks,
      setSharedHostelBlocks,
      sharedStaff,
      setSharedStaff,
      sharedMaintenanceBills,
      setSharedMaintenanceBills,
      sharedBooks,
      setSharedBooks,
      sharedCirculations,
      setSharedCirculations,
      sharedAdmissions,
      setSharedAdmissions,
      sharedFeeStructures,
      setSharedFeeStructures,
      sharedStudentFeeAddons,
      setSharedStudentFeeAddons,
      sharedNotifications,
      setSharedNotifications,
      sharedQuestions,
      setSharedQuestions,
      sharedExamPapers,
      setSharedExamPapers,
      sharedFinalExamsPublished,
      setSharedFinalExamsPublished,
      sharedClassTestRecords,
      setSharedClassTestRecords,
      sharedSchoolAlerts,
      setSharedSchoolAlerts,
      sharedStudentHistory,
      setSharedStudentHistory
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
