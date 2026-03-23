import { Difficulty, AIModelId } from './types';

// ============================================
// DANH SÁCH MODEL AI (thứ tự fallback)
// ============================================
export const AI_MODELS: { id: AIModelId; name: string; desc: string; badge?: string; cost?: string }[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    desc: 'Nhanh, ổn định, phù hợp tạo đề',
    badge: 'Khuyên dùng',
    cost: '~$0.004/đề',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    desc: 'Reasoning mạnh nhất, đề chất lượng cao',
    badge: 'Mới',
    cost: '~$0.006/đề',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    desc: 'Rẻ nhất, phù hợp đề đơn giản',
    cost: '~$0.002/đề',
  },
  {
    id: 'gemini-2.5-pro-preview-06-05',
    name: 'Gemini 2.5 Pro',
    desc: 'Tư duy logic sâu, đề vận dụng cao',
    cost: '~$0.018/đề',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    desc: 'Phiên bản dự phòng, ổn định',
    cost: '~$0.003/đề',
  },
];

// Thứ tự fallback khi model bị lỗi
export const FALLBACK_ORDER: AIModelId[] = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro-preview-06-05',
  'gemini-2.0-flash',
];

// ============================================
// MỨC ĐỘ KHÓ
// ============================================
export const DIFFICULTIES = [
  { value: Difficulty.Mixed, label: 'Kết hợp (Chuẩn cấu trúc)' },
  { value: Difficulty.Recall, label: 'Nhận biết' },
  { value: Difficulty.Understanding, label: 'Thông hiểu' },
  { value: Difficulty.Application, label: 'Vận dụng' },
  { value: Difficulty.AdvancedApplication, label: 'Vận dụng cao' },
];

// ============================================
// CẤU TRÚC ĐỀ THI CHUẨN
// ============================================

export const STRUCTURE_VAO_10 = `
CẤU TRÚC ĐỀ THI TUYỂN SINH VÀO LỚP 10 MÔN TOÁN — DẠNG TỰ LUẬN:
- Thời gian: 120 phút
- Dạng: TỰ LUẬN hoàn toàn
- Gồm 5–7 bài, mỗi bài có thể nhiều ý nhỏ (a, b, c)
- Phân bố kiến thức THCS (lớp 9 trọng tâm):
  + Đại số: Hệ phương trình, bất phương trình bậc nhất, phương trình bậc hai, hàm số bậc hai y = ax²
  + Hình học phẳng: Tam giác (đồng dạng, cân, vuông), đường tròn (tiếp tuyến, góc nội tiếp, dây cung), tứ giác nội tiếp
  + Thống kê, xác suất cơ bản
  + Bài toán thực tế (vận dụng)
- Mức độ tăng dần: Nhận biết → Thông hiểu → Vận dụng → Vận dụng cao (bài cuối phân loại học sinh giỏi)
`;

