// ============================================
// LOẠI KỲ THI
// ============================================
export enum ExamMode {
  Vao10 = 'vao10',         // Thi tuyển sinh vào lớp 10
  TotNghiep = 'totnghiep', // Thi tốt nghiệp THPT
}

// ============================================
// HÌNH THỨC ĐỀ THI (cho Vào 10)
// ============================================
export enum ExamFormat {
  TuLuan = 'tuluan',           // Tự luận truyền thống (120 phút)
  TracNghiem = 'tracnghiem',   // Trắc nghiệm 3 phần: Nhiều lựa chọn + Đúng-Sai + Trả lời ngắn (90 phút)
}

// ============================================
// MỨC ĐỘ KHÓ
// ============================================
export enum Difficulty {
  Mixed = 'Kết hợp (Chuẩn cấu trúc)',
  Recall = 'Nhận biết',
  Understanding = 'Thông hiểu',
  Application = 'Vận dụng',
  AdvancedApplication = 'Vận dụng cao',
}

// ============================================
// AI MODEL
// ============================================
export type AIModelId = 'gemini-2.5-flash' | 'gemini-2.5-pro-preview-06-05' | 'gemini-2.0-flash' | 'gemini-2.5-flash-lite' | 'gemini-3-flash-preview';

// ============================================
// FILE ĐÃ TẢI LÊN
// ============================================
export interface UploadedFile {
  name: string;
  base64: string;     // base64 data (không kèm header data:...)
  mimeType: string;   // image/jpeg, image/png, application/pdf, text/plain...
  size: number;       // bytes
}

// ============================================
// YÊU CẦU TẠO ĐỀ
// ============================================
export interface ExamRequest {
  examMode: ExamMode;
  examFormat: ExamFormat;      // Tự luận hoặc Trắc nghiệm (cho Vào 10)
  difficulty: Difficulty;
  customRequirements: string;
  model: AIModelId;
  // File uploads
  sampleExamFiles: UploadedFile[];     // Đề mẫu
  referenceFiles: UploadedFile[];      // Tài liệu tham khảo (file)
  referenceUrls: string[];             // Tài liệu tham khảo (link/URL)
}

// ============================================
// NGÂN HÀNG CÂU HỎI
// ============================================
export interface BankQuestion {
  id: string;
  content: string;              // Nội dung câu hỏi (hỗ trợ LaTeX)
  options?: string[];           // Phương án trả lời (nếu trắc nghiệm)
  answer: string;               // Đáp án / lời giải
  topic: string;                // Chủ đề (VD: "Hàm số", "Đạo hàm")
  grade: '10' | '12';          // Khối lớp
  level: 'NB' | 'TH' | 'VD' | 'VDC';  // Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao
  tags: string[];               // Tags tự do
  createdAt: string;            // ISO date
  updatedAt: string;
}

// ============================================
// ĐỀ THI ĐÃ LƯU
// ============================================
export interface SavedExam {
  id: string;
  title: string;                // Tiêu đề (tự động + có thể đổi)
  examContent: string;          // Nội dung đề
  answersContent: string;       // Đáp án (có thể rỗng)
  examMode: ExamMode;
  examFormat: ExamFormat;
  difficulty: string;
  model: string;
  createdAt: string;            // ISO date
}
