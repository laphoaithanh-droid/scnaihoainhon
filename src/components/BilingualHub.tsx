import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BilingualLesson, PronunciationResult } from '../types';
import {
  Languages,
  Volume2,
  Square,
  Sparkles,
  BookOpen,
  Plus,
  CheckCircle,
  FileText,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Mic,
  MicOff,
  Star,
  Award,
  ChevronRight,
  Headphones,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  History,
  X,
  Check,
  Edit3,
  Sliders,
  Trash2,
  Settings2,
  Volume1,
} from 'lucide-react';
import { translateBilingualLesson } from '../services/geminiService';

const SUBJECT_LIST = [
  'Toán bằng Tiếng Anh',
  'Tiếng Việt bằng Tiếng Anh',
  'Khoa học / TN&XH bằng Tiếng Anh',
  'Lịch sử & Địa lý bằng Tiếng Anh',
  'Tin học bằng Tiếng Anh',
  'Công nghệ bằng Tiếng Anh',
  'STEAM bằng Tiếng Anh',
  'Đạo Đức & Kỹ năng sống bằng Tiếng Anh',
];

// Web Audio API Synthesizer Chime for 2 & 3 stars celebration
const playCelebrationChime = (stars: number) => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const notes =
      stars === 3
        ? [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6 (Bright fanfare)
        : [587.33, 880.0]; // D5, A5 (Gentle chime)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
    });
  } catch (err) {
    console.warn('Web Audio chime not supported:', err);
  }
};

