import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import confetti from 'canvas-confetti';
import {
  CalendarCheck,
  Award,
  AlertTriangle,
  Clock,
  HeartPulse,
  Utensils,
  Moon,
  Thermometer,
  Pill,
  CheckCircle,
  Plus,
  Minus,
  Sparkles,
  Search,
  Filter,
  Send,
} from 'lucide-react';

interface DailyTrackerProps {
  onSelectStudent: (student: Student) => void;
}

export const DailyTracker: React.FC<DailyTrackerProps> = ({ onSelectStudent }) => {
  const {
    students,
    activeDate,
    updateAttendance,
    addBehaviorLog,
    updateBoardingHealth,
    toggleMedicineTaken,
    addMedicineReminder,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'attendance' | 'behavior' | 'boarding'>('attendance');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number>(0); // 0 = all
  const [selectedStudentForLog, setSelectedStudentForLog] = useState<Student | null>(null);

  // New behavior log state
  const [logType, setLogType] = useState<'praise' | 'warning'>('praise');
  const [logCategory, setLogCategory] = useState('Phát biểu');
  const [logNote, setLogNote] = useState('');
  const [logPoints, setLogPoints] = useState(1);

  // New medicine reminder state
  const [medStudentId, setMedStudentId] = useState(students[0]?.id || '');
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('11:45');
  const [medDosage, setMedDosage] = useState('1 gói sau ăn');
  const [medParentNote, setMedParentNote] = useState('');

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.stt.toString().includes(searchTerm);
    const matchesGroup = selectedGroup === 0 || s.seat.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  // Calculate attendance summary
  const presentCount = students.filter((s) => (s.attendance[activeDate] || 'present') === 'present').length;
  const excusedCount = students.filter((s) => s.attendance[activeDate] === 'excused').length;
  const unexcusedCount = students.filter((s) => s.attendance[activeDate] === 'unexcused').length;
  const lateCount = students.filter((s) => s.attendance[activeDate] === 'late').length;

  const handleCreateBehaviorLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForLog || !logNote) return;

    addBehaviorLog(selectedStudentForLog.id, {
      type: logType,
      category: logCategory,
      note: logNote,
      points: logType === 'praise' ? Math.abs(logPoints) : -Math.abs(logPoints),
    });

    if (logType === 'praise') {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }

    setLogNote('');
    setSelectedStudentForLog(null);
  };

  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medStudentId || !medName) return;

    addMedicineReminder(medStudentId, {
      time: medTime,
      medicineName: medName,
      dosage: medDosage,
      parentNote: medParentNote || 'Phụ huynh gửi uống trưa',
    });

    setMedName('');
    setMedParentNote('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Có mặt hôm nay</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400">{presentCount}</span>
            <span className="text-xs text-slate-500">/ {students.length} học sinh</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Có phép</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-blue-400">{excusedCount}</span>
            <span className="text-xs text-slate-500">em</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Vắng không phép</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-rose-400">{unexcusedCount}</span>
            <span className="text-xs text-rose-500/80 font-medium">Báo động khẩn</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Đi muộn</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-400">{lateCount}</span>
            <span className="text-xs text-slate-500">em</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Điểm Danh 1 Chạm</span>
          </button>
          <button
            onClick={() => setActiveTab('behavior')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 ${
              activeTab === 'behavior'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>Nhật Ký Nề Nếp & Sao Thưởng</span>
          </button>
          <button
            onClick={() => setActiveTab('boarding')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 ${
              activeTab === 'boarding'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <span>Bán Trú & Sức Khỏe Uống Thuốc</span>
          </button>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên hoặc số TT..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value={0}>Tất cả 3 tổ</option>
            <option value={1}>Tổ 1</option>
            <option value={2}>Tổ 2</option>
            <option value={3}>Tổ 3</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Attendance 1-Touch */}
      {activeTab === 'attendance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">
              Bảng Điểm Danh Chuyên Cần Lớp 4A1 (Ngày {activeDate})
            </h3>
            <span className="text-xs text-slate-400">
              Nhấn 1 chạm vào các nút trạng thái để cập nhật
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="p-3 w-12 text-center">TT</th>
                  <th className="p-3">Họ và Tên</th>
                  <th className="p-3">Tổ</th>
                  <th className="p-3">Phụ Huynh & SĐT</th>
                  <th className="p-3 text-center">Tổng Vắng Kỳ</th>
                  <th className="p-3 text-center">Trạng Thái Hôm Nay</th>
                  <th className="p-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((s) => {
                  const status = s.attendance[activeDate] || 'present';
                  // Count total absent in mock history
                  const totalAbsences = Object.values(s.attendance).filter(
                    (v) => v === 'unexcused' || v === 'excused'
                  ).length;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => onSelectStudent(s)}
                    >
                      <td className="p-3 text-center font-bold text-slate-400">{s.stt}</td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{s.fullName}</div>
                        {s.cadreRole && (
                          <span className="text-[10px] text-indigo-400">{s.cadreRole}</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">Tổ {s.seat.group}</td>
                      <td className="p-3 text-slate-400">
                        <div>{s.parentName}</div>
                        <div className="text-[10px] text-slate-500">{s.phone}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            totalAbsences >= 3
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {totalAbsences} buổi
                        </span>
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 space-x-1">
                          <button
                            onClick={() => updateAttendance(s.id, 'present')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            Có mặt
                          </button>
                          <button
                            onClick={() => updateAttendance(s.id, 'excused')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                              status === 'excused'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-slate-400 hover:text-blue-400'
                            }`}
                          >
                            Có phép
                          </button>
                          <button
                            onClick={() => updateAttendance(s.id, 'unexcused')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                              status === 'unexcused'
                                ? 'bg-rose-600 text-white shadow animate-pulse'
                                : 'text-slate-400 hover:text-rose-400'
                            }`}
                          >
                            Không phép
                          </button>
                          <button
                            onClick={() => updateAttendance(s.id, 'late')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                              status === 'late'
                                ? 'bg-amber-600 text-white shadow'
                                : 'text-slate-400 hover:text-amber-400'
                            }`}
                          >
                            Đi muộn
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(s);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs"
                        >
                          Hồ sơ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Behavior Log & Stars */}
      {activeTab === 'behavior' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Behavior Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Ghi Nhận Hành Vi & Tuyên Dương</span>
            </h3>

            <form onSubmit={handleCreateBehaviorLog} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Chọn học sinh:</label>
                <select
                  value={selectedStudentForLog?.id || ''}
                  onChange={(e) => {
                    const st = students.find((s) => s.id === e.target.value);
                    setSelectedStudentForLog(st || null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Chọn học sinh trong lớp --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stt}. {s.fullName} ({s.stars} ⭐ • {s.demerits} ⚠️)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLogType('praise')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                    logType === 'praise'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Khen thưởng (+Sao)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogType('warning')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                    logType === 'warning'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Nhắc nhở / Vi phạm</span>
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Mảng đánh giá:</label>
                <select
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Phát biểu hăng hái">Phát biểu hăng hái</option>
                  <option value="Giúp đỡ bạn bè">Giúp đỡ bạn bè</option>
                  <option value="Trung thực, nhặt được của rơi">Trung thực, nhặt được của rơi</option>
                  <option value="Vệ sinh, trực nhật tốt">Vệ sinh, trực nhật tốt</option>
                  <option value="Tiến bộ trong học tập">Tiến bộ trong học tập</option>
                  <option value="Nói chuyện riêng trong giờ">Nói chuyện riêng trong giờ</option>
                  <option value="Quên đồ dùng học tập / sách vở">Quên đồ dùng học tập / sách vở</option>
                  <option value="Chưa hoàn thành bài tập">Chưa hoàn thành bài tập</option>
                  <option value="Đi muộn / mất trật tự">Đi muộn / mất trật tự</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Ghi chú cụ thể:</label>
                <textarea
                  rows={3}
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder="Ví dụ: Giải bài toán số 3 rất nhanh và tự tin lên bảng giải thích cho cả lớp..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedStudentForLog || !logNote}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg transition flex items-center justify-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ghi Vào Sổ Nhật Ký</span>
              </button>
            </form>
          </div>

          {/* Behavior Feed List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Dòng Thời Gian Nhật Ký Lớp Học</h3>
              <span className="text-xs text-slate-400">Tổng hợp mới nhất</span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {students.flatMap((s) =>
                s.behaviorLogs.map((log) => ({
                  ...log,
                  studentName: s.fullName,
                  studentStt: s.stt,
                  studentId: s.id,
                }))
              ).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Chưa có nhật ký hành vi nào được ghi trong ngày.
                </div>
              ) : (
                students
                  .flatMap((s) =>
                    s.behaviorLogs.map((log) => ({
                      ...log,
                      studentName: s.fullName,
                      studentStt: s.stt,
                      studentId: s.id,
                    }))
                  )
                  .sort((a, b) => b.id.localeCompare(a.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex items-start justify-between space-x-3 ${
                        item.type === 'praise'
                          ? 'bg-emerald-950/25 border-emerald-500/30'
                          : 'bg-rose-950/25 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            item.type === 'praise'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {item.type === 'praise' ? '⭐' : '⚠️'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs text-white">
                              {item.studentName}
                            </span>
                            <span className="text-[10px] text-slate-400">({item.category})</span>
                            <span className="text-[10px] text-slate-500">
                              {item.date} lúc {item.time}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{item.note}</p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          item.type === 'praise'
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'bg-rose-900/60 text-rose-300'
                        }`}
                      >
                        {item.points > 0 ? `+${item.points} Sao` : `${item.points} Điểm`}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Boarding & Health */}
      {activeTab === 'boarding' && (
        <div className="space-y-6">
          {/* Add Medicine Schedule Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2 mb-4">
              <Pill className="w-4 h-4 text-rose-400" />
              <span>Tiếp Nhận Đơn Thuốc Phụ Huynh Gửi Uống Kèm Giờ Nhắc Nhở</span>
            </h3>

            <form onSubmit={handleAddMedicine} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Học sinh:</label>
                <select
                  value={medStudentId}
                  onChange={(e) => setMedStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stt}. {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tên thuốc:</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="Ví dụ: Siro ho Astex / Kháng sinh"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Giờ nhắc uống:</label>
                <input
                  type="time"
                  value={medTime}
                  onChange={(e) => setMedTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Liều lượng:</label>
                <input
                  type="text"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  placeholder="5ml sau ăn trưa..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!medName}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
                >
                  + Thêm Lịch Thuốc
                </button>
              </div>
            </form>
          </div>

          {/* Boarding Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                <span>Nhật Ký Bán Trú: Ăn Trưa, Giấc Ngủ & Đo Thân Nhiệt</span>
              </h3>
              <span className="text-xs text-slate-400">Tự động cập nhật vào sổ theo dõi</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="p-3 w-12 text-center">TT</th>
                    <th className="p-3">Học sinh</th>
                    <th className="p-3">Ăn trưa</th>
                    <th className="p-3">Giấc ngủ trưa</th>
                    <th className="p-3 text-center">Thân nhiệt</th>
                    <th className="p-3">Đơn thuốc gửi kèm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.map((s) => {
                    const health = s.boardingHealth;
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-center font-bold text-slate-400">{s.stt}</td>
                        <td className="p-3 font-semibold text-white">{s.fullName}</td>
                        <td className="p-3">
                          <select
                            value={health.lunchStatus}
                            onChange={(e) =>
                              updateBoardingHealth(s.id, {
                                lunchStatus: e.target.value as any,
                              })
                            }
                            className={`px-2 py-1 rounded text-xs border focus:outline-none ${
                              health.lunchStatus === 'tốt'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                                : health.lunchStatus === 'kém'
                                ? 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                                : 'bg-slate-950 text-slate-300 border-slate-700'
                            }`}
                          >
                            <option value="tốt">Ăn tốt (hết suất)</option>
                            <option value="bình thường">Bình thường</option>
                            <option value="kém">Ăn kém / chậm</option>
                            <option value="không ăn">Không ăn</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={health.napStatus}
                            onChange={(e) =>
                              updateBoardingHealth(s.id, {
                                napStatus: e.target.value as any,
                              })
                            }
                            className="bg-slate-950 text-slate-300 border border-slate-700 px-2 py-1 rounded text-xs focus:outline-none"
                          >
                            <option value="ngủ ngon">Ngủ ngon giấc</option>
                            <option value="khó ngủ">Khó ngủ</option>
                            <option value="trằn trọc">Trằn trọc / giật mình</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.1"
                              value={health.temperature || 36.5}
                              onChange={(e) =>
                                updateBoardingHealth(s.id, {
                                  temperature: parseFloat(e.target.value) || 36.5,
                                })
                              }
                              className={`w-16 text-center px-1.5 py-1 rounded border text-xs focus:outline-none ${
                                (health.temperature || 36.5) >= 37.5
                                  ? 'bg-rose-950 text-rose-300 border-rose-500 font-bold'
                                  : 'bg-slate-950 text-slate-300 border-slate-700'
                              }`}
                            />
                            <span className="text-[10px] text-slate-500">°C</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {health.medicineSchedule?.length > 0 ? (
                            <div className="space-y-1">
                              {health.medicineSchedule.map((med) => (
                                <div
                                  key={med.id}
                                  className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px]"
                                >
                                  <div>
                                    <span className="font-semibold text-rose-300">{med.medicineName}</span>
                                    <span className="text-slate-400 ml-1">({med.time} • {med.dosage})</span>
                                    <div className="text-[10px] text-slate-500">{med.parentNote}</div>
                                  </div>
                                  <button
                                    onClick={() => toggleMedicineTaken(s.id, med.id)}
                                    className={`px-2 py-1 rounded font-semibold text-[10px] transition ${
                                      med.taken
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-amber-600/80 hover:bg-amber-500 text-white'
                                    }`}
                                  >
                                    {med.taken ? '✓ Đã uống' : 'Chờ uống'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">Không gửi thuốc</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
