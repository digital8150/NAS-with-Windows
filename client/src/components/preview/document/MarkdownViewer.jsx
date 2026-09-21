import React, { useState, useMemo } from 'react';
import { Copy, Check, Eye, Code, WrapText } from 'lucide-react';
import { marked } from 'marked';

// marked 보안 및 옵션 설정
marked.setOptions({
  gfm: true,
  breaks: true
});

export default function MarkdownViewer({ content, fileName }) {
  const [viewMode, setViewMode] = useState('rendered'); // 'rendered' | 'raw'
  const [wordWrap, setWordWrap] = useState(true);
  const [copied, setCopied] = useState(false);

  // Markdown -> HTML 변환 (메모이제이션)
  const htmlContent = useMemo(() => {
    try {
      return marked.parse(content || '');
    } catch {
      return '<p class="text-neutral-400">마크다운을 렌더링할 수 없습니다.</p>';
    }
  }, [content]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const lines = content.split('\n');

  return (
    <div className="flex flex-col w-full h-[76vh] rounded-2xl bg-[#16161a] border border-neutral-800 shadow-2xl overflow-hidden select-text">
      {/* 1. 상단 마크다운 컨트롤 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#1c1c20] text-neutral-300 text-[13px] select-none shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white truncate max-w-xs">{fileName}</span>
          <span className="text-neutral-500 font-mono text-[12px]">({lines.length} 줄)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 렌더 / 원문 전환 탭 */}
          <div className="flex items-center rounded-lg bg-neutral-900 border border-neutral-800 p-0.5">
            <button
              onClick={() => setViewMode('rendered')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium transition ${
                viewMode === 'rendered'
                  ? 'bg-[#27223e] text-[#a594fd] shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>미리보기</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium transition ${
                viewMode === 'raw'
                  ? 'bg-[#27223e] text-[#a594fd] shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>원문</span>
            </button>
          </div>

          {viewMode === 'raw' && (
            <button
              onClick={() => setWordWrap(!wordWrap)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition ${
                wordWrap ? 'bg-[#27223e] text-[#a594fd]' : 'hover:bg-neutral-800 text-neutral-400'
              }`}
              title="줄바꿈 토글"
            >
              <WrapText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">줄바꿈</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="내용 복사"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">복사됨</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">복사</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. 본문 영역 */}
      {viewMode === 'rendered' ? (
        <div className="flex-1 overflow-auto p-6 sm:p-10 text-neutral-200 scrollbar-thin">
          <div
            className="markdown-body max-w-4xl mx-auto space-y-4 text-[14px] leading-relaxed select-text"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed text-neutral-200 scrollbar-thin">
          <div className="flex min-w-full">
            <div className="select-none pr-4 text-right text-neutral-600 font-mono shrink-0">
              {lines.map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>
            <div className={`flex-1 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
              {content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
