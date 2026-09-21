import React, { useEffect, useState, useCallback } from 'react';
import JSZip from 'jszip';
import { ChevronLeft, ChevronRight, Presentation, Loader2, AlertCircle } from 'lucide-react';
import { getDownloadUrl } from '../../../services/api';

export default function PptxViewer({ item }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const docUrl = getDownloadUrl(item.path);

    fetch(docUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`프레젠테이션을 불러오지 못했습니다. (${res.status})`);
        return res.arrayBuffer();
      })
      .then(async (buffer) => {
        if (!isMounted) return;
        const zip = await JSZip.loadAsync(buffer);

        // 슬라이드 XML 파일들 탐색 (ppt/slides/slide1.xml, ppt/slides/slide2.xml ...)
        const slideFileNames = Object.keys(zip.files).filter((name) =>
          /^ppt\/slides\/slide\d+\.xml$/i.test(name)
        );

        // 번호순으로 정렬
        slideFileNames.sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
          const numB = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
          return numA - numB;
        });

        if (slideFileNames.length === 0) {
          throw new Error('슬라이드 내용을 찾을 수 없습니다.');
        }

        const parsedSlides = [];
        for (let i = 0; i < slideFileNames.length; i++) {
          const fileName = slideFileNames[i];
          const xmlText = await zip.file(fileName).async('string');

          // 단락(<a:p>) 및 텍스트(<a:t>) 추출
          const paragraphs = xmlText.split(/<a:p\b[^>]*>/i);
          const slideTexts = [];

          for (const p of paragraphs) {
            const matches = p.match(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
            const text = matches
              .map((m) => m.replace(/<[^>]+>/g, '').trim())
              .filter(Boolean)
              .join(' ');
            if (text) {
              slideTexts.push(text);
            }
          }

          parsedSlides.push({
            slideNumber: i + 1,
            title: slideTexts[0] || `슬라이드 ${i + 1}`,
            paragraphs: slideTexts.slice(1)
          });
        }

        setSlides(parsedSlides);
        setCurrentSlideIndex(0);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || '프레젠테이션을 분석하는 중 오류가 발생했습니다.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.path]);

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
  }, [slides.length]);

  // 키보드 방향키 슬라이드 넘김
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="flex flex-col w-full h-[76vh] rounded-2xl bg-[#16161a] border border-neutral-800 shadow-2xl overflow-hidden select-text">
      {/* 1. 상단 컨트롤 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#1c1c20] text-neutral-300 text-[13px] select-none shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Presentation className="h-4 w-4 text-orange-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-xs">{item.name}</span>
          <span className="text-neutral-500 font-mono text-[12px] hidden sm:inline">
            ({slides.length}개 슬라이드)
          </span>
        </div>

        {slides.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono text-neutral-400">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={currentSlideIndex <= 0}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="이전 슬라이드 (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentSlideIndex >= slides.length - 1}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="다음 슬라이드 (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. 메인 슬라이드 카드 영역 */}
      <div className="relative flex-1 overflow-auto p-4 sm:p-8 bg-[#111113] flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center justify-center text-neutral-300">
            <Loader2 className="h-7 w-7 animate-spin text-orange-400 mb-2" />
            <span className="text-[14px] font-medium">프레젠테이션을 준비하는 중...</span>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <AlertCircle className="h-10 w-10 text-neutral-500 mb-3" />
            <p className="text-[14px] font-medium text-neutral-200 mb-1">{error}</p>
            <p className="text-[12px] text-neutral-500">상단 다운로드 버튼으로 원본 파일을 확인해 주세요.</p>
          </div>
        ) : currentSlide ? (
          <div className="w-full max-w-3xl aspect-[16/10] bg-[#1a1a1e] border border-neutral-700/70 rounded-xl shadow-2xl p-6 sm:p-10 flex flex-col justify-between overflow-auto scrollbar-thin">
            {/* 슬라이드 상단 번호 */}
            <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-6 select-none">
              <span className="text-[12px] font-semibold tracking-wider text-orange-400 uppercase">
                Slide {currentSlide.slideNumber}
              </span>
              <span className="text-[12px] text-neutral-500 font-mono">
                {currentSlide.paragraphs.length}개 항목
              </span>
            </div>

            {/* 슬라이드 제목 */}
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {currentSlide.title}
              </h2>
            </div>

            {/* 슬라이드 본문 문단들 */}
            <div className="flex-1 space-y-3 text-neutral-300 text-[14px] sm:text-[15px] leading-relaxed">
              {currentSlide.paragraphs.length > 0 ? (
                currentSlide.paragraphs.map((para, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
                    <p className="flex-1">{para}</p>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 italic text-[13px]">
                  (텍스트 본문이 없는 슬라이드입니다)
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
