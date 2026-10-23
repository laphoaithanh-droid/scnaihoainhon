export type Role = 'teacher' | 'student' | 'guest';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  role: Role;
  fullName: string;
  phone?: string;
  schoolName?: string;
  className: string;
  schoolYear?: string;
  studentId?: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'synced' | 'offline' | 'error';

export interface TeacherAuthRecord {
  username: string;
  passwordHash: string;
  isDefaultPassword: boolean;
  updatedAt: string;
}

export interface PronunciationResult {
  targetText: string;
  spokenText: string;
  score: number; // 0 - 100
  stars: 1 | 2 | 3;
  feedback: string;
  wordsAnalysis: Array<{
    word: string;
    isCorrect: boolean;
  }>;
}

export interface BilingualProgress {
  practiceCount: number;
  totalStarsEarned: number;
  history: Array<{
    id: string;
    studentName?: string;
    phrase: string;
    score: number;
    stars: 1 | 2 | 3;
    timestamp: string;
  }>;
}

export interface ClassDataSandbox {
  username: string; // e.g. "lop3c1_2026"
  className: string; // e.g. "Lớp 3C1"
  schoolYear: string; // e.g. "2026"
  teacherName: string;
  schoolName: string;
  customClassPrompt: string;
  students: Student[];
  materials: ClassroomMaterial[];
  plans: PlanDocument[];
  alerts: EarlyWarningAlert[];
  googleSheetConfig: GoogleSheetConfig;
  bilingualProgress?: BilingualProgress;
  bilingualLessons?: BilingualLesson[];
  bilingualEnabled?: boolean;
  bilingualTtsSettings?: {
    rate: number;
    defaultMode: 'both' | 'en' | 'vi';
    autoHighlight: boolean;
  };
  luckyWheelHistory?: LuckyWheelCallRecord[];
  version?: number;
  deviceInfo?: string;
  lastSavedAt: string;
}

export interface Student {
  id: string;
  stt: number;
  fullName: string;
  birthYear: number;
  gender: 'Nam' | 'Nữ';
  parentName: string;
  phone: string;
  username: string;
  password: string;
  // Sơ đồ lớp động 4 tổ
  seat: {
    group: 1 | 2 | 3 | 4;
    tableIndex: number; // 0 to 4
    position: 'left' | 'right';
  };
  cadreRole?: string; // 'Lớp trưởng', 'Lớp phó học tập', 'Lớp phó lao động', 'Tổ trưởng tổ 1', v.v.
  stars: number; // Điểm thi đua cộng
  demerits: number; // Điểm trừ vi phạm
  // Điểm danh theo ngày YYYY-MM-DD: 'present' (Có mặt), 'excused' (Có phép), 'unexcused' (Không phép), 'late' (Đi muộn)
  attendance: Record<string, 'present' | 'excused' | 'unexcused' | 'late'>;
  behaviorLogs: BehaviorLogEntry[];
  boardingHealth: {
    lunchStatus: 'tốt' | 'bình thường' | 'kém' | 'không ăn';
    napStatus: 'ngủ ngon' | 'khó ngủ' | 'trằn trọc';
    temperature?: number;
    medicineSchedule: MedicineItem[];
  };
  tt27Evaluation: TT27Evaluation;
  specialSupportPlan?: SpecialSupportPlan;
  teacherNotes?: string;
  competencyLevels?: {
    math: 1 | 2 | 3 | 4;
    vietnamese: 1 | 2 | 3 | 4;
    science?: 1 | 2 | 3 | 4;
    informatics?: 1 | 2 | 3 | 4;
  };
  aiQuestionsLog?: Array<{
    id: string;
    subject: string;
    question: string;
    time: string;
  }>;
  bilingualSpeakingStats?: {
    stars: number;
    avgScore: number;
    practicesCount: number;
  };
  calledCount?: number;
}

export interface LuckyWheelCallRecord {
  id: string;
  studentId: string;
  studentName: string;
  group: number;
  starsAwarded: number;
  timestamp: string;
}

export interface MedicineItem {
  id: string;
  time: string; // e.g. "11:30"
  medicineName: string;
  dosage: string;
  parentNote: string;
  taken: boolean;
}

export interface BehaviorLogEntry {
  id: string;
  date: string;
  time: string;
  type: 'praise' | 'warning';
  category: string;
  note: string;
  points: number; // +1, +2, -1, -2
}

export interface TT27Evaluation {
  academicLevel: 'T' | 'H' | 'C'; // Hoàn thành tốt, Hoàn thành, Cần cố gắng
  competencies: {
    selfLearning: 'T' | 'H' | 'C'; // Tự chủ và tự học
    collaboration: 'T' | 'H' | 'C'; // Giao tiếp và hợp tác
    problemSolving: 'T' | 'H' | 'C'; // Giải quyết vấn đề và sáng tạo
  };
  qualities: {
    patriotism: 'T' | 'H' | 'C'; // Yêu nước
    kindness: 'T' | 'H' | 'C'; // Nhân ái
    diligence: 'T' | 'H' | 'C'; // Chăm chỉ
    honesty: 'T' | 'H' | 'C'; // Trung thực
    responsibility: 'T' | 'H' | 'C'; // Trách nhiệm
  };
  subjectResults: Record<string, 'T' | 'H' | 'C'>;
  aiComment?: string;
  teacherFinalComment?: string;
  updatedAt?: string;
}

export interface SpecialSupportPlan {
  needed: boolean;
  reason: string;
  triggers: string[];
  actions: string[];
  progress: 'chưa cải thiện' | 'đang tiến bộ' | 'đã đạt mục tiêu';
  notes: string;
}

export interface ClassroomMaterial {
  id: string;
  title: string;
  subject: string;
  type: 'doc' | 'pdf' | 'pptx' | 'link' | 'xlsx' | 'image';
  content: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string; // base64 or raw text if uploaded from computer
  externalUrl?: string; // link to Google Drive, Google Sheet, Database
  sourceType?: 'local_file' | 'database_link' | 'text';
  createdAt: string;
}

export interface PlanDocument {
  id: string;
  title: string;
  category: 'Kế hoạch tuần' | 'Kế hoạch tháng' | 'Chuyên môn' | 'Nề nếp & Đội' | 'Văn bản chỉ đạo' | 'Khác';
  description: string;
  type: 'doc' | 'pdf' | 'pptx' | 'xlsx' | 'link';
  sourceType: 'local_file' | 'database_link' | 'text';
  fileName?: string;
  fileSize?: string;
  fileData?: string;
  externalUrl?: string;
  createdAt: string;
}

export interface BilingualLesson {
  id: string;
  subject: string;
  grade: number;
  bookSeries: 'Kết Nối Tri Thức Với Cuộc Sống';
  unit: string;
  titleVi: string;
  titleEn: string;
  contentVi: string;
  contentEn: string;
  audioScript: string;
  keyVocabulary: Array<{
    word: string;
    phonetic: string;
    vietnamese: string;
    example: string;
  }>;
  bilingualPhrases: Array<{
    vi: string;
    en: string;
  }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  subjectTag?: string;
}

export interface EarlyWarningAlert {
  id: string;
  studentId: string;
  studentName: string;
  type: 'attendance' | 'academic' | 'psychology' | 'health';
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  suggestedAction: string;
  draftMessageToParent?: string;
  resolved: boolean;
  date: string;
}

export interface GoogleSheetConfig {
  sheetUrl: string;
  sheetId: string;
  apiKey?: string;
  syncIntervalMinutes: number;
  lastSyncedAt?: string;
  autoSync: boolean;
}
