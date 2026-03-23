import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onClose: () => void;
  currentKey: string;
  forceRequire: boolean; // Nếu true, không cho đóng modal nếu chưa có key
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose, currentKey, forceRequire }) => {
  const [inputKey, setInputKey] = useState(currentKey);

  useEffect(() => {
    setInputKey(currentKey);
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Tự động làm sạch key: Xóa khoảng trắng và các ký tự không phải ASCII (tiếng Việt, emoji...)
    const cleanKey = inputKey.replace(/[^\x00-\x7F]/g, "").trim();
    
    if (cleanKey) {
      onSave(cleanKey);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Cấu hình API Key
          </h3>
          {!forceRequire && (
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>
        
        <div className="p-6">
          <p className="text-slate-600 mb-4 text-sm leading-relaxed">
            Ứng dụng sử dụng <strong>Google Gemini API</strong>. Để bắt đầu, bạn cần nhập API Key của riêng mình. Key được lưu an toàn trên trình duyệt của bạn.
          </p>

          <div className="mb-4 bg-teal-50 border border-teal-100 rounded-lg p-3 text-sm text-teal-800">
            <p className="font-semibold mb-1">Chưa có API Key?</p>
             <p className="mb-2">
              1. Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold hover:text-teal-600">Google AI Studio</a> để lấy key miễn phí.
            </p>
             <p>
              2. Hoặc xem <a href="https://drive.google.com/drive/folders/1G6eiVeeeEvsYgNk2Om7FEybWf30EP1HN?usp=drive_link" target="_blank" rel="noreferrer" className="underline font-bold text-rose-600 hover:text-rose-700">HƯỚNG DẪN CHI TIẾT TẠI ĐÂY</a>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Dán API Key vào đây (Tắt bộ gõ Tiếng Việt nếu nhập lỗi)
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              disabled={!inputKey.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:bg-slate-400 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md transition-all transform active:scale-[0.98]"
            >
              Lưu & Bắt Đầu
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};