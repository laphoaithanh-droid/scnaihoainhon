import React, { useState, useRef } from 'react';
import { useApp, getDeviceInfo } from '../context/AppContext';
import {
  Database,
  Users,
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Save,
  Clock,
  ShieldCheck,
  FileCheck2,
  Trash2,
  Plus,
  Copy,
  BookOpen,
  HelpCircle,
  Download,
  KeyRound,
  Layers,
  Lock,
  Cloud,
  RefreshCw,
  UserCog,
  Laptop,
} from 'lucide-react';
import { ClassroomMaterial, Student } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';
import { TeacherProfileModal } from './TeacherProfileModal';

export const DataManagementView: React.FC = () => {
  const {
    currentUser,
    students,
    materials,
    addMaterial,
    deleteMaterial,
    importStudentsFromPsv,
    exportStudentsToPsv,
    saveStatus,
    lastSavedTime,
    customClassPrompt,
    setCustomClassPrompt,
    triggerManualSave,
    resetClassDataToDefault,
    isUsingDefaultPassword,
    syncWithCloud,
    exportCloudBackup,
    restoreCloudBackup,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'students' | 'materials' | 'prompt' | 'backup'>('prompt');
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Tab 1: Student Import
  const [psvInput, setPsvInput] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Tab 2: Materials & Exam Bank
  const [docTitle, setDocTitle] = useState('');
  const [docSubject, setDocSubject] = useState('Toán học');
  const [docType, setDocType] = useState<'doc' | 'pdf' | 'link' | 'xlsx'>('doc');
  const [docContent, setDocContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 4: Reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const className = currentUser?.className || 'Lớp 4A1';
  const schoolYear = currentUser?.schoolYear || '2026';
  const username = currentUser?.username || 'lop4a1_2026';

  // Quick prompt suggestions
  const PROMPT_SUGGESTIONS = [
    'Lớp này tiếp thu môn Toán chậm hơn, cần giải thích kỹ phép nhân và các bài toán 3 bước tính bằng que tính trực quan.',
    'Lớp có 3 học sinh hiếu động, cần ưu tiên động viên tích cực bằng sao thưởng và phân công trực nhật tổ rõ ràng.',
    'Đặc biệt chú trọng rèn chữ viết và luyện chính tả (phân biệt l/n, ch/tr, s/x) trong môn Tiếng Việt.',
    'Khuyến khích học sinh rèn luyện tư duy tính toán Unplugged CS và làm các mô hình STEM từ vật liệu tái chế tại nhà.',
  ];

  // Handle local file read (TXT, PDF, Word)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsReadingFile(true);

    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setDocContent(content.slice(0, 5000));
      }
      setIsReadingFile(false);
    };

    reader.onerror = () => {
      alert('Không thể đọc tệp tin. Vui lòng thử lại với định dạng văn bản.');
      setIsReadingFile(false);
    };

    reader.readAsText(file);
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) {
      alert('Vui lòng nhập tên tài liệu và nội dung bài học/đề cương.');
      return;
    }

    addMaterial({
      title: `[${className}] ${docTitle.trim()}`,
      subject: docSubject,
      type: docType,
      content: docContent.trim(),
      sourceType: 'local_file',
      fileName: uploadedFileName || `${docTitle}.txt`,
    });

    setDocTitle('');
    setDocContent('');
    setUploadedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    alert(`Đã thêm thành công tài liệu giảng dạy vào không gian dữ liệu riêng của ${className}!`);
  };

  const handleImportStudents = () => {
    if (!psvInput.trim()) return;
    const res = importStudentsFromPsv(psvInput);
    if (res.success) {
      setImportNotice(`Thành công! Đã nạp và đồng bộ ${res.count} học sinh vào không gian của ${className}.`);
      setPsvInput('');
    } else {
      setImportNotice(`Lỗi: ${res.error || 'Định dạng dữ liệu chưa chính xác.'}`);
    }
  };

  const handleExportBackup = () => {
    const data = {
      username,
      className,
      schoolYear,
      teacherName: currentUser?.fullName,
      customClassPrompt,
      studentsCount: students.length,
      students,
      materials,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SaoLuu_${username}_${Date.now()}.json`;
    a.click();
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Bạn có chắc chắn muốn nạp và khôi phục dữ liệu từ tệp "${file.name}"? Mọi dữ liệu hiện tại của lớp sẽ được cập nhật đồng bộ.`)) {
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const result = await restoreCloudBackup(file);
    setIsRestoring(false);

    if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';

    if (result.success) {
      alert(result.message);
    } else {
      alert(`Lỗi khôi phục: ${result.error || result.message}`);
    }
  };

  const handleExecuteReset = () => {
    resetClassDataToDefault();
    setShowResetConfirm(false);
    alert(`Đã khôi phục dữ liệu mặc định thành công cho ${className}!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: Class isolation and live auto-save feedback */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold text-white">Quản Trị Dữ Liệu Phân Vùng Lớp Học</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Sandbox Cô Lập
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Không gian lưu trữ dữ liệu dành riêng cho{' '}
                <span className="font-semibold text-white">{className}</span> • Giáo viên:{' '}
                <span className="font-semibold text-white">{currentUser?.fullName || 'Chủ nhiệm'}</span> • Năm học{' '}
                <span className="font-semibold text-white">{schoolYear}</span> • Mã định danh:{' '}
                <code className="text-amber-300 font-mono font-semibold">{username}</code>
              </p>
            </div>
          </div>

          {/* Cloud Auto-save live feedback pill & manual sync */}
          <div className="flex items-center space-x-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-xs">
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  <div className="text-left">
                    <span className="text-amber-300 font-bold block text-[11px]">Đang đồng bộ lên máy chủ...</span>
                    <span className="text-slate-400 text-[10px]">Đám mây đa thiết bị</span>
                  </div>
                </>
              ) : saveStatus === 'offline' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <div className="text-left">
                    <span className="text-orange-300 font-bold block text-[11px]">Mất kết nối mạng - Đã lưu tạm trên máy</span>
                    <span className="text-slate-400 text-[10px]">Tự động đồng bộ khi có mạng</span>
                  </div>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <span className="text-emerald-400 font-bold block text-[11px]">Đã lưu bản mới nhất</span>
                    <span className="text-slate-400 text-[10px]">Lúc {lastSavedTime} • Đám mây</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => syncWithCloud()}
              title="Đồng bộ tức thì lên đám mây"
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition text-xs font-semibold flex items-center space-x-1"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Sao lưu ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'prompt', label: 'Tùy Chỉnh Chỉ Dẫn Sư Phạm (Custom Class Prompt)', icon: Sparkles },
          { id: 'students', label: 'Nạp Dữ Liệu Học Sinh & Sĩ Số', icon: Users },
          { id: 'materials', label: 'Tài Liệu & Ngân Hàng Bài Tập', icon: BookOpen },
          { id: 'backup', label: 'Sao Lưu & Khôi Phục Mặc Định', icon: ShieldCheck },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CUSTOM CLASS PROMPT */}
      {activeTab === 'prompt' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Tùy Chỉnh Câu Lệnh Chuyên Biệt Cho Lớp (Custom Class Prompt)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Các ghi chú và định hướng sư phạm riêng này sẽ được tự động tiêm (inject) vào não bộ AI khi sinh nhận xét học bạ Thông tư 27, soạn kế hoạch bài dạy và giải đáp tại Chatbot lớp học.
              </p>
            </div>
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full font-semibold">
              Tự động lưu (Debounce 700ms)
            </span>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Nội dung chỉ dẫn đặc thù của {className}:
            </label>
            <textarea
              rows={5}
              value={customClassPrompt}
              onChange={(e) => setCustomClassPrompt(e.target.value)}
              placeholder="Ví dụ: Lớp này tiếp thu môn Toán chậm hơn, cần giải thích kỹ phép nhân và dùng nhiều que tính trực quan. Lớp có 2 em cá biệt cần động viên nhẹ nhàng..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
            />
          </div>

          {/* Quick suggestions pills */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 block">
              Gợi ý mẫu chỉ dẫn sư phạm (Bấm để nạp nhanh):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PROMPT_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomClassPrompt(sug)}
                  className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-left text-xs text-slate-300 hover:text-white transition group flex items-start space-x-2"
                >
                  <span className="text-indigo-400 font-bold group-hover:scale-110 transition-transform">
                    +
                  </span>
                  <span className="line-clamp-2">{sug}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Hiệu lực tức thì:</span> Mọi tác vụ AI của giáo viên trong lớp {className} sẽ tự động áp dụng đúng phương pháp bạn đã chỉ định tại đây mà không ghi đè lên các lớp khác.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS DATA */}
      {activeTab === 'students' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Nạp Dữ Liệu Học Sinh & Danh Sách Lớp ({students.length} Học Sinh)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Danh sách học sinh được phân vùng an toàn trong Sandbox riêng của {className}.
              </p>
            </div>
            <button
              onClick={() => {
                const psv = exportStudentsToPsv();
                navigator.clipboard.writeText(psv);
                alert('Đã sao chép danh sách học sinh theo định dạng bảng vào clipboard!');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition flex items-center space-x-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sao chép bảng</span>
            </button>
          </div>

          {/* Import Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">
              Đồng bộ / Nạp nhanh danh sách từ Google Sheet hoặc Excel:
            </h4>
            <p className="text-[11px] text-slate-500 font-mono">
              Hỗ trợ phân cách Pipe (|), Tab (\t) từ Excel, hoặc phẩy (,).
            </p>
            <textarea
              rows={3}
              value={psvInput}
              onChange={(e) => setPsvInput(e.target.value)}
              placeholder="Dán dữ liệu học sinh theo mẫu: TT|HỌ VÀ TÊN|NĂM SINH|HỌ VÀ TÊN CHA(MẸ)|SỐ ĐIỆN THOẠI|TÊN ĐĂNG NHẬP|MẬT KHẨU|"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {importNotice && (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-indigo-500/30 text-xs text-indigo-300">
                {importNotice}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleImportStudents}
                disabled={!psvInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center space-x-1.5 shadow"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nạp Vào {className}</span>
              </button>
            </div>
          </div>

          {/* Students summary list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">STT</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Năm sinh</th>
                  <th className="py-2.5 px-3">Tổ</th>
                  <th className="py-2.5 px-3">Vai trò</th>
                  <th className="py-2.5 px-3">Phụ huynh & SĐT</th>
                  <th className="py-2.5 px-3">Mức TT27</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-950/40">
                    <td className="py-2 px-3 font-mono text-slate-500">{s.stt}</td>
                    <td className="py-2 px-3 font-semibold text-white">{s.fullName}</td>
                    <td className="py-2 px-3 text-slate-400">{s.birthYear}</td>
                    <td className="py-2 px-3 text-indigo-400 font-medium">Tổ {s.seat.group}</td>
                    <td className="py-2 px-3 text-slate-400">{s.cadreRole || 'Thành viên'}</td>
                    <td className="py-2 px-3 text-slate-300">
                      {s.parentName} ({s.phone})
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.tt27Evaluation.academicLevel === 'T'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : s.tt27Evaluation.academicLevel === 'H'
                            ? 'bg-blue-950 text-blue-400 border border-blue-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {s.tt27Evaluation.academicLevel === 'T'
                          ? 'Tốt (T)'
                          : s.tt27Evaluation.academicLevel === 'H'
                          ? 'Hoàn thành (H)'
                          : 'Cần cố gắng (C)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length > 10 && (
              <p className="text-[11px] text-slate-500 text-center py-2">
                ... và còn {students.length - 10} học sinh khác trong lớp {className}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MATERIALS & EXAM BANK */}
      {activeTab === 'materials' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span>Nạp Tài Liệu Giảng Dạy & Ngân Hàng Bài Tập Riêng Của Lớp</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tải lên tệp (TXT, PDF, Word) hoặc dán văn bản bài giảng, đề cương ôn tập dành riêng cho {className}.
            </p>
          </div>

          <form onSubmit={handleAddMaterial} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tên tài liệu / Tên bài tập:
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ví dụ: Đề cương ôn thi giữa kỳ môn Toán Lớp 3C1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Môn học:</label>
                <select
                  value={docSubject}
                  onChange={(e) => setDocSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option>Toán học</option>
                  <option>Tiếng Việt</option>
                  <option>Tin học</option>
                  <option>Công nghệ</option>
                  <option>Lịch sử & Địa lý</option>
                  <option>STEM / Khoa học</option>
                  <option>Tiếng Anh</option>
                  <option>Kỹ năng sống & Hoạt động trải nghiệm</option>
                </select>
              </div>
            </div>

            {/* File Upload or Paste text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Nội dung bài giảng, đề thi hoặc tệp tin đính kèm:
                </label>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.doc,.docx,.pdf,.md"
                    className="hidden"
                    id="material-file-upload"
                  />
                  <label
                    htmlFor="material-file-upload"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-indigo-300 cursor-pointer transition flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isReadingFile ? 'Đang đọc tệp...' : 'Chọn tệp từ máy tính (TXT, Word, PDF)'}</span>
                  </label>
                </div>
              </div>

              {uploadedFileName && (
                <div className="text-[11px] text-emerald-400 bg-emerald-950/60 p-2 rounded-lg border border-emerald-500/30 flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Đã trích xuất nội dung từ tệp: <b>{uploadedFileName}</b></span>
                </div>
              )}

              <textarea
                rows={5}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Dán nội dung bài tập, câu hỏi trắc nghiệm hoặc lý thuyết tại đây..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lưu Vào Kho Học Liệu Của {className}</span>
              </button>
            </div>
          </form>

          {/* List of uploaded materials */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Danh sách tài liệu & đề thi hiện có ({materials.length}):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-purple-500/40 transition flex items-start justify-between space-x-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase">
                        {m.subject}
                      </span>
                      <span className="text-[10px] text-slate-500">{m.createdAt || 'Đã lưu'}</span>
                    </div>
                    <h5 className="font-semibold text-xs text-white">{m.title}</h5>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{m.content}</p>
                  </div>

                  <button
                    onClick={() => deleteMaterial(m.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition flex-shrink-0"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & CLOUD PERSISTENCE */}
      {activeTab === 'backup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Cloud className="w-5 h-5 text-indigo-400" />
                <span>Sao Lưu Đám Mây Đa Thiết Bị & Hồ Sơ Chủ Nhiệm</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Quản lý đồng bộ máy chủ, xuất/nhập tệp sao lưu JSON và tùy chỉnh hồ sơ giáo viên chủ nhiệm.
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span>{getDeviceInfo()}</span>
            </div>
          </div>

          {/* Section 1: Teacher Profile & Display Class Card */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 p-5 rounded-2xl border border-indigo-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Hồ Sơ Giáo Viên Chủ Nhiệm & Tên Lớp</h4>
                  <p className="text-xs text-slate-400">
                    Thông tin hiển thị trên Bảng lớp, Bàn giáo viên, Tiêu đề Sơ đồ và Báo cáo TT27.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <UserCog className="w-4 h-4" />
                <span>Chỉnh Sửa Hồ Sơ Giáo Viên & Tên Lớp</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Giáo viên Chủ nhiệm:</span>
                <span className="font-bold text-white text-sm mt-0.5 block truncate">
                  {currentUser?.fullName || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Tên hiển thị Lớp:</span>
                <span className="font-bold text-indigo-300 text-sm mt-0.5 block truncate">
                  {className}
                </span>
              </div>
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Mã định danh Sandbox (Chỉ đọc):</span>
                <span className="font-mono font-bold text-amber-300 text-sm mt-0.5 block truncate">
                  {username}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: 3-Action Manual Backup & Restore Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Instant Cloud Sync */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Cloud className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-sm text-white">Sao Lưu Ngay (Đồng Bộ Tức Thì ☁️)</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Đẩy ngay lập tức toàn bộ dữ liệu hiện tại lên máy chủ đám mây không cần chờ 1.5 giây lưu tự động.
                </p>
                <div className="text-[11px] text-slate-300 pt-1">
                  Trạng thái:{' '}
                  {saveStatus === 'saving' ? (
                    <span className="text-amber-400 font-semibold">Đang đồng bộ lên máy chủ...</span>
                  ) : saveStatus === 'offline' ? (
                    <span className="text-orange-400 font-semibold">Mất kết nối mạng - Đã lưu tạm</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">Đã lưu bản mới nhất lúc {lastSavedTime}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => syncWithCloud()}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
              >
                <Cloud className="w-4 h-4" />
                <span>Sao Lưu Ngay Lên Đám Mây</span>
              </button>
            </div>

            {/* 2. Download JSON Backup */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Download className="w-5 h-5 text-indigo-400" />
                  <h4 className="font-bold text-sm text-white">Tải File Sao Lưu Về Máy (Backup JSON 📥)</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tải trọn bộ file JSON chứa {students.length} học sinh, {materials.length} học liệu, sơ đồ lớp và lịch sử thi đua về lưu trữ an toàn.
                </p>
              </div>
              <button
                onClick={exportCloudBackup}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Tải File Sao Lưu (.json)</span>
              </button>
            </div>

            {/* 3. Restore from JSON File */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-purple-400" />
                  <h4 className="font-bold text-sm text-white">Khôi Phục Từ File (Restore 📤)</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nạp lại toàn bộ dữ liệu từ tệp sao lưu `.json` đã lưu trước đó và cập nhật đồng bộ lên máy chủ đám mây.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={restoreFileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileRestore}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => restoreFileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang Khôi Phục...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Chọn File Để Khôi Phục (.json)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Password Security & Factory Reset */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Password security */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm text-white">Bảo Mật Mật Khẩu Giáo Viên</h4>
              </div>
              <p className="text-xs text-slate-400">
                Trạng thái:{' '}
                {isUsingDefaultPassword ? (
                  <span className="text-amber-400 font-semibold">Đang dùng mật khẩu mặc định (Abc123@)</span>
                ) : (
                  <span className="text-emerald-400 font-semibold">Đã đổi mật khẩu cá nhân an toàn</span>
                )}
              </p>
              <button
                onClick={() => setIsChangePassOpen(true)}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition flex items-center justify-center space-x-1.5"
              >
                <KeyRound className="w-4 h-4" />
                <span>Đổi Mật Khẩu Quản Trị</span>
              </button>
            </div>

            {/* Reset to default */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-rose-500/30 space-y-3">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <h4 className="font-bold text-sm text-white">Khôi Phục Về Mặc Định (Reset Sandbox)</h4>
              </div>
              <p className="text-xs text-slate-400">
                Đặt lại toàn bộ dữ liệu mẫu ban đầu cho lớp {className} trong trường hợp muốn làm mới toàn bộ danh sách và học liệu.
              </p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="py-2 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Khôi Phục Về Mặc Định</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
      />

      {/* Teacher & Class Profile Modal */}
      <TeacherProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base">Xác Nhận Khôi Phục Dữ Liệu?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn đặt lại dữ liệu của <b>{className}</b> về trạng thái chuẩn ban đầu? Mọi chỉnh sửa riêng biệt chưa sao lưu sẽ được làm mới.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition"
              >
                Đồng Ý Khôi Phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
