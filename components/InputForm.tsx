import React, { useRef, useState } from 'react';
import { AI_MODELS, DIFFICULTIES } from '../constants';
import { ExamRequest, ExamMode, ExamFormat, Difficulty, AIModelId, UploadedFile } from '../types';

interface InputFormProps {
  request: ExamRequest;
  onChange: (field: keyof ExamRequest, value: any) => void;
  onFilesChange: (type: 'sampleExamFiles' | 'referenceFiles', files: UploadedFile[]) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({
  request,
  onChange,
  onFilesChange,
  onSubmit,
  isGenerating,
}) => {
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Xử lý file upload
  const handleFileUpload = (
    type: 'sampleExamFiles' | 'referenceFiles',
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const inputFiles = event.target.files;
    if (!inputFiles) return;

    const existingFiles = type === 'sampleExamFiles' ? request.sampleExamFiles : request.referenceFiles;
    const newFilesPromises = Array.from(inputFiles).map((file) => {
      return new Promise<UploadedFile | null>((resolve) => {
        // Giới hạn 4MB
        if (file.size > 4 * 1024 * 1024) {
          alert(`File "${file.name}" quá lớn (>4MB). Vui lòng dùng file nhỏ hơn.`);
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Full = e.target?.result as string;
          const [header, base64Data] = base64Full.split(',');
          const mimeType = header.match(/data:(.*?);/)?.[1] || 'application/octet-stream';

          resolve({
            name: file.name,
            base64: base64Data,
            mimeType,
            size: file.size,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newFilesPromises).then((results) => {
      const validFiles = results.filter(Boolean) as UploadedFile[];
      onFilesChange(type, [...existingFiles, ...validFiles]);
    });

    // Reset input
    event.target.value = '';
  };

  // Xóa 1 file
  const removeFile = (type: 'sampleExamFiles' | 'referenceFiles', index: number) => {
    const files = type === 'sampleExamFiles' ? [...request.sampleExamFiles] : [...request.referenceFiles];
    files.splice(index, 1);
    onFilesChange(type, files);
  };

  // Format kích thước file
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + 'B';
    return (bytes / 1024).toFixed(0) + 'KB';
  };

  const hasSampleFiles = request.sampleExamFiles.length > 0;
  const hasRefFiles = request.referenceFiles.length > 0;
  const hasRefUrls = (request.referenceUrls?.length || 0) > 0;
  const canSubmit = (hasSampleFiles || hasRefFiles || hasRefUrls) && !isGenerating;

  // URL input state
  const [urlInput, setUrlInput] = useState('');

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('Vui lòng nhập URL hợp lệ (bắt đầu bằng http:// hoặc https://)');
      return;
    }
    onChange('referenceUrls', [...(request.referenceUrls || []), url]);
    setUrlInput('');
  };

  const removeUrl = (index: number) => {
    const urls = [...(request.referenceUrls || [])];
    urls.splice(index, 1);
    onChange('referenceUrls', urls);
  };

  return (
    <div className="space-y-4">
      {/* ====== LOẠI KỲ THI ====== */}
      <div className="bg-white rounded-xl shadow-md border border-teal-100 p-5">
        <h2 className="text-base font-bold text-teal-800 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Loại kỳ thi
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Vào 10 */}
          <button
            type="button"
            onClick={() => onChange('examMode', ExamMode.Vao10)}
            className={`relative p-4 rounded-xl border-2 transition-all text-left ${
              request.examMode === ExamMode.Vao10
                ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-400/30 shadow-md'
                : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/30'
            }`}
          >
            {request.examMode === ExamMode.Vao10 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
            )}
            <div className="text-2xl mb-1">📐</div>
            <div className="font-bold text-sm text-slate-800">Thi vào Lớp 10</div>
            <div className="text-xs text-slate-500 mt-0.5">Tự luận • 120 phút</div>
          </button>

          {/* TN THPT */}
          <button
            type="button"
            onClick={() => onChange('examMode', ExamMode.TotNghiep)}
            className={`relative p-4 rounded-xl border-2 transition-all text-left ${
              request.examMode === ExamMode.TotNghiep
                ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-400/30 shadow-md'
                : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/30'
            }`}
          >
            {request.examMode === ExamMode.TotNghiep && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs">✓</span>
            )}
            <div className="text-2xl mb-1">🎓</div>
            <div className="font-bold text-sm text-slate-800">TN THPT</div>
            <div className="text-xs text-slate-500 mt-0.5">TN + Đúng-Sai + TL ngắn • 90 phút</div>
          </button>
        </div>

        {/* Hình thức đề — chỉ hiện khi Vào 10 */}
        {request.examMode === ExamMode.Vao10 && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Hình thức đề thi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange('examFormat', ExamFormat.TracNghiem)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  request.examFormat === ExamFormat.TracNghiem
                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400/30'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-800">📋 Trắc nghiệm</div>
                <div className="text-[10px] text-slate-500 mt-0.5">3 phần: TN + Đ/S + TL ngắn • 90p</div>
                <div className="text-[9px] text-teal-600 font-semibold mt-1">Cấu trúc mới 2025</div>
              </button>
              <button
                type="button"
                onClick={() => onChange('examFormat', ExamFormat.TuLuan)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  request.examFormat === ExamFormat.TuLuan
                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400/30'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-800">✍️ Tự luận</div>
                <div className="text-[10px] text-slate-500 mt-0.5">5-7 bài tự luận • 120 phút</div>
                <div className="text-[9px] text-slate-400 font-medium mt-1">Truyền thống</div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====== UPLOAD FILE ====== */}
      <div className="bg-white rounded-xl shadow-md border border-teal-100 p-5">
        <h2 className="text-base font-bold text-teal-800 mb-1 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Tải lên tài liệu
        </h2>
        <p className="text-xs text-slate-500 mb-4">AI phân tích đề mẫu lấy cấu trúc + dùng tài liệu tham khảo để ra câu hỏi cùng dạng</p>

        <div className="grid grid-cols-1 gap-3">
          {/* === Đề mẫu === */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-teal-400 hover:bg-teal-50/30 ${
              hasSampleFiles ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200'
            }`}
            onClick={() => sampleInputRef.current?.click()}
          >
            <input
              ref={sampleInputRef}
              type="file"
              accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={(e) => handleFileUpload('sampleExamFiles', e)}
              className="hidden"
            />
            <div className={`text-2xl mb-1 ${hasSampleFiles ? 'text-emerald-500' : 'text-slate-400'}`}>
              {hasSampleFiles ? '✅' : '📝'}
            </div>
            <div className="font-bold text-sm text-slate-700">Đề mẫu</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {hasSampleFiles
                ? `${request.sampleExamFiles.length} file đã tải`
                : 'Ảnh, PDF, DOCX, TXT — Để AI phân tích cấu trúc đề'
              }
            </div>

            {/* Danh sách file đã upload */}
            {hasSampleFiles && (
              <div className="mt-3 text-left space-y-1.5" onClick={(e) => e.stopPropagation()}>
                {request.sampleExamFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-emerald-100 text-xs">
                    <span className="text-emerald-500">📄</span>
                    <span className="flex-1 truncate font-medium text-slate-700">{f.name}</span>
                    <span className="text-slate-400">{formatSize(f.size)}</span>
                    <button
                      onClick={() => removeFile('sampleExamFiles', i)}
                      className="text-red-400 hover:text-red-600 ml-1"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* === Tài liệu tham khảo === */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-teal-400 hover:bg-teal-50/30 ${
              hasRefFiles ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200'
            }`}
            onClick={() => refInputRef.current?.click()}
          >
            <input
              ref={refInputRef}
              type="file"
              accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={(e) => handleFileUpload('referenceFiles', e)}
              className="hidden"
            />
            <div className={`text-2xl mb-1 ${hasRefFiles ? 'text-blue-500' : 'text-slate-400'}`}>
              {hasRefFiles ? '✅' : '📚'}
            </div>
            <div className="font-bold text-sm text-slate-700">Tài liệu tham khảo</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {hasRefFiles
                ? `${request.referenceFiles.length} file đã tải`
                : 'Ảnh, PDF, DOCX, TXT — Chứa dạng bài, công thức, bài tập mẫu'
              }
            </div>

            {hasRefFiles && (
              <div className="mt-3 text-left space-y-1.5" onClick={(e) => e.stopPropagation()}>
                {request.referenceFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-blue-100 text-xs">
                    <span className="text-blue-500">📄</span>
                    <span className="flex-1 truncate font-medium text-slate-700">{f.name}</span>
                    <span className="text-slate-400">{formatSize(f.size)}</span>
                    <button
                      onClick={() => removeFile('referenceFiles', i)}
                      className="text-red-400 hover:text-red-600 ml-1"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* === Liên kết tham khảo === */}
          <div className="bg-white/80 rounded-xl p-4 border border-indigo-100">
            <div className="font-bold text-sm text-slate-700 mb-1 flex items-center gap-1.5">
              🔗 Liên kết tham khảo
            </div>
            <p className="text-[10px] text-slate-500 mb-3">Dán link bài viết, đề thi online, tài liệu web</p>

            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={addUrl}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
              >
                Thêm
              </button>
            </div>

            {hasRefUrls && (
              <div className="space-y-1.5">
                {request.referenceUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-indigo-100 text-xs">
                    <span className="text-indigo-500">🔗</span>
                    <a href={url} target="_blank" rel="noreferrer" className="flex-1 truncate font-medium text-indigo-600 hover:underline">{url}</a>
                    <button
                      onClick={() => removeUrl(i)}
                      className="text-red-400 hover:text-red-600 ml-1"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== MODEL + YÊU CẦU RIÊNG ====== */}
      <div className="bg-white rounded-xl shadow-md border border-teal-100 p-5">
        <h2 className="text-base font-bold text-teal-800 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Tuỳ chỉnh
        </h2>

        {/* Model */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">Mô hình AI</label>
          <div className="flex flex-wrap gap-2">
            {AI_MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => onChange('model', model.id)}
                className={`relative px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                  request.model === model.id
                    ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-teal-300'
                }`}
              >
                {model.badge && (
                  <span className={`absolute -top-2 -right-1 text-white text-[9px] font-bold px-1.5 py-0 rounded-full ${model.badge === 'Mới' ? 'bg-blue-500' : 'bg-rose-500'}`}>
                    {model.badge}
                  </span>
                )}
                <div>{model.name}</div>
                {model.cost && (
                  <div className={`text-[9px] font-normal mt-0.5 ${request.model === model.id ? 'text-teal-600' : 'text-slate-400'}`}>
                    {model.cost}
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            {request.model === 'gemini-2.5-flash-lite'
              ? '💡 Flash-Lite rẻ nhất, phù hợp đề trắc nghiệm đơn giản.'
              : request.model === 'gemini-3-flash-preview'
                ? '🚀 Gemini 3 Flash: reasoning frontier-class, đề chất lượng cao nhất.'
                : request.model === 'gemini-2.5-pro-preview-06-05'
                  ? '💎 Pro: tư duy sâu nhất, phù hợp đề vận dụng cao. Chi phí cao hơn ~4x.'
                  : '🔄 Nếu model quá tải, hệ thống tự động chuyển sang model dự phòng.'}
          </p>
        </div>

        {/* Mức độ */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">Mức độ chủ đạo</label>
          <select
            value={request.difficulty}
            onChange={(e) => onChange('difficulty', e.target.value as Difficulty)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm text-slate-800 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 outline-none transition-all"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Yêu cầu riêng */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Yêu cầu riêng <span className="text-slate-400 font-normal">(tùy chọn)</span>
          </label>
          <textarea
            value={request.customRequirements}
            onChange={(e) => onChange('customRequirements', e.target.value)}
            rows={3}
            placeholder="Ví dụ: Tập trung hình học không gian, thêm câu xác suất, tránh câu lượng giác..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 px-3 text-sm text-slate-800 focus:border-teal-500 focus:ring-teal-500 focus:ring-1 outline-none transition-all resize-none"
          />
        </div>
      </div>

      {/* ====== NÚT TẠO ĐỀ ====== */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold text-base transition-all duration-200 shadow-lg ${
          canSubmit
            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-teal-500/30 transform hover:-translate-y-0.5 active:translate-y-0'
            : 'bg-slate-400 cursor-not-allowed shadow-none'
        }`}
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tạo đề thi...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M15 4V2"></path><path d="M15 16v-2"></path><path d="M8 9h2"></path><path d="M20 9h2"></path>
              <path d="M17.8 11.8 19 13"></path><path d="M15 9h.01"></path><path d="M17.8 6.2 19 5"></path>
              <path d="m3 21 9-9"></path><path d="M12.2 6.2 11 5"></path>
            </svg>
            Tạo Đề Thi Ngay
          </>
        )}
      </button>

      {/* ====== GHI CHÚ ====== */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <h4 className="text-teal-900 font-bold text-xs mb-1.5 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Cách hoạt động
        </h4>
        <ul className="text-[11px] text-teal-800 space-y-1 font-medium leading-relaxed">
          <li>📝 <strong>Đề mẫu:</strong> AI phân tích cấu trúc (số câu, phân bố, mức độ) → tạo đề mới giống cấu trúc</li>
          <li>📚 <strong>Tài liệu TK:</strong> AI lấy dạng bài, phương pháp giải → tạo câu hỏi cùng dạng, số liệu mới</li>
          <li>🔄 Hệ thống <strong>tự động chuyển model</strong> nếu gặp lỗi</li>
        </ul>
      </div>
    </div>
  );
};
