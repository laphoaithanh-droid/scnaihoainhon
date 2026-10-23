import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Student,
  Role,
  UserAccount,
  ClassroomMaterial,
  BilingualLesson,
  EarlyWarningAlert,
  GoogleSheetConfig,
  ChatMessage,
  TT27Evaluation,
  BehaviorLogEntry,
  PlanDocument,
  ClassDataSandbox,
  SaveStatus,
  TeacherAuthRecord,
  BilingualProgress,
  LuckyWheelCallRecord,
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_CLASSROOM_MATERIALS,
  BILINGUAL_LESSONS,
  INITIAL_ALERTS,
  INITIAL_PLANS,
} from '../data/mockData';

export const USERNAME_REGEX = /^[a-z0-9]+_[0-9]{4}$/;
export const DEFAULT_TEACHER_PASSWORD = 'Abc123@';

export async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // fallback
    }
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

export function getTeacherAuthRecord(username: string): TeacherAuthRecord | null {
  try {
    const raw = localStorage.getItem(`sochuniem_auth_${username.toLowerCase()}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading auth record', e);
  }
  return null;
}

export async function setTeacherAuthRecord(
  username: string,
  password: string,
  isDefault: boolean
): Promise<TeacherAuthRecord> {
  const passwordHash = await hashPassword(password);
  const record: TeacherAuthRecord = {
    username: username.toLowerCase(),
    passwordHash,
    isDefaultPassword: isDefault,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(`sochuniem_auth_${username.toLowerCase()}`, JSON.stringify(record));
  } catch (e) {
    console.error('Error saving auth record', e);
  }
  return record;
}

export function parseClassInfoFromUsername(username: string): { className: string; schoolYear: string } {
  const match = username.toLowerCase().match(/^([a-z0-9]+)_([0-9]{4})$/);
  if (!match) {
    if (username.toLowerCase() === 'thanh.lh' || username.toLowerCase() === 'admin') {
      return { className: 'Lớp 4A1', schoolYear: '2026' };
    }
    return { className: `Lớp ${username.toUpperCase()}`, schoolYear: '2026' };
  }
  const rawClass = match[1];
  const year = match[2];
  let formattedClassName = '';
  if (rawClass.startsWith('lop')) {
    formattedClassName = `Lớp ${rawClass.slice(3).toUpperCase()}`;
  } else {
    formattedClassName = `Lớp ${rawClass.toUpperCase()}`;
  }
  return { className: formattedClassName, schoolYear: year };
}

export function getDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Trình duyệt Web';
  const ua = navigator.userAgent;
  let browser = 'Trình duyệt Web';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  let os = 'Thiết bị';
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} trên ${os}`;
}

export function getClassSandbox(username: string): ClassDataSandbox | null {
  try {
    const raw = localStorage.getItem(`sochuniem_class_${username.toLowerCase()}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading sandbox for', username, e);
  }
  return null;
}

export function createInitialSandboxForClass(username: string): ClassDataSandbox {
  const { className, schoolYear } = parseClassInfoFromUsername(username);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  // Create adapted students for this class
  const cleanPrefix = username.replace(/[^a-z0-9]/g, '');
  const adaptedStudents: Student[] = INITIAL_STUDENTS.map((s) => ({
    ...s,
    id: `st-${cleanPrefix}-${s.stt}`,
    username: `${s.username.split('.')[0] || 'hs'}.${cleanPrefix.slice(0, 5)}`,
  }));

  const sandbox: ClassDataSandbox = {
    username: username.toLowerCase(),
    className,
    schoolYear,
    teacherName: 'Cô Đỗ Thị Hoà',
    schoolName: 'Trường Tiểu học Hoài Nhơn',
    customClassPrompt: `Lớp ${className} (Năm học ${schoolYear}): Chú trọng rèn luyện nề nếp tự học, tinh thần đoàn kết giúp đỡ bạn bè, giải thích trực quan các bài toán có lời văn và phát huy tối đa năng lực học sinh theo Thông tư 27.`,
    students: adaptedStudents,
    materials: INITIAL_CLASSROOM_MATERIALS,
    plans: INITIAL_PLANS,
    alerts: INITIAL_ALERTS,
    googleSheetConfig: {
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1XyZ9.../edit?usp=sharing',
      sheetId: `Sheet_${cleanPrefix}`,
      syncIntervalMinutes: 30,
      lastSyncedAt: 'Mới khởi tạo',
      autoSync: true,
    },
    bilingualProgress: {
      practiceCount: 0,
      totalStarsEarned: 0,
      history: [],
    },
    bilingualLessons: BILINGUAL_LESSONS,
    bilingualEnabled: true,
    bilingualTtsSettings: { rate: 1.0, defaultMode: 'both', autoHighlight: true },
    lastSavedAt: timeStr,
  };

  try {
    localStorage.setItem(`sochuniem_class_${username.toLowerCase()}`, JSON.stringify(sandbox));
  } catch (e) {
    console.error('Error saving new sandbox', e);
  }

  return sandbox;
}

interface AppContextType {
  currentUser: UserAccount | null;
  role: Role;
  isTeacherAuthenticated: boolean;
  students: Student[];
  materials: ClassroomMaterial[];
  plans: PlanDocument[];
  bilingualLessons: BilingualLesson[];
  bilingualProgress: BilingualProgress;
  bilingualEnabled: boolean;
  alerts: EarlyWarningAlert[];
  chatMessages: ChatMessage[];
  googleSheetConfig: GoogleSheetConfig;
  activeDate: string; // 'YYYY-MM-DD'
  // Auto-save & Custom Class Prompt & Cloud Persistence
  saveStatus: SaveStatus;
  lastSavedTime: string;
  customClassPrompt: string;
  setCustomClassPrompt: (prompt: string) => void;
  triggerManualSave: () => void;
  resetClassDataToDefault: () => void;
  updateTeacherProfile: (teacherName: string, className: string) => Promise<boolean>;
  syncWithCloud: () => Promise<{ success: boolean; lastSavedTime?: string; error?: string }>;
  exportCloudBackup: () => void;
  restoreCloudBackup: (fileOrData: File | any) => Promise<{ success: boolean; message: string; error?: string }>;
  // Auth & Password Actions
  isUsingDefaultPassword: boolean;
  changeTeacherPassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  resetTeacherPasswordToDefault: (usernameInput?: string) => Promise<{ success: boolean; message: string; error?: string }>;
  loginAsTeacherWithClass: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginAsTeacher: () => void;
  loginAsStudent: (student: Student) => void;
  loginWithCredentials: (username: string, pass: string, selectedRole: Role) => Promise<boolean>;
  logout: () => void;
  updateAttendance: (studentId: string, status: 'present' | 'excused' | 'unexcused' | 'late') => void;
  addBehaviorLog: (studentId: string, log: Omit<BehaviorLogEntry, 'id' | 'date' | 'time'>) => void;
  updateSeatPosition: (studentId: string, group: 1 | 2 | 3 | 4, tableIndex: number, position: 'left' | 'right') => void;
  swapSeats: (studentId1: string, studentId2: string) => void;
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
  addStudent: (student: Omit<Student, 'id'>) => void;
  moveStudentToGroup: (studentId: string, targetGroup: 1 | 2 | 3 | 4) => void;
  autoBalanceGroups: () => void;
  updateStudentCadres: (assignments: Record<string, string | null | undefined>) => void;
  batchImportStudents: (
    newRows: Array<{ fullName: string; gender: 'Nam' | 'Nữ'; group: 1 | 2 | 3 | 4; stt?: number; phone?: string; parentName?: string }>
  ) => number;
  luckyWheelHistory: LuckyWheelCallRecord[];
  recordCallWinner: (studentId: string, stars: number) => void;
  updateTT27Evaluation: (studentId: string, evaluation: Partial<TT27Evaluation>) => void;
  updateBoardingHealth: (studentId: string, health: Partial<Student['boardingHealth']>) => void;
  toggleMedicineTaken: (studentId: string, medicineId: string) => void;
  addMedicineReminder: (studentId: string, item: { time: string; medicineName: string; dosage: string; parentNote: string }) => void;
  addMaterial: (material: Omit<ClassroomMaterial, 'id' | 'createdAt'>) => void;
  deleteMaterial: (id: string) => void;
  addPlan: (plan: Omit<PlanDocument, 'id' | 'createdAt'>) => void;
  deletePlan: (id: string) => void;
  addBilingualLesson: (lesson: Omit<BilingualLesson, 'id'>) => void;
  updateBilingualLesson: (lesson: BilingualLesson) => void;
  deleteBilingualLesson: (id: string) => void;
  bilingualTtsSettings: { rate: number; defaultMode: 'both' | 'en' | 'vi'; autoHighlight: boolean };
  updateBilingualTtsSettings: (settings: Partial<{ rate: number; defaultMode: 'both' | 'en' | 'vi'; autoHighlight: boolean }>) => void;
  recordPronunciationPractice: (
    targetPhrase: string,
    spokenText: string,
    score: number,
    stars: 1 | 2 | 3,
    studentName?: string
  ) => void;
  toggleBilingualEnabled: (enabled?: boolean) => void;
  addCustomBilingualSentence: (subject: string, vi: string, en: string) => void;
  resolveAlert: (alertId: string) => void;
  addAlert: (alert: Omit<EarlyWarningAlert, 'id' | 'date'>) => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateGoogleSheetConfig: (config: Partial<GoogleSheetConfig>) => void;
  importStudentsFromPsv: (text: string) => { success: boolean; count: number; error?: string };
  exportStudentsToPsv: () => string;
  syncStudentsFromGoogleSheet: (overrideUrl?: string) => Promise<{ success: boolean; count: number; error?: string }>;
  generateWeeklyDigest: () => any;
  triggerMorningAbsenteeNotification: () => { count: number; students: Student[] };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const activeUsername = localStorage.getItem('sochuniem_active_user');
    if (activeUsername) {
      const sandbox =
        getClassSandbox(activeUsername) ||
        (USERNAME_REGEX.test(activeUsername) ? createInitialSandboxForClass(activeUsername) : null);
      if (sandbox) {
        return {
          id: `gv-${activeUsername}`,
          username: activeUsername,
          role: 'teacher',
          fullName: sandbox.teacherName,
          className: sandbox.className,
          schoolYear: sandbox.schoolYear,
          schoolName: sandbox.schoolName,
        };
      }
    }
    // Default: Khách / Chưa đăng nhập
    return null;
  });

  // Load state from active class sandbox if logged in, else default standard data
  const initialSandbox = currentUser ? getClassSandbox(currentUser.username) : null;

  const [students, setStudents] = useState<Student[]>(() => {
    if (initialSandbox?.students) return initialSandbox.students;
    return INITIAL_STUDENTS;
  });

  const [materials, setMaterials] = useState<ClassroomMaterial[]>(() => {
    if (initialSandbox?.materials) return initialSandbox.materials;
    return INITIAL_CLASSROOM_MATERIALS;
  });

  const [plans, setPlans] = useState<PlanDocument[]>(() => {
    if (initialSandbox?.plans) return initialSandbox.plans;
    return INITIAL_PLANS;
  });

  const [alerts, setAlerts] = useState<EarlyWarningAlert[]>(() => {
    if (initialSandbox?.alerts) return initialSandbox.alerts;
    return INITIAL_ALERTS;
  });

  const [customClassPrompt, setCustomClassPrompt] = useState<string>(() => {
    if (initialSandbox?.customClassPrompt) return initialSandbox.customClassPrompt;
    return 'Lớp này tiếp thu môn Toán trực quan tốt, cần rèn thêm cách trình bày bài giải có lời văn và phát huy tinh thần làm việc nhóm.';
  });

  const [googleSheetConfig, setGoogleSheetConfig] = useState<GoogleSheetConfig>(() => {
    if (initialSandbox?.googleSheetConfig) return initialSandbox.googleSheetConfig;
    return {
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1XyZ9.../edit?usp=sharing',
      sheetId: '1XyZ9_ExampleSheetId_SoChuNiemAI',
      syncIntervalMinutes: 30,
      lastSyncedAt: 'Mới kết nối',
      autoSync: true,
    };
  });

  const [bilingualLessons, setBilingualLessons] = useState<BilingualLesson[]>(() => {
    if (initialSandbox?.bilingualLessons && initialSandbox.bilingualLessons.length > 0) {
      return initialSandbox.bilingualLessons;
    }
    return BILINGUAL_LESSONS;
  });

  const [bilingualProgress, setBilingualProgress] = useState<BilingualProgress>(() => {
    if (initialSandbox?.bilingualProgress) return initialSandbox.bilingualProgress;
    return { practiceCount: 0, totalStarsEarned: 0, history: [] };
  });

  const [bilingualEnabled, setBilingualEnabled] = useState<boolean>(() => {
    if (initialSandbox?.bilingualEnabled !== undefined) return initialSandbox.bilingualEnabled;
    return true;
  });

  const [bilingualTtsSettings, setBilingualTtsSettings] = useState<{
    rate: number;
    defaultMode: 'both' | 'en' | 'vi';
    autoHighlight: boolean;
  }>(() => {
    if (initialSandbox?.bilingualTtsSettings) return initialSandbox.bilingualTtsSettings;
    return { rate: 1.0, defaultMode: 'both', autoHighlight: true };
  });

  const updateBilingualTtsSettings = (
    settings: Partial<{ rate: number; defaultMode: 'both' | 'en' | 'vi'; autoHighlight: boolean }>
  ) => {
    setBilingualTtsSettings((prev) => ({ ...prev, ...settings }));
  };

  const [luckyWheelHistory, setLuckyWheelHistory] = useState<LuckyWheelCallRecord[]>(() => {
    if (initialSandbox?.luckyWheelHistory) return initialSandbox.luckyWheelHistory;
    return [];
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('synced');
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    if (initialSandbox?.lastSavedAt) return initialSandbox.lastSavedAt;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const [isUsingDefaultPassword, setIsUsingDefaultPassword] = useState<boolean>(() => {
    const activeUsername = localStorage.getItem('sochuniem_active_user');
    if (activeUsername) {
      const auth = getTeacherAuthRecord(activeUsername);
      if (auth) return auth.isDefaultPassword;
      return true;
    }
    return true;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      text: 'Chào bạn! Mình là Trợ lý AI Lớp Học Thông Minh. Mình có thể giúp giải đáp bài học theo sách Kết Nối Tri Thức, tra cứu nội quy, phân công trực nhật và hỗ trợ học tập!',
      timestamp: '08:00',
    },
  ]);

  const activeDate = '2026-10-22'; // Current date context

  // -------------------------------------------------------------
  // CLOUD PERSISTENCE & AUTO-SYNC HELPERS
  // -------------------------------------------------------------
  const syncWithCloud = async (): Promise<{ success: boolean; lastSavedTime?: string; error?: string }> => {
    if (!currentUser || currentUser.role !== 'teacher') {
      return { success: false, error: 'Chưa có phiên làm việc của giáo viên.' };
    }

    setSaveStatus('saving');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const isoStr = now.toISOString();

    const sandbox: ClassDataSandbox = {
      username: currentUser.username,
      className: currentUser.className,
      schoolYear: currentUser.schoolYear || '2026',
      teacherName: currentUser.fullName,
      schoolName: currentUser.schoolName || 'Trường Tiểu học Hoài Nhơn',
      customClassPrompt,
      students,
      materials,
      plans,
      alerts,
      googleSheetConfig,
      bilingualProgress,
      bilingualLessons,
      bilingualEnabled,
      bilingualTtsSettings,
      luckyWheelHistory,
      deviceInfo: getDeviceInfo(),
      version: 1,
      lastSavedAt: timeStr,
    };

    // Save locally
    try {
      localStorage.setItem(`sochuniem_class_${currentUser.username}`, JSON.stringify(sandbox));
      localStorage.setItem('sochuniem_active_user', currentUser.username);
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }

    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/cloud/class/${currentUser.username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_name: currentUser.fullName,
            display_class_name: currentUser.className,
            last_updated: isoStr,
            device_info: getDeviceInfo(),
            version: 1,
            payload: sandbox,
          }),
        });

        if (res.ok) {
          setSaveStatus('saved');
          setLastSavedTime(timeStr);
          return { success: true, lastSavedTime: timeStr };
        } else {
          setSaveStatus('offline');
          return { success: false, error: 'Máy chủ phản hồi lỗi khi đồng bộ.' };
        }
      } catch (err: any) {
        setSaveStatus('offline');
        return { success: false, error: err.message || 'Lỗi mạng khi đồng bộ lên đám mây.' };
      }
    } else {
      setSaveStatus('offline');
      return { success: false, error: 'Thiết bị đang mất kết nối mạng. Dữ liệu đã lưu tạm trên máy.' };
    }
  };

  const updateTeacherProfile = async (
    teacherName: string,
    className: string
  ): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'teacher') return false;

    const trimmedTeacher = teacherName.trim() || currentUser.fullName;
    const trimmedClass = className.trim() || currentUser.className;

    const updatedAccount: UserAccount = {
      ...currentUser,
      fullName: trimmedTeacher,
      className: trimmedClass,
    };
    setCurrentUser(updatedAccount);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const isoStr = now.toISOString();

    const sandbox: ClassDataSandbox = {
      username: currentUser.username,
      className: trimmedClass,
      schoolYear: currentUser.schoolYear || '2026',
      teacherName: trimmedTeacher,
      schoolName: currentUser.schoolName || 'Trường Tiểu học Hoài Nhơn',
      customClassPrompt,
      students,
      materials,
      plans,
      alerts,
      googleSheetConfig,
      bilingualProgress,
      bilingualLessons,
      bilingualEnabled,
      bilingualTtsSettings,
      luckyWheelHistory,
      deviceInfo: getDeviceInfo(),
      version: 1,
      lastSavedAt: timeStr,
    };

    // Save locally
    try {
      localStorage.setItem(`sochuniem_class_${currentUser.username}`, JSON.stringify(sandbox));
      localStorage.setItem('sochuniem_active_user', currentUser.username);
    } catch (e) {
      console.error('Error saving updated profile to local storage', e);
    }

    // Push immediately to cloud
    setSaveStatus('saving');
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/cloud/class/${currentUser.username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_name: trimmedTeacher,
            display_class_name: trimmedClass,
            last_updated: isoStr,
            device_info: getDeviceInfo(),
            version: 1,
            payload: sandbox,
          }),
        });

        if (res.ok) {
          setSaveStatus('saved');
          setLastSavedTime(timeStr);
        } else {
          setSaveStatus('offline');
        }
      } catch (err) {
        setSaveStatus('offline');
      }
    } else {
      setSaveStatus('offline');
    }

    return true;
  };

  const exportCloudBackup = () => {
    if (!currentUser || currentUser.role !== 'teacher') return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const sandbox: ClassDataSandbox = {
      username: currentUser.username,
      className: currentUser.className,
      schoolYear: currentUser.schoolYear || '2026',
      teacherName: currentUser.fullName,
      schoolName: currentUser.schoolName || 'Trường Tiểu học Hoài Nhơn',
      customClassPrompt,
      students,
      materials,
      plans,
      alerts,
      googleSheetConfig,
      bilingualProgress,
      bilingualLessons,
      bilingualEnabled,
      bilingualTtsSettings,
      luckyWheelHistory,
      deviceInfo: getDeviceInfo(),
      version: 1,
      lastSavedAt: timeStr,
    };

    const backupRecord = {
      account_id: currentUser.username,
      teacher_name: currentUser.fullName,
      display_class_name: currentUser.className,
      last_updated: now.toISOString(),
      device_info: getDeviceInfo(),
      version: 1,
      payload: sandbox,
    };

    const blob = new Blob([JSON.stringify(backupRecord, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SaoLuu_DamMay_${currentUser.username}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreCloudBackup = async (
    fileOrData: File | any
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    if (!currentUser || currentUser.role !== 'teacher') {
      return { success: false, message: 'Chưa có phiên làm việc của giáo viên', error: 'Chưa đăng nhập' };
    }

    try {
      let parsedData: any;
      if (fileOrData instanceof File) {
        const text = await fileOrData.text();
        parsedData = JSON.parse(text);
      } else if (typeof fileOrData === 'string') {
        parsedData = JSON.parse(fileOrData);
      } else {
        parsedData = fileOrData;
      }

      const payload: ClassDataSandbox = parsedData.payload || parsedData;
      if (!payload || (!payload.students && !payload.materials && !payload.className)) {
        return { success: false, message: 'Tệp sao lưu không đúng định dạng JSON chuẩn của Sổ Chủ Nhiệm AI.', error: 'Invalid structure' };
      }

      // Persist to server via restore endpoint
      if (navigator.onLine) {
        try {
          await fetch(`/api/cloud/class/${currentUser.username}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedData),
          });
        } catch (e) {
          console.warn('Could not post restore to server, continuing locally', e);
        }
      }

      // Apply into state
      if (payload.students) setStudents(payload.students);
      if (payload.materials) setMaterials(payload.materials);
      if (payload.plans) setPlans(payload.plans);
      if (payload.alerts) setAlerts(payload.alerts);
      if (payload.customClassPrompt) setCustomClassPrompt(payload.customClassPrompt);
      if (payload.googleSheetConfig) setGoogleSheetConfig(payload.googleSheetConfig);
      if (payload.bilingualProgress) setBilingualProgress(payload.bilingualProgress);
      if (payload.bilingualLessons) setBilingualLessons(payload.bilingualLessons);
      if (payload.bilingualEnabled !== undefined) setBilingualEnabled(payload.bilingualEnabled);
      if (payload.bilingualTtsSettings) setBilingualTtsSettings(payload.bilingualTtsSettings);
      if (payload.luckyWheelHistory) setLuckyWheelHistory(payload.luckyWheelHistory);

      if (payload.teacherName || payload.className) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                fullName: payload.teacherName || prev.fullName,
                className: payload.className || prev.className,
                schoolYear: payload.schoolYear || prev.schoolYear,
              }
            : null
        );
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      try {
        localStorage.setItem(
          `sochuniem_class_${currentUser.username}`,
          JSON.stringify({ ...payload, lastSavedAt: timeStr })
        );
      } catch (e) {}

      setSaveStatus('saved');
      setLastSavedTime(timeStr);

      return {
        success: true,
        message: `Khôi phục thành công! Đã nạp ${payload.students?.length || 0} học sinh và ${payload.materials?.length || 0} tài liệu bài học.`,
      };
    } catch (err: any) {
      console.error('Error restoring backup file:', err);
      return { success: false, message: 'Lỗi đọc tệp sao lưu: ' + (err.message || 'Lỗi không xác định'), error: err.message };
    }
  };

  // -------------------------------------------------------------
  // DEBOUNCED AUTO-SAVE TO LOCAL STORAGE & CLOUD (1500ms)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') return;

    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const isoStr = now.toISOString();

      const sandbox: ClassDataSandbox = {
        username: currentUser.username,
        className: currentUser.className,
        schoolYear: currentUser.schoolYear || '2026',
        teacherName: currentUser.fullName,
        schoolName: currentUser.schoolName || 'Trường Tiểu học Hoài Nhơn',
        customClassPrompt,
        students,
        materials,
        plans,
        alerts,
        googleSheetConfig,
        bilingualProgress,
        bilingualLessons,
        bilingualEnabled,
        bilingualTtsSettings,
        luckyWheelHistory,
        deviceInfo: getDeviceInfo(),
        version: 1,
        lastSavedAt: timeStr,
      };

      // 1. Cache to local storage immediately
      try {
        localStorage.setItem(`sochuniem_class_${currentUser.username}`, JSON.stringify(sandbox));
        localStorage.setItem('sochuniem_active_user', currentUser.username);
      } catch (err) {
        console.error('Auto-save local storage error:', err);
      }

      // 2. Persist to cloud server
      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/cloud/class/${currentUser.username}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teacher_name: currentUser.fullName,
              display_class_name: currentUser.className,
              last_updated: isoStr,
              device_info: getDeviceInfo(),
              version: 1,
              payload: sandbox,
            }),
          });
          if (res.ok) {
            setSaveStatus('saved');
            setLastSavedTime(timeStr);
          } else {
            setSaveStatus('offline');
          }
        } catch (netErr) {
          console.warn('Cloud sync error, fallback local cache:', netErr);
          setSaveStatus('offline');
        }
      } else {
        setSaveStatus('offline');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    students,
    materials,
    plans,
    alerts,
    customClassPrompt,
    googleSheetConfig,
    bilingualProgress,
    bilingualLessons,
    bilingualEnabled,
    bilingualTtsSettings,
    luckyWheelHistory,
    currentUser,
  ]);

  // Window network listener for auto-sync on reconnect
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online reconnected, triggering cloud sync...');
      syncWithCloud();
    };
    const handleOffline = () => {
      console.log('Network offline');
      setSaveStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [
    currentUser,
    students,
    materials,
    plans,
    alerts,
    customClassPrompt,
    googleSheetConfig,
    bilingualProgress,
    bilingualLessons,
    bilingualEnabled,
    bilingualTtsSettings,
    luckyWheelHistory,
  ]);

  // Initial cross-device check on startup
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher' || !navigator.onLine) return;
    fetch(`/api/cloud/class/${currentUser.username}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((cloudData) => {
        if (cloudData && cloudData.found && cloudData.payload) {
          const p = cloudData.payload;
          if (p.teacherName && p.teacherName !== currentUser.fullName) {
            setCurrentUser((prev) => (prev ? { ...prev, fullName: p.teacherName, className: p.className } : null));
          }
        }
      })
      .catch(() => {});
  }, []);

  const triggerManualSave = () => {
    syncWithCloud();
  };

  const resetClassDataToDefault = () => {
    if (!currentUser || currentUser.role !== 'teacher') return;
    const newSandbox = createInitialSandboxForClass(currentUser.username);
    setStudents(newSandbox.students);
    setMaterials(newSandbox.materials);
    setPlans(newSandbox.plans);
    setAlerts(newSandbox.alerts);
    setCustomClassPrompt(newSandbox.customClassPrompt);
    setGoogleSheetConfig(newSandbox.googleSheetConfig);
    if (newSandbox.bilingualProgress) setBilingualProgress(newSandbox.bilingualProgress);
    if (newSandbox.bilingualLessons) setBilingualLessons(newSandbox.bilingualLessons);
    if (newSandbox.bilingualEnabled !== undefined) setBilingualEnabled(newSandbox.bilingualEnabled);
    if (newSandbox.bilingualTtsSettings) setBilingualTtsSettings(newSandbox.bilingualTtsSettings);
    if (newSandbox.luckyWheelHistory) setLuckyWheelHistory(newSandbox.luckyWheelHistory);
    setSaveStatus('saved');
    setLastSavedTime(newSandbox.lastSavedAt);
  };

  // -------------------------------------------------------------
  // AUTHENTICATION & LOGIN ACTIONS
  // -------------------------------------------------------------
  const loginAsTeacherWithClass = async (
    username: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toLowerCase();

    // Validate format ^[a-z0-9]+_[0-9]{4}$ (or legacy demo accounts)
    const isValidFormat =
      USERNAME_REGEX.test(cleanUser) || cleanUser === 'thanh.lh' || cleanUser === 'admin';
    if (!isValidFormat) {
      return {
        success: false,
        error:
          'Tên đăng nhập không đúng định dạng. Quy ước: tênlớp_năm (ví dụ: lop3c1_2026, lop1a2_2026, lop5b_2026).',
      };
    }

    // Check stored password hash
    const storedAuth = getTeacherAuthRecord(cleanUser);
    const enteredHash = await hashPassword(pass);

    let passwordMatches = false;
    let isDefault = false;

    if (storedAuth) {
      passwordMatches = storedAuth.passwordHash === enteredHash;
      isDefault = storedAuth.isDefaultPassword;
    } else {
      // First time login: accept DEFAULT_TEACHER_PASSWORD ('Abc123@') or legacy demo
      const validInitialPasswords = [DEFAULT_TEACHER_PASSWORD, '123456', 'admin123', 'teacher'];
      if (validInitialPasswords.includes(pass)) {
        passwordMatches = true;
        isDefault = pass === DEFAULT_TEACHER_PASSWORD;
        await setTeacherAuthRecord(cleanUser, pass, isDefault);
      }
    }

    if (!passwordMatches) {
      return {
        success: false,
        error: 'Mật khẩu không chính xác! (Mật khẩu mặc định: Abc123@)',
      };
    }

    setIsUsingDefaultPassword(isDefault);

    // Load or create sandbox for this class (Query cloud record first for cross-device sync)
    let sandbox = getClassSandbox(cleanUser);
    if (navigator.onLine) {
      try {
        const cloudRes = await fetch(`/api/cloud/class/${cleanUser}`);
        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          if (cloudData.found && cloudData.payload) {
            sandbox = cloudData.payload;
            try {
              localStorage.setItem(`sochuniem_class_${cleanUser}`, JSON.stringify(sandbox));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Network issue fetching cloud record on login:', err);
      }
    }

    if (!sandbox) {
      sandbox = createInitialSandboxForClass(cleanUser);
    }

    // Load state
    setStudents(sandbox.students);
    setMaterials(sandbox.materials);
    setPlans(sandbox.plans);
    setAlerts(sandbox.alerts);
    setCustomClassPrompt(sandbox.customClassPrompt);
    setGoogleSheetConfig(sandbox.googleSheetConfig);
    if (sandbox.bilingualProgress) {
      setBilingualProgress(sandbox.bilingualProgress);
    } else {
      setBilingualProgress({ practiceCount: 0, totalStarsEarned: 0, history: [] });
    }
    if (sandbox.bilingualLessons && sandbox.bilingualLessons.length > 0) {
      setBilingualLessons(sandbox.bilingualLessons);
    } else {
      setBilingualLessons(BILINGUAL_LESSONS);
    }
    if (sandbox.bilingualEnabled !== undefined) {
      setBilingualEnabled(sandbox.bilingualEnabled);
    } else {
      setBilingualEnabled(true);
    }
    if (sandbox.bilingualTtsSettings) {
      setBilingualTtsSettings(sandbox.bilingualTtsSettings);
    } else {
      setBilingualTtsSettings({ rate: 1.0, defaultMode: 'both', autoHighlight: true });
    }
    if (sandbox.luckyWheelHistory) {
      setLuckyWheelHistory(sandbox.luckyWheelHistory);
    } else {
      setLuckyWheelHistory([]);
    }

    const account: UserAccount = {
      id: `gv-${cleanUser}`,
      username: cleanUser,
      role: 'teacher',
      fullName: sandbox.teacherName,
      className: sandbox.className,
      schoolYear: sandbox.schoolYear,
      schoolName: sandbox.schoolName,
    };

    setCurrentUser(account);
    localStorage.setItem('sochuniem_active_user', cleanUser);
    setSaveStatus('saved');
    setLastSavedTime(sandbox.lastSavedAt || 'Vừa đăng nhập');

    return { success: true };
  };

  const changeTeacherPassword = async (
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'teacher') {
      return { success: false, error: 'Chưa có phiên làm việc của giáo viên.' };
    }

    const cleanUser = currentUser.username.toLowerCase();
    const storedAuth = getTeacherAuthRecord(cleanUser);
    const currentHash = await hashPassword(currentPass);

    if (storedAuth) {
      if (storedAuth.passwordHash !== currentHash) {
        return { success: false, error: 'Mật khẩu hiện tại chưa chính xác.' };
      }
    } else {
      if (currentPass !== DEFAULT_TEACHER_PASSWORD && currentPass !== '123456') {
        return { success: false, error: 'Mật khẩu hiện tại chưa chính xác.' };
      }
    }

    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' };
    }

    if (newPass === currentPass) {
      return { success: false, error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' };
    }

    await setTeacherAuthRecord(cleanUser, newPass, false);
    setIsUsingDefaultPassword(false);

    return { success: true };
  };

  const resetTeacherPasswordToDefault = async (
    usernameInput?: string
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    const targetUser = (usernameInput || currentUser?.username || '').trim().toLowerCase();
    if (!targetUser) {
      return { success: false, message: '', error: 'Vui lòng cung cấp mã lớp cần đặt lại mật khẩu.' };
    }

    await setTeacherAuthRecord(targetUser, DEFAULT_TEACHER_PASSWORD, true);
    if (currentUser && currentUser.username.toLowerCase() === targetUser) {
      setIsUsingDefaultPassword(true);
    }

    return {
      success: true,
      message: `Đã khôi phục mật khẩu tài khoản ${targetUser} về mặc định (${DEFAULT_TEACHER_PASSWORD}) thành công!`,
    };
  };

  const loginAsTeacher = async () => {
    await loginAsTeacherWithClass('lop4a1_2026', DEFAULT_TEACHER_PASSWORD);
  };

  const loginAsStudent = (student: Student) => {
    const account: UserAccount = {
      id: student.id,
      username: student.username,
      fullName: student.fullName,
      role: 'student',
      className: currentUser?.className || 'Lớp 4A1',
      studentId: student.id,
      phone: student.phone,
    };
    setCurrentUser(account);
  };

  const loginWithCredentials = async (
    username: string,
    pass: string,
    selectedRole: Role
  ): Promise<boolean> => {
    if (selectedRole === 'teacher') {
      const res = await loginAsTeacherWithClass(username, pass);
      return res.success;
    } else {
      const match = students.find(
        (s) =>
          (s.username.toLowerCase() === username.toLowerCase() ||
            s.fullName.toLowerCase() === username.toLowerCase()) &&
          (s.password === pass || pass === '123456' || pass === 'Abc123@')
      );
      if (match) {
        loginAsStudent(match);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sochuniem_active_user');
    setIsUsingDefaultPassword(false);
    // Reload guest data
    setStudents(INITIAL_STUDENTS);
    setMaterials(INITIAL_CLASSROOM_MATERIALS);
    setPlans(INITIAL_PLANS);
    setAlerts(INITIAL_ALERTS);
    setCustomClassPrompt('Lớp này tiếp thu môn Toán trực quan tốt, cần rèn thêm cách trình bày bài giải có lời văn.');
    setBilingualProgress({ practiceCount: 0, totalStarsEarned: 0, history: [] });
    setBilingualLessons(BILINGUAL_LESSONS);
    setBilingualEnabled(true);
    setBilingualTtsSettings({ rate: 1.0, defaultMode: 'both', autoHighlight: true });
    setLuckyWheelHistory([]);
    setSaveStatus('synced');
  };

  // Student Attendance
  const updateAttendance = (studentId: string, status: 'present' | 'excused' | 'unexcused' | 'late') => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          attendance: {
            ...s.attendance,
            [activeDate]: status,
          },
        };
      })
    );
  };

  // Behavior & Stars
  const addBehaviorLog = (studentId: string, log: Omit<BehaviorLogEntry, 'id' | 'date' | 'time'>) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newEntry: BehaviorLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: activeDate,
      time: timeStr,
      ...log,
    };

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const starDiff = log.type === 'praise' ? Math.max(0, log.points) : 0;
        const demeritDiff = log.type === 'warning' ? Math.abs(log.points) : 0;
        return {
          ...s,
          stars: s.stars + starDiff,
          demerits: s.demerits + demeritDiff,
          behaviorLogs: [newEntry, ...s.behaviorLogs],
        };
      })
    );
  };

  // Seating & Group management (Supports Groups 1, 2, 3, 4)
  const updateSeatPosition = (
    studentId: string,
    group: 1 | 2 | 3 | 4,
    tableIndex: number,
    position: 'left' | 'right'
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            seat: { group, tableIndex, position },
          };
        }
        return s;
      })
    );
  };

  const swapSeats = (studentId1: string, studentId2: string) => {
    setStudents((prev) => {
      const s1 = prev.find((s) => s.id === studentId1);
      const s2 = prev.find((s) => s.id === studentId2);
      if (!s1 || !s2) return prev;

      const seat1 = { ...s1.seat };
      const seat2 = { ...s2.seat };

      return prev.map((s) => {
        if (s.id === studentId1) return { ...s, seat: seat2 };
        if (s.id === studentId2) return { ...s, seat: seat1 };
        return s;
      });
    });
  };

  const updateStudent = (studentId: string, updates: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          ...updates,
        };
      })
    );
  };

  const addStudent = (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...studentData,
    };
    setStudents((prev) => [...prev, newStudent]);
  };

  const moveStudentToGroup = (studentId: string, targetGroup: 1 | 2 | 3 | 4) => {
    setStudents((prev) => {
      const targetGroupStudents = prev.filter(
        (s) => s.seat.group === targetGroup && s.id !== studentId
      );
      const nextTableIndex = Math.floor(targetGroupStudents.length / 2);
      const nextPosition: 'left' | 'right' =
        targetGroupStudents.length % 2 === 0 ? 'left' : 'right';

      return prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          seat: {
            group: targetGroup,
            tableIndex: nextTableIndex,
            position: nextPosition,
          },
        };
      });
    });
  };

  // Tự động cân đối đều 4 Tổ (ví dụ: lớp 30 em -> 8-8-7-7, lớp 32 em -> 8-8-8-8)
  const autoBalanceGroups = () => {
    setStudents((prev) => {
      const sorted = [...prev].sort((a, b) => a.stt - b.stt);
      const groupCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      return sorted.map((student, idx) => {
        const targetGroup = ((idx % 4) + 1) as 1 | 2 | 3 | 4;
        const countInGroup = groupCounts[targetGroup]++;
        const tableIndex = Math.floor(countInGroup / 2);
        const position = (countInGroup % 2 === 0 ? 'left' : 'right') as 'left' | 'right';
        return {
          ...student,
          seat: {
            group: targetGroup,
            tableIndex,
            position,
          },
        };
      });
    });
  };

  // Cập nhật phân công Ban Cán Sự Lớp & Các Tổ
  const updateStudentCadres = (assignments: Record<string, string | null | undefined>) => {
    setStudents((prev) => {
      // Check if keys are student IDs (e.g. 'hs-' or 'st-')
      const isStudentIdKey = Object.keys(assignments).some((k) => k.startsWith('hs-') || k.startsWith('st-'));
      if (isStudentIdKey) {
        return prev.map((s) => ({
          ...s,
          cadreRole: assignments[s.id] !== undefined ? (assignments[s.id] || undefined) : s.cadreRole,
        }));
      }

      // Role names are keys: { 'Lớp trưởng': studentId, 'Tổ trưởng Tổ 1': studentId, ... }
      const roleKeys = Object.keys(assignments);
      return prev.map((s) => {
        let currentRole = s.cadreRole;
        if (currentRole && roleKeys.includes(currentRole)) {
          if (assignments[currentRole] !== s.id) {
            currentRole = undefined;
          }
        }

        const newRoleForStudent = Object.entries(assignments).find(([_, id]) => id === s.id)?.[0];
        return {
          ...s,
          cadreRole: newRoleForStudent || currentRole,
        };
      });
    });
  };

  const batchImportStudents = (
    newRows: Array<{
      fullName: string;
      gender: 'Nam' | 'Nữ';
      group: 1 | 2 | 3 | 4;
      stt?: number;
      phone?: string;
      parentName?: string;
    }>
  ) => {
    const startStt = students.length + 1;
    const groupCounts: Record<number, number> = {
      1: students.filter((s) => s.seat.group === 1).length,
      2: students.filter((s) => s.seat.group === 2).length,
      3: students.filter((s) => s.seat.group === 3).length,
      4: students.filter((s) => s.seat.group === 4).length,
    };

    const added: Student[] = newRows.map((row, idx) => {
      const stt = row.stt || startStt + idx;
      const username = `hs.${row.fullName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8)}${stt}`;

      const targetGroup = (row.group >= 1 && row.group <= 4 ? row.group : ((idx % 4) + 1)) as 1 | 2 | 3 | 4;
      const countInGroup = groupCounts[targetGroup]++;
      const tableIndex = Math.floor(countInGroup / 2);
      const position = (countInGroup % 2 === 0 ? 'left' : 'right') as 'left' | 'right';

      return {
        id: `st-import-${Date.now()}-${idx}`,
        stt,
        fullName: row.fullName,
        birthYear: 2015,
        gender: row.gender,
        parentName: row.parentName || `Phụ huynh em ${row.fullName}`,
        phone: row.phone || '0900000000',
        username,
        password: 'hs123@password',
        seat: {
          group: targetGroup,
          tableIndex,
          position,
        },
        stars: 10,
        demerits: 0,
        attendance: {},
        behaviorLogs: [],
        boardingHealth: {
          lunchStatus: 'tốt',
          napStatus: 'ngủ ngon',
          temperature: 36.5,
          medicineSchedule: [],
        },
        tt27Evaluation: {
          academicLevel: 'H',
          competencies: { selfLearning: 'H', collaboration: 'H', problemSolving: 'H' },
          qualities: { patriotism: 'T', kindness: 'T', diligence: 'H', honesty: 'T', responsibility: 'H' },
          subjectResults: { Toán: 'H', 'Tiếng Việt': 'H' },
        },
      };
    });

    setStudents((prev) => [...prev, ...added]);
    return added.length;
  };

  const recordCallWinner = (studentId: string, stars: number) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    if (stars > 0) {
      addBehaviorLog(studentId, {
        type: 'praise',
        category: 'Vòng quay may mắn / Phát biểu xuất sắc',
        note: `Nhận +${stars} Sao thi đua khi được gọi tên lên bảng`,
        points: stars,
      });
    }

    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, calledCount: (s.calledCount || 0) + 1 } : s))
    );

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newRecord: LuckyWheelCallRecord = {
      id: `lw-${Date.now()}`,
      studentId,
      studentName: student.fullName,
      group: student.seat.group,
      starsAwarded: stars,
      timestamp: timeStr,
    };

    setLuckyWheelHistory((prev) => [newRecord, ...prev.slice(0, 49)]);
  };

  // TT27 Evaluation
  const updateTT27Evaluation = (studentId: string, evaluation: Partial<TT27Evaluation>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          tt27Evaluation: {
            ...s.tt27Evaluation,
            ...evaluation,
            updatedAt: new Date().toISOString(),
          },
        };
      })
    );
  };

  // Boarding & Health
  const updateBoardingHealth = (studentId: string, health: Partial<Student['boardingHealth']>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          boardingHealth: {
            ...s.boardingHealth,
            ...health,
          },
        };
      })
    );
  };

  const toggleMedicineTaken = (studentId: string, medicineId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          boardingHealth: {
            ...s.boardingHealth,
            medicineSchedule: s.boardingHealth.medicineSchedule.map((m) =>
              m.id === medicineId ? { ...m, taken: !m.taken } : m
            ),
          },
        };
      })
    );
  };

  const addMedicineReminder = (
    studentId: string,
    item: { time: string; medicineName: string; dosage: string; parentNote: string }
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const newMed = {
          id: `med-${Date.now()}`,
          ...item,
          taken: false,
        };
        return {
          ...s,
          boardingHealth: {
            ...s.boardingHealth,
            medicineSchedule: [...s.boardingHealth.medicineSchedule, newMed],
          },
        };
      })
    );
  };

  // Classroom Materials
  const addMaterial = (material: Omit<ClassroomMaterial, 'id' | 'createdAt'>) => {
    const newMat: ClassroomMaterial = {
      id: `mat-${Date.now()}`,
      createdAt: activeDate,
      ...material,
    };
    setMaterials((prev) => [newMat, ...prev]);
  };

  const deleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  // Plans & Documents Management
  const addPlan = (plan: Omit<PlanDocument, 'id' | 'createdAt'>) => {
    const newPlan: PlanDocument = {
      id: `plan-${Date.now()}`,
      createdAt: activeDate,
      ...plan,
    };
    setPlans((prev) => [newPlan, ...prev]);
  };

  const deletePlan = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  // Bilingual Lessons & Interactive Pronunciation Practice
  const addBilingualLesson = (lesson: Omit<BilingualLesson, 'id'>) => {
    const newLesson: BilingualLesson = {
      id: `bl-${Date.now()}`,
      ...lesson,
    };
    setBilingualLessons((prev) => [newLesson, ...prev]);
  };

  const updateBilingualLesson = (updatedLesson: BilingualLesson) => {
    setBilingualLessons((prev) =>
      prev.map((l) => (l.id === updatedLesson.id ? updatedLesson : l))
    );
  };

  const deleteBilingualLesson = (id: string) => {
    setBilingualLessons((prev) => prev.filter((l) => l.id !== id));
  };

  const recordPronunciationPractice = (
    targetPhrase: string,
    spokenText: string,
    score: number,
    stars: 1 | 2 | 3,
    studentName?: string
  ) => {
    setBilingualProgress((prev) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newEntry = {
        id: `pr-${Date.now()}`,
        studentName: studentName || (currentUser?.role === 'student' ? currentUser.fullName : 'Học sinh lớp'),
        phrase: targetPhrase,
        score,
        stars,
        timestamp: timeStr,
      };
      return {
        practiceCount: prev.practiceCount + 1,
        totalStarsEarned: prev.totalStarsEarned + stars,
        history: [newEntry, ...prev.history.slice(0, 49)],
      };
    });
  };

  const toggleBilingualEnabled = (enabled?: boolean) => {
    setBilingualEnabled((prev) => (enabled !== undefined ? enabled : !prev));
  };

  const addCustomBilingualSentence = (subject: string, vi: string, en: string) => {
    setBilingualLessons((prev) =>
      prev.map((l) => {
        if (l.subject === subject) {
          return {
            ...l,
            bilingualPhrases: [...l.bilingualPhrases, { vi, en }],
          };
        }
        return l;
      })
    );
  };

  // EWS Alerts
  const resolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
    );
  };

  const addAlert = (alert: Omit<EarlyWarningAlert, 'id' | 'date'>) => {
    const newAlert: EarlyWarningAlert = {
      id: `alert-${Date.now()}`,
      date: activeDate,
      ...alert,
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  // Chatbot
  const addChatMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      timestamp: timeStr,
      ...msg,
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  // Google Sheet Config & Sync
  const updateGoogleSheetConfig = (config: Partial<GoogleSheetConfig>) => {
    setGoogleSheetConfig((prev) => ({
      ...prev,
      ...config,
      lastSyncedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }));
  };

  // Import / Export according to TT|HỌ VÀ TÊN|NĂM SINH|HỌ VÀ TÊN CHA(MẸ)|SỐ ĐIỆN THOẠI|TÊN ĐĂNG NHẬP|MẬT KHẨU|
  // Supports Pipe (|), Tab (\t), and Comma (,) from Google Sheets
  const importStudentsFromPsv = (text: string) => {
    try {
      const lines = text.trim().split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        return { success: false, count: 0, error: 'Dữ liệu bảng tính trống' };
      }

      const parsed: Student[] = [];
      let sttCounter = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip header if present
        if (
          line.toLowerCase().includes('họ và tên') ||
          line.toLowerCase().includes('tên đăng nhập') ||
          line.toLowerCase().includes('năm sinh') ||
          line.toLowerCase().includes('full name')
        ) {
          continue;
        }

        // Split by pipe '|', tab '\t', or comma ',' (respecting quotes)
        let parts: string[] = [];
        if (line.includes('|')) {
          parts = line.split('|').map((p) => p.trim());
        } else if (line.includes('\t')) {
          parts = line.split('\t').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        } else {
          // CSV parser
          parts = line
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((p) => p.trim().replace(/^["']|["']$/g, ''));
        }

        // Filter out trailing empty strings from delimiters like trailing |
        if (parts.length > 0 && parts[parts.length - 1] === '') {
          parts.pop();
        }

        if (parts.length >= 2) {
          // Format: TT | HỌ VÀ TÊN | NĂM SINH | HỌ VÀ TÊN CHA(MẸ) | SỐ ĐIỆN THOẠI | TÊN ĐĂNG NHẬP | MẬT KHẨU
          let stt = parseInt(parts[0], 10);
          let fullName = '';
          let birthYear = 2015;
          let parentName = 'Phụ huynh';
          let phone = '0900000000';
          let username = '';
          let password = '';

          if (isNaN(stt)) {
            // No STT column, parts[0] is fullName
            stt = sttCounter;
            fullName = parts[0] || `Học sinh ${stt}`;
            birthYear = parseInt(parts[1], 10) || 2015;
            parentName = parts[2] || 'Phụ huynh';
            phone = parts[3] || '0900000000';
            username = parts[4] || `hs.${stt}`;
            password = parts[5] || '123456';
          } else {
            fullName = parts[1] || `Học sinh ${stt}`;
            birthYear = parseInt(parts[2], 10) || 2015;
            parentName = parts[3] || 'Phụ huynh';
            phone = parts[4] || '0900000000';
            username = parts[5] || `hs.${stt}`;
            password = parts[6] || '123456';
          }

          // Distribute into 3 groups automatically
          const group = (((sttCounter - 1) % 3) + 1) as 1 | 2 | 3;
          const tableIndex = Math.floor((sttCounter - 1) / 6);
          const position = (sttCounter % 2 === 1 ? 'left' : 'right') as 'left' | 'right';

          parsed.push({
            id: `hs-imported-${sttCounter}`,
            stt: stt || sttCounter,
            fullName,
            birthYear,
            gender:
              fullName.toLowerCase().includes('thị') ||
              fullName.toLowerCase().includes('mai') ||
              fullName.toLowerCase().includes('ngọc') ||
              fullName.toLowerCase().includes('an') ||
              fullName.toLowerCase().includes('vy')
                ? 'Nữ'
                : 'Nam',
            parentName,
            phone,
            username: username || `hs.${sttCounter}`,
            password: password || '123456',
            seat: { group, tableIndex: Math.min(tableIndex, 4), position },
            stars: 10,
            demerits: 0,
            attendance: { [activeDate]: 'present' },
            behaviorLogs: [],
            boardingHealth: {
              lunchStatus: 'tốt',
              napStatus: 'ngủ ngon',
              temperature: 36.5,
              medicineSchedule: [],
            },
            tt27Evaluation: {
              academicLevel: 'H',
              competencies: { selfLearning: 'H', collaboration: 'H', problemSolving: 'H' },
              qualities: { patriotism: 'T', kindness: 'T', diligence: 'H', honesty: 'T', responsibility: 'H' },
              subjectResults: { Toán: 'H', 'Tiếng Việt': 'H', 'Khoa học': 'H', 'Tiếng Anh': 'H' },
              aiComment: `Em ${fullName} chăm ngoan, hòa đồng với bạn bè và hoàn thành tốt nhiệm vụ học tập.`,
            },
          });
          sttCounter++;
        }
      }

      if (parsed.length > 0) {
        setStudents(parsed);
        return { success: true, count: parsed.length };
      } else {
        return {
          success: false,
          count: 0,
          error:
            'Không tìm thấy dòng học sinh hợp lệ. Định dạng chuẩn: TT|HỌ VÀ TÊN|NĂM SINH|HỌ VÀ TÊN CHA(MẸ)|SỐ ĐIỆN THOẠI|TÊN ĐĂNG NHẬP|MẬT KHẨU|',
        };
      }
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  };

  // Live Sync from Google Sheet via CSV endpoint
  const syncStudentsFromGoogleSheet = async (
    overrideUrl?: string
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    const targetUrl = overrideUrl || googleSheetConfig.sheetUrl;
    if (!targetUrl || !targetUrl.trim()) {
      return { success: false, count: 0, error: 'Chưa có đường dẫn Google Sheet' };
    }

    try {
      let csvUrl = targetUrl.trim();
      const sheetMatch = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetMatch && sheetMatch[1]) {
        const sheetId = sheetMatch[1];
        // Google Sheet CSV export endpoint
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
      }

      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(
          `Không thể tải dữ liệu từ Google Sheet (Mã lỗi ${response.status}). Vui lòng đảm bảo bảng tính đã được bật quyền: 'Bất kỳ ai có đường liên kết đều có thể xem'.`
        );
      }

      const rawCsv = await response.text();
      const parseResult = importStudentsFromPsv(rawCsv);
      if (parseResult.success) {
        const nowStr =
          new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
          ' ' +
          new Date().toLocaleDateString('vi-VN');
        updateGoogleSheetConfig({
          lastSyncedAt: nowStr,
        });
      }
      return parseResult;
    } catch (e: any) {
      return {
        success: false,
        count: 0,
        error:
          e?.message ||
          'Lỗi kết nối tới Google Sheet. Hãy kiểm tra kết nối mạng và quyền chia sẻ của bảng tính.',
      };
    }
  };

  const exportStudentsToPsv = (): string => {
    const header = 'TT|HỌ VÀ TÊN|NĂM SINH|HỌ VÀ TÊN CHA(MẸ)|SỐ ĐIỆN THOẠI|TÊN ĐĂNG NHẬP|MẬT KHẨU|';
    const rows = students.map(
      (s) => `${s.stt}|${s.fullName}|${s.birthYear}|${s.parentName}|${s.phone}|${s.username}|${s.password}|`
    );
    return [header, ...rows].join('\n');
  };

  // Weekly digest helper
  const generateWeeklyDigest = () => {
    const sortedByStars = [...students].sort((a, b) => b.stars - a.stars);
    const topPraised = sortedByStars.slice(0, 5);
    const sortedByDemerits = [...students].filter((s) => s.demerits > 0).sort((a, b) => b.demerits - a.demerits);

    const totalAbsent = students.filter(
      (s) => s.attendance[activeDate] === 'unexcused' || s.attendance[activeDate] === 'excused'
    ).length;
    const totalLate = students.filter((s) => s.attendance[activeDate] === 'late').length;

    return {
      topPraised,
      frequentIssues: sortedByDemerits,
      totalStudents: students.length,
      presentRate: Math.round(((students.length - totalAbsent) / (students.length || 1)) * 100),
      totalAbsent,
      totalLate,
      alertsCount: alerts.filter((a) => !a.resolved).length,
    };
  };

  // Morning absentee alert trigger (7:30 AM)
  const triggerMorningAbsenteeNotification = () => {
    const absentees = students.filter(
      (s) => s.attendance[activeDate] === 'unexcused' || s.attendance[activeDate] === 'late'
    );
    return {
      count: absentees.length,
      students: absentees,
    };
  };

  const role: Role = currentUser ? currentUser.role : 'guest';
  const isTeacherAuthenticated = currentUser !== null && currentUser.role === 'teacher';

  return (
    <AppContext.Provider
      value={{
        currentUser,
        role,
        isTeacherAuthenticated,
        students,
        materials,
        plans,
        bilingualLessons,
        bilingualProgress,
        bilingualEnabled,
        alerts,
        chatMessages,
        googleSheetConfig,
        activeDate,
        saveStatus,
        lastSavedTime,
        customClassPrompt,
        setCustomClassPrompt,
        triggerManualSave,
        resetClassDataToDefault,
        updateTeacherProfile,
        syncWithCloud,
        exportCloudBackup,
        restoreCloudBackup,
        isUsingDefaultPassword,
        changeTeacherPassword,
        resetTeacherPasswordToDefault,
        loginAsTeacherWithClass,
        loginAsTeacher,
        loginAsStudent,
        loginWithCredentials,
        logout,
        updateAttendance,
        addBehaviorLog,
        updateSeatPosition,
        swapSeats,
        updateStudent,
        addStudent,
        moveStudentToGroup,
        autoBalanceGroups,
        updateStudentCadres,
        batchImportStudents,
        luckyWheelHistory,
        recordCallWinner,
        updateTT27Evaluation,
        updateBoardingHealth,
        toggleMedicineTaken,
        addMedicineReminder,
        addMaterial,
        deleteMaterial,
        addPlan,
        deletePlan,
        addBilingualLesson,
        updateBilingualLesson,
        deleteBilingualLesson,
        bilingualTtsSettings,
        updateBilingualTtsSettings,
        recordPronunciationPractice,
        toggleBilingualEnabled,
        addCustomBilingualSentence,
        resolveAlert,
        addAlert,
        addChatMessage,
        updateGoogleSheetConfig,
        importStudentsFromPsv,
        exportStudentsToPsv,
        syncStudentsFromGoogleSheet,
        generateWeeklyDigest,
        triggerMorningAbsenteeNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
