import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import { TT27_COMMENT_BANK } from '../data/mockData';
import {
  Sparkles,
  BookOpen,
  Award,
  CheckCircle,
  RefreshCw,
  Copy,
  Save,
  Check,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  XCircle,
  Key,
  ShieldAlert,
} from 'lucide-react';
import {
  generateTT27Comment,
  getStoredApiKey,
  getStoredModel,
} from '../services/geminiService';

interface AIReportAssistantProps {
  onOpenApiKeyModal?: () => void;
}

interface BatchStudentItem {
  id: string;
  stt: number;
  fullName: string;
  status: 'idle' | 'running' | 'fallback' | 'success' | 'error';
  usedModel?: string;
  error?: string;
}

export const AIReportAssistant: React.FC<AIReportAssistantProps> = ({
  onOpenApiKeyModal,
}) => {
  const { students, updateTT27Evaluation } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [bankFilter, setBankFilter] = useState<'all' | 'T' | 'H' | 'C'>('all');

  // Batch Generation State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchStudentItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchRawError, setBatchRawError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [batchFinishedSuccess, setBatchFinishedSuccess] = useState(false);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const evalData = currentStudent?.tt27Evaluation || {
    academicLevel: 'H',
    competencies: { selfLearning: 'H', collaboration: 'H', problemSolving: 'H' },
    qualities: { patriotism: 'T', kindness: 'T', diligence: 'H', honesty: 'T', responsibility: 'H' },
    subjectResults: { Toán: 'H', 'Tiếng Việt': 'H', 'Khoa học': 'H', 'Tiếng Anh': 'H' },
    aiComment: '',
  };

  const [commentText, setCommentText] = useState(
    evalData.teacherFinalComment || evalData.aiComment || ''
  );

  // Sync comment text when student changes
  React.useEffect(() => {
    if (currentStudent) {
      setCommentText(
        currentStudent.tt27Evaluation.teacherFinalComment ||
        currentStudent.tt27Evaluation.aiComment ||
        ''
      );
      setSingleError(null);
    }
  }, [selectedStudentId, currentStudent]);

  // Generate comment for a single student
  const handleGenerateAiComment = async () => {
    if (!currentStudent) return;

    setIsGenerating(true);
    setSingleError(null);

    try {
      const res = await generateTT27Comment(
        {
          studentName: currentStudent.fullName,
          gender: currentStudent.gender,
          level: evalData.academicLevel,
          academicStats: `Toán: ${evalData.subjectResults['Toán'] || 'H'}, Tiếng Việt: ${evalData.subjectResults['Tiếng Việt'] || 'H'}`,
          behaviorLogs: `Sao tích lũy: ${currentStudent.stars}, Vi phạm: ${currentStudent.demerits}, Khen ngợi gần đây: ${currentStudent.behaviorLogs.slice(0, 2).map((l) => l.note).join('; ')}`,
          competencies: evalData.competencies,
          qualities: evalData.qualities,
        },
        {
          onModelFallback: (info) => {
            console.warn(`Fallback từ ${info.failedModel} sang ${info.nextModel}: ${info.error}`);
          },
        }
      );

      if (res.comment) {
        setCommentText(res.comment);
        updateTT27Evaluation(currentStudent.id, {
          aiComment: res.comment,
        });
      }
    } catch (err: any) {
      console.error(err);
      setSingleError(err.message || 'Lỗi khi gọi API Gemini');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveComment = () => {
    if (!currentStudent) return;
    updateTT27Evaluation(currentStudent.id, {
      teacherFinalComment: commentText,
    });
    alert(`Đã lưu nhận xét học kỳ cho học sinh ${currentStudent.fullName}!`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(commentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyBankComment = (text: string) => {
    setCommentText(text.replace(/Em/g, `Em ${currentStudent?.fullName || ''}`));
  };

  // Open Batch Modal
  const handleOpenBatch = () => {
    const items: BatchStudentItem[] = students.map((s) => ({
      id: s.id,
      stt: s.stt,
      fullName: s.fullName,
      status: 'idle',
    }));

    setBatchItems(items);
    setBatchRawError(null);
    setFallbackNotice(null);
    setBatchFinishedSuccess(false);
    setIsBatchModalOpen(true);
  };

  // Start Batch Generation execution
  const startBatchExecution = async () => {
    setIsBatchRunning(true);
    setBatchRawError(null);
    setFallbackNotice(null);
    setBatchFinishedSuccess(false);

    let hadFatalError = false;

    for (let i = 0; i < students.length; i++) {
      if (hadFatalError) break;

      const s = students[i];

      // Mark running
      setBatchItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'running' } : item))
      );

      try {
        const res = await generateTT27Comment(
          {
            studentName: s.fullName,
            gender: s.gender,
            level: s.tt27Evaluation.academicLevel,
            competencies: s.tt27Evaluation.competencies,
            qualities: s.tt27Evaluation.qualities,
          },
          {
            onModelFallback: (info) => {
              setFallbackNotice(
                `Model ${info.failedModel} gặp lỗi, tự động chuyển sang model dự phòng ${info.nextModel}...`
              );
              setBatchItems((prev) =>
                prev.map((item, idx) => (idx === i ? { ...item, status: 'fallback' } : item))
              );
            },
          }
        );

        if (res.comment) {
          updateTT27Evaluation(s.id, { aiComment: res.comment });
          setBatchItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'success', usedModel: res.usedModel } : item
            )
          );
        }
      } catch (err: any) {
        hadFatalError = true;
        const rawErr = err?.message || String(err);
        setBatchRawError(rawErr);

        // Per AI_INSTRUCTIONS.md:
        // "Nếu tất cả các model đều thất bại -> Hiện thông báo lỗi màu đỏ, hiển thị nguyên văn lỗi từ API (VD: 429 RESOURCE_EXHAUSTED).
        // Trạng thái các cột đang chờ phải chuyển thành 'Đã dừng do lỗi', tuyệt đối không được hiện 'Hoàn tất' hoặc checkmark xanh nếu quy trình bị gián đoạn."
        setBatchItems((prev) =>
          prev.map((item, idx) => {
            if (idx >= i) {
              return { ...item, status: 'error', error: rawErr };
            }
            return item;
          })
        );
        break;
      }
    }

    setIsBatchRunning(false);
    if (!hadFatalError) {
      setBatchFinishedSuccess(true);
    }
  };

  const completedCount = batchItems.filter((item) => item.status === 'success').length;
  const progressPercent =
    batchItems.length > 0 ? Math.round((completedCount / batchItems.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">
              Trợ Lý AI Đánh Giá & Nhận Xét Học Sinh Theo Thông Tư 27
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ứng dụng trí tuệ nhân tạo Gemini phân tích lịch sử nề nếp & kết quả học tập để sinh nhận xét khích lệ, đúng chuẩn Bộ GD&ĐT
          </p>
        </div>

        <button
          onClick={handleOpenBatch}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>AI Sinh Nhận Xét Tự Động Cả Lớp</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Student Selector List */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-xs text-slate-300">Danh Sách Học Sinh</span>
            <span className="text-[10px] text-slate-500">{students.length} em</span>
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {students.map((s) => {
              const isSelected = s.id === selectedStudentId;
              const hasComment = !!(s.tt27Evaluation.teacherFinalComment || s.tt27Evaluation.aiComment);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                      {s.stt}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-xs truncate">{s.fullName}</div>
                      <div className="text-[10px] text-slate-500">
                        Mức: {s.tt27Evaluation.academicLevel === 'T' ? 'Hoàn thành tốt' : s.tt27Evaluation.academicLevel === 'H' ? 'Hoàn thành' : 'Cần cố gắng'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {hasComment && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        Đã có NX
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: TT27 Evaluation Editor */}
        <div className="lg:col-span-8 space-y-6">
          {/* Student Status Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-base text-white">{currentStudent?.fullName}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    STT: {currentStudent?.stt} • {currentStudent?.gender}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tổ {currentStudent?.seat.group} • Sao thi đua: {currentStudent?.stars} ⭐ • Vi phạm: {currentStudent?.demerits} ⚠️
                </p>
              </div>

              {/* Overall academic level */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Đánh giá chung:</span>
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 space-x-1">
                  {(['T', 'H', 'C'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() =>
                        updateTT27Evaluation(currentStudent.id, { academicLevel: lvl })
                      }
                      className={`px-3 py-1 rounded text-xs font-bold transition ${
                        evalData.academicLevel === lvl
                          ? lvl === 'T'
                            ? 'bg-emerald-600 text-white'
                            : lvl === 'H'
                            ? 'bg-blue-600 text-white'
                            : 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl === 'T' ? 'T (Tốt)' : lvl === 'H' ? 'H (Hoàn thành)' : 'C (Cố gắng)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Competencies & Qualities Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Năng lực cốt lõi */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                <h4 className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>3 Năng Lực Cốt Lõi (TT27)</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Tự chủ & tự học:</span>
                    <select
                      value={evalData.competencies?.selfLearning || 'H'}
                      onChange={(e) =>
                        updateTT27Evaluation(currentStudent.id, {
                          competencies: {
                            ...evalData.competencies,
                            selfLearning: e.target.value as any,
                          },
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
                    >
                      <option value="T">T - Tốt</option>
                      <option value="H">H - Đạt</option>
                      <option value="C">C - Cần cố gắng</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Giao tiếp & hợp tác:</span>
                    <select
                      value={evalData.competencies?.collaboration || 'H'}
                      onChange={(e) =>
                        updateTT27Evaluation(currentStudent.id, {
                          competencies: {
                            ...evalData.competencies,
                            collaboration: e.target.value as any,
                          },
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
                    >
                      <option value="T">T - Tốt</option>
                      <option value="H">H - Đạt</option>
                      <option value="C">C - Cần cố gắng</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Giải quyết vấn đề:</span>
                    <select
                      value={evalData.competencies?.problemSolving || 'H'}
                      onChange={(e) =>
                        updateTT27Evaluation(currentStudent.id, {
                          competencies: {
                            ...evalData.competencies,
                            problemSolving: e.target.value as any,
                          },
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
                    >
                      <option value="T">T - Tốt</option>
                      <option value="H">H - Đạt</option>
                      <option value="C">C - Cần cố gắng</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 5 Phẩm chất */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                <h4 className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>5 Phẩm Chất Chủ Yếu (TT27)</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Chăm chỉ:</span>
                    <select
                      value={evalData.qualities?.diligence || 'H'}
                      onChange={(e) =>
                        updateTT27Evaluation(currentStudent.id, {
                          qualities: {
                            ...evalData.qualities,
                            diligence: e.target.value as any,
                          },
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
                    >
                      <option value="T">T - Tốt</option>
                      <option value="H">H - Đạt</option>
                      <option value="C">C - Cố gắng</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Trung thực:</span>
                    <select
                      value={evalData.qualities?.honesty || 'T'}
                      onChange={(e) =>
                        updateTT27Evaluation(currentStudent.id, {
                          qualities: {
                            ...evalData.qualities,
                            honesty: e.target.value as any,
                          },
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
                    >
                      <option value="T">T - Tốt</option>
                      <option value="H">H - Đạt</option>
                      <option value="C">C - Cố gắng</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Trách nhiệm:</span>
                    <select
                      value={evalData.qualities?.responsibility || 'H'}
                      onChange={(e) =>
                        updateTT27Evaluation(currentStudent.id, {
                          qualities: {
                            ...evalData.qualities,
                            responsibility: e.target.value as any,
                          },
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
                    >
                      <option value="T">T - Tốt</option>
                      <option value="H">H - Đạt</option>
                      <option value="C">C - Cố gắng</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Generator Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  Lời Nhận Xét Giáo Viên Chủ Nhiệm (Gợi ý AI TT27)
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleGenerateAiComment}
                  disabled={isGenerating}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
                >
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'AI Đang Viết...' : 'AI Sinh Nhận Xét Mới'}</span>
                </button>
              </div>
            </div>

            {/* Single error notification */}
            {singleError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Lỗi gọi API:</span>
                    <p className="font-mono text-[11px] mt-0.5 text-rose-300 break-all">{singleError}</p>
                  </div>
                </div>
                {onOpenApiKeyModal && (
                  <button
                    onClick={onOpenApiKeyModal}
                    className="px-2.5 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-xs whitespace-nowrap"
                  >
                    Đổi API Key
                  </button>
                )}
              </div>
            )}

            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Nhấn nút 'AI Sinh Nhận Xét Mới' hoặc chọn mẫu từ ngân hàng bên dưới..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                {commentText.length} ký tự • Đạt chuẩn Thông tư 27 Bộ GD&ĐT
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
                <button
                  onClick={handleSaveComment}
                  className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Vào Hồ Sơ Học Bạ</span>
                </button>
              </div>
            </div>
          </div>

          {/* Standardized Comment Bank */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Ngân Hàng Mẫu Nhận Xét Chuẩn Hóa TT27</span>
              </h3>

              {/* Filter */}
              <div className="flex space-x-1 text-xs">
                {(['all', 'T', 'H', 'C'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBankFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      bankFilter === f
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'T' ? 'Mức T' : f === 'H' ? 'Mức H' : 'Mức C'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TT27_COMMENT_BANK.filter(
                (item) => bankFilter === 'all' || item.level === bankFilter
              ).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-indigo-400">
                        {item.category}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          item.level === 'T'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : item.level === 'H'
                            ? 'bg-blue-950 text-blue-400 border border-blue-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        Mức {item.level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.text}</p>
                  </div>

                  <button
                    onClick={() => handleApplyBankComment(item.text)}
                    className="self-end text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    + Sử dụng mẫu này
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BATCH GENERATION MODAL (Strictly compliant with AI_INSTRUCTIONS.md) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Tiến Trình AI Sinh Nhận Xét Toàn Lớp (TT27)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tự động phân tích và sinh nhận xét từng bước với cơ chế Fallback dự phòng
                  </p>
                </div>
              </div>

              {!isBatchRunning && (
                <button
                  onClick={() => setIsBatchModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Progress Bar Component */}
            <div className="space-y-2 mb-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>
                  Tiến độ: {completedCount}/{batchItems.length} học sinh ({progressPercent}%)
                </span>
                <span
                  className={
                    batchFinishedSuccess
                      ? 'text-emerald-400 font-bold'
                      : batchRawError
                      ? 'text-rose-400 font-bold'
                      : 'text-indigo-400'
                  }
                >
                  {batchFinishedSuccess
                    ? '✓ Hoàn tất thành công 100%'
                    : batchRawError
                    ? '✕ Đã dừng do lỗi'
                    : isBatchRunning
                    ? 'Đang tiến hành...'
                    : 'Chưa bắt đầu'}
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    batchFinishedSuccess
                      ? 'bg-emerald-500'
                      : batchRawError
                      ? 'bg-rose-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Fallback notification */}
              {fallbackNotice && !batchRawError && (
                <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 mt-2 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{fallbackNotice}</span>
                </div>
              )}
            </div>

            {/* Red Alert Banner if Fatal Error (Per AI_INSTRUCTIONS.md Section 3) */}
            {batchRawError && (
              <div className="mb-4 p-4 rounded-xl bg-rose-950/70 border-2 border-rose-500 text-rose-200 text-xs space-y-2 shadow-lg">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                  <span className="font-bold text-sm text-white">
                    Đã dừng do lỗi (Tất cả model Gemini đều thất bại)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-rose-500/40 font-mono text-[11px] text-rose-300 break-all select-all">
                  {batchRawError}
                </div>
                <p className="text-[11px] text-rose-300/90 leading-relaxed">
                  Trạng thái các học sinh đang chờ đã được chuyển thành <strong>"Đã dừng do lỗi"</strong>. Kết quả của các em đã hoàn tất trước đó vẫn được lưu an toàn. Bạn có thể kiểm tra lại hạn mức hoặc đổi API Key khác để tiếp tục.
                </p>
                {onOpenApiKeyModal && (
                  <button
                    onClick={() => {
                      setIsBatchModalOpen(false);
                      onOpenApiKeyModal();
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-bold text-xs shadow"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Mở Cài Đặt Để Đổi API Key</span>
                  </button>
                )}
              </div>
            )}

            {/* Student Step Status List (Columns) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[350px]">
              {batchItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between transition ${
                    item.status === 'success'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : item.status === 'error'
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : item.status === 'running'
                      ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-200 shadow ring-1 ring-indigo-500'
                      : item.status === 'fallback'
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                      {item.stt}
                    </span>
                    <span className="font-semibold text-white">{item.fullName}</span>
                    {item.usedModel && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {item.usedModel}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {item.status === 'idle' && (
                      <span className="text-slate-500 text-[11px]">Chờ xử lý</span>
                    )}
                    {item.status === 'running' && (
                      <span className="text-indigo-400 font-semibold flex items-center space-x-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Đang xử lý...</span>
                      </span>
                    )}
                    {item.status === 'fallback' && (
                      <span className="text-amber-400 font-semibold flex items-center space-x-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Đang thử lại model dự phòng...</span>
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Hoàn tất</span>
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-rose-400 font-bold flex items-center space-x-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Đã dừng do lỗi</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Lớp 4A1 • Sĩ số {students.length} học sinh
              </span>

              <div className="flex items-center space-x-2">
                {!isBatchRunning && (
                  <button
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Đóng
                  </button>
                )}

                {!batchFinishedSuccess && (
                  <button
                    onClick={startBatchExecution}
                    disabled={isBatchRunning}
                    className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition"
                  >
                    {isBatchRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang chạy quy trình...</span>
                      </>
                    ) : batchRawError ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại từ vị trí lỗi</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Bắt Đầu Xử Lý Toàn Lớp</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
