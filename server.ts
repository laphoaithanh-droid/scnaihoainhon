import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini AI setup
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Endpoint: Sinh nhận xét học sinh theo Thông tư 27 Bộ GD&ĐT
app.post('/api/gemini/comment', async (req: Request, res: Response) => {
  try {
    const { studentName, gender, level, academicStats, behaviorLogs, competencies, qualities } = req.body;

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
2. Viết bằng tiếng Việt chuẩn mực.`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      return res.json({ comment: response.text?.trim() });
    } else {
      // High quality fallback if API key is pending
      const fallbackComments: Record<string, string> = {
        T: `Em ${studentName} chăm ngoan, tiếp thu bài nhanh và luôn chủ động trong các hoạt động học tập. Có tinh thần tự học cao, tích cực giúp đỡ bạn bè trong các giờ thảo luận nhóm. Em phát huy tốt hơn nữa sự tự tin khi trình bày ý kiến trước tập thể nhé!`,
        H: `Em ${studentName} ngoan ngoãn, lễ phép, hoàn thành đầy đủ nhiệm vụ học tập trên lớp và bài tập về nhà. Em có ý thức kỷ luật tốt, biết lắng nghe thầy cô. Cần tích cực giơ tay phát biểu xây dựng bài nhiều hơn để đạt kết quả cao hơn nữa.`,
        C: `Em ${studentName} có nhiều cố gắng trong học tập và rèn luyện nề nếp. Tuy nhiên em cần tập trung chú ý lắng nghe giảng bài hơn trong giờ học và rèn luyện thêm kỹ năng tự học ở nhà. Thầy cô và các bạn luôn đồng hành hỗ trợ em tiến bộ từng ngày.`
      };
      return res.json({ comment: fallbackComments[level] || fallbackComments.H });
    }
  } catch (error: any) {
    console.error('Error generating comment:', error);
    res.status(500).json({ error: error.message || 'Không thể tạo nhận xét' });
  }
});

// 2. Endpoint: Kịch bản tiết sinh hoạt lớp & Biên bản sinh hoạt lớp tự động
app.post('/api/gemini/assembly-script', async (req: Request, res: Response) => {
  try {
    const { weekNumber, topPraised, frequentIssues, attendanceSummary, upcomingEvents } = req.body;

    const prompt = `Đóng vai là giáo viên chủ nhiệm chuyên nghiệp. Hãy soạn thảo KỊCH BẢN ĐIỀU HÀNH TIẾT SINH HOẠT LỚP TUẦN ${weekNumber || 10} và BIÊN BẢN SINH HOẠT LỚP chuẩn mẫu sư phạm.
Dữ liệu tổng kết tuần:
- Chuyên cần: ${attendanceSummary || '100% đúng giờ, không có vắng không phép'}
- Tuyên dương (Top sao): ${topPraised || 'Các em tích cực phát biểu và giữ gìn vệ sinh'}
- Tồn tại cần chấn chỉnh: ${frequentIssues || 'Một số bạn còn quên sách bài tập, nói chuyện riêng'}
- Kế hoạch tuần tới: ${upcomingEvents || 'Thi đua chào mừng Ngày Nhà Giáo Việt Nam 20-11, kiểm tra định kỳ'}

Yêu cầu xuất ra cấu trúc rõ ràng:
1. Phần 1: KỊCH BẢN ĐIỀU HÀNH TIẾT SINH HOẠT (Chi tiết 4 bước: Ổn định - Ban cán sự nhận xét - GVCN tổng kết biểu dương & chấn chỉnh - Phương hướng tuần tới)
2. Phần 2: BIÊN BẢN SINH HOẠT LỚP (Thời gian, thành phần, nội dung đánh giá thi đua, quyết nghị khen thưởng/nhắc nhở)`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      return res.json({ content: response.text?.trim() });
    } else {
      return res.json({
        content: `KỊCH BẢN ĐIỀU HÀNH TIẾT SINH HOẠT LỚP TUẦN ${weekNumber || 10}
I. TIẾN TRÌNH ĐIỀU HÀNH
1. Ổn định tổ chức (3 phút): Lớp phó văn thể bắt bài hát truyền thống. Lớp trưởng báo cáo sĩ số.
2. Ban cán sự lớp đánh giá tuần qua (12 phút):
   - Tổ trưởng các tổ báo cáo điểm thi đua và nề nếp.
   - Lớp phó học tập nhận xét việc chuẩn bị bài, làm bài tập về nhà.
   - Lớp phó lao động đánh giá vệ sinh lớp, trực nhật và xếp bàn ghế.
3. Giáo viên chủ nhiệm phát biểu (15 phút):
   - Tuyên dương khen thưởng: Khen ngợi ${topPraised || 'các học sinh có nhiều sao tích lũy và tiến bộ'}.
   - Nhắc nhở chấn chỉnh: Khắc phục triệt để ${frequentIssues || 'tình trạng quên đồ dùng học tập và đi muộn'}.
4. Phương hướng hoạt động tuần tới (10 phút):
   - Đẩy mạnh phong trào thi đua học tốt, hoa điểm mười.
   - Kế hoạch: ${upcomingEvents || 'Chuẩn bị phong trào thi đua Đội và kiểm tra định kỳ'}.

II. BIÊN BẢN SINH HOẠT LỚP
- Thời gian: Tiết 5, Thứ Sáu
- Địa điểm: Phòng học lớp chủ nhiệm
- Chủ trì: Giáo viên chủ nhiệm & Ban cán sự lớp
- Quyết nghị: 100% học sinh biểu quyết đồng thuận thực hiện tốt nội quy tuần mới.`
      });
    }
  } catch (error: any) {
    console.error('Error generating assembly script:', error);
    res.status(500).json({ error: error.message || 'Lỗi tạo kịch bản sinh hoạt' });
  }
});

// 3. Endpoint: Trợ lý Giao tiếp & Tin nhắn Phụ huynh tự động
app.post('/api/gemini/parent-message', async (req: Request, res: Response) => {
  try {
    const { parentName, studentName, stars, demerits, attendanceNote, academicProgress, urgentType } = req.body;

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

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      return res.json({ message: response.text?.trim() });
    } else {
      const msg = `Kính gửi phụ huynh em ${studentName},\n\nThầy/Cô chủ nhiệm xin thông tin tình hình rèn luyện tuần này của em: Em ${studentName} đi học chuyên cần, tích cực phát biểu xây dựng bài và nhận được ${stars} sao khen ngợi. ${demerits > 0 ? `Tuy nhiên có một vài buổi em còn chưa tập trung chú ý, kính nhờ gia đình nhắc nhở thêm để em hoàn thiện hơn.` : `Em luôn giữ vững nề nếp gương mẫu.`}\n\nChúc gia đình một kỳ nghỉ cuối tuần vui vẻ và ấm áp!`;
      return res.json({ message: msg });
    }
  } catch (error: any) {
    console.error('Error generating parent message:', error);
    res.status(500).json({ error: error.message || 'Lỗi tạo tin nhắn phụ huynh' });
  }
});

// 4. Endpoint: AI Chatbot Học tập & Lớp học (Tích hợp tài liệu lớp học)
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { messages, classroomMaterials, studentContext } = req.body;

    const materialsContext = classroomMaterials && classroomMaterials.length > 0
      ? `HỌC LIỆU SỐ & NỘI QUY CỦA LỚP ĐƯỢC GIÁO VIÊN ĐĂNG TẢI:\n${classroomMaterials.map((m: any) => `- [${m.title}]: ${m.content}`).join('\n')}`
      : 'Chưa có thêm tài liệu riêng của giáo viên. Sử dụng kiến thức chuẩn chương trình Bộ GD&ĐT.';

    const systemInstruction = `Bạn là Trợ lý AI Lớp Học Thông Minh (Trợ lý Dola Học Tập) của lớp học.
Bạn luôn thân thiện, lễ phép, nói chuyện vui tươi, truyền cảm hứng và động viên học sinh học tập tốt.
Thông tin học sinh đang trò chuyện: ${studentContext?.fullName || 'Học sinh'} (Lớp ${studentContext?.className || 'chủ nhiệm'}).
Quy tắc:
1. Giải đáp các câu hỏi bài học (Toán, Tiếng Việt, Khoa học, Lịch sử, Đạo đức, Kỹ năng sống...) một cách sư phạm, gợi mở tư duy chứ không chỉ đưa đáp án máy móc.
2. Hướng dẫn học sinh tra cứu nội quy, lịch thi đua, phân công trực nhật của lớp.
3. Dựa vào HỌC LIỆU SỐ nếu học sinh hỏi về tài liệu thầy cô đã gửi:
${materialsContext}
4. Giữ giọng văn tích cực, chuẩn mực đạo đức học đường Việt Nam.`;

    if (ai) {
      const history = (messages || []).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const lastMessage = history[history.length - 1]?.parts[0]?.text || 'Xin chào trợ lý lớp học!';
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nCâu hỏi của học sinh: ${lastMessage}` }] }
        ],
      });
      return res.json({ reply: response.text?.trim() });
    } else {
      const lastMsg = messages?.[messages.length - 1]?.text?.toLowerCase() || '';
      let reply = `Chào em! Thầy/Cô trợ lý ảo Dola luôn sẵn sàng giải đáp bài học và đồng hành cùng em nhé!`;
      if (lastMsg.includes('toán') || lastMsg.includes('bài tập')) {
        reply = `Về bài toán này, em hãy đọc kỹ đề bài, xác định các đại lượng đã biết và chưa biết. Nếu cần gợi ý từng bước, em gửi chi tiết phép tính để thầy cô trợ lý gợi mở cho em nhé!`;
      } else if (lastMsg.includes('trực nhật') || lastMsg.includes('nội quy')) {
        reply = `Nội quy lớp học luôn đề cao tính kỷ luật, tự giác và yêu thương giúp đỡ nhau. Hãy luôn nhớ đến lớp đúng 7h15 và hoàn thành nhiệm vụ trực nhật tổ nhé!`;
      }
      return res.json({ reply });
    }
  } catch (error: any) {
    console.error('Error in chatbot:', error);
    res.status(500).json({ error: error.message || 'Lỗi trợ lý chatbot' });
  }
});