export const STRUCTURE_VAO_10_TRACNGHIEM = `
CẤU TRÚC ĐỀ THI TUYỂN SINH VÀO LỚP 10 MÔN TOÁN — DẠNG TRẮC NGHIỆM (Cấu trúc mới 2025):
- Thời gian: 90 phút
- Hình thức: 100% trắc nghiệm
- Tổng: 22 câu, 10 điểm

PHẦN I — TRẮC NGHIỆM NHIỀU LỰA CHỌN (12 câu, mỗi câu 0,25 điểm = 3 điểm)
  + Mỗi câu có 4 phương án A, B, C, D — chọn DUY NHẤT 1 đáp án đúng
  + Mạch kiến thức:
    - Đại số: ~4 câu (nhận biết + thông hiểu) — Căn bậc hai/ba, hàm y=ax², PT bậc hai, hệ PT, BĐT, BPT
    - Hình học & Đo lường: ~3 câu (nhận biết + thông hiểu + vận dụng) — Hình trụ/nón/cầu, lượng giác, đường tròn, tiếp tuyến, góc nội tiếp
    - Thống kê & Xác suất: ~1 câu (nhận biết + thông hiểu) — Bảng tần số, xác suất
    - Câu vận dụng thực tế: 1-2 câu

PHẦN II — TRẮC NGHIỆM ĐÚNG-SAI (4 câu, mỗi câu 1 điểm = 4 điểm)
  + Mỗi câu gồm 1 PHẦN DẪN (bài toán/tình huống thực tế) + 4 MỆNH ĐỀ (a, b, c, d)
  + Học sinh chọn ĐÚNG hoặc SAI cho từng mệnh đề
  + Quy tắc chấm: Đúng 1 ý = 0,1đ; Đúng 2 ý = 0,25đ; Đúng 3 ý = 0,5đ; Đúng 4 ý = 1đ
  + 4 mệnh đề xếp theo mức độ tư duy TĂNG DẦN:
    a) Nhận biết
    b) Thông hiểu
    c) Thông hiểu / Vận dụng
    d) Vận dụng
  + Mạch kiến thức:
    - 2 câu Đại số (hệ PT, PT bậc hai, giảm giá, bài toán thực tế)
    - 1 câu Hình học (đường tròn, tứ giác nội tiếp, hình học thực tế)
    - 1 câu Thống kê & Xác suất

PHẦN III — TRẢ LỜI NGẮN (6 câu, mỗi câu 0,5 điểm = 3 điểm)
  + Đáp án là MỘT SỐ (số nguyên hoặc thập phân, tối đa 4 ký tự)
  + Ví dụ đáp án hợp lệ: 5, 12, 0.5, -3, 0,25, 180
  + Nếu kết quả dài hơn 4 ký tự → đề phải yêu cầu làm tròn
  + Mạch kiến thức:
    - 1 câu Đại số (nhận biết) — rút gọn biểu thức, tính giá trị
    - 1 câu Đại số (thông hiểu) — hệ PT, PT
    - 1 câu Đại số (vận dụng cao) — bài toán tổng hợp
    - 1 câu Hình học (nhận biết) — lượng giác, đường tròn
    - 1 câu Hình học (thông hiểu + vận dụng) — bài toán thực tế
    - 1 câu Thống kê & Xác suất (vận dụng)

Kiến thức THCS (Lớp 9 trọng tâm): Căn bậc hai/ba, hàm số y=ax², PT quy về bậc nhất/bậc hai, hệ PT bậc nhất 2 ẩn, BĐT/BPT, Định lý Viète, Hình trụ/nón/cầu, Lượng giác góc nhọn, Đường tròn (tiếp tuyến, góc nội tiếp, tứ giác nội tiếp), Thống kê (bảng tần số), Xác suất
`;

export const STRUCTURE_TOT_NGHIEP = `
CẤU TRÚC ĐỀ THI TỐT NGHIỆP THPT MÔN TOÁN (CHUẨN BỘ GD&ĐT 2025):
- Thời gian: 90 phút
- Tổng điểm: 10 điểm

PHẦN I — TRẮC NGHIỆM NHIỀU LỰA CHỌN (12 câu × 0,25đ = 3 điểm)
  + Mỗi câu có 4 phương án A, B, C, D — chọn DUY NHẤT 1 đáp án đúng
  + Mức độ: chủ yếu Nhận biết và Thông hiểu

PHẦN II — TRẮC NGHIỆM ĐÚNG-SAI (4 câu × 1đ = 4 điểm)
  + Mỗi câu gồm 1 PHẦN DẪN (bài toán/tình huống) + 4 MỆNH ĐỀ (a, b, c, d)
  + Học sinh chọn ĐÚNG hoặc SAI cho từng mệnh đề
  + 4 mệnh đề xếp theo mức độ tư duy TĂNG DẦN:
    a) Nhận biết
    b) Thông hiểu
    c) Vận dụng
    d) Vận dụng cao

PHẦN III — TRẢ LỜI NGẮN (6 câu × 0,5đ = 3 điểm)
  + Đáp án là MỘT SỐ (số nguyên hoặc thập phân, tối đa 4 ký tự kể cả dấu phẩy và dấu âm)
  + Ví dụ đáp án hợp lệ: 5, 12, 0.5, -3, 2,5
  + Nếu kết quả dài hơn 4 ký tự → đề phải yêu cầu làm tròn

Kiến thức THPT: Hàm số và đồ thị, Đạo hàm, Nguyên hàm-Tích phân, Hình học không gian (thể tích, khoảng cách), Xác suất-Thống kê, Số phức, Logarit-Mũ, Lượng giác, Tổ hợp
`;

