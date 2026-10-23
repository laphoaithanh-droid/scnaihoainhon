import React, { useState, useEffect } from 'react';
import {
  Key,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Cpu,
  ShieldAlert,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  GEMINI_MODELS,
  GeminiModelId,
  getStoredApiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
  validateApiKey,
} from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMandatory?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  isMandatory = false,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-3-flash-preview');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setSelectedModel(getStoredModel());
      setValidationResult({ status: 'idle' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (checkWithApi = true) => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setValidationResult({
        status: 'error',
        message: 'Vui lòng nhập API Key trước khi lưu.',
      });
      return;
    }

    if (checkWithApi) {
      setIsValidating(true);
      setValidationResult({ status: 'idle' });
      const res = await validateApiKey(trimmedKey);
      setIsValidating(false);

      if (!res.valid) {
        setValidationResult({
          status: 'error',
          message: res.error || 'API Key không hợp lệ hoặc không có quyền truy cập Gemini API.',
        });
        return;
      }
    }

    setStoredApiKey(trimmedKey);
    setStoredModel(selectedModel);
    setValidationResult({
      status: 'success',
      message: 'Đã lưu cấu hình API Key & Model thành công!',
    });

    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleClearKey = () => {
    if (confirm('Bạn có chắc chắn muốn xóa API Key khỏi trình duyệt này?')) {
      setStoredApiKey('');
      setApiKey('');
      setValidationResult({ status: 'idle' });
    }
  };

  const canClose = !isMandatory || !!getStoredApiKey();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Thiết Lập Model & API Key Gemini</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Tùy Chọn
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Ứng dụng đã sẵn sàng sử dụng ngay. Bạn có thể tùy chọn nhập API Key cá nhân để kết nối trực tiếp Google Gemini AI
            </p>
          </div>
        </div>

        {/* Informative Ready Banner */}
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Sử dụng ngay không cần API Key:</span>
            <p className="text-[11px] text-emerald-300/90 mt-0.5">
              Hệ thống đã tích hợp sẵn bộ mẫu thông minh chuẩn Bộ GD&ĐT (TT27, Kế hoạch sinh hoạt, Zalo, Song ngữ). Việc nhập API Key là hoàn toàn tùy chọn khi bạn muốn sinh văn bản tự do bằng model AI trực tiếp.
            </p>
          </div>
        </div>

        {/* 1. Model Selection Cards */}
        <div className="space-y-3 mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            1. Chọn Model AI Mặc Định (Thứ tự ưu tiên Fallback)
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {GEMINI_MODELS.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-600'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-white">{m.name}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            m.isDefault
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                    </div>
                  </div>
                  <Cpu className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * Lưu ý: Nếu model được chọn gặp lỗi quá tải (429 Quota Exceeded), hệ thống sẽ tự động thử lại ngay với các model kế tiếp trong danh sách.
          </p>
        </div>

        {/* 2. API Key Input */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Google Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center space-x-1 font-semibold"
            >
              <span>Lấy API key tại aistudio.google.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setValidationResult({ status: 'idle' });
              }}
              placeholder="Dán mã API Key bắt đầu bằng AIzaSy..."
              className="w-full px-4 py-2.5 pr-20 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <div className="absolute right-2 top-2 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Ẩn key' : 'Hiện key'}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  title="Xóa key"
                  className="p-1 rounded text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Validation Feedback */}
          {validationResult.status === 'success' && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{validationResult.message}</span>
            </div>
          )}

          {validationResult.status === 'error' && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div className="font-mono text-[11px] break-all">{validationResult.message}</div>
            </div>
          )}
        </div>

        {/* 3. Guide to get Free API Key */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2 mb-6">
          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Cách lấy API Key miễn phí 100% trong 1 phút:</span>
          </span>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
            <li>
              Truy cập{' '}
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline font-medium"
              >
                https://aistudio.google.com/api-keys
              </a>{' '}
              và đăng nhập bằng tài khoản Google.
            </li>
            <li>Bấm vào nút <strong>"Create API key"</strong> (Tạo khóa API).</li>
            <li>Sao chép mã khóa (dạng <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">AIzaSy...</code>) và dán vào ô bên trên.</li>
            <li>Bấm <strong>"Kiểm Tra & Lưu Cấu Hình"</strong> để hoàn tất.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
          {canClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Đóng
            </button>
          )}

          <button
            onClick={() => handleSave(true)}
            disabled={isValidating || !apiKey.trim()}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang kiểm tra API Key...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Kiểm Tra & Lưu Cấu Hình</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
