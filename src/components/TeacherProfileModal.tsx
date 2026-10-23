import React, { useState, useEffect } from 'react';
import { useApp, getDeviceInfo } from '../context/AppContext';
import {
  UserCog,
  GraduationCap,
  Lock,
  Cloud,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  X,
  Smartphone,
  Laptop,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateTeacherProfile, saveStatus, lastSavedTime } = useApp();

  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setTeacherName(currentUser.fullName || '');
      setClassName(currentUser.className || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const currentDevice = getDeviceInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên Giáo viên Chủ nhiệm.');
      return;
    }
    if (!className.trim()) {
      setErrorMsg('Vui lòng nhập Tên hiển thị của lớp.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const ok = await updateTeacherProfile(teacherName.trim(), className.trim());
      if (ok) {
        setSuccessMsg('Đã lưu và đồng bộ thông tin giáo viên & lớp học lên đám mây thành công!');
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg('Không thể cập nhật hồ sơ. Vui lòng kiểm tra lại quyền truy cập.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi lưu thông tin');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#080f26]/95 border border-[#00f2fe]/40 rounded-3xl max-w-lg w-full shadow-[0_0_30px_rgba(0,0,0,0.8)] text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#050814] via-[#0a1538] to-[#050814] px-6 py-4 border-b border-[#00f2fe]/25 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,242,254,0.3)]">
              <UserCog className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>Hồ Sơ Giáo Viên & Lớp Học</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30 font-semibold">
                  Đám Mây
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cập nhật thông tin chủ nhiệm và tên hiển thị lớp học trên toàn hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Field 1: Họ và tên Giáo viên */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>1. Họ và tên Giáo viên Chủ nhiệm:</span>
              <span className="text-[10px] text-[#00f2fe]">Bắt buộc</span>
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Ví dụ: Cô Đỗ Thị Hoà"
              className="w-full bg-[#05091b] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#00f2fe] focus:border-transparent transition"
            />
            <p className="text-[11px] text-slate-400">
              Hiển thị trên Header, Bàn Giáo Viên Chủ Nhiệm, Bảng lớp và Phiếu tin nhắn gửi Phụ huynh.
            </p>
          </div>

          {/* Field 2: Tên hiển thị của lớp */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>2. Tên hiển thị của Lớp học:</span>
              <span className="text-[10px] text-[#00f2fe]">Bắt buộc</span>
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Ví dụ: Lớp 3C1 - Năm học 2026-2027"
              className="w-full bg-[#05091b] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#00f2fe] focus:border-transparent transition"
            />
            <p className="text-[11px] text-slate-400">
              Đồng bộ ngay lên Header, Tiêu đề Sơ đồ lớp, Hồ sơ 4 Tổ và Thẻ vinh danh học sinh.
            </p>
          </div>

          {/* Field 3: Tên đăng nhập cố định (Chỉ đọc) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>3. Tên đăng nhập cố định (Mã định danh Sandbox):</span>
              <span className="text-[10px] text-amber-400 flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Chỉ đọc</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                disabled
                value={currentUser.username}
                className="w-full bg-[#05091b]/80 border border-slate-800 text-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-mono cursor-not-allowed select-all"
              />
              <div className="absolute right-3 top-2.5 text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-amber-400/90 flex items-center space-x-1">
              <span>⚠️ Khóa định danh phân vùng dữ liệu đám mây độc quyền. Giữ cố định để không gãy liên kết dữ liệu giữa các thiết bị.</span>
            </p>
          </div>

          {/* Device & Sync Info Card */}
          <div className="bg-[#05091b]/90 rounded-2xl p-3 border border-cyan-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-300">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span className="font-medium">Thiết bị hiện tại:</span>
              </div>
              <span className="text-slate-200 font-semibold bg-[#0a122c] px-2 py-0.5 rounded-lg border border-cyan-500/30 text-[11px]">
                {currentDevice}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
              <div className="flex items-center space-x-2 text-slate-300">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">Trạng thái đám mây:</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {saveStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="text-amber-300 text-[11px]">Đang đồng bộ...</span>
                  </>
                ) : saveStatus === 'offline' ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-orange-400" />
                    <span className="text-orange-300 text-[11px]">Mất mạng - Đã lưu tạm</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 text-[11px]">Đã lưu lúc {lastSavedTime}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00f2fe] via-[#4facfe] to-[#9b51e0] text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(0,242,254,0.35)] hover:shadow-[0_0_22px_rgba(0,242,254,0.6)] transition flex items-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Lưu & Đồng Bộ...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Lưu Thay Đổi (Đồng Bộ Ngay ☁️)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
