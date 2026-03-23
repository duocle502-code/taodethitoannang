import { SYSTEM_INSTRUCTION, STRUCTURE_VAO_10, STRUCTURE_VAO_10_TRACNGHIEM, STRUCTURE_TOT_NGHIEP, FALLBACK_ORDER } from '../constants';
import { ExamRequest, ExamMode, ExamFormat, AIModelId, UploadedFile } from '../types';

// ============================================
// HÀM GỌI API CHUNG (có fallback)
// ============================================
async function callGeminiWithFallback(
  apiKey: string,
  selectedModel: AIModelId,
  parts: any[],
  onStatus?: (msg: string) => void,
): Promise<string> {
  if (!apiKey) {
    throw new Error('Vui lòng nhập API Key để sử dụng.');
  }
  if (/[^\x00-\x7F]/.test(apiKey)) {
    throw new Error('API Key không hợp lệ (chứa ký tự tiếng Việt). Vui lòng xóa và nhập lại.');
  }

  const modelsToTry = [selectedModel, ...FALLBACK_ORDER.filter(m => m !== selectedModel)];
  const uniqueModels = [...new Set(modelsToTry)];
  let lastError: any = null;

  for (let i = 0; i < uniqueModels.length; i++) {
    const modelId = uniqueModels[i];

    try {
      if (onStatus) {
        onStatus(i > 0
          ? `Model ${uniqueModels[i - 1]} lỗi, đang thử ${modelId}...`
          : `Đang xử lý với ${modelId}...`
        );
      }

      console.log(`[GeminiService] Thử model: ${modelId}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 30000,
            },
          }),
        },
      );

      if (response.status === 429) {
        console.warn(`[GeminiService] Model ${modelId} rate limited (429)`);
        lastError = new Error(`Rate limit (429) — ${modelId}`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[GeminiService] API Error ${response.status}:`, errText);
        lastError = new Error(`API Error ${response.status}: ${errText.substring(0, 200)}`);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.warn(`[GeminiService] Model ${modelId} trả về rỗng`);
        lastError = new Error('API trả về nội dung rỗng');
        continue;
      }

      console.log(`[GeminiService] Thành công với ${modelId}`);
      return text;

    } catch (error: any) {
      console.warn(`[GeminiService] Model ${modelId} failed:`, error);
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('Không thể xử lý với bất kỳ model nào. Vui lòng kiểm tra API Key hoặc thử lại sau.');
}

// ============================================
// BƯỚC 1: TẠO ĐỀ BÀI (KHÔNG CÓ ĐÁP ÁN)
// ============================================
export const generateExamOnly = async (
  request: ExamRequest,
  apiKey: string,
  onStatus?: (msg: string) => void,
): Promise<string> => {
  const isVao10 = request.examMode === ExamMode.Vao10;
  const isTracNghiem = request.examFormat === ExamFormat.TracNghiem;

  // Xác định label & cấu trúc
  let examLabel: string;
  let structureGuide: string;
  let timeLimit: string;

  if (isVao10) {
    if (isTracNghiem) {
      examLabel = 'TUYỂN SINH VÀO LỚP 10 (Trắc nghiệm)';
      structureGuide = STRUCTURE_VAO_10_TRACNGHIEM;
      timeLimit = '90';
    } else {
      examLabel = 'TUYỂN SINH VÀO LỚP 10 (Tự luận)';
      structureGuide = STRUCTURE_VAO_10;
      timeLimit = '120';
    }
  } else {
    examLabel = 'TỐT NGHIỆP THPT';
    structureGuide = STRUCTURE_TOT_NGHIEP;
    timeLimit = '90';
  }

  let fileContext = '';
  if (request.sampleExamFiles.length > 0) {
    fileContext += `
[ĐỀ MẪU ĐÃ TẢI LÊN: ${request.sampleExamFiles.length} file]
CÁCH XỬ LÝ ĐỀ MẪU — BẮT BUỘC TUÂN THỦ:
1. ĐỌC và PHÂN TÍCH cấu trúc đề mẫu: đếm số phần, số câu mỗi phần, cách đánh số, kiến thức mỗi câu, mức độ khó
2. TẠO ĐỀ MỚI có CẤU TRÚC GIỐNG HỆT (cùng số phần, cùng số câu, cùng cách đánh số)
3. TUYỆT ĐỐI KHÔNG COPY câu hỏi, số liệu, hoặc nội dung từ đề mẫu
4. KHÔNG lặp lại header/tiêu đề trường/sở của đề mẫu — chỉ giữ cấu trúc câu hỏi
`;
  }
  if (request.referenceFiles.length > 0) {
    fileContext += `
[TÀI LIỆU THAM KHẢO ĐÃ TẢI LÊN: ${request.referenceFiles.length} file]
CÁCH XỬ LÝ TÀI LIỆU THAM KHẢO — BẮT BUỘC:
1. Xác định DẠNG BÀI, phương pháp giải, công thức trong tài liệu
2. Tạo câu hỏi CÙNG DẠNG nhưng THAY ĐỔI HOÀN TOÀN số liệu và ngữ cảnh
3. Đảm bảo đáp án của câu hỏi mới là CHÍNH XÁC (tự kiểm tra)
`;
  }

  const userPrompt = `
NHIỆM VỤ: Tạo 1 ĐỀ THI MỚI **ĐẦY ĐỦ** cho kỳ thi: ${examLabel} MÔN TOÁN.

${structureGuide}

${fileContext}

${request.customRequirements ? `YÊU CẦU RIÊNG CỦA GIÁO VIÊN:\n${request.customRequirements}\n` : ''}

Mức độ chủ đạo: ${request.difficulty}

⚠️ QUY TẮC QUAN TRỌNG:
- CHỈ TẠO ĐỀ BÀI, KHÔNG TẠO ĐÁP ÁN (đáp án sẽ tạo riêng ở bước sau)
- PHẢI TẠO ĐẦY ĐỦ TẤT CẢ CÁC CÂU theo cấu trúc (KHÔNG được bỏ sót câu nào)
- KHÔNG copy bất kỳ câu hỏi nào từ đề mẫu — tất cả câu hỏi phải HOÀN TOÀN MỚI
- KHÔNG lặp lại tiêu đề trường/sở/tên đề của đề mẫu
- Dùng LaTeX cho công thức toán: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$

ĐỊNH DẠNG OUTPUT (bắt đầu ngay bằng nội dung đề, không mở đầu bằng lời giới thiệu):

**ĐỀ THI THỬ ${examLabel} MÔN TOÁN**
**Thời gian làm bài: ${timeLimit} phút** *(không kể thời gian phát đề)*

[Tiếp theo là nội dung đề bài đầy đủ tất cả các câu]

BẮT ĐẦU VIẾT ĐỀ NGAY:
  `;

  // Xây parts (file + text)
  const parts: any[] = [];

  for (const file of request.sampleExamFiles) {
    parts.push({ inline_data: { mime_type: file.mimeType, data: file.base64 } });
  }
  for (const file of request.referenceFiles) {
    parts.push({ inline_data: { mime_type: file.mimeType, data: file.base64 } });
  }
  parts.push({ text: userPrompt });

  return callGeminiWithFallback(apiKey, request.model, parts, onStatus);
};

// ============================================
// BƯỚC 2: TẠO ĐÁP ÁN (GỬI ĐỀ BÀI ĐÃ TẠO LÀM CONTEXT)
// ============================================
export const generateAnswers = async (
  examContent: string,
  examMode: ExamMode,
  examFormat: ExamFormat,
  model: AIModelId,
  apiKey: string,
  onStatus?: (msg: string) => void,
): Promise<string> => {
  const isVao10 = examMode === ExamMode.Vao10;
  const isTracNghiem = examFormat === ExamFormat.TracNghiem;
  const isTuLuan = isVao10 && !isTracNghiem;
  const hasTracNghiem = !isTuLuan; // TN THPT hoặc Vào 10 trắc nghiệm đều có trắc nghiệm

  let examLabel = 'TỐT NGHIỆP THPT';
  if (isVao10) examLabel = isTracNghiem ? 'TUYỂN SINH VÀO LỚP 10 (Trắc nghiệm)' : 'TUYỂN SINH VÀO LỚP 10 (Tự luận)';

  const answerPrompt = `
Dưới đây là ĐỀ THI ${examLabel} MÔN TOÁN đã được tạo:

---
${examContent}
---

Hãy tạo ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT cho đề thi trên.

QUY TẮC BẮT BUỘC:
1. GIẢI CHI TIẾT TỪNG CÂU — trình bày rõ từng bước, công thức sử dụng
2. MỌI PHÉP TÍNH PHẢI ĐÚNG 100% — tự kiểm tra lại trước khi xuất
3. Dùng LaTeX cho công thức: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$
${hasTracNghiem ? `4. Trắc nghiệm nhiều lựa chọn: Giải thích tại sao chọn đáp án đó
5. Đúng-Sai: Giải thích rõ TẠI SAO mỗi mệnh đề Đúng/Sai
6. Trả lời ngắn: Giải chi tiết ra đáp số cuối cùng
7. Kết thúc bằng BẢNG ĐÁP ÁN NHANH (markdown table) cho phần trắc nghiệm nhiều lựa chọn` : `4. Giải đầy đủ từng ý (a, b, c, d...) của mỗi bài
5. Trình bày lời giải theo hướng dẫn chấm (có thang điểm nếu phù hợp)`}

ĐỊNH DẠNG OUTPUT:

### ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT

[Đáp án chi tiết từng câu]

${hasTracNghiem ? `BẢNG ĐÁP ÁN NHANH (PHẦN TRẮC NGHIỆM NHIỀU LỰA CHỌN):
| Câu | 1 | 2 | 3 | ... |
|-----|---|---|---|-----|
| Đáp án | ? | ? | ? | ... |` : ''}

BẮT ĐẦU TẠO ĐÁP ÁN:
  `;

  const parts = [{ text: answerPrompt }];

  return callGeminiWithFallback(apiKey, model, parts, onStatus);
};
