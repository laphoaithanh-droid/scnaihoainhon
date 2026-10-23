/**
 * Gemini AI Service with Automatic Fallback & Offline Smart Mode
 * Supports:
 * 1. Zero API Key mode: Instant high-quality pedagogical templates (No API key needed!)
 * 2. Live Gemini API mode: When user configures their API key in Settings,
 *    it calls Google Gemini REST API with automatic model fallback & retry:
 *    gemini-3.8-flash (Default) -> gemini-3-flash-preview -> gemini-3-pro-preview
 */

export const GEMINI_MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Mặc định • Khuyên dùng',
    description: 'Thế hệ mới nhất, tốc độ cực nhanh, xử lý tốt nhận xét TT27, kịch bản lớp và chatbot.',
    isDefault: true,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    badge: 'Tốc độ cao',
    description: 'Bản xem trước tốc độ cao, hỗ trợ dự phòng linh hoạt.',
    isDefault: false,
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    badge: 'Mạnh mẽ nhất',
    description: 'Suy luận chiều sâu, biên soạn giáo án và giải quyết các bài toán sư phạm phức tạp.',
    isDefault: false,
  },
] as const;

export type GeminiModelId = typeof GEMINI_MODELS[number]['id'];

export const STORAGE_KEYS = {
  API_KEY: 'sochuniem_gemini_api_key',
  SELECTED_MODEL: 'sochuniem_gemini_model',
};

export const getStoredApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  const localKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
  if (localKey && localKey.trim()) return localKey.trim();
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  return '';
};

export const setStoredApiKey = (key: string): void => {
  if (typeof window === 'undefined') return;
  if (key && key.trim()) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  }
};

export const getStoredModel = (): GeminiModelId => {
  if (typeof window === 'undefined') return 'gemini-3.8-flash';
  const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL) as any;
  if (saved === 'gemini-2.5-flash') {
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, 'gemini-3.8-flash');
    return 'gemini-3.8-flash';
  }
  if (saved && GEMINI_MODELS.some((m) => m.id === saved)) {
    return saved;
  }
  return 'gemini-3.8-flash';
};

export const setStoredModel = (model: GeminiModelId): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
};

export interface GeminiCallCallbacks {
  onModelFallback?: (info: { failedModel: string; nextModel: string; error: string }) => void;
}

export interface CallGeminiOptions extends GeminiCallCallbacks {
  systemInstruction?: string;
  jsonMode?: boolean;
  temperature?: number;
}

/**
 * Call Gemini API with automatic fallback through the model chain.
 */
export async function callGemini(
  prompt: string,
  options: CallGeminiOptions = {}
): Promise<{ text: string; usedModel: string }> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('Chưa có API key.');
  }

  const selectedModel = getStoredModel();
  const modelChain: GeminiModelId[] = [
    selectedModel,
    ...GEMINI_MODELS.map((m) => m.id).filter((id) => id !== selectedModel),
  ];

  let lastError: Error | null = null;
  let rawApiErrorString = '';

  for (let i = 0; i < modelChain.length; i++) {
    const currentModel = modelChain[i];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      const bodyPayload: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
        },
      };

      if (options.systemInstruction) {
        bodyPayload.systemInstruction = {
          parts: [{ text: options.systemInstruction }],
        };
      }

      if (options.jsonMode) {
        bodyPayload.generationConfig.responseMimeType = 'application/json';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.error) {
        const errCode = data?.error?.code || response.status;
        const errStatus = data?.error?.status || response.statusText || 'ERROR';
        const errMsg = data?.error?.message || response.statusText || 'Lỗi không xác định';
        const formattedErr = `${errCode} ${errStatus}: ${errMsg}`;
        rawApiErrorString = formattedErr;
        throw new Error(formattedErr);
      }

      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error('Model không trả về nội dung hợp lệ');
      }

      return {
        text: candidateText.trim(),
        usedModel: currentModel,
      };
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      console.warn(`[Gemini Fallback] Model ${currentModel} thất bại: ${errorMsg}`);

      if (i < modelChain.length - 1) {
        const nextModel = modelChain[i + 1];
        options.onModelFallback?.({
          failedModel: currentModel,
          nextModel,
          error: errorMsg,
        });
        continue;
      }
    }
  }

  throw new Error(rawApiErrorString || lastError?.message || 'Tất cả các model Gemini đều thất bại');
}

/**
 * Validates a Gemini API key with a fast ping.
 */
export async function validateApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  if (!key || !key.trim()) {
    return { valid: false, error: 'API key không được để trống' };
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(
      key.trim()
    )}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
      }),
    });
    const data = await response.json();
    if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { valid: true };
    }
    const errCode = data?.error?.code || response.status;
    const errStatus = data?.error?.status || 'LỖI';
    const errMsg = data?.error?.message || 'Không thể xác thực API Key';
    return { valid: false, error: `${errCode} ${errStatus}: ${errMsg}` };
  } catch (e: any) {
    return { valid: false, error: e?.message || 'Lỗi mạng khi kiểm tra API Key' };
  }
}

/**
 * 1. AI Nhận xét học sinh theo Thông tư 27 Bộ GD&ĐT
 * Hoạt động ngay cả khi chưa có API key với bộ mẫu sư phạm chuẩn hóa.
 */
