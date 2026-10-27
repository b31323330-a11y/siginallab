import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Users, FileCheck, HelpCircle, 
  Check, Award, Download, MessageSquare, Star, Search, 
  Plus, Trash2, CheckCircle2, AlertCircle, Eye, Sparkles, 
  Filter, X, ChevronRight, RefreshCw, Layers, Calendar, 
  ClipboardList, Clock, Send, CheckCircle, XCircle, Info,
  BookOpen, Play, Upload, RotateCcw, ShieldAlert, GitCompare, 
  Save, FileSpreadsheet, Sliders
} from 'lucide-react';
import { KaTeXView } from '../components/KaTeXView';

export const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'attendance' | 'reports' | 'questions' | 'cms'>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ 
    total_students: 3, 
    total_reports: 0, 
    pending_reports: 0,
    total_questions: 100, 
    approved_questions: 0, 
    draft_questions: 0,
    average_system_score: 88.5,
    total_assignments: 3,
    overall_attendance_rate: 90.0
  });
  const [loading, setLoading] = useState(true);

  // Student search & Detail Modal
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  // --- CMS STATE (LAB CONTENT & KATEX & MATLAB CODE) ---
  const [selectedCmsLab, setSelectedCmsLab] = useState<number>(2);
  const [cmsTitle, setCmsTitle] = useState<string>('');
  const [cmsAim, setCmsAim] = useState<string>('');
  const [cmsTheory, setCmsTheory] = useState<string>('');
  const [cmsMatlab, setCmsMatlab] = useState<string>('');
  const [cmsCols, setCmsCols] = useState<string[]>([]);
  const [cmsRows, setCmsRows] = useState<any[]>([]);
  const [cmsLoading, setCmsLoading] = useState<boolean>(false);
  const [cmsSaving, setCmsSaving] = useState<boolean>(false);
  const [cmsSuccessMessage, setCmsSuccessMessage] = useState<string | null>(null);
  const [cmsRunLoading, setCmsRunLoading] = useState<boolean>(false);
  const [cmsRunOutput, setCmsRunOutput] = useState<string | null>(null);
  const [cmsPreviewMode, setCmsPreviewMode] = useState<'editor' | 'preview' | 'split'>('split');

  // --- CSV IMPORT STATE ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // --- PLAGIARISM & RETURN & RUBRIC STATE ---
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null);
  const [returnLoading, setReturnLoading] = useState(false);
  const [rubricScores, setRubricScores] = useState({
    completeness: 30,
    correctness: 30,
    analysis: 30,
    formatting: 10
  });

  // --- VAZIFALAR (ASSIGNMENTS) STATE ---
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [showAddAssignmentModal, setShowAddAssignmentModal] = useState(false);
  const [newAssignmentForm, setNewAssignmentForm] = useState({
    title: '',
    description: '',
    lab_number: 2,
    target_group: 'all',
    deadline: '',
    max_score: 100
  });
  const [selectedAssignmentForSubs, setSelectedAssignmentForSubs] = useState<any>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [selectedSubForGrading, setSelectedSubForGrading] = useState<any>(null);
  const [assignGradeInput, setAssignGradeInput] = useState<number>(95);
  const [assignFeedbackInput, setAssignFeedbackInput] = useState<string>('Yechim to\'g\'ri bajarilgan, a\'lo darajada!');

  // --- DAVOMAT (ATTENDANCE) STATE ---
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceGroup, setAttendanceGroup] = useState<string>('all');
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSavedSuccess, setAttendanceSavedSuccess] = useState(false);

  // --- HISOBOTLAR STATE ---
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [gradeInput, setGradeInput] = useState<number>(90);
  const [feedbackInput, setFeedbackInput] = useState<string>('Barcha hisob-kitoblar to\'g\'ri bajarilgan, talablarga muvofiq.');
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<any>(null);

  // Assignment AI review state
  const [assignAiReviewLoading, setAssignAiReviewLoading] = useState(false);
  const [assignAiReviewResult, setAssignAiReviewResult] = useState<any>(null);

  // --- SAVOLLAR BANKI STATE ---
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionLabFilter, setQuestionLabFilter] = useState<number | 'all'>('all');
  const [questionStatusFilter, setQuestionStatusFilter] = useState<'all' | 'ai_draft' | 'approved'>('all');
  const [questionSearch, setQuestionSearch] = useState('');
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    lab_number: 2,
    question_text: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_answer: '',
    explanation: ''
  });

  const loadData = () => {
    fetch('/api/teacher/students')
      .then(res => res.json())
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch('/api/teacher/reports')
      .then(res => res.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch('/api/teacher/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- LOAD ASSIGNMENTS ---
  const loadAssignments = () => {
    setAssignmentsLoading(true);
    fetch('/api/teacher/assignments')
      .then(res => res.json())
      .then(data => {
        setAssignments(Array.isArray(data) ? data : []);
        setAssignmentsLoading(false);
      })
      .catch(() => setAssignmentsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'assignments') {
      loadAssignments();
    }
  }, [activeTab]);

  // Create Assignment
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignmentForm.title || !newAssignmentForm.description) return;

    fetch('/api/teacher/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAssignmentForm)
    })
      .then(res => res.json())
      .then(() => {
        setShowAddAssignmentModal(false);
        setNewAssignmentForm({
          title: '',
          description: '',
          lab_number: 2,
          target_group: 'all',
          deadline: '',
          max_score: 100
        });
        loadAssignments();
        loadData();
      });
  };

  // View Submissions for Assignment
  const handleOpenSubmissions = (assign: any) => {
    setSelectedAssignmentForSubs(assign);
    setSubsLoading(true);
    fetch(`/api/teacher/assignments/${assign.id}/submissions`)
      .then(res => res.json())
      .then(data => {
        setAssignmentSubmissions(Array.isArray(data) ? data : []);
        setSubsLoading(false);
      })
      .catch(() => setSubsLoading(false));
  };

  // Grade Assignment Submission
  const handleGradeAssignmentSub = () => {
    if (!selectedSubForGrading) return;
    fetch(`/api/teacher/assignments/submissions/${selectedSubForGrading.id}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade: assignGradeInput,
        teacher_feedback: assignFeedbackInput
      })
    })
      .then(res => res.json())
      .then(() => {
        setAssignmentSubmissions(prev => 
          prev.map(s => s.id === selectedSubForGrading.id ? { ...s, grade: assignGradeInput, teacher_feedback: assignFeedbackInput, status: 'graded' } : s)
        );
        setSelectedSubForGrading(null);
        loadAssignments();
      });
  };

  // Delete Assignment
  const handleDeleteAssignment = (assignId: number) => {
    if (!window.confirm("Ushbu vazifani o'chirishni xohlaysizmi?")) return;
    fetch(`/api/teacher/assignments/${assignId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        setAssignments(prev => prev.filter(a => a.id !== assignId));
        loadData();
      });
  };

  // --- LOAD ATTENDANCE ---
  const loadAttendance = () => {
    setAttendanceLoading(true);
    fetch(`/api/teacher/attendance?date=${attendanceDate}&group_name=${attendanceGroup}`)
      .then(res => res.json())
      .then(data => {
        setAttendanceList(data.students || []);
        setAttendanceLoading(false);
      })
      .catch(() => setAttendanceLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance();
    }
  }, [activeTab, attendanceDate, attendanceGroup]);

  // Update Status in local attendance table
  const handleAttendanceChange = (userId: number, status: string, note?: string) => {
    setAttendanceList(prev => prev.map(item => {
      if (item.user_id === userId) {
        return {
          ...item,
          status,
          note: note !== undefined ? note : item.note
        };
      }
      return item;
    }));
  };

  // Save Attendance to Backend
  const handleSaveAttendance = () => {
    setAttendanceSaving(true);
    const records = attendanceList.map(a => ({
      user_id: a.user_id,
      status: a.status,
      note: a.note || ""
    }));

    fetch('/api/teacher/attendance/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_date: attendanceDate,
        lab_number: 2,
        records: records
      })
    })
      .then(res => res.json())
      .then(() => {
        setAttendanceSaving(false);
        setAttendanceSavedSuccess(true);
        setTimeout(() => setAttendanceSavedSuccess(false), 3000);
        loadData();
      })
      .catch(() => setAttendanceSaving(false));
  };

  // --- LOAD QUESTIONS ---
  const loadQuestions = () => {
    setQuestionsLoading(true);
    let url = `/api/teacher/questions?status=${questionStatusFilter}`;
    if (questionLabFilter !== 'all') {
      url += `&lab_number=${questionLabFilter}`;
    }
    if (questionSearch) {
      url += `&search=${encodeURIComponent(questionSearch)}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setQuestions(Array.isArray(data) ? data : []);
        setQuestionsLoading(false);
      })
      .catch(() => setQuestionsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestions();
    }
  }, [activeTab, questionLabFilter, questionStatusFilter]);

  // Open Student Full Profile
  const handleOpenStudentDetail = (studentId: number) => {
    setStudentLoading(true);
    fetch(`/api/teacher/students/${studentId}/progress`)
      .then(res => res.json())
      .then(data => {
        setSelectedStudentDetail(data);
        setStudentLoading(false);
      })
      .catch(() => setStudentLoading(false));
  };

  // Load CMS Lab data
  const loadCmsLab = (labNum: number) => {
    setCmsLoading(true);
    setCmsRunOutput(null);
    fetch(`/api/cms/labs/${labNum}`)
      .then(res => res.json())
      .then(data => {
        setCmsTitle(data.title || `№ ${labNum}-Laboratoriya`);
        setCmsAim(data.aim || '');
        setCmsTheory(data.theory_markdown || '');
        setCmsMatlab(data.matlab_sample || '');
        setCmsCols(data.variant_columns || ["Variant", "F1 (Hz)", "F2 (Hz)", "Amplituda"]);
        setCmsRows(data.variant_rows || []);
        setCmsLoading(false);
      })
      .catch(() => setCmsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'cms') {
      loadCmsLab(selectedCmsLab);
    }
  }, [activeTab, selectedCmsLab]);

  // Save CMS Lab
  const handleSaveCmsLab = () => {
    setCmsSaving(true);
    fetch(`/api/cms/labs/${selectedCmsLab}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: cmsTitle,
        aim: cmsAim,
        theory_markdown: cmsTheory,
        matlab_sample: cmsMatlab,
        variant_columns: cmsCols,
        variant_rows: cmsRows
      })
    })
      .then(res => res.json())
      .then(() => {
        setCmsSaving(false);
        setCmsSuccessMessage("Laboratoriya kontenti va KaTeX formulalari muvaffaqiyatli saqlandi!");
        setTimeout(() => setCmsSuccessMessage(null), 3500);
      })
      .catch(() => setCmsSaving(false));
  };

  // Run CMS MATLAB Starter Code Test
  const handleRunCmsMatlab = () => {
    setCmsRunLoading(true);
    setCmsRunOutput(">> MATLAB skripti tekshirilmoqda...");
    fetch('/api/dsp/execute_matlab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cmsMatlab })
    })
      .then(res => res.json())
      .then(data => {
        setCmsRunOutput(data.output || ">> Kod muvaffaqiyatli bajarildi (0 xatolik).");
        setCmsRunLoading(false);
      })
      .catch(err => {
        setCmsRunOutput(`>> Xatolik yuz berdi: ${err.message}`);
        setCmsRunLoading(false);
      });
  };

  // Import Students CSV
  const handleImportStudents = () => {
    if (!importCsvText.trim()) return;
    setImportLoading(true);
    
    // Parse CSV lines: "Full Name, email@domain.uz, group, variant"
    const lines = importCsvText.trim().split('\n');
    const parsedStudents: any[] = [];
    
    for (const line of lines) {
      const parts = line.split(/[,;\t]/).map(s => s.trim());
      if (parts.length >= 2 && parts[1].includes('@')) {
        parsedStudents.push({
          full_name: parts[0],
          email: parts[1],
          group_name: parts[2] || "210-22",
          variant_number: parts[3] ? parseInt(parts[3]) : undefined
        });
      }
    }

    if (parsedStudents.length === 0) {
      setImportMessage("Xato: Hech qanday to'g'ri formatdagi talaba ma'lumoti topilmadi. Format: Ism Familiya, email, guruh, variant");
      setImportLoading(false);
      return;
    }

    fetch('/api/teacher/students/import_csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: parsedStudents })
    })
      .then(res => res.json())
      .then(data => {
        setImportLoading(false);
        setImportMessage(data.message || `${parsedStudents.length} ta talaba import qilindi!`);
        loadData();
        setTimeout(() => {
          setShowImportModal(false);
          setImportMessage(null);
          setImportCsvText('');
        }, 2000);
      })
      .catch(err => {
        setImportLoading(false);
        setImportMessage(`Importda xatolik: ${err.message}`);
      });
  };

  // Plagiarism Check for Report
  const handleCheckPlagiarism = (reportId: number) => {
    setPlagiarismLoading(true);
    fetch(`/api/teacher/reports/${reportId}/plagiarism_check`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setPlagiarismResult(data);
        setPlagiarismLoading(false);
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, similarity_score: data.similarity_score, similarity_matches: data.matches } : r));
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport((prev: any) => ({ ...prev, similarity_score: data.similarity_score, similarity_matches: data.matches }));
        }
      })
      .catch(() => setPlagiarismLoading(false));
  };

  // Return Report for Revision
  const handleReturnReport = () => {
    if (!selectedReport) return;
    setReturnLoading(true);
    fetch(`/api/teacher/reports/${selectedReport.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: feedbackInput || "Hisobot talablarga to'liq javob bermadi, qayta ishlab topshiring." })
    })
      .then(res => res.json())
      .then(() => {
        setReturnLoading(false);
        setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, status: 'returned', teacher_feedback: feedbackInput } : r));
        setSelectedReport(null);
        loadData();
      })
      .catch(() => setReturnLoading(false));
  };

  // Open Report Review Modal
  const handleOpenReportReview = (rep: any) => {
    setSelectedReport(rep);
    setAiReviewResult(null);
    setPlagiarismResult(null);
    const existingRubric = rep.rubric_scores || { completeness: 30, correctness: 30, analysis: 30, formatting: 10 };
    setRubricScores(existingRubric);
    setGradeInput(rep.grade !== null && rep.grade !== undefined ? rep.grade : (existingRubric.completeness + existingRubric.correctness + existingRubric.analysis + existingRubric.formatting));
    setFeedbackInput(rep.teacher_feedback || 'Barcha hisob-kitoblar to\'g\'ri bajarilgan, talablarga muvofiq.');
  };

  // AI Review Auto-Evaluation
  const handleRunAiReview = () => {
    if (!selectedReport) return;
    setAiReviewLoading(true);
    fetch(`/api/teacher/reports/${selectedReport.id}/ai_review`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => {
        setAiReviewResult(data);
        if (data.suggested_grade !== undefined) {
          setGradeInput(data.suggested_grade);
        }
        if (data.suggested_feedback) {
          setFeedbackInput(data.suggested_feedback);
        }
        setAiReviewLoading(false);
      })
      .catch(() => setAiReviewLoading(false));
  };

  // Assignment AI Review
  const handleRunAssignAiReview = (subId: number) => {
    setAssignAiReviewLoading(true);
    fetch(`/api/teacher/assignments/submissions/${subId}/ai_review`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => {
        setAssignAiReviewResult(data);
        if (data.suggested_grade !== undefined) {
          setAssignGradeInput(data.suggested_grade);
        }
        if (data.suggested_feedback) {
          setAssignFeedbackInput(data.suggested_feedback);
        }
        setAssignAiReviewLoading(false);
      })
      .catch(() => setAssignAiReviewLoading(false));
  };

  // Submit Report Grade
  const handleGradeSubmit = () => {
    if (!selectedReport) return;
    fetch(`/api/teacher/reports/${selectedReport.id}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade: gradeInput,
        teacher_feedback: feedbackInput,
        rubric_scores: rubricScores
      })
    })
      .then(res => res.json())
      .then(() => {
        setReports(prev => prev.map(r => r.id === selectedReport.id ? { ...r, grade: gradeInput, teacher_feedback: feedbackInput, status: 'graded', rubric_scores: rubricScores } : r));
        setSelectedReport(null);
        loadData();
      });
  };

  // Approve Question
  const handleApproveQuestion = (qId: number) => {
    fetch(`/api/teacher/questions/${qId}/approve`, { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, status: 'approved' } : q));
        loadData();
      });
  };

  // Delete Question
  const handleDeleteQuestion = (qId: number) => {
    if (!window.confirm("Ushbu savolni o'chirmoqchimisiz?")) return;
    fetch(`/api/teacher/questions/${qId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        setQuestions(prev => prev.filter(q => q.id !== qId));
        loadData();
      });
  };

  // Create Question
  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionForm.question_text || !newQuestionForm.option1) return;

    const options = [
      newQuestionForm.option1,
      newQuestionForm.option2,
      newQuestionForm.option3,
      newQuestionForm.option4
    ].filter(o => o.trim().length > 0);

    const body = {
      lab_number: Number(newQuestionForm.lab_number),
      question_text: newQuestionForm.question_text,
      question_type: 'mcq',
      options: options,
      correct_answer: newQuestionForm.correct_answer || options[0],
      explanation: newQuestionForm.explanation || "Nazariy qoidaga muvofiq to'g'ri javob.",
      status: 'approved'
    };

    fetch('/api/teacher/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(newQ => {
        setQuestions(prev => [newQ, ...prev]);
        setShowAddQuestionModal(false);
        setNewQuestionForm({
          lab_number: 2,
          question_text: '',
          option1: '',
          option2: '',
          option3: '',
          option4: '',
          correct_answer: '',
          explanation: ''
        });
        loadData();
      });
  };

  // Download CSV
  const handleDownloadCSV = () => {
    window.location.href = '/api/teacher/export/csv';
  };

  // Filter students
  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.group_name && s.group_name.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  // Filter reports
  const filteredReports = reports.filter(r => {
    if (reportFilter === 'pending') return r.grade === null || r.grade === undefined;
    if (reportFilter === 'graded') return r.grade !== null && r.grade !== undefined;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                O'qituvchi va Nazoratchi Paneli
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold">
                Kafedra
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Talabalarga vazifalar yuklash, davomatni qayd etish, barcha ma'lumotlarni ko'rish va hisobotlarni baholash
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Baholar va Davomat Jurnali (CSV)</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Ro'yxatdagi talabalar</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_students} nafar</div>
        </div>
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Yuklangan vazifalar</span>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total_assignments || 3} ta</div>
        </div>
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Hisobotlar</span>
            {stats.pending_reports > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                {stats.pending_reports} yangi
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-matlab-blue">{reports.length} ta</div>
        </div>
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium">Umumiy davomat</span>
          <div className="text-2xl font-bold text-green-500">{stats.overall_attendance_rate || 90}%</div>
        </div>
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm col-span-2 md:col-span-1">
          <span className="text-[11px] text-slate-400 font-medium">O'rtacha o'zlashtirish</span>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.average_system_score}%</div>
        </div>
      </div>

      {/* 5 Asosiy Tablar Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'students' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Talabalar Jurnali ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'assignments' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Vazifalar Yuklash va Baholash</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'attendance' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Davomat Jurnali</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'reports' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Topshirilgan Hisobotlar ({reports.length})</span>
          {stats.pending_reports > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'questions' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Nazorat Savollari Banki</span>
        </button>

        <button
          onClick={() => setActiveTab('cms')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'cms' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Laboratoriya CMS (Nazariya & MATLAB)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: TALABALAR JURNALI & TO'LIQ MA'LUMOTLARI */}
      {/* ======================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Talaba F.I.Sh. yoki guruh bo'yicha qidirish..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Talabalarni import qilish (CSV)</span>
              </button>
              <span className="text-xs text-slate-400">
                Jami: {filteredStudents.length} nafar
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-6 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Talaba F.I.Sh.</th>
                  <th className="p-3.5">Guruh</th>
                  <th className="p-3.5">Variant</th>
                  <th className="p-3.5">Davomat</th>
                  <th className="p-3.5">Bajarilgan lablar</th>
                  <th className="p-3.5">O'rtacha ball</th>
                  <th className="p-3.5 text-right rounded-r-xl">Barcha ma'lumotlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{s.full_name}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{s.group_name}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-bold">
                        № {s.variant_number}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        (s.attendance_rate || 100) >= 80 
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>
                        {s.attendance_rate || 100}%
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {s.completed_labs} / 20 ta
                    </td>
                    <td className="p-3.5 font-bold text-green-600 dark:text-green-400">
                      {s.average_score} ball
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleOpenStudentDetail(s.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>To'liq ko'rish</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: VAZIFALAR BOSHQARUVI (ASSIGNMENTS) */}
      {/* ======================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Talabalarga Vazifalar Yuklash va Topshiriqlar Boshqaruvi
              </h3>
              <p className="text-xs text-slate-400">
                Guruhlar yoki barcha talabalar uchun maxsus amaliy vazifalar, hisob-kitoblar va muddatlarni belgilang
              </p>
            </div>

            <button
              onClick={() => setShowAddAssignmentModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Vazifa Yuklash</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignmentsLoading ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-xs">Yuklanmoqda...</div>
            ) : assignments.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-xs">Hozircha vazifalar yuklanmagan.</div>
            ) : (
              assignments.map((a) => (
                <div key={a.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-bold">
                        {a.lab_number ? `№ ${a.lab_number}-Lab mavzusi` : "Umumiy vazifa"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-semibold">
                        Guruh: {a.target_group === 'all' ? "Barchasi" : a.target_group}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {a.title}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {a.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Muddat: {a.deadline || "Belgilanmagan"}</span>
                      </div>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        Maks: {a.max_score} ball
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => handleOpenSubmissions(a)}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Javoblarni ko'rish ({a.total_submissions})</span>
                      </button>

                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: DAVOMAT JURNALI (ATTENDANCE) */}
      {/* ======================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dars sanasi:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Guruh:</span>
                <select
                  value={attendanceGroup}
                  onChange={(e) => setAttendanceGroup(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">Barcha guruhlar</option>
                  <option value="210-22">210-22 guruhi</option>
                  <option value="211-22">211-22 guruhi</option>
                </select>
              </div>

              <button
                onClick={loadAttendance}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700"
                title="Yangilash"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {attendanceSavedSuccess && (
                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Saqlandi!
                </span>
              )}
              <button
                onClick={handleSaveAttendance}
                disabled={attendanceSaving}
                className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 active:scale-95 transition-all"
              >
                {attendanceSaving ? "Saqlanmoqda..." : "Davomatni Saqlash"}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-x-auto">
            {attendanceLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Yuklanmoqda...</div>
            ) : attendanceList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">Talabalar topilmadi.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Talaba F.I.Sh.</th>
                    <th className="p-3.5">Guruh</th>
                    <th className="p-3.5">Variant</th>
                    <th className="p-3.5 text-center">Davomat Holati (Tanlang)</th>
                    <th className="p-3.5 rounded-r-xl">O'qituvchi Izohi (Sabab/Eslatma)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendanceList.map((item) => (
                    <tr key={item.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                        {item.student_name}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{item.group_name}</td>
                      <td className="p-3.5 font-bold text-amber-500">№ {item.variant_number}</td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(item.user_id, 'present')}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                              item.status === 'present'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-green-50'
                            }`}
                          >
                            Kelgan
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(item.user_id, 'absent')}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                              item.status === 'absent'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50'
                            }`}
                          >
                            Kelmagan
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceChange(item.user_id, 'excused')}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                              item.status === 'excused'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50'
                            }`}
                          >
                            Sababli
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <input
                          type="text"
                          placeholder="Izoh yozish (ixtiyoriy)..."
                          value={item.note || ''}
                          onChange={(e) => handleAttendanceChange(item.user_id, item.status, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: TOPSHIRILGAN HISOBOTLAR */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReportFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  reportFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Barchasi ({reports.length})
              </button>
              <button
                onClick={() => setReportFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  reportFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Kutilayotganlar ({reports.filter(r => r.grade === null || r.grade === undefined).length})
              </button>
              <button
                onClick={() => setReportFilter('graded')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  reportFilter === 'graded' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Baholanganlar ({reports.filter(r => r.grade !== null && r.grade !== undefined).length})
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            {filteredReports.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Ushbu bo'limda hisobotlar mavjud emas.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-300 dark:hover:border-purple-900 transition-colors">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{rep.student_name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {rep.group_name} • {rep.student_variant}-variant
                        </span>
                        {rep.status === 'returned' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                            Qaytarilgan (Qayta ishlashga)
                          </span>
                        )}
                        {rep.similarity_score !== undefined && rep.similarity_score !== null && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            rep.similarity_score > 30 
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }`}>
                            Plagiat: {rep.similarity_score}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        № {rep.lab_number}-laboratoriya mashg'uloti hisoboti • Topshirilgan sana: {rep.submitted_at}
                      </p>
                      {rep.teacher_feedback && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 italic">
                          "Taqriz: {rep.teacher_feedback}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {rep.grade !== null && rep.grade !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-bold text-xs">
                            Baholandi: {rep.grade} ball
                          </span>
                          <button
                            onClick={() => handleOpenReportReview(rep)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            title="Qayta baholash / Ko'rish"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenReportReview(rep)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ko'rish va Baholash</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: NAZORAT SAVOLLARI BANKI */}
      {/* ======================================================== */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={questionLabFilter}
                onChange={(e) => setQuestionLabFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none"
              >
                <option value="all">Barcha laboratoriyalar</option>
                {Array.from({ length: 20 }, (_, i) => i + 2).map(n => (
                  <option key={n} value={n}>{n}-amaliy mashg'ulot</option>
                ))}
              </select>

              <select
                value={questionStatusFilter}
                onChange={(e) => setQuestionStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none"
              >
                <option value="all">Barcha holatlar</option>
                <option value="ai_draft">AI Qoralama (Tasdiqlanmagan)</option>
                <option value="approved">Tasdiqlangan savollar</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Savol matni bo'yicha qidirish..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadQuestions()}
                  className="pl-8 pr-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                />
              </div>

              <button
                onClick={loadQuestions}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                title="Yangilash"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowAddQuestionModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Savol Qo'shish</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            {questionsLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Yuklanmoqda...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">Savollar topilmadi.</div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 hover:border-purple-300 dark:hover:border-purple-900 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                            {q.lab_number}-laboratoriya
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            q.status === 'approved' 
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {q.status === 'approved' ? "Tasdiqlangan" : "AI Qoralama"}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white pt-1">
                          {q.question_text}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {q.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveQuestion(q.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Tasdiqlash</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      {(q.options || []).map((opt: string, idx: number) => {
                        const isCorrect = opt.trim() === q.correct_answer.trim();
                        return (
                          <div 
                            key={idx} 
                            className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                              isCorrect 
                                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 font-semibold' 
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span>{opt}</span>
                            {isCorrect && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Izoh: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: LABORATORIYA CMS (NAZARIYA, LATEX, MATLAB KODI) */}
      {/* ======================================================== */}
      {activeTab === 'cms' && (
        <div className="space-y-6">
          {/* Header & Lab Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Laboratoriya Kontenti va Formulalar Muharriri (CMS)
                </h2>
                <p className="text-xs text-slate-400">
                  Nazariya matnlari, KaTeX ($...$, $$...$$) formulalari, boshlang'ich MATLAB shablon kodlari va variantlar jadvalini tahrirlash
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCmsLab}
                onChange={(e) => setSelectedCmsLab(Number(e.target.value))}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-purple-600 dark:text-purple-400 focus:outline-none"
              >
                {Array.from({ length: 20 }, (_, i) => i + 2).map((num) => (
                  <option key={num} value={num}>№ {num}-Laboratoriya mashg'uloti</option>
                ))}
              </select>

              <button
                onClick={handleSaveCmsLab}
                disabled={cmsSaving || cmsLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{cmsSaving ? "Saqlanmoqda..." : "O'zgarishlarni Saqlash"}</span>
              </button>
            </div>
          </div>

          {cmsSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cmsSuccessMessage}</span>
            </div>
          )}

          {cmsLoading ? (
            <div className="text-center py-20 text-slate-400 text-xs">Laboratoriya kontenti yuklanmoqda...</div>
          ) : (
            <div className="space-y-6">
              {/* Lab Title & Aim Inputs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Mashg'ulot Nomi:
                    </label>
                    <input
                      type="text"
                      value={cmsTitle}
                      onChange={(e) => setCmsTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Mashg'ulot Maqsadi:
                    </label>
                    <input
                      type="text"
                      value={cmsAim}
                      onChange={(e) => setCmsAim(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 1. Theory Markdown & KaTeX Preview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <span>1. Nazariya Matni va KaTeX Formulalari (Markdown)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      LaTeX formulalari uchun inline: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"$f_s \\ge 2 f_{max}$"}</code> yoki blok: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"$$...$$"}</code> ishlating.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setCmsPreviewMode('editor')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${cmsPreviewMode === 'editor' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-500'}`}
                    >
                      Muharrir
                    </button>
                    <button
                      onClick={() => setCmsPreviewMode('split')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${cmsPreviewMode === 'split' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-500'}`}
                    >
                      Teng (Split)
                    </button>
                    <button
                      onClick={() => setCmsPreviewMode('preview')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${cmsPreviewMode === 'preview' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-500'}`}
                    >
                      Jonli Preview
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(cmsPreviewMode === 'editor' || cmsPreviewMode === 'split') && (
                    <div>
                      <textarea
                        rows={14}
                        value={cmsTheory}
                        onChange={(e) => setCmsTheory(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 font-mono text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nazariya matnini Markdown formatida yozing..."
                      />
                    </div>
                  )}

                  {(cmsPreviewMode === 'preview' || cmsPreviewMode === 'split') && (
                    <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 max-h-[360px] overflow-y-auto space-y-3 text-xs leading-relaxed">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Jonli Ko'rinish (Preview):
                      </div>
                      <div className="prose dark:prose-invert max-w-none text-xs whitespace-pre-wrap font-sans">
                        {cmsTheory.split('\n\n').map((paragraph, pIdx) => {
                          if (paragraph.startsWith('$$') && paragraph.endsWith('$$')) {
                            const math = paragraph.slice(2, -2).trim();
                            return <KaTeXView key={pIdx} math={math} block={true} />;
                          }
                          return (
                            <p key={pIdx} className="leading-relaxed">
                              {paragraph}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Starter MATLAB Code & Test Execution */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Play className="w-4 h-4 text-purple-600" />
                      <span>2. Boshlang'ich MATLAB Kodi (Talabaga beriladigan shablon)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Talaba laboratoriyani ochganda birinchi ko'radigan dastur kodi va test sinovi
                    </p>
                  </div>

                  <button
                    onClick={handleRunCmsMatlab}
                    disabled={cmsRunLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all shrink-0"
                  >
                    <Play className={`w-3.5 h-3.5 ${cmsRunLoading ? 'animate-spin' : ''}`} />
                    <span>{cmsRunLoading ? "Bajarilmoqda..." : "Ishga tushirib sinash (Test Run)"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <textarea
                      rows={10}
                      value={cmsMatlab}
                      onChange={(e) => setCmsMatlab(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-slate-950 text-cyan-300 font-mono text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="% MATLAB dastur kodini kiriting..."
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono max-h-56 overflow-y-auto space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Natijaviy Chiqish (Terminal Console):</span>
                      {cmsRunOutput && <span className="text-emerald-400">Tugallandi</span>}
                    </div>
                    <pre className="text-slate-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                      {cmsRunOutput || ">> 'Ishga tushirib sinash' tugmasi bosilganda bu yerda MATLAB/DSP bajarilish natijasi aks etadi."}
                    </pre>
                  </div>
                </div>
              </div>

              {/* 3. Variant Table Editor */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                      <span>3. Variantlar Jadvali (20 ta Variant Parametrlari)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Har bir talabaning individual variant parametrlari
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                      <tr>
                        {cmsCols.map((col, idx) => (
                          <th key={idx} className="p-3 font-bold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cmsRows && cmsRows.length > 0 ? (
                        cmsRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            {cmsCols.map((col, cIdx) => (
                              <td key={cIdx} className="p-2.5 font-mono text-[11px]">
                                {row[col] !== undefined ? String(row[col]) : (cIdx === 0 ? `№ ${rIdx + 1}` : '-')}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        Array.from({ length: 20 }, (_, i) => i + 1).map((vNum) => (
                          <tr key={vNum} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold text-purple-600">№ {vNum}</td>
                            <td className="p-2.5 font-mono">{10 + vNum * 2} Hz</td>
                            <td className="p-2.5 font-mono">{50 + vNum * 5} Hz</td>
                            <td className="p-2.5 font-mono">{(0.5 + (vNum % 5) * 0.2).toFixed(1)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: TALABA TO'LIQ MA'LUMOTLARI VA PROFILI */}
      {/* ======================================================== */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base">
                  {selectedStudentDetail.student.full_name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {selectedStudentDetail.student.full_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Email: {selectedStudentDetail.student.email} • Guruh: {selectedStudentDetail.student.group_name} • Variant: № {selectedStudentDetail.student.variant_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Davomat ko'rsatkichi</span>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {selectedStudentDetail.attendance_summary?.rate}%
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Bajarilgan lablar</span>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {selectedStudentDetail.labs.filter((l: any) => l.status === 'completed').length} / 20 ta
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Topshirilgan vazifalar</span>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {selectedStudentDetail.assignments?.length || 0} ta
                </div>
              </div>
            </div>

            {/* 20 ta laboratoriyalar kartochkasi */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Laboratoriya Mashg'ulotlari (2–21)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {selectedStudentDetail.labs.map((l: any) => (
                  <div
                    key={l.lab_number}
                    className={`p-2.5 rounded-2xl border text-xs space-y-1 ${
                      l.status === 'completed'
                        ? 'bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                        : l.status === 'in_progress'
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between text-[11px]">
                      <span>№ {l.lab_number}-Lab</span>
                      {l.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {l.status === 'completed' ? `Ball: ${l.score}` : l.status === 'in_progress' ? "Jarayonda" : "Boshlanmagan"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Topshirilgan Vazifalar */}
            {selectedStudentDetail.assignments && selectedStudentDetail.assignments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Topshirilgan Vazifalar Javoblari
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedStudentDetail.assignments.map((as: any) => (
                    <div key={as.submission_id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{as.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Javob: "{as.solution_text.slice(0, 70)}..."</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {as.grade !== null ? `${as.grade} ball` : "Baholanmagan"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: YANGI VAZIFA YUKLASH */}
      {/* ======================================================== */}
      {showAddAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateAssignment}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                <span>Talabalarga Yangi Vazifa Yuklash</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAssignmentModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Vazifa mavzusi (nomi):
                </label>
                <input
                  required
                  type="text"
                  placeholder="Masalan: 1D signalni filtrlash va spektrini hisoblash"
                  value={newAssignmentForm.title}
                  onChange={(e) => setNewAssignmentForm({ ...newAssignmentForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Vazifa matni va shartlari:
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Topshiriq yo'riqnomasi, kutilayotgan natijalar va hisoblash talablarini yozing..."
                  value={newAssignmentForm.description}
                  onChange={(e) => setNewAssignmentForm({ ...newAssignmentForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tegishli laboratoriya:
                  </label>
                  <select
                    value={newAssignmentForm.lab_number}
                    onChange={(e) => setNewAssignmentForm({ ...newAssignmentForm, lab_number: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 2).map(n => (
                      <option key={n} value={n}>{n}-amaliy mashg'ulot</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mo'ljallangan guruh:
                  </label>
                  <select
                    value={newAssignmentForm.target_group}
                    onChange={(e) => setNewAssignmentForm({ ...newAssignmentForm, target_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <option value="all">Barcha guruhlar</option>
                    <option value="210-22">210-22 guruhi</option>
                    <option value="211-22">211-22 guruhi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Topshirish muddati (Deadline):
                  </label>
                  <input
                    type="date"
                    value={newAssignmentForm.deadline}
                    onChange={(e) => setNewAssignmentForm({ ...newAssignmentForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Maksimal ball:
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={newAssignmentForm.max_score}
                    onChange={(e) => setNewAssignmentForm({ ...newAssignmentForm, max_score: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-purple-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddAssignmentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20"
              >
                Vazifani Joylash
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: VAZIFA TOPSHIRIQLARINI KO'RISH VA BAHOLASH */}
      {/* ======================================================== */}
      {selectedAssignmentForSubs && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  "{selectedAssignmentForSubs.title}" — Topshirilgan Javoblar
                </h3>
                <p className="text-xs text-slate-400">
                  Maksimal ball: {selectedAssignmentForSubs.max_score} • Muddat: {selectedAssignmentForSubs.deadline || "Belgilanmagan"}
                </p>
              </div>
              <button
                onClick={() => setSelectedAssignmentForSubs(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {subsLoading ? (
                <div className="text-center py-8 text-slate-400 text-xs">Yuklanmoqda...</div>
              ) : assignmentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">Ushbu vazifaga hali hech kim javob topshirmagan.</div>
              ) : (
                assignmentSubmissions.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{sub.student_name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {sub.group_name} • {sub.student_variant}-variant
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{sub.submitted_at}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                      {sub.solution_text}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {sub.grade !== null ? (
                        <div className="text-xs font-bold text-green-600">
                          Baholandi: {sub.grade} ball ({sub.teacher_feedback || "Izohsiz"})
                        </div>
                      ) : (
                        <span className="text-xs text-amber-500 font-semibold">Baholash kutilmoqda</span>
                      )}

                      <button
                        onClick={() => {
                          setSelectedSubForGrading(sub);
                          setAssignAiReviewResult(null);
                          setAssignGradeInput(sub.grade || 85);
                          setAssignFeedbackInput(sub.teacher_feedback || "Vazifa to'g'ri bajarilgan.");
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
                      >
                        {sub.grade !== null ? "Qayta baholash" : "Baholash"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Baholash oynasi */}
      {selectedSubForGrading && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedSubForGrading.student_name} javobini baholash
                </h4>
                <p className="text-[11px] text-slate-400">
                  {selectedSubForGrading.group_name} • {selectedSubForGrading.student_variant}-variant
                </p>
              </div>
              <button
                onClick={() => setSelectedSubForGrading(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Review Action for Assignment */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-200 dark:border-purple-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>AI Vazifa Tahlili</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRunAssignAiReview(selectedSubForGrading.id)}
                  disabled={assignAiReviewLoading}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  <Sparkles className={`w-3 h-3 ${assignAiReviewLoading ? 'animate-spin' : ''}`} />
                  <span>{assignAiReviewLoading ? "Tahlil qilinmoqda..." : "Avtomatik Tavsiya Olish"}</span>
                </button>
              </div>

              {assignAiReviewResult && (
                <div className="mt-2 pt-2 border-t border-purple-200/60 dark:border-purple-800/60 space-y-1.5 text-[11px]">
                  <div className="font-bold text-purple-600 dark:text-purple-400">
                    Tavsiya etilgan ball: {assignAiReviewResult.suggested_grade}
                  </div>
                  {assignAiReviewResult.points?.map((pt: string, idx: number) => (
                    <div key={idx} className="text-slate-600 dark:text-slate-300">
                      {pt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Ball:
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={assignGradeInput}
                onChange={(e) => setAssignGradeInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-purple-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                O'qituvchi taqrizi va izohi:
              </label>
              <textarea
                rows={3}
                value={assignFeedbackInput}
                onChange={(e) => setAssignFeedbackInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedSubForGrading(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleGradeAssignmentSub}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-600/20"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: HISOBOTNI KO'RISH VA AI REVIEW BILAN BAHOLASH */}
      {/* ======================================================== */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  № {selectedReport.lab_number}-Laboratoriya Hisoboti Tekshiruvi
                </h3>
                <p className="text-xs text-slate-400">
                  Talaba: {selectedReport.student_name} ({selectedReport.group_name}) • {selectedReport.student_variant}-variant
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Talabaning Ilmiy Xulosasi:
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {selectedReport.content?.conclusion || "Talaba tomonidan xulosa kiritilmagan."}
              </p>

              {selectedReport.content?.metrics && Object.keys(selectedReport.content.metrics).length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    O'lchangan Natijaviy Metrikalar:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedReport.content.metrics).map(([key, val]: any) => (
                      <span key={key} className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-mono text-[11px]">
                        {key}: {typeof val === 'number' ? val.toFixed(2) : String(val)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Review Section */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-200 dark:border-purple-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      AI Intellektual Tekshiruv & Baholash
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Metrikalar, ilmiy xulosa va dastur kodini etalonga solishtirib tekshirish
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRunAiReview}
                  disabled={aiReviewLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiReviewLoading ? 'animate-spin' : ''}`} />
                  <span>{aiReviewLoading ? "Tahlil qilinmoqda..." : "Avtomatik Tavsiya Olish"}</span>
                </button>
              </div>

              {/* Rubric and Detailed Breakdown Display */}
              {aiReviewResult && (
                <div className="mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/60 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/50 shadow-sm">
                      <div className="text-[10px] text-slate-400 font-medium">1. Metrikalar</div>
                      <div className="text-sm font-extrabold text-purple-600 dark:text-purple-400">
                        {aiReviewResult.rubric?.metrics_score} / 40
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/50 shadow-sm">
                      <div className="text-[10px] text-slate-400 font-medium">2. MATLAB Kodi</div>
                      <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                        {aiReviewResult.rubric?.code_score} / 30
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/50 shadow-sm">
                      <div className="text-[10px] text-slate-400 font-medium">3. Ilmiy Xulosa</div>
                      <div className={`text-sm font-extrabold ${
                        (aiReviewResult.rubric?.conclusion_score || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                      }`}>
                        {aiReviewResult.rubric?.conclusion_score} / 30
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-purple-100 dark:border-purple-900/40 text-[11px] shadow-sm">
                    <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>AI Tahliliy Xulosasi va Asoslari:</span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">
                        Hisoblangan ball: {aiReviewResult.suggested_grade}
                      </span>
                    </div>
                    {aiReviewResult.points?.map((pt: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Plagiarism / Similarity Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Hisobotlar O'rtasida Plagiat & O'xshashlik Tekshiruvi
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckPlagiarism(selectedReport.id)}
                  disabled={plagiarismLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                >
                  <GitCompare className={`w-3.5 h-3.5 ${plagiarismLoading ? 'animate-spin' : ''}`} />
                  <span>{plagiarismLoading ? "Tekshirilmoqda..." : "Plagiatni Tekshirish"}</span>
                </button>
              </div>

              {selectedReport.similarity_score !== undefined && selectedReport.similarity_score !== null && (
                <div className="pt-1 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">O'xshashlik ko'rsatkichi:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                      selectedReport.similarity_score > 30 ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'
                    }`}>
                      {selectedReport.similarity_score}% o'xshashlik
                    </span>
                  </div>
                  {selectedReport.similarity_matches && selectedReport.similarity_matches.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      <div className="font-bold text-slate-700 dark:text-slate-300">Mos tushgan hisobotlar:</div>
                      {selectedReport.similarity_matches.map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-500">
                          <span>Talaba ID #{m.matched_user_id} ({m.student_variant}-variant)</span>
                          <span className="font-mono font-bold text-rose-500">{m.similarity_pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rubric Evaluation Sliders */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  <span>Rubrika bo'yicha baholash (4 ta mezon)</span>
                </span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  Jami: {gradeInput} / 100 ball
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 dark:text-slate-400">1. Topshiriq to'liqligi va barcha topshiriqlar bajarilganligi:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{rubricScores.completeness} / 30</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={rubricScores.completeness}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const updated = { ...rubricScores, completeness: v };
                      setRubricScores(updated);
                      setGradeInput(v + updated.correctness + updated.analysis + updated.formatting);
                    }}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 dark:text-slate-400">2. Hisob-kitoblar va MATLAB dastur kodi to'g'riligi:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{rubricScores.correctness} / 30</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={rubricScores.correctness}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const updated = { ...rubricScores, correctness: v };
                      setRubricScores(updated);
                      setGradeInput(updated.completeness + v + updated.analysis + updated.formatting);
                    }}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 dark:text-slate-400">3. Ilmiy tahlil, xulosalar va DSP qonuniyatlariga bog'liqlik:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{rubricScores.analysis} / 30</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={rubricScores.analysis}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const updated = { ...rubricScores, analysis: v };
                      setRubricScores(updated);
                      setGradeInput(updated.completeness + updated.correctness + v + updated.formatting);
                    }}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 dark:text-slate-400">4. Hisobot formatlashi va qoidalariga rioya qilinganligi:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{rubricScores.formatting} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={rubricScores.formatting}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const updated = { ...rubricScores, formatting: v };
                      setRubricScores(updated);
                      setGradeInput(updated.completeness + updated.correctness + updated.analysis + v);
                    }}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Baho (0 dan 100 ballgacha):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  O'qituvchi Taqrizi va Tavsiyalari:
                </label>
                <textarea
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleReturnReport}
                disabled={returnLoading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${returnLoading ? 'animate-spin' : ''}`} />
                <span>{returnLoading ? "Qaytarilmoqda..." : "Qayta ishlashga qaytarish"}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleGradeSubmit}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20"
                >
                  Baholashni Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: YANGI SAVOL QO'SHISH */}
      {/* ======================================================== */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateQuestion}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Yangi Nazorat Savoli Qo'shish
              </h3>
              <button
                type="button"
                onClick={() => setShowAddQuestionModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Laboratoriya raqami:
                </label>
                <select
                  value={newQuestionForm.lab_number}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, lab_number: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n}-amaliy mashg'ulot</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Savol matni:
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Masalan: Kotelnikov teoremasiga ko'ra diskretlash chastotasi qanday bo'lishi kerak?"
                  value={newQuestionForm.question_text}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question_text: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  To'g'ri javob varianti:
                </label>
                <input
                  required
                  type="text"
                  placeholder="To'g'ri javobni yozing"
                  value={newQuestionForm.option1}
                  onChange={(e) => setNewQuestionForm({ 
                    ...newQuestionForm, 
                    option1: e.target.value,
                    correct_answer: e.target.value 
                  })}
                  className="w-full px-3 py-2 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-300 dark:border-green-800 text-green-900 dark:text-green-300 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Noto'g'ri variant 2:
                </label>
                <input
                  required
                  type="text"
                  value={newQuestionForm.option2}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, option2: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Noto'g'ri variant 3:
                </label>
                <input
                  type="text"
                  value={newQuestionForm.option3}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, option3: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Noto'g'ri variant 4:
                </label>
                <input
                  type="text"
                  value={newQuestionForm.option4}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, option4: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Ilmiy izoh / Formula tushuntirishi:
                </label>
                <textarea
                  rows={2}
                  value={newQuestionForm.explanation}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, explanation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddQuestionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20"
              >
                Saqlash va Tasdiqlash
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: TALABALARNI BULK IMPORT QILISH (CSV) */}
      {/* ======================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>Talabalarni ommaviy import qilish (CSV)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ro'yxatni nusxalab (Ctrl+V) joylashtiring
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] space-y-1">
                <div className="font-bold text-slate-700 dark:text-slate-200">Kiritish formati (har bir qator bitta talaba):</div>
                <div className="font-mono text-purple-600 dark:text-purple-400">
                  Ism Familiya, email@domain.uz, guruh, variant
                </div>
                <div className="text-slate-400 pt-1">
                  Masalan:<br />
                  Aliyev Vali, valiyev@signallab.uz, 210-22, 1<br />
                  Sobirova Zarina, zarina@signallab.uz, 210-22, 2
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  CSV / Ro'yxat matni:
                </label>
                <textarea
                  rows={8}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="Aliyev Vali, valiyev@signallab.uz, 210-22, 1&#10;Sobirova Zarina, zarina@signallab.uz, 210-22, 2"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {importMessage && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  importMessage.includes('Xato') ? 'bg-red-50 text-red-600 dark:bg-red-950/30' : 'bg-green-50 text-green-600 dark:bg-green-950/30'
                }`}>
                  {importMessage}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleImportStudents}
                disabled={importLoading || !importCsvText.trim()}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
              >
                {importLoading ? "Yuklanmoqda..." : "Importni Boshlash"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
