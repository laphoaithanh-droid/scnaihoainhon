import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import confetti from 'canvas-confetti';
import {
  Award,
  Crown,
  Star,
  BookOpen,
  Palette,
  Check,
  X,
  Search,
  Users,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ClassCommitteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFocusGroup?: 1 | 2 | 3 | 4 | null;
  onSaved?: () => void;
}

interface CadreRoleDef {
  key: string;
  title: string;
  icon: string;
  category: 'class' | 1 | 2 | 3 | 4;
  badgeClass: string;
  description: string;
}

const CADRE_ROLES: CadreRoleDef[] = [
  // Ban Cán Sự Toàn Lớp
  {
    key: 'Lớp trưởng',
    title: 'Lớp trưởng',
    icon: '🎖️',
    category: 'class',
    badgeClass: 'bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
    description: 'Chỉ đạo chung toàn diện các hoạt động, nề nếp thi đua và đại diện cho tập thể lớp',
  },
  {
    key: 'Lớp phó học tập',
    title: 'Lớp phó Học tập',
    icon: '📚',
    category: 'class',
    badgeClass: 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_10px_rgba(0,242,254,0.25)]',
    description: 'Quản lý 15 phút truy bài đầu giờ, đôn đốc học tập, kèm cặp các bạn còn gặp khó khăn',
  },
  {
    key: 'Lớp phó lao động',
    title: 'Lớp phó Lao động / Văn thể',
    icon: '🎨',
    category: 'class',
    badgeClass: 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]',
    description: 'Theo dõi trực nhật vệ sinh 4 tổ, xếp bàn ghế ngăn nắp và tổ chức hoạt động văn thể mỹ',
  },

  // Tổ 1
  {
    key: 'Tổ trưởng Tổ 1',
    title: 'Tổ trưởng Tổ 1',
    icon: '👑',
    category: 1,
    badgeClass: 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    description: 'Điều hành thảo luận nhóm Tổ 1, kiểm tra sách vở và theo dõi nề nếp thi đua của tổ',
  },
  {
    key: 'Tổ phó Tổ 1',
    title: 'Tổ phó Tổ 1',
    icon: '⭐',
    category: 1,
    badgeClass: 'bg-gradient-to-r from-sky-500/25 to-indigo-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
    description: 'Hỗ trợ tổ trưởng Tổ 1 ghi chép điểm sao, theo dõi trực nhật và đôn đốc các bạn cùng tổ',
  },

  // Tổ 2
  {
    key: 'Tổ trưởng Tổ 2',
    title: 'Tổ trưởng Tổ 2',
    icon: '👑',
    category: 2,
    badgeClass: 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    description: 'Điều hành thảo luận nhóm Tổ 2, kiểm tra sách vở và theo dõi nề nếp thi đua của tổ',
  },
  {
    key: 'Tổ phó Tổ 2',
    title: 'Tổ phó Tổ 2',
    icon: '⭐',
    category: 2,
    badgeClass: 'bg-gradient-to-r from-sky-500/25 to-indigo-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
    description: 'Hỗ trợ tổ trưởng Tổ 2 ghi chép điểm sao, theo dõi trực nhật và đôn đốc các bạn cùng tổ',
  },

  // Tổ 3
  {
    key: 'Tổ trưởng Tổ 3',
    title: 'Tổ trưởng Tổ 3',
    icon: '👑',
    category: 3,
    badgeClass: 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    description: 'Điều hành thảo luận nhóm Tổ 3, kiểm tra sách vở và theo dõi nề nếp thi đua của tổ',
  },
  {
    key: 'Tổ phó Tổ 3',
    title: 'Tổ phó Tổ 3',
    icon: '⭐',
    category: 3,
    badgeClass: 'bg-gradient-to-r from-sky-500/25 to-indigo-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
    description: 'Hỗ trợ tổ trưởng Tổ 3 ghi chép điểm sao, theo dõi trực nhật và đôn đốc các bạn cùng tổ',
  },

  // Tổ 4
  {
    key: 'Tổ trưởng Tổ 4',
    title: 'Tổ trưởng Tổ 4',
    icon: '👑',
    category: 4,
    badgeClass: 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    description: 'Điều hành thảo luận nhóm Tổ 4, kiểm tra sách vở và theo dõi nề nếp thi đua của tổ',
  },
  {
    key: 'Tổ phó Tổ 4',
    title: 'Tổ phó Tổ 4',
    icon: '⭐',
    category: 4,
    badgeClass: 'bg-gradient-to-r from-sky-500/25 to-indigo-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
    description: 'Hỗ trợ tổ trưởng Tổ 4 ghi chép điểm sao, theo dõi trực nhật và đôn đốc các bạn cùng tổ',
  },
];

