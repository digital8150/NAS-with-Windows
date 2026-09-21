import React, { useEffect, useState } from 'react';
import { Copy, Check, FileText, Loader2, AlertCircle, WrapText } from 'lucide-react';
import { getDocumentPreview } from '../../../services/api';

export default function HwpViewer({ item }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docData, setDocData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getDocumentPreview(item.path)
      .then((data) => {
        if (!isMounted) return;
        setDocData(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || '한글 문서를 분석하는 중 오류가 발생했습니다.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.path]);

  const handleCopy = () => {
    if (!docData?.text) return;
    navigator.clipboard.writeText(docData.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const paragraphs = docData?.text ? docData.text.split('\n\n') : [];

  return (
    <div className="flex flex-col w-full h-[76vh] rounded-2xl bg-[#16161a] border border-neutral-800 shadow-2xl overflow-hidden select-text">
      {/* 1. 상단 컨트롤 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#1c1c20] text-neutral-300 text-[13px] select-none shrink-0">
        <div className="flex items-center gap-2 truncate">
          <FileText className="h-4 w-4 text-sky-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-xs">{item.name}</span>
          <span className="text-neutral-500 font-mono text-[12px] hidden sm:inline uppercase">
            ({docData?.type || item.ext?.replace('.', '')})
          </span>
        </div>

        <div className="flex items-center gap-2">
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

          <button
            onClick={handleCopy}
            disabled={!docData?.text}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white transition disabled:opacity-40"
            title="본문 복사"
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
      <div className="relative flex-1 overflow-auto p-6 sm:p-10 bg-[#111113] scrollbar-thin">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111113]/80 backdrop-blur-sm text-neutral-300">
            <Loader2 className="h-7 w-7 animate-spin text-sky-400 mb-2" />
            <span className="text-[14px] font-medium">한글 문서를 읽어오는 중...</span>
          </div>
        )}

        {error ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <AlertCircle className="h-10 w-10 text-neutral-500 mb-3" />
            <p className="text-[14px] font-medium text-neutral-200 mb-1">{error}</p>
            <p className="text-[12px] text-neutral-500">상단 다운로드 버튼으로 원본 문서를 열람할 수 있습니다.</p>
          </div>
        ) : (
          <div className={`max-w-3xl mx-auto space-y-4 text-[14.5px] leading-relaxed text-neutral-200 ${
            wordWrap ? 'break-words' : 'whitespace-pre'
          }`}>
            {paragraphs.map((para, idx) => (
              <p key={idx} className="min-h-[1em] whitespace-pre-wrap">
                {para}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
