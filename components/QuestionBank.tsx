import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BankQuestion } from '../types';

// ============================================
// CONSTANTS
// ============================================
const STORAGE_KEY = 'edugenvn_question_bank';
const TOPICS = [
  'Hàm số', 'Đạo hàm', 'Nguyên hàm - Tích phân', 'Hình học không gian',
  'Xác suất - Thống kê', 'Số phức', 'Logarit - Mũ', 'Lượng giác',
  'Tổ hợp - Nhị thức Newton', 'Phương trình bậc hai', 'Hệ phương trình',
  'Bất phương trình', 'Đường tròn', 'Tam giác', 'Tứ giác nội tiếp',
  'Thống kê', 'Căn bậc hai', 'Hàm y=ax²', 'Khác',
];
const LEVELS: { value: BankQuestion['level']; label: string; color: string }[] = [
  { value: 'NB', label: 'Nhận biết', color: 'bg-green-100 text-green-700' },
  { value: 'TH', label: 'Thông hiểu', color: 'bg-blue-100 text-blue-700' },
  { value: 'VD', label: 'Vận dụng', color: 'bg-amber-100 text-amber-700' },
  { value: 'VDC', label: 'Vận dụng cao', color: 'bg-red-100 text-red-700' },
];

// MathJax global
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      startup?: { typeset?: boolean };
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function loadQuestions(): BankQuestion[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveQuestions(questions: BankQuestion[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch (e) {
    alert('Lỗi lưu dữ liệu: localStorage đầy. Hãy xóa bớt câu hỏi cũ.');
  }
}

// ============================================
// COMPONENT
// ============================================
interface QuestionBankProps {
  onClose: () => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({ onClose }) => {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<'all' | '10' | '12'>('all');
  const [filterLevel, setFilterLevel] = useState<'all' | BankQuestion['level']>('all');
  const [filterTopic, setFilterTopic] = useState('all');

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formContent, setFormContent] = useState('');
  const [formOptions, setFormOptions] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formTopic, setFormTopic] = useState(TOPICS[0]);
  const [formGrade, setFormGrade] = useState<'10' | '12'>('10');
  const [formLevel, setFormLevel] = useState<BankQuestion['level']>('NB');
  const [formTags, setFormTags] = useState('');

  const previewRef = useRef<HTMLDivElement>(null);

  // Load questions on mount
  useEffect(() => {
    setQuestions(loadQuestions());
  }, []);

  // MathJax rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.MathJax?.typesetPromise && previewRef.current) {
        window.MathJax.typesetPromise([previewRef.current]).catch(() => {});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formContent, questions, searchQuery]);

  // ============================================
  // CRUD
  // ============================================
  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormContent('');
    setFormOptions('');
    setFormAnswer('');
    setFormTopic(TOPICS[0]);
    setFormGrade('10');
    setFormLevel('NB');
    setFormTags('');
  };

  const handleSave = () => {
    if (!formContent.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    const now = new Date().toISOString();
    const optionsArr = formOptions
      .split('\n')
      .map(o => o.trim())
      .filter(o => o.length > 0);
    const tagsArr = formTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    if (editingId) {
      // Update
      const updated = questions.map(q =>
        q.id === editingId
          ? {
              ...q,
              content: formContent.trim(),
              options: optionsArr.length > 0 ? optionsArr : undefined,
              answer: formAnswer.trim(),
              topic: formTopic,
              grade: formGrade,
              level: formLevel,
              tags: tagsArr,
              updatedAt: now,
            }
          : q
      );
      setQuestions(updated);
      saveQuestions(updated);
    } else {
      // Create
      const newQ: BankQuestion = {
        id: generateId(),
        content: formContent.trim(),
        options: optionsArr.length > 0 ? optionsArr : undefined,
        answer: formAnswer.trim(),
        topic: formTopic,
        grade: formGrade,
        level: formLevel,
        tags: tagsArr,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newQ, ...questions];
      setQuestions(updated);
      saveQuestions(updated);
    }

    resetForm();
  };

  const handleEdit = (q: BankQuestion) => {
    setIsEditing(true);
    setEditingId(q.id);
    setFormContent(q.content);
    setFormOptions(q.options?.join('\n') || '');
    setFormAnswer(q.answer);
    setFormTopic(q.topic);
    setFormGrade(q.grade);
    setFormLevel(q.level);
    setFormTags(q.tags.join(', '));
  };

  const handleDelete = (id: string) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    saveQuestions(updated);
  };

  // ============================================
  // IMPORT / EXPORT
  // ============================================
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngan_hang_cau_hoi_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported: BankQuestion[] = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(imported)) throw new Error('Không phải mảng');
        const valid = imported.filter(q => q.id && q.content);
        const merged = [...valid, ...questions];
        // Remove duplicates by id
        const unique = merged.filter((q, i, arr) => arr.findIndex(x => x.id === q.id) === i);
        setQuestions(unique);
        saveQuestions(unique);
        alert(`Đã import ${valid.length} câu hỏi.`);
      } catch {
        alert('File JSON không hợp lệ.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ============================================
  // FILTER
  // ============================================
  const filteredQuestions = questions.filter(q => {
    if (filterGrade !== 'all' && q.grade !== filterGrade) return false;
    if (filterLevel !== 'all' && q.level !== filterLevel) return false;
    if (filterTopic !== 'all' && q.topic !== filterTopic) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        q.content.toLowerCase().includes(query) ||
        q.answer.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const levelInfo = useCallback(
    (level: BankQuestion['level']) => LEVELS.find(l => l.value === level) || LEVELS[0],
    []
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-[600px]" ref={previewRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-teal-900 flex items-center gap-2">
            📚 Ngân Hàng Câu Hỏi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {questions.length} câu hỏi • Dữ liệu lưu trên trình duyệt
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer font-medium">
            📥 Import
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
          <button
            onClick={handleExportJSON}
            disabled={questions.length === 0}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium disabled:opacity-50"
          >
            📤 Export
          </button>
          <button
            onClick={onClose}
            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md transition-colors font-medium"
          >
            ← Về Tạo Đề
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Form thêm/sửa câu hỏi */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-md border border-teal-100 p-5">
            <h3 className="font-bold text-sm text-teal-800 mb-4">
              {editingId ? '✏️ Sửa câu hỏi' : '➕ Thêm câu hỏi mới'}
            </h3>

            {/* Nội dung câu hỏi */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội dung câu hỏi <span className="text-slate-400">(hỗ trợ LaTeX: $x^2$)</span>
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
                placeholder="VD: Tìm giá trị lớn nhất của hàm số $y = x^3 - 3x + 2$ trên đoạn $[-2, 2]$"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
              />
            </div>

            {/* Phương án (optional) */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phương án <span className="text-slate-400">(mỗi dòng 1 phương án, bỏ trống nếu tự luận)</span>
              </label>
              <textarea
                value={formOptions}
                onChange={(e) => setFormOptions(e.target.value)}
                rows={2}
                placeholder={"A. $y = 4$\nB. $y = 6$\nC. $y = 8$\nD. $y = 10$"}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
              />
            </div>

            {/* Đáp án */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Đáp án / Lời giải
              </label>
              <textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                rows={2}
                placeholder="VD: Đáp án C. Ta có $y' = 3x^2 - 3 = 0 \Rightarrow x = \pm 1$..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
              />
            </div>

            {/* Row: Chủ đề + Khối lớp + Mức độ */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Chủ đề</label>
                <select
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 py-1.5 px-2 text-xs focus:border-teal-500 outline-none"
                >
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Khối lớp</label>
                <select
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value as '10' | '12')}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 py-1.5 px-2 text-xs focus:border-teal-500 outline-none"
                >
                  <option value="10">Lớp 10 (Vào 10)</option>
                  <option value="12">Lớp 12 (TN THPT)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Mức độ</label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value as BankQuestion['level'])}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 py-1.5 px-2 text-xs focus:border-teal-500 outline-none"
                >
                  {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-4">
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Tags <span className="text-slate-400">(cách nhau bởi dấu phẩy)</span></label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="VD: PT bậc 2, Viète, thực tế"
                className="w-full rounded-md border border-slate-300 bg-slate-50 py-1.5 px-2 text-xs focus:border-teal-500 outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold text-xs transition-all shadow-md"
              >
                {editingId ? '💾 Cập nhật' : '➕ Thêm câu hỏi'}
              </button>
              {isEditing && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Danh sách câu hỏi */}
        <div className="lg:col-span-7">
          {/* Search & filters */}
          <div className="bg-white rounded-xl shadow-md border border-teal-100 p-4 mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Tìm kiếm câu hỏi..."
                className="flex-1 min-w-[200px] rounded-lg border border-slate-300 bg-slate-50 py-2 px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value as any)}
                className="rounded-md border border-slate-300 bg-slate-50 py-2 px-2 text-xs focus:border-teal-500 outline-none"
              >
                <option value="all">Tất cả lớp</option>
                <option value="10">Lớp 10</option>
                <option value="12">Lớp 12</option>
              </select>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as any)}
                className="rounded-md border border-slate-300 bg-slate-50 py-2 px-2 text-xs focus:border-teal-500 outline-none"
              >
                <option value="all">Tất cả mức độ</option>
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="rounded-md border border-slate-300 bg-slate-50 py-2 px-2 text-xs focus:border-teal-500 outline-none"
              >
                <option value="all">Tất cả chủ đề</option>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Hiển thị {filteredQuestions.length} / {questions.length} câu hỏi
            </p>
          </div>

          {/* Question list */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-teal-200 p-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm font-semibold text-slate-600">
                  {questions.length === 0 ? 'Chưa có câu hỏi nào' : 'Không tìm thấy câu hỏi phù hợp'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {questions.length === 0 ? 'Thêm câu hỏi bằng form bên trái hoặc Import JSON' : 'Thử thay đổi bộ lọc'}
                </p>
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const lv = levelInfo(q.level);
                return (
                  <div key={q.id} className="bg-white rounded-xl shadow-sm border border-teal-100 p-4 hover:shadow-md transition-shadow">
                    {/* Header: tags + actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lv.color}`}>
                          {lv.label}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Lớp {q.grade}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                          {q.topic}
                        </span>
                        {q.tags.map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">
                            #{t}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(q)}
                          className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors font-medium"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="text-[10px] px-2 py-1 bg-red-50 text-red-500 hover:bg-red-100 rounded transition-colors font-medium"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{q.content}</p>

                    {/* Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-0.5">
                        {q.options.map((opt, i) => (
                          <p key={i} className="text-xs text-slate-600">{opt}</p>
                        ))}
                      </div>
                    )}

                    {/* Answer (collapsible) */}
                    {q.answer && (
                      <details className="mt-2">
                        <summary className="text-xs font-semibold text-emerald-600 cursor-pointer hover:text-emerald-700">
                          📌 Xem đáp án
                        </summary>
                        <p className="text-xs text-slate-600 mt-1 pl-3 border-l-2 border-emerald-200 whitespace-pre-wrap">
                          {q.answer}
                        </p>
                      </details>
                    )}

                    {/* Date */}
                    <p className="text-[9px] text-slate-400 mt-2">
                      {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
