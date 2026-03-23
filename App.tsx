import React, { useState, useCallback, useEffect, useRef } from 'react';
import { InputForm } from './components/InputForm';
import { ExamDisplay } from './components/ExamDisplay';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ExamMode, ExamFormat, Difficulty, ExamRequest, UploadedFile } from './types';
import { generateExamOnly, generateAnswers } from './services/geminiService';
import { apiKeyManager } from './services/apiKeyManager';

// ============================================
// SESSION PERSISTENCE — Constants
// ============================================
const SESSION_SAVE_KEY = 'edugenvn_session_data';

interface SessionData {
  request: {
    examMode: ExamMode;
    examFormat: ExamFormat;
    difficulty: Difficulty;
    customRequirements: string;
    model: string;
    // File data KHÔNG lưu (quá nặng) — chỉ lưu flag
    hasSampleFiles: boolean;
    hasRefFiles: boolean;
  };
  examContent: string;
  answersContent: string;
  savedAt: string;
}

const App: React.FC = () => {
  // ====== State: Yêu cầu tạo đề ======
  const [request, setRequest] = useState<ExamRequest>({
    examMode: ExamMode.Vao10,
    examFormat: ExamFormat.TracNghiem,
    difficulty: Difficulty.Mixed,
    customRequirements: '',
    model: 'gemini-2.5-flash',
    sampleExamFiles: [],
    referenceFiles: [],
  });

  // ====== State: Kết quả — TÁCH ĐỀ và ĐÁP ÁN ======
  const [examContent, setExamContent] = useState<string>('');
  const [answersContent, setAnswersContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // ====== State: API Key ======
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  // ====== State: Session Persistence ======
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [pendingSession, setPendingSession] = useState<SessionData | null>(null);
  const [sessionSavedAt, setSessionSavedAt] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ====== State: Retry tracking ======
  const [lastAction, setLastAction] = useState<'generate' | 'answers' | null>(null);

  // ============================================
  // KHỞI TẠO
  // ============================================
  useEffect(() => {
    // 1. Load API Key
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      apiKeyManager.registerKey(storedKey, 'Key chính');
    } else {
      setIsApiKeyModalOpen(true);
    }

    // 2. Kiểm tra phiên đã lưu
    try {
      const saved = localStorage.getItem(SESSION_SAVE_KEY);
      if (saved) {
        const data: SessionData = JSON.parse(saved);
        if (data.examContent && data.examContent.length > 50) {
          setPendingSession(data);
          setShowRestoreModal(true);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_SAVE_KEY);
    }
  }, []);

  // ============================================
  // SESSION PERSISTENCE — Auto-save (debounced 3s)
  // ============================================
  const saveSession = useCallback(() => {
    if (!examContent) return;

    try {
      const sessionData: SessionData = {
        request: {
          examMode: request.examMode,
          examFormat: request.examFormat,
          difficulty: request.difficulty,
          customRequirements: request.customRequirements,
          model: request.model,
          hasSampleFiles: request.sampleExamFiles.length > 0,
          hasRefFiles: request.referenceFiles.length > 0,
        },
        examContent,
        answersContent,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(SESSION_SAVE_KEY, JSON.stringify(sessionData));
      setSessionSavedAt(sessionData.savedAt);
      console.log('💾 Đã lưu phiên');
    } catch (e) {
      console.warn('Không thể lưu phiên:', e);
    }
  }, [examContent, answersContent, request]);

  // Auto-save khi examContent hoặc answersContent thay đổi
  useEffect(() => {
    if (!examContent || isGenerating || isGeneratingAnswers) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSession(), 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [examContent, answersContent, saveSession, isGenerating, isGeneratingAnswers]);

  // Khôi phục phiên
  const restoreSession = (data: SessionData) => {
    setRequest((prev) => ({
      ...prev,
      examMode: data.request.examMode,
      examFormat: data.request.examFormat,
      difficulty: data.request.difficulty,
      customRequirements: data.request.customRequirements,
      model: data.request.model as any,
    }));
    setExamContent(data.examContent);
    setAnswersContent(data.answersContent);
    setSessionSavedAt(data.savedAt);
  };

  // Xóa phiên
  const clearSession = () => {
    localStorage.removeItem(SESSION_SAVE_KEY);
    setSessionSavedAt(null);
  };

  // ============================================
  // LƯU API KEY
  // ============================================
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    apiKeyManager.registerKey(key, 'Key chính');
    setIsApiKeyModalOpen(false);

    // Nếu đang lỗi → clear error khi đổi key
    if (error) {
      setError(null);
    }
  };

  // Thay đổi field trong request
  const handleInputChange = useCallback((field: keyof ExamRequest, value: any) => {
    setRequest((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Thay đổi file upload
  const handleFilesChange = useCallback((type: 'sampleExamFiles' | 'referenceFiles', files: UploadedFile[]) => {
    setRequest((prev) => ({ ...prev, [type]: files }));
  }, []);

  // ============================================
  // HELPER: Parse lỗi API → loại lỗi
  // ============================================
  const parseApiError = (err: any): 'QUOTA_EXCEEDED' | 'RATE_LIMIT' | 'OTHER' => {
    const msg = (err?.message || err?.toString() || '').toLowerCase();
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('resource_exhausted')) {
      return 'RATE_LIMIT';
    }
    if (msg.includes('quota') || msg.includes('exceeded')) {
      return 'QUOTA_EXCEEDED';
    }
    return 'OTHER';
  };

  // ============================================
  // BƯỚC 1: TẠO ĐỀ BÀI (có auto-rotation)
  // ============================================
  const handleGenerate = async () => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    if (request.sampleExamFiles.length === 0 && request.referenceFiles.length === 0) {
      setError('Vui lòng tải lên ít nhất 1 file đề mẫu hoặc tài liệu tham khảo.');
      return;
    }

    setIsGenerating(true);
    setExamContent('');
    setAnswersContent('');
    setError(null);
    setStatusMessage('Đang tạo đề bài...');
    setLastAction('generate');

    try {
      const result = await generateExamOnly(
        request,
        apiKey,
        (msg) => setStatusMessage(msg),
      );
      setExamContent(result);
      setStatusMessage('');
    } catch (err: any) {
      const errorType = parseApiError(err);

      // Thử xoay key tự động
      if (errorType === 'RATE_LIMIT' || errorType === 'QUOTA_EXCEEDED') {
        const rotation = apiKeyManager.markKeyError(apiKey, errorType);
        if (rotation.success && rotation.newKey) {
          console.log(`🔄 Auto-rotation: ${rotation.message}`);
          setApiKey(rotation.newKey);
          localStorage.setItem('gemini_api_key', rotation.newKey);
          setStatusMessage(`${rotation.message} — Đang thử lại...`);

          // Retry với key mới
          try {
            const result = await generateExamOnly(
              request,
              rotation.newKey,
              (msg) => setStatusMessage(msg),
            );
            setExamContent(result);
            setStatusMessage('');
            setIsGenerating(false);
            return;
          } catch (retryErr: any) {
            // Retry cũng thất bại
            setError(`Lỗi sau khi đổi key: ${retryErr.message || 'Không rõ nguyên nhân'}`);
            setIsGenerating(false);
            return;
          }
        }
      }

      const msg = err.message || 'Đã xảy ra lỗi.';
      if (msg.includes('429')) {
        setError('Bị giới hạn tốc độ (rate limit). Thử đổi API key hoặc chờ 1-2 phút.');
      } else if (msg.includes('API Key')) {
        setError(msg);
      } else {
        setError('Lỗi: ' + msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================
  // BƯỚC 2: TẠO ĐÁP ÁN (có auto-rotation)
  // ============================================
  const handleGenerateAnswers = async () => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    if (!examContent) {
      setError('Chưa có đề bài. Hãy tạo đề trước.');
      return;
    }

    setIsGeneratingAnswers(true);
    setAnswersContent('');
    setError(null);
    setStatusMessage('Đang tạo đáp án...');
    setLastAction('answers');

    try {
      const result = await generateAnswers(
        examContent,
        request.examMode,
        request.examFormat,
        request.model,
        apiKey,
        (msg) => setStatusMessage(msg),
      );
      setAnswersContent(result);
      setStatusMessage('');
    } catch (err: any) {
      const errorType = parseApiError(err);

      // Thử xoay key tự động
      if (errorType === 'RATE_LIMIT' || errorType === 'QUOTA_EXCEEDED') {
        const rotation = apiKeyManager.markKeyError(apiKey, errorType);
        if (rotation.success && rotation.newKey) {
          console.log(`🔄 Auto-rotation: ${rotation.message}`);
          setApiKey(rotation.newKey);
          localStorage.setItem('gemini_api_key', rotation.newKey);
          setStatusMessage(`${rotation.message} — Đang thử lại...`);

          try {
            const result = await generateAnswers(
              examContent,
              request.examMode,
              request.examFormat,
              request.model,
              rotation.newKey,
              (msg) => setStatusMessage(msg),
            );
            setAnswersContent(result);
            setStatusMessage('');
            setIsGeneratingAnswers(false);
            return;
          } catch (retryErr: any) {
            setError(`Lỗi sau khi đổi key: ${retryErr.message || 'Không rõ nguyên nhân'}`);
            setIsGeneratingAnswers(false);
            return;
          }
        }
      }

      const msg = err.message || 'Đã xảy ra lỗi.';
      if (msg.includes('429')) {
        setError('Bị giới hạn tốc độ (rate limit). Thử đổi API key hoặc chờ 1-2 phút.');
      } else {
        setError('Lỗi tạo đáp án: ' + msg);
      }
    } finally {
      setIsGeneratingAnswers(false);
    }
  };

  // ============================================
  // RETRY — Thử lại với đổi key
  // ============================================
  const handleRetryWithRotation = () => {
    const rotation = apiKeyManager.rotateToNextKey('manual_retry');
    let keyToUse = apiKey;

    if (rotation.success && rotation.newKey) {
      keyToUse = rotation.newKey;
      setApiKey(keyToUse);
      localStorage.setItem('gemini_api_key', keyToUse);
    } else {
      // Hết key → reset tất cả
      apiKeyManager.resetAllKeys();
      const freshKey = apiKeyManager.getActiveKey();
      if (freshKey) {
        keyToUse = freshKey;
        setApiKey(keyToUse);
        localStorage.setItem('gemini_api_key', keyToUse);
      }
    }

    setError(null);

    // Retry action trước đó
    if (lastAction === 'generate') {
      handleGenerate();
    } else if (lastAction === 'answers') {
      handleGenerateAnswers();
    }
  };

  // ====== Exam mode label cho header ======
  const examModeLabel = request.examMode === ExamMode.Vao10
    ? '📐 Toán vào Lớp 10'
    : '🎓 Toán TN THPT';

  const isAnyLoading = isGenerating || isGeneratingAnswers;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onSave={handleSaveApiKey}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentKey={apiKey}
        forceRequire={!apiKey}
      />

      {/* ====== MODAL KHÔI PHỤC PHIÊN ====== */}
      {showRestoreModal && pendingSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                💾 Khôi phục phiên làm việc
              </h3>
              <p className="text-sm text-teal-100 mt-1">Bạn có đề thi chưa hoàn thành từ phiên trước</p>
            </div>
            <div className="p-6">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-700">
                  <strong>Đã lưu lúc:</strong> {new Date(pendingSession.savedAt).toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {pendingSession.request.examMode === ExamMode.Vao10 ? '📐 Vào lớp 10' : '🎓 TN THPT'}
                  {' • '}
                  {pendingSession.answersContent ? '✅ Có đề + đáp án' : '📝 Có đề bài'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    clearSession();
                    setPendingSession(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium text-sm transition-colors"
                >
                  ✖ Bắt đầu mới
                </button>
                <button
                  onClick={() => {
                    restoreSession(pendingSession);
                    setShowRestoreModal(false);
                    setPendingSession(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-md"
                >
                  ✔ Tiếp tục
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== HEADER ====== */}
      <header className="bg-white border-b border-teal-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-teal-600 to-emerald-500 p-2 rounded-lg shadow-md shadow-teal-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-teal-900 tracking-tight leading-tight">
                TẠO ĐỀ THI TOÁN — EDUGENVN
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 leading-tight">
                Tự động tạo đề thi vào 10 &amp; TN THPT bằng AI Gemini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút lưu/xóa phiên */}
            {examContent && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={saveSession}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-medium text-emerald-700 transition-colors"
                  title="Lưu phiên làm việc"
                >
                  💾 Lưu
                  {sessionSavedAt && (
                    <span className="text-emerald-500">✓</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Xóa phiên đã lưu?')) clearSession();
                  }}
                  className="px-2 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-[10px] font-medium text-red-600 transition-colors"
                  title="Xóa phiên đã lưu"
                >
                  🗑
                </button>
              </div>
            )}

            {/* API Key button */}
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-200 hover:bg-teal-50 text-xs font-medium transition-colors text-teal-700"
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${apiKey ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {apiKey ? 'API Key ✓' : <span className="text-red-500 font-bold">Nhập API Key</span>}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ====== MAIN CONTENT ====== */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: Input Form */}
          <div className="lg:col-span-4">
            <InputForm
              request={request}
              onChange={handleInputChange}
              onFilesChange={handleFilesChange}
              onSubmit={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* RIGHT COLUMN: Output */}
          <div className="lg:col-span-8">
            {/* Error — CẢI TIẾN: thêm nút retry + hướng dẫn */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mt-0.5 min-w-[20px]">
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <div className="flex-1">
                    <p className="font-bold text-sm">Đã xảy ra lỗi</p>
                    <p className="text-xs mt-0.5">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                </div>

                {/* Nút hành động khi lỗi */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="px-3 py-2 bg-white border border-red-200 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                  >
                    🔑 Đổi API Key
                  </button>
                  {lastAction && (
                    <button
                      onClick={handleRetryWithRotation}
                      className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      🔄 Thử lại (đổi key)
                    </button>
                  )}
                </div>

                {/* Hướng dẫn 2 lựa chọn */}
                {lastAction && (
                  <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-3 mt-3 border border-blue-200">
                    <p className="text-xs font-bold text-blue-800 mb-1.5">📋 Bạn có 2 lựa chọn:</p>
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-700">
                        <span className="text-emerald-600 font-bold">1.</span>{' '}
                        Bấm <strong className="text-emerald-700">"🔄 Thử lại (đổi key)"</strong> — hệ thống tự chuyển key dự phòng.
                      </p>
                      <p className="text-[11px] text-slate-700">
                        <span className="text-sky-600 font-bold">2.</span>{' '}
                        Bấm <strong className="text-sky-700">"🔑 Đổi API Key"</strong> — nhập key Gmail khác. Hoặc chờ hôm sau key reset.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading Status */}
            {isAnyLoading && (
              <div className="mb-4 bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
                <svg className="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div>
                  <p className="font-bold text-sm">
                    {isGenerating ? `Đang tạo đề thi ${examModeLabel}` : 'Đang tạo đáp án & lời giải'}
                  </p>
                  <p className="text-xs text-teal-600">{statusMessage}</p>
                </div>
              </div>
            )}

            {/* Content — truyền cả examContent, answersContent, và callback */}
            {examContent ? (
              <ExamDisplay
                examContent={examContent}
                answersContent={answersContent}
                onGenerateAnswers={handleGenerateAnswers}
                isGeneratingAnswers={isGeneratingAnswers}
              />
            ) : !isGenerating ? (
              <div className="h-[500px] lg:h-[700px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-teal-200 rounded-xl bg-white/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40 text-teal-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
                <p className="font-semibold text-teal-800 text-sm">Chưa có đề thi</p>
                <p className="text-xs text-teal-500 mt-1 max-w-xs text-center">
                  Chọn loại kỳ thi, tải lên đề mẫu hoặc tài liệu tham khảo,<br />
                  rồi nhấn <strong>"Tạo Đề Thi Ngay"</strong>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* ====== FOOTER ====== */}
      <footer className="bg-slate-900 text-slate-300 py-6 px-4 mt-auto border-t-4 border-teal-600 no-print">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-4 p-5 bg-gradient-to-r from-teal-900/40 to-emerald-900/40 rounded-2xl border border-teal-500/30">
            <p className="font-bold text-sm md:text-base text-teal-100 mb-2 leading-relaxed">
              TẠO ĐỀ THI TOÁN THÔNG MINH — Vào 10 &amp; TN THPT
            </p>
            <p className="text-xs text-teal-300/80">
              AI phân tích đề mẫu + tài liệu tham khảo → Tạo đề mới chính xác, bám sát cấu trúc
            </p>
          </div>
          <div className="text-xs text-slate-500">
            <p>Phát triển bởi <strong className="text-slate-300">EDUGENVN</strong> — Thầy Trần Hoài Thanh</p>
            <div className="flex items-center justify-center gap-4 mt-1.5">
              <a href="https://www.facebook.com/tranhoaithanhvicko/" target="_blank" rel="noreferrer" className="hover:text-teal-400 transition-colors">
                Facebook: tranhoaithanhvicko
              </a>
              <span className="text-slate-600">•</span>
              <span>Zalo: 0348296773</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
