import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PPTXViewer } from 'pptx-viewer';
import { ChevronLeft, ChevronRight, Presentation, Loader2, AlertCircle, Maximize2 } from 'lucide-react';
import { getDownloadUrl } from '../../../services/api';

export default function PptxViewer({ item }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slideInfo, setSlideInfo] = useState({ current: 0, total: 0 });

  const docUrl = item.downloadUrl || getDownloadUrl(item.path);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(docUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`프레젠테이션을 불러오지 못했습니다. (${res.status})`);
        return res.arrayBuffer();
      })
      .then(async (buffer) => {
        if (!isMounted || !containerRef.current) return;

        // 기존 인스턴스 정리
        if (viewerRef.current) {
          try {
            viewerRef.current.destroy();
          } catch {
            // 무시
          }
          viewerRef.current = null;
        }

        containerRef.current.innerHTML = '';

        const viewer = new PPTXViewer(containerRef.current, {
          showControls: false,
          keyboardNavigation: true
        });
        viewerRef.current = viewer;

        viewer.on('slidechange', (index) => {
          if (isMounted) {
            setSlideInfo((prev) => ({ ...prev, current: index }));
          }
        });

        viewer.on('error', (err) => {
          if (isMounted) {
            setError(err?.message || '프레젠테이션을 렌더링하는 중 문제가 발생했습니다.');
            setLoading(false);
          }
        });

        await viewer.load(buffer);

        if (isMounted) {
          setSlideInfo({
            current: viewer.getCurrentSlide(),
            total: viewer.getSlideCount()
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || '프레젠테이션을 분석하는 중 오류가 발생했습니다.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {
          // 무시
        }
        viewerRef.current = null;
      }
    };
  }, [docUrl]);

  const handlePrev = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.previous();
    }
  }, []);

  const handleNext = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.next();
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.toggleFullscreen();
    }
  }, []);

  return (
    <div className="flex flex-col w-full h-[76vh] rounded-2xl bg-[#16161a] border border-neutral-800 shadow-2xl overflow-hidden select-text">
      {/* 1. 상단 컨트롤 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#1c1c20] text-neutral-300 text-[13px] select-none shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Presentation className="h-4 w-4 text-orange-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-xs">{item.name}</span>
          {slideInfo.total > 0 && (
            <span className="text-neutral-500 font-mono text-[12px] hidden sm:inline">
              ({slideInfo.total}개 슬라이드)
            </span>
          )}
        </div>

        {slideInfo.total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono text-neutral-400">
              {slideInfo.current + 1} / {slideInfo.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={slideInfo.current <= 0}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="이전 슬라이드 (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={slideInfo.current >= slideInfo.total - 1}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="다음 슬라이드 (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleToggleFullscreen}
                className="p-1 ml-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                title="전체화면"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. 메인 슬라이드 렌더링 컨테이너 */}
      <div className="relative flex-1 overflow-auto p-4 bg-[#111113] flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111113]/80 backdrop-blur-sm text-neutral-300 z-10">
            <Loader2 className="h-7 w-7 animate-spin text-orange-400 mb-2" />
            <span className="text-[14px] font-medium">프레젠테이션을 준비하는 중...</span>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <AlertCircle className="h-10 w-10 text-neutral-500 mb-3" />
            <p className="text-[14px] font-medium text-neutral-200 mb-1">{error}</p>
            <p className="text-[12px] text-neutral-500">상단 다운로드 버튼으로 원본 문서를 열람할 수 있습니다.</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden [&_.pptx-viewer]:w-full [&_.pptx-viewer]:h-full [&_.pptx-slide-container]:max-w-full [&_.pptx-slide-container]:max-h-full [&_svg]:max-h-[64vh] [&_svg]:max-w-full [&_svg]:shadow-2xl [&_svg]:rounded-lg"
          />
        )}
      </div>
    </div>
  );
}
