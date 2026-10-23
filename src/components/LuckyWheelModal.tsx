import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Trophy,
  X,
  Play,
  Star,
  Award,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  Users,
  Filter,
  CheckSquare,
  Square,
  History,
  Volume2,
  BrainCircuit,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface LuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope?: 'all' | 1 | 2 | 3 | 4;
}

// Adaptive questions bank for random student challenge
const ADAPTIVE_QUIZ_BANK: Record<string, string[]> = {
  math_level1: [
    'Đố em: 25 x 4 bằng bao nhiêu? (Đáp án: 100)',
    'Đố em: 1 tạ bằng bao nhiêu ki-lô-gam? (Đáp án: 100 kg)',
    'Đố em: Muốn tìm số trung bình cộng của 3 số, ta làm thế nào?',
  ],
  math_level2: [
    'Đố em: Tính nhẩm: 125 x 8 = ? (Đáp án: 1000)',
    'Đố em: Một hình chữ nhật có chiều dài 12m, chiều rộng 8m. Diện tích là bao nhiêu? (Đáp án: 96 m²)',
    'Đố em: Đổi 3 tấn 5 tạ sang ki-lô-gam? (Đáp án: 3500 kg)',
  ],
  math_level3: [
    'Đố em: Tìm hai số có tổng là 45 và hiệu là 15? (Đáp án: 30 và 15)',
    'Đố em: Một lớp học có 32 học sinh, số bạn nam nhiều hơn số bạn nữ là 4 bạn. Hỏi có bao nhiêu bạn nữ? (Đáp án: 14 bạn)',
  ],
  vietnamese: [
    'Đố em: Trong câu "Mặt trời tỏa ánh nắng ấm áp", từ nào là tính từ? (Đáp án: ấm áp)',
    'Đố em: Điền từ còn thiếu vào thành ngữ: "Uống nước nhớ ..."? (Đáp án: nguồn)',
    'Đố em: Đặt 1 câu có sử dụng từ ngữ miêu tả tiếng chim hót?',
  ],
  science: [
    'Đố em: Nước tồn tại ở mấy thể trong tự nhiên? Kể tên? (Đáp án: 3 thể: rắn, lỏng, khí)',
    'Đố em: Hiện tượng nước bốc hơi tạo thành mây gọi là gì? (Đáp án: Sự bay hơi & ngưng tụ)',
  ],
  informatics: [
    'Đố em: Kể tên 2 thao tác cơ bản khi sử dụng chuột máy tính? (Đáp án: Nháy chuột, nháy đúp, kéo thả)',
    'Đố em: Để tìm kiếm thông tin an toàn trên mạng, ta không nên chia sẻ điều gì? (Đáp án: Mật khẩu, địa chỉ cá nhân)',
  ],
};

// Web Audio API tick sound generator
const playWheelTickSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700 + Math.random() * 200, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  } catch (e) {
    // Audio context suspended or not allowed
  }
};

// Web Audio fanfare when wheel stops on winner
const playWinnerFanfare = () => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const melody = [
      { freq: 523.25, time: 0.0, dur: 0.12 },
      { freq: 659.25, time: 0.12, dur: 0.12 },
      { freq: 783.99, time: 0.24, dur: 0.14 },
      { freq: 1046.5, time: 0.38, dur: 0.4 },
    ];
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + note.time);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + note.time + note.dur
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + note.dur + 0.05);
    });
  } catch (e) {
    // ignore
  }
};

