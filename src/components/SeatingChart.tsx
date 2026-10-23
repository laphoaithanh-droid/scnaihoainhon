import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import confetti from 'canvas-confetti';
import { ClassCommitteeModal, getCadreBadgeInfo } from './ClassCommitteeModal';
import {
  Users,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeftRight,
  ShieldAlert,
  Star,
  Plus,
  Minus,
  Sparkles,
  ClipboardList,
  Calendar,
  HeartPulse,
  Grid,
  List,
  FileSpreadsheet,
  Printer,
  FileDown,
  Trophy,
  Filter,
  UserPlus,
  ClipboardPaste,
  MoveRight,
  Check,
  X,
  Crown,
} from 'lucide-react';

interface SeatingChartProps {
  onSelectStudent: (student: Student) => void;
  onOpenLuckyWheel?: (scope?: 'all' | 1 | 2 | 3 | 4) => void;
}

export const SeatingChart: React.FC<SeatingChartProps> = ({
  onSelectStudent,
  onOpenLuckyWheel,
}) => {
  const {
    currentUser,
    students,
    activeDate,
    updateAttendance,
    addBehaviorLog,
    swapSeats,
    updateSeatPosition,
    moveStudentToGroup,
    autoBalanceGroups,
    addStudent,
    batchImportStudents,
  } = useApp();

  // Dual view switcher: 'grid' (Seating Chart Grid) vs 'cards' (Card List)
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');

  // Sub-tabs: 'seating' (Sơ đồ / Thẻ) vs 'cadres' (Ban cán sự) vs 'duty' (Nhật ký trực nhật)
  const [subTab, setSubTab] = useState<'seating' | 'cadres' | 'duty'>('seating');

  // Selected group filter in Card List mode
  const [selectedGroupTab, setSelectedGroupTab] = useState<'all' | 1 | 2 | 3 | 4>('all');

  // Seat swapping state
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag & drop state
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);

  // Class Committee Assignment Modal state
  const [showCommitteeModal, setShowCommitteeModal] = useState(false);
  const [committeeFocusGroup, setCommitteeFocusGroup] = useState<1 | 2 | 3 | 4 | null>(null);

  const openCommitteeModal = (focusGroup?: 1 | 2 | 3 | 4 | null) => {
    setCommitteeFocusGroup(focusGroup || null);
    setShowCommitteeModal(true);
  };

  const handleAutoBalance = () => {
    autoBalanceGroups();
    fireConfetti();
    showToast(`Đã tự động cân đối đều sĩ số ${students.length} học sinh vào 4 tổ!`);
  };

  // Modals: Add single student & Paste batch roster
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showPasteRosterModal, setShowPasteRosterModal] = useState(false);

  // Form single student
  const [newFullName, setNewFullName] = useState('');
  const [newGender, setNewGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [newGroup, setNewGroup] = useState<1 | 2 | 3 | 4>(1);
  const [newPhone, setNewPhone] = useState('');
  const [newParentName, setNewParentName] = useState('');

  // Paste roster text
  const [pasteText, setPasteText] = useState('');
  const [previewParsedRows, setPreviewParsedRows] = useState<
    Array<{ stt: number; fullName: string; gender: 'Nam' | 'Nữ'; group: 1 | 2 | 3 | 4 }>
  >([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#ec4899', '#6366f1', '#10b981'],
      });
    } catch (e) {}
  };

  const handleGiveStar = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    addBehaviorLog(student.id, {
      type: 'praise',
      category: 'Tuyên dương',
      note: 'Phát biểu hăng hái và có ý thức tốt trong giờ học',
      points: 1,
    });
    fireConfetti();
    showToast(`Đã cộng +1 ⭐ Sao thưởng cho em ${student.fullName}!`);
  };

  const handleDemerit = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    addBehaviorLog(student.id, {
      type: 'warning',
      category: 'Kỷ luật',
      note: 'Nhắc nhở mất trật tự hoặc chưa tập trung nghe giảng',
      points: -1,
    });
    showToast(`Đã ghi nhận nhắc nhở em ${student.fullName}`);
  };

  const handleQuickAttendance = (
    e: React.MouseEvent,
    student: Student,
    status: 'present' | 'excused' | 'unexcused' | 'late'
  ) => {
    e.stopPropagation();
    updateAttendance(student.id, status);
    const labels = {
      present: 'Có mặt',
      excused: 'Có phép',
      unexcused: 'Không phép',
      late: 'Đi muộn',
    };
    showToast(`Điểm danh ${student.fullName}: ${labels[status]}`);
  };

  const handleSwapClick = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    if (!swapSourceId) {
      setSwapSourceId(studentId);
      showToast('Đang chọn vị trí 1. Hãy nhấn vào học sinh thứ 2 để hoán đổi chỗ!');
    } else if (swapSourceId === studentId) {
      setSwapSourceId(null);
      showToast('Đã hủy chế độ đổi chỗ.');
    } else {
      swapSeats(swapSourceId, studentId);
      setSwapSourceId(null);
      showToast('Đã hoán đổi chỗ ngồi thành công!');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    setDraggedStudentId(studentId);
    e.dataTransfer.setData('text/plain', studentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnGroup = (e: React.DragEvent, targetGroup: 1 | 2 | 3 | 4) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData('text/plain') || draggedStudentId;
    if (studentId) {
      moveStudentToGroup(studentId, targetGroup);
      const student = students.find((s) => s.id === studentId);
      showToast(`Đã chuyển bạn ${student?.fullName || 'học sinh'} sang Tổ ${targetGroup}!`);
    }
    setDraggedStudentId(null);
  };

  const handleDropOnStudent = (e: React.DragEvent, targetStudentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedStudentId;
    if (sourceId && sourceId !== targetStudentId) {
      swapSeats(sourceId, targetStudentId);
      const s1 = students.find((s) => s.id === sourceId);
      const s2 = students.find((s) => s.id === targetStudentId);
      showToast(`Đã hoán đổi chỗ ngồi: ${s1?.fullName || 'bạn'} ↔ ${s2?.fullName || 'bạn'}!`);
    }
    setDraggedStudentId(null);
  };

  const handleDropOnEmptyDesk = (
    e: React.DragEvent,
    targetGroup: 1 | 2 | 3 | 4,
    targetTableIdx: number,
    targetPos: 'left' | 'right'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedStudentId;
    if (sourceId) {
      updateSeatPosition(sourceId, targetGroup, targetTableIdx, targetPos);
      const student = students.find((s) => s.id === sourceId);
      showToast(`Đã xếp bạn ${student?.fullName || 'học sinh'} vào Bàn ${targetTableIdx + 1} (${targetPos === 'left' ? 'bên trái' : 'bên phải'}) Tổ ${targetGroup}!`);
    }
    setDraggedStudentId(null);
  };

  // Group filtering
  const getGroupStudents = (groupId: 1 | 2 | 3 | 4) => {
    return students.filter((s) => s.seat.group === groupId);
  };

  // Parse paste text (e.g. STT \t Họ tên \t Giới tính \t Tổ or CSV)
  const handleParsePasteText = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setPreviewParsedRows([]);
      return;
    }

    const lines = text.trim().split('\n');
    const parsed: Array<{ stt: number; fullName: string; gender: 'Nam' | 'Nữ'; group: 1 | 2 | 3 | 4 }> = [];

    lines.forEach((line, index) => {
      // Split by tab, comma, or semicolon
      const tokens = line.split(/[\t,;]+/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length >= 2) {
        let stt = index + 1;
        let name = tokens[0];
        let gender: 'Nam' | 'Nữ' = 'Nam';
        let group: 1 | 2 | 3 | 4 = ((index % 4) + 1) as 1 | 2 | 3 | 4;

        // If first token is numeric STT
        if (/^\d+$/.test(tokens[0]) && tokens.length >= 3) {
          stt = parseInt(tokens[0], 10);
          name = tokens[1];
          const genderToken = tokens[2].toLowerCase();
          gender = genderToken.includes('nữ') || genderToken === 'f' ? 'Nữ' : 'Nam';
          if (tokens[3]) {
            const groupNum = parseInt(tokens[3].replace(/\D/g, ''), 10);
            if (groupNum >= 1 && groupNum <= 4) group = groupNum as any;
          }
        } else {
          // Name is first
          const genderToken = (tokens[1] || '').toLowerCase();
          gender = genderToken.includes('nữ') || genderToken === 'f' ? 'Nữ' : 'Nam';
          if (tokens[2]) {
            const groupNum = parseInt(tokens[2].replace(/\D/g, ''), 10);
            if (groupNum >= 1 && groupNum <= 4) group = groupNum as any;
          }
        }

        parsed.push({ stt, fullName: name, gender, group });
      }
    });

    setPreviewParsedRows(parsed);
  };

  const handleConfirmBatchImport = () => {
    if (previewParsedRows.length === 0) return;
    const count = batchImportStudents(previewParsedRows);
    showToast(`Đã nạp thành công ${count} học sinh vào lớp học!`);
    setShowPasteRosterModal(false);
    setPasteText('');
    setPreviewParsedRows([]);
  };

  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;

    const stt = students.length + 1;
    const cleanPrefix = newFullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);

    addStudent({
      stt,
      fullName: newFullName.trim(),
      birthYear: 2015,
      gender: newGender,
      parentName: newParentName.trim() || `Phụ huynh em ${newFullName}`,
      phone: newPhone.trim() || '0900000000',
      username: `hs.${cleanPrefix}${stt}`,
      password: 'hs123@password',
      seat: {
        group: newGroup,
        tableIndex: Math.floor(getGroupStudents(newGroup).length / 2),
        position: getGroupStudents(newGroup).length % 2 === 0 ? 'left' : 'right',
      },
      stars: 10,
      demerits: 0,
      attendance: {},
      behaviorLogs: [],
      boardingHealth: {
        lunchStatus: 'tốt',
        napStatus: 'ngủ ngon',
        temperature: 36.5,
        medicineSchedule: [],
      },
      tt27Evaluation: {
        academicLevel: 'H',
        competencies: { selfLearning: 'H', collaboration: 'H', problemSolving: 'H' },
        qualities: { patriotism: 'T', kindness: 'T', diligence: 'H', honesty: 'T', responsibility: 'H' },
        subjectResults: { Toán: 'H', 'Tiếng Việt': 'H' },
      },
    });

    showToast(`Đã thêm học sinh ${newFullName} vào Tổ ${newGroup}!`);
    setShowAddStudentModal(false);
    setNewFullName('');
    setNewPhone('');
    setNewParentName('');
  };

  // Export Roster to CSV
  const handleExportCsv = () => {
    const headers = 'STT,Họ và Tên,Giới Tính,Tổ,Số Sao ⭐,Điểm Trừ,Điểm Danh Nay,Đánh Giá TT27,Phụ Huynh,SĐT\n';
    const rows = students.map((s) => {
      const att = s.attendance[activeDate] || 'present';
      return `"${s.stt}","${s.fullName}","${s.gender}","Tổ ${s.seat.group}","${s.stars}","${s.demerits}","${att}","${s.tt27Evaluation.academicLevel}","${s.parentName}","${s.phone}"`;
    });
    const blob = new Blob(['\uFEFF' + headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_Sach_Lop_To_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file báo cáo lớp học thành công!');
  };

  // Render a student desk card in the Grid view
  const renderStudentDesk = (
    student?: Student,
    groupNum?: 1 | 2 | 3 | 4,
    tableIdx: number = 0,
    pos: 'left' | 'right' = 'left'
  ) => {
    if (!student) {
      return (
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnEmptyDesk(e, (groupNum || 1) as any, tableIdx, pos)}
          className="h-16 rounded-xl border border-dashed border-cyan-500/25 bg-[#070e24]/40 flex flex-col items-center justify-center text-slate-500 text-xs p-1 transition hover:border-[#00f2fe]/60 hover:bg-cyan-950/20 hover:text-[#00f2fe] cursor-pointer"
          title={`Chỗ trống Bàn ${tableIdx + 1} (${pos === 'left' ? 'trái' : 'phải'}) - Thả học sinh vào đây`}
        >
          <span className="text-[10px] font-semibold text-slate-400">Chỗ trống</span>
          <span className="text-[8px] text-cyan-400/60 font-mono">Bàn {tableIdx + 1} ({pos === 'left' ? 'T' : 'P'})</span>
        </div>
      );
    }

    const attendanceStatus = student.attendance[activeDate] || 'present';
    const isSelectedForSwap = swapSourceId === student.id;
    const cadreBadge = getCadreBadgeInfo(student.cadreRole);

    const attendanceColors = {
      present: 'border-emerald-500/35 bg-[#09152e]/90 hover:border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.08)]',
      excused: 'border-blue-500/40 bg-[#091838]/90 hover:border-blue-400',
      unexcused: 'border-rose-500/50 bg-[#1f0d1a]/90 hover:border-rose-400 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.2)]',
      late: 'border-amber-500/40 bg-[#1f160a]/90 hover:border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.12)]',
    };

    const statusBadge = {
      present: { text: 'Có mặt', class: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' },
      excused: { text: 'Có phép', class: 'bg-blue-950/80 text-blue-400 border-blue-500/30' },
      unexcused: { text: 'Vắng KP', class: 'bg-rose-950/80 text-rose-400 border-rose-500/40 font-bold' },
      late: { text: 'Đi muộn', class: 'bg-amber-950/80 text-amber-400 border-amber-500/30' },
    };

    return (
      <div
        key={student.id}
        draggable
        onDragStart={(e) => handleDragStart(e, student.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDropOnStudent(e, student.id)}
        onClick={() => onSelectStudent(student)}
        className={`group relative rounded-xl border p-1.5 transition-all cursor-pointer shadow-md select-none ${
          isSelectedForSwap
            ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-950/40 scale-[1.02]'
            : attendanceColors[attendanceStatus]
        }`}
      >
        {/* Top bar: STT, Cadre & Attendance Status */}
        <div className="flex items-center justify-between mb-1 gap-1">
          <div className="flex items-center space-x-1 min-w-0">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[9px] font-bold border border-slate-700 flex-shrink-0">
              {student.stt}
            </span>
            {cadreBadge && (
              <span
                className={`text-[8px] font-black px-1.5 py-0.2 rounded border truncate max-w-[80px] inline-block ${cadreBadge.badgeClass}`}
                title={student.cadreRole}
              >
                {cadreBadge.label}
              </span>
            )}
          </div>
          <span className={`text-[8px] px-1 py-0.2 rounded border flex-shrink-0 ${statusBadge[attendanceStatus].class}`}>
            {statusBadge[attendanceStatus].text}
          </span>
        </div>

        {/* Avatar, Student Name & Stars */}
        <div className="flex items-center space-x-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center text-sm shadow border border-cyan-400/30 flex-shrink-0 group-hover:scale-105 transition">
            {student.gender === 'Nam' ? '👦' : '👧'}
          </div>

          <div className="flex-1 min-w-0 mr-1">
            <h4 className="font-bold text-[11px] text-white group-hover:text-[#00f2fe] transition truncate leading-tight">
              {student.fullName}
            </h4>
            <p className="text-[8.5px] text-slate-400 truncate">
              {student.parentName ? student.parentName.split(' ').slice(-2).join(' ') : 'PH'} • {student.phone.slice(-4)}
            </p>
          </div>

          <div className="flex items-center space-x-0.5 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 text-amber-300 text-[9.5px] font-bold flex-shrink-0">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>{student.stars}</span>
          </div>
        </div>

        {/* Medicine badge if any */}
        {student.boardingHealth?.medicineSchedule?.length > 0 && (
          <div className="mt-1 flex items-center space-x-1 text-[8.5px] text-rose-300 bg-rose-950/40 px-1 py-0.2 rounded border border-rose-500/20">
            <HeartPulse className="w-2 h-2 text-rose-400 animate-pulse" />
            <span className="truncate">Có thuốc ({student.boardingHealth.medicineSchedule.length})</span>
          </div>
        )}

        {/* Quick action controls */}
        <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-0.5">
            <button
              onClick={(e) => handleQuickAttendance(e, student, 'present')}
              title="Có mặt"
              className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition ${
                attendanceStatus === 'present'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
              }`}
            >
              ✓
            </button>
            <button
              onClick={(e) => handleQuickAttendance(e, student, 'late')}
              title="Đi muộn"
              className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition ${
                attendanceStatus === 'late'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-amber-400'
              }`}
            >
              M
            </button>
            <button
              onClick={(e) => handleQuickAttendance(e, student, 'unexcused')}
              title="Vắng không phép"
              className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition ${
                attendanceStatus === 'unexcused'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-rose-400'
              }`}
            >
              V
            </button>
          </div>

          <div className="flex items-center space-x-0.5">
            <button
              onClick={(e) => handleGiveStar(e, student)}
              title="Cộng 1 sao thi đua"
              className="p-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition"
            >
              <Plus className="w-3 h-3 text-amber-400" />
            </button>
            <button
              onClick={(e) => handleDemerit(e, student)}
              title="Nhắc nhở"
              className="p-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition"
            >
              <Minus className="w-3 h-3 text-rose-400" />
            </button>
            <button
              onClick={(e) => handleSwapClick(e, student.id)}
              title="Hoán đổi chỗ ngồi"
              className={`p-0.5 rounded transition ${
                isSelectedForSwap ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-900 border border-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-sm animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. TOP TOOLBAR: ACTIONS & DUAL-VIEW SWITCHER (CYBER COMPACT)        */}
      {/* =================================================================== */}
      <div className="cyber-glass rounded-2xl p-3 sm:p-3.5 shadow-lg space-y-2 border border-[#00f2fe]/25">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/30">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                  <span>Quản Trị Hồ Sơ & Sơ Đồ Lớp {currentUser?.className ? `- ${currentUser.className}` : ''}</span>
                  <span className="text-[10px] bg-[#00f2fe]/15 text-[#00f2fe] px-2 py-0.5 rounded-full border border-[#00f2fe]/30 font-bold">
                    Sĩ số: {students.length} học sinh
                  </span>
                </h2>
                <p className="text-[10.5px] text-slate-400">
                  Mô phỏng 4 Tổ lớp học • Kéo - thả chuyển tổ • Điểm danh 1-chạm & Thẻ hành động học sinh
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons: Lucky Wheel, Import, Export, Print */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Lucky Wheel Main Trigger */}
            <button
              onClick={() => onOpenLuckyWheel && onOpenLuckyWheel('all')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center space-x-1"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-200" />
              <span>Vòng Quay May Mắn 🎡</span>
            </button>

            {/* Class Committee Quick Action */}
            <button
              onClick={() => openCommitteeModal()}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-xs font-bold border border-amber-500/35 transition flex items-center space-x-1 shadow-sm"
              title="Phân công Ban Cán Sự Lớp & Các Tổ"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Phân Công Cán Sự ✏️</span>
            </button>

            {/* Auto Balance 4 Groups */}
            <button
              onClick={handleAutoBalance}
              className="px-2.5 py-1.5 rounded-xl bg-[#0a122c] hover:bg-[#111e47] text-cyan-300 hover:text-white text-xs font-semibold border border-cyan-500/30 transition flex items-center space-x-1"
              title="Tự động chia đều học sinh vào 4 tổ (8-8-8-8 hoặc 8-8-7-7)"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cân Đối 4 Tổ ⚖️</span>
            </button>

            {/* Add single student */}
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#0a122c] hover:bg-[#111e47] text-slate-200 text-xs font-semibold border border-cyan-500/30 transition flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Thêm Học Sinh</span>
            </button>

            {/* Paste Roster Text */}
            <button
              onClick={() => setShowPasteRosterModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#0a122c] hover:bg-[#111e47] text-slate-200 text-xs font-semibold border border-indigo-500/30 transition flex items-center space-x-1"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dán Danh Sách</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 rounded-xl bg-[#0a122c] hover:bg-[#111e47] text-slate-200 text-xs font-semibold border border-emerald-500/30 transition flex items-center space-x-1"
              title="Xuất file Excel/CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xuất Báo Cáo</span>
            </button>

            {/* Print Seating Chart */}
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-xl bg-[#0a122c] hover:bg-[#111e47] text-slate-300 hover:text-white border border-slate-700 transition"
              title="In trực tiếp sơ đồ lớp"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Switchers & Sub-tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-cyan-500/15">
          {/* Dual View: Sơ Đồ Lớp (Grid) vs Danh Sách Thẻ (Cards) */}
          <div className="flex items-center space-x-1 bg-[#05091b]/90 p-0.5 rounded-xl border border-cyan-500/20 text-xs">
            <button
              onClick={() => {
                setViewMode('grid');
                setSubTab('seating');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 text-[11px] ${
                viewMode === 'grid' && subTab === 'seating'
                  ? 'bg-gradient-to-r from-[#00f2fe]/20 to-[#4facfe]/30 text-[#00f2fe] border border-[#00f2fe]/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Sơ Đồ 4 Tổ Lớp Học</span>
            </button>

            <button
              onClick={() => {
                setViewMode('cards');
                setSubTab('seating');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 text-[11px] ${
                viewMode === 'cards' && subTab === 'seating'
                  ? 'bg-gradient-to-r from-[#00f2fe]/20 to-[#4facfe]/30 text-[#00f2fe] border border-[#00f2fe]/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3 h-3" />
              <span>Danh Sách Thẻ Theo Tổ</span>
            </button>
          </div>

          {/* Sub tabs: Ban cán sự, Trực nhật */}
          <div className="flex items-center space-x-1 bg-[#05091b]/90 p-0.5 rounded-xl border border-cyan-500/20 text-xs">
            <button
              onClick={() => setSubTab('cadres')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 text-[11px] ${
                subTab === 'cadres'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3 h-3 text-amber-400" />
              <span>Ban Cán Sự</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  openCommitteeModal();
                }}
                className="text-amber-400 hover:text-white hover:scale-125 transition ml-0.5"
                title="Mở bảng phân công cán sự"
              >
                ✏️
              </span>
            </button>

            <button
              onClick={() => setSubTab('duty')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 text-[11px] ${
                subTab === 'duty'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3 h-3" />
              <span>Nhật Ký Trực Nhật</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. CHẾ ĐỘ SƠ ĐỒ LỚP HỌC (SEATING CHART GRID - 4 TỔ ĐỘNG)           */}
      {/* =================================================================== */}
      {subTab === 'seating' && viewMode === 'grid' && (
        <div className="space-y-3">
          {/* Teacher Desk & Blackboard representation (Compact Cyber Podium) */}
          <div className="max-w-md mx-auto bg-gradient-to-b from-[#0a122c] to-[#05091b] border border-[#00f2fe]/40 rounded-xl py-1.5 px-4 text-center shadow-[0_0_12px_rgba(0,242,254,0.15)] space-y-0.5">
            <div className="text-xs font-bold text-amber-300 flex items-center justify-center space-x-1.5">
              <span>🏫 BẢNG LỚP & BÀN GIÁO VIÊN:</span>
              <span className="text-[#00f2fe] underline decoration-cyan-400 font-extrabold">
                {currentUser?.fullName || 'Cô Đỗ Thị Hoà'}
              </span>
              <span className="text-indigo-300 font-semibold text-[11px]">
                ({currentUser?.className || 'Lớp 3C1'})
              </span>
            </div>
            <div className="text-[9.5px] text-slate-400 font-normal">
              Cửa chính lối vào: Hướng Tổ 1 • Cửa sổ: Hướng Tổ 4 • Năm học: {currentUser?.schoolYear || '2026 - 2027'}
            </div>
          </div>

          {/* 4 Tổ Columns (Tổ 1, Tổ 2, Tổ 3, Tổ 4) with Drag & Drop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {([1, 2, 3, 4] as const).map((groupNum) => {
              const groupStudents = getGroupStudents(groupNum);
              const groupLeader = groupStudents.find(
                (s) =>
                  s.cadreRole?.toLowerCase().includes(`tổ trưởng tổ ${groupNum}`) ||
                  (s.cadreRole?.toLowerCase().includes('tổ trưởng') && s.seat.group === groupNum)
              );
              const totalStars = groupStudents.reduce((acc, s) => acc + s.stars, 0);

              // Dynamic table calculation: guarantees 100% of students have desks rendered
              const maxTableIdx = groupStudents.reduce((max, s) => Math.max(max, s.seat.tableIndex), -1);
              const neededTables = Math.max(4, Math.ceil(groupStudents.length / 2), maxTableIdx + 1);
              const tableIndices = Array.from({ length: neededTables }, (_, i) => i);

              return (
                <div
                  key={groupNum}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnGroup(e, groupNum)}
                  className="cyber-glass-card rounded-2xl p-2 sm:p-2.5 shadow-lg flex flex-col transition hover:border-[#00f2fe]/40"
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-cyan-500/20">
                    <div className="min-w-0 flex-1 mr-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-black text-xs text-[#00f2fe] tracking-wider">TỔ {groupNum}</span>
                        <span className="text-[9.5px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded-full border border-cyan-500/30 font-bold">
                          {groupStudents.length} bạn
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <span className="text-amber-400 text-xs">👑</span>
                        <span className="text-[9.5px] text-slate-300 truncate font-medium">
                          Tổ trưởng: <strong className="text-amber-300">{groupLeader ? groupLeader.fullName : 'Chưa chỉ định'}</strong>
                        </span>
                        <button
                          onClick={() => openCommitteeModal(groupNum)}
                          className="p-0.5 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition text-[10px] ml-0.5"
                          title={`Chỉnh sửa phân công Ban Cán Sự Tổ ${groupNum}`}
                        >
                          ✏️
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <div className="flex items-center space-x-0.5 text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded-lg border border-amber-500/20 text-[11px] font-bold">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        <span>{totalStars}</span>
                      </div>

                      {/* Group Quick Spin Button */}
                      <button
                        onClick={() => onOpenLuckyWheel && onOpenLuckyWheel(groupNum)}
                        className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition text-[10px] font-bold"
                        title={`Quay ngẫu nhiên trong Tổ ${groupNum}`}
                      >
                        🎡
                      </button>
                    </div>
                  </div>

                  {/* Double desks list (Dynamic: 100% of students rendered) */}
                  <div className="space-y-1.5 flex-1">
                    {tableIndices.map((tableIdx) => {
                      const leftStudent = groupStudents.find(
                        (s) => s.seat.tableIndex === tableIdx && s.seat.position === 'left'
                      );
                      const rightStudent = groupStudents.find(
                        (s) => s.seat.tableIndex === tableIdx && s.seat.position === 'right'
                      );

                      return (
                        <div key={tableIdx} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[8px] text-slate-400 px-0.5 font-medium">
                            <span className="text-cyan-400 font-bold">Bàn {tableIdx + 1}</span>
                            <span className="font-mono text-cyan-500/60 text-[7.5px]">Bàn đôi (2 chỗ)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 bg-[#05091b]/70 p-1 rounded-xl border border-cyan-500/15">
                            {renderStudentDesk(leftStudent, groupNum, tableIdx, 'left')}
                            {renderStudentDesk(rightStudent, groupNum, tableIdx, 'right')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. CHẾ ĐỘ DANH SÁCH THẺ THEO TỔ (CARD LIST VIEW)                   */}
      {/* =================================================================== */}
      {subTab === 'seating' && viewMode === 'cards' && (
        <div className="space-y-4">
          {/* Group Filter Tabs in Card List */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {(['all', 1, 2, 3, 4] as const).map((g) => {
              const isSelected = selectedGroupTab === g;
              const count = g === 'all' ? students.length : getGroupStudents(g).length;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGroupTab(g)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border whitespace-nowrap ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{g === 'all' ? 'Tất Cả Các Tổ' : `Tổ ${g}`}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {students
              .filter((s) => selectedGroupTab === 'all' || s.seat.group === selectedGroupTab)
              .map((student) => {
                const attStatus = student.attendance[activeDate] || 'present';
                return (
                  <div
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900 transition shadow-lg flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      {/* Top: STT, Group Badge & TT27 Level */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                            {student.stt}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            Tổ {student.seat.group}
                          </span>
                        </div>

                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                          Mức {student.tt27Evaluation.academicLevel}
                        </span>
                      </div>

                      {/* Avatar & Student Name */}
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md flex-shrink-0 group-hover:scale-105 transition">
                          {student.fullName.slice(0, 1)}
                        </div>

                        <div className="truncate">
                          <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition truncate">
                            {student.fullName}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {student.parentName} ({student.phone})
                          </p>
                        </div>
                      </div>

                      {/* Cadre Role or Notes if present */}
                      {student.cadreRole && (
                        <div className="mt-2 text-[10px] font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20 inline-block">
                          {student.cadreRole}
                        </div>
                      )}
                    </div>

                    {/* Bottom: Stars & Quick Attendance status */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1 text-amber-400 font-bold">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span>{student.stars} Sao</span>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          attStatus === 'present'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : attStatus === 'late'
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {attStatus === 'present' ? 'Có mặt' : attStatus === 'late' ? 'Đi muộn' : 'Vắng'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. BAN CÁN SỰ LỚP TAB                                               */}
      {/* =================================================================== */}
      {subTab === 'cadres' && (
        <div className="cyber-glass-card rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 border border-cyan-500/25">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Ban Cán Sự Lớp & Các Tổ</span>
                <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {students.filter((s) => s.cadreRole).length} Cán sự
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Lớp trưởng, Lớp phó và Ban cán sự 4 Tổ phụ trách nề nếp thi đua, học tập và vệ sinh
              </p>
            </div>

            <button
              onClick={() => openCommitteeModal()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <span>Phân Công Cán Sự ✏️</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {students
              .filter((s) => s.cadreRole)
              .map((s) => {
                const cadreBadge = getCadreBadgeInfo(s.cadreRole);
                return (
                  <div
                    key={s.id}
                    onClick={() => onSelectStudent(s)}
                    className="bg-[#070e24]/90 border border-cyan-500/20 rounded-2xl p-4 cursor-pointer hover:border-[#00f2fe]/60 transition space-y-2.5 group shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center text-lg shadow border border-cyan-400/30 group-hover:scale-105 transition">
                        {s.gender === 'Nam' ? '👦' : '👧'}
                      </div>
                      <div className="flex items-center space-x-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-amber-300 text-xs font-bold">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{s.stars} sao</span>
                      </div>
                    </div>

                    <div>
                      {cadreBadge && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border inline-block ${cadreBadge.badgeClass}`}>
                          {cadreBadge.label}
                        </span>
                      )}
                      <h4 className="font-bold text-sm text-white group-hover:text-[#00f2fe] transition mt-1 truncate">
                        {s.fullName}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Tổ {s.seat.group} • STT: {s.stt} • {s.gender}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">SĐT PH: {s.phone}</p>
                    </div>

                    <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-cyan-400 font-semibold">Bàn {s.seat.tableIndex + 1} ({s.seat.position === 'left' ? 'trái' : 'phải'})</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCommitteeModal(s.seat.group);
                        }}
                        className="text-amber-400 hover:text-white p-1 rounded hover:bg-amber-500/20 transition text-xs"
                        title="Đổi phân công"
                      >
                        ✏️ Đổi
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. NHẬT KÝ TRỰC NHẬT TAB                                            */}
      {/* =================================================================== */}
      {subTab === 'duty' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-indigo-400" />
                <span>Nhật Ký & Phân Công Trực Nhật 4 Tổ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Lịch phân công quét lớp, lau bảng, chăm sóc chậu cây và kê bàn ghế
              </p>
            </div>
            <span className="text-xs bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-lg">
              Đánh giá tuần: Tốt (10/10)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { group: 'Tổ 1', day: 'Thứ Hai', task: 'Vệ sinh phòng học & khăn trải bàn giáo viên', status: 'Đã hoàn thành' },
              { group: 'Tổ 2', day: 'Thứ Ba', task: 'Quét lớp, đổ rác và lau bảng', status: 'Đã hoàn thành' },
              { group: 'Tổ 3', day: 'Thứ Tư', task: 'Chăm sóc chậu cây xanh hành lang & lau cửa sổ', status: 'Đã hoàn thành' },
              { group: 'Tổ 4', day: 'Thứ Năm', task: 'Kê lại bàn ghế ngay ngắn & kiểm tra đèn quạt', status: 'Hôm nay' },
            ].map((d, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-300">{d.group}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      d.status === 'Đã hoàn thành'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="text-xs font-semibold text-white">{d.day}</div>
                <div className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {d.task}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. MODAL: ADD SINGLE STUDENT                                        */}
      {/* =================================================================== */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              <span>Thêm Học Sinh Mới Vào Lớp</span>
            </h3>

            <form onSubmit={handleAddSingleStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Họ và tên học sinh:</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Tuấn Kiệt"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Giới tính:</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Xếp vào Tổ:</label>
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(parseInt(e.target.value, 10) as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                  >
                    <option value={1}>Tổ 1</option>
                    <option value={2}>Tổ 2</option>
                    <option value={3}>Tổ 3</option>
                    <option value={4}>Tổ 4</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Họ tên Phụ huynh:</label>
                <input
                  type="text"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Văn Nam"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Số điện thoại liên hệ:</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow"
                >
                  Lưu Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 7. MODAL: DÁN NHANH DANH SÁCH (COPY-PASTE BATCH ROSTER)              */}
      {/* =================================================================== */}
      {showPasteRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200 max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-base text-white flex items-center space-x-2 shrink-0">
              <ClipboardPaste className="w-5 h-5 text-indigo-400" />
              <span>Dán Nhanh Danh Sách Lớp (Copy-Paste)</span>
            </h3>

            <p className="text-xs text-slate-400 shrink-0">
              Thầy cô copy từ Excel hoặc Word dạng bảng/dòng: <code>STT [Tab/Phẩy] Họ và Tên [Tab] Giới Tính [Tab] Tổ</code> và dán vào ô bên dưới:
            </p>

            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => handleParsePasteText(e.target.value)}
              placeholder={`1\tNguyễn Văn An\tNam\t1\n2\tTrần Thị Mai\tNữ\t2\n3\tLê Hoàng Bách\tNam\t3\n4\tPhạm Ngọc Lan\tNữ\t4`}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 shrink-0"
            />

            {/* Preview Parsed */}
            {previewParsedRows.length > 0 && (
              <div className="space-y-1.5 flex-1 overflow-y-auto">
                <span className="font-bold text-xs text-emerald-400">
                  Xem trước {previewParsedRows.length} học sinh được nhận diện:
                </span>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2">STT</th>
                        <th className="p-2">Họ và tên</th>
                        <th className="p-2">Giới tính</th>
                        <th className="p-2">Tổ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {previewParsedRows.map((r, i) => (
                        <tr key={i} className="text-slate-200">
                          <td className="p-2">{r.stt}</td>
                          <td className="p-2 font-bold text-white">{r.fullName}</td>
                          <td className="p-2">{r.gender}</td>
                          <td className="p-2 text-indigo-400 font-semibold">Tổ {r.group}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowPasteRosterModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmBatchImport}
                disabled={previewParsedRows.length === 0}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow transition"
              >
                Xác Nhận Nạp {previewParsedRows.length} Học Sinh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 8. MODAL: CLASS COMMITTEE ASSIGNMENT                                */}
      {/* =================================================================== */}
      <ClassCommitteeModal
        isOpen={showCommitteeModal}
        onClose={() => setShowCommitteeModal(false)}
        initialFocusGroup={committeeFocusGroup}
        onSaved={() => showToast('Đã lưu và đồng bộ phân công Ban Cán Sự Lớp!')}
      />
    </div>
  );
};