// 5. Endpoint: Dịch & Giải nghĩa Song Ngữ (Bộ sách Kết Nối Tri Thức Với Cuộc Sống)
app.post('/api/gemini/translate-bilingual', async (req: Request, res: Response) => {
  try {
    const { subject, vietnameseContent, lessonTitle } = req.body;

    const prompt = `Bạn là chuyên gia sư phạm song ngữ chuẩn của bộ sách "Kết Nối Tri Thức Với Cuộc Sống".
Hãy chuyển ngữ và thiết kế học liệu song ngữ cho bài học sau:
- Môn học: ${subject}
- Tên bài: ${lessonTitle}
- Nội dung gốc tiếng Việt:
${vietnameseContent}

Hãy trả về kết quả dưới dạng JSON có cấu trúc sau:
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

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json(parsed);
    } else {
      // Fallback
      return res.json({
        englishTitle: `${lessonTitle} (Bilingual Learning)`,
        englishContent: `Welcome to the bilingual lesson on ${subject}. Let's learn useful vocabulary and scientific facts in English and Vietnamese!`,
        keyVocabulary: [
          { word: "Knowledge", phonetic: "/ˈnɒl.ɪdʒ/", vietnamese: "Tri thức, kiến thức", example: "Connecting knowledge to life." },
          { word: "Practice", phonetic: "/ˈpræk.tɪs/", vietnamese: "Thực hành, rèn luyện", example: "Practice makes perfect." }
        ],
        bilingualPhrases: [
          { vi: vietnameseContent.slice(0, 80), en: `Exploring ${subject} concepts step by step.` }
        ],
        audioReadingScript: `Welcome to our ${subject} bilingual lesson. Let's explore together!`
      });
    }
  } catch (error: any) {
    console.error('Error translating bilingual:', error);
    res.status(500).json({ error: error.message || 'Lỗi chuyển ngữ song ngữ' });
  }
});

