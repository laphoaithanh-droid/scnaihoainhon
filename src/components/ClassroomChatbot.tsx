import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquare,
  Sparkles,
  Send,
  Upload,
  FileText,
  Link as LinkIcon,
  Trash2,
  BookOpen,
  Bot,
  User,
  Paperclip,
  Plus,
  CheckCircle,
  Download,
  ExternalLink,
  File,
  Database,
  Check,
  X,
  XCircle,
} from 'lucide-react';
import { generateChatReply } from '../services/geminiService';

export const ClassroomChatbot: React.FC = () => {
  const {
    currentUser,
    role,
    materials,
    addMaterial,
    deleteMaterial,
    chatMessages,
    addChatMessage,
    customClassPrompt,
  } = useApp();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // New material form states
  const [sourceType, setSourceType] = useState<'local_file' | 'database_link' | 'text'>('local_file');
  const [matTitle, setMatTitle] = useState('');
  const [matSubject, setMatSubject] = useState('Toán học');
  const [matType, setMatType] = useState<'doc' | 'pdf' | 'pptx' | 'link' | 'xlsx' | 'image'>('pdf');
  const [matContent, setMatContent] = useState('');
  const [matFileName, setMatFileName] = useState('');
  const [matFileSize, setMatFileSize] = useState('');
  const [matFileData, setMatFileData] = useState<string | undefined>(undefined);
  const [externalUrl, setExternalUrl] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    setInputText('');
    addChatMessage({
      sender: 'user',
      text: textToSend,
    });
    setIsLoading(true);

    try {
      const res = await generateChatReply({
        messages: [...chatMessages, { sender: 'user', text: textToSend, id: 'temp', timestamp: '' }],
        classroomMaterials: materials,
        studentContext: {
          fullName: currentUser?.fullName || 'Học sinh',
          className: currentUser?.className || 'Lớp 4A1',
        },
        customClassPrompt,
      });

      if (res.reply) {
        addChatMessage({
          sender: 'assistant',
          text: res.reply,
        });
      }
    } catch (e: any) {
      console.error(e);
      addChatMessage({
        sender: 'assistant',
        text: `⚠️ Lỗi kết nối AI: ${e?.message || 'Không thể phản hồi'}. Bạn có thể kiểm tra lại API Key ở nút Settings trên Header nhé!`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    setMatFileName(file.name);
    const sizeInKb = Math.round(file.size / 1024);
    setMatFileSize(sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setMatType('pdf');
    else if (ext === 'doc' || ext === 'docx') setMatType('doc');
    else if (ext === 'ppt' || ext === 'pptx') setMatType('pptx');
    else if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') setMatType('xlsx');
    else if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') setMatType('image');

    if (!matTitle) {
      setMatTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    if (file.type.startsWith('text/') || ext === 'csv' || ext === 'txt' || ext === 'json' || ext === 'md') {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setMatContent(text.slice(0, 5000));
        setMatFileData(text);
        setIsReadingFile(false);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        setMatFileData(event.target?.result as string);
        if (!matContent) {
          setMatContent(
            `Tệp học liệu số "${file.name}" (${file.name.split('.').pop()?.toUpperCase()}) của Trường Tiểu học Hoài Nhơn đã được tải lên từ máy tính giáo viên.`
          );
        }
        setIsReadingFile(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;

    addMaterial({
      title: matTitle,
      subject: matSubject,
      type: matType,
      content:
        matContent.trim() ||
        (sourceType === 'database_link'
          ? `Tài liệu liên kết trực tuyến: ${externalUrl}`
          : `Tệp học liệu số ${matFileName || matTitle}`),
      fileName: matFileName || `${matTitle.replace(/\s+/g, '_')}.${matType === 'link' ? 'url' : matType}`,
      fileSize: matFileSize || (sourceType === 'database_link' ? 'Link trực tuyến' : '85 KB'),
      fileData: matFileData,
      externalUrl: sourceType === 'database_link' ? externalUrl : undefined,
      sourceType,
    });

    setMatTitle('');
    setMatContent('');
    setMatFileName('');
    setMatFileSize('');
    setMatFileData(undefined);
    setExternalUrl('');
    setShowUploadModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">
              Hệ Thống Hỗ Trợ Tự Động & Trợ Lý AI Lớp Học (Trợ Lý Dola)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Học sinh hỏi đáp kiến thức, nề nếp sinh hoạt lớp • Giáo viên tải lên học liệu số (.docx, .pptx, .pdf, link) để liên kết trí tuệ nhân tạo
          </p>
        </div>

        {role === 'teacher' && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg transition whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>+ Đẩy Học Liệu Số Vào AI</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Digital Classroom Knowledge Base */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-xs text-white flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Kho Học Liệu Số Lớp Học ({materials.length})</span>
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
              Đã kết nối AI
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-purple-500/40 transition space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 uppercase">
                      {mat.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{mat.subject}</span>
                  </div>

                  {role === 'teacher' && (
                    <button
                      onClick={() => deleteMaterial(mat.id)}
                      className="text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h4 className="font-semibold text-xs text-white">{mat.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">{mat.content}</p>

                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900">
                  <div className="flex items-center space-x-1.5 truncate max-w-[65%]">
                    {mat.sourceType === 'database_link' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
                        <Database className="w-2.5 h-2.5" />
                        <span>Link CSDL</span>
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                        <File className="w-2.5 h-2.5" />
                        <span>Tệp máy</span>
                      </span>
                    )}
                    <span className="truncate">{mat.fileName || mat.fileSize || 'tai_lieu.pdf'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {mat.externalUrl && (
                      <a
                        href={mat.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-0.5"
                      >
                        <span>Mở Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {mat.fileData && (
                      <a
                        href={mat.fileData}
                        download={mat.fileName || 'hoc_lieu'}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-0.5"
                      >
                        <Download className="w-3 h-3" />
                        <span>Tải về</span>
                      </a>
                    )}
                    <span>{mat.createdAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI Chatbot Window */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[600px] shadow-xl overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-white">
                    Trợ Lý Giáo Dục Toàn Diện Cấp Tiểu Học
                  </h3>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Dual Persona
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Gia sư gợi mở cho Học sinh (Lớp 1-5) 🐝 • Cố vấn sư phạm không áp lực cho Phụ huynh 👨‍👩‍👧
                </p>
              </div>
            </div>

            <span className="text-xs text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Trực tuyến</span>
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${
                    isAssistant ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0 mt-1 shadow">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      isAssistant
                        ? 'bg-slate-950 border border-slate-800 text-slate-200'
                        : 'bg-indigo-600 text-white shadow-md'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span
                      className={`text-[9px] mt-1.5 block ${
                        isAssistant ? 'text-slate-500' : 'text-indigo-200'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-700 flex items-center justify-center text-white text-xs flex-shrink-0 mt-1 shadow">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center space-x-2 text-xs text-purple-400 p-2 bg-slate-950/60 rounded-xl max-w-xs">
                <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
                <span>Trợ lý Dola đang suy nghĩ và tra cứu học liệu...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto scrollbar-none text-[11px]">
            <span className="text-slate-500 flex-shrink-0 font-medium">Gợi ý:</span>
            {[
              { label: '🎒 [Học sinh] Thuật toán Tin học là gì ạ? 💻', text: 'Thầy/Cô ơi, thuật toán trong môn Tin học là gì ạ?' },
              { label: '🎒 [Học sinh] Kể chuyện cọc sông Bạch Đằng ⛵', text: 'Kể cho em nghe về trận cắm cọc sông Bạch Đằng của Ngô Quyền với ạ!' },
              { label: '🎒 [Học sinh] Cách làm thuyền STEM bóng bay 🚀', text: 'Chỉ em cách tự chế tạo thuyền chạy bằng bóng bay từ chai nhựa với ạ!' },
              { label: '👨‍👩‍👧 [Phụ huynh] Cách chỉ con giải Toán không dùng ẩn x 📐', text: 'Tôi là phụ huynh, làm sao chỉ con bài toán này bằng sơ đồ trực quan mà không đặt ẩn x?' },
              { label: '👨‍👩‍👧 [Phụ huynh] Mẹo dạy Tin học không nghiện máy tính 💡', text: 'Làm sao để đồng hành cùng con học Tin học ở nhà mà không lo bé dán mắt vào màn hình?' },
              { label: '👨‍👩‍👧 [Phụ huynh] 5 bước thiết kế kỹ thuật STEM tại nhà 🔬', text: 'Nhờ thầy cô hướng dẫn 5 bước thiết kế kỹ thuật STEM để cùng thực hành thí nghiệm với bé ở nhà?' },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.text)}
                className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap transition text-[11px]"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập câu hỏi bài học hoặc thắc mắc sinh hoạt lớp..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg transition flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      </div>

      {/* Modal: Teacher Upload Material */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Upload className="w-5 h-5 text-purple-400" />
                <span>Thêm Học Liệu Số & Dữ Liệu Tra Cứu</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Source Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSourceType('local_file')}
                className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                  sourceType === 'local_file'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tệp Từ Máy Tính</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('database_link')}
                className={`py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                  sourceType === 'database_link'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Link CSDL / Drive / Sheet</span>
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-3.5 text-xs">
              {/* Option A: Local File Upload */}
              {sourceType === 'local_file' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.png,.jpg"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/30 rounded-xl p-4 text-center cursor-pointer transition space-y-1.5"
                  >
                    <Upload className="w-6 h-6 text-purple-400 mx-auto" />
                    <div className="font-semibold text-slate-200">
                      {matFileName ? (
                        <span className="text-emerald-300 font-bold flex items-center justify-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã chọn: {matFileName} ({matFileSize})</span>
                        </span>
                      ) : (
                        <span>Nhấp để chọn tệp từ máy tính (.docx, .pdf, .pptx, .xlsx, .txt)</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Hệ thống tự động đọc tên, kích thước và nội dung để huấn luyện AI tra cứu
                    </p>
                  </div>
                  {isReadingFile && (
                    <div className="text-[11px] text-purple-400 animate-pulse text-center">
                      Đang phân tích tệp từ máy tính...
                    </div>
                  )}
                </div>
              )}

              {/* Option B: Database Link */}
              {sourceType === 'database_link' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Đường dẫn Google Drive / Google Sheets / CSDL Ngành:
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => {
                      setExternalUrl(e.target.value);
                      if (!matTitle) setMatTitle('Dữ liệu liên kết CSDL Google Sheet');
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/... hoặc link Google Drive"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              )}

              {/* Title & Subject */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tiêu đề học liệu:</label>
                <input
                  type="text"
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="Ví dụ: Đề cương ôn tập Toán tuần 10 - Trường TH Hoài Nhơn"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Môn học:</label>
                  <select
                    value={matSubject}
                    onChange={(e) => setMatSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="Toán học">Toán học</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Khoa học">Khoa học</option>
                    <option value="Lịch sử & Địa lý">Lịch sử & Địa lý</option>
                    <option value="Tin học">Tin học</option>
                    <option value="Nề nếp & Kỷ luật">Nề nếp & Kỷ luật</option>
                    <option value="Hoạt động trải nghiệm">Hoạt động trải nghiệm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Định dạng hiển thị:</label>
                  <select
                    value={matType}
                    onChange={(e) => setMatType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="pdf">Tài liệu .pdf</option>
                    <option value="doc">Văn bản .docx / Word</option>
                    <option value="pptx">Bài giảng .pptx / Slide</option>
                    <option value="xlsx">Bảng tính .xlsx / Sheet</option>
                    <option value="link">Đường link trực tuyến</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nội dung tóm tắt để AI lớp học tra cứu & trả lời học sinh:
                </label>
                <textarea
                  rows={4}
                  value={matContent}
                  onChange={(e) => setMatContent(e.target.value)}
                  placeholder="Nội dung tóm tắt kiến thức trọng tâm, ghi nhớ hoặc đường link tra cứu..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isReadingFile || !matTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  Lưu & Nạp Vào AI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
