import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadPresentation, renderSlideToElement } from 'pptx-viewer';
import JSZip from 'jszip';
import {
  ChevronLeft,
  ChevronRight,
  Presentation,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { getDownloadUrl } from '../../../services/api';

export default function PptxViewer({ item }) {
  const wrapperRef = useRef(null);
  const slideContainerRef = useRef(null);
  const presentationRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 파싱 실패 시 텍스트 기반 슬라이드 폴백
  const [fallbackSlides, setFallbackSlides] = useState(null);

  const docUrl = item.downloadUrl || getDownloadUrl(item.path);

  // 슬라이드 렌더링 함수
  const renderSlide = useCallback((presentation, slideIdx) => {
    if (!presentation || !slideContainerRef.current) return;

    try {
      slideContainerRef.current.innerHTML = '';
      renderSlideToElement(presentation, slideIdx, slideContainerRef.current);

      // 렌더링된 SVG 요소에 유연한 반응형 스타일 적용
      const svg = slideContainerRef.current.querySelector('svg');
      if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.maxWidth = '100%';
        svg.style.maxHeight = '100%';
        svg.style.objectFit = 'contain';
        svg.style.display = 'block';
        svg.style.margin = 'auto';
        svg.style.borderRadius = '6px';
        svg.style.boxShadow = '0 12px 32px -8px rgba(0, 0, 0, 0.7)';
      }
    } catch (err) {
      console.warn('Slide rendering error:', err);
    }
  }, []);

  // JSZip 기반 텍스트 슬라이드 파싱 폴백
  const parseFallbackSlides = async (buffer) => {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter((name) =>
      /^ppt\/slides\/slide\d+\.xml$/i.test(name)
    );

    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
      return numA - numB;
    });

    if (slideFiles.length === 0) {
      throw new Error('프레젠테이션 내용을 추출할 수 없습니다.');
    }

    const parsed = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const xml = await zip.file(slideFiles[i]).async('string');
      const paragraphs = xml.split(/<a:p\b[^>]*>/i);
      const texts = [];

      for (const p of paragraphs) {
        const matches = p.match(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
        const line = matches
          .map((m) => m.replace(/<[^>]+>/g, '').trim())
          .filter(Boolean)
          .join(' ');
        if (line) texts.push(line);
      }

      parsed.push({
        slideNumber: i + 1,
        title: texts[0] || `슬라이드 ${i + 1}`,
        paragraphs: texts.slice(1)
      });
    }

    return parsed;
  };

  // 문서 로드 및 초기화
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setFallbackSlides(null);

    fetch(docUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`프레젠테이션을 불러오지 못했습니다. (${res.status})`);
        return res.arrayBuffer();
      })
      .then(async (buffer) => {
        if (!isMounted) return;

        try {
          // 1차 시도: pptx-viewer의 loadPresentation
          const pres = await loadPresentation(buffer);
          if (!isMounted) {
            pres.cleanup();
            return;
          }

          presentationRef.current = pres;
          const slideCount = pres.slides?.length || 0;
          setTotalSlides(slideCount);
          setCurrentSlide(0);

          if (slideCount > 0) {
            renderSlide(pres, 0);
          }
          setLoading(false);
        } catch {
          // 2차 시도: pptx-viewer 파싱 실패 시 JSZip 텍스트 폴백
          try {
            const fallback = await parseFallbackSlides(buffer);
            if (!isMounted) return;
            setFallbackSlides(fallback);
            setTotalSlides(fallback.length);
            setCurrentSlide(0);
            setLoading(false);
          } catch (fallbackErr) {
            if (!isMounted) return;
            setError(fallbackErr.message || '프레젠테이션을 분석하는 중 오류가 발생했습니다.');
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || '프레젠테이션을 가져오는 중 오류가 발생했습니다.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (presentationRef.current) {
        try {
          presentationRef.current.cleanup();
        } catch {
          // 무시
        }
        presentationRef.current = null;
      }
    };
  }, [docUrl, renderSlide]);

  // 슬라이드 변경 시 렌더링
  const handleGoToSlide = useCallback(
    (index) => {
      if (index < 0 || index >= totalSlides) return;
      setCurrentSlide(index);
      if (presentationRef.current) {
        renderSlide(presentationRef.current, index);
      }
    },
    [totalSlides, renderSlide]
  );

  const handlePrev = useCallback(() => {
    handleGoToSlide(currentSlide - 1);
  }, [currentSlide, handleGoToSlide]);

  const handleNext = useCallback(() => {
    handleGoToSlide(currentSlide + 1);
  }, [currentSlide, handleGoToSlide]);

  // 키보드 방향키 슬라이드 넘김
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleGoToSlide(0);
      } else if (e.key === 'End' && totalSlides > 0) {
        e.preventDefault();
        handleGoToSlide(totalSlides - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleGoToSlide, totalSlides]);

  // 전체화면 토글
  const handleToggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // 전체화면 상태 감지 및 슬라이드 재렌더링
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (presentationRef.current) {
        setTimeout(() => {
          renderSlide(presentationRef.current, currentSlide);
        }, 80);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [currentSlide, renderSlide]);

  // 현재 폴백 슬라이드
  const activeFallbackSlide = fallbackSlides ? fallbackSlides[currentSlide] : null;

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col w-full rounded-2xl bg-[#16161a] border border-neutral-800 shadow-2xl overflow-hidden select-text transition-all ${
        isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'h-[76vh]'
      }`}
    >
      {/* 1. 상단 컨트롤 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#1c1c20] text-neutral-300 text-[13px] select-none shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Presentation className="h-4 w-4 text-orange-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-xs">{item.name}</span>
          {totalSlides > 0 && (
            <span className="text-neutral-500 font-mono text-[12px] hidden sm:inline">
              ({totalSlides}개 슬라이드)
            </span>
          )}
        </div>

        {totalSlides > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono text-neutral-400">
              {currentSlide + 1} / {totalSlides}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={currentSlide <= 0}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="이전 슬라이드 (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentSlide >= totalSlides - 1}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="다음 슬라이드 (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleToggleFullscreen}
                className="p-1.5 ml-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                title={isFullscreen ? '전체화면 종료' : '전체화면'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. 메인 슬라이드 렌더링 컨테이너 */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-[#111113] flex items-center justify-center p-4 sm:p-8">
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
        ) : fallbackSlides && activeFallbackSlide ? (
          /* 폴백 카드 뷰 */
          <div className="w-full max-w-3xl aspect-[16/10] bg-[#1a1a1e] border border-neutral-800 rounded-xl shadow-2xl p-6 sm:p-10 flex flex-col justify-between overflow-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-6 select-none">
              <span className="text-[12px] font-semibold tracking-wider text-orange-400 uppercase">
                Slide {activeFallbackSlide.slideNumber}
              </span>
              <span className="text-[12px] text-neutral-500 font-mono">
                {activeFallbackSlide.paragraphs.length}개 항목
              </span>
            </div>
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {activeFallbackSlide.title}
              </h2>
            </div>
            <div className="flex-1 space-y-3 text-neutral-300 text-[14px] sm:text-[15px] leading-relaxed">
              {activeFallbackSlide.paragraphs.length > 0 ? (
                activeFallbackSlide.paragraphs.map((para, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
                    <p className="flex-1">{para}</p>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 italic text-[13px]">(텍스트 본문이 없는 슬라이드입니다)</p>
              )}
            </div>
          </div>
        ) : (
          /* 고화질 벡터 SVG 슬라이드 렌더링 영역 */
          <div
            ref={slideContainerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden"
          />
        )}
      </div>
    </div>
  );
}