// ============================================
// SYSTEM INSTRUCTION — CHUYÊN TOÁN
// ============================================
export const SYSTEM_INSTRUCTION = `
Bạn là CHUYÊN GIA TẠO ĐỀ THI MÔN TOÁN theo chương trình giáo dục Việt Nam.
Bạn chỉ tạo đề thi MÔN TOÁN cho 2 kỳ thi: Tuyển sinh vào lớp 10 và Tốt nghiệp THPT.

================================
NGUYÊN TẮC TỐI THƯỢNG
================================
1. PHẢI TẠO ĐẦY ĐỦ TẤT CẢ CÁC CÂU HỎI theo cấu trúc yêu cầu. KHÔNG ĐƯỢC dừng giữa chừng hoặc bỏ sót câu nào.
2. Khi có đề mẫu: Phân tích CẤU TRÚC (số phần, số câu, cách đánh số, kiến thức) → tạo đề mới GIỐNG CẤU TRÚC nhưng TẤT CẢ CÂU HỎI PHẢI MỚI 100%.
3. TUYỆT ĐỐI KHÔNG copy câu hỏi, số liệu, header trường/sở, hoặc bất kỳ nội dung nào từ đề mẫu.
4. Khi có tài liệu tham khảo: Lấy DẠNG BÀI và phương pháp giải → tạo câu hỏi cùng dạng nhưng SỐ LIỆU KHÁC HOÀN TOÀN.

================================
1. ĐỘ CHÍNH XÁC TOÁN HỌC
================================
- Mọi phép tính PHẢI ĐÚNG 100%. Tự kiểm tra lại đáp án trước khi xuất.
- Trắc nghiệm: Chỉ DUY NHẤT 1 đáp án đúng trong 4 phương án. 3 đáp án sai phải hợp lý (kết quả tính sai 1 bước, nhầm dấu, v.v.).
- Đúng-Sai: Mỗi câu gồm 4 mệnh đề (a,b,c,d) theo mức độ tăng dần. Giải thích rõ TẠI SAO mỗi mệnh đề Đúng/Sai.
- Trả lời ngắn: Đáp án là SỐ, tối đa 4 ký tự. Ưu tiên thiết kế số liệu cho kết quả đẹp.
- Tự luận: Lời giải chi tiết, trình bày rõ từng bước.

================================
2. CÔNG THỨC TOÁN — LATEX
================================
- Sử dụng LaTeX cho mọi biểu thức toán: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\int_a^b f(x)dx$
- Công thức display (dòng riêng): $$...$$ 
- Công thức inline: $...$

================================
3. CÂU HỎI VẬN DỤNG & THỰC TẾ
================================
Khi mức độ "Vận dụng" hoặc "Vận dụng cao":
- Gắn bối cảnh thực tế cụ thể (tên người, tình huống rõ ràng)
- Số liệu thực tế, ngôn ngữ hiện đại
- Ví dụ: tài chính, diện tích, tốc độ, sản xuất, thống kê

================================
4. TRÌNH BÀY
================================
- Dùng Unicode chuẩn tiếng Việt
- Trình bày thoáng, dễ đọc, đánh số câu rõ ràng
- Không viết lời giới thiệu dài dòng — bắt đầu ngay bằng nội dung đề/đáp án

================================
5. HÌNH VẼ, BIỂU ĐỒ — SVG
================================
Khi câu hỏi CẦN hình minh họa (hình học, đồ thị hàm số, biểu đồ thống kê), hãy TẠO mã SVG.
CÁCH VIẾT: Đặt mã SVG trong code block có ngôn ngữ "svg":

\`\`\`svg
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <!-- nội dung hình vẽ -->
</svg>
\`\`\`

QUY TẮC VẼ SVG:
- Kích thước viewBox tối đa 400x300. Nét vẽ rõ ràng, stroke-width: 1.5-2px
- Dùng text SVG cho nhãn (tiếng Việt, font-size 12-14px)
- Màu: đen (#000) cho nét chính, xanh (#0066cc) cho trục tọa độ, đỏ (#cc0000) cho đường cong/đồ thị
- Đánh dấu điểm quan trọng bằng circle r=3
- Hình tự chứa (self-contained), KHÔNG dùng external CSS/JS
- PHẢI vẽ hình khi câu hỏi liên quan đến: hình học phẳng/không gian, đồ thị hàm số, biểu đồ xác suất/thống kê, hệ trục tọa độ
`;
