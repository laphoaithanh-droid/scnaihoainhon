import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  X,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Save,
  CheckCircle2,
  Database,
  Upload,
  Download,
  AlertCircle,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({ isOpen, onClose }) => {
  const {
    googleSheetConfig,
    updateGoogleSheetConfig,
    exportStudentsToPsv,
    importStudentsFromPsv,
    syncStudentsFromGoogleSheet,
    students,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'link' | 'paste' | 'export'>('link');
  const [sheetUrl, setSheetUrl] = useState(googleSheetConfig.sheetUrl);
  const [autoSync, setAutoSync] = useState(googleSheetConfig.autoSync);
  const [syncInterval, setSyncInterval] = useState(googleSheetConfig.syncIntervalMinutes);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pasteData, setPasteData] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateGoogleSheetConfig({
      sheetUrl,
      autoSync,
      syncIntervalMinutes: syncInterval,
    });
    setMessage({ type: 'success', text: 'Đã lưu cấu hình liên kết Google Sheet thành công!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setMessage(null);
    const res = await syncStudentsFromGoogleSheet(sheetUrl);
    setIsSyncing(false);

    if (res.success) {
      setMessage({
        type: 'success',
        text: `Đồng bộ thành công! Đã cập nhật ${res.count} học sinh từ Google Sheet vào cơ sở dữ liệu app.`,
      });
    } else {
      setMessage({
        type: 'error',
        text: `${res.error}`,
      });
    }
  };

  const handleImportPaste = () => {
    if (!pasteData.trim()) return;
    const res = importStudentsFromPsv(pasteData);
    if (res.success) {
      setMessage({
        type: 'success',
        text: `Nhập dữ liệu thành công! Đã nạp ${res.count} học sinh vào ứng dụng.`,
      });
      setPasteData('');
    } else {
      setMessage({
        type: 'error',
        text: `Lỗi định dạng: ${res.error}`,
      });
    }
  };

  const handleDownloadCsv = () => {
    const psv = exportStudentsToPsv();
    // Convert to CSV with comma or BOM for Excel
    const csvContent = '\uFEFF' + psv.replace(/\|/g, ',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Lop_4A1_Hoai_Nhon_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleCopyHeader = () => {
    navigator.clipboard.writeText('TT|HỌ VÀ TÊN|NĂM SINH|HỌ VÀ TÊN CHA(MẸ)|SỐ ĐIỆN THOẠI|TÊN ĐĂNG NHẬP|MẬT KHẨU|');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAllData = () => {
    const data = exportStudentsToPsv();
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900/80 p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>Kết Nối Database Google Sheet</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Trường TH Hoài Nhơn
                </span>
              </h3>
              <p className="text-xs text-emerald-300">
                Đồng bộ hai chiều dữ liệu học sinh, hồ sơ lớp & tài khoản truy cập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 gap-2 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('link')}
            className={`px-3 py-2 rounded-t-xl font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'link'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>1. Liên Kết Trực Tuyến</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-2 rounded-t-xl font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'paste'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>2. Nhập & Dán Bảng Tính</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-2 rounded-t-xl font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'export'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>3. Xuất Ra File Excel/Sheet</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Status Message */}
          {message && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              )}
              <div className="leading-relaxed">{message.text}</div>
            </div>
          )}

          {/* TAB 1: ONLINE LINK SYNC */}
          {activeTab === 'link' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Đường dẫn Google Sheets (Share Link):
                  </label>
                  <a
                    href="https://docs.google.com/spreadsheets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline flex items-center space-x-1 text-[11px]"
                  >
                    <span>Mở Google Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1XyZ9.../edit?usp=sharing"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  💡 <strong>Cách thiết lập quyền:</strong> Trong file Google Sheets, bấm nút <strong>"Chia sẻ" (Share)</strong> ➔ chọn <strong>"Bất kỳ ai có đường liên kết đều có thể xem" (Anyone with the link can view)</strong> để app tự động đồng bộ.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Chu kỳ tự động đồng bộ:
                  </label>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
                  >
                    <option value={15}>Mỗi 15 phút</option>
                    <option value={30}>Mỗi 30 phút</option>
                    <option value={60}>Mỗi 60 phút</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="autoSyncCheck"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <label htmlFor="autoSyncCheck" className="text-slate-300 font-medium cursor-pointer">
                    Bật tự động đồng bộ
                  </label>
                </div>
              </div>

              {/* Status info */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Trạng thái đồng bộ:</span>
                  <span className="font-bold text-emerald-400 ml-1.5">
                    {googleSheetConfig.lastSyncedAt || 'Đã sẵn sàng'}
                  </span>
                </div>
                <span className="text-slate-400">
                  Dữ liệu hiện tại: <strong className="text-white">{students.length} học sinh</strong>
                </span>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Đang tải từ Google Sheet...' : 'Đồng Bộ Ngay Qua App'}</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Cấu Hình</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: QUICK PASTE / IMPORT */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Mẫu cột chuẩn Google Sheet / Excel:</span>
                  <button
                    onClick={handleCopyHeader}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép tiêu đề cột'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-[11px] text-emerald-300 select-all border border-slate-800">
                  TT|HỌ VÀ TÊN|NĂM SINH|HỌ VÀ TÊN CHA(MẸ)|SỐ ĐIỆN THOẠI|TÊN ĐĂNG NHẬP|MẬT KHẨU|
                </div>
                <p className="text-[11px] text-slate-400">
                  Hỗ trợ định dạng phân cách bằng dấu gạch đứng (<code>|</code>), dấu tab (Excel copy) hoặc dấu phẩy (CSV).
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Dán các dòng dữ liệu từ Excel / Google Sheets vào đây:
                </label>
                <textarea
                  rows={6}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="1|Nguyễn Văn An|2015|Nguyễn Văn Bình|0901234567|hs.an|123456|&#10;2|Trần Thị Mai Anh|2015|Trần Quốc Tuấn|0912345678|hs.maianh|123456|"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleImportPaste}
                disabled={!pasteData.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Nạp Dữ Liệu Học Sinh Vào App</span>
              </button>
            </div>
          )}

          {/* TAB 3: EXPORT DATA */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-sm">
                  Xuất Cơ Sở Dữ Liệu Lớp 4A1 ({students.length} học sinh)
                </h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Bạn có thể tải file CSV tương thích 100% với Google Sheets và Microsoft Excel để lưu trữ hoặc sao chép nhanh vào bảng tính quản lý của nhà trường.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleDownloadCsv}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải File .CSV (Chuẩn Excel / Sheet)</span>
                  </button>

                  <button
                    onClick={handleCopyAllData}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center space-x-1.5"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép văn bản'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
