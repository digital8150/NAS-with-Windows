import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Camera,
  Info,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { getDownloadUrl, getPreviewImageUrl, getExif } from '../../services/api';

const RAW_EXTS = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.psd', '.ai', '.tiff', '.tif'];

export default function ImageViewer({ item, allImages = [], onSelectImage }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showExif, setShowExif] = useState(false);
  const [exifData, setExifData] = useState(null);
  const [loadingExif, setLoadingExif] = useState(false);

  const containerRef = useRef(null);

  const ext = item.ext?.toLowerCase() || '';
  const isSpecialImage = RAW_EXTS.includes(ext);

  // 현재 이미지의 인덱스 확인
  const currentIndex = allImages.findIndex((img) => img.path === item.path);
  const hasMultiple = allImages.length > 1;

  // 특수 포맷(RAW/PSD/AI 등)은 프리뷰 변환 URL 사용, 일반 이미지는 다운로드 URL 사용
  const imageUrl = item.previewUrl || (isSpecialImage ? getPreviewImageUrl(item.path) : (item.downloadUrl || getDownloadUrl(item.path)));

  // 이미지 바뀔 때 상태 리셋
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setLoading(true);
    setImageError(false);
    setExifData(null);
  }, [item.path]);

  // EXIF 데이터 불러오기
  useEffect(() => {
    if (!showExif || exifData !== null) return;

    let isMounted = true;
    setLoadingExif(true);

    getExif(item.path)
      .then((data) => {
        if (!isMounted) return;
        setExifData(data);
        setLoadingExif(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setExifData({});
        setLoadingExif(false);
      });

    return () => {
      isMounted = false;
    };
  }, [showExif, item.path, exifData]);

  // 이미지 전환 핸들러
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onSelectImage(allImages[currentIndex - 1]);
    }
  }, [currentIndex, allImages, onSelectImage]);

  const handleNext = useCallback(() => {
    if (currentIndex < allImages.length - 1) {
      onSelectImage(allImages[currentIndex + 1]);
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

  const handleZoomIn = () => setScale((prev) => Math.min(4, +(prev + 0.25).toFixed(2)));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(0.5, +(prev - 0.25).toFixed(2));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // 마우스 휠 확대/축소
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // 마우스 드래그 팬
  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const hasExifInfo = exifData && (exifData.model || exifData.iso || exifData.aperture || exifData.shutterSpeed);

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-h-[82vh] select-none">
      {/* 1. 이미지 메인 뷰 */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex items-center justify-center w-full h-[66vh] overflow-hidden rounded-2xl bg-[#111113] border border-neutral-800/80 ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        {/* 로딩 표시 */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#111113]/80 backdrop-blur-sm text-neutral-300">
            <Loader2 className="h-7 w-7 animate-spin text-[#7F6DF2] mb-2" />
            <span className="text-[14px] font-medium text-neutral-300">
              {isSpecialImage ? '이미지를 변환하여 불러오는 중...' : '이미지를 불러오는 중...'}
            </span>
          </div>
        )}

        {/* 에러 표시 */}
        {imageError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-400">
            <AlertCircle className="h-10 w-10 text-neutral-500 mb-3" />
            <p className="text-[14px] font-medium text-neutral-300 mb-1">
              이미지 미리보기를 표시할 수 없습니다.
            </p>
            <p className="text-[12px] text-neutral-500">
              상단 다운로드 버튼을 이용해 원본 파일을 확인해 주세요.
            </p>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={item.name}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setImageError(true);
            }}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.12s ease-out'
            }}
            className="max-h-full max-w-full object-contain pointer-events-none drop-shadow-md"
          />
        )}

        {/* 이전 버튼 */}
        {hasMultiple && (
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-20 disabled:cursor-not-allowed"
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
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-20 disabled:cursor-not-allowed"
            title="다음 사진 (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* EXIF 상세 정보 오버레이 패널 */}
        {showExif && (
          <div className="absolute right-4 top-4 z-30 w-72 rounded-xl bg-black/85 border border-neutral-700/80 p-4 text-white backdrop-blur-md shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-neutral-700/60 pb-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-[#7F6DF2]" />
                <span className="text-[13px] font-semibold text-neutral-200">촬영 정보</span>
              </div>
              <button
                onClick={() => setShowExif(false)}
                className="text-neutral-400 hover:text-white transition p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {loadingExif ? (
              <div className="flex items-center justify-center py-6 text-neutral-400 text-[13px]">
                <Loader2 className="h-4 w-4 animate-spin text-[#7F6DF2] mr-2" />
                <span>정보 읽는 중...</span>
              </div>
            ) : hasExifInfo ? (
              <div className="space-y-2 text-[12px] font-mono">
                {exifData.model && (
                  <div className="flex justify-between py-0.5 border-b border-neutral-800">
                    <span className="text-neutral-400 font-sans">카메라</span>
                    <span className="text-neutral-200 text-right truncate max-w-[150px]" title={`${exifData.make || ''} ${exifData.model}`}>
                      {exifData.model}
                    </span>
                  </div>
                )}
                {exifData.lens && (
                  <div className="flex justify-between py-0.5 border-b border-neutral-800">
                    <span className="text-neutral-400 font-sans">렌즈</span>
                    <span className="text-neutral-200 text-right truncate max-w-[150px]" title={exifData.lens}>
                      {exifData.lens}
                    </span>
                  </div>
                )}
                {exifData.focalLength && (
                  <div className="flex justify-between py-0.5 border-b border-neutral-800">
                    <span className="text-neutral-400 font-sans">초점거리</span>
                    <span className="text-neutral-200">{exifData.focalLength}</span>
                  </div>
                )}
                {exifData.aperture && (
                  <div className="flex justify-between py-0.5 border-b border-neutral-800">
                    <span className="text-neutral-400 font-sans">조리개</span>
                    <span className="text-neutral-200">{exifData.aperture}</span>
                  </div>
                )}
                {exifData.shutterSpeed && (
                  <div className="flex justify-between py-0.5 border-b border-neutral-800">
                    <span className="text-neutral-400 font-sans">셔터스피드</span>
                    <span className="text-neutral-200">{exifData.shutterSpeed}</span>
                  </div>
                )}
                {exifData.iso && (
                  <div className="flex justify-between py-0.5 border-b border-neutral-800">
                    <span className="text-neutral-400 font-sans">ISO</span>
                    <span className="text-neutral-200">ISO {exifData.iso}</span>
                  </div>
                )}
                {exifData.width && exifData.height && (
                  <div className="flex justify-between py-0.5 border-b border-neutral-800">
                    <span className="text-neutral-400 font-sans">해상도</span>
                    <span className="text-neutral-200">{exifData.width} × {exifData.height}</span>
                  </div>
                )}
                {exifData.dateTime && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-neutral-400 font-sans">촬영 일시</span>
                    <span className="text-neutral-200 text-right">
                      {new Date(exifData.dateTime).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-neutral-400 text-[12px]">
                촬영 정보가 없습니다.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. 하단 컨트롤 바 */}
      <div className="mt-3.5 flex items-center justify-between w-full px-2 text-[#73726E]">
        {/* 인덱스 표시 */}
        <div className="text-[13px] font-mono text-neutral-400 flex items-center gap-2">
          <span>{hasMultiple ? `${currentIndex + 1} / ${allImages.length}` : '1 / 1'}</span>
          <span className="text-neutral-600">·</span>
          <span className="uppercase text-neutral-500 font-semibold">{ext.replace('.', '')}</span>
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

        {/* 우측 도구: EXIF 토글 및 파일 크기 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExif((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition border ${
              showExif
                ? 'bg-[#27223e] text-[#a594fd] border-[#7F6DF2]/40'
                : 'bg-neutral-900/80 text-neutral-400 hover:text-white border-neutral-800 hover:bg-neutral-800'
            }`}
            title="촬영 메타데이터 확인"
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">사진 정보</span>
          </button>
          <div className="text-[13px] font-mono text-neutral-400">
            {item.sizeFormatted}
          </div>
        </div>
      </div>
    </div>
  );
}
