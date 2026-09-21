import React, { useState, useEffect } from 'react';
import { Copy, Check, WrapText, Loader2, AlertCircle, FileText } from 'lucide-react';
import { getDownloadUrl } from '../../services/api';

export default function DocumentViewer({ item }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  const isPdf = item.ext?.toLowerCase() === '.pdf';
  const downloadUrl = getDownloadUrl(item.path);

  useEffect(() => {
    if (isPdf) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(downloadUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`문서를 불러오지 못했습니다. (코드: ${res.status})`);
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.path, isPdf, downloadUrl]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isPdf) {
    return (
      <div className="w-full h-[75vh] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl">
        <iframe
          src={downloadUrl}
          title={item.name}
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center text-neutral-300">
        <Loader2 className="h-6 w-6 animate-spin text-[#7F6DF2] mr-3" />
        <span className="text-[15px] font-medium">문서를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center text-neutral-300 p-6">
        <AlertCircle className="h-10 w-10 text-[#E03E3E] mb-3" />
        <span className="text-[15px] font-medium text-neutral-200">{error}</span>
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="flex flex-col w-full h-[75vh] rounded-2xl bg-[#16161a] border border-neutral-800 shadow-2xl overflow-hidden select-text">
      {/* 1. 상단 문서 컨트롤 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#1c1c20] text-neutral-300 text-[13px] select-none shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#7F6DF2]" />
          <span className="font-medium text-white truncate max-w-xs">{item.name}</span>
          <span className="text-neutral-500 font-mono">({lines.length} 줄)</span>
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
            <span>줄바꿈</span>
          </button>

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
                <span>복사</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. 텍스트 본문 (줄 번호 포함) */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed text-neutral-200 scrollbar-thin">
        <div className="flex min-w-full">
          {/* 줄 번호 */}
          <div className="select-none pr-4 text-right text-neutral-600 font-mono shrink-0">
            {lines.map((_, idx) => (
              <div key={idx}>{idx + 1}</div>
            ))}
          </div>

          {/* 코드 / 텍스트 내용 */}
          <div className={`flex-1 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
