import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap,
  Users,
  Bell,
  RefreshCw,
  LogOut,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  Key,
  Dices,
  Database,
  CheckCircle,
  Lock,
  KeyRound,
  Languages,
  Cloud,
  UserCog,
  CalendarCheck2,
  BookOpen,
  MessageSquare,
  Cpu,
  Bot,
} from 'lucide-react';
import { getStoredApiKey, getStoredModel } from '../services/geminiService';

interface HeaderProps {
  onOpenLogin: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenEwsModal: () => void;
  onOpenGoogleSheetModal: () => void;
  onOpenApiKeyModal: () => void;
  onOpenLuckyWheel: () => void;
  onOpenChangePasswordModal: () => void;
  onOpenTeacherProfileModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLogin,
  activeTab,
  setActiveTab,
  onOpenEwsModal,
  onOpenGoogleSheetModal,
  onOpenApiKeyModal,
  onOpenLuckyWheel,
  onOpenChangePasswordModal,
  onOpenTeacherProfileModal,
}) => {
  const {
    currentUser,
    role,
    alerts,
    googleSheetConfig,
    syncStudentsFromGoogleSheet,
    logout,
    saveStatus,
    lastSavedTime,
    isUsingDefaultPassword,
    syncWithCloud,
  } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const currentKey = getStoredApiKey();
  const currentModel = getStoredModel();

  const unreadAlerts = alerts.filter((a) => !a.resolved);

  const handleQuickSync = async () => {
    setIsSyncing(true);
    const res = await syncStudentsFromGoogleSheet();
    setIsSyncing(false);
    if (res.success) {
      alert(`Đồng bộ thành công! Đã cập nhật ${res.count} học sinh từ Database Google Sheet.`);
    } else {
      alert(`Thông báo: ${res.error}. Đang mở bảng điều khiển Google Sheet để bạn kiểm tra.`);
      onOpenGoogleSheetModal();
    }
  };

  const navItems = [
    { id: 'seating', label: '1. Sơ đồ lớp & Cán sự', icon: Users },
    { id: 'tracker', label: '2. Điểm danh & Nề nếp', icon: CalendarCheck2 },
    { id: 'tt27', label: '3. Trợ lý AI TT27', icon: Sparkles, highlight: true },
    { id: 'planner', label: '4. Kế hoạch & SHL', icon: BookOpen },
    { id: 'parent', label: '5. Họp PH Zalo', icon: MessageSquare },
    { id: 'automation', label: '6. Trụ cột tự động hóa', icon: Cpu },
    { id: 'chatbot', label: '7. AI Chatbot', icon: Bot },
    { id: 'bilingual', label: '8. Học Song Ngữ (Audio/TTS)', icon: Languages, badge: 'Mới' },
    { id: 'data-management', label: '9. Quản trị Dữ liệu & Sao lưu', icon: Database },
  ];

  const teacherDisplayName = currentUser?.fullName || 'Cô Đỗ Thị Hoà';
  const classDisplayName = currentUser?.className || 'Lớp 3C1';
  const schoolYearDisplay = currentUser?.schoolYear || '2026 - 2027';

  return (
    <header className="sticky top-0 z-30 flex flex-col shadow-[0_4px_30px_rgba(0,0,0,0.7)] select-none">
      {/* =================================================================== */}
      {/* TẦNG 1: TOP APP BAR (BRANDING & SYSTEM STATUS BADGES)                */}
      {/* =================================================================== */}
      <div className="bg-[#05091b]/95 backdrop-blur-xl border-b border-[#00f2fe]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between py-2 sm:py-2.5 gap-3 min-h-[64px]">
            {/* BRANDING GÓC TRÁI: LOGO & TIÊU ĐỀ 2 DÒNG CHUẨN */}
            <div
              className="flex items-center space-x-3.5 cursor-pointer flex-shrink-0 group"
              onClick={() => setActiveTab('seating')}
              title="Về trang sơ đồ lớp học"
            >
              {/* Cyber Tech Logo Badge */}
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#00f2fe]/20 via-[#4facfe]/30 to-[#9b51e0]/20 border border-[#00f2fe]/60 shadow-[0_0_15px_rgba(0,242,254,0.35)] flex items-center justify-center group-hover:shadow-[0_0_22px_rgba(0,242,254,0.6)] group-hover:border-[#00f2fe] transition-all duration-300">
                <GraduationCap className="w-6 h-6 text-[#00f2fe] group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00f2fe] ring-2 ring-[#05091b] animate-pulse" />
              </div>

              {/* 2-line standard brand typography */}
              <div className="flex flex-col">
                {/* Dòng 1: TRƯỜNG TIỂU HỌC HOÀI NHƠN */}
                <span className="text-[13px] sm:text-[14px] font-bold text-slate-200 tracking-[1.5px] uppercase">
                  TRƯỜNG TIỂU HỌC HOÀI NHƠN
                </span>

                {/* Dòng 2: SỔ CHỦ NHIỆM AI */}
                <div className="flex items-center space-x-2">
                  <span className="text-[20px] sm:text-[22px] font-black tracking-tight bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#9b51e0] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,242,254,0.45)]">
                    SỔ CHỦ NHIỆM AI
                  </span>
                  <span className="text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40 shadow-[0_0_8px_rgba(0,242,254,0.25)]">
                    TT27 • 4.0
                  </span>
                </div>

                {/* Dòng phụ: Lớp 3C1 • Năm học: 2026 - 2027 */}
                <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                  {classDisplayName} • Năm học: {schoolYearDisplay}
                </p>
              </div>
            </div>

            {/* CỤM TRẠNG THÁI HỆ THỐNG GÓC PHẢI */}
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              {/* Cloud Auto-save Status Pill */}
              {currentUser && role === 'teacher' && (
                <button
                  onClick={() => syncWithCloud()}
                  title="Trạng thái đồng bộ đám mây đa thiết bị (Nhấp để đồng bộ ngay)"
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition shadow-sm ${
                    saveStatus === 'saving'
                      ? 'bg-amber-950/70 border-amber-500/50 text-amber-300 hover:bg-amber-900/70'
                      : saveStatus === 'offline'
                      ? 'bg-orange-950/70 border-orange-500/50 text-orange-300 hover:bg-orange-900/70'
                      : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/70'
                  }`}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span className="font-semibold text-[11px]">Đang đồng bộ...</span>
                    </>
                  ) : saveStatus === 'offline' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                      <span className="font-semibold text-[11px]">Mất mạng - Đã lưu tạm</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-[11px]">Đã lưu {lastSavedTime}</span>
                    </>
                  )}
                </button>
              )}

              {/* Google Sheet Sync badge */}
              <button
                onClick={onOpenGoogleSheetModal}
                title="Cấu hình và đồng bộ Google Sheet database"
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">Sheet:</span>
                <span className="font-semibold text-[11px] truncate max-w-[80px]">
                  {googleSheetConfig.lastSyncedAt || 'Đã nối'}
                </span>
                <RefreshCw
                  className={`w-3 h-3 text-emerald-400 hover:rotate-180 transition-transform ${isSyncing ? 'animate-spin' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickSync();
                  }}
                />
              </button>

              {/* Radar EWS Alert Button */}
              <button
                onClick={onOpenEwsModal}
                className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded-xl transition border ${
                  unreadAlerts.length > 0
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-[#0a122c]/80 border-slate-700/60 text-slate-300'
                }`}
                title="Hệ thống radar cảnh báo sớm học sinh cần hỗ trợ"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${unreadAlerts.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-[11px] font-medium hidden md:inline">Radar EWS:</span>
                <span className="font-bold text-[11px] text-amber-400">{unreadAlerts.length}</span>
                {unreadAlerts.length > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </button>

              {/* Lucky Wheel Random Caller Button */}
              <button
                onClick={onOpenLuckyWheel}
                title="Vòng quay ngẫu nhiên gọi học sinh & đố vui nhận sao thưởng"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60 transition group shadow-sm"
              >
                <Dices className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-180 transition-transform duration-500" />
                <span className="font-semibold text-[11px] hidden lg:inline">Gọi Tên 🎲</span>
              </button>

              {/* Settings AI Button */}
              <button
                onClick={onOpenApiKeyModal}
                title="Cài đặt Model AI & Gemini API Key"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#0a122c]/90 hover:bg-[#0f1b3d] border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-sm group"
              >
                <Key className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span className="text-[11px] font-bold text-slate-200">AI</span>
                <span className={`w-1.5 h-1.5 rounded-full ${currentKey ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-cyan-400'}`} />
              </button>

              {/* User Role & Profile Switcher */}
              {currentUser ? (
                <div className="flex items-center space-x-1.5 bg-[#0a122c]/90 p-1 rounded-2xl border border-cyan-500/30 shadow-sm">
                  {/* Teacher Profile Card - Clickable to open TeacherProfileModal */}
                  <div
                    onClick={role === 'teacher' ? onOpenTeacherProfileModal : undefined}
                    title="Nhấp để chỉnh sửa Họ tên Giáo viên và Tên lớp"
                    className={`flex items-center space-x-2 px-2.5 py-1 rounded-xl text-xs transition ${
                      role === 'teacher' ? 'cursor-pointer hover:bg-[#111e47] group' : ''
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-[#00f2fe] shadow-[0_0_6px_#00f2fe]" />
                    <div className="text-left">
                      <div className="flex items-center space-x-1">
                        <span className="font-extrabold text-slate-100 group-hover:text-[#00f2fe] transition-colors text-[11px] max-w-[120px] sm:max-w-[140px] truncate">
                          {teacherDisplayName}
                        </span>
                        {role === 'teacher' && (
                          <UserCog className="w-3 h-3 text-slate-400 group-hover:text-[#00f2fe] transition-colors" />
                        )}
                      </div>
                      <span className="text-[9.5px] text-slate-400 block -mt-0.5 group-hover:text-slate-300">
                        {classDisplayName}
                      </span>
                    </div>
                  </div>

                  {/* Change Password Button */}
                  <button
                    onClick={onOpenChangePasswordModal}
                    title={
                      isUsingDefaultPassword
                        ? 'Cảnh báo: Đang dùng mật khẩu mặc định Abc123@. Bấm để đổi mật khẩu cá nhân'
                        : 'Đổi mật khẩu cá nhân'
                    }
                    className={`relative p-1.5 rounded-lg transition ${
                      isUsingDefaultPassword
                        ? 'bg-amber-950/80 border border-amber-500/60 text-amber-300 hover:bg-amber-900/80'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    {isUsingDefaultPassword && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
                    )}
                  </button>

                  {/* Switch Class Button */}
                  <button
                    onClick={onOpenLogin}
                    title="Chuyển lớp học hoặc tài khoản"
                    className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    Đổi lớp
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={logout}
                    title="Đăng xuất khỏi phiên quản trị"
                    className="p-1.5 text-xs rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#9b51e0] text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.35)] hover:shadow-[0_0_22px_rgba(0,242,254,0.6)] transition"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Đăng Nhập Giáo Viên</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TẦNG 2: NAVIGATION MENU BAR (THANH ĐIỀU HƯỚNG TÁCH BIỆT HOÀN TOÀN)   */}
      {/* =================================================================== */}
      <nav className="bg-[#070e24]/95 backdrop-blur-md border-b border-[#00f2fe]/25 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1.5 scrollbar-thin">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isTabActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all duration-200 flex items-center space-x-1.5 border text-xs ${
                    isTabActive
                      ? 'bg-gradient-to-r from-[#00f2fe]/20 via-[#4facfe]/25 to-[#9b51e0]/20 text-[#00f2fe] border-[#00f2fe]/70 shadow-[0_0_12px_rgba(0,242,254,0.35)] scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1636]/60 border-transparent hover:border-slate-700/60 font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isTabActive ? 'text-[#00f2fe]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/40 font-black uppercase">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
};
