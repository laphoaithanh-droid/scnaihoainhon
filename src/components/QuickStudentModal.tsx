import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import confetti from 'canvas-confetti';
import {
  X,
  User,
  Star,
  Award,
  CalendarCheck,
  HeartPulse,
  Pill,
  Sparkles,
  Phone,
  KeyRound,
  FileText,
  Plus,
  Minus,
  Languages,
  Bot,
  GraduationCap,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  HelpCircle,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Send,
  MessageCircle,
  Bookmark,
  Sparkle,
} from 'lucide-react';
import { generateExamStudySheet } from '../services/geminiService';

interface QuickStudentModalProps {
  student: Student | null;
  onClose: () => void;
  onOpenAiTutor?: (student: Student) => void;
  onOpenBilingual?: (student: Student) => void;
}

export const QuickStudentModal: React.FC<QuickStudentModalProps> = ({
  student,
  onClose,
  onOpenAiTutor,
  onOpenBilingual,
}) => {
  const {
    updateStudent,
    addBehaviorLog,
    updateAttendance,
    activeDate,
    bilingualLessons,
    recordPronunciationPractice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'bilingual' | 'tutor' | 'exam'>('profile');

  // Teacher's notes state
  const [teacherNotes, setTeacherNotes] = useState<string>(student?.teacherNotes || '');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Competency levels state (1 to 4)
  const [competencyLevels, setCompetencyLevels] = useState<{
    math: 1 | 2 | 3 | 4;
    vietnamese: 1 | 2 | 3 | 4;
    science?: 1 | 2 | 3 | 4;
    informatics?: 1 | 2 | 3 | 4;
  }>(
    student?.competencyLevels || {
      math: 3,
      vietnamese: 3,
      science: 3,
      informatics: 3,
    }
  );

  // Audio Play/Pause/Stop state for Bilingual sample phrase
  type AudioPlayState = 'idle' | 'playing' | 'paused';
  const [audioState, setAudioState] = useState<AudioPlayState>('idle');
  const [activeSamplePhrase, setActiveSamplePhrase] = useState<string>(
    'Multiplication with two-digit numbers helps us solve real-world problems.'
  );

  // Mini AI tutor in Student Mode state
  const [tutorInput, setTutorInput] = useState('');
  const [tutorMessages, setTutorMessages] = useState<
    Array<{ sender: 'student' | 'tutor'; text: string; time: string }>
  >([
    {
      sender: 'tutor',
      text: `Chào bạn nhỏ ${student?.fullName || ''}! Thầy/Cô Ong Vàng rất vui được đồng hành cùng con. Con đang gặp khó khăn ở bài Toán hay Tiếng Việt nào, hãy nói với thầy/cô nhé! 🐝✨`,
      time: '08:15',
    },
  ]);
  const [isTutorThinking, setIsTutorThinking] = useState(false);

  // Exam prep sheet state
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [generatedExamSheet, setGeneratedExamSheet] = useState<string | null>(null);
  const [examCopied, setExamCopied] = useState(false);

  if (!student) return null;

  const currentAttendance = student.attendance[activeDate] || 'present';

  // Quick Star or Sticker praise
  const handleAwardStar = (points: number, reason: string) => {
    addBehaviorLog(student.id, {
      type: 'praise',
      category: 'Khen thưởng sư phạm',
      note: reason,
      points,
    });
    try {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch (e) {}
    setSaveSuccess(`Đã tặng +${points} ⭐ cho em ${student.fullName}!`);
    setTimeout(() => setSaveSuccess(null), 2500);
  };

  // Save Teacher's Notes & Competencies
  const handleSaveTeacherNotes = () => {
    updateStudent(student.id, {
      teacherNotes,
      competencyLevels,
    });
    setSaveSuccess('Đã lưu Sổ tay sư phạm & Mức độ năng lực thành công!');
    setTimeout(() => setSaveSuccess(null), 2500);
  };

  // Audio controls: Play, Pause, Stop
  const handlePlayAudio = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (audioState === 'paused') {
      window.speechSynthesis.resume();
      setAudioState('playing');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => setAudioState('idle');
    utterance.onerror = () => setAudioState('idle');
    window.speechSynthesis.speak(utterance);
    setAudioState('playing');
  };

  const handlePauseAudio = () => {
    if (!('speechSynthesis' in window)) return;
    if (audioState === 'playing') {
      window.speechSynthesis.pause();
      setAudioState('paused');
    }
  };

  const handleStopAudio = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setAudioState('idle');
  };

  // Send question in Student AI Tutor Mode
  const handleSendTutorQuestion = (customText?: string) => {
    const qText = customText || tutorInput.trim();
    if (!qText) return;

    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'student' as const, text: qText, time: now };
    setTutorMessages((prev) => [...prev, userMsg]);
    if (!customText) setTutorInput('');
    setIsTutorThinking(true);

    // Pedagogical Student Mode response (warm, concrete, using counters/sweets)
    setTimeout(() => {
      let responseText = '';
      const lower = qText.toLowerCase();

      if (lower.includes('nhân') || lower.includes('toán') || lower.includes('tính')) {
        responseText = `Tuyệt vời bạn nhỏ ${student.fullName}! Để tính bài này dễ ợt nhé: Con hãy tưởng tượng có 4 đĩa bánh, mỗi đĩa có 6 cái kẹo ngọt. Đố con mình có tất cả bao nhiêu chiếc kẹo nào? 🍬 Con thử lấy 6 + 6 + 6 + 6 xem sao nhé!`;
      } else if (lower.includes('tiếng việt') || lower.includes('tính từ') || lower.includes('đoạn văn')) {
        responseText = `Cô khen ${student.fullName} rất ham học hỏi! "Tính từ" là những từ dùng để chỉ màu sắc, hình dáng, tính nết của con người hoặc sự vật. Ví dụ: Bạn ${student.fullName} rất "chăm chỉ" và "thông minh", thì "chăm chỉ" chính là tính từ đó con yêu! 🌟`;
      } else if (lower.includes('tin học') || lower.includes('máy tính')) {
        responseText = `A, môn Tin học lớp mình rất vui! Con nhớ quy tắc vàng nhé: Chuột trái dùng để "chọn", nháy đúp chuột để "mở tệp", và không bao giờ chia sẻ mật khẩu máy tính của mình cho người lạ nha! 💻✨`;
      } else {
        responseText = `Thầy/Cô đã lắng nghe câu hỏi của ${student.fullName}! Bước 1: Con đọc kỹ lại đề bài một lần nữa. Bước 2: Tìm xem bài toán đã cho mình biết điều gì và hỏi điều gì nhé. Con thử nói cho thầy/cô nghe nào! 💡`;
      }

      setTutorMessages((prev) => [
        ...prev,
        {
          sender: 'tutor' as const,
          text: responseText,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTutorThinking(false);
    }, 700);
  };

  // AI Exam Prep Generator for this student
  const handleGenerateCustomExam = async () => {
    setIsGeneratingExam(true);
    try {
      const mathLevel = competencyLevels.math || 3;
      const vietnameseLevel = competencyLevels.vietnamese || 3;

      const prompt = `Tạo một phiếu bài tập ôn thi ngắn gồm 4 câu hỏi trắc nghiệm và tự luận ngắn cho học sinh lớp 4 tên là "${student.fullName}".
Năng lực hiện tại của học sinh:
- Môn Toán: Mức ${mathLevel} (Bộ GD&ĐT Thông tư 27)
- Môn Tiếng Việt: Mức ${vietnameseLevel}
Ghi chú sư phạm của giáo viên: "${teacherNotes || 'Học sinh tiếp thu trực quan tốt, cần rèn tính cẩn thận'}".
Yêu cầu:
1. Câu 1: Toán trắc nghiệm nhận biết hoặc thông hiểu
2. Câu 2: Toán giải toán có lời văn vận dụng vừa sức
3. Câu 3: Tiếng Việt nhận biết từ loại hoặc chính tả
4. Câu 4: Tiếng Việt viết 2 câu miêu tả ngắn
Có đáp án ngắn gọn bên dưới.`;

      const result = await generateExamStudySheet(prompt);
      setGeneratedExamSheet(result);
    } catch (e: any) {
      // Fallback template
      setGeneratedExamSheet(`PHIẾU ÔN TẬP CÁ NHÂN DÀNH CHO: ${student.fullName.toUpperCase()} (Lớp 4A1)
Mục tiêu: Củng cố Mức độ ${competencyLevels.math} môn Toán & Mức độ ${competencyLevels.vietnamese} môn Tiếng Việt

PHẦN 1: TOÁN HỌC
Câu 1: Đặt tính rồi tính:
   a) 124 x 23 = .............        b) 3450 : 25 = .............
Câu 2: Một mảnh đất hình chữ nhật có nửa chu vi là 36m, chiều dài hơn chiều rộng 8m. Tính diện tích mảnh đất đó?
   Bài giải: ................................................................

PHẦN 2: TIẾNG VIỆT
Câu 3: Tìm 2 tính từ chỉ đức tính tốt của người học sinh:
   Trả lời: ................................................................
Câu 4: Viết 2 câu văn miêu tả cảnh đẹp của ngôi trường em đang học.
   Bài làm: ................................................................

LỜI CHÚC TỪ CÔ GIÁO: Chúc em ${student.fullName} làm bài thật cẩn thận và đạt điểm mười nhé! ⭐`);
    } finally {
      setIsGeneratingExam(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 max-h-[94vh] flex flex-col">
        {/* ================================================================= */}
        {/* MODAL HEADER: STUDENT AVATAR, NAME, CADRE, STARS                  */}
        {/* ================================================================= */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20">
              {student.fullName.slice(0, 1)}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-lg text-white">{student.fullName}</h3>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
                  STT: {student.stt}
                </span>
                {student.cadreRole && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                    {student.cadreRole}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tổ {student.seat.group} • Bàn {student.seat.tableIndex + 1} • Phụ huynh: {student.parentName} ({student.phone})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/25 text-amber-400 text-xs font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{student.stars} Sao</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TABS NAVIGATION BAR: 4 DEDICATED STUDENT ACTION PANELS            */}
        {/* ================================================================= */}
        <div className="flex items-center space-x-1 px-5 pt-3 border-b border-slate-800 bg-slate-950/60 text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-t-xl transition flex items-center space-x-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Hồ Sơ & Sư Phạm</span>
          </button>

          <button
            onClick={() => setActiveTab('bilingual')}
            className={`px-3.5 py-2 rounded-t-xl transition flex items-center space-x-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'bilingual'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>2. Song Ngữ & Phát Âm</span>
          </button>

          <button
            onClick={() => setActiveTab('tutor')}
            className={`px-3.5 py-2 rounded-t-xl transition flex items-center space-x-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'tutor'
                ? 'border-purple-500 text-purple-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>3. Gia Sư AI & Nhật Ký Hỏi</span>
          </button>

          <button
            onClick={() => setActiveTab('exam')}
            className={`px-3.5 py-2 rounded-t-xl transition flex items-center space-x-1.5 whitespace-nowrap border-b-2 ${
              activeTab === 'exam'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>4. Ôn Tập & Đề Thi Riêng</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB CONTENTS                                                      */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {saveSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-xl font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 1: GENERAL PROFILE & TEACHER'S NOTES & PRAISE STICKERS       */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-slate-400 block mb-1">Sao Thi Đua</span>
                  <span className="text-lg font-black text-amber-400 flex items-center justify-center space-x-1">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{student.stars}</span>
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-slate-400 block mb-1">Điểm Nhắc Nhở</span>
                  <span className="text-lg font-black text-rose-400">{student.demerits} lần</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-slate-400 block mb-1">Đánh Giá TT27</span>
                  <span className="text-lg font-black text-indigo-400">
                    Mức {student.tt27Evaluation.academicLevel}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-slate-400 block mb-1">Chuyên Cần Hôm Nay</span>
                  <span className="text-xs font-bold text-emerald-400 uppercase mt-1 block">
                    {currentAttendance}
                  </span>
                </div>
              </div>

              {/* Sổ tay ghi chú sư phạm (Teacher's Notes) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 flex items-center space-x-2 text-xs">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    <span>Sổ Tay Ghi Chú Sư Phạm (Dành Riêng Cho Em {student.fullName}):</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Tự động gắn liền tài khoản</span>
                </div>

                <textarea
                  rows={3}
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Nhập nhận xét riêng (VD: Còn nhầm âm ch/tr, tính nhẩm nhanh nhưng chưa cẩn thận, đam mê tin học...)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveTeacherNotes}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                  >
                    Lưu Sổ Tay Ghi Chú
                  </button>
                </div>
              </div>

              {/* Khen thưởng & Tặng Sao / Sticker tức thì */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Khen Thưởng & Tặng Sticker Thi Đua 1 Chạm:</span>
                </span>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAwardStar(1, 'Phát biểu hăng hái xây dựng bài')}
                    className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center space-x-1.5 transition shadow"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Tặng +1 Sao ⭐</span>
                  </button>
                  <button
                    onClick={() => handleAwardStar(2, 'Giải bài xuất sắc và hỗ trợ bạn bè')}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5 transition shadow"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Tặng +2 Sao ⭐⭐</span>
                  </button>
                  <button
                    onClick={() => handleAwardStar(3, 'Ngôi sao sáng của tuần')}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center space-x-1.5 transition shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tặng +3 Sao ⭐⭐⭐</span>
                  </button>
                  <button
                    onClick={() => handleAwardStar(1, 'Sticker: Rất Chăm Chỉ 🐝')}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 font-semibold"
                  >
                    🐝 Chăm Chỉ
                  </button>
                  <button
                    onClick={() => handleAwardStar(1, 'Sticker: Sáng Tạo 💡')}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 font-semibold"
                  >
                    💡 Sáng Tạo
                  </button>
                  <button
                    onClick={() => handleAwardStar(1, 'Sticker: Tiến Bộ Vượt Bậc 🚀')}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-400 text-emerald-300 font-semibold"
                  >
                    🚀 Tiến Bộ
                  </button>
                </div>
              </div>

              {/* Health and Boarding info */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sức Khỏe & Bán Trú:</span>
                </span>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Ăn trưa</span>
                    <strong className="text-emerald-400 capitalize">{student.boardingHealth.lunchStatus}</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Ngủ trưa</span>
                    <strong className="text-indigo-400 capitalize">{student.boardingHealth.napStatus}</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Thân nhiệt</span>
                    <strong className="text-slate-200">{student.boardingHealth.temperature || 36.5}°C</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 2: BILINGUAL & SPEAKING HUB FOR THIS STUDENT                 */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'bilingual' && (
            <div className="space-y-5">
              {/* Speaking Stats Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/30 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block mb-1">Sao Luyện Nói Tích Lũy</span>
                  <div className="flex items-center justify-center space-x-1 text-amber-400 text-lg font-black">
                    <Star className="w-5 h-5 fill-amber-400" />
                    <span>{student.bilingualSpeakingStats?.stars || 6} ⭐</span>
                  </div>
                </div>

                <div className="text-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block mb-1">Điểm Trung Bình Phát Âm</span>
                  <span className="text-lg font-black text-emerald-400">
                    {student.bilingualSpeakingStats?.avgScore || 90}%
                  </span>
                </div>

                <div className="text-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-xs block mb-1">Số Bài Đã Luyện</span>
                  <span className="text-lg font-black text-cyan-400">
                    {student.bilingualSpeakingStats?.practicesCount || 2} bài
                  </span>
                </div>
              </div>

              {/* Sample Speaking Phrase with Play/Pause/Stop controls */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>Mẫu Câu Luyện Phát Âm Riêng Cho Em:</span>
                  </span>
                  <span className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                    Chuẩn Oxford Primary
                  </span>
                </div>

                <p className="text-sm font-bold text-cyan-300 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                  "{activeSamplePhrase}"
                </p>

                {/* Audio Controls (Play, Pause, Stop) */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => handlePlayAudio(activeSamplePhrase)}
                    disabled={audioState === 'playing'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                      audioState === 'playing'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Đọc Mẫu</span>
                  </button>

                  <button
                    onClick={handlePauseAudio}
                    disabled={audioState !== 'playing'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                      audioState !== 'playing'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Tạm Dừng</span>
                  </button>

                  <button
                    onClick={handleStopAudio}
                    disabled={audioState === 'idle'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                      audioState === 'idle'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Dừng Hẳn</span>
                  </button>
                </div>
              </div>

              {/* Key vocabularies recommended for this student */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200">Từ vựng then chốt bé cần chú ý:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { word: 'Multiplication', ipa: '/ˌmʌl.tɪ.plɪˈkeɪ.ʃən/', vi: 'Phép nhân' },
                    { word: 'Prototype', ipa: '/ˈprəʊ.tə.taɪp/', vi: 'Bản mẫu thử nghiệm' },
                  ].map((v, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-cyan-300">{v.word}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{v.ipa} • {v.vi}</div>
                      </div>
                      <button
                        onClick={() => handlePlayAudio(v.word)}
                        className="p-1 rounded bg-slate-800 text-cyan-400 hover:text-white"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 3: PERSONALIZED AI TUTOR IN STUDENT MODE & QUESTION LOG      */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'tutor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-purple-500/30">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      Phòng Học Gia Sư AI Riêng Cho Em {student.fullName}
                    </h4>
                    <span className="text-[10px] text-purple-300">
                      Chế độ STUDENT MODE • Dùng que tính/bánh kẹo trực quan • Khích lệ từng bước
                    </span>
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  Sẵn sàng tương tác
                </span>
              </div>

              {/* Chat Message Box */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 h-[240px] overflow-y-auto space-y-3">
                {tutorMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.sender === 'student' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'student'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-900 border border-purple-500/30 text-purple-100 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.time}</span>
                  </div>
                ))}

                {isTutorThinking && (
                  <div className="flex items-center space-x-2 text-purple-300 text-xs italic">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Thầy/Cô Ong Vàng đang suy nghĩ câu trả lời dễ hiểu nhất cho bé...</span>
                  </div>
                )}
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="flex items-center space-x-2 overflow-x-auto text-[11px] pb-1 scrollbar-none">
                <span className="text-slate-500 whitespace-nowrap">Hỏi nhanh:</span>
                {[
                  'Chỉ con cách nhân số có 2 chữ số',
                  'Làm sao phân biệt âm ch và tr?',
                  'Dạy con cách dùng chuột máy tính',
                ].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendTutorQuestion(sug)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-purple-400 text-slate-300 whitespace-nowrap transition"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={tutorInput}
                  onChange={(e) => setTutorInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendTutorQuestion()}
                  placeholder={`Gửi câu hỏi gợi mở cho em ${student.fullName}...`}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handleSendTutorQuestion()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center space-x-1 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi</span>
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 4: EXAM PREP & 4 COMPETENCY LEVELS & CUSTOM EXAM GENERATOR  */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'exam' && (
            <div className="space-y-5">
              {/* 4 Levels Evaluator (Mức 1 đến Mức 4) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center space-x-2">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span>Đánh Giá Năng Lực 4 Mức Độ (Thông Tư 27):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Mức 1: Nhận biết • Mức 2: Thông hiểu • Mức 3: Vận dụng • Mức 4: Vận dụng cao
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Math Level */}
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300">Môn Toán:</span>
                      <span className="font-bold text-xs text-white">Mức {competencyLevels.math}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {([1, 2, 3, 4] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() =>
                            setCompetencyLevels((prev) => ({ ...prev, math: lvl }))
                          }
                          className={`py-1 rounded text-xs font-bold transition ${
                            competencyLevels.math === lvl
                              ? 'bg-amber-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Mức {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vietnamese Level */}
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-300">Môn Tiếng Việt:</span>
                      <span className="font-bold text-xs text-white">Mức {competencyLevels.vietnamese}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {([1, 2, 3, 4] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() =>
                            setCompetencyLevels((prev) => ({ ...prev, vietnamese: lvl }))
                          }
                          className={`py-1 rounded text-xs font-bold transition ${
                            competencyLevels.vietnamese === lvl
                              ? 'bg-cyan-600 text-white shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Mức {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSaveTeacherNotes}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Lưu Mức Năng Lực
                  </button>
                </div>
              </div>

              {/* AI Custom Exam Generator */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Tạo Đề Ôn Thi Riêng Theo Năng Lực Học Sinh</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      AI thiết kế phiếu 3 - 5 câu nhắm đúng vào dạng bài em {student.fullName} cần cải thiện
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateCustomExam}
                    disabled={isGeneratingExam}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition whitespace-nowrap self-start sm:self-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingExam ? 'Đang soạn đề AI...' : 'Tạo Đề Ôn Riêng Ngay'}</span>
                  </button>
                </div>

                {generatedExamSheet && (
                  <div className="space-y-2 pt-2 border-t border-slate-800 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Phiếu bài tập đã tạo sẵn sàng:</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedExamSheet);
                            setExamCopied(true);
                            setTimeout(() => setExamCopied(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center space-x-1"
                        >
                          {examCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{examCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In Phiếu</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto">
                      {generatedExamSheet}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
