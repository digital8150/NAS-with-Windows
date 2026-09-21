import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Loader2, AlertCircle } from 'lucide-react';
import { getDownloadUrl } from '../../../services/api';

export default function DocxViewer({ item }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const docUrl = getDownloadUrl(item.path);

    fetch(docUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`문서를 불러오지 못했습니다. (${res.status})`);
        return res.arrayBuffer();
      })
      .then(async (buffer) => {
        if (!isMounted) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          await renderAsync(buffer, containerRef.current, undefined, {
            className: 'docx',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Word 문서를 렌더링하는 중 오류가 발생했습니다.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.path]);

  return (
    <div className="flex flex-col w-full h-[76vh] rounded-2xl bg-[#16161a] border border-neutral-800 shadow-2xl overflow-hidden select-text">
      {/* 1. 상단 컨트롤 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#1c1c20] text-neutral-300 text-[13px] select-none shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-white truncate max-w-xs">{item.name}</span>
          <span className="text-neutral-500 font-mono text-[12px] hidden sm:inline">({item.sizeFormatted})</span>
        </div>
      </div>

      {/* 2. 본문 영역 */}
      <div className="relative flex-1 overflow-auto p-4 sm:p-8 bg-[#111113] scrollbar-thin">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111113]/80 backdrop-blur-sm text-neutral-300">
            <Loader2 className="h-7 w-7 animate-spin text-[#7F6DF2] mb-2" />
            <span className="text-[14px] font-medium">Word 문서를 렌더링하는 중...</span>
          </div>
        )}

        {error ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <AlertCircle className="h-10 w-10 text-neutral-500 mb-3" />
            <p className="text-[14px] font-medium text-neutral-200 mb-1">{error}</p>
            <p className="text-[12px] text-neutral-500">상단 다운로드 버튼으로 원본 문서를 열람할 수 있습니다.</p>
          </div>
        ) : (
          <div ref={containerRef} className="docx-container max-w-4xl mx-auto" />
        )}
      </div>
    </div>
  );
}