// 6. Endpoint: TTS Tiếng Anh cho học song ngữ (Gemini 3.8 Flash Lite TTS)
app.post('/api/gemini/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Thiếu nội dung văn bản' });
    }

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 600), // optimal length
                speechMetadata: {
                  style: 'Warm, clear, pedagogical pronunciation for ESL students',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
      }
    }

    // If no server key or TTS not available, respond with flag so client uses Web Speech API smoothly
    return res.json({ useWebSpeechFallback: true });
  } catch (error: any) {
    console.error('Error in TTS:', error);
    return res.json({ useWebSpeechFallback: true });
  }
});

// ============================================================================
// CLOUD PERSISTENCE & CROSS-DEVICE HOMEROOM TEACHER PROFILE SYNC
// ============================================================================
const CLOUD_DATA_DIR = path.join(__dirname, 'data', 'cloud_classes');
if (!fs.existsSync(CLOUD_DATA_DIR)) {
  fs.mkdirSync(CLOUD_DATA_DIR, { recursive: true });
}

// 7. Endpoint: Lấy bản lưu đám mây mới nhất theo mã lớp (Account ID)
app.get('/api/cloud/class/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = (req.params.accountId || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!accountId) {
      return res.status(400).json({ error: 'Mã lớp không hợp lệ' });
    }

    const filePath = path.join(CLOUD_DATA_DIR, `${accountId}.json`);
    if (fs.existsSync(filePath)) {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return res.json({ found: true, ...data });
    } else {
      return res.json({ found: false, message: 'Chưa có bản lưu đám mây trên máy chủ' });
    }
  } catch (error: any) {
    console.error('Error reading cloud class data:', error);
    res.status(500).json({ error: error.message || 'Lỗi truy xuất dữ liệu đám mây' });
  }
});

