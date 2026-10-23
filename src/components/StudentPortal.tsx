import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap,
  Star,
  Award,
  CalendarCheck,
  Languages,
  Bot,
  HeartPulse,
  BookOpen,
  MessageCircle,
  User,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { ClassroomChatbot } from './ClassroomChatbot';
import { BilingualHub } from './BilingualHub';

export const StudentPortal: React.FC = () => {
  const { currentUser, students, activeDate } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'bilingual' | 'chatbot'>('overview');

  const student = students.find((s) => s.id === currentUser?.id || s.username === currentUser?.username) || students[0];

  const attendanceStatus = student.attendance[activeDate] || 'present';
  const attendanceLabels = {
    present: { text: 'Có mặt hôm nay', class: 'bg-emerald-950 text-emerald-400 border-emerald-500/30' },
    excused: { text: 'Nghỉ có phép', class: 'bg-blue-950 text-blue-400 border-blue-500/30' },
    unexcused: { text: 'Vắng không phép', class: 'bg-rose-950 text-rose-400 border-rose-500/30 font-bold' },
    late: { text: 'Đi muộn', class: 'bg-amber-950 text-amber-400 border-amber-500/30' },
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Student Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
              {student.fullName.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Chào em, {student.fullName}!
                </h1>
                {student.cadreRole && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                    {student.cadreRole}
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-300 mt-1">
                Lớp 4A1 • Tổ {student.seat.group} • STT: {student.stt} • Phụ huynh: {student.parentName}
              </p>
            </div>
          </div>

          {/* Stars & Points Display */}
          <div className="flex items-center space-x-3 bg-slate-950/80 px-4 py-3 rounded-2xl border border-slate-800">
            <div className="text-center pr-3 border-r border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Sao Tích Lũy</span>
              <span className="text-xl font-black text-amber-400 flex items-center justify-center space-x-1">
                <Star className="w-5 h-5 fill-amber-400" />
                <span>{student.stars}</span>
              </span>
            </div>
            <div className="text-center pl-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Chuyên Cần</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border mt-1 inline-block ${attendanceLabels[attendanceStatus].class}`}>
                {attendanceLabels[attendanceStatus].text}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs for Student */}
        <div className="mt-6 pt-4 border-t border-indigo-900/40 flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Góc Cá Nhân & Nề Nếp</span>
          </button>
          <button
            onClick={() => setActiveTab('bilingual')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'bilingual'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Languages className="w-4 h-4 text-cyan-300" />
            <span>Học Song Ngữ (Audio/TTS)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 font-extrabold uppercase ml-1">
              8 Môn
            </span>
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`px-4 py-2 rounded-xl font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'chatbot'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-300" />
            <span>Trợ Lý Lớp Học Dola</span>
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teacher's personal message & evaluation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>Lời Nhắn Nhủ Của Cô Chủ Nhiệm</span>
            </h3>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 italic text-xs text-slate-300 leading-relaxed">
              "{student.tt27Evaluation.teacherFinalComment || student.tt27Evaluation.aiComment || 'Em luôn chăm ngoan, chấp hành tốt nội quy lớp học và hòa đồng với bạn bè. Tiếp tục phát huy nhé!'}"
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Đánh giá chung</span>
                <span className="font-bold text-indigo-400 mt-0.5 block">
                  {student.tt27Evaluation.academicLevel === 'T' ? 'Hoàn thành tốt' : 'Hoàn thành'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Tự chủ & tự học</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">Đạt chuẩn T</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Vị trí ngồi</span>
                <span className="font-bold text-amber-400 mt-0.5 block">
                  Tổ {student.seat.group} • Bàn {student.seat.tableIndex + 1}
                </span>
              </div>
            </div>
          </div>

          {/* Boarding & Health Status for Parents */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span>Theo Dõi Bán Trú & Sức Khỏe Hôm Nay</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Bữa ăn trưa</span>
                <span className="font-bold text-emerald-400 mt-0.5 block capitalize">
                  {student.boardingHealth.lunchStatus}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Giấc ngủ trưa</span>
                <span className="font-bold text-indigo-400 mt-0.5 block capitalize">
                  {student.boardingHealth.napStatus}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Thân nhiệt</span>
                <span className="font-bold text-slate-300 mt-0.5 block">
                  {student.boardingHealth.temperature || 36.5}°C
                </span>
              </div>
            </div>

            {/* Medicine schedule */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Đơn thuốc phụ huynh gửi uống:
              </span>
              {student.boardingHealth.medicineSchedule.length > 0 ? (
                <div className="space-y-1.5">
                  {student.boardingHealth.medicineSchedule.map((med) => (
                    <div
                      key={med.id}
                      className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-rose-300">{med.medicineName}</span>
                        <span className="text-slate-400 ml-1.5">({med.time} • {med.dosage})</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">{med.parentNote}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          med.taken
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {med.taken ? '✓ Cô đã cho uống' : 'Chờ giờ uống'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Không có thuốc gửi hôm nay.</p>
              )}
            </div>
          </div>

          {/* Recent Praise & Behavior History */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Nhật Ký Tuyên Dương & Hoạt Động Của Em</span>
            </h3>

            <div className="space-y-2">
              {student.behaviorLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Chưa có ghi chú mới.</p>
              ) : (
                student.behaviorLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      log.type === 'praise'
                        ? 'bg-emerald-950/20 border-emerald-500/20'
                        : 'bg-rose-950/20 border-rose-500/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{log.category}</span>
                        <span className="text-[10px] text-slate-500">{log.date} lúc {log.time}</span>
                      </div>
                      <p className="text-slate-300 mt-0.5">{log.note}</p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        log.type === 'praise'
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-rose-900/60 text-rose-300'
                      }`}
                    >
                      {log.points > 0 ? `+${log.points} Sao` : `${log.points} Điểm`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bilingual' && <BilingualHub />}
      {activeTab === 'chatbot' && <ClassroomChatbot />}
    </div>
  );
};
