import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Radar,
  X,
  AlertTriangle,
  CheckCircle,
  PhoneCall,
  Clock,
  Sparkles,
  Send,
} from 'lucide-react';

interface EwsRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent: (student: any) => void;
}

export const EwsRadarModal: React.FC<EwsRadarModalProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
}) => {
  const { alerts, resolveAlert, students } = useApp();

  if (!isOpen) return null;

  const unreadAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-900/60 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">Radar Cảnh Báo Sớm Học Đường (EWS)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unreadAlerts.length} Cảnh báo đang mở
                </span>
              </div>
              <p className="text-xs text-amber-300">
                Tự động kích hoạt khi học sinh vắng quá 3 buổi hoặc suy giảm phong độ đột ngột
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Không có cảnh báo học đường nào. Lớp học đang duy trì nề nếp rất tốt!
            </div>
          ) : (
            alerts.map((a) => {
              const studentObj = students.find((s) => s.id === a.studentId);
              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border flex flex-col space-y-3 ${
                    a.resolved
                      ? 'bg-slate-950/40 border-slate-800 opacity-60'
                      : a.severity === 'high'
                      ? 'bg-rose-950/30 border-rose-500/40'
                      : 'bg-amber-950/30 border-amber-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            a.severity === 'high'
                              ? 'bg-rose-900 text-rose-200'
                              : 'bg-amber-900 text-amber-200'
                          }`}
                        >
                          {a.type === 'attendance' ? 'Chuyên cần' : 'Học tập & Tâm lý'}
                        </span>
                        <h4 className="font-bold text-sm text-white">
                          {a.studentName}: {a.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{a.description}</p>
                    </div>

                    {!a.resolved ? (
                      <button
                        onClick={() => resolveAlert(a.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                      >
                        ✓ Đánh dấu đã xử lý
                      </button>
                    ) : (
                      <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Đã giải quyết</span>
                      </span>
                    )}
                  </div>

                  {a.draftMessageToParent && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-indigo-300 font-semibold">
                        <span>Dự thảo tin nhắn gửi phụ huynh ({studentObj?.parentName} - {studentObj?.phone}):</span>
                        <a
                          href={`https://zalo.me/${studentObj?.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-blue-600 px-2 py-0.5 rounded text-white font-normal flex items-center space-x-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Gửi Zalo</span>
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-400 italic">
                        "{a.draftMessageToParent}"
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-500">
                    <span>Hành động: {a.suggestedAction}</span>
                    {studentObj && (
                      <button
                        onClick={() => {
                          onClose();
                          onSelectStudent(studentObj);
                        }}
                        className="text-indigo-400 hover:underline"
                      >
                        Xem hồ sơ chi tiết →
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
