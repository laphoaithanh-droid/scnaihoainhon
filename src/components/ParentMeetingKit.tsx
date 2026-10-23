import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import {
  Users,
  MessageSquare,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Send,
  Sparkles,
  QrCode,
  FileCheck,
  Calendar,
  Share2,
} from 'lucide-react';
import { generateParentMessage } from '../services/geminiService';

export const ParentMeetingKit: React.FC = () => {
  const { students } = useApp();
  const [activeTab, setActiveTab] = useState<'zalo' | 'cards' | 'script'>('zalo');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [meetingType, setMeetingType] = useState<'early' | 'mid' | 'end'>('mid');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  // Default Zalo/SMS personalized message
  const [zaloMessage, setZaloMessage] = useState<string>(
    `Kính gửi Phụ huynh em ${currentStudent?.fullName},

Thầy/Cô chủ nhiệm Lớp 4A1 xin gửi thông tin rèn luyện tuần này của em:
- Chuyên cần: Đi học đầy đủ, đúng giờ.
- Điểm sáng: Tích lũy được ${currentStudent?.stars} sao thi đua, luôn tích cực phát biểu xây dựng bài.
- Điều cần lưu ý: ${currentStudent?.demerits > 0 ? `Gia đình nhắc nhở em chuẩn bị kỹ đồ dùng học tập trước khi đến lớp.` : `Em luôn giữ vững phong độ học tập tốt.`}

Kính chúc gia đình một cuối tuần nhiều niềm vui!`
  );

  // Sync message when student changes
  React.useEffect(() => {
    if (currentStudent) {
      setZaloMessage(
        `Kính gửi phụ huynh em ${currentStudent.fullName},

Thầy/Cô chủ nhiệm Lớp 4A1 xin thông tin tình hình rèn luyện tuần này của em:
- Chuyên cần: Đi học chuyên cần.
- Điểm sáng: Tích lũy được ${currentStudent.stars} sao thi đua, tiếp thu bài nhanh.
- Điều gia đình phối hợp: ${currentStudent.demerits > 0 ? `Nhờ gia đình động viên em giữ trật tự và tập trung nghe giảng hơn.` : `Em luôn chấp hành tốt nội quy lớp học.`}

Trân trọng,
Giáo viên chủ nhiệm Lớp 4A1.`
      );
    }
  }, [selectedStudentId, currentStudent]);

  const handleGenerateAiMessage = async () => {
    if (!currentStudent) return;
    setIsAiGenerating(true);

    try {
      const res = await generateParentMessage({
        parentName: currentStudent.parentName,
        studentName: currentStudent.fullName,
        stars: currentStudent.stars,
        demerits: currentStudent.demerits,
        attendanceNote: 'Đi học đều đặn',
        academicProgress: `Đánh giá chung mức ${currentStudent.tt27Evaluation.academicLevel === 'T' ? 'Hoàn thành tốt' : 'Hoàn thành'}`,
      });

      if (res.message) {
        setZaloMessage(res.message);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Lỗi tạo tin nhắn phụ huynh: ${e?.message || 'Không thể tạo tin nhắn'}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(zaloMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">
              Họp Phụ Huynh & Cầu Nối Gia Đình (Zalo / SMS Kit)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Bộ tài liệu họp phụ huynh chuẩn hóa, phiếu bàn giao rèn luyện từng em & trình tạo tin nhắn báo cáo định kỳ
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('zalo')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'zalo'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Trình Tạo Tin Nhắn Zalo/SMS</span>
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'cards'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Phiếu Bàn Giao Kết Quả Cá Nhân</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'script'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kịch Bản Họp Phụ Huynh</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Zalo / SMS Message Composer */}
      {activeTab === 'zalo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Students List */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-slate-300">Chọn Phụ Huynh Học Sinh</span>
              <span className="text-[10px] text-slate-500">{students.length} gia đình</span>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {students.map((s) => {
                const isSelected = s.id === selectedStudentId;
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
                    <div className="truncate">
                      <div className="font-semibold text-xs truncate">{s.fullName}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        PH: {s.parentName} ({s.phone})
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-amber-300 text-[11px] font-bold">
                      <span>{s.stars}⭐</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Message editor */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">
                  Tin Nhắn Gửi Phụ Huynh: {currentStudent?.parentName} (Em {currentStudent?.fullName})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Số điện thoại: {currentStudent?.phone} • Cú pháp tế nhị, mang tính xây dựng
                </p>
              </div>

              <button
                onClick={handleGenerateAiMessage}
                disabled={isAiGenerating}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isAiGenerating ? 'AI Đang Soạn...' : 'AI Cá Nhân Hóa Tin Nhắn'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={zaloMessage}
              onChange={(e) => setZaloMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                Tự động điền: Điểm sáng rèn luyện • Nhắc nhở tế nhị • Chúc cuối tuần
              </span>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={handleCopy}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã Sao Chép' : 'Sao Chép Tin Nhắn'}</span>
                </button>

                <a
                  href={`https://zalo.me/${currentStudent?.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Mở Zalo Gửi Ngay</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Individual Progress Slips (In phiếu rèn luyện) */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-300">
              Xem và in phiếu bàn giao kết quả rèn luyện cho học sinh:{' '}
              <span className="font-bold text-white">{currentStudent?.fullName}</span>
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu Rèn Luyện (PDF)</span>
            </button>
          </div>

          {/* Printable Individual Slip */}
          <div className="max-w-2xl mx-auto bg-white text-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-300 font-sans space-y-6">
            <div className="border-b-2 border-slate-800 pb-4 text-center">
              <h3 className="text-sm uppercase tracking-wider font-semibold text-slate-600">
                ỦY BAN NHÂN DÂN THỊ XÃ HOÀI NHƠN • TRƯỜNG TIỂU HỌC HOÀI NHƠN
              </h3>
              <h2 className="text-xl font-black text-indigo-900 mt-1 uppercase tracking-tight">
                PHIẾU BÀN GIAO KẾT QUẢ RÈN LUYỆN HỌC SINH
              </h2>
              <p className="text-xs text-slate-500 italic mt-0.5">
                (Đánh giá định kỳ theo Thông tư 27/2020/TT-BGDĐT)
              </p>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p><strong>Họ và tên:</strong> {currentStudent?.fullName}</p>
                <p className="mt-1"><strong>Lớp:</strong> 4A1 • <strong>STT:</strong> {currentStudent?.stt}</p>
                <p className="mt-1"><strong>Năm sinh:</strong> {currentStudent?.birthYear}</p>
              </div>
              <div>
                <p><strong>Phụ huynh:</strong> {currentStudent?.parentName}</p>
                <p className="mt-1"><strong>Số điện thoại:</strong> {currentStudent?.phone}</p>
                <p className="mt-1"><strong>GVCN:</strong> Cô Lê Hoàng Thanh</p>
              </div>
            </div>

            {/* Evaluation Results */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                I. Kết Quả Học Tập & Năng Lực, Phẩm Chất
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Mức Đánh Giá Chung</span>
                  <span className="text-base font-black text-indigo-900 mt-1 block">
                    {currentStudent?.tt27Evaluation.academicLevel === 'T' ? 'Hoàn thành tốt' : 'Hoàn thành'}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Sao Tích Lũy</span>
                  <span className="text-base font-black text-amber-700 mt-1 block">
                    {currentStudent?.stars} Ngôi sao
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Chuyên Cần</span>
                  <span className="text-base font-black text-emerald-800 mt-1 block">
                    Đạt 100%
                  </span>
                </div>
              </div>
            </div>

            {/* Teacher Personal Comment */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                II. Lời Nhận Xét Của Giáo Viên Chủ Nhiệm
              </h4>
              <p className="p-4 bg-slate-50 rounded-xl border border-slate-200 italic text-slate-700 leading-relaxed">
                "{currentStudent?.tt27Evaluation.teacherFinalComment || currentStudent?.tt27Evaluation.aiComment || 'Em luôn có ý thức học tập chăm ngoan, chấp hành tốt nội quy lớp học.'}"
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs">
              <div>
                <p className="font-bold text-slate-800">Ý KIẾN PHỤ HUYNH</p>
                <p className="text-[11px] text-slate-500 italic mt-1">(Ký và ghi rõ họ tên)</p>
                <div className="h-16" />
                <p className="font-semibold text-slate-700">{currentStudent?.parentName}</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">GIÁO VIÊN CHỦ NHIỆM</p>
                <p className="text-[11px] text-slate-500 italic mt-1">(Ký và ghi rõ họ tên)</p>
                <div className="h-16" />
                <p className="font-semibold text-slate-700">Cô Lê Hoàng Thanh</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Meeting Scripts */}
      {activeTab === 'script' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white">
              Kịch Bản Điều Hành & Biên Bản Họp Phụ Huynh Học Sinh
            </h3>

            <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setMeetingType('early')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  meetingType === 'early' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Đầu Năm
              </button>
              <button
                onClick={() => setMeetingType('mid')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  meetingType === 'mid' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Giữa Kỳ I
              </button>
              <button
                onClick={() => setMeetingType('end')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  meetingType === 'end' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Cuối Năm
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed space-y-4">
            <div className="text-center font-bold text-sm text-indigo-300">
              KỊCH BẢN ĐIỀU HÀNH CUỘC HỌP PHỤ HUYNH {meetingType === 'early' ? 'ĐẦU NĂM HỌC' : meetingType === 'mid' ? 'SƠ KẾT GIỮA KỲ I' : 'TỔNG KẾT NĂM HỌC'}
            </div>

            <p><strong>1. Đón tiếp & Ổn định (10 phút):</strong> Ban đại diện cha mẹ học sinh hướng dẫn phụ huynh ký tên điểm danh, phát Phiếu rèn luyện cá nhân.</p>
            <p><strong>2. Báo cáo của GVCN (25 phút):</strong>
            <br />- Báo cáo tình hình chung của Lớp 4A1 (sĩ số 18 học sinh, nề nếp bán trú, tỷ lệ chuyên cần 100%).
            <br />- Đổi mới phương pháp đánh giá học sinh tiểu học theo Thông tư 27 của Bộ Giáo dục & Đào tạo.
            <br />- Biểu dương tinh thần học tập và phong trào thi đua "Hoa Điểm Mười".</p>
            <p><strong>3. Phương hướng hoạt động & phối hợp (15 phút):</strong> Phối hợp giữa nhà trường và gia đình trong việc đôn đốc tự học ở nhà, hạn chế sử dụng thiết bị điện tử.</p>
            <p><strong>4. Thảo luận & Biểu quyết (15 phút):</strong> Phụ huynh phát biểu ý kiến đóng góp, biểu quyết thông qua nghị quyết họp.</p>
          </div>
        </div>
      )}
    </div>
  );
};
