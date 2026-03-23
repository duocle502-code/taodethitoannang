import React, { useState, useEffect, useRef } from 'react';
import { SavedExam } from '../types';

const STORAGE_KEY = 'edugenvn_exam_history';

// MathJax global
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      startup?: { typeset?: boolean };
    };
  }
}

function loadExams(): SavedExam[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveExams(exams: SavedExam[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
  } catch {
    alert('Lỗi lưu: localStorage đầy. Xóa bớt đề cũ.');
  }
}

interface ExamHistoryProps {
  onClose: () => void;
  onLoadExam: (exam: SavedExam) => void;
}

export const ExamHistory: React.FC<ExamHistoryProps> = ({ onClose, onLoadExam }) => {
  const [exams, setExams] = useState<SavedExam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExams(loadExams());
  }, []);

  // MathJax render
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.MathJax?.typesetPromise && containerRef.current) {
        window.MathJax.typesetPromise([containerRef.current]).catch(() => {});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [expandedId, exams]);

  const handleDelete = (id: string) => {
    if (!confirm('Xóa đề thi này?')) return;
    const updated = exams.filter(e => e.id !== id);
    setExams(updated);
    saveExams(updated);
  };

  const handleRename = (id: string) => {
    const exam = exams.find(e => e.id === id);
    if (!exam) return;
    const newTitle = prompt('Đổi tên đề thi:', exam.title);
    if (!newTitle || !newTitle.trim()) return;
    const updated = exams.map(e => e.id === id ? { ...e, title: newTitle.trim() } : e);
    setExams(updated);
    saveExams(updated);
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(exams, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lich_su_de_thi_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported: SavedExam[] = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(imported)) throw new Error();
        const valid = imported.filter(ex => ex.id && ex.examContent);
        const merged = [...valid, ...exams];
        const unique = merged.filter((ex, i, arr) => arr.findIndex(x => x.id === ex.id) === i);
        setExams(unique);
        saveExams(unique);
        alert(`Đã import ${valid.length} đề thi.`);
      } catch {
        alert('File JSON không hợp lệ.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredExams = searchQuery
    ? exams.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.examContent.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : exams;

  const modeLabel = (mode: string) => mode === 'vao10' ? 'Vào 10' : 'TN THPT';
  const formatLabel = (f: string) => f === 'tuluan' ? 'Tự luận' : 'Trắc nghiệm';

  return (
    <div ref={containerRef} className="min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-teal-900 flex items-center gap-2">
            📋 Lịch Sử Đề Thi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {exams.length} đề thi đã lưu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-colors cursor-pointer font-medium">
            📥 Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={handleExportAll}
            disabled={exams.length === 0}
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

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Tìm kiếm đề thi..."
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none shadow-sm"
        />
      </div>

      {/* Exam list */}
      <div className="space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar pr-1">
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-teal-200 p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-semibold text-slate-600">
              {exams.length === 0 ? 'Chưa có đề thi nào được lưu' : 'Không tìm thấy đề thi phù hợp'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {exams.length === 0 ? 'Tạo đề mới rồi bấm "💾 Lưu đề thi" để lưu trữ' : 'Thử từ khóa khác'}
            </p>
          </div>
        ) : (
          filteredExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card header */}
              <div className="px-4 py-3 flex items-start justify-between gap-2">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === exam.id ? null : exam.id)}
                >
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    📄 {exam.title}
                    <span className="text-[10px] font-normal text-slate-400">
                      {expandedId === exam.id ? '▲' : '▼'}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                      {modeLabel(exam.examMode)}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      {formatLabel(exam.examFormat)}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {exam.difficulty}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                      {exam.model}
                    </span>
                    {exam.answersContent && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                        ✅ Có đáp án
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(exam.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onLoadExam(exam)}
                    className="text-[10px] px-2.5 py-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors font-bold"
                    title="Mở lại đề thi"
                  >
                    📂 Mở
                  </button>
                  <button
                    onClick={() => handleRename(exam.id)}
                    className="text-[10px] px-2 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors font-medium"
                    title="Đổi tên"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="text-[10px] px-2 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded transition-colors font-medium"
                    title="Xóa"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Expanded content preview */}
              {expandedId === exam.id && (
                <div className="border-t border-teal-100 px-4 py-3 bg-slate-50/50">
                  <div className="text-xs font-bold text-teal-700 mb-2">📝 Xem trước đề bài:</div>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar bg-white rounded-lg p-3 border border-slate-200">
                    {exam.examContent.slice(0, 2000)}
                    {exam.examContent.length > 2000 && '\n\n... (bấm "Mở" để xem đầy đủ)'}
                  </pre>
                  {exam.answersContent && (
                    <details className="mt-2">
                      <summary className="text-xs font-bold text-emerald-600 cursor-pointer">📌 Xem đáp án</summary>
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar bg-white rounded-lg p-3 border border-emerald-100 mt-1">
                        {exam.answersContent.slice(0, 1500)}
                        {exam.answersContent.length > 1500 && '\n\n...'}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
// ============================================
// UTILITY FUNCTIONS (exported)
// ============================================

export function saveExamToHistory(exam: SavedExam): void {
  const exams = loadExams();
  exams.unshift(exam);
  if (exams.length > 50) exams.pop();
  saveExams(exams);
}

export function updateExamInHistory(id: string, updates: Partial<SavedExam>): void {
  const exams = loadExams();
  const idx = exams.findIndex((e) => e.id === id);
  if (idx >= 0) {
    exams[idx] = { ...exams[idx], ...updates };
    saveExams(exams);
  }
}