export const BilingualHub: React.FC = () => {
  const {
    bilingualLessons,
    addBilingualLesson,
    updateBilingualLesson,
    deleteBilingualLesson,
    bilingualProgress,
    bilingualEnabled,
    bilingualTtsSettings,
    updateBilingualTtsSettings,
    recordPronunciationPractice,
    toggleBilingualEnabled,
    addCustomBilingualSentence,
    role,
    currentUser,
  } = useApp();

  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECT_LIST[0]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'flip' | 'en-only' | 'vi-only'>('side-by-side');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // ----------------------------------------------------------------------
  // TTS State: 3 distinct buttons (Play, Pause/Resume, Stop) + Speed + Karaoke
  // ----------------------------------------------------------------------
  type PlaybackState = 'idle' | 'playing' | 'paused';
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [ttsMode, setTtsMode] = useState<'both' | 'en' | 'vi'>(bilingualTtsSettings?.defaultMode || 'both');
  const [speechRate, setSpeechRate] = useState<number>(bilingualTtsSettings?.rate || 1.0); // 0.75, 1.0, 1.25
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);
  const [activeSpeechLang, setActiveSpeechLang] = useState<'en' | 'vi' | null>(null);
  const [activeWordCharIndex, setActiveWordCharIndex] = useState<number>(-1);

  // Filter lessons for selected subject
  const lessonsForSubject = bilingualLessons.filter((l) => l.subject === selectedSubject);

  // Active lesson
  const currentLesson =
    lessonsForSubject.find((l) => l.id === selectedLessonId) ||
    lessonsForSubject[0] ||
    bilingualLessons.find((l) => l.subject === selectedSubject) ||
    bilingualLessons[0];

  // Teacher edit lesson state
  const [showEditLessonModal, setShowEditLessonModal] = useState<boolean>(false);
  const [editLessonData, setEditLessonData] = useState<BilingualLesson | null>(null);

  // Sentences extracted for Karaoke highlighting
  const enSentences = React.useMemo(() => {
    if (!currentLesson) return [];
    return (
      currentLesson.contentEn.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [
        currentLesson.contentEn,
      ]
    );
  }, [currentLesson]);

  const viSentences = React.useMemo(() => {
    if (!currentLesson) return [];
    return (
      currentLesson.contentVi.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [
        currentLesson.contentVi,
      ]
    );
  }, [currentLesson]);

  // Queue ref for sentences playback
  const utteranceQueueRef = useRef<{ text: string; lang: string; index: number; type: 'en' | 'vi' }[]>([]);
  const currentQueueIndexRef = useRef<number>(0);

  // Stop reading when changing subject or lesson
  useEffect(() => {
    stopReading();
    setIsFlipped(false);
    const firstLesson = bilingualLessons.find((l) => l.subject === selectedSubject);
    if (firstLesson) {
      setSelectedLessonId(firstLesson.id);
    }
  }, [selectedSubject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ----------------------------------------------------------------------
  // TTS Logic
  // ----------------------------------------------------------------------
  const playReading = () => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn chưa hỗ trợ Web Speech API.');
      return;
    }

    // If currently paused, resume!
    if (playbackState === 'paused') {
      window.speechSynthesis.resume();
      setPlaybackState('playing');
      return;
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel();

    // Prepare queue based on ttsMode
    const queue: { text: string; lang: string; index: number; type: 'en' | 'vi' }[] = [];

    if (ttsMode === 'both') {
      const maxLen = Math.max(enSentences.length, viSentences.length);
      for (let i = 0; i < maxLen; i++) {
        if (enSentences[i]) {
          queue.push({ text: enSentences[i], lang: 'en-US', index: i, type: 'en' });
        }
        if (viSentences[i]) {
          queue.push({ text: viSentences[i], lang: 'vi-VN', index: i, type: 'vi' });
        }
      }
    } else if (ttsMode === 'en') {
      enSentences.forEach((s, idx) => {
        queue.push({ text: s, lang: 'en-US', index: idx, type: 'en' });
      });
    } else {
      viSentences.forEach((s, idx) => {
        queue.push({ text: s, lang: 'vi-VN', index: idx, type: 'vi' });
      });
    }

    if (queue.length === 0) return;

    utteranceQueueRef.current = queue;
    currentQueueIndexRef.current = 0;
    setPlaybackState('playing');

    speakQueueItem(0);
  };

  const speakQueueItem = (idx: number) => {
    if (idx >= utteranceQueueRef.current.length) {
      // Completed all
      setPlaybackState('idle');
      setActiveSentenceIndex(-1);
      setActiveSpeechLang(null);
      setActiveWordCharIndex(-1);
      return;
    }

    const item = utteranceQueueRef.current[idx];
    currentQueueIndexRef.current = idx;
    setActiveSentenceIndex(item.index);
    setActiveSpeechLang(item.type);
    setActiveWordCharIndex(-1);

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.lang = item.lang;
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    if (item.lang.startsWith('en')) {
      const enVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Jenny'))
      );
      if (enVoice) utterance.voice = enVoice;
    } else {
      const viVoice = voices.find(
        (v) => v.lang.startsWith('vi') || v.name.includes('Vietnamese') || v.name.includes('HoaiMy')
      );
      if (viVoice) utterance.voice = viVoice;
    }

    // Word boundary tracking for karaoke highlighting
    utterance.onboundary = (e: any) => {
      if (e.name === 'word') {
        setActiveWordCharIndex(e.charIndex);
      }
    };

    utterance.onend = () => {
      // Move to next sentence in queue
      speakQueueItem(idx + 1);
    };

    utterance.onerror = (e) => {
      console.warn('TTS utterance error:', e);
      speakQueueItem(idx + 1);
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePauseResume = () => {
    if (!('speechSynthesis' in window)) return;

    if (playbackState === 'playing') {
      window.speechSynthesis.pause();
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      // Resume playback cleanly
      window.speechSynthesis.resume();
      setPlaybackState('playing');

      // Fallback if browser engine stalled on pause
      setTimeout(() => {
        if (!window.speechSynthesis.speaking && currentQueueIndexRef.current < utteranceQueueRef.current.length) {
          speakQueueItem(currentQueueIndexRef.current);
        }
      }, 120);
    }
  };

  const stopReading = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlaybackState('idle');
    setActiveSentenceIndex(-1);
    setActiveSpeechLang(null);
    setActiveWordCharIndex(-1);
    currentQueueIndexRef.current = 0;
  };

  const speakStartingFromSentence = (sentIdx: number, type: 'en' | 'vi') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const queue: { text: string; lang: string; index: number; type: 'en' | 'vi' }[] = [];

    if (ttsMode === 'both') {
      const maxLen = Math.max(enSentences.length, viSentences.length);
      for (let i = sentIdx; i < maxLen; i++) {
        if (type === 'en') {
          if (enSentences[i]) queue.push({ text: enSentences[i], lang: 'en-US', index: i, type: 'en' });
          if (viSentences[i]) queue.push({ text: viSentences[i], lang: 'vi-VN', index: i, type: 'vi' });
        } else {
          if (viSentences[i]) queue.push({ text: viSentences[i], lang: 'vi-VN', index: i, type: 'vi' });
          if (enSentences[i]) queue.push({ text: enSentences[i], lang: 'en-US', index: i, type: 'en' });
        }
      }
    } else if (ttsMode === 'en') {
      for (let i = sentIdx; i < enSentences.length; i++) {
        queue.push({ text: enSentences[i], lang: 'en-US', index: i, type: 'en' });
      }
    } else {
      for (let i = sentIdx; i < viSentences.length; i++) {
        queue.push({ text: viSentences[i], lang: 'vi-VN', index: i, type: 'vi' });
      }
    }

    if (queue.length === 0) return;
    utteranceQueueRef.current = queue;
    currentQueueIndexRef.current = 0;
    setPlaybackState('playing');
    speakQueueItem(0);
  };

  const speakSinglePhrase = (text: string, lang = 'en-US') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = speechRate;
    const voices = window.speechSynthesis.getVoices();
    if (lang.startsWith('en')) {
      const enVoice = voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveTtsSettingsForClass = () => {
    updateBilingualTtsSettings({ rate: speechRate, defaultMode: ttsMode });
    alert(`Đã lưu cấu hình âm thanh mặc định cho lớp: Tốc độ ${speechRate}x • Chế độ ${ttsMode === 'both' ? 'Song ngữ (EN+VI)' : ttsMode === 'en' ? 'Chỉ Tiếng Anh' : 'Chỉ Tiếng Việt'}.`);
  };

  // ----------------------------------------------------------------------
  // PART 2: Interactive Voice Recording & Pronunciation Scoring (STT)
  // ----------------------------------------------------------------------
  type RecordingState = 'idle' | 'listening' | 'evaluating';
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [targetPracticePhrase, setTargetPracticePhrase] = useState<string>('');
  const [targetPracticeVi, setTargetPracticeVi] = useState<string>('');
  const [recognitionCountdown, setRecognitionCountdown] = useState<number>(5);
  const [evaluationResult, setEvaluationResult] = useState<PronunciationResult | null>(null);
  const [showPracticeModal, setShowPracticeModal] = useState<boolean>(false);
  const [recognizedTranscript, setRecognizedTranscript] = useState<string>('');
  const [isMicAvailable, setIsMicAvailable] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Initialize SpeechRecognition
  const startRecordingPractice = (phraseEn: string, phraseVi = '') => {
    // Stop any ongoing TTS reading
    stopReading();

    setTargetPracticePhrase(phraseEn);
    setTargetPracticeVi(phraseVi);
    setEvaluationResult(null);
    setRecognizedTranscript('');
    setShowPracticeModal(true);
    setRecordingState('listening');
    setRecognitionCountdown(5);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsMicAvailable(false);
      setRecordingState('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setRecordingState('listening');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setRecognizedTranscript(transcript);
        evaluatePronunciation(phraseEn, transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsMicAvailable(false);
        }
        setRecordingState('idle');
      };

      recognition.onend = () => {
        clearInterval(countdownIntervalRef.current);
        if (recordingState === 'listening') {
          // If ended without result
          setRecordingState('idle');
        }
      };

      recognition.start();

      // 5-second countdown timer
      let timeLeft = 5;
      countdownIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setRecognitionCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownIntervalRef.current);
          stopRecordingPracticeEarly();
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to start SpeechRecognition', err);
      setIsMicAvailable(false);
      setRecordingState('idle');
    }
  };

  const stopRecordingPracticeEarly = () => {
    clearInterval(countdownIntervalRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // already stopped
      }
    }
    setRecordingState('evaluating');
  };

  // Word-by-word diff & accuracy scoring algorithm
  const evaluatePronunciation = (target: string, spoken: string) => {
    clearInterval(countdownIntervalRef.current);
    setRecordingState('evaluating');

    setTimeout(() => {
      // Normalize words
      const rawTargetWords = target.trim().split(/\s+/);
      const cleanTargetWords = rawTargetWords.map((w) =>
        w.toLowerCase().replace(/[^a-z0-9'-]/g, '')
      );

      const spokenTokens = spoken
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, '')
        .trim()
        .split(/\s+/);

      // Check word-by-word
      let correctCount = 0;
      const wordsAnalysis = rawTargetWords.map((originalWord, idx) => {
        const cleanWord = cleanTargetWords[idx];
        // Check if spoken tokens contain this word or close match
        const isMatch = spokenTokens.some((token) => {
          if (token === cleanWord) return true;
          // Accept slight phonetic variant if word is > 4 chars and Levenshtein <= 1
          if (cleanWord.length > 4 && Math.abs(token.length - cleanWord.length) <= 1) {
            let diff = 0;
            for (let i = 0; i < Math.min(token.length, cleanWord.length); i++) {
              if (token[i] !== cleanWord[i]) diff++;
            }
            return diff <= 1;
          }
          return false;
        });

        if (isMatch) correctCount++;

        return {
          word: originalWord,
          isCorrect: isMatch,
        };
      });

      const totalWords = rawTargetWords.length;
      const score = Math.max(
        0,
        Math.min(100, Math.round((correctCount / (totalWords || 1)) * 100))
      );

      let stars: 1 | 2 | 3 = 1;
      let feedback = '';

      if (score >= 80) {
        stars = 3;
        feedback = 'Xuất sắc! Con phát âm rất chuẩn, rõ chữ và ngữ điệu rất tự nhiên! 🎉';
      } else if (score >= 50) {
        stars = 2;
        feedback = 'Khá tốt! Con chú ý luyện phát âm lại các từ tô màu đỏ để đạt 3 sao nhé! 💪';
      } else {
        stars = 1;
        feedback = 'Cố gắng lên nào! Hãy bấm nút loa 🔊 nghe lại mẫu rồi thử nói lại nhé! 🌱';
      }

      const result: PronunciationResult = {
        targetText: target,
        spokenText: spoken,
        score,
        stars,
        feedback,
        wordsAnalysis,
      };

      setEvaluationResult(result);
      setRecordingState('idle');

      // Play Web Audio synthesizer celebration chime if 2 or 3 stars
      if (stars >= 2) {
        playCelebrationChime(stars);
      }

      // Auto-save to class sandbox
      recordPronunciationPractice(
        target,
        spoken,
        score,
        stars,
        currentUser?.role === 'student' ? currentUser.fullName : undefined
      );
    }, 600);
  };

  // Simulation test mode (when mic is blocked or user wants to test quickly)
  const handleSimulatePractice = (simulationType: 'perfect' | 'good' | 'retry') => {
    let mockSpoken = targetPracticePhrase;
    if (simulationType === 'good') {
      const words = targetPracticePhrase.split(' ');
      if (words.length > 2) {
        // Change one word slightly
        words[words.length - 1] = 'something';
      }
      mockSpoken = words.join(' ');
    } else if (simulationType === 'retry') {
      mockSpoken = 'hello practice test';
    }

    setRecognizedTranscript(mockSpoken);
    evaluatePronunciation(targetPracticePhrase, mockSpoken);
  };

  // ----------------------------------------------------------------------
  // PART 3: Teacher Settings & Modal Actions
  // ----------------------------------------------------------------------
  const [showAddLessonModal, setShowAddLessonModal] = useState<boolean>(false);
  const [showAddSentenceModal, setShowAddSentenceModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // New lesson creation
  const [newTitleVi, setNewTitleVi] = useState('');
  const [newUnit, setNewUnit] = useState('Chủ đề mới');
  const [newContentVi, setNewContentVi] = useState('');

  // New custom phrase
  const [newPhraseVi, setNewPhraseVi] = useState('');
  const [newPhraseEn, setNewPhraseEn] = useState('');

  const handleCreateAndTranslateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleVi || !newContentVi) return;

    setIsTranslating(true);
    try {
      const data = await translateBilingualLesson({
        subject: selectedSubject,
        lessonTitle: newTitleVi,
        vietnameseContent: newContentVi,
      });

      addBilingualLesson({
        subject: selectedSubject,
        grade: 4,
        bookSeries: 'Kết Nối Tri Thức Với Cuộc Sống',
        unit: newUnit,
        titleVi: newTitleVi,
        titleEn: data.englishTitle || `${newTitleVi} (English)`,
        contentVi: newContentVi,
        contentEn: data.englishContent || 'Translated lesson content',
        audioScript: data.audioReadingScript || data.englishContent,
        keyVocabulary: data.keyVocabulary || [],
        bilingualPhrases: data.bilingualPhrases || [],
      });

      setNewTitleVi('');
      setNewContentVi('');
      setShowAddLessonModal(false);
    } catch (e: any) {
      console.error(e);
      alert(`Lỗi chuyển ngữ bài học: ${e?.message || 'Không thể kết nối AI'}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAddCustomSentence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhraseVi.trim() || !newPhraseEn.trim()) return;

    addCustomBilingualSentence(selectedSubject, newPhraseVi.trim(), newPhraseEn.trim());
    setNewPhraseVi('');
    setNewPhraseEn('');
    setShowAddSentenceModal(false);
  };

  const handleOpenEditLesson = () => {
    if (!currentLesson) return;
    setEditLessonData(JSON.parse(JSON.stringify(currentLesson)));
    setShowEditLessonModal(true);
  };

  const handleSaveEditedLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLessonData) return;
    updateBilingualLesson(editLessonData);
    setShowEditLessonModal(false);
    alert('Đã cập nhật bản dịch tiếng Anh & thuật ngữ của bài học vào cơ sở dữ liệu lớp học thành công!');
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. TOP HEADER & BILINGUAL CLASS STATUS BANNER                       */}
      {/* =================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Languages className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Học Song Ngữ Đa Môn & Luyện Phát Âm Tương Tác</span>
                  {bilingualEnabled && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Đang bật
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Chuẩn Sách Giáo Khoa "Kết Nối Tri Thức Với Cuộc Sống" • Lớp 1 - 5 • Phát âm bản ngữ Cambridge/Oxford
                </p>
              </div>
            </div>
          </div>

          {/* Quick stats & Teacher Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Practice Stats Badge */}
            <div className="flex items-center space-x-3 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <div className="flex items-center space-x-1 text-amber-400 font-semibold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{bilingualProgress?.totalStarsEarned || 0} Sao</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1 text-cyan-400 font-semibold">
                <Headphones className="w-4 h-4" />
                <span>{bilingualProgress?.practiceCount || 0} lượt luyện</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(true)}
                title="Xem lịch sử luyện đọc"
                className="text-slate-400 hover:text-white transition"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Teacher Settings Toggle */}
            {role === 'teacher' && (
              <>
                <button
                  onClick={() => toggleBilingualEnabled()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 ${
                    bilingualEnabled
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-rose-950/60 border-rose-600 text-rose-300'
                  }`}
                  title="Bật/Tắt tính năng song ngữ cho lớp"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{bilingualEnabled ? 'Bật Song Ngữ' : 'Tắt Song Ngữ'}</span>
                </button>

                <button
                  onClick={() => setShowAddSentenceModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center space-x-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Câu Luyện Cho Lớp</span>
                </button>

                <button
                  onClick={() => setShowAddLessonModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Dịch Bài Học AI</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. SUBJECT NAVIGATION CHIPS (ALL 7+ PRIMARY SUBJECTS)              */}
      {/* =================================================================== */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {SUBJECT_LIST.map((subj) => {
          const isSelected = selectedSubject === subj;
          return (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {subj}
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* 3. MAIN LESSON WORKSPACE & TTS TOOLBAR (3 BUTTONS + SPEED SLIDER)   */}
      {/* =================================================================== */}
      {currentLesson ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 relative">
          {/* Header row: Title + View Mode Selector + 3-Button TTS Toolbar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  {currentLesson.bookSeries} • Lớp {currentLesson.grade}
                </span>
                <span className="text-xs text-slate-400 font-medium">{currentLesson.unit}</span>
                {lessonsForSubject.length > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                    {lessonsForSubject.length} bài học
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-bold text-white">{currentLesson.titleVi}</h3>
                {role === 'teacher' && (
                  <button
                    onClick={handleOpenEditLesson}
                    title="Chỉnh sửa bản dịch tiếng Anh & danh mục thuật ngữ theo chuẩn bộ sách của lớp"
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chỉnh Sửa Bản Dịch & Thuật Ngữ</span>
                  </button>
                )}
              </div>

              <p className="text-sm font-semibold text-cyan-400 italic mt-0.5">
                {currentLesson.titleEn}
              </p>

              {/* Lesson switcher if multiple lessons exist for this subject */}
              {lessonsForSubject.length > 1 && (
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-slate-400 font-medium">Chọn bài học:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {lessonsForSubject.map((l, i) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          stopReading();
                          setSelectedLessonId(l.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          currentLesson.id === l.id
                            ? 'bg-cyan-600 text-white shadow'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Bài {i + 1}: {l.titleVi.slice(0, 25)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls Right: View Mode Toggle & TTS Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    viewMode === 'side-by-side'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Xem dạng song song 2 cột"
                >
                  Song song
                </button>
                <button
                  onClick={() => setViewMode('flip')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    viewMode === 'flip'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Dạng thẻ lật thông minh"
                >
                  Thẻ lật
                </button>
                <button
                  onClick={() => setViewMode('en-only')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    viewMode === 'en-only'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setViewMode('vi-only')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    viewMode === 'vi-only'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  VI
                </button>
              </div>

              {/* TTS Toolbar: 3 Distinct Buttons (Play, Pause/Resume, Stop) + Speed Controls */}
              <div className="flex flex-wrap items-center bg-slate-950 p-2 rounded-2xl border border-slate-800 gap-2 shadow-inner">
                {/* Mode Selector (Both / EN / VI) */}
                <select
                  value={ttsMode}
                  onChange={(e) => setTtsMode(e.target.value as any)}
                  disabled={playbackState !== 'idle'}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500"
                  title="Chọn ngôn ngữ phát giọng đọc"
                >
                  <option value="both">Đọc Song Ngữ (EN + VI)</option>
                  <option value="en">Chỉ Đọc Tiếng Anh</option>
                  <option value="vi">Chỉ Đọc Tiếng Việt</option>
                </select>

                {/* Speed Controls: Slider + Quick Presets */}
                <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-bold text-cyan-400 w-11">{speechRate.toFixed(2)}x</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    title={`Tốc độ đọc: ${speechRate}x`}
                  />
                  <div className="flex items-center space-x-1 pl-1">
                    {[0.75, 1.0, 1.25].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setSpeechRate(rate)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition ${
                          speechRate === rate
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-slate-200 bg-slate-800'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* BUTTON 1: Đọc / Phát (Play) with Visual Waveform Equalizer */}
                <button
                  onClick={playReading}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow ${
                    playbackState === 'playing'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 animate-pulse shadow-lg shadow-emerald-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95'
                  }`}
                  title="Bắt đầu đọc bài"
                >
                  {playbackState === 'playing' ? (
                    <>
                      <div className="flex items-center space-x-0.5">
                        <span className="w-1 h-3 bg-white animate-pulse rounded-full" />
                        <span className="w-1 h-4 bg-white animate-pulse delay-75 rounded-full" />
                        <span className="w-1 h-2.5 bg-white animate-pulse delay-150 rounded-full" />
                      </div>
                      <span>Đang Phát</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Đọc / Phát</span>
                    </>
                  )}
                </button>

                {/* BUTTON 2: Tạm dừng / Tiếp tục (Pause / Resume) */}
                <button
                  onClick={togglePauseResume}
                  disabled={playbackState === 'idle'}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    playbackState === 'idle'
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : playbackState === 'paused'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse ring-2 ring-amber-400'
                      : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                  }`}
                  title={
                    playbackState === 'paused'
                      ? 'Tiếp tục đọc ngay từ câu đang tạm dừng (không tua lại đầu)'
                      : 'Tạm dừng giọng đọc tại vị trí hiện tại'
                  }
                >
                  {playbackState === 'paused' ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Tiếp tục</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Tạm dừng</span>
                    </>
                  )}
                </button>

                {/* BUTTON 3: Dừng hẳn (Stop) */}
                <button
                  onClick={stopReading}
                  disabled={playbackState === 'idle'}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    playbackState === 'idle'
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow hover:scale-105 active:scale-95'
                  }`}
                  title="Dừng hẳn và reset con trỏ đọc về đầu"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Dừng hẳn</span>
                </button>

                {/* Teacher Save Default Audio Settings */}
                {role === 'teacher' && (
                  <button
                    onClick={handleSaveTtsSettingsForClass}
                    title="Lưu tốc độ và chế độ ngôn ngữ này làm mặc định cho lớp"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Karaoke Status Indicator Banner */}
          {playbackState !== 'idle' && (
            <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-cyan-300">
              <div className="flex items-center space-x-2.5">
                <Volume2
                  className={`w-4 h-4 text-cyan-400 ${
                    playbackState === 'playing' ? 'animate-pulse' : ''
                  }`}
                />
                <span>
                  {playbackState === 'playing' ? (
                    <>
                      Đang đọc <strong>{activeSpeechLang === 'en' ? 'Bản Tiếng Anh' : 'Bản Tiếng Việt'}</strong> • Câu{' '}
                      {activeSentenceIndex + 1}... Học sinh dõi theo chữ được làm sáng (Karaoke) nhé!
                    </>
                  ) : (
                    <>Đang tạm dừng tại câu {activeSentenceIndex + 1}. Bấm "Tiếp tục" để nghe tiếp!</>
                  )}
                </span>
              </div>

              {playbackState === 'playing' && (
                <div className="flex items-center space-x-1">
                  <span className="w-1.5 h-4 bg-cyan-400 animate-pulse rounded" />
                  <span className="w-1.5 h-6 bg-cyan-300 animate-pulse delay-75 rounded" />
                  <span className="w-1.5 h-3 bg-cyan-500 animate-pulse delay-150 rounded" />
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* CONTENT PRESENTATION: SIDE-BY-SIDE / FLIP CARD / EN / VI        */}
          {/* =============================================================== */}
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vietnamese Column */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-slate-800 pb-2">
                  <span>Nội Dung Gốc Tiếng Việt</span>
                  <button
                    onClick={() => speakSinglePhrase(currentLesson.contentVi, 'vi-VN')}
                    className="text-[11px] text-amber-400 hover:text-white flex items-center space-x-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Nghe tiếng Việt</span>
                  </button>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed space-y-1.5 pt-1">
                  {viSentences.map((sent, idx) => {
                    const isHighlighted =
                      activeSentenceIndex === idx && activeSpeechLang === 'vi';
                    return (
                      <span
                        key={idx}
                        onClick={() => speakStartingFromSentence(idx, 'vi')}
                        title="Bấm để nghe đọc từ câu này"
                        className={`inline transition-all duration-300 rounded px-1.5 py-0.5 cursor-pointer ${
                          isHighlighted
                            ? 'bg-amber-400/25 text-amber-100 font-bold ring-2 ring-amber-400 shadow-sm'
                            : 'hover:bg-slate-800/80'
                        }`}
                      >
                        {isHighlighted && <Volume2 className="w-3 h-3 inline mr-1 text-amber-400 animate-pulse" />}
                        {sent}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* English Pedagogical Column */}
              <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-400 border-b border-slate-800 pb-2">
                  <span>Bản Tiếng Anh Chuẩn Sư Phạm (Oxford Primary)</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => speakSinglePhrase(currentLesson.contentEn, 'en-US')}
                      className="text-[11px] text-cyan-300 hover:text-white flex items-center space-x-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Nghe mẫu</span>
                    </button>
                    <button
                      onClick={() =>
                        startRecordingPractice(
                          currentLesson.contentEn,
                          currentLesson.contentVi
                        )
                      }
                      className="text-[11px] px-2 py-0.5 rounded bg-cyan-600/30 text-cyan-200 hover:bg-cyan-600 hover:text-white transition flex items-center space-x-1 border border-cyan-500/40"
                    >
                      <Mic className="w-3 h-3 text-cyan-300" />
                      <span>Luyện đọc đoạn này</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed space-y-1.5 pt-1">
                  {enSentences.map((sent, idx) => {
                    const isHighlighted =
                      activeSentenceIndex === idx && activeSpeechLang === 'en';
                    return (
                      <span
                        key={idx}
                        onClick={() => speakStartingFromSentence(idx, 'en')}
                        title="Bấm để nghe đọc từ câu này"
                        className={`inline transition-all duration-300 rounded px-1.5 py-0.5 cursor-pointer ${
                          isHighlighted
                            ? 'bg-cyan-400/30 text-cyan-100 font-bold ring-2 ring-cyan-400 shadow-sm'
                            : 'hover:bg-slate-800/80'
                        }`}
                      >
                        {isHighlighted && <Volume2 className="w-3 h-3 inline mr-1 text-cyan-300 animate-pulse" />}
                        {sent}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'flip' && (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[220px] text-center space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                {isFlipped ? 'Mặt Sau: Tiếng Việt' : 'Mặt Trước: Tiếng Anh (Oxford Primary)'}
              </span>

              <p className="text-sm text-slate-100 max-w-2xl leading-relaxed font-medium">
                {isFlipped ? currentLesson.contentVi : currentLesson.contentEn}
              </p>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isFlipped ? 'Lật Sang Tiếng Anh' : 'Lật Sang Tiếng Việt'}</span>
                </button>

                <button
                  onClick={() =>
                    speakSinglePhrase(
                      isFlipped ? currentLesson.contentVi : currentLesson.contentEn,
                      isFlipped ? 'vi-VN' : 'en-US'
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe Phát Âm Mặt Này</span>
                </button>

                {!isFlipped && (
                  <button
                    onClick={() =>
                      startRecordingPractice(currentLesson.contentEn, currentLesson.contentVi)
                    }
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Luyện Đọc</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {viewMode === 'en-only' && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-sm text-cyan-400">
                  Văn Bản Tiếng Anh Chuẩn Sư Phạm (Oxford Primary) • Bấm vào câu để nghe đọc
                </span>
                <button
                  onClick={() =>
                    startRecordingPractice(currentLesson.contentEn, currentLesson.contentVi)
                  }
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Luyện Đọc Bài Này</span>
                </button>
              </div>
              <div className="text-sm text-slate-200 leading-relaxed space-y-1.5">
                {enSentences.map((sent, idx) => {
                  const isHighlighted = activeSentenceIndex === idx && activeSpeechLang === 'en';
                  return (
                    <span
                      key={idx}
                      onClick={() => speakStartingFromSentence(idx, 'en')}
                      title="Bấm để bắt đầu đọc từ câu này"
                      className={`inline transition-all duration-300 rounded px-1.5 py-0.5 cursor-pointer ${
                        isHighlighted
                          ? 'bg-cyan-400/30 text-cyan-100 font-bold ring-2 ring-cyan-400 shadow-sm'
                          : 'hover:bg-slate-800/80'
                      }`}
                    >
                      {isHighlighted && <Volume2 className="w-3.5 h-3.5 inline mr-1 text-cyan-300 animate-pulse" />}
                      {sent}{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'vi-only' && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-sm text-amber-400">
                  Nội Dung Chuẩn Tiếng Việt (Sách Kết Nối Tri Thức Với Cuộc Sống) • Bấm vào câu để nghe đọc
                </span>
                <button
                  onClick={() => speakSinglePhrase(currentLesson.contentVi, 'vi-VN')}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe Giọng Tiếng Việt</span>
                </button>
              </div>
              <div className="text-sm text-slate-200 leading-relaxed space-y-1.5">
                {viSentences.map((sent, idx) => {
                  const isHighlighted = activeSentenceIndex === idx && activeSpeechLang === 'vi';
                  return (
                    <span
                      key={idx}
                      onClick={() => speakStartingFromSentence(idx, 'vi')}
                      title="Bấm để bắt đầu đọc từ câu này"
                      className={`inline transition-all duration-300 rounded px-1.5 py-0.5 cursor-pointer ${
                        isHighlighted
                          ? 'bg-amber-400/25 text-amber-100 font-bold ring-2 ring-amber-400 shadow-sm'
                          : 'hover:bg-slate-800/80'
                      }`}
                    >
                      {isHighlighted && <Volume2 className="w-3.5 h-3.5 inline mr-1 text-amber-400 animate-pulse" />}
                      {sent}{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* KEY ACADEMIC VOCABULARY WITH IPA & INDIVIDUAL MIC PRACTICE      */}
          {/* =============================================================== */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Hộp Từ Vựng Then Chốt (Key Academic Vocabulary & IPA)</span>
              </h4>
              <span className="text-xs text-slate-400">
                Bấm nút <strong>Loa</strong> để nghe chuẩn • Bấm <strong>Mic</strong> để luyện nói từng từ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentLesson.keyVocabulary.map((vocab, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-2 group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-cyan-300 group-hover:text-cyan-200">
                        {vocab.word}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => speakSinglePhrase(vocab.word, 'en-US')}
                          title="Nghe phát âm từ này"
                          className="p-1 rounded bg-slate-900 hover:bg-cyan-600 hover:text-white text-cyan-400 transition"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startRecordingPractice(vocab.word, vocab.vietnamese)}
                          title="Luyện phát âm từ này và chấm điểm"
                          className="p-1 rounded bg-slate-900 hover:bg-indigo-600 hover:text-white text-indigo-400 transition"
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-cyan-400/80 block mt-0.5">
                      {vocab.phonetic}
                    </span>
                    <p className="text-xs font-semibold text-slate-200 mt-1">
                      {vocab.vietnamese}
                    </p>
                  </div>

                  <p className="text-[10px] text-slate-400 italic border-t border-slate-800/80 pt-1.5">
                    Ví dụ: "{vocab.example}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* =============================================================== */}
          {/* BILINGUAL PHRASES & INTERACTIVE PRACTICE ROW                     */}
          {/* =============================================================== */}
          {currentLesson.bilingualPhrases?.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Mẫu Câu Luyện Nói Song Ngữ & Giao Tiếp Học Thuật:</span>
                </h4>
                {role === 'teacher' && (
                  <button
                    onClick={() => setShowAddSentenceModal(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm câu cho lớp</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {currentLesson.bilingualPhrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-cyan-500/30 transition group"
                  >
                    <div className="space-y-0.5 pr-2">
                      <div className="font-bold text-cyan-300 text-sm">{phrase.en}</div>
                      <div className="text-slate-400">{phrase.vi}</div>
                    </div>

                    <div className="flex items-center space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => speakSinglePhrase(phrase.en, 'en-US')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs flex items-center space-x-1 border border-slate-800"
                        title="Nghe phát âm chuẩn"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Nghe</span>
                      </button>

                      <button
                        onClick={() => startRecordingPractice(phrase.en, phrase.vi)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center space-x-1 shadow-md shadow-indigo-500/20"
                        title="Nhấn mic để nói lại và nhận điểm"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Luyện Nói & Chấm Điểm</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          Chưa có bài học cho môn học này. Thầy cô có thể nhấn "Dịch Bài Học AI" để tạo mới ngay!
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. MODAL: INTERACTIVE VOICE RECORDING & PRONUNCIATION SCORING CARD  */}
      {/* =================================================================== */}
      {showPracticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 text-slate-200 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                stopRecordingPracticeEarly();
                setShowPracticeModal(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                Luyện Phát Âm Tương Tác Cùng AI
              </span>
              <h3 className="text-lg font-bold text-white">Lắng Nghe & Nói Lại Tiếng Anh</h3>
            </div>

            {/* Target Phrase Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/40 text-center space-y-2">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Câu mục tiêu cần đọc:
              </div>
              <div className="text-base sm:text-lg font-bold text-cyan-300">
                "{targetPracticePhrase}"
              </div>
              {targetPracticeVi && (
                <div className="text-xs text-slate-400 italic">Nghĩa: {targetPracticeVi}</div>
              )}
              <div className="pt-1 flex justify-center">
                <button
                  onClick={() => speakSinglePhrase(targetPracticePhrase, 'en-US')}
                  className="px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-cyan-400 flex items-center space-x-1.5 border border-slate-700"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe lại mẫu giọng chuẩn</span>
                </button>
              </div>
            </div>

            {/* Circular Mic Button with 3 states (Idle, Listening, Evaluating) */}
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              {recordingState === 'idle' && !evaluationResult && (
                <div className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => startRecordingPractice(targetPracticePhrase, targetPracticeVi)}
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-cyan-500/30 transition transform hover:scale-105 active:scale-95 group"
                    title="Bắt đầu ghi âm nói"
                  >
                    <Mic className="w-8 h-8 group-hover:animate-pulse" />
                  </button>
                  <span className="text-xs font-semibold text-slate-300">
                    Bấm vào Mic để bắt đầu nói
                  </span>
                </div>
              )}

              {recordingState === 'listening' && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing wave rings */}
                    <div className="absolute w-28 h-28 rounded-full bg-rose-500/20 animate-ping" />
                    <div className="absolute w-24 h-24 rounded-full bg-rose-500/30 animate-pulse" />
                    <button
                      onClick={stopRecordingPracticeEarly}
                      className="w-20 h-20 rounded-full bg-rose-600 text-white flex flex-col items-center justify-center shadow-2xl shadow-rose-600/40 z-10 animate-pulse"
                      title="Bấm để dừng ghi âm và chấm điểm ngay"
                    >
                      <Mic className="w-6 h-6 animate-bounce" />
                      <span className="text-[10px] font-bold uppercase mt-0.5">Dừng</span>
                    </button>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-rose-400 animate-pulse">
                      Đang nghe... Còn {recognitionCountdown} giây
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Bé đọc to rõ ràng vào mic nhé! (Bấm nút đỏ để nộp sớm)
                    </p>
                  </div>
                </div>
              )}

              {recordingState === 'evaluating' && (
                <div className="flex flex-col items-center space-y-2 py-4">
                  <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                  <span className="text-xs font-bold text-cyan-300">
                    AI Đang phân tích âm học và chấm điểm phát âm...
                  </span>
                </div>
              )}
            </div>

            {/* Mic Permission / Sandbox Fallback Notice */}
            {!isMicAvailable && (
              <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/40 text-xs text-amber-300 space-y-2 text-center">
                <p>
                  Trình duyệt chưa bật Microphone hoặc đang ở chế độ bảo mật. Bạn có thể thử nghiệm tính năng chấm điểm bằng nút test bên dưới:
                </p>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => handleSimulatePractice('perfect')}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    Thử phát âm đúng (3 sao)
                  </button>
                  <button
                    onClick={() => handleSimulatePractice('good')}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                  >
                    Thử sai 1 từ (2 sao)
                  </button>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* PEDAGOGICAL FEEDBACK CARD (1-3 STARS + WORD COLOR CODING)       */}
            {/* =============================================================== */}
            {evaluationResult && (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 animate-scaleUp">
                {/* Score & Stars Display */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase text-slate-400">Đánh giá:</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3].map((starNum) => (
                        <Star
                          key={starNum}
                          className={`w-6 h-6 ${
                            starNum <= evaluationResult.stars
                              ? 'text-amber-400 fill-amber-400 animate-bounce'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Độ chính xác:</span>
                    <span
                      className={`text-base font-extrabold px-2.5 py-0.5 rounded-lg ${
                        evaluationResult.score >= 80
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : evaluationResult.score >= 50
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {evaluationResult.score}%
                    </span>
                  </div>
                </div>

                {/* Pedagogical feedback */}
                <p className="text-xs font-semibold text-cyan-300 text-center bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-500/20">
                  {evaluationResult.feedback}
                </p>

                {/* Word-by-Word Diff Color-coded (Green = Correct, Red = Needs Practice) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Chi tiết từng từ (Bấm loa cạnh từ đỏ để nghe lại):</span>
                    <div className="flex items-center space-x-3 text-[10px]">
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Phát âm đúng</span>
                      </span>
                      <span className="flex items-center space-x-1 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span>Cần luyện thêm</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
                    {evaluationResult.wordsAnalysis.map((item, idx) => (
                      <div
                        key={idx}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                          item.isCorrect
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-950/50 text-rose-300 border-rose-500/50'
                        }`}
                      >
                        <span>{item.word}</span>
                        {item.isCorrect ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <button
                            onClick={() => speakSinglePhrase(item.word, 'en-US')}
                            title={`Bấm để nghe phát âm từ "${item.word}"`}
                            className="p-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-white transition ml-0.5"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {evaluationResult.spokenText && (
                    <p className="text-[11px] text-slate-400 italic">
                      Hệ thống ghi nhận bạn nói: "{evaluationResult.spokenText}"
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    onClick={() =>
                      startRecordingPractice(targetPracticePhrase, targetPracticeVi)
                    }
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Luyện Lại Lần Nữa</span>
                  </button>

                  <button
                    onClick={() => setShowPracticeModal(false)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow"
                  >
                    Hoàn Thành & Lưu Điểm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. MODAL: TEACHER ADD CUSTOM BILINGUAL SENTENCE FOR THE CLASS       */}
      {/* =================================================================== */}
      {showAddSentenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-200">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Thêm Câu Luyện Phát Âm Riêng Cho Lớp</span>
            </h3>

            <form onSubmit={handleAddCustomSentence} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Môn học áp dụng:</label>
                <input
                  type="text"
                  value={selectedSubject}
                  disabled
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Câu Tiếng Anh (English):</label>
                <input
                  type="text"
                  value={newPhraseEn}
                  onChange={(e) => setNewPhraseEn(e.target.value)}
                  placeholder="Ví dụ: Let us work together to complete our project."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-300 font-medium focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Bản dịch Tiếng Việt:</label>
                <input
                  type="text"
                  value={newPhraseVi}
                  onChange={(e) => setNewPhraseVi(e.target.value)}
                  placeholder="Ví dụ: Chúng mình hãy cùng nhau hoàn thành dự án nhé."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSentenceModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow"
                >
                  Lưu Vào Lớp Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. MODAL: ADD NEW LESSON & AI TRANSLATION                           */}
      {/* =================================================================== */}
      {showAddLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-slate-200">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Thêm Bài Học Mới & Chuyển Ngữ Song Ngữ Bằng AI</span>
            </h3>

            <form onSubmit={handleCreateAndTranslateLesson} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Môn học:</label>
                <input
                  type="text"
                  value={selectedSubject}
                  disabled
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Chủ đề / Bài học:</label>
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Ví dụ: Chủ đề 2: Khám phá thế giới động vật"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tên bài học tiếng Việt:</label>
                <input
                  type="text"
                  value={newTitleVi}
                  onChange={(e) => setNewTitleVi(e.target.value)}
                  placeholder="Ví dụ: Vòng tuần hoàn của nước trong tự nhiên"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Nội dung bài học tiếng Việt:</label>
                <textarea
                  rows={5}
                  value={newContentVi}
                  onChange={(e) => setNewContentVi(e.target.value)}
                  placeholder="Dán nội dung giáo trình theo bộ sách Kết Nối Tri Thức Với Cuộc Sống..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLessonModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isTranslating}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold shadow"
                >
                  {isTranslating ? 'AI Đang Dịch Song Ngữ...' : 'AI Dịch & Tạo Giọng Đọc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 8. MODAL: TEACHER EDIT BILINGUAL LESSON & TERMINOLOGY               */}
      {/* =================================================================== */}
      {showEditLessonModal && editLessonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Chỉnh Sửa Bản Dịch & Danh Mục Thuật Ngữ (Lớp {currentUser?.className || 'Học'})</span>
              </h3>
              <button
                onClick={() => setShowEditLessonModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedLesson} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tên bài học tiếng Việt:</label>
                  <input
                    type="text"
                    value={editLessonData.titleVi}
                    onChange={(e) => setEditLessonData({ ...editLessonData, titleVi: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tên bài học tiếng Anh (English Title):</label>
                  <input
                    type="text"
                    value={editLessonData.titleEn}
                    onChange={(e) => setEditLessonData({ ...editLessonData, titleEn: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-cyan-300 font-medium focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chủ đề / Bài (Unit):</label>
                <input
                  type="text"
                  value={editLessonData.unit}
                  onChange={(e) => setEditLessonData({ ...editLessonData, unit: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Bản dịch Tiếng Anh Chuẩn Sư Phạm (Giáo viên có thể thay thế thuật ngữ riêng theo trường):
                </label>
                <textarea
                  rows={4}
                  value={editLessonData.contentEn}
                  onChange={(e) => setEditLessonData({ ...editLessonData, contentEn: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-cyan-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nội dung bài học Tiếng Việt:</label>
                <textarea
                  rows={3}
                  value={editLessonData.contentVi}
                  onChange={(e) => setEditLessonData({ ...editLessonData, contentVi: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {/* Key Academic Vocabulary List */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Thuật Ngữ Then Chốt (Key Vocabulary - {editLessonData.keyVocabulary.length} từ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditLessonData({
                        ...editLessonData,
                        keyVocabulary: [
                          ...editLessonData.keyVocabulary,
                          { word: '', phonetic: '', vietnamese: '', example: '' },
                        ],
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 text-xs font-semibold flex items-center space-x-1 border border-cyan-500/30"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm từ mới</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editLessonData.keyVocabulary.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                    >
                      <input
                        type="text"
                        placeholder="Từ tiếng Anh (Word)"
                        value={v.word}
                        onChange={(e) => {
                          const updated = [...editLessonData.keyVocabulary];
                          updated[idx].word = e.target.value;
                          setEditLessonData({ ...editLessonData, keyVocabulary: updated });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-cyan-300 font-bold focus:outline-none"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Phiên âm IPA (/.../)"
                        value={v.phonetic}
                        onChange={(e) => {
                          const updated = [...editLessonData.keyVocabulary];
                          updated[idx].phonetic = e.target.value;
                          setEditLessonData({ ...editLessonData, keyVocabulary: updated });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-300 font-mono focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Nghĩa tiếng Việt"
                        value={v.vietnamese}
                        onChange={(e) => {
                          const updated = [...editLessonData.keyVocabulary];
                          updated[idx].vietnamese = e.target.value;
                          setEditLessonData({ ...editLessonData, keyVocabulary: updated });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 focus:outline-none"
                        required
                      />
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          placeholder="Ví dụ minh họa"
                          value={v.example}
                          onChange={(e) => {
                            const updated = [...editLessonData.keyVocabulary];
                            updated[idx].example = e.target.value;
                            setEditLessonData({ ...editLessonData, keyVocabulary: updated });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-400 flex-1 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editLessonData.keyVocabulary.filter((_, i) => i !== idx);
                            setEditLessonData({ ...editLessonData, keyVocabulary: updated });
                          }}
                          className="p-1 rounded bg-rose-950/60 text-rose-400 hover:bg-rose-900 transition"
                          title="Xóa từ này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bilingual Phrases */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mẫu Câu Luyện Nói & Giao Tiếp ({editLessonData.bilingualPhrases.length} câu)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditLessonData({
                        ...editLessonData,
                        bilingualPhrases: [...editLessonData.bilingualPhrases, { en: '', vi: '' }],
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-semibold flex items-center space-x-1 border border-indigo-500/30"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm câu mới</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editLessonData.bilingualPhrases.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center"
                    >
                      <input
                        type="text"
                        placeholder="Câu Tiếng Anh (English phrase)"
                        value={p.en}
                        onChange={(e) => {
                          const updated = [...editLessonData.bilingualPhrases];
                          updated[idx].en = e.target.value;
                          setEditLessonData({ ...editLessonData, bilingualPhrases: updated });
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-cyan-300 font-semibold focus:outline-none"
                        required
                      />
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          placeholder="Bản dịch Tiếng Việt"
                          value={p.vi}
                          onChange={(e) => {
                            const updated = [...editLessonData.bilingualPhrases];
                            updated[idx].vi = e.target.value;
                            setEditLessonData({ ...editLessonData, bilingualPhrases: updated });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 flex-1 focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editLessonData.bilingualPhrases.filter((_, i) => i !== idx);
                            setEditLessonData({ ...editLessonData, bilingualPhrases: updated });
                          }}
                          className="p-1 rounded bg-rose-950/60 text-rose-400 hover:bg-rose-900 transition"
                          title="Xóa câu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 italic">
                  * Dữ liệu chỉnh sửa sẽ được lưu riêng vào phân vùng lớp học và tự động đồng bộ.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEditLessonModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition"
                  >
                    Lưu Thay Đổi & Tự Động Lưu Lớp
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 9. STICKY DOCKED BOTTOM AUDIO PLAYER TOOLBAR                        */}
      {/* =================================================================== */}
      {currentLesson && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3 shadow-2xl shadow-cyan-950/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom duration-300">
          {/* Left: Waveform & Currently Reading Track */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                playbackState === 'playing'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-cyan-400 border-slate-800'
              }`}
            >
              {playbackState === 'playing' ? (
                <div className="flex items-center space-x-0.5">
                  <span className="w-1 h-3 bg-emerald-400 animate-pulse rounded-full" />
                  <span className="w-1 h-4 bg-emerald-300 animate-pulse delay-75 rounded-full" />
                  <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150 rounded-full" />
                </div>
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </div>

            <div className="truncate">
              <div className="font-bold text-white truncate max-w-[220px] sm:max-w-xs">
                {currentLesson.titleVi}
              </div>
              <div className="text-[11px] text-cyan-300 flex items-center space-x-1.5">
                <span className="font-semibold">
                  {playbackState === 'playing'
                    ? `Đang đọc (${activeSpeechLang === 'en' ? 'English' : 'Tiếng Việt'})`
                    : playbackState === 'paused'
                    ? 'Đang tạm dừng'
                    : 'Sẵn sàng phát giọng đọc'}
                </span>
                {activeSentenceIndex >= 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/30 text-[10px]">
                    Câu {activeSentenceIndex + 1}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: 3 Control Buttons */}
          <div className="flex items-center space-x-2">
            {/* Play Button */}
            <button
              onClick={playReading}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold transition shadow ${
                playbackState === 'playing'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title="Đọc / Phát"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{playbackState === 'playing' ? 'Đang Phát' : 'Phát'}</span>
            </button>

            {/* Pause / Resume Button */}
            <button
              onClick={togglePauseResume}
              disabled={playbackState === 'idle'}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                playbackState === 'idle'
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : playbackState === 'paused'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
              }`}
              title="Tạm dừng hoặc tiếp tục từ câu đang dở"
            >
              {playbackState === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tiếp tục</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Tạm dừng</span>
                </>
              )}
            </button>

            {/* Stop Button */}
            <button
              onClick={stopReading}
              disabled={playbackState === 'idle'}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                playbackState === 'idle'
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow'
              }`}
              title="Dừng hẳn và đưa con trỏ về đầu"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Dừng</span>
            </button>
          </div>

          {/* Right: Speed Slider & Mode Selector */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-cyan-400">{speechRate.toFixed(2)}x</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-16 accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                title={`Tốc độ đọc: ${speechRate}x`}
              />
            </div>

            <select
              value={ttsMode}
              onChange={(e) => setTtsMode(e.target.value as any)}
              disabled={playbackState !== 'idle'}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-slate-200 font-semibold focus:outline-none"
            >
              <option value="both">Song Ngữ (EN+VI)</option>
              <option value="en">Chỉ EN</option>
              <option value="vi">Chỉ VI</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
