'use client';

import RoleGate from '@/components/RoleGate';

import React, { useState } from 'react';
import { 
  Library, Search, Plus, BookOpen, UserCheck, Wallet, 
  CheckCircle2, ShieldCheck, ArrowRight, Book, Receipt, Trash2, Calendar, BellRing,
  FileSpreadsheet, Globe, RefreshCw, Upload
} from 'lucide-react';
import { useAuth } from '@/components/Providers';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import * as XLSX from 'xlsx';

export default function LibraryPage() {
  const {
    activeTenant, 
    sharedStudents, 
    sharedStaff, 
    sharedBooks, 
    setSharedBooks, 
    sharedCirculations, 
    setSharedCirculations,
    sharedParents,
    activeRole,
    activeUser
  } = useAuth();

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'returns'
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showIssueBookModal, setShowIssueBookModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Catalog book addition modes and states
  const [addMode, setAddMode] = useState('manual'); // 'manual' | 'digital'
  const [isbnQuery, setIsbnQuery] = useState('');
  const [fetchingIsbn, setFetchingIsbn] = useState(false);
  const [parsedBooks, setParsedBooks] = useState([]);
  const [csvText, setCsvText] = useState('');
  
  // Form states
  const [newBook, setNewBook] = useState({ title: '', author: '', category: 'Physics', isbn: '', stock: 5 });
  const [newIssue, setNewIssue] = useState({
    borrowerId: '',
    bookId: '',
    checkoutDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 14 days
  });

  // Resolve student ID
  const myStudentProfile = React.useMemo(() => {
    return sharedStudents.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
  }, [sharedStudents, activeTenant.id, activeUser]);
  const myStudentId = myStudentProfile ? myStudentProfile.id : '';

  // Resolve staff ID
  const myStaffProfile = React.useMemo(() => {
    return sharedStaff.find(s => s.tenant_id === activeTenant.id && s.first_name && activeUser?.name?.toLowerCase().includes(s.first_name.toLowerCase()));
  }, [sharedStaff, activeTenant.id, activeUser]);
  const myStaffId = myStaffProfile ? myStaffProfile.id : '';

  const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'LIBRARIAN', 'TEACHER', 'STUDENT'];
  if (!allowedRoles.includes(activeRole)) {
    return <RoleGate allowedRoles={allowedRoles} activeRole={activeRole} moduleName="Library Books" />;
  }

  const myBorrowerId = activeRole === 'STUDENT' ? myStudentId : (activeRole === 'TEACHER' ? myStaffId : '');

  // Filters by tenant_id
  const tenantBooks = sharedBooks.filter(b => b.tenant_id === activeTenant.id);
  const tenantCirculations = sharedCirculations.filter(c => {
    if (c.tenant_id !== activeTenant.id) return false;
    if (activeRole === 'STUDENT' || activeRole === 'TEACHER') {
      return c.studentId === myBorrowerId;
    }
    return true;
  });
  const tenantStudents = sharedStudents.filter(s => s.tenant_id === activeTenant.id);
  const tenantStaff = sharedStaff.filter(st => st.tenant_id === activeTenant.id);

  // Stats
  const totalBooks = tenantBooks.reduce((acc, curr) => acc + curr.stock, 0);
  const activeLoansCount = tenantCirculations.filter(c => c.status === 'ISSUED' || c.status === 'OVERDUE').length;
  const overdueCount = tenantCirculations.filter(c => c.status === 'OVERDUE').length;

  const getBookTitle = (bookId) => {
    const b = tenantBooks.find(x => x.id === bookId);
    return b ? b.title : 'Unknown Book';
  };

  const getBorrowerName = (borrowerId) => {
    const s = tenantStudents.find(x => x.id === borrowerId);
    if (s) return `${s.first_name} ${s.last_name} (Student)`;
    
    const st = tenantStaff.find(x => x.id === borrowerId);
    if (st) return `${st.first_name} ${st.last_name} (Staff)`;
    
    return 'Unknown Borrower';
  };

  // Add Book handler
  const handleAddBook = (e) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author || !newBook.isbn) {
      toast.error('Book Title, Author, and ISBN code are required.');
      return;
    }

    const created = {
      id: `book-${Date.now()}`,
      title: newBook.title,
      author: newBook.author,
      category: newBook.category,
      isbn: newBook.isbn,
      stock: Number(newBook.stock),
      tenant_id: activeTenant.id
    };

    setSharedBooks([...sharedBooks, created]);
    toast.success(`Book "${newBook.title}" added to the library catalog!`);
    setNewBook({ title: '', author: '', category: 'Physics', isbn: '', stock: 5 });
    setShowAddBookModal(false);
  };

  // Digital ISBN Lookup Handler
  const handleIsbnLookup = async () => {
    if (!isbnQuery.trim()) {
      toast.error('Please enter a valid ISBN code.');
      return;
    }
    const cleanIsbn = isbnQuery.trim().replace(/-/g, '');
    setFetchingIsbn(true);
    toast.loading(`Querying digital library for ISBN ${cleanIsbn}...`);

    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
      const data = await res.json();
      toast.dismiss();

      const key = `ISBN:${cleanIsbn}`;
      if (data && data[key]) {
        const info = data[key];
        const title = info.title || '';
        const author = info.authors && info.authors.length > 0 ? info.authors[0].name : 'Unknown Author';
        
        setNewBook({
          title,
          author,
          category: 'Physics',
          isbn: cleanIsbn,
          stock: 5
        });
        setAddMode('manual');
        toast.success(`Book details loaded successfully!`);
      } else {
        const mocks = {
          '9788177091878': { title: 'Concepts of Physics (Vol I & II)', author: 'Dr. H.C. Verma', category: 'Physics' },
          '9788193328491': { title: 'Higher Engineering Mathematics', author: 'Dr. B.S. Grewal', category: 'Mathematics' },
          '9788122413557': { title: 'Modern Organic Chemistry Practicals', author: 'Prof. R.K. Bansal', category: 'Chemistry' }
        };
        if (mocks[cleanIsbn]) {
          setNewBook({
            title: mocks[cleanIsbn].title,
            author: mocks[cleanIsbn].author,
            category: mocks[cleanIsbn].category,
            isbn: cleanIsbn,
            stock: 5
          });
          setAddMode('manual');
          toast.success(`Demo book loaded successfully!`);
        } else {
          toast.error(`ISBN not found. Switched to manual form so you can fill details.`);
          setNewBook(prev => ({ ...prev, isbn: cleanIsbn }));
          setAddMode('manual');
        }
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Network lookup failed. Please enter details manually.');
      setNewBook(prev => ({ ...prev, isbn: cleanIsbn }));
      setAddMode('manual');
    } finally {
      setFetchingIsbn(false);
    }
  };

  // Excel / CSV File parser for library catalog
  const handleFileUpload = (e) => {
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
          toast.error('Excel sheet is empty or contains no records.');
          return;
        }

        const rows = data.slice(1);
        const imported = rows.map((r, i) => {
          return {
            id: `book-parsed-${Date.now()}-${i}`,
            title: r[0] || '',
            author: r[1] || 'Unknown Author',
            category: r[2] || 'Physics',
            isbn: String(r[3] || `ISBN-MOCK-${Date.now()}-${i}`),
            stock: Number(r[4]) || 5
          };
        }).filter(b => b.title);

        setParsedBooks(imported);
        toast.success(`Successfully parsed ${imported.length} book records!`);
      } catch (err) {
        toast.error('Error reading Excel spreadsheet.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Bulk import parsed list
  const handleImportParsedBooks = () => {
    if (parsedBooks.length === 0) {
      toast.error('No parsed books to import.');
      return;
    }
    
    const formatted = parsedBooks.map(b => ({
      ...b,
      id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tenant_id: activeTenant.id
    }));

    setSharedBooks([...sharedBooks, ...formatted]);
    toast.success(`Bulk imported ${formatted.length} books to the library catalog!`);
    setParsedBooks([]);
    setShowAddBookModal(false);
  };

  // Issue Book handler
  const handleIssueBook = (e) => {
    e.preventDefault();
    if (!newIssue.borrowerId || !newIssue.bookId) {
      toast.error('Borrower selection and Book selection are required.');
      return;
    }

    // Check book stock
    const bookIndex = sharedBooks.findIndex(b => b.id === newIssue.bookId && b.tenant_id === activeTenant.id);
    if (bookIndex === -1) return;
    const bookObj = sharedBooks[bookIndex];
    if (bookObj.stock <= 0) {
      toast.error(`"${bookObj.title}" is currently out of stock!`);
      return;
    }

    // Deduct stock
    const updatedBooks = [...sharedBooks];
    updatedBooks[bookIndex] = {
      ...bookObj,
      stock: bookObj.stock - 1
    };
    setSharedBooks(updatedBooks);

    const created = {
      id: `circ-${Date.now()}`,
      studentId: newIssue.borrowerId,
      bookId: newIssue.bookId,
      checkoutDate: newIssue.checkoutDate,
      dueDate: newIssue.dueDate,
      fine: 0,
      status: 'ISSUED',
      tenant_id: activeTenant.id
    };

    setSharedCirculations([...sharedCirculations, created]);
    toast.success(`Book issued successfully! Due back: ${newIssue.dueDate}`);
    setNewIssue({
      borrowerId: '',
      bookId: '',
      checkoutDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setActiveTab('returns'); // Show current circulations
    setShowIssueBookModal(false);
  };

  // Return Book handler
  const handleReturnBook = (circId) => {
    const circIndex = sharedCirculations.findIndex(c => c.id === circId);
    if (circIndex === -1) return;
    const circObj = sharedCirculations[circIndex];

    // Return stock
    const bookIndex = sharedBooks.findIndex(b => b.id === circObj.bookId);
    if (bookIndex !== -1) {
      const updatedBooks = [...sharedBooks];
      updatedBooks[bookIndex] = {
        ...sharedBooks[bookIndex],
        stock: sharedBooks[bookIndex].stock + 1
      };
      setSharedBooks(updatedBooks);
    }

    // Calculate dynamic fine if overdue
    const diffTime = Math.abs(new Date() - new Date(circObj.dueDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const fineAmount = new Date() > new Date(circObj.dueDate) ? diffDays * 5 : 0;

    // Remove or update circulation
    setSharedCirculations(sharedCirculations.filter(c => c.id !== circId));
    
    if (fineAmount > 0) {
      toast.success(`Book returned successfully! Late fine of ₹${fineAmount} paid at checkout counter.`);
    } else {
      toast.success('Book returned in good condition. All dues cleared.');
    }
  };

  // Send overdue reminder to borrower / parent
  const handleSendReturnReminder = (circulation) => {
    const borrowerName = getBorrowerName(circulation.studentId);
    const bookTitle = getBookTitle(circulation.bookId);
    const student = tenantStudents.find(s => s.id === circulation.studentId);
    const parentName = student ? (sharedParents.find(p => p.id === student.parent_id) || {}).first_name : null;
    
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: `Sending return reminder for "${bookTitle}" to ${borrowerName}...`,
        success: `Overdue notice sent to ${borrowerName}${parentName ? ` & parent ${parentName}` : ''}! Book: ${bookTitle}`,
        error: 'Failed to send reminder'
      }
    );
  };

  // Bulk send reminders for all overdue circulations
  const handleBulkReturnReminders = () => {
    const overdueCirc = tenantCirculations.filter(c => new Date() > new Date(c.dueDate));
    if (overdueCirc.length === 0) {
      toast.info('No overdue books found. All returns are on time!');
      return;
    }
    overdueCirc.forEach((c, i) => {
      setTimeout(() => handleSendReturnReminder(c), i * 300);
    });
    toast.success(`Dispatching ${overdueCirc.length} overdue return reminder(s)...`);
  };

  const filteredBooks = tenantBooks.filter(b => {
    const term = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.isbn.toLowerCase().includes(term) ||
      b.category.toLowerCase().includes(term)
    );
  });

  if (activeRole === 'STUDENT') {
    return (
      <div className="space-y-8 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">My Borrowed Books</h2>
            <p className="text-text-secondary text-sm font-medium mt-1">
              Active school library checkouts and upcoming return due dates.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-success bg-success/5 border border-success/20 px-3.5 py-2.5 rounded-xl uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Library Schema Secured</span>
          </div>
        </div>

        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-[2.5rem] space-y-6">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-4">Book Title</th>
                  <th className="pb-3">Issued Date</th>
                  <th className="pb-3 pr-4 text-right">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantCirculations.map(c => {
                  const isOverdue = new Date() > new Date(c.dueDate);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-4 pl-4 font-bold text-text-primary flex items-center gap-2">
                        <BookOpen size={14} className="text-accent" />
                        {getBookTitle(c.bookId)}
                      </td>
                      <td className="py-4 font-mono text-text-secondary">{c.checkoutDate}</td>
                      <td className="py-4 pr-4 font-mono text-right">
                        <span className={isOverdue ? 'text-danger font-bold animate-pulse' : 'text-text-primary font-semibold'}>
                          {c.dueDate}
                        </span>
                        {isOverdue && (
                          <span className="ml-2 px-1.5 py-0.5 bg-danger/10 border border-danger/20 text-danger text-[8px] font-black uppercase rounded">
                            Overdue
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {tenantCirculations.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-xs text-text-secondary italic">
                      You do not have any active library book checkouts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black font-outfit text-text-primary tracking-tight">Resource Hub (Library)</h2>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Search catalog, check-out books, and track overdue return fines.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeRole !== 'STUDENT' && activeRole !== 'TEACHER' && (
            <>
              <button 
                onClick={() => setShowAddBookModal(true)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200/60 text-text-primary text-xs font-bold rounded-2xl border border-border transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>Catalog Book</span>
              </button>

              <button 
                onClick={() => setShowIssueBookModal(true)}
                className="px-4 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <BookOpen size={14} />
                <span>Issue Book</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-2 text-[10px] font-black text-success bg-success/5 border border-success/20 px-3.5 py-2.5 rounded-xl uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Library Schema Secured</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl w-fit">
        {[
          { id: 'catalog', label: 'Catalog Search' },
          { id: 'returns', label: (activeRole === 'STUDENT' || activeRole === 'TEACHER') ? 'My Borrows' : 'Returns & Fines' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchQuery('');
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Cataloged Inventory', value: `${totalBooks} Volumes`, desc: 'Books in school stock', icon: Book },
          { label: 'Active Circulations', value: activeLoansCount, desc: 'Issued checkouts', icon: BookOpen },
          { label: 'Overdue Returns', value: overdueCount, desc: 'Late items (₹5/day fine)', icon: Wallet }
        ].map((k, i) => (
          <div key={i} className="p-6 bg-bg-sidebar border border-border rounded-3xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{k.label}</span>
              <div className="p-2 bg-accent/10 rounded-xl text-accent"><k.icon size={16} /></div>
            </div>
            <p className="text-3xl font-black font-outfit text-text-primary mt-3">{k.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{k.desc}</p>
          </div>
        ))}
      </div>

      {/* Content Area */}
      {activeTab === 'catalog' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
          <div className="max-w-md relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within/search:text-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search catalog by title, author, subject, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 border border-border rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all text-xs text-text-primary placeholder:text-text-secondary"
            />
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3 pl-2">Book Title</th>
                  <th className="pb-3">Author</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">ISBN</th>
                  <th className="pb-3 text-right pr-2">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBooks.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 pl-2 font-bold text-text-primary flex items-center gap-2">
                      <Book size={14} className="text-accent" />
                      {b.title}
                    </td>
                    <td className="py-3.5 text-slate-700 font-semibold">{b.author}</td>
                    <td className="py-3.5 text-text-secondary font-mono">{b.category}</td>
                    <td className="py-3.5 font-mono text-text-secondary">{b.isbn}</td>
                    <td className="py-3.5 text-right pr-2 font-mono font-bold">
                      {b.stock > 0 ? (
                        <span className="text-success">{b.stock} Available</span>
                      ) : (
                        <span className="text-danger">Out of Stock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catalog Book Modal */}
      <Modal
        open={showAddBookModal}
        onClose={() => {
          setShowAddBookModal(false);
          setParsedBooks([]);
          setIsbnQuery('');
        }}
        title="Catalog New Volume"
        icon={<Book size={18} />}
        size="md"
      >
        {/* Toggle buttons for addMode */}
        <div className="flex gap-2 p-1 bg-slate-100/50 border border-border rounded-2xl mb-5 w-full">
          <button
            type="button"
            onClick={() => setAddMode('manual')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              addMode === 'manual' 
                ? 'bg-slate-200/60 text-text-primary border border-border shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Manual Entry Form
          </button>
          <button
            type="button"
            onClick={() => setAddMode('digital')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              addMode === 'digital' 
                ? 'bg-slate-200/60 text-text-primary border border-border shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Digital Catalog Tools
          </button>
        </div>

        {addMode === 'manual' ? (
          <form onSubmit={handleAddBook} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Volume Title *</label>
              <input 
                type="text" 
                placeholder="Volume Title"
                value={newBook.title}
                onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Author Name *</label>
              <input 
                type="text" 
                placeholder="Author Name"
                value={newBook.author}
                onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                className="w-full text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Category Subject</label>
              <select
                value={newBook.category}
                onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              >
                <option value="Physics">Physics (Science)</option>
                <option value="Chemistry">Chemistry (Science)</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Commerce">Commerce & Accounts</option>
                <option value="Literature">Literature & Language</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">ISBN Identifiers *</label>
              <input 
                type="text" 
                placeholder="ISBN barcoded identifier"
                value={newBook.isbn}
                onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Initial Stock Count *</label>
              <input 
                type="number" 
                placeholder="Initial Stock Count"
                value={newBook.stock}
                onChange={(e) => setNewBook({...newBook, stock: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Plus size={14} />
              <span>Catalog Volume</span>
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* ISBN Lookup */}
            <div className="p-5 border border-border rounded-2xl bg-bg-main/30 space-y-3">
              <div className="flex items-center gap-2 text-text-primary">
                <Globe size={16} className="text-accent animate-pulse" />
                <h4 className="text-xs font-bold">1. Digital ISBN Metadata Fetcher</h4>
              </div>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Enter a 10 or 13 digit ISBN code. The system will query open digital databases to fetch title, author, and catalog information automatically.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 9788177091878"
                  value={isbnQuery}
                  onChange={(e) => setIsbnQuery(e.target.value)}
                  className="flex-1 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleIsbnLookup}
                  disabled={fetchingIsbn}
                  className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                >
                  {fetchingIsbn ? <RefreshCw className="animate-spin" size={12} /> : <Search size={12} />}
                  <span>Fetch Details</span>
                </button>
              </div>
              <p className="text-[9px] text-text-secondary">
                Try: <span className="font-mono text-accent cursor-pointer" onClick={() => setIsbnQuery('978-8177091878')}>978-8177091878</span> (Physics) or <span className="font-mono text-accent cursor-pointer" onClick={() => setIsbnQuery('978-8193328491')}>978-8193328491</span> (Maths).
              </p>
            </div>

            {/* Excel spreadsheet upload */}
            <div className="p-5 border border-border rounded-2xl bg-bg-main/30 space-y-4">
              <div className="flex items-center gap-2 text-text-primary">
                <FileSpreadsheet size={16} className="text-success" />
                <h4 className="text-xs font-bold">2. Excel/CSV Catalog Spreadsheet Parser</h4>
              </div>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Upload a spreadsheet table containing book records. Columns: <strong>Title, Author, Category, ISBN, Stock</strong>.
              </p>
              
              <input
                type="file"
                id="library-excel-input"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
              />
              
              <div
                onClick={() => document.getElementById('library-excel-input')?.click()}
                className="border border-dashed border-border rounded-xl p-6 text-center hover:border-accent/30 transition-all cursor-pointer bg-slate-50/50"
              >
                <Upload size={20} className="mx-auto mb-2 text-text-secondary" />
                <span className="text-[10px] text-text-secondary font-bold block">Choose Excel or CSV sheet</span>
                <span className="text-[9px] text-text-secondary opacity-60">Reads first sheet, header row ignored</span>
              </div>

              {parsedBooks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-primary">{parsedBooks.length} records parsed:</span>
                    <button
                      type="button"
                      onClick={() => setParsedBooks([])}
                      className="text-[9px] text-danger hover:underline font-bold"
                    >
                      Clear
                    </button>
                  </div>
                  
                  <div className="max-h-36 overflow-y-auto border border-border rounded-xl text-[10px] divide-y divide-border bg-white custom-scrollbar">
                    {parsedBooks.map((b, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between gap-4">
                        <div className="min-w-0">
                          <span className="font-bold text-text-primary truncate block">{b.title}</span>
                          <span className="text-text-secondary text-[9px] block">Author: {b.author} | Category: {b.category}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-text-secondary block">ISBN: {b.isbn}</span>
                          <span className="font-bold text-text-primary block">Stock: {b.stock}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleImportParsedBooks}
                    className="w-full py-3 bg-success hover:bg-success-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={13} />
                    <span>Import Parsed Books ({parsedBooks.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Issue Book Modal */}
      <Modal
        open={showIssueBookModal}
        onClose={() => setShowIssueBookModal(false)}
        title="Issue Book Circulation Desk"
        icon={<BookOpen size={18} />}
        size="md"
      >
        <form onSubmit={handleIssueBook} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Borrower *</label>
            <select
              value={newIssue.borrowerId}
              onChange={(e) => setNewIssue({...newIssue, borrowerId: e.target.value})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              required
            >
              <option value="">Choose borrower (student or staff)...</option>
              <optgroup label="Students">
                {tenantStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>
                ))}
              </optgroup>
              <optgroup label="Staff">
                {tenantStaff.map(st => (
                  <option key={st.id} value={st.id}>{st.first_name} {st.last_name} ({st.employee_id})</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Select Book Volume *</label>
            <select
              value={newIssue.bookId}
              onChange={(e) => setNewIssue({...newIssue, bookId: e.target.value})}
              className="w-full bg-bg-main border border-border rounded-xl py-3 px-3 text-xs text-text-primary"
              required
            >
              <option value="">Choose volume from stock...</option>
              {tenantBooks.map(b => (
                <option key={b.id} value={b.id} disabled={b.stock <= 0}>
                  {b.title} (Stock: {b.stock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Borrow Date *</label>
              <input 
                type="date" 
                value={newIssue.checkoutDate}
                onChange={(e) => setNewIssue({...newIssue, checkoutDate: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Return Due Date *</label>
              <input 
                type="date" 
                value={newIssue.dueDate}
                onChange={(e) => setNewIssue({...newIssue, dueDate: e.target.value})}
                className="w-full text-xs font-mono"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all mt-4 flex items-center justify-center gap-2"
          >
            <BookOpen size={16} />
            <span>Issue Volume</span>
          </button>
        </form>
      </Modal>

      {activeTab === 'returns' && (
        <div className="p-6 bg-bg-sidebar/55 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border rounded-3xl space-y-6">
          <h3 className="text-base font-black font-outfit text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Receipt size={16} className="text-accent" />
            <span>Active Circulations Ledger</span>
          </h3>
          
          {/* Bulk Reminder for overdue */}
          {activeRole !== 'STUDENT' && activeRole !== 'TEACHER' && tenantCirculations.filter(c => new Date() > new Date(c.dueDate)).length > 0 && (
            <button
              onClick={handleBulkReturnReminders}
              className="px-4 py-2 bg-danger hover:bg-danger/80 text-text-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 w-fit"
            >
              <BellRing size={12} />
              <span>Send Bulk Return Reminders ({tenantCirculations.filter(c => new Date() > new Date(c.dueDate)).length} overdue)</span>
            </button>
          )}

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase text-text-secondary tracking-widest">
                  <th className="pb-3">Book Title</th>
                  <th className="pb-3">Borrower</th>
                  <th className="pb-3">Issued Date</th>
                  <th className="pb-3">Due Return</th>
                  <th className="pb-3">Overdue Dues</th>
                  {activeRole !== 'STUDENT' && activeRole !== 'TEACHER' && <th className="pb-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantCirculations.map(c => {
                  const isOverdue = new Date() > new Date(c.dueDate);
                  const diffTime = Math.abs(new Date() - new Date(c.dueDate));
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const fine = isOverdue ? diffDays * 5 : 0;
                  
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 font-bold text-text-primary flex items-center gap-2">
                        <BookOpen size={14} className="text-accent" />
                        {getBookTitle(c.bookId)}
                      </td>
                      <td className="py-3.5 text-slate-700 font-semibold">{getBorrowerName(c.studentId)}</td>
                      <td className="py-3.5 font-mono text-text-secondary">{c.checkoutDate}</td>
                      <td className="py-3.5 font-mono text-text-secondary">{c.dueDate}</td>
                      <td className="py-3.5 font-mono font-bold">
                        {fine > 0 ? (
                          <span className="text-danger">₹{fine} Dues</span>
                        ) : (
                          <span className="text-success">₹0 Dues</span>
                        )}
                      </td>
                      {activeRole !== 'STUDENT' && activeRole !== 'TEACHER' && (
                        <td className="py-3.5 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            {isOverdue && (
                              <button
                                onClick={() => handleSendReturnReminder(c)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-warning/15 border border-border hover:border-warning/30 text-text-secondary hover:text-warning text-[10px] font-bold rounded-lg transition-all"
                              >
                                Remind
                              </button>
                            )}
                            <button
                              onClick={() => handleReturnBook(c.id)}
                              className="px-3.5 py-1.5 bg-success hover:bg-success-hover text-text-primary text-\[10px] font-bold rounded-lg transition-all"
                            >
                              Receive Return
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {tenantCirculations.length === 0 && (
            <p className="text-center py-6 text-xs text-text-secondary">No volumes currently checked out.</p>
          )}
        </div>
      )}
    </div>
  );
}
