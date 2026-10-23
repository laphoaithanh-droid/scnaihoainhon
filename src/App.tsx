import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { SeatingChart } from './components/SeatingChart';
import { DailyTracker } from './components/DailyTracker';
import { AIReportAssistant } from './components/AIReportAssistant';
import { LessonPlanner } from './components/LessonPlanner';
import { ParentMeetingKit } from './components/ParentMeetingKit';
import { FourPillarsAutomation } from './components/FourPillarsAutomation';
import { ClassroomChatbot } from './components/ClassroomChatbot';
import { BilingualHub } from './components/BilingualHub';
import { StudentPortal } from './components/StudentPortal';
import { LoginModal } from './components/LoginModal';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { EwsRadarModal } from './components/EwsRadarModal';
import { QuickStudentModal } from './components/QuickStudentModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { LuckyWheelModal } from './components/LuckyWheelModal';
import { DataManagementView } from './components/DataManagementView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import { getStoredApiKey } from './services/geminiService';
import { Student } from './types';
import { Users, Key, Sparkles, Lock, KeyRound } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, role, isUsingDefaultPassword } = useApp();
  const [activeTab, setActiveTab] = useState<string>('seating');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [isEwsModalOpen, setIsEwsModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState(false);
  const [luckyWheelScope, setLuckyWheelScope] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isTeacherProfileModalOpen, setIsTeacherProfileModalOpen] = useState(false);
  const [isMandatoryApiKey, setIsMandatoryApiKey] = useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);

  const handleOpenLuckyWheel = (scope?: 'all' | 1 | 2 | 3 | 4) => {
    setLuckyWheelScope(scope || 'all');
    setIsLuckyWheelOpen(true);
  };

  return (
    <div className="min-h-screen cyber-deep-bg text-slate-100 flex flex-col font-sans selection:bg-[#00f2fe] selection:text-slate-950 relative">
      {/* Subtle Cyber Grid Background Overlay */}
      <div className="fixed inset-0 cyber-grid-pattern pointer-events-none z-0 opacity-70" />

      {/* Top Application Bar (2 Tầng Độc Lập) */}
      <Header
        onOpenLogin={() => setIsLoginModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenEwsModal={() => setIsEwsModalOpen(true)}
        onOpenGoogleSheetModal={() => setIsGoogleSheetModalOpen(true)}
        onOpenApiKeyModal={() => {
          setIsMandatoryApiKey(false);
          setIsApiKeyModalOpen(true);
        }}
        onOpenLuckyWheel={() => handleOpenLuckyWheel('all')}
        onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
        onOpenTeacherProfileModal={() => setIsTeacherProfileModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-8 relative z-10">
        {/* Compact Security Banner if using default password */}
        {currentUser && role === 'teacher' && isUsingDefaultPassword && (
          <div className="mb-3 py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-[#0a1228] to-amber-950/70 border border-amber-500/40 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs animate-in fade-in duration-300">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-300 text-[11px]">
                <strong className="text-amber-300 mr-1.5">Khuyến nghị bảo mật:</strong>
                Tài khoản lớp {currentUser.className} đang dùng mật khẩu mặc định (<code>Abc123@</code>). Thầy/Cô vui lòng đổi sang mật khẩu cá nhân.
              </span>
            </div>
            <button
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shadow transition whitespace-nowrap self-start sm:self-auto flex items-center space-x-1"
            >
              <KeyRound className="w-3 h-3" />
              <span>Đổi Mật Khẩu Ngay</span>
            </button>
          </div>
        )}

        {/* Guest Banner if not logged in (Cyber Glass style) */}
        {!currentUser && (
          <div className="mb-4 p-3.5 rounded-2xl cyber-glass border-[#00f2fe]/40 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f2fe]/20 via-[#4facfe]/30 to-[#9b51e0]/20 border border-[#00f2fe]/50 flex items-center justify-center text-[#00f2fe] shadow flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white flex items-center space-x-2">
                  <span>Chế Độ Khách / Học Sinh (Bộ Dữ Liệu Chuẩn)</span>
                  <span className="text-[9.5px] px-2 py-0.2 rounded-full bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30 font-bold">
                    Xem trước
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Dành cho Giáo viên Chủ nhiệm: Đăng nhập theo mã lớp (ví dụ: <code className="text-[#00f2fe] font-mono">lop3c1_2026</code>, <code className="text-[#00f2fe] font-mono">lop4a1_2026</code>) để kích hoạt không gian quản trị và tự động lưu trữ dữ liệu riêng.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#9b51e0] text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(0,242,254,0.3)] hover:shadow-[0_0_20px_rgba(0,242,254,0.5)] transition whitespace-nowrap flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Đăng Nhập Quản Trị Lớp</span>
            </button>
          </div>
        )}

        {role === 'student' ? (
          <StudentPortal />
        ) : (
          <div>
            {activeTab === 'seating' && (
              <SeatingChart
                onSelectStudent={(s) => setSelectedStudentForModal(s)}
                onOpenLuckyWheel={handleOpenLuckyWheel}
              />
            )}
            {activeTab === 'tracker' && (
              <DailyTracker onSelectStudent={(s) => setSelectedStudentForModal(s)} />
            )}
            {activeTab === 'tt27' && (
              <AIReportAssistant onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)} />
            )}
            {activeTab === 'planner' && <LessonPlanner />}
            {activeTab === 'parent' && <ParentMeetingKit />}
            {activeTab === 'automation' && <FourPillarsAutomation />}
            {activeTab === 'chatbot' && <ClassroomChatbot />}
            {activeTab === 'bilingual' && <BilingualHub />}
            {activeTab === 'data-management' && <DataManagementView />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#05091b]/95 border-t border-[#00f2fe]/20 py-3 text-center text-xs text-slate-500 relative z-10">
        <p>
          <span className="text-[#00f2fe] font-bold">SỔ CHỦ NHIỆM AI</span> © 2026 • Trợ lý số hóa quản trị lớp học chuẩn Thông tư 27 Bộ GD&ĐT & Bộ sách Kết Nối Tri Thức Với Cuộc Sống
        </p>
      </footer>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <GoogleSheetModal
        isOpen={isGoogleSheetModalOpen}
        onClose={() => setIsGoogleSheetModalOpen(false)}
      />

      <EwsRadarModal
        isOpen={isEwsModalOpen}
        onClose={() => setIsEwsModalOpen(false)}
        onSelectStudent={(s) => setSelectedStudentForModal(s)}
      />

      <QuickStudentModal
        student={selectedStudentForModal}
        onClose={() => setSelectedStudentForModal(null)}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        isMandatory={isMandatoryApiKey}
      />

      <LuckyWheelModal
        isOpen={isLuckyWheelOpen}
        onClose={() => setIsLuckyWheelOpen(false)}
        initialScope={luckyWheelScope}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      <TeacherProfileModal
        isOpen={isTeacherProfileModalOpen}
        onClose={() => setIsTeacherProfileModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