export function getCadreBadgeInfo(role?: string) {
  if (!role) return null;
  const lower = role.toLowerCase().trim();
  if (lower.includes('lớp trưởng')) {
    return {
      icon: '🎖️',
      shortTitle: 'Lớp trưởng',
      label: '🎖️ Lớp trưởng',
      badgeClass: 'bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.25)]',
    };
  }
  if (lower.includes('học tập')) {
    return {
      icon: '📚',
      shortTitle: 'Lớp phó HT',
      label: '📚 Lớp phó HT',
      badgeClass: 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_8px_rgba(0,242,254,0.25)]',
    };
  }
  if (lower.includes('lao động') || lower.includes('văn thể')) {
    return {
      icon: '🎨',
      shortTitle: 'Lớp phó LĐ',
      label: '🎨 Lớp phó LĐ',
      badgeClass: 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
    };
  }
  if (lower.includes('tổ trưởng')) {
    const match = role.match(/tổ\s*(\d)/i);
    const gNum = match ? match[1] : '';
    return {
      icon: '👑',
      shortTitle: `Tổ trưởng${gNum ? ` T${gNum}` : ''}`,
      label: `👑 Tổ trưởng${gNum ? ` T${gNum}` : ''}`,
      badgeClass: 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    };
  }
  if (lower.includes('tổ phó')) {
    const match = role.match(/tổ\s*(\d)/i);
    const gNum = match ? match[1] : '';
    return {
      icon: '⭐',
      shortTitle: `Tổ phó${gNum ? ` T${gNum}` : ''}`,
      label: `⭐ Tổ phó${gNum ? ` T${gNum}` : ''}`,
      badgeClass: 'bg-gradient-to-r from-sky-500/25 to-indigo-500/20 text-sky-300 border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
    };
  }
  return {
    icon: '🎖️',
    shortTitle: role,
    label: role,
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  };
}

