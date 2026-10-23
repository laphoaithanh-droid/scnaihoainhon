import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  KeyRound,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  X,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changeTeacherPassword, resetTeacherPasswordToDefault } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorCurrent, setErrorCurrent] = useState('');
  const [errorNew, setErrorNew] = useState('');
  const [errorConfirm, setErrorConfirm] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Recovery modal state
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Password strength calculation
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Chưa nhập', color: 'bg-slate-700', text: 'text-slate-400' };
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 25;

    if (score <= 25) {
      return { score, label: 'Yếu (Cần thêm chữ hoa/số/ký tự đặc biệt)', color: 'bg-rose-500', text: 'text-rose-400' };
    }
    if (score <= 50) {
      return { score, label: 'Trung bình', color: 'bg-amber-500', text: 'text-amber-400' };
    }
    if (score <= 75) {
      return { score, label: 'Khá tốt', color: 'bg-blue-500', text: 'text-blue-400' };
    }
    return { score: 100, label: 'Mạnh (Rất an toàn)', color: 'bg-emerald-500', text: 'text-emerald-400' };
  };

  const strength = calculateStrength(newPassword);
  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCurrent('');
    setErrorNew('');
    setErrorConfirm('');
    setSuccessMessage(null);

    let hasError = false;

    if (!currentPassword) {
      setErrorCurrent('Vui lòng nhập mật khẩu hiện tại.');
      hasError = true;
    }

    if (!newPassword) {
      setErrorNew('Vui lòng nhập mật khẩu mới.');
      hasError = true;
    } else if (newPassword.length < 6) {
      setErrorNew('Mật khẩu mới phải có ít nhất 6 ký tự.');
      hasError = true;
    } else if (newPassword === currentPassword) {
      setErrorNew('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      hasError = true;
    }

    if (!confirmPassword) {
      setErrorConfirm('Vui lòng xác nhận mật khẩu mới.');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setErrorConfirm('Mật khẩu xác nhận không trùng khớp 100%.');
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);
    const res = await changeTeacherPassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Đổi mật khẩu thành công! Mật khẩu mới sẽ áp dụng từ lần đăng nhập sau.');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } else {
      if (res.error?.includes('hiện tại')) {
        setErrorCurrent(res.error);
      } else {
        setErrorNew(res.error || 'Đổi mật khẩu không thành công.');
      }
    }
  };

  const handleExecuteRecovery = async () => {
    if (!currentUser?.username) return;
    const res = await resetTeacherPasswordToDefault(currentUser.username);
    setShowRecoveryConfirm(false);
    if (res.success) {
      setRecoveryNotice(res.message);
      setCurrentPassword('Abc123@');
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorCurrent('');
    setErrorNew('');
    setErrorConfirm('');
    setSuccessMessage(null);
    setRecoveryNotice(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/80 via-slate-900 to-indigo-950/80 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Đổi Mật Khẩu Giáo Viên</h3>
              <p className="text-xs text-indigo-300">
                Tài khoản: <span className="font-mono font-semibold">{currentUser?.username || 'lop_nam'}</span> ({currentUser?.className})
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Success Toast Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2.5 shadow-lg">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <div>
                <span className="font-bold block">Thành công!</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* Recovery Success Banner */}
          {recoveryNotice && (
            <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{recoveryNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: Current Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Mật khẩu hiện tại
                </label>
                <button
                  type="button"
                  onClick={() => setShowRecoveryConfirm(true)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline transition"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setErrorCurrent('');
                  }}
                  placeholder="Nhập mật khẩu hiện tại (Mặc định: Abc123@)"
                  className={`w-full bg-slate-950 border ${
                    errorCurrent ? 'border-rose-500' : 'border-slate-700'
                  } rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorCurrent && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorCurrent}</span>
                </p>
              )}
            </div>

            {/* Field 2: New Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorNew('');
                  }}
                  placeholder="Tối thiểu 6 - 8 ký tự"
                  className={`w-full bg-slate-950 border ${
                    errorNew ? 'border-rose-500' : 'border-slate-700'
                  } rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Độ mạnh mật khẩu:</span>
                    <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}

              {errorNew && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorNew}</span>
                </p>
              )}
            </div>

            {/* Field 3: Confirm New Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorConfirm('');
                  }}
                  placeholder="Nhập lại chính xác mật khẩu mới"
                  className={`w-full bg-slate-950 border ${
                    errorConfirm ? 'border-rose-500' : isMatch ? 'border-emerald-500' : 'border-slate-700'
                  } rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword && (
                <div className="mt-1">
                  {isMatch ? (
                    <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Mật khẩu trùng khớp hoàn toàn</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-400 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Mật khẩu xác nhận chưa khớp</span>
                    </span>
                  )}
                </div>
              )}

              {errorConfirm && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorConfirm}</span>
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Cập Nhật Mật Khẩu'}</span>
              </button>
            </div>
          </form>

          {/* Recovery Modal */}
          {showRecoveryConfirm && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <RotateCcw className="w-4 h-4 flex-shrink-0" />
                <h4 className="font-bold text-xs">Khôi Phục Mật Khẩu Về Mặc Định?</h4>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Hệ thống sẽ đặt lại mật khẩu của tài khoản <b>{currentUser?.username}</b> về mặc định <code>Abc123@</code>.
              </p>
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRecoveryConfirm(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-[11px] font-medium text-slate-300"
                >
                  Không
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRecovery}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-[11px] font-semibold text-white transition"
                >
                  Xác Nhận Đặt Lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
