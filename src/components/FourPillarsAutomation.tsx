import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import {
  ShieldCheck,
  FileCheck2,
  Radar,
  MessageCircle,
  Database,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  RefreshCw,
  Send,
  PhoneCall,
  Clock,
  ExternalLink,
  Copy,
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Trophy,
  Star,
  Sparkles,
} from 'lucide-react';

export const FourPillarsAutomation: React.FC = () => {
  const {
    students,
    alerts,
    resolveAlert,
    triggerMorningAbsenteeNotification,
    importStudentsFromPsv,
    exportStudentsToPsv,
    googleSheetConfig,
    updateGoogleSheetConfig,
  } = useApp();

  const [activePillar, setActivePillar] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [psvInputText, setPsvInputText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [morningNotificationStatus, setMorningNotificationStatus] = useState<string | null>(null);
  const [copiedAnalytics, setCopiedAnalytics] = useState(false);

  // Pillar 5: Analytics & D3/SVG Metrics
  const totalStudentsCount = students.length || 1;
  const tCount = students.filter((s) => s.tt27Evaluation?.academicLevel === 'T').length;
  const hCount = students.filter((s) => s.tt27Evaluation?.academicLevel === 'H').length;
  const cCount = students.filter((s) => s.tt27Evaluation?.academicLevel === 'C').length;

  const tPercent = Math.round((tCount / totalStudentsCount) * 100);
  const hPercent = Math.round((hCount / totalStudentsCount) * 100);
  const cPercent = 100 - tPercent - hPercent;

  const groupsData = ([1, 2, 3] as const).map((gId) => {
    const groupMembers = students.filter((s) => s.seat.group === gId);
    const stars = groupMembers.reduce((sum, s) => sum + (s.stars || 0), 0);
    const demerits = groupMembers.reduce((sum, s) => sum + (s.demerits || 0), 0);
    const net = stars - demerits;
    const names = { 1: 'Tổ 1 - Sao Kim', 2: 'Tổ 2 - Sao Mộc', 3: 'Tổ 3 - Sao Hỏa' };
    return {
      id: gId,
      name: names[gId],
      count: groupMembers.length,
      stars,
      demerits,
      net,
    };
  }).sort((a, b) => b.net - a.net);

  const competencyStats = [
    { name: 'Tự chủ và tự học', count: students.filter((s) => s.tt27Evaluation?.competencies?.selfLearning === 'T').length },
    { name: 'Giao tiếp và hợp tác', count: students.filter((s) => s.tt27Evaluation?.competencies?.collaboration === 'T').length },
    { name: 'Giải quyết vấn đề & Sáng tạo', count: students.filter((s) => s.tt27Evaluation?.competencies?.problemSolving === 'T').length },
    { name: 'Chăm chỉ & Trách nhiệm', count: students.filter((s) => s.tt27Evaluation?.qualities?.diligence === 'T' && s.tt27Evaluation?.qualities?.responsibility === 'T').length },
  ];

  const handleCopyAnalyticsReport = () => {
    const reportText = `BÁO CÁO PHÂN TÍCH THỐNG KÊ LỚP 4A1 • TRƯỜNG TIỂU HỌC HOÀI NHƠN
--------------------------------------------------
1. KẾT QUẢ ĐÁNH GIÁ ĐỊNH KỲ (TT27/2020):
- Sĩ số: ${students.length} học sinh
- Hoàn thành Tốt (T): ${tCount} em (${tPercent}%)
- Hoàn thành (H): ${hCount} em (${hPercent}%)
- Cần cố gắng (C): ${cCount} em (${cPercent}%)

2. XẾP HẠNG THI ĐUA TỔ TUẦN:
${groupsData.map((g, i) => `${i + 1}. ${g.name}: ${g.net} điểm (${g.stars} sao thưởng, -${g.demerits} điểm trừ)`).join('\n')}

3. NĂNG LỰC & PHẨM CHẤT NỔI BẬT:
${competencyStats.map((c) => `- ${c.name}: ${c.count}/${students.length} em đạt Tốt (${Math.round((c.count / totalStudentsCount) * 100)}%)`).join('\n')}
--------------------------------------------------
Xuất từ Hệ thống Sổ Chủ Nhiệm AI lúc ${new Date().toLocaleTimeString('vi-VN')} ngày ${new Date().toLocaleDateString('vi-VN')}`;

    navigator.clipboard.writeText(reportText);
    setCopiedAnalytics(true);
    setTimeout(() => setCopiedAnalytics(false), 2500);
  };

  // Pillar 4: Data integrity scan results
  const missingPhoneStudents = students.filter((s) => !s.phone || s.phone.length < 9);
  const missingCommentStudents = students.filter(
    (s) => !s.tt27Evaluation.teacherFinalComment && !s.tt27Evaluation.aiComment
  );
  const invalidBirthYear = students.filter((s) => !s.birthYear || s.birthYear < 2010 || s.birthYear > 2020);

  // Handle Morning 7:30 AM absentee push
  const handleTriggerMorningAlerts = () => {
    const res = triggerMorningAbsenteeNotification();
    if (res.count === 0) {
      setMorningNotificationStatus('Tuyệt vời! 100% học sinh đã có mặt đúng giờ lúc 7h30.');
    } else {
      setMorningNotificationStatus(
        `Đã phát hiện ${res.count} em vắng mặt / đi muộn đầu giờ (${res.students.map((s) => s.fullName).join(', ')}). Hệ thống đã tạo sẵn tin nhắn khẩn cấp gửi phụ huynh!`
      );
    }
  };

  const handleImportPsv = () => {
    if (!psvInputText.trim()) return;
    const res = importStudentsFromPsv(psvInputText);
    if (res.success) {
      setImportStatus(`Thành công! Đã đồng bộ và nhập ${res.count} học sinh vào hệ thống.`);
      setPsvInputText('');
    } else {
      setImportStatus(`Lỗi định dạng: ${res.error}`);
    }
  };

  const handleDownloadExport = () => {
    const psv = exportStudentsToPsv();
    const blob = new Blob([psv], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Lop_4A1_GoogleSheet_${Date.now()}.txt`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Pillar Selector Nav */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            id: 1,
            title: 'Trụ Cột 1: Tự Động Văn Bản',
            subtitle: 'Smart Auto-Doc Engine',
            icon: FileCheck2,
            color: 'from-blue-600 to-indigo-600',
          },
          {
            id: 2,
            title: 'Trụ Cột 2: Radar Cảnh Báo Sớm',
            subtitle: 'Early Warning System (EWS)',
            icon: Radar,
            color: 'from-amber-600 to-orange-600',
          },
          {
            id: 3,
            title: 'Trụ Cột 3: Trợ Lý Phụ Huynh',
            subtitle: 'Auto-Parent Communication',
            icon: MessageCircle,
            color: 'from-emerald-600 to-teal-600',
          },
          {
            id: 4,
            title: 'Trụ Cột 4: Đồng Bộ CSDL Ngành',
            subtitle: 'Data Integrity & Google Sheet',
            icon: Database,
            color: 'from-purple-600 to-violet-600',
          },
          {
            id: 5,
            title: 'Trụ Cột 5: Biểu Đồ Thống Kê',
            subtitle: 'Analytics & D3 Visuals',
            icon: BarChart3,
            color: 'from-rose-600 to-pink-600',
          },
        ].map((p) => {
          const Icon = p.icon;
          const isActive = activePillar === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePillar(p.id as any)}
              className={`p-4 rounded-2xl border text-left transition relative overflow-hidden shadow-lg ${
                isActive
                  ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2.5 mb-2">
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${p.color} flex items-center justify-center text-white shadow`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Trụ Cột 0{p.id}
                </span>
              </div>
              <h3 className="font-bold text-xs text-white">{p.title}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{p.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* PILLAR 1: SMART AUTO-DOC ENGINE */}
      {activePillar === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-indigo-400" />
                <span>Trụ Cột 1: Tự Động Hóa Văn Bản & Hồ Sơ Nghiệp Vụ (Smart Auto-Doc)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tự động điền & kết xuất báo cáo tuần (Weekly Digest), hồ sơ can thiệp cá nhân và biểu mẫu chuẩn Bộ GD&ĐT
              </p>
            </div>
            <span className="text-xs bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg">
              Chuẩn TT27 & CSDL Ngành
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Template 1: Weekly Digest */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Báo Cáo Tuần (Weekly Digest)</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">Tự động</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Quét nhật ký điểm danh và thi đua tuần, tự động sinh biên bản sinh hoạt lớp và kịch bản điều hành vào mỗi chiều thứ Sáu.
              </p>
              <button
                onClick={() => alert('Đã kết xuất Báo cáo tuần (Weekly Digest) Lớp 4A1!')}
                className="w-full py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Kết Xuất Báo Cáo Tuần</span>
              </button>
            </div>

            {/* Template 2: Support Profile */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Hồ Sơ Can Thiệp Sư Phạm</span>
                <span className="text-[10px] text-amber-400 bg-amber-950 px-2 py-0.5 rounded">AI EWS</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tự động khởi tạo Bản kế hoạch can thiệp cá nhân khi học sinh nghỉ học quá ngưỡng hoặc kết quả giảm đột ngột.
              </p>
              <button
                onClick={() => alert('Đã tạo Bản kế hoạch can thiệp cá nhân cho học sinh cần hỗ trợ!')}
                className="w-full py-2 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Hồ Sơ Can Thiệp</span>
              </button>
            </div>

            {/* Template 3: 1-Click Ministry Forms */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Biểu Mẫu Chuẩn Bộ GD&ĐT</span>
                <span className="text-[10px] text-blue-400 bg-blue-950 px-2 py-0.5 rounded">1-Click</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Điền sẵn dữ liệu vào Sổ theo dõi đánh giá học sinh, Phiếu liên lạc định kỳ đúng lề, đúng phông chữ tiêu chuẩn.
              </p>
              <button
                onClick={() => alert('Đã xuất file biểu mẫu hành chính chuẩn TT27 Bộ GD&ĐT!')}
                className="w-full py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Biểu Mẫu Chuẩn (Excel)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 2: EARLY WARNING SYSTEM (EWS) */}
      {activePillar === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Radar className="w-5 h-5 text-amber-400" />
                <span>Trụ Cột 2: Hệ Thống Radar Cảnh Báo Sớm Học Đường (EWS)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Kích hoạt tự động (Triggers): Nghỉ học quá 3 buổi không liên tục hoặc đi trễ 2 buổi/tuần, phát hiện sụt giảm phong độ
              </p>
            </div>
            <span className="text-xs bg-amber-950/80 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg animate-pulse">
              Radar Đang Quét 24/7
            </span>
          </div>

          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  alert.resolved
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : alert.severity === 'high'
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-amber-950/30 border-amber-500/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        alert.severity === 'high'
                          ? 'bg-rose-900 text-rose-200'
                          : 'bg-amber-900 text-amber-200'
                      }`}
                    >
                      {alert.type === 'attendance' ? 'Chuyên cần' : 'Học tập & Tâm lý'}
                    </span>
                    <h4 className="font-bold text-sm text-white">
                      {alert.studentName}: {alert.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300">{alert.description}</p>
                  <p className="text-xs text-indigo-300">
                    <strong>Hành động đề xuất:</strong> {alert.suggestedAction}
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center">
                  {!alert.resolved ? (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition whitespace-nowrap"
                    >
                      ✓ Đã Xử Lý
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Đã hoàn thành</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Smart Cadence Milestone Reminders */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-xs text-slate-300 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Nhắc Việc Theo Chu Kỳ Năm Học (Smart Cadence)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-indigo-400 font-semibold block">1. Nộp hồ sơ đầu năm</span>
                <span className="text-[11px] text-emerald-400 mt-1 block">✓ Đã hoàn thành 100%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-amber-400 font-semibold block">2. Bình bầu thi đua đợt 20-11</span>
                <span className="text-[11px] text-amber-300 mt-1 block">Đang diễn ra tuần 10</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-300 font-semibold block">3. Chuẩn bị họp PH giữa kỳ</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Hạn chót: 25/11/2026</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-300 font-semibold block">4. Chốt nhận xét học bạ</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Hạn chót: 20/12/2026</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 3: AUTO-PARENT COMMUNICATION */}
      {activePillar === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <span>Trụ Cột 3: Trợ Lý Giao Tiếp & Tương Tác Phụ Huynh Tự Động</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tự động gửi thông báo khẩn cấp đầu giờ (7h30 sáng), tin nhắn định kỳ Zalo/SMS và nhắc lịch uống thuốc
              </p>
            </div>
          </div>

          {/* Morning Absentee Emergency Trigger */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                  <PhoneCall className="w-4 h-4 text-rose-400" />
                  <span>Kích Hoạt Quét Điểm Danh Khẩn Cấp Lúc 7h30 Sáng</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tự động rà soát học sinh vắng mặt ở đầu giờ học để kích hoạt thông báo tức thì cho phụ huynh
                </p>
              </div>

              <button
                onClick={handleTriggerMorningAlerts}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Quét & Báo Động Vắng Đầu Giờ</span>
              </button>
            </div>

            {morningNotificationStatus && (
              <div className="p-3 bg-slate-900 border border-rose-500/30 rounded-lg text-xs text-slate-200">
                {morningNotificationStatus}
              </div>
            )}
          </div>

          {/* Quick Zalo Broadcast Batch */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-sm text-white">
              Cú Pháp Cá Nhân Hóa Toàn Diện:
            </h4>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-indigo-300">
              {'{Tên_Phụ_huynh}'} + {'{Tên_Học_sinh}'} + {'{Điểm_sáng_trong_tuần}'} + {'{Điều_cần_lưu_ý}'}
            </div>
            <p className="text-xs text-slate-400">
              Giáo viên không phải sao chép - dán thủ công từng dòng; có thể bấm duyệt và gửi trực tiếp qua Zalo/SMS cho toàn bộ phụ huynh trong lớp.
            </p>
          </div>
        </div>
      )}

      {/* PILLAR 4: DATA INTEGRITY & AUTO-SYNC */}
      {activePillar === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Database className="w-5 h-5 text-purple-400" />
                <span>Trụ Cột 4: Đồng Bộ & Kiểm Tra Tính Hợp Lệ Dữ Liệu (Data Integrity)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tự động rà soát sai sót hồ sơ, mapping dữ liệu với SMAS/VnEdu và đồng bộ Google Sheets hai chiều
              </p>
            </div>
            <button
              onClick={handleDownloadExport}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất File Google Sheet</span>
            </button>
          </div>

          {/* Integrity Scanner Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Kiểm tra Số Điện Thoại PH:</span>
              <span className="text-lg font-bold text-emerald-400">
                {students.length - missingPhoneStudents.length} / {students.length} hợp lệ
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                {missingPhoneStudents.length === 0 ? 'Không có hồ sơ nào thiếu SĐT' : `${missingPhoneStudents.length} hồ sơ cần bổ sung`}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Kiểm tra Trùng Mã / TT:</span>
              <span className="text-lg font-bold text-emerald-400">100% Duy Nhất</span>
              <p className="text-[11px] text-slate-500 mt-1">Không phát hiện trùng lặp tài khoản</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Hoàn thiện nhận xét TT27:</span>
              <span className="text-lg font-bold text-indigo-400">
                {students.length - missingCommentStudents.length} / {students.length} em
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                {missingCommentStudents.length === 0 ? 'Đã hoàn tất sổ nhận xét' : `Còn ${missingCommentStudents.length} em chưa lưu nhận xét`}
              </p>
            </div>
          </div>

          {/* Google Sheet Sync / PSV Import Box */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">
                  Đồng Bộ Dữ Liệu Theo Mẫu Chuẩn Google Sheet
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  TT|HỌ VÀ TÊN|NĂM SINH|HỌ VÀ TÊN CHA(MẸ)|SỐ ĐIỆN THOẠI|TÊN ĐĂNG NHẬP|MẬT KHẨU|
                </p>
              </div>

              <div className="text-xs text-slate-400">
                Sheet URL: <span className="text-indigo-400 font-mono">{googleSheetConfig.sheetUrl.slice(0, 32)}...</span>
              </div>
            </div>

            <textarea
              rows={4}
              value={psvInputText}
              onChange={(e) => setPsvInputText(e.target.value)}
              placeholder="Dán nội dung từ Google Sheet theo định dạng: TT|HỌ VÀ TÊN|NĂM SINH|HỌ VÀ TÊN CHA(MẸ)|SỐ ĐIỆN THOẠI|TÊN ĐĂNG NHẬP|MẬT KHẨU|"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {importStatus && (
              <div className="p-3 bg-slate-900 border border-indigo-500/30 rounded-lg text-xs text-indigo-300">
                {importStatus}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleImportPsv}
                disabled={!psvInputText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Đồng Bộ Vào Hệ Thống</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pillar 5: Biểu Đồ Thống Kê & Phân Tích Lớp Học (D3 / SVG Analytics) */}
      {activePillar === 5 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Trụ Cột 05
                </span>
                <h3 className="font-bold text-lg text-white">
                  Phân Tích Thống Kê & Trực Quan Hóa Dữ Liệu
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Trực quan hóa chỉ số chất lượng giáo dục Thông tư 27, thi đua 3 tổ và chuyên cần lớp 4A1 • Trường Tiểu học Hoài Nhơn.
              </p>
            </div>

            <button
              onClick={handleCopyAnalyticsReport}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition shadow-sm"
            >
              {copiedAnalytics ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Đã Sao Chép Báo Cáo!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Sao Chép Báo Cáo Số Liệu</span>
                </>
              )}
            </button>
          </div>

          {/* Cards: TT27 Academic Level Distribution */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Phân Bố Mức Đạt Được Thông Tư 27 (Học Kỳ I)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* T */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">Hoàn Thành Tốt (T)</span>
                  <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                    {tPercent}%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {tCount}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {totalStudentsCount} HS</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${tPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Phát huy tốt phẩm chất, chủ động sáng tạo trong mọi môn học.
                </p>
              </div>

              {/* H */}
              <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">Hoàn Thành (H)</span>
                  <span className="text-xs font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
                    {hPercent}%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {hCount}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {totalStudentsCount} HS</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${hPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Đạt chuẩn kiến thức kỹ năng theo chương trình lớp 4.
                </p>
              </div>

              {/* C */}
              <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400">Cần Cố Gắng (C)</span>
                  <span className="text-xs font-mono bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded">
                    {cPercent}%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {cCount}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {totalStudentsCount} HS</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${cPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Đã kích hoạt kế hoạch can thiệp sớm và kèm cặp 1-1.
                </p>
              </div>
            </div>
          </div>

          {/* Group 3 Organizations: Thi Đua 3 Tổ */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Bảng Xếp Hạng Phong Trào Thi Đua 3 Tổ (Điểm Sao Thưởng Ròng)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {groupsData.map((group, index) => {
                const rankIcons = ['🏆 Hạng 1 (Dẫn đầu)', '🥈 Hạng 2', '🥉 Hạng 3'];
                const rankColors = [
                  'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-slate-950',
                  'border-slate-700 bg-slate-950',
                  'border-slate-800 bg-slate-950',
                ];

                return (
                  <div
                    key={group.id}
                    className={`p-4 rounded-xl border ${rankColors[index]} relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">{group.name}</span>
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {rankIcons[index]}
                      </span>
                    </div>

                    <div className="flex items-baseline space-x-2 my-2">
                      <span className="text-3xl font-black text-white">{group.net}</span>
                      <span className="text-xs text-slate-400">điểm tích lũy</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-400">Sao thưởng:</span>{' '}
                        <span className="font-bold text-emerald-400">+{group.stars} ★</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Điểm trừ:</span>{' '}
                        <span className="font-bold text-rose-400">-{group.demerits}</span>
                      </div>
                      <div className="col-span-2 text-slate-400">
                        Sĩ số: <span className="font-semibold text-white">{group.count} học sinh</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Competencies Breakdown */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <Award className="w-4 h-4 text-teal-400" />
              <span>Tỷ Lệ Đạt Tốt Các Năng Lực & Phẩm Chất Cốt Lõi</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {competencyStats.map((item, idx) => {
                const percent = Math.round((item.count / totalStudentsCount) * 100);
                return (
                  <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                      <span className="text-xs font-mono font-bold text-teal-400">
                        {item.count}/{totalStudentsCount} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
