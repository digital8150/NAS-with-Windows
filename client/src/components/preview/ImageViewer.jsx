import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from 'lucide-react';
import { getDownloadUrl } from '../../services/api';

export default function ImageViewer({ item, allImages = [], onSelectImage }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // 현재 이미지의 인덱스 확인
  const currentIndex = allImages.findIndex((img) => img.path === item.path);
  const hasMultiple = allImages.length > 1;

  // 이미지 전환 핸들러
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onSelectImage(allImages[currentIndex - 1]);
      setScale(1);
      setRotation(0);
    }
  }, [currentIndex, allImages, onSelectImage]);

  const handleNext = useCallback(() => {
    if (currentIndex < allImages.length - 1) {
      onSelectImage(allImages[currentIndex + 1]);
      setScale(1);
      setRotation(0);
    }
  }, [currentIndex, allImages, onSelectImage]);

  // 키보드 좌우 화살표 탐색
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

  const handleZoomIn = () => setScale((prev) => Math.min(3, prev + 0.25));
  const handleZoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.25));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const imageUrl = getDownloadUrl(item.path);

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-h-[80vh] select-none">
      {/* 1. 이미지 메인 뷰 */}
      <div className="relative flex items-center justify-center w-full h-[65vh] overflow-hidden rounded-xl bg-[#111113]">
        <img
          src={imageUrl}
          alt={item.name}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease-out'
          }}
          className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-md"
        />

        {/* 이전 버튼 */}
        {hasMultiple && (
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-20 disabled:cursor-not-allowed"
            title="이전 사진 (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* 다음 버튼 */}
        {hasMultiple && (
          <button
            onClick={handleNext}
            disabled={currentIndex >= allImages.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-20 disabled:cursor-not-allowed"
            title="다음 사진 (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* 2. 하단 컨트롤 바 */}
      <div className="mt-3.5 flex items-center justify-between w-full px-2 text-[#73726E]">
        {/* 인덱스 표시 */}
        <div className="text-[13px] font-mono text-neutral-400">
          {hasMultiple ? `${currentIndex + 1} / ${allImages.length}` : '1 / 1'}
        </div>

        {/* 줌 / 회전 도구 */}
        <div className="flex items-center gap-1.5 rounded-xl bg-neutral-900/80 px-3 py-1.5 border border-neutral-800 text-neutral-300">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:text-white transition rounded-lg hover:bg-neutral-800"
            title="축소"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-[13px] font-mono w-12 text-center text-neutral-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:text-white transition rounded-lg hover:bg-neutral-800"
            title="확대"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="h-4 w-[1px] bg-neutral-700 mx-1" />
          <button
            onClick={handleRotate}
            className="p-1.5 hover:text-white transition rounded-lg hover:bg-neutral-800"
            title="90도 회전"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 hover:text-white transition rounded-lg hover:bg-neutral-800"
            title="원래 크기로"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* 파일 크기 */}
        <div className="text-[13px] font-mono text-neutral-400">
          {item.sizeFormatted}
        </div>
      </div>
    </div>
  );
}