export const ClassCommitteeModal: React.FC<ClassCommitteeModalProps> = ({
  isOpen,
  onClose,
  initialFocusGroup,
  onSaved,
}) => {
  const { students, updateStudentCadres, triggerManualSave, currentUser } = useApp();

  // Active section tab: 'all' | 'class' | 1 | 2 | 3 | 4
  const [activeTab, setActiveTab] = useState<'all' | 'class' | 1 | 2 | 3 | 4>(
    initialFocusGroup || 'all'
  );

  // Search keyword for student list
  const [searchFilter, setSearchFilter] = useState('');

  // Local assignments map: { [roleKey]: studentId | null }
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    CADRE_ROLES.forEach((r) => {
      // Find matching student
      const match = students.find((s) => {
        if (!s.cadreRole) return false;
        const normStudent = s.cadreRole.toLowerCase().trim();
        const normRole = r.key.toLowerCase().trim();
        if (normStudent === normRole) return true;
        // Group-based matching
        if (typeof r.category === 'number') {
          if (normRole.includes('tổ trưởng') && normStudent.includes('tổ trưởng') && s.seat.group === r.category) return true;
          if (normRole.includes('tổ phó') && normStudent.includes('tổ phó') && s.seat.group === r.category) return true;
        }
        return false;
      });
      map[r.key] = match ? match.id : null;
    });
    return map;
  });

  // Re-sync assignments if modal opens or initialFocusGroup changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialFocusGroup) {
        setActiveTab(initialFocusGroup);
      }
      const map: Record<string, string | null> = {};
      CADRE_ROLES.forEach((r) => {
        const match = students.find((s) => {
          if (!s.cadreRole) return false;
          const normStudent = s.cadreRole.toLowerCase().trim();
          const normRole = r.key.toLowerCase().trim();
          if (normStudent === normRole) return true;
          if (typeof r.category === 'number') {
            if (normRole.includes('tổ trưởng') && normStudent.includes('tổ trưởng') && s.seat.group === r.category) return true;
            if (normRole.includes('tổ phó') && normStudent.includes('tổ phó') && s.seat.group === r.category) return true;
          }
          return false;
        });
        map[r.key] = match ? match.id : null;
      });
      setAssignments(map);
    }
  }, [isOpen, initialFocusGroup, students]);

  if (!isOpen) return null;

  const handleRoleChange = (roleKey: string, studentId: string | null) => {
    setAssignments((prev) => {
      const updated = { ...prev };
      // If student was already assigned to another role, clear it to avoid duplicate positions
      if (studentId) {
        Object.keys(updated).forEach((k) => {
          if (updated[k] === studentId && k !== roleKey) {
            updated[k] = null;
          }
        });
      }
      updated[roleKey] = studentId;
      return updated;
    });
  };

  const handleSave = () => {
    // Apply to AppContext
    updateStudentCadres(assignments);
    // Trigger immediate cloud & local persistence
    triggerManualSave();

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#ffd700', '#f59e0b', '#3b82f6', '#10b981'],
      });
    } catch (e) {}

    if (onSaved) onSaved();
    onClose();
  };

  const filteredRoles = CADRE_ROLES.filter((r) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'class') return r.category === 'class';
    return r.category === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      <div className="cyber-glass w-full max-w-3xl rounded-3xl border border-[#00f2fe]/40 shadow-[0_0_35px_rgba(0,242,254,0.25)] flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 flex items-center justify-between bg-[#0a122c]/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-xl shadow-lg border border-amber-300/40">
              👑
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                <span>Phân Công Ban Cán Sự Lớp & 4 Tổ</span>
                <span className="text-[10px] bg-cyan-950/80 text-[#00f2fe] px-2.5 py-0.5 rounded-full border border-cyan-500/40 font-bold">
                  {currentUser?.className || 'Lớp 3C1'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Chỉ định Lớp trưởng, Lớp phó và Tổ trưởng, Tổ phó 4 Tổ • Tự động đồng bộ lên Sơ đồ lớp & Đám mây
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-cyan-500/15 bg-[#070d20] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 border ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-[#00f2fe]/20 to-[#4facfe]/30 text-[#00f2fe] border-[#00f2fe]/60 shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>Tất Cả Vai Trò</span>
            </button>

            <button
              onClick={() => setActiveTab('class')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 border ${
                activeTab === 'class'
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/30 text-amber-300 border-amber-500/60 shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>🎖️ Ban Cán Sự Lớp</span>
            </button>

            {([1, 2, 3, 4] as const).map((g) => (
              <button
                key={g}
                onClick={() => setActiveTab(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 border ${
                  activeTab === g
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/30 text-cyan-300 border-cyan-500/60 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>Tổ {g}</span>
              </button>
            ))}
          </div>

          {/* Quick search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm kiếm học sinh..."
              className="w-44 bg-[#0a122c] border border-cyan-500/20 rounded-xl pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f2fe]"
            />
          </div>
        </div>

        {/* Roles List Form */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {filteredRoles.map((role) => {
            const currentStudentId = assignments[role.key] || null;
            const currentStudent = students.find((s) => s.id === currentStudentId);

            // Filter student options: prioritize students in the same group if role is for a group, but allow full class
            const filteredStudentOptions = students.filter((s) => {
              if (!searchFilter.trim()) return true;
              const term = searchFilter.toLowerCase();
              return (
                s.fullName.toLowerCase().includes(term) ||
                s.stt.toString().includes(term) ||
                `tổ ${s.seat.group}`.includes(term)
              );
            });

            return (
              <div
                key={role.key}
                className="bg-[#0a122c]/85 border border-cyan-500/20 rounded-2xl p-3.5 sm:p-4 shadow-md transition hover:border-[#00f2fe]/40 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl flex-shrink-0">{role.icon}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-white">{role.title}</h4>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${role.badgeClass}`}>
                          {role.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{role.description}</p>
                    </div>
                  </div>

                  {/* Student Select Dropdown */}
                  <div className="flex items-center space-x-2 sm:w-72">
                    <select
                      value={currentStudentId || ''}
                      onChange={(e) => handleRoleChange(role.key, e.target.value || null)}
                      className="w-full bg-[#05091b] border border-cyan-500/30 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#00f2fe] cursor-pointer"
                    >
                      <option value="">-- Chưa chỉ định --</option>
                      {filteredStudentOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.gender === 'Nam' ? '👦' : '👧'} STT {s.stt}: {s.fullName} (Tổ {s.seat.group})
                        </option>
                      ))}
                    </select>

                    {currentStudentId && (
                      <button
                        onClick={() => handleRoleChange(role.key, null)}
                        className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition flex-shrink-0"
                        title="Bỏ chỉ định vị trí này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Assignment Preview Card */}
                {currentStudent ? (
                  <div className="flex items-center justify-between bg-[#050a1d] border border-cyan-500/15 rounded-xl px-3 py-1.5 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-sm shadow border border-cyan-400/30">
                        {currentStudent.gender === 'Nam' ? '👦' : '👧'}
                      </div>
                      <div>
                        <span className="font-bold text-white mr-2">{currentStudent.fullName}</span>
                        <span className="text-[10.5px] text-slate-400">
                          (Tổ {currentStudent.seat.group} • STT: {currentStudent.stt})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-amber-300 font-bold text-[11px] flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{currentStudent.stars} sao</span>
                      </span>
                      <span className="text-emerald-400 text-[10px] bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                        <Check className="w-2.5 h-2.5" />
                        <span>Đã giao nhiệm vụ</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#05091b]/50 border border-dashed border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-500 italic flex items-center space-x-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                    <span>Chưa có học sinh đảm nhiệm vai trò này. Hãy chọn từ danh sách trên.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-cyan-500/20 bg-[#070d20] flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-[#00f2fe]" />
            <span>Mọi thay đổi sẽ lập tức hiển thị trên Sơ đồ 4 Tổ và thẻ vinh danh.</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Hủy Bỏ
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-cyan-500/25 transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Lưu & Đồng Bộ Ban Cán Sự 💾</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