export async function generateTT27Comment(
  params: {
    studentName: string;
    gender: string;
    level: string;
    academicStats?: string;
    behaviorLogs?: string;
    competencies?: any;
    qualities?: any;
  },
  callbacks?: GeminiCallCallbacks
): Promise<{ comment: string; usedModel: string }> {
  const { studentName, gender, level, academicStats, behaviorLogs, competencies, qualities } = params;

  // If user provided Gemini API Key, invoke Gemini AI with fallback
  if (getStoredApiKey()) {
    const prompt = `Bạn là một giáo viên chủ nhiệm mẫu mực, giàu tâm huyết tại Việt Nam, am hiểu sâu sắc Thông tư 27/2020/TT-BGDĐT của Bộ Giáo dục và Đào tạo.
Hãy viết một nhận xét học kỳ / tháng mang tính khích lệ sư phạm, chuẩn xác, nhân văn cho học sinh sau:
- Họ tên: ${studentName || 'Em'} (${gender || 'Học sinh'})
- Mức độ đánh giá chung: ${level === 'T' ? 'Hoàn thành tốt' : level === 'H' ? 'Hoàn thành' : 'Cần cố gắng'}
- Năng lực cốt lõi: Tự chủ và tự học (${competencies?.selfLearning || 'H'}), Giao tiếp và hợp tác (${competencies?.collaboration || 'H'}), Giải quyết vấn đề và sáng tạo (${competencies?.problemSolving || 'H'})
- Phẩm chất: Chăm chỉ (${qualities?.diligence || 'H'}), Trung thực (${qualities?.honesty || 'H'}), Trách nhiệm (${qualities?.responsibility || 'H'}), Nhân ái (${qualities?.kindness || 'H'})
- Tóm tắt nề nếp thi đua: ${behaviorLogs || 'Chấp hành tốt nội quy lớp học'}
- Điểm học tập: ${academicStats || 'Nắm vững kiến thức trọng tâm các môn học'}

Yêu cầu:
1. Độ dài khoảng 3-4 câu (80-120 từ), câu chữ trau chuốt, ấm áp, đúng tinh thần đổi mới của TT27 (không chê bai nặng nề, chỉ rõ ưu điểm và gợi ý hướng rèn luyện tiếp theo).
2. Viết bằng tiếng Việt chuẩn mực, chỉ trả về nội dung nhận xét, không thêm lời chào hay dẫn dắt thừa.`;

    const res = await callGemini(prompt, callbacks);
    return { comment: res.text, usedModel: res.usedModel };
  }

  // Offline Smart Mode: Instant personalized pedagogical comments
  const commentsByLevel: Record<string, string[]> = {
    T: [
      `Em ${studentName} chăm ngoan, tiếp thu bài nhanh và luôn chủ động trong các hoạt động học tập. Em có tinh thần tự giác cao, tích cực tương tác và hỗ trợ bạn bè trong các giờ thảo luận nhóm. Em tiếp tục phát huy sự tự tin khi trình bày ý kiến trước tập thể nhé!`,
      `Em ${studentName} có ý thức học tập rất tốt, luôn hoàn thành xuất sắc các bài học và bài tập trên lớp. Tích cực tham gia xây dựng bài, có kỹ năng giao tiếp và hợp tác tốt với bạn bè. Thầy cô rất khen ngợi tinh thần học tập gương mẫu của em!`,
      `Em ${studentName} thông minh, sáng tạo trong giải quyết vấn đề và chăm chỉ rèn luyện. Tích lũy nề nếp thi đua tốt, có trách nhiệm với nhiệm vụ được giao. Em hãy luôn giữ vững phong độ học tập xuất sắc này!`
    ],
    H: [
      `Em ${studentName} ngoan ngoãn, lễ phép, hoàn thành đầy đủ các nhiệm vụ học tập trên lớp và bài tập về nhà. Em có ý thức kỷ luật tốt, biết lắng nghe thầy cô và chan hòa với bạn bè. Cần tích cực giơ tay phát biểu xây dựng bài nhiều hơn để đạt kết quả cao hơn nữa.`,
      `Em ${studentName} chấp hành tốt nội quy lớp học, có tinh thần tương thân tương ái giúp đỡ bạn bè. Trong học tập em nắm vững kiến thức cơ bản, cần rèn thêm tính cẩn thận và chủ động hơn trong giờ tự học.`,
      `Em ${studentName} chăm chỉ, có tinh thần trách nhiệm trong các hoạt động tập thể của lớp. Em hoàn thành tốt các mục tiêu bài học, cần tự tin hơn khi trao đổi thảo luận nhóm.`
    ],
    C: [
      `Em ${studentName} có nhiều cố gắng trong học tập và rèn luyện nề nếp lớp. Em cần tập trung chú ý lắng nghe thầy cô giảng bài hơn và rèn luyện thêm kỹ năng tự học, chuẩn bị bài chu đáo ở nhà. Thầy cô và các bạn luôn đồng hành hỗ trợ em tiến bộ từng ngày.`,
      `Em ${studentName} ngoan ngoãn, có tiến bộ trong việc chấp hành giờ giấc và nề nếp. Tuy nhiên em cần nỗ lực nhiều hơn trong môn Toán và Tiếng Việt, thường xuyên ôn tập kiến thức cũ để theo kịp bài mới.`,
      `Em ${studentName} có tinh thần hòa đồng với bạn bè. Em cần rèn luyện tính kiên trì, tập trung làm bài tập và mạnh dạn nhờ thầy cô hướng dẫn những phần chưa hiểu.`
    ]
  };

  const list = commentsByLevel[level] || commentsByLevel.H;
  const hash = (studentName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selected = list[hash % list.length];

  return { comment: selected, usedModel: 'Mẫu chuẩn hóa TT27 (Sẵn sàng)' };
}

/**
 * 2. Kịch bản & Biên bản sinh hoạt lớp tự động
 */
export async function generateAssemblyScript(
  params: {
    weekNumber: number;
    topPraised: string;
    frequentIssues: string;
    attendanceSummary: string;
    upcomingEvents: string;
  },
  callbacks?: GeminiCallCallbacks
): Promise<{ content: string; usedModel: string }> {
  const { weekNumber, topPraised, frequentIssues, attendanceSummary, upcomingEvents } = params;

  if (getStoredApiKey()) {
    const prompt = `Đóng vai là giáo viên chủ nhiệm chuyên nghiệp. Hãy soạn thảo KỊCH BẢN ĐIỀU HÀNH TIẾT SINH HOẠT LỚP TUẦN ${weekNumber || 10} và BIÊN BẢN SINH HOẠT LỚP chuẩn mẫu sư phạm.
Dữ liệu tổng kết tuần:
- Chuyên cần: ${attendanceSummary || '100% đúng giờ, không có vắng không phép'}
- Tuyên dương (Top sao): ${topPraised || 'Các em tích cực phát biểu và giữ gìn vệ sinh'}
- Tồn tại cần chấn chỉnh: ${frequentIssues || 'Một số bạn còn quên sách bài tập, nói chuyện riêng'}
- Kế hoạch tuần tới: ${upcomingEvents || 'Thi đua chào mừng Ngày Nhà Giáo Việt Nam 20-11, kiểm tra định kỳ'}

Yêu cầu xuất ra cấu trúc rõ ràng:
1. Phần 1: KỊCH BẢN ĐIỀU HÀNH TIẾT SINH HOẠT (Chi tiết 4 bước: Ổn định - Ban cán sự nhận xét - GVCN tổng kết biểu dương & chấn chỉnh - Phương hướng tuần tới)
2. Phần 2: BIÊN BẢN SINH HOẠT LỚP (Thời gian, thành phần, nội dung đánh giá thi đua, quyết nghị khen thưởng/nhắc nhở)`;

    const res = await callGemini(prompt, callbacks);
    return { content: res.text, usedModel: res.usedModel };
  }

  return {
    content: `KỊCH BẢN ĐIỀU HÀNH TIẾT SINH HOẠT LỚP TUẦN ${weekNumber || 10}
Chủ điểm: "Thi đua Hoa Điểm Mười - Tự hào tiếp bước"

I. TIẾN TRÌNH ĐIỀU HÀNH TIẾT SINH HOẠT
1. Ổn định tổ chức & Khởi động (5 phút):
   - Lớp phó Văn thể bắt nhịp bài hát truyền thống.
   - Lớp trưởng báo cáo sĩ số: ${attendanceSummary || '100% chuyên cần đúng giờ'}.

2. Ban cán sự lớp tổng kết đánh giá tuần qua (10 phút):
   - Tổ trưởng tổ 1, 2, 3 lần lượt báo cáo điểm thi đua và vệ sinh khu vực lớp.
   - Lớp phó học tập đánh giá tình hình chuẩn bị bài, nộp vở bài tập và giờ tự học.
   - Lớp phó lao động nhận xét trực nhật và giữ gìn bàn ghế sạch đẹp.

3. Giáo viên chủ nhiệm phát biểu & tổng kết (15 phút):
   - Biểu dương khen thưởng: Tuyên dương ${topPraised || 'các học sinh có nhiều sao tích lũy và tiến bộ rõ rệt'}.
   - Chấn chỉnh tồn tại: Khắc phục triệt để ${frequentIssues || 'tình trạng quên đồ dùng học tập và đi sát giờ'}.

4. Phương hướng hoạt động tuần tới (10 phút):
   - Triển khai kế hoạch: ${upcomingEvents || 'Đẩy mạnh phong trào hoa điểm mười chào mừng ngày 20-11 và ôn tập định kỳ'}.
   - Phát động tuần thi đua giữ vững danh hiệu Lớp Xuất Sắc.

--------------------------------------------------
II. BIÊN BẢN SINH HOẠT LỚP TUẦN ${weekNumber || 10}
- Thời gian: Tiết 5, Thứ Sáu
- Địa điểm: Phòng học Lớp 4A1, Trường Tiểu học Hoài Nhơn
- Thành phần: Giáo viên chủ nhiệm Lê Hoàng Thanh cùng toàn thể 18 học sinh
- Chủ tọa: Giáo viên chủ nhiệm & Lớp trưởng
- Thư ký: Lớp phó học tập
- Nội dung: Đánh giá toàn diện nề nếp thi đua tuần và quyết nghị kế hoạch tuần mới
- Quyết nghị: 100% học sinh biểu quyết đồng thuận thực hiện tốt nội quy tuần mới.`,
    usedModel: 'Mẫu kịch bản chuẩn (Sẵn sàng)',
  };
}

/**
 * 3. Trợ lý Giao tiếp & Tin nhắn Phụ huynh tự động
 */
export async function generateParentMessage(
  params: {
    parentName: string;
    studentName: string;
    stars: number;
    demerits: number;
    attendanceNote?: string;
    academicProgress?: string;
    urgentType?: string;
  },
  callbacks?: GeminiCallCallbacks
): Promise<{ message: string; usedModel: string }> {
  const { parentName, studentName, stars, demerits, attendanceNote, academicProgress, urgentType } = params;

  if (getStoredApiKey()) {
    const prompt = `Soạn tin nhắn gửi phụ huynh học sinh qua Zalo/SMS.
Thông tin:
- Phụ huynh: ${parentName}
- Học sinh: ${studentName}
- Tích lũy sao/khen thưởng: ${stars} sao
- Vi phạm/nhắc nhở: ${demerits} lần
- Điểm danh & chuyên cần: ${attendanceNote || 'Đi học đều đặn'}
- Tình hình học tập: ${academicProgress || 'Có nhiều tiến bộ'}
${urgentType ? `- Loại thông báo đặc biệt: ${urgentType}` : ''}

Yêu cầu:
- Văn phong trang trọng, thân tình, khéo léo, mang tính xây dựng và gắn kết phụ huynh với nhà trường.
- Cấu trúc: Kính gửi Phụ huynh em ${studentName} + Lời chào + Điểm sáng rèn luyện trong tuần + Vấn đề gia đình cần phối hợp nhắc nhở (nếu có) + Lời chúc cuối tuần.`;

    const res = await callGemini(prompt, callbacks);
    return { message: res.text, usedModel: res.usedModel };
  }

  const praise =
    stars > 0
      ? `Em tích lũy được ${stars} sao thi đua, tiếp thu bài nhanh và tích cực phát biểu xây dựng bài.`
      : `Em luôn đi học chuyên cần và chấp hành tốt nội quy lớp học.`;
  const note =
    demerits > 0
      ? `Tuy nhiên có ${demerits} buổi em còn chưa tập trung chú ý nghe giảng, kính nhờ gia đình phối hợp nhắc nhở thêm để em hoàn thiện hơn.`
      : `Em giữ vững nề nếp gương mẫu, hòa nhã với bạn bè.`;

  const msg = `Kính gửi Phụ huynh em ${studentName},

Thầy/Cô chủ nhiệm Lớp 4A1 xin thông tin tình hình rèn luyện tuần này của em:
- Chuyên cần: ${attendanceNote || 'Đi học đều đặn, đúng giờ'}.
- Điểm sáng rèn luyện: ${praise} (${academicProgress || 'Đạt kết quả học tập tốt'}).
- Phối hợp gia đình: ${note}

Kính chúc gia đình một kỳ nghỉ cuối tuần thật vui vẻ và ấm áp!
Trân trọng,
Giáo viên chủ nhiệm Lớp 4A1.`;

  return { message: msg, usedModel: 'Mẫu thông điệp Zalo (Sẵn sàng)' };
}

/**
 * 4. Trợ lý AI Giáo Dục Toàn Diện Cấp Tiểu Học (Bản Sắc Kép: Phụ Huynh & Học Sinh)
 */
export async function generateChatReply(
  params: {
    messages: Array<{ sender: 'user' | 'assistant'; text: string }>;
    classroomMaterials: any[];
    studentContext: { fullName: string; className: string };
    customClassPrompt?: string;
  },
  callbacks?: GeminiCallCallbacks
): Promise<{ reply: string; usedModel: string }> {
  const { messages, classroomMaterials, studentContext, customClassPrompt } = params;

  if (getStoredApiKey()) {
    const materialsContext =
      classroomMaterials && classroomMaterials.length > 0
        ? `HỌC LIỆU SỐ & NỘI QUY CỦA LỚP ĐƯỢC GIÁO VIÊN ĐĂNG TẢI:\n${classroomMaterials
            .map((m: any) => `- [${m.title}]: ${m.content}`)
            .join('\n')}`
        : 'Chưa có thêm tài liệu riêng của giáo viên. Sử dụng kiến thức chuẩn chương trình Bộ GD&ĐT.';

    const systemInstruction = `# VAI TRÒ VÀ BẢN SẮC KÉP (DUAL ROLE & PERSONA)
Bạn là "Trợ Lý Giáo Dục Toàn Diện Cấp Tiểu Học", hỗ trợ song song hai đối tượng:
1. ĐỐI VỚI HỌC SINH (Lớp 1 - 5): Người bạn gia sư vui nhộn, kiên nhẫn, gợi mở (xưng Thầy/Cô hoặc Bạn Ong Vàng/Robot). Dùng emoji, ngắn gọn, không giải hộ mà gợi ý từng bước nhỏ để bé tự tìm ra đáp án.
2. ĐỐI VỚI PHỤ HUYNH: Cố vấn phương pháp sư phạm tại nhà, hướng dẫn bố mẹ cách tương tác, đồng hành và truyền cảm hứng cho con một cách khoa học, không áp lực.

# CƠ CHẾ PHÂN BIỆT ĐỐI TƯỢNG (INTENT DETECTION)
- Nhận diện Phụ huynh: Xưng "tôi/mẹ/bố/chị", nhắc đến "con/bé", hỏi cách dạy ("Làm sao chỉ con...", "Giải thích giúp để giảng lại cho bé...").
  -> Áp dụng PARENT MODE: Nêu rõ bản chất sư phạm, bộ câu hỏi gợi mở để phụ huynh hỏi con, và mẹo thực hành tại nhà.
- Nhận diện Học sinh: Xưng "em/con", hỏi bài tập trực tiếp ("Bài này làm sao ạ?", "Cho em hỏi...").
  -> Áp dụng STUDENT MODE: Ngắn gọn, sinh động, dùng emoji, không giải hộ mà gợi ý từng bước nhỏ để bé tự tìm ra đáp án.

# HƯỚNG DẪN CHI TIẾT CÁC MÔN HỌC ĐẶC THÙ
1. TIN HỌC (Lớp 3 - 5):
- Học sinh: Giải thích thuật toán và tư duy logic bằng hoạt động đời sống (đánh răng, pha sữa). Hướng dẫn thao tác (chuột, phím, thư mục, Scratch) bằng câu đố trực quan. An toàn số (mật khẩu, link lạ).
- Phụ huynh: Hoạt động "Tin học không cần máy tính" (Unplugged Computer Science), quản lý thời gian sử dụng thiết bị (Screen Time) lành mạnh và kiểm soát nội dung an toàn.
2. CÔNG NGHỆ (Lớp 3 - 5):
- Học sinh: Đồ dùng gia đình (quạt, đèn bàn, tủ lạnh), an toàn điện, mô hình thủ công (gấp giấy, chong chóng, xe đồ chơi, trồng cây).
- Phụ huynh: Quan sát cấu tạo đồ vật trong nhà, an toàn kỹ thuật đơn giản, ý thức giữ gìn, tái chế đồ dùng.
3. LỊCH SỬ & ĐỊA LÝ (Lớp 4 - 5):
- Học sinh: Lịch sử kể như câu chuyện phiêu lưu hào hùng (Ngô Quyền cọc Bạch Đằng, Hai Bà Trưng, Bác Hồ). Địa lý như chuyến du lịch thám hiểm qua bản đồ (khí hậu, sông ngòi, đặc sản văn hóa).
- Phụ huynh: Vẽ sơ đồ tư duy (Mindmap), xem phim tài liệu hoạt hình, liên hệ khi du lịch.
4. STEM / STEAM:
- Học sinh: Bàn tay nặn bột, Thử - Sai - Sửa, làm dự án từ vật liệu tái chế (thuyền bóng bay, kính vạn hoa, núi lửa).
- Phụ huynh: Quy trình 5 bước thiết kế kỹ thuật (Vấn đề -> Ý tưởng -> Chế tạo mẫu -> Thử nghiệm -> Cải tiến), giúp con không sợ thất bại khi thí nghiệm chưa thành công.
5. CÁC MÔN CƠ BẢN:
- Toán: Tư duy trực quan (que tính, bánh kẹo), không giải tắt, KHÔNG dùng phương pháp cấp 2 (đặt ẩn x, y).
- Tiếng Việt: Dàn ý từng bước cho tập làm văn; mẹo thơ phân biệt chính tả; đặt câu theo mẫu.
- Tiếng Anh: Phiên âm vui nhộn, từ vựng theo ngữ cảnh ngắn và câu giao tiếp đơn giản.

# NGUYÊN TẮC AN TOÀN & ĐỊNH DẠNG:
- Ngôn từ chuẩn mực sư phạm, tích cực, không phán xét.
- Trình bày Markdown mạch lạc, nhiều khoảng trắng, sử dụng biểu tượng trực quan sinh động (⭐, 🤖, 💻, 🌿, 🚀, 💡).
Thông tin học sinh lớp học: ${studentContext?.fullName || 'Học sinh'} (${studentContext?.className || 'Lớp 4A1 • Trường Tiểu học Hoài Nhơn'}).

${customClassPrompt ? `\n# CHỈ DẪN SƯ PHẠM ĐẶC THÙ DO GIÁO VIÊN THIẾT LẬP CHO LỚP NÀY:\n"${customClassPrompt}"\nHãy luôn ghi nhớ và lồng ghép chỉ dẫn trên vào câu trả lời để hỗ trợ tốt nhất cho học sinh và phụ huynh của lớp.\n` : ''}

${materialsContext}`;

    const conversationHistory = (messages || [])
      .map((m) => `${m.sender === 'user' ? 'Người dùng' : 'Trợ lý AI'}: ${m.text}`)
      .join('\n');

    const prompt = `${conversationHistory}\n\nTrợ lý AI trả lời:`;

    const res = await callGemini(prompt, {
      ...callbacks,
      systemInstruction,
      temperature: 0.7,
    });

    return { reply: res.text, usedModel: res.usedModel };
  }

  // Offline Smart Chatbot Response with Dual Role Detection
  const lastUserMsg = (messages || [])[messages.length - 1]?.text?.toLowerCase() || '';

  // Intent Detection for Offline Mode
  const isParent =
    /mẹ|bố|ba|phụ huynh|chỉ con|giảng lại cho con|giảng cho bé|dạy con|cháu|con tôi|bé nhà|hướng dẫn con/.test(
      lastUserMsg
    );

  let reply = '';

  if (isParent) {
    // PARENT MODE
    if (lastUserMsg.includes('tin học') || lastUserMsg.includes('máy tính') || lastUserMsg.includes('màn hình')) {
      reply = `Chào Quý phụ huynh! 💻
Để hướng dẫn con học tốt môn Tin học mà không lo con bị phụ thuộc quá nhiều vào màn hình thiết bị, Thầy/Cô xin chia sẻ phương pháp:

💡 **1. Bản chất sư phạm:**
Học Tin học ở tiểu học không chỉ là ngồi trước máy tính, mà cốt lõi là rèn luyện "Tư duy tính toán" (Computational Thinking) và giải quyết vấn đề theo trình tự logic.

⭐ **2. Câu hỏi gợi mở bố mẹ nên hỏi con:**
- *"Hôm nay con học thao tác gì mới trên máy tính?"*
- *"Theo con, nếu chúng mình đổi thứ tự bước này thì máy tính có hiểu không nhỉ?"*

🌿 **3. Mẹo thực hành "Tin học không cần máy tính" (Unplugged CS) tại nhà:**
- Cùng con viết ra các bước của một công việc quen thuộc (như đánh răng hoặc dọn bàn học) thành các câu lệnh từng bước 1, 2, 3.
- Quy định rõ khung giờ Screen Time: 30 - 45 phút/ngày và luôn ngồi thẳng lưng, cách màn hình 50cm.`;
    } else if (lastUserMsg.includes('công nghệ') || lastUserMsg.includes('đồ dùng') || lastUserMsg.includes('điện')) {
      reply = `Chào Quý phụ huynh! 🔌
Đối với môn Công nghệ lớp 3-5, việc kết nối bài học với cuộc sống gia đình là cách hiệu quả nhất:

💡 **1. Bản chất sư phạm:**
Hình thành thói quen quan sát cấu tạo đồ vật, tuân thủ an toàn kỹ thuật và trân trọng sức lao động, đồ dùng sinh hoạt.

⭐ **2. Câu hỏi gợi mở:**
- *"Đố con chiếc quạt/đèn bàn này hoạt động nhờ nguồn năng lượng nào?"*
- *"Khi tay ướt, vì sao chúng ta tuyệt đối không được cắm phích điện hả con?"*

🌿 **3. Mẹo thực hành tại nhà:**
- Cho con tham gia quy trình "An toàn điện 3 Không": Không chạm tay ướt vào ổ điện - Không tự ý sửa chữa - Không kéo giật dây điện.
- Tận dụng vỏ hộp sữa, chai nhựa cùng con tái chế thành chậu cây nhỏ hoặc hộp đựng bút.`;
    } else if (lastUserMsg.includes('lịch sử') || lastUserMsg.includes('địa lý') || lastUserMsg.includes('sử')) {
      reply = `Chào Quý phụ huynh! 📜
Học Lịch sử & Địa lý sẽ trở nên vô cùng hào hứng nếu bố mẹ biến bài học thành câu chuyện kể và khám phá:

💡 **1. Bản chất sư phạm:**
Khơi gợi lòng tự hào dân tộc và tình yêu quê hương đất nước qua hình ảnh trực quan, thay vì bắt con học vẹt niên đại và số liệu khô khan.

⭐ **2. Gợi ý phương pháp đồng hành:**
- **Vẽ sơ đồ tư duy (Mindmap):** Cho con vẽ cây tri thức với các nhánh màu sắc: Ai? Ở đâu? Khi nào? Kết quả ra sao?
- **Học qua bản đồ trực quan:** Treo bản đồ Việt Nam ở góc học tập, mỗi khi nhắc đến một tỉnh/thành hay chiến dịch lịch sử, cùng con dùng ngón tay "thám hiểm" trên bản đồ.`;
    } else if (lastUserMsg.includes('stem') || lastUserMsg.includes('steam') || lastUserMsg.includes('thí nghiệm')) {
      reply = `Chào Quý phụ huynh! 🚀
Giáo dục STEM/STEAM tại nhà giúp nuôi dưỡng óc sáng tạo và tinh thần không ngại thất bại:

💡 **Quy trình 5 bước thiết kế kỹ thuật bố mẹ cùng làm với con:**
1. **Xác định vấn đề:** Ví dụ: *"Làm thế nào để đưa nước từ chậu lên cao?"*
2. **Lên ý tưởng & vẽ phác thảo:** Để con tự do vẽ bản vẽ ra giấy theo trí tưởng tượng của bé.
3. **Chế tạo mẫu:** Dùng vật liệu tái chế (ống hút, chai nhựa, dây chun, bìa carton).
4. **Thử nghiệm:** Cho mô hình hoạt động xem có vấn đề gì phát sinh.
5. **Cải tiến:** Nếu mô hình chưa chạy, động viên con: *"Không sao cả, đây là cơ hội để kỹ sư nhí tìm ra lỗi và sửa lại đấy!"*`;
    } else if (lastUserMsg.includes('toán')) {
      reply = `Chào Quý phụ huynh! 📐
Về môn Toán tiểu học, nguyên tắc quan trọng nhất là **Tư duy trực quan hình tượng**:

💡 **Lưu ý đặc biệt:**
- **Tuyệt đối không giải bài bằng phương pháp cấp 2** (như đặt ẩn số x, y hay chuyển vế đổi dấu), vì sẽ khiến con bị rối loạn phương pháp sư phạm ở trường.
- Hãy dùng **Sơ đồ đoạn thẳng**, hình vẽ que tính hoặc bánh kẹo trực quan để con nhìn thấy rõ mối quan hệ "Nhiều hơn - Ít hơn", "Gấp số lần" hay "Tổng - Tỉ, Hiệu - Tỉ".`;
    } else {
      reply = `Chào Quý phụ huynh! 🌟
Thầy/Cô Trợ lý Giáo dục Toàn diện luôn sẵn sàng đồng hành cùng bố mẹ. 

Bố mẹ có thể hỏi bất kỳ chủ đề nào:
- 💡 Phương pháp giảng bài cho con mà không tạo áp lực.
- 📐 Cách giải thích các bài toán bằng sơ đồ đoạn thẳng trực quan.
- 💻 Quản lý thói quen sử dụng máy tính, học Tin học & STEM an toàn.
- 📖 Khơi gợi hứng thú đọc sách và tập làm văn cho bé.

Bố mẹ hãy chia sẻ tình huống cụ thể của con để nhận tư vấn phù hợp nhất nhé!`;
    }
  } else {
    // STUDENT MODE
    if (lastUserMsg.includes('tin học') || lastUserMsg.includes('thuật toán') || lastUserMsg.includes('máy tính')) {
      reply = `Chào bạn nhỏ tinh anh! 🤖💻
Thầy/Cô Robot đây! Em có biết không:
Đánh răng buổi sáng hay pha một cốc sữa nóng chính là một **"Thuật toán"** đấy! 

⭐ **Em thử nghĩ xem nhé:**
Nếu chúng mình cho kem đánh răng vào bàn chải SAU KHI đã đánh răng xong thì chuyện gì sẽ xảy ra nhỉ?
👉 Đó chính là lý do vì sao máy tính và con người chúng mình luôn cần làm việc theo **từng bước đúng thứ tự**!
Em đang làm bài tập nào ở phần Tin học hay Scratch? Kể cho Thầy/Cô nghe, chúng mình cùng giải mã từng bước nhé! 🚀`;
    } else if (lastUserMsg.includes('công nghệ') || lastUserMsg.includes('quạt') || lastUserMsg.includes('đèn')) {
      reply = `Chào nhà sáng chế tí hon! 🌿⚙️
Môn Công nghệ cực kỳ thú vị luôn! 
Em có biết chiếc quạt điện nhà mình có những bộ phận chính nào không? 
👉 Cánh quạt, lồng quạt, động cơ và nút bấm điều khiển!

⚡ **Thử thách an toàn số 1 dành cho em:**
Khi tay em đang dính nước sau khi rửa tay, chúng mình có được tự ý cắm phích điện vào ổ cắm không? Vì sao nhỉ?
Em thử trả lời xem nào, rồi Thầy/Cô sẽ tặng em một ngôi sao may mắn nhé! ⭐`;
    } else if (lastUserMsg.includes('lịch sử') || lastUserMsg.includes('địa lý') || lastUserMsg.includes('bạch đằng')) {
      reply = `A, một nhà thám hiểm dũng cảm đã xuất hiện! 🗺️⛵
Em có muốn cùng Thầy/Cô quay ngược cỗ máy thời gian về năm 938 trên dòng sông Bạch Đằng không?

🌊 **Câu đố thám hiểm:**
Khi thủy triều dâng lên che khuất những chiếc cọc gỗ bịt sắt nhọn hoắt dưới lòng sông, Vua Ngô Quyền đã dùng kế gì để dụ thuyền giặc vào bẫy?
Em có nhớ vị anh hùng của chúng ta đã làm gì không nào? Gợi ý: Thuyền của quân ta giả vờ làm gì nhỉ? ⛵⚔️`;
    } else if (lastUserMsg.includes('stem') || lastUserMsg.includes('thí nghiệm') || lastUserMsg.includes('núi lửa')) {
      reply = `Xin chào kỹ sư nhí tài năng! 🚀🌋
Học STEM là để chúng mình cùng khám phá bí mật của thế giới tự nhiên đấy!

🔬 **Quy tắc vàng của nhà khoa học nhí:**
*"Thử - Sai - Sửa - Thành công!"*
Nếu một chiếc thuyền bóng bay hay một mô hình gấp giấy của em chưa chạy ngay lần đầu, đừng buồn nhé! Đó là lúc chúng mình được thử nghiệm thêm lần nữa!
Em đang muốn làm thí nghiệm gì? Hãy kể Thầy/Cô nghe vật liệu em đang có nào! 💡`;
    } else if (lastUserMsg.includes('toán') || lastUserMsg.includes('tính')) {
      reply = `Chào em! 📐⭐
Học Toán cùng Thầy/Cô không hề khó chút nào! Chúng mình cùng chia nhỏ bài toán ra nhé:
1. Đề bài đã cho em biết những con số nào rồi?
2. Đề bài đang hỏi em điều gì?

Em hãy gõ đề bài hoặc số liệu vào đây, Thầy/Cô sẽ hướng dẫn em vẽ sơ đồ đoạn thẳng để tìm ra đáp án thật dễ dàng nhé! 💡`;
    } else if (lastUserMsg.includes('tiếng việt') || lastUserMsg.includes('văn')) {
      reply = `Chào cây bút nhí đáng yêu! ✍️📖
Để viết được một đoạn văn thật hay và sinh động, em nhớ bí quyết **"3 người bạn nhỏ"** nhé:
- 👁️ Mắt nhìn: Đồ vật hay cảnh vật có màu sắc, hình dáng thế nào?
- 👂 Tai nghe: Có âm thanh gì vang lên không?
- ❤️ Cảm xúc: Em yêu quý và gắn bó với điều đó ra sao?

Em đang chuẩn bị viết bài văn về đề tài gì nào? Nói cho Thầy/Cô biết nhé! 🌸`;
    } else {
      reply = `Chào ${studentContext?.fullName || 'bạn nhỏ'}! 🐝⭐
Bạn Ong Vàng / Thầy Cô trợ lý lớp học luôn ở đây để đồng hành cùng em!

Hôm nay em muốn cùng Thầy/Cô khám phá điều gì:
- 📐 Giải mã câu đố Toán học vui?
- 💻 Lập trình Scratch và tư duy thuật toán Tin học?
- 🌿 Làm đồ chơi sáng tạo Công nghệ & STEM?
- 🗺️ Chuyến du lịch thám hiểm Lịch sử & Địa lý?

Hãy nói cho Thầy/Cô nghe bài học em đang quan tâm nhé! 🚀`;
    }
  }

  return { reply, usedModel: 'Trợ lý Giáo dục Toàn diện (Sẵn sàng)' };
}

/**
 * 5. Dịch & Thiết kế Học Liệu Song Ngữ (Bộ sách Kết Nối Tri Thức Với Cuộc Sống)
 */
export async function translateBilingualLesson(
  params: {
    subject: string;
    lessonTitle: string;
    vietnameseContent: string;
  },
  callbacks?: GeminiCallCallbacks
): Promise<any> {
  const { subject, lessonTitle, vietnameseContent } = params;

  if (getStoredApiKey()) {
    const prompt = `Bạn là chuyên gia sư phạm song ngữ chuẩn của bộ sách "Kết Nối Tri Thức Với Cuộc Sống".
Hãy chuyển ngữ và thiết kế học liệu song ngữ cho bài học sau:
- Môn học: ${subject}
- Tên bài: ${lessonTitle}
- Nội dung gốc tiếng Việt:
${vietnameseContent}

Hãy trả về kết quả dưới dạng JSON (không có markdown formatting, chỉ JSON thuần) có đúng cấu trúc sau:
{
  "englishTitle": "Tên bài học tiếng Anh",
  "englishContent": "Đoạn dịch tiếng Anh chuẩn sư phạm quốc tế, dễ đọc cho học sinh tiểu học / THCS",
  "keyVocabulary": [
    { "word": "Từ vựng tiếng Anh", "phonetic": "Phiên âm IPA", "vietnamese": "Nghĩa tiếng Việt", "example": "Câu ví dụ minh họa" }
  ],
  "bilingualPhrases": [
    { "vi": "Câu tiếng Việt", "en": "Câu tiếng Anh tương ứng" }
  ],
  "audioReadingScript": "Toàn bộ bài đọc tiếng Anh mạch lạc để học sinh bấm nghe luyện phát âm"
}`;

    const res = await callGemini(prompt, {
      ...callbacks,
      jsonMode: true,
    });

    try {
      const cleaned = res.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      // Fallback
    }
  }

  return {
    englishTitle: `${lessonTitle} (Bilingual Learning)`,
    englishContent: `Welcome to our bilingual lesson on ${subject}. In this lesson, we explore the core concepts connecting knowledge to life in both Vietnamese and English. Students practice reading, listening, and using scientific vocabulary effectively.`,
    keyVocabulary: [
      { word: "Knowledge", phonetic: "/ˈnɒl.ɪdʒ/", vietnamese: "Tri thức, kiến thức", example: "Connecting knowledge to daily life." },
      { word: "Practice", phonetic: "/ˈpræk.tɪs/", vietnamese: "Thực hành, rèn luyện", example: "Practice makes perfect in every lesson." },
      { word: "Discovery", phonetic: "/dɪˈskʌv.ər.i/", vietnamese: "Khám phá, phát hiện", example: "We make exciting discoveries in science." },
      { word: "Collaboration", phonetic: "/kəˌlæb.əˈreɪ.ʃən/", vietnamese: "Hợp tác, làm việc nhóm", example: "Students learn better through active collaboration." }
    ],
    bilingualPhrases: [
      { vi: vietnameseContent.slice(0, 100) || "Kết nối tri thức với cuộc sống", en: `Connecting knowledge to real-life applications in ${subject}.` },
      { vi: "Thực hành và vận dụng kiến thức vào thực tiễn", en: "Apply learned principles into daily practice and critical thinking." }
    ],
    audioReadingScript: `Welcome to our ${subject} bilingual lesson: ${lessonTitle}. Let's learn useful scientific vocabulary and explore key concepts together!`
  };
}

/**
 * 6. Tạo Phiếu Bài Tập Ôn Thi Riêng Theo Năng Lực Học Sinh
 */
export async function generateExamStudySheet(
  prompt: string,
  callbacks?: GeminiCallCallbacks
): Promise<string> {
  if (getStoredApiKey()) {
    try {
      const res = await callGemini(prompt, {
        ...callbacks,
        systemInstruction:
          'Bạn là chuyên gia sư phạm tiểu học biên soạn đề thi và phiếu bài tập theo Thông tư 27 Bộ GD&ĐT.',
      });
      if (res.text && res.text.trim()) {
        return res.text.trim();
      }
    } catch (e) {
      console.warn('Fallback generating exam study sheet:', e);
    }
  }

  return `PHIẾU ÔN TẬP CÁ NHÂN THEO NĂNG LỰC HỌC SINH (Bộ sách Kết Nối Tri Thức)
Thời gian làm bài: 20 phút

PHẦN 1: TOÁN HỌC (ÔN TẬP PHÉP TÍNH & HÌNH HỌC)
Câu 1: Đặt tính rồi tính:
   a) 214 x 16 = .............        b) 4896 : 12 = .............
Câu 2: Một thửa ruộng hình chữ nhật có chu vi là 120m, chiều rộng kém chiều dài 10m.
   a) Tính chiều dài và chiều rộng của thửa ruộng đó.
   b) Tính diện tích thửa ruộng.
   Bài giải: ................................................................

PHẦN 2: TIẾNG VIỆT (TỪ LOẠI & VIẾT ĐOẠN VĂN)
Câu 3: Gạch dưới tính từ trong câu sau:
   "Dòng sông quê hương hiền hòa uốn lượn quanh những rặng tre xanh ngắt."
Câu 4: Viết từ 2 đến 3 câu văn miêu tả sự chăm chỉ của em trong giờ học.
   Bài làm: ................................................................

LỜI KHUYÊN SƯ PHẠM TỪ CÔ GIÁO:
Con hãy đọc thật kỹ đề bài, tính nhẩm nháp cẩn thận và kiểm tra lại bài làm trước khi nộp nhé! Thầy/Cô tin con sẽ làm rất tốt! ⭐`;
}
