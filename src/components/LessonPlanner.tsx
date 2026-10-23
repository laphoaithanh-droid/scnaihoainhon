import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Student, PlanDocument } from '../types';
import {
  Calendar,
  Sparkles,
  FileText,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  UserCheck,
  Flag,
  ListTodo,
  TrendingUp,
  Upload,
  Download,
  FolderPlus,
  ExternalLink,
  Trash2,
  Presentation,
  FileCode,
  File,
  Database,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';
import { generateAssemblyScript } from '../services/geminiService';

export const LessonPlanner: React.FC = () => {
  const { students, generateWeeklyDigest, plans, addPlan, deletePlan } = useApp();
  const [activeTab, setActiveTab] = useState<'assembly' | 'intervention' | 'calendar' | 'plans'>('assembly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weekNumber, setWeekNumber] = useState(10);

  // SKILL pptx-official: Presentation Slides Mode State
  const [showSlidesModal, setShowSlidesModal] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Plans Management State
  const [planCategoryFilter, setPlanCategoryFilter] = useState<string>('all');
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planCategory, setPlanCategory] = useState<PlanDocument['category']>('Kế hoạch tuần');
  const [planDescription, setPlanDescription] = useState('');
  const [planSourceType, setPlanSourceType] = useState<'local_file' | 'database_link'>('local_file');
  const [planType, setPlanType] = useState<PlanDocument['type']>('doc');
  const [planFileName, setPlanFileName] = useState('');
  const [planFileSize, setPlanFileSize] = useState('');
  const [planFileData, setPlanFileData] = useState<string | undefined>(undefined);
  const [planExternalUrl, setPlanExternalUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const digest = generateWeeklyDigest();

  const [assemblyOutput, setAssemblyOutput] = useState<string>(`KỊCH BẢN ĐIỀU HÀNH TIẾT SINH HOẠT LỚP TUẦN ${weekNumber}
Chủ điểm: "Nhớ ơn thầy cô - Thi đua Bông hoa Điểm Mười"

I. TIẾN TRÌNH TIẾT SINH HOẠT LỚP
1. Khởi động & Ổn định tổ chức (5 phút):
   - Lớp phó Văn thể bắt nhịp bài hát: "Bụi Phấn".
   - Lớp trưởng Nguyễn Văn An báo cáo sĩ số: 18/18 học sinh có mặt.

2. Ban cán sự lớp tổng kết tuần qua (10 phút):
   - Tổ 1 (Tổ trưởng Bách): Đạt 42 sao, trực nhật sạch sẽ.
   - Tổ 2 (Tổ trưởng Giang): Đạt 46 sao, dẫn đầu phong trào phát biểu.
   - Tổ 3 (Tổ trưởng Minh): Đạt 38 sao, còn 1 bạn quên sách bài tập.
   - Lớp phó học tập Mai Anh: Đánh giá giờ tự học và việc hoàn thành bài tập về nhà.

3. Giáo viên chủ nhiệm biểu dương & chấn chỉnh (15 phút):
   - Biểu dương Top 5 ngôi sao sáng: ${digest.topPraised.map((s: Student) => `${s.fullName} (${s.stars} sao)`).join(', ')}.
   - Nhắc nhở chấn chỉnh: Khắc phục tình trạng một số bạn đi muộn và quên đồ dùng học tập.

4. Phương hướng hoạt động tuần tới (10 phút):
   - Đẩy mạnh phong trào hoa điểm mười chào mừng ngày Nhà Giáo Việt Nam 20-11.
   - Ôn tập chuẩn bị cho kỳ kiểm tra định kỳ giữa kỳ.

--------------------------------------------------
BIÊN BẢN SINH HOẠT LỚP TUẦN ${weekNumber}
- Thời gian: Tiết 5, Thứ Sáu
- Địa điểm: Phòng học Lớp 4A1, Trường Tiểu học Hoài Nhơn
- Thành phần: Giáo viên chủ nhiệm Lê Hoàng Thanh cùng 18/18 học sinh
- Chủ tọa: GVCN & Lớp trưởng Nguyễn Văn An
- Thư ký: Lớp phó học tập Trần Thị Mai Anh
- Quyết nghị: Tập thể lớp nhất trí biểu quyết 100% quyết tâm giữ vững danh hiệu Lớp Xuất Sắc.`);

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    try {
      const topPraisedStr = digest.topPraised.map((s: Student) => `${s.fullName} (${s.stars} sao)`).join(', ');
      const frequentIssuesStr = digest.frequentIssues.map((s: Student) => `${s.fullName} (${s.demerits} lần nhắc nhở)`).join(', ');

      const res = await generateAssemblyScript({
        weekNumber,
        topPraised: topPraisedStr,
        frequentIssues: frequentIssuesStr,
        attendanceSummary: `Tỷ lệ chuyên cần đạt ${digest.presentRate}%, vắng ${digest.totalAbsent} buổi`,
        upcomingEvents: 'Thi đua chào mừng Ngày Nhà Giáo Việt Nam 20-11, kiểm tra định kỳ môn Toán & Tiếng Việt',
      });

      if (res.content) {
        setAssemblyOutput(res.content);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Lỗi tạo kịch bản: ${e?.message || 'Không thể tạo kịch bản'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(assemblyOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SKILL docx-official: Export Formatted Word Document
  const handleExportWord = () => {
    const formattedHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Kịch Bản & Biên Bản Sinh Hoạt Lớp Tuần ${weekNumber}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; margin: 2cm; }
          .header-table { width: 100%; border: none; margin-bottom: 20px; }
          .header-table td { border: none; vertical-align: top; }
          h1 { font-size: 16pt; text-align: center; font-weight: bold; text-transform: uppercase; margin-top: 10px; }
          h2 { font-size: 14pt; font-weight: bold; margin-top: 15px; color: #1e3a8a; }
          p { margin: 6px 0; text-align: justify; }
          .footer-sign { width: 100%; margin-top: 30px; border: none; }
          .footer-sign td { border: none; text-align: center; vertical-align: top; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 45%; text-align: center;">
              <strong>PHÒNG GD&ĐT THỊ XÃ HOÀI NHƠN</strong><br/>
              <strong>TRƯỜNG TIỂU HỌC HOÀI NHƠN</strong><br/>
              <em>Lớp: 4A1</em>
            </td>
            <td style="width: 55%; text-align: center;">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
              <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
              <em>Hoài Nhơn, ngày 23 tháng 10 năm 2026</em>
            </td>
          </tr>
        </table>

        <h1>KỊCH BẢN ĐIỀU HÀNH & BIÊN BẢN SINH HOẠT LỚP TUẦN ${weekNumber}</h1>

        <div style="white-space: pre-wrap; font-size: 13pt; line-height: 1.6;">
          ${assemblyOutput.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>

        <table class="footer-sign">
          <tr>
            <td style="width: 50%;">
              <strong>LỚP TRƯỞNG</strong><br/>
              <em>(Ký và ghi rõ họ tên)</em><br/><br/><br/><br/>
              <strong>Nguyễn Văn An</strong>
            </td>
            <td style="width: 50%;">
              <strong>GIÁO VIÊN CHỦ NHIỆM</strong><br/>
              <em>(Ký và ghi rõ họ tên)</em><br/><br/><br/><br/>
              <strong>Lê Hoàng Thanh</strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', formattedHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bien_Ban_Sinh_Hoat_Lop_Tuan_${weekNumber}_Hoai_Nhon.doc`;
    a.click();
  };

  // SKILL pptx-official: Slide Deck Presentation Data
  const slides = [
    {
      title: `TIẾT SINH HOẠT LỚP TUẦN ${weekNumber}`,
      subtitle: 'Trường Tiểu học Hoài Nhơn • Lớp 4A1',
      badge: 'Chủ điểm: Nhớ Ơn Thầy Cô - Hoa Điểm Mười',
      content: [
        'Giáo viên chủ nhiệm: Cô Lê Hoàng Thanh',
        'Lớp trưởng điều hành: Nguyễn Văn An',
        `Sĩ số: 18/18 học sinh có mặt (${digest.presentRate}% chuyên cần)`,
      ],
      color: 'from-indigo-600 via-indigo-700 to-purple-800',
    },
    {
      title: 'BƯỚC 1: ỔN ĐỊNH & KHỞI ĐỘNG',
      subtitle: 'Thời gian: 5 Phút',
      badge: 'Văn nghệ & Nề nếp đầu giờ',
      content: [
        'Lớp phó Văn thể bắt nhịp bài hát truyền thống: "Bụi Phấn".',
        'Toàn thể học sinh đứng nghiêm trang, hát vang bài ca mái trường.',
        'Lớp trưởng báo cáo sĩ số, điểm danh và trang phục học sinh.',
      ],
      color: 'from-blue-600 via-indigo-600 to-indigo-800',
    },
    {
      title: 'BƯỚC 2: BAN CÁN SỰ TỔNG KẾT TUẦN QUA',
      subtitle: 'Thời gian: 10 Phút',
      badge: 'Đánh giá hoạt động 3 Tổ',
      content: [
        'Tổ 1 (Tổ trưởng Bách): Đạt 42 sao, vệ sinh lớp sạch sẽ.',
        'Tổ 2 (Tổ trưởng Giang): Đạt 46 sao, dẫn đầu phong trào phát biểu.',
        'Tổ 3 (Tổ trưởng Minh): Đạt 38 sao, còn 1 bạn quên sách bài tập.',
        'Lớp phó học tập Mai Anh nhận xét giờ tự học và việc làm bài tập về nhà.',
      ],
      color: 'from-teal-600 via-emerald-600 to-emerald-800',
    },
    {
      title: 'BƯỚC 3: TUYÊN DƯƠNG TOP NGÔI SAO SÁNG',
      subtitle: 'Thời gian: 15 Phút',
      badge: 'Vinh danh & Khen thưởng thi đua',
      content: digest.topPraised.map(
        (s: Student, idx: number) => `⭐ Hạng ${idx + 1}: ${s.fullName} - Tích lũy ${s.stars} sao thi đua`
      ),
      color: 'from-amber-600 via-orange-600 to-rose-700',
    },
    {
      title: 'BƯỚC 4: PHƯƠNG HƯỚNG HOẠT ĐỘNG TUẦN TỚI',
      subtitle: 'Thời gian: 10 Phút',
      badge: 'Kế hoạch thi đua tuần mới',
      content: [
        'Đẩy mạnh đợt thi đua cao điểm: "Hoa Điểm Mười Dâng Thầy Cô".',
        'Ôn tập kiến thức chuẩn bị kiểm tra định kỳ giữa Học kỳ 1.',
        'Khắc phục triệt để tình trạng đi muộn và quên dụng cụ học tập.',
        '100% học sinh biểu quyết đồng thuận thực hiện tốt nội quy lớp!',
      ],
      color: 'from-purple-600 via-indigo-700 to-slate-900',
    },
  ];

  // Handle plan file upload from computer
  const handlePlanFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlanFileName(file.name);
    const sizeInKb = Math.round(file.size / 1024);
    setPlanFileSize(sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setPlanType('pdf');
    else if (ext === 'doc' || ext === 'docx') setPlanType('doc');
    else if (ext === 'ppt' || ext === 'pptx') setPlanType('pptx');
    else if (ext === 'xls' || ext === 'xlsx') setPlanType('xlsx');

    if (!planTitle) {
      setPlanTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPlanFileData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;

    addPlan({
      title: planTitle,
      category: planCategory,
      description:
        planDescription.trim() ||
        (planSourceType === 'database_link'
          ? `Hồ sơ liên kết cơ sở dữ liệu: ${planExternalUrl}`
          : `Tệp văn bản kế hoạch "${planFileName || planTitle}" của Trường Tiểu học Hoài Nhơn.`),
      type: planType,
      sourceType: planSourceType,
      fileName: planFileName || `${planTitle.replace(/\s+/g, '_')}.${planType === 'link' ? 'url' : planType}`,
      fileSize: planFileSize || (planSourceType === 'database_link' ? 'Link trực tuyến' : '150 KB'),
      fileData: planFileData,
      externalUrl: planSourceType === 'database_link' ? planExternalUrl : undefined,
    });

    setPlanTitle('');
    setPlanDescription('');
    setPlanFileName('');
    setPlanFileSize('');
    setPlanFileData(undefined);
    setPlanExternalUrl('');
    setShowAddPlanModal(false);
  };

  const studentsNeedingSupport = students.filter(
    (s) => s.specialSupportPlan?.needed || s.demerits >= 2 || s.tt27Evaluation.academicLevel === 'C'
  );

  const filteredPlans = plans.filter(
    (p) => planCategoryFilter === 'all' || p.category === planCategoryFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">
              Kế Hoạch Chủ Nhiệm & Tiết Sinh Hoạt Lớp Tự Động
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Trường Tiểu học Hoài Nhơn • 1-Click sinh kịch bản sinh hoạt lớp, xuất Word/PowerPoint và quản lý hồ sơ kế hoạch
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('assembly')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'assembly'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Kịch Bản & Biên Bản
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center space-x-1.5 ${
              activeTab === 'plans'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hồ Sơ Kế Hoạch ({plans.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('intervention')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'intervention'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hồ Sơ Can Thiệp ({studentsNeedingSupport.length})
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lịch Công Tác Tháng
          </button>
        </div>
      </div>

      {/* TAB 1: ASSEMBLY SCRIPT & MINUTES */}
      {activeTab === 'assembly' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Week stats summary */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-xs text-white">Tổng Hợp Tuần {weekNumber}</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setWeekNumber((w) => Math.max(1, w - 1))}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                  >
                    -
                  </button>
                  <span className="text-xs px-2 font-semibold text-indigo-400">Tuần {weekNumber}</span>
                  <button
                    onClick={() => setWeekNumber((w) => Math.min(35, w + 1))}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Top Stars */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-amber-400 flex items-center space-x-1">
                  <span>⭐ Top 5 Ngôi Sao Sáng Trong Tuần</span>
                </span>
                <div className="space-y-1">
                  {digest.topPraised.map((s: Student, idx: number) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs"
                    >
                      <span className="font-semibold text-slate-200">
                        {idx + 1}. {s.fullName}
                      </span>
                      <span className="text-amber-400 font-bold">{s.stars} sao</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues needing reminder */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-rose-400 flex items-center space-x-1">
                  <span>⚠️ Cần Chấn Chỉnh Trong Tiết Sinh Hoạt</span>
                </span>
                <div className="space-y-1">
                  {digest.frequentIssues.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-2 bg-slate-950 rounded-lg">
                      Không có học sinh vi phạm nghiêm trọng trong tuần!
                    </p>
                  ) : (
                    digest.frequentIssues.slice(0, 3).map((s: Student) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs"
                      >
                        <span className="font-semibold text-slate-200">{s.fullName}</span>
                        <span className="text-rose-400 font-bold">{s.demerits} lần nhắc nhở</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Attendance quick glance */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Chuyên cần: {digest.presentRate}%</span>
                <span>Vắng: {digest.totalAbsent} buổi</span>
              </div>

              <button
                onClick={handleGenerateScript}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isGenerating ? 'AI Đang Sinh Kịch Bản...' : '1-Click AI Sinh Kịch Bản Mới'}</span>
              </button>
            </div>
          </div>

          {/* Right: Assembly Script & Minutes Content */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">
                  Kịch Bản Tiết Sinh Hoạt & Khung Biên Bản Tuần {weekNumber}
                </h3>
              </div>

              {/* Action buttons (Copy, Word, PowerPoint Slides, Print) */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>

                {/* SKILL docx-official: Export Word Button */}
                <button
                  onClick={handleExportWord}
                  title="Xuất kịch bản & biên bản sang tệp Word (.doc) có quốc hiệu tiêu ngữ chuẩn"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800/80 border border-blue-500/40 text-blue-200 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Xuất Word (.doc)</span>
                </button>

                {/* SKILL pptx-official: Present Slides Button */}
                <button
                  onClick={() => {
                    setCurrentSlideIndex(0);
                    setShowSlidesModal(true);
                  }}
                  title="Trình chiếu Slide tiết sinh hoạt lớp dạng PowerPoint"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold shadow transition"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>Trình Chiếu Slide (.pptx)</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In văn bản</span>
                </button>
              </div>
            </div>

            <textarea
              rows={16}
              value={assemblyOutput}
              onChange={(e) => setAssemblyOutput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* TAB 4: PLANS & DIRECTIVES (KẾ HOẠCH & VĂN BẢN CHỈ ĐẠO) */}
      {activeTab === 'plans' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-emerald-400" />
                <span>Hồ Sơ Kế Hoạch & Văn Bản Chỉ Đạo Lớp Học</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Lưu trữ và quản lý kế hoạch tuần, tháng, ma trận đề thi và liên kết cơ sở dữ liệu Google Sheet của Trường Tiểu học Hoài Nhơn
              </p>
            </div>

            <button
              onClick={() => setShowAddPlanModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition whitespace-nowrap self-start sm:self-auto"
            >
              <Upload className="w-4 h-4" />
              <span>+ Thêm Kế Hoạch / Link CSDL</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto text-xs pb-1">
            <span className="text-slate-400 text-[11px]">Phân loại:</span>
            {['all', 'Kế hoạch tuần', 'Kế hoạch tháng', 'Chuyên môn', 'Văn bản chỉ đạo', 'Nề nếp & Đội'].map((cat) => (
              <button
                key={cat}
                onClick={() => setPlanCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition ${
                  planCategoryFilter === cat
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat === 'all' ? 'Tất cả kế hoạch' : cat}
              </button>
            ))}
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      {plan.category}
                    </span>
                    <button
                      onClick={() => deletePlan(plan.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      title="Xóa kế hoạch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-bold text-sm text-white line-clamp-2">{plan.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{plan.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5 truncate max-w-[65%]">
                    {plan.sourceType === 'database_link' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
                        <Database className="w-2.5 h-2.5" />
                        <span>Link CSDL</span>
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                        <File className="w-2.5 h-2.5" />
                        <span>Tệp máy</span>
                      </span>
                    )}
                    <span className="truncate">{plan.fileName || plan.fileSize || 'tai_lieu'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {plan.externalUrl && (
                      <a
                        href={plan.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-0.5"
                      >
                        <span>Mở Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {plan.fileData && (
                      <a
                        href={plan.fileData}
                        download={plan.fileName || 'ke_hoach'}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-0.5"
                      >
                        <Download className="w-3 h-3" />
                        <span>Tải</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INTERVENTION PLAN */}
      {activeTab === 'intervention' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <span>Hồ Sơ Học Sinh Cần Hỗ Trợ Sư Phạm Đặc Biệt (Intervention Plan)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Lộ trình theo dõi các em có khó khăn trong học tập hoặc biến động tâm lý, tự động kích hoạt bởi EWS
              </p>
            </div>
            <span className="text-xs bg-amber-950 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg">
              {studentsNeedingSupport.length} học sinh đang được theo dõi
            </span>
          </div>

          <div className="space-y-4">
            {studentsNeedingSupport.map((s) => (
              <div key={s.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold">
                      {s.stt}
                    </span>
                    <h4 className="font-bold text-sm text-white">{s.fullName}</h4>
                    <span className="text-xs text-slate-400">Tổ {s.seat.group}</span>
                  </div>

                  <span className="text-xs px-2.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                    Cần can thiệp
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Dấu hiệu nhận biết (Triggers):</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                      <li>Sao thi đua: {s.stars} ⭐ • Vi phạm: {s.demerits} lần</li>
                      <li>Xếp loại TT27: Mức {s.tt27Evaluation.academicLevel}</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Kế hoạch sư phạm:</span>
                    <p className="text-slate-300">
                      Gặp riêng trao đổi động viên, phân công bạn học kèm 15 phút đầu giờ, liên hệ gia đình phối hợp đôn đốc nề nếp.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-400 block mb-1">Phụ huynh liên hệ:</span>
                      <p className="text-indigo-300 font-semibold">{s.parentName} ({s.phone})</p>
                    </div>

                    <button
                      onClick={() => alert(`Đã gửi thông báo kế hoạch hỗ trợ tới phụ huynh em ${s.fullName}!`)}
                      className="mt-2 w-full py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold"
                    >
                      Nhắn Phụ Huynh Phối Hợp
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY / WEEKLY CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Flag className="w-5 h-5 text-indigo-400" />
                <span>Kế Hoạch & Lịch Hoạt Động Tháng 10 - 11</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Lịch công tác Đội, phong trào thi đua, kế hoạch kiểm tra định kỳ Trường Tiểu học Hoài Nhơn
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { time: '20/10 - 25/10', title: 'Hội thi làm bưu thiếp & Kể chuyện về mẹ và cô giáo', type: 'Đội Thiếu niên', status: 'Đang diễn ra' },
              { time: '01/11 - 15/11', title: 'Phát động đợt thi đua cao điểm: "Hoa Điểm Mười Dâng Thầy Cô"', type: 'Phong trào thi đua', status: 'Sắp tới' },
              { time: '10/11 - 14/11', title: 'Kiểm tra định kỳ giữa Học kỳ 1 (Toán, Tiếng Việt, Khoa học)', type: 'Chuyên môn', status: 'Kế hoạch' },
              { time: '18/11/2026', title: 'Chương trình Văn nghệ & Tri ân Ngày Nhà Giáo Việt Nam 20-11', type: 'Toàn trường', status: 'Kế hoạch' },
              { time: '28/11/2026', title: 'Họp Phụ Huynh Học Sinh Giữa Kỳ I', type: 'Chủ nhiệm', status: 'Kế hoạch' },
            ].map((ev, idx) => (
              <div
                key={idx}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded border border-indigo-500/30">
                      {ev.time}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{ev.type}</span>
                  </div>
                  <h4 className="font-semibold text-sm text-white">{ev.title}</h4>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded font-semibold ${
                    ev.status === 'Đang diễn ra'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW PLAN (FROM COMPUTER OR DATABASE LINK) */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-emerald-400" />
                <span>Thêm Hồ Sơ Kế Hoạch & Văn Bản Chỉ Đạo</span>
              </h3>
              <button
                onClick={() => setShowAddPlanModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPlanSourceType('local_file')}
                className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                  planSourceType === 'local_file'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải Tệp Từ Máy Tính</span>
              </button>

              <button
                type="button"
                onClick={() => setPlanSourceType('database_link')}
                className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                  planSourceType === 'database_link'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Link CSDL / Drive / Sheet</span>
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-xs">
              {/* Option A: Local File */}
              {planSourceType === 'local_file' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePlanFileSelect}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-xl p-4 text-center cursor-pointer transition space-y-1.5"
                  >
                    <Upload className="w-6 h-6 text-emerald-400 mx-auto" />
                    <div className="font-semibold text-slate-200">
                      {planFileName ? (
                        <span className="text-emerald-300 font-bold flex items-center justify-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã chọn: {planFileName} ({planFileSize})</span>
                        </span>
                      ) : (
                        <span>Bấm để chọn tệp kế hoạch từ máy tính (.docx, .pdf, .pptx, .xlsx)</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tệp sẽ được lưu an toàn trong hồ sơ của Trường Tiểu học Hoài Nhơn
                    </p>
                  </div>
                </div>
              )}

              {/* Option B: Database Link */}
              {planSourceType === 'database_link' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Đường dẫn Google Drive / Google Sheets / CSDL Ngành:
                  </label>
                  <input
                    type="url"
                    value={planExternalUrl}
                    onChange={(e) => {
                      setPlanExternalUrl(e.target.value);
                      if (!planTitle) setPlanTitle('Bảng tính kế hoạch Google Sheet');
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/... hoặc link Google Drive"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              )}

              {/* Plan Title & Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tên kế hoạch / văn bản:</label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch chuyên môn tháng 11 - Trường TH Hoài Nhơn"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Danh mục kế hoạch:</label>
                  <select
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="Kế hoạch tuần">Kế hoạch tuần</option>
                    <option value="Kế hoạch tháng">Kế hoạch tháng</option>
                    <option value="Chuyên môn">Chuyên môn</option>
                    <option value="Nề nếp & Đội">Nề nếp & Đội</option>
                    <option value="Văn bản chỉ đạo">Văn bản chỉ đạo</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Định dạng tệp:</label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="doc">Văn bản .docx / Word</option>
                    <option value="pdf">Tài liệu .pdf</option>
                    <option value="pptx">Bài giảng .pptx / Slide</option>
                    <option value="xlsx">Bảng tính .xlsx / Sheet</option>
                    <option value="link">Đường link CSDL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mô tả tóm tắt nội dung kế hoạch:</label>
                <textarea
                  rows={3}
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Ghi chú nội dung trọng tâm, mục tiêu hoặc hướng dẫn thực hiện..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!planTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  Lưu Vào Hồ Sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SKILL pptx-official: SLIDES PRESENTATION MODAL */}
      {showSlidesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[580px]">
            {/* Slide Top Bar */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Presentation className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white">Trình Chiếu Slide Tiết Sinh Hoạt Lớp Tuần {weekNumber}</span>
                <span className="text-slate-400">• Slide {currentSlideIndex + 1}/{slides.length}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportWord}
                  className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-500/30 text-[11px] font-semibold"
                >
                  Tải Văn Bản
                </button>
                <button
                  onClick={() => setShowSlidesModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slide Canvas */}
            <div
              className={`flex-1 bg-gradient-to-br ${slides[currentSlideIndex].color} p-8 sm:p-12 flex flex-col justify-between text-white relative select-none`}
            >
              <div>
                <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-white/20 backdrop-blur font-bold inline-block mb-3">
                  {slides[currentSlideIndex].badge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{slides[currentSlideIndex].title}</h2>
                <p className="text-sm text-white/80 mt-1">{slides[currentSlideIndex].subtitle}</p>
              </div>

              <div className="my-auto space-y-3 bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-white/10 max-h-[220px] overflow-y-auto">
                {slides[currentSlideIndex].content.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-3 text-sm sm:text-base font-medium">
                    <span className="text-amber-300 font-bold shrink-0">✦</span>
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-white/70 border-t border-white/20 pt-3">
                <span>Trường Tiểu học Hoài Nhơn • Lớp 4A1</span>
                <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
              </div>
            </div>

            {/* Slide Navigation Controls */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setCurrentSlideIndex((i) => Math.max(0, i - 1))}
                disabled={currentSlideIndex === 0}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Slide Trước</span>
              </button>

              {/* Slide Dots */}
              <div className="flex items-center space-x-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      currentSlideIndex === idx ? 'bg-amber-400 w-6' : 'bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                disabled={currentSlideIndex === slides.length - 1}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow"
              >
                <span>Slide Kế Tiếp</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
