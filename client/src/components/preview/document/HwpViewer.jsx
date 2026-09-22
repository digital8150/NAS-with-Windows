import React, { useEffect, useState } from 'react';
import { Copy, Check, FileText, Loader2, AlertCircle, Image as ImageIcon, Layout, Printer } from 'lucide-react';
import { getDocumentPreview } from '../../../services/api';

export default function HwpViewer({ item }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docData, setDocData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('document'); // 'document' | 'image'

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getDocumentPreview(item)
      .then((data) => {
        if (!isMounted) return;
        setDocData(data);
        if (!data?.html && !data?.text && data?.previewImage) {
          setViewMode('image');
        } else {
          setViewMode('document');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || '한글 문서를 읽어오는 중 문제가 발생했습니다.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item]);

  const handleCopy = () => {
    if (!docData?.text) return;
    navigator.clipboard.writeText(docData.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const paragraphs = docData?.text ? docData.text.split('\n\n') : [];
  const hasImage = Boolean(docData?.previewImage);
  const hasHtml = Boolean(docData?.html && docData.html.trim().length > 0);

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
          {hasImage && hasHtml && (
            <div className="flex items-center rounded-lg bg-neutral-800/90 p-0.5 text-[12px] mr-1">
              <button
                onClick={() => setViewMode('document')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'document' ? 'bg-[#27223e] text-[#a594fd] font-medium' : 'text-neutral-400 hover:text-white'
                }`}
                title="문서 서식 뷰"
              >
                <Layout className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">문서 뷰</span>
              </button>
              <button
                onClick={() => setViewMode('image')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'image' ? 'bg-[#27223e] text-[#a594fd] font-medium' : 'text-neutral-400 hover:text-white'
                }`}
                title="원본 페이지 뷰"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">원본 페이지</span>
              </button>
            </div>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="문서 인쇄"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">인쇄</span>
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
      <div className="relative flex-1 overflow-auto p-4 sm:p-8 bg-[#111113] scrollbar-thin">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111113]/80 backdrop-blur-sm text-neutral-300 z-10">
            <Loader2 className="h-7 w-7 animate-spin text-sky-400 mb-2" />
            <span className="text-[14px] font-medium">문서를 준비하는 중...</span>
          </div>
        )}

        {error ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <AlertCircle className="h-10 w-10 text-neutral-500 mb-3" />
            <p className="text-[14px] font-medium text-neutral-200 mb-1">{error}</p>
            <p className="text-[12px] text-neutral-500">상단 다운로드 버튼으로 원본 문서를 열람할 수 있습니다.</p>
          </div>
        ) : viewMode === 'image' && docData?.previewImage ? (
          /* 원본 래스터 렌더링 뷰 */
          <div className="flex items-center justify-center min-h-full py-4">
            <img
              src={docData.previewImage}
              alt={item.name}
              className="max-w-4xl w-full h-auto rounded-lg shadow-2xl border border-neutral-800 bg-white"
            />
          </div>
        ) : (
          /* 표준 문서 페이퍼 레이아웃 뷰 */
          <div className="py-2">
            <div className="hwpx-paper w-full max-w-4xl mx-auto bg-white text-neutral-900 rounded-lg p-8 sm:p-14 shadow-2xl border border-neutral-200/80">
              {hasHtml ? (
                <div
                  className="hwpx-content"
                  dangerouslySetInnerHTML={{ __html: docData.html }}
                />
              ) : paragraphs.length > 0 ? (
                <div className="space-y-3 leading-relaxed">
                  {paragraphs.map((para, idx) => (
                    <p key={idx} className="min-h-[1.2em] whitespace-pre-wrap">
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400 text-center py-12 text-[14px]">
                  문서에 표시할 내용이 없습니다.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