// Slice color palette
const SLICE_COLORS = [
  '#4f46e5', // indigo
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // rose
  '#7c3aed', // violet
  '#0284c7', // sky
  '#ea580c', // orange
  '#10b981', // green
  '#ec4899', // pink
  '#0891b2', // cyan
];

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  isOpen,
  onClose,
  initialScope = 'all',
}) => {
  const { students, luckyWheelHistory, recordCallWinner } = useApp();

  // Picker scope: all, 1, 2, 3, 4
  const [scopeGroup, setScopeGroup] = useState<'all' | 1 | 2 | 3 | 4>(initialScope);
  const [pedagogicalFilter, setPedagogicalFilter] = useState<'all' | 'not_called' | 'needs_practice' | 'active'>('all');
  const [noRepeatMode, setNoRepeatMode] = useState<boolean>(true);
  const [calledIdsThisSession, setCalledIdsThisSession] = useState<string[]>([]);

  // Wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<string | null>(null);
  const [awardSuccess, setAwardSuccess] = useState<string | null>(null);
  const [showHistoryTab, setShowHistoryTab] = useState(false);

  // Sync initial scope if opened from group
  useEffect(() => {
    if (initialScope) {
      setScopeGroup(initialScope);
    }
  }, [initialScope, isOpen]);

  // Compute eligible candidates
  const eligibleStudents = React.useMemo(() => {
    return students.filter((s) => {
      // 1. Group filter
      if (scopeGroup !== 'all' && s.seat.group !== scopeGroup) {
        return false;
      }
      // 2. No repeat mode
      if (noRepeatMode && calledIdsThisSession.includes(s.id)) {
        return false;
      }
      // 3. Pedagogical criteria
      if (pedagogicalFilter === 'not_called') {
        return (s.calledCount || 0) === 0 && s.stars === 0;
      }
      if (pedagogicalFilter === 'needs_practice') {
        return s.demerits > 0 || s.tt27Evaluation.academicLevel === 'C';
      }
      if (pedagogicalFilter === 'active') {
        return s.stars > 0;
      }
      return true;
    });
  }, [students, scopeGroup, pedagogicalFilter, noRepeatMode, calledIdsThisSession]);

  if (!isOpen) return null;

  // Spin handler
  const handleSpin = () => {
    if (isSpinning) return;

    if (eligibleStudents.length === 0) {
      if (noRepeatMode && calledIdsThisSession.length > 0) {
        // Reset session if everyone was called
        setCalledIdsThisSession([]);
        alert('Tất cả học sinh trong nhóm đã được gọi lượt này! Hệ thống vừa đặt lại danh sách để bắt đầu vòng quay mới.');
        return;
      }
      alert('Không có học sinh nào phù hợp với bộ lọc hiện tại.');
      return;
    }

    setIsSpinning(true);
    setSelectedStudent(null);
    setCurrentQuiz(null);
    setAwardSuccess(null);

    const winnerIndex = Math.floor(Math.random() * eligibleStudents.length);
    const winner = eligibleStudents[winnerIndex];

    const sliceAngle = 360 / eligibleStudents.length;
    // Calculate final rotation so the slice aligns with top pointer (-90 deg offset)
    const extraFullTurns = 360 * (5 + Math.floor(Math.random() * 3));
    // The top pointer points at angle 270 deg (or top 0 deg depending on orientation)
    // Slices are drawn starting from 0 deg clockwise.
    // To land slice at the top (270 deg / -90 deg), we subtract the slice center angle
    const sliceCenterAngle = winnerIndex * sliceAngle + sliceAngle / 2;
    const targetDegree =
      rotationDegree + extraFullTurns + (360 - (sliceCenterAngle % 360)) + 270;

    setRotationDegree(targetDegree);

    // Audio ticking sound effect during rotation
    let tickCount = 0;
    const maxTicks = 28;
    const tickInterval = setInterval(() => {
      tickCount++;
      playWheelTickSound();
      if (tickCount >= maxTicks) {
        clearInterval(tickInterval);
      }
    }, 110);

    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setSelectedStudent(winner);

      // Record in session to avoid repeats
      if (noRepeatMode) {
        setCalledIdsThisSession((prev) => [...prev, winner.id]);
      }

      // Pick an adaptive question for this student based on competence
      let cat = 'math_level1';
      if (winner.competencyLevels?.math && winner.competencyLevels.math >= 3) {
        cat = 'math_level3';
      } else if (winner.competencyLevels?.math === 2) {
        cat = 'math_level2';
      } else if (Math.random() > 0.5) {
        cat = 'vietnamese';
      }
      const questions = ADAPTIVE_QUIZ_BANK[cat] || ADAPTIVE_QUIZ_BANK.math_level1;
      const q = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuiz(q);

      // Play fanfare & confetti
      playWinnerFanfare();
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ec4899', '#6366f1', '#10b981'],
      });
    }, 3800);
  };

  // Quick Action 1: Award Stars
  const handleAwardStars = (stars: number) => {
    if (!selectedStudent) return;
    recordCallWinner(selectedStudent.id, stars);
    setAwardSuccess(`Đã cộng +${stars} ⭐ Sao thưởng cho em ${selectedStudent.fullName}!`);
    setTimeout(() => setAwardSuccess(null), 3000);
  };

  // Quick Action 2: Random Adaptive Question change
  const handleGenerateNewQuestion = () => {
    const allCategories = Object.keys(ADAPTIVE_QUIZ_BANK);
    const randomCat = allCategories[Math.floor(Math.random() * allCategories.length)];
    const list = ADAPTIVE_QUIZ_BANK[randomCat];
    const newQ = list[Math.floor(Math.random() * list.length)];
    setCurrentQuiz(newQ);
  };

  // Slices generation for SVG Wheel
  const renderWheelSvg = () => {
    const count = eligibleStudents.length || 1;
    const sliceAngle = 360 / count;
    const radius = 120;
    const center = 130;

    return (
      <svg
        viewBox="0 0 260 260"
        className="w-full h-full transition-transform duration-[3800ms] ease-out drop-shadow-2xl"
        style={{
          transform: `rotate(${rotationDegree}deg)`,
          transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      >
        <circle cx={center} cy={center} r={radius + 6} fill="#1e1b4b" stroke="#f59e0b" strokeWidth="4" />

        {eligibleStudents.map((student, idx) => {
          const startAngle = (idx * sliceAngle * Math.PI) / 180;
          const endAngle = (((idx + 1) * sliceAngle) * Math.PI) / 180;

          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          const x2 = center + radius * Math.cos(endAngle);
          const y2 = center + radius * Math.sin(endAngle);

          const largeArc = sliceAngle > 180 ? 1 : 0;
          const pathD = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          const color = SLICE_COLORS[idx % SLICE_COLORS.length];

          // Text placement angle
          const midAngleDeg = idx * sliceAngle + sliceAngle / 2;
          const midAngleRad = (midAngleDeg * Math.PI) / 180;
          const textX = center + (radius * 0.65) * Math.cos(midAngleRad);
          const textY = center + (radius * 0.65) * Math.sin(midAngleRad);

          // Truncate name for small slices
          const displayName = student.fullName.split(' ').pop() || student.fullName;

          return (
            <g key={student.id}>
              <path d={pathD} fill={color} stroke="#0f172a" strokeWidth="1.5" />
              <text
                x={textX}
                y={textY}
                fill="#ffffff"
                fontSize={count > 16 ? '8' : count > 10 ? '10' : '11'}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${midAngleDeg + 90}, ${textX}, ${textY})`}
              >
                {displayName}
              </text>
            </g>
          );
        })}

        {/* Center hub */}
        <circle cx={center} cy={center} r="26" fill="#0f172a" stroke="#f59e0b" strokeWidth="3" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 p-4 sm:p-5 flex items-center justify-between text-white shrink-0 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center space-x-2">
                <span>Vòng Quay May Mắn & Chọn Học Sinh Ngẫu Nhiên</span>
                <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
                  Classroom Picker
                </span>
              </h3>
              <p className="text-xs text-white/80">
                Gọi tên ngẫu nhiên công bằng • Khích lệ phát biểu • Tặng sao thi đua tức thì
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowHistoryTab(!showHistoryTab)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition ${
                showHistoryTab
                  ? 'bg-white text-slate-900 shadow'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Xem nhật ký gọi tên"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Nhật Ký</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {showHistoryTab ? (
            /* Call History Log */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-bold text-sm text-amber-400 flex items-center space-x-2">
                  <History className="w-4 h-4" />
                  <span>Nhật Ký Gọi Tên Hôm Nay ({luckyWheelHistory.length} lượt)</span>
                </h4>
                <button
                  onClick={() => setShowHistoryTab(false)}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Quay lại vòng quay
                </button>
              </div>

              {luckyWheelHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Chưa có học sinh nào được gọi trong tiết học hôm nay. Hãy quay ngay!
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {luckyWheelHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white text-sm">{item.studentName}</span>
                        <span className="text-slate-400 ml-2">Tổ {item.group} • {item.timestamp}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-amber-400 font-bold">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span>+{item.starsAwarded} Sao</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Normal Wheel View */
            <div className="space-y-5">
              {/* SCOPE SELECTOR & PEDAGOGICAL FILTERS */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Scope Selector: All / To 1 / To 2 / To 3 / To 4 */}
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center space-x-1">
                      <Filter className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Phạm vi:</span>
                    </span>

                    {(['all', 1, 2, 3, 4] as const).map((g) => (
                      <button
                        key={g}
                        disabled={isSpinning}
                        onClick={() => setScopeGroup(g)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          scopeGroup === g
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {g === 'all' ? 'Cả Lớp' : `Tổ ${g}`}
                      </button>
                    ))}
                  </div>

                  {/* No-Repeat Mode Toggle */}
                  <button
                    onClick={() => setNoRepeatMode(!noRepeatMode)}
                    disabled={isSpinning}
                    className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white self-start sm:self-auto bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 transition"
                  >
                    {noRepeatMode ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                    <span>Không lặp lại học sinh</span>
                  </button>
                </div>

                {/* Pedagogical criteria filters */}
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80 overflow-x-auto text-xs pb-1 scrollbar-none">
                  <span className="text-slate-500 text-[11px] whitespace-nowrap">Tiêu chí:</span>
                  {[
                    { id: 'all', label: 'Tất cả bạn' },
                    { id: 'not_called', label: 'Chưa phát biểu (0 sao)' },
                    { id: 'needs_practice', label: 'Cần rèn luyện thêm' },
                    { id: 'active', label: 'Đã có sao thi đua' },
                  ].map((crit) => (
                    <button
                      key={crit.id}
                      disabled={isSpinning}
                      onClick={() => setPedagogicalFilter(crit.id as any)}
                      className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition font-medium ${
                        pedagogicalFilter === crit.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {crit.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* WHEEL DISPLAY CONTAINER */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center my-2">
                {/* Pointer Indicator (Fixed at Top) */}
                <div className="absolute -top-3 z-30 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 filter drop-shadow-[0_4px_6px_rgba(245,158,11,0.5)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-200 -mt-1 shadow" />
                </div>

                {/* Svg Wheel with Slices */}
                {renderWheelSvg()}

                {/* Center Spin Button */}
                <button
                  onClick={handleSpin}
                  disabled={isSpinning || eligibleStudents.length === 0}
                  className="absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-600 via-amber-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center shadow-2xl shadow-rose-600/50 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 group border-2 border-amber-300"
                >
                  <Sparkles className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition" />
                  <span>{isSpinning ? '...' : 'QUAY'}</span>
                </button>
              </div>

              {/* Status and count */}
              <div className="text-center text-xs text-slate-400">
                {isSpinning ? (
                  <span className="text-amber-400 font-bold animate-pulse">
                    🎡 Vòng quay đang quay... Ai sẽ là học sinh may mắn?
                  </span>
                ) : (
                  <span>
                    Đang chọn giữa <strong>{eligibleStudents.length}</strong> học sinh đủ điều kiện ({scopeGroup === 'all' ? 'Toàn lớp' : `Tổ ${scopeGroup}`})
                  </span>
                )}
              </div>

              {/* ========================================================= */}
              {/* WINNER ANNOUNCEMENT MODAL & 3 QUICK ACTIONS               */}
              {/* ========================================================= */}
              {selectedStudent && (
                <div className="bg-gradient-to-b from-indigo-950/90 to-slate-950 border-2 border-amber-500/60 p-5 rounded-3xl shadow-2xl space-y-4 animate-scaleUp">
                  {/* Title & Confetti celebration */}
                  <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>Học Sinh May Mắn Được Gọi Lên Bảng</span>
                    </div>

                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      Tổ {selectedStudent.seat.group}
                    </span>
                  </div>

                  {/* Student Info Card */}
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0">
                      {selectedStudent.fullName.slice(0, 1)}
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {selectedStudent.fullName}
                      </h3>
                      <p className="text-xs text-indigo-300 mt-0.5">
                        STT: {selectedStudent.stt} • Hiện có {selectedStudent.stars} ⭐ Sao thi đua
                      </p>
                      <p className="text-xs text-amber-300 font-semibold mt-0.5">
                        Chúc mừng bạn {selectedStudent.fullName}! Mời em tự tin lên bảng trả lời nhé! ⭐
                      </p>
                    </div>
                  </div>

                  {/* Adaptive Challenge Question */}
                  {currentQuiz && (
                    <div className="p-3.5 bg-slate-900 rounded-2xl border border-indigo-500/30 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                        <span className="flex items-center space-x-1.5">
                          <HelpCircle className="w-4 h-4 text-cyan-400" />
                          <span>Câu hỏi phát biểu dành riêng cho em:</span>
                        </span>
                        <button
                          onClick={handleGenerateNewQuestion}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Đổi câu khác</span>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-100 font-semibold leading-relaxed">
                        {currentQuiz}
                      </p>
                    </div>
                  )}

                  {/* Success notification badge */}
                  {awardSuccess && (
                    <div className="p-2.5 bg-emerald-950 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{awardSuccess}</span>
                    </div>
                  )}

                  {/* 3 QUICK ACTIONS */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    {/* Action 1: Award 1-3 Stars */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleAwardStars(1)}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1 shadow transition"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>+1 Sao</span>
                      </button>

                      <button
                        onClick={() => handleAwardStars(2)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1 shadow transition"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>+2 Sao</span>
                      </button>

                      <button
                        onClick={() => handleAwardStars(3)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center space-x-1 shadow transition"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>+3 Sao ⭐</span>
                      </button>
                    </div>

                    {/* Action 3: Spin Again / Skip */}
                    <button
                      onClick={handleSpin}
                      disabled={isSpinning}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 border border-slate-700 transition"
                      title="Quay tiếp lượt khác hoặc bỏ qua"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Quay Lại Lượt Khác 🔄</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
