import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";

// MathJax global
declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      startup?: { typeset?: boolean };
    };
  }
}

interface ExamDisplayProps {
  examContent: string;                // Đề bài (đã tạo)
  answersContent: string;             // Đáp án (có thể rỗng — chưa tạo)
  onGenerateAnswers: () => void;      // Callback khi user bấm "Tạo đáp án"
  isGeneratingAnswers: boolean;       // Đang tạo đáp án?
}

export const ExamDisplay: React.FC<ExamDisplayProps> = ({
  examContent,
  answersContent,
  onGenerateAnswers,
  isGeneratingAnswers,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger MathJax khi content thay đổi
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.MathJax?.typesetPromise && containerRef.current) {
        window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
          console.warn('MathJax typeset error:', err);
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [examContent, answersContent]);

  if (!examContent) return null;

  // ============================================
  // DOWNLOAD WORD
  // ============================================
  const handleDownloadWord = async () => {
    setIsDownloading(true);
    try {
      // Convert LaTeX math → Unicode cho DOCX
      const latexToUnicode = (text: string): string => {
        return text
          // Strip $...$ and $$...$$ delimiters
          .replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
          .replace(/\$(.*?)\$/g, '$1')
          // Fractions: \frac{a}{b} → a/b
          .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1/$2)')
          // Superscripts
          .replace(/\^{([^}]*)}/g, (_, exp) => {
            const sup: Record<string, string> = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ','x':'ˣ','+':'⁺','-':'⁻','(':'⁽',')':'⁾'};
            return exp.split('').map((c: string) => sup[c] || c).join('');
          })
          .replace(/\^(\d)/g, (_, d) => {
            const sup: Record<string, string> = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
            return sup[d] || d;
          })
          // Subscripts
          .replace(/_{([^}]*)}/g, (_, sub) => {
            const subs: Record<string, string> = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ','i':'ᵢ','k':'ₖ'};
            return sub.split('').map((c: string) => subs[c] || c).join('');
          })
          .replace(/_(\d)/g, (_, d) => {
            const subs: Record<string, string> = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};
            return subs[d] || d;
          })
          // Square root
          .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
          .replace(/\\sqrt\s/g, '√')
          // Greek letters
          .replace(/\\alpha/g,'α').replace(/\\beta/g,'β').replace(/\\gamma/g,'γ').replace(/\\delta/g,'δ')
          .replace(/\\epsilon/g,'ε').replace(/\\theta/g,'θ').replace(/\\lambda/g,'λ').replace(/\\mu/g,'μ')
          .replace(/\\pi/g,'π').replace(/\\sigma/g,'σ').replace(/\\phi/g,'φ').replace(/\\omega/g,'ω')
          .replace(/\\Delta/g,'Δ').replace(/\\Sigma/g,'Σ').replace(/\\Omega/g,'Ω').replace(/\\Phi/g,'Φ')
          // Operators & symbols
          .replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\neq/g,'≠').replace(/\\approx/g,'≈')
          .replace(/\\pm/g,'±').replace(/\\mp/g,'∓').replace(/\\times/g,'×').replace(/\\div/g,'÷')
          .replace(/\\cdot/g,'·').replace(/\\infty/g,'∞').replace(/\\in/g,'∈').replace(/\\notin/g,'∉')
          .replace(/\\subset/g,'⊂').replace(/\\cup/g,'∪').replace(/\\cap/g,'∩')
          .replace(/\\forall/g,'∀').replace(/\\exists/g,'∃')
          .replace(/\\Rightarrow/g,'⇒').replace(/\\Leftrightarrow/g,'⇔')
          .replace(/\\rightarrow/g,'→').replace(/\\leftarrow/g,'←')
          .replace(/\\le\b/g,'≤').replace(/\\ge\b/g,'≥').replace(/\\ne\b/g,'≠')
          // Integrals, sums
          .replace(/\\int/g,'∫').replace(/\\sum/g,'Σ').replace(/\\prod/g,'∏').replace(/\\lim/g,'lim')
          // Overline
          .replace(/\\overline\{([^}]*)\}/g, '$1\u0305')
          // Braces & misc
          .replace(/\\left\(/g,'(').replace(/\\right\)/g,')').replace(/\\left\[/g,'[').replace(/\\right\]/g,']')
          .replace(/\\left\\\{/g,'{').replace(/\\right\\\}/g,'}')
          .replace(/\\{/g,'{').replace(/\\}/g,'}')
          .replace(/\\text\{([^}]*)\}/g, '$1')
          .replace(/\\mathrm\{([^}]*)\}/g, '$1')
          .replace(/\\quad/g, '  ').replace(/\\qquad/g, '    ')
          // Strip remaining backslash commands
          .replace(/\\[a-zA-Z]+/g, '')
          // Clean up markdown bold
          .replace(/\*\*/g, '');
      };

      const processText = (text: string): string => latexToUnicode(text);

      const createTableFromMarkdown = (tableLines: string[]): Table => {
        const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
        const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
        const rows: TableRow[] = [];

        for (let i = 0; i < tableLines.length; i++) {
          const line = tableLines[i].trim();
          if (line.match(/^\|[-:\s|]+\|$/)) continue;
          const cells = line.split('|').filter(cell => cell.trim() !== '');
          if (cells.length > 0) {
            const isHeader = i === 0;
            rows.push(new TableRow({
              tableHeader: isHeader,
              children: cells.map(cellText => new TableCell({
                borders,
                width: { size: Math.floor(9000 / cells.length), type: WidthType.DXA },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({
                    text: cellText.trim(),
                    bold: isHeader,
                    size: 22,
                    font: "Times New Roman"
                  })]
                })]
              }))
            }));
          }
        }
        return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
      };

      const isTableLine = (line: string): boolean => {
        return line.trim().startsWith('|') && line.trim().endsWith('|');
      };

      const createParagraphsFromMarkdown = (text: string): (Paragraph | Table)[] => {
        const elements: (Paragraph | Table)[] = [];
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const cleanLine = line.trim();

          if (!cleanLine) {
            elements.push(new Paragraph({ children: [new TextRun({ text: "", font: "Times New Roman" })] }));
            continue;
          }

          if (isTableLine(cleanLine)) {
            const tableLines: string[] = [cleanLine];
            while (i + 1 < lines.length && isTableLine(lines[i + 1].trim())) {
              i++;
              tableLines.push(lines[i].trim());
            }
            if (tableLines.length >= 2) {
              elements.push(createTableFromMarkdown(tableLines));
              elements.push(new Paragraph({ children: [new TextRun({ text: "", font: "Times New Roman" })] }));
            }
            continue;
          }

          const processedLine = processText(cleanLine);

          if (cleanLine.startsWith('### ')) {
            elements.push(new Paragraph({
              children: [new TextRun({ text: processText(cleanLine.replace('### ', '')), bold: true, size: 26, font: "Times New Roman" })],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 150 }
            }));
            continue;
          }
          if (cleanLine.startsWith('## ')) {
            elements.push(new Paragraph({
              children: [new TextRun({ text: processText(cleanLine.replace('## ', '')), bold: true, size: 28, font: "Times New Roman" })],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 }
            }));
            continue;
          }

          const questionMatch = cleanLine.match(/^(\*\*)?(Câu|Bài)\s*\d+[^:]*:/i);
          if (questionMatch) {
            const titleEnd = cleanLine.indexOf(':', questionMatch[0].length - 1) + 1;
            const title = cleanLine.substring(0, titleEnd).replace(/\*\*/g, '');
            const bodyText = cleanLine.substring(titleEnd).trim();
            const children: TextRun[] = [
              new TextRun({ text: title + " ", bold: true, size: 24, font: "Times New Roman" })
            ];
            if (bodyText) {
              children.push(new TextRun({ text: bodyText, size: 24, font: "Times New Roman" }));
            }
            elements.push(new Paragraph({ children, spacing: { before: 300, after: 120 } }));
            continue;
          }

          if (cleanLine.match(/^(\*\*)?(Lời giải|Hướng dẫn giải|Giải|Đáp án đúng)/i)) {
            elements.push(new Paragraph({
              children: [new TextRun({ text: processText(cleanLine), bold: true, size: 24, font: "Times New Roman" })],
              spacing: { before: 200, after: 100 }
            }));
            continue;
          }

          const answerMatch = cleanLine.match(/^([A-D])\.\s+(.*)/);
          if (answerMatch) {
            elements.push(new Paragraph({
              children: [
                new TextRun({ text: answerMatch[1] + ". ", bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ text: answerMatch[2], size: 24, font: "Times New Roman" })
              ],
              spacing: { after: 80 }
            }));
            continue;
          }

          let displayLine = processedLine;
          let isBullet = false;
          const bulletMatch = displayLine.match(/^[-+*]\s+(.*)$/);
          if (bulletMatch) {
            displayLine = "• " + bulletMatch[1];
            isBullet = true;
          }

          const boldPattern = /\*\*([^*]+)\*\*/g;
          const parts: TextRun[] = [];
          let lastIndex = 0;
          let match;

          while ((match = boldPattern.exec(displayLine)) !== null) {
            if (match.index > lastIndex) {
              parts.push(new TextRun({ text: displayLine.slice(lastIndex, match.index), size: 24, font: "Times New Roman" }));
            }
            parts.push(new TextRun({ text: match[1], bold: true, size: 24, font: "Times New Roman" }));
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex < displayLine.length) {
            parts.push(new TextRun({ text: displayLine.slice(lastIndex).replace(/\*\*/g, ''), size: 24, font: "Times New Roman" }));
          }
          if (parts.length === 0) {
            parts.push(new TextRun({ text: displayLine.replace(/\*\*/g, ''), size: 24, font: "Times New Roman" }));
          }

          elements.push(new Paragraph({
            children: parts,
            spacing: { after: 100 },
            indent: isBullet ? { left: 360 } : undefined
          }));
        }
        return elements;
      };

      const creditParagraph = new Paragraph({
        children: [new TextRun({
          text: "Đề thi được tạo bởi EDUGENVN - Phát triển bởi thầy Trần Hoài Thanh",
          italics: true, size: 22, font: "Times New Roman", color: "666666"
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 }
      });

      const sections: any[] = [];

      // Phần đề bài
      const examParagraphs = createParagraphsFromMarkdown(examContent);
      const sectionChildren: any[] = [
        new Paragraph({
          children: [new TextRun({ text: "ĐỀ THI — TẠO BỞI EDUGENVN", bold: true, size: 32, font: "Times New Roman" })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        ...examParagraphs,
        creditParagraph,
      ];

      // Nếu có đáp án → thêm page break + đáp án
      if (answersContent) {
        sectionChildren.push(new Paragraph({ children: [new PageBreak()] }));
        sectionChildren.push(new Paragraph({
          children: [new TextRun({ text: "ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT", bold: true, size: 32, font: "Times New Roman" })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 400 }
        }));
        sectionChildren.push(...createParagraphsFromMarkdown(answersContent));
        sectionChildren.push(creditParagraph);
      }

      const doc = new Document({
        sections: [{ properties: {}, children: sectionChildren }],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `De_Thi_EduGenVN_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating Word document:", error);
      alert("Có lỗi khi tạo file Word. Vui lòng thử lại.");
    } finally {
      setIsDownloading(false);
    }
  };

  // ============================================
  // DOWNLOAD PDF (via browser print)
  // ============================================
  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Trình duyệt đã chặn popup. Vui lòng cho phép popup để tải PDF.');
      return;
    }

    const content = answersContent
      ? `${examContent}\n\n---\n\n## ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT\n\n${answersContent}`
      : examContent;

    // Convert markdown-like content to simple HTML
    // Step 1: Pre-process tables into HTML blocks (before paragraph splitting)
    const preProcessTables = (text: string): string => {
      const lines = text.split('\n');
      const result: string[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i].trim();
        // Detect start of a markdown table
        if (line.startsWith('|') && line.endsWith('|')) {
          const tableRows: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            const row = lines[i].trim();
            // Skip separator rows (|---|---|)
            if (!row.match(/^\|[-:\s|]+\|$/)) {
              const cells = row.split('|').filter(c => c.trim() !== '');
              const isHeader = tableRows.length === 0;
              const tag = isHeader ? 'th' : 'td';
              const style = `border:1px solid #333;padding:6px 10px;text-align:center;${isHeader ? 'font-weight:bold;background:#f0f0f0;' : ''}`;
              tableRows.push('<tr>' + cells.map(c => `<${tag} style="${style}">${c.trim()}</${tag}>`).join('') + '</tr>');
            }
            i++;
          }
          if (tableRows.length > 0) {
            result.push(`<table style="border-collapse:collapse;width:100%;margin:12px 0">${tableRows.join('')}</table>`);
          }
        } else {
          result.push(lines[i]);
          i++;
        }
      }
      return result.join('\n');
    };

    const htmlContent = preProcessTables(content)
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^---$/gm, '<hr style="page-break-before: always; border: none;" />')
      // SVG code blocks: render as actual SVG
      .replace(/```svg\n([\s\S]*?)```/g, (_, svgCode) => `<div style="text-align:center;margin:16px 0">${svgCode}</div>`)
      // Xử lý xuống dòng: đoạn mới (2 newlines) → <p>, đơn newline → <br>
      .split(/\n{2,}/)
      .map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        // Skip blocks already wrapped in HTML tags
        if (trimmed.startsWith('<h') || trimmed.startsWith('<hr') || trimmed.startsWith('<table') || trimmed.startsWith('<div')) return trimmed;
        return '<p style="margin:4px 0">' + trimmed.replace(/\n/g, '<br/>') + '</p>';
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Đề Thi — EduGenVN</title>
        <script>
          MathJax = {
            tex: { inlineMath: [['$','$'],['\\\\(','\\\\)']], displayMath: [['$$','$$'],['\\\\[','\\\\]']], processEscapes: true },
            svg: { fontCache: 'global' }
          };
        </` + `script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></` + `script>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.7; color: #000; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 16pt; text-align: center; margin-bottom: 20px; }
          h2 { font-size: 14pt; margin-top: 24px; }
          h3 { font-size: 13pt; margin-top: 16px; }
          strong { font-weight: bold; }
          hr { page-break-before: always; border: none; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; }
          th, td { border: 1px solid #333; padding: 6px 10px; text-align: center; }
          .footer { text-align: center; color: #666; font-size: 10pt; font-style: italic; margin-top: 40px; padding-top: 16px; border-top: 1px solid #ccc; }
          @media print {
            body { padding: 0; }
            @page { size: A4; margin: 15mm 20mm; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <div class="footer">Đề thi được tạo bởi EDUGENVN — Phát triển bởi thầy Trần Hoài Thanh</div>
        <script>
          // Chờ MathJax render xong rồi mở print dialog
          window.addEventListener('load', function() {
            setTimeout(function() {
              if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise().then(function() {
                  setTimeout(function() { window.print(); }, 500);
                });
              } else {
                setTimeout(function() { window.print(); }, 1500);
              }
            }, 1000);
          });
        </` + `script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ============================================
  // SVG RENDERING — Pre-process + Component
  // ============================================

  // Extract SVG blocks from content, replace with markers, and render them separately
  const svgBlocksRef = useRef<Map<string, string>>(new Map());

  const preprocessSvgContent = (content: string): string => {
    const svgMap = new Map<string, string>();
    let processed = content;
    let counter = 0;

    // Pattern 1: ```svg ... ``` code blocks
    processed = processed.replace(/```svg\s*\n([\s\S]*?)```/g, (_, svgCode) => {
      const id = `__SVG_BLOCK_${counter++}__`;
      svgMap.set(id, svgCode.trim());
      return `\n\n${id}\n\n`;
    });

    // Pattern 2: Raw <svg ... </svg> tags inline
    processed = processed.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
      const id = `__SVG_BLOCK_${counter++}__`;
      svgMap.set(id, match.trim());
      return `\n\n${id}\n\n`;
    });

    svgBlocksRef.current = svgMap;
    return processed;
  };

  // Sanitize and render SVG
  const SvgRenderer: React.FC<{ svgCode: string }> = ({ svgCode }) => {
    const sanitized = svgCode
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');
    return (
      <div
        className="my-4 flex justify-center"
        dangerouslySetInnerHTML={{
          __html: `<div style="max-width:400px;width:100%;overflow:auto;border:1px solid #d1d5db;border-radius:10px;padding:16px;background:#fafbfc;box-shadow:0 1px 3px rgba(0,0,0,0.08);">${sanitized}</div>`
        }}
      />
    );
  };

  const markdownComponents = {
    // Override 'p' to catch SVG placeholders in paragraph text
    p({ children, ...props }: any) {
      const text = String(children);
      const match = text.match(/__SVG_BLOCK_(\d+)__/);
      if (match) {
        const svgCode = svgBlocksRef.current.get(match[0]);
        if (svgCode) return <SvgRenderer svgCode={svgCode} />;
      }
      return <p {...props}>{children}</p>;
    },
    // Override 'code' for fenced blocks that still contain SVG markers
    code({ className, children, ...props }: any) {
      const codeString = String(children).replace(/\n$/, '');
      const match = codeString.match(/__SVG_BLOCK_(\d+)__/);
      if (match) {
        const svgCode = svgBlocksRef.current.get(match[0]);
        if (svgCode) return <SvgRenderer svgCode={svgCode} />;
      }
      return <code className={className} {...props}>{children}</code>;
    },
  };

  // Pre-process content for SVG
  const processedExamContent = preprocessSvgContent(examContent);
  const processedAnswersContent = preprocessSvgContent(answersContent);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div ref={containerRef} className="bg-white rounded-xl shadow-md border border-teal-100 overflow-hidden flex flex-col h-[700px] lg:h-[900px]">
      {/* Header toolbar */}
      <div className="bg-teal-50 border-b border-teal-100 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 gap-2">
        <h3 className="font-bold text-teal-800 flex items-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Nội Dung Đề Thi
        </h3>
        <div className="flex items-center gap-2">
          {/* Tải PDF */}
          <button
            onClick={handleDownloadPDF}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md transition-colors shadow-sm font-bold flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            Tải PDF
          </button>
          {/* Tải Word */}
          <button
            onClick={handleDownloadWord}
            disabled={isDownloading}
            className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md transition-colors shadow-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Tải Word
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2 columns: Đề bài | Đáp án */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden bg-white">

        {/* Column 1: ĐỀ BÀI */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 p-6 min-h-[50%] lg:min-h-full">
          <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-2 mb-4 border-b border-teal-100">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Đề Bài</span>
          </div>
          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-teal-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {processedExamContent}
            </ReactMarkdown>
          </div>
        </div>

        {/* Column 2: ĐÁP ÁN */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-teal-50/30 min-h-[50%] lg:min-h-full">
          <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-2 mb-4 border-b border-teal-100">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Đáp Án & Lời Giải</span>
          </div>

          {answersContent ? (
            /* ĐÃ CÓ ĐÁP ÁN → Hiển thị */
            <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-teal-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {processedAnswersContent}
              </ReactMarkdown>
            </div>
          ) : (
            /* CHƯA CÓ ĐÁP ÁN → Hiển thị nút "Tạo đáp án" */
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4">
              <div className="bg-white rounded-2xl border-2 border-dashed border-emerald-300 p-8 max-w-sm w-full">
                <div className="text-4xl mb-3">📝</div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Đề bài đã sẵn sàng!</h4>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  Bấm nút bên dưới để AI tạo đáp án & lời giải chi tiết.<br />
                  <span className="text-amber-600 font-medium">(Tách riêng để tránh bị giới hạn API)</span>
                </p>
                <button
                  onClick={onGenerateAnswers}
                  disabled={isGeneratingAnswers}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-white font-bold text-sm transition-all duration-200 shadow-lg ${
                    isGeneratingAnswers
                      ? 'bg-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {isGeneratingAnswers ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang tạo đáp án...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 4V2"></path><path d="M15 16v-2"></path><path d="M8 9h2"></path><path d="M20 9h2"></path>
                        <path d="M17.8 11.8 19 13"></path><path d="M15 9h.01"></path><path d="M17.8 6.2 19 5"></path>
                        <path d="m3 21 9-9"></path><path d="M12.2 6.2 11 5"></path>
                      </svg>
                      Tạo Đáp Án & Lời Giải
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