// 8. Endpoint: Đồng bộ & Sao lưu đám mây đa thiết bị (Debounced Cloud Sync)
app.post('/api/cloud/class/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = (req.params.accountId || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!accountId) {
      return res.status(400).json({ error: 'Mã lớp không hợp lệ' });
    }

    const { teacher_name, display_class_name, last_updated, device_info, version, payload } = req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Thiếu dữ liệu payload' });
    }

    const filePath = path.join(CLOUD_DATA_DIR, `${accountId}.json`);
    let currentVersion = 1;

    if (fs.existsSync(filePath)) {
      try {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const oldData = JSON.parse(raw);
        currentVersion = (oldData.version || 0) + 1;
      } catch (e) {
        // ignore
      }
    }

    const record = {
      account_id: accountId,
      teacher_name: teacher_name || 'Giáo viên Chủ nhiệm',
      display_class_name: display_class_name || `Lớp ${accountId.toUpperCase()}`,
      last_updated: last_updated || new Date().toISOString(),
      device_info: device_info || 'Trình duyệt Web',
      version: version || currentVersion,
      payload,
    };

    // Atomic write
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await fs.promises.writeFile(tempPath, JSON.stringify(record, null, 2), 'utf-8');
    await fs.promises.rename(tempPath, filePath);

    return res.json({
      success: true,
      account_id: accountId,
      version: record.version,
      last_updated: record.last_updated,
    });
  } catch (error: any) {
    console.error('Error saving cloud class data:', error);
    res.status(500).json({ error: error.message || 'Lỗi lưu trữ dữ liệu lên đám mây' });
  }
});

// 9. Endpoint: Khôi phục từ tệp sao lưu JSON (Restore Backup)
app.post('/api/cloud/class/:accountId/restore', async (req: Request, res: Response) => {
  try {
    const accountId = (req.params.accountId || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const backupData = req.body;
    if (!accountId || !backupData) {
      return res.status(400).json({ error: 'Dữ liệu khôi phục không hợp lệ' });
    }

    const filePath = path.join(CLOUD_DATA_DIR, `${accountId}.json`);
    const record = {
      account_id: accountId,
      teacher_name: backupData.teacher_name || backupData.teacherName || 'Giáo viên Chủ nhiệm',
      display_class_name: backupData.display_class_name || backupData.className || `Lớp ${accountId.toUpperCase()}`,
      last_updated: new Date().toISOString(),
      device_info: backupData.device_info || 'Khôi phục từ tệp JSON',
      version: (backupData.version || 1) + 1,
      payload: backupData.payload || backupData,
    };

    await fs.promises.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
    return res.json({ success: true, message: 'Khôi phục thành công', record });
  } catch (error: any) {
    console.error('Error restoring cloud class data:', error);
    res.status(500).json({ error: error.message || 'Lỗi khôi phục tệp sao lưu' });
  }
});

// Serve frontend in production or integrate with Vite in development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev mode, mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
