import React, { useEffect, useMemo } from 'react';
import {
  X,
  Download,
  File,
  Archive,
  Film,
  Music,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import ImageViewer from './ImageViewer';
import AudioPlayerCard from './AudioPlayerCard';
import DocumentViewer from './DocumentViewer';
import ErrorBoundary from '../common/ErrorBoundary';
import { getDownloadUrl } from '../../services/api';

function CategoryIcon({ category, className = 'h-5 w-5' }) {
  switch (category) {
    case 'video':
      return <Film className={`${className} text-[#7F6DF2]`} />;
    case 'audio':
      return <Music className={`${className} text-emerald-400`} />;
    case 'image':
      return <ImageIcon className={`${className} text-rose-400`} />;
    case 'document':
      return <FileText className={`${className} text-sky-400`} />;
    case 'archive':
      return <Archive className={`${className} text-orange-400`} />;
    default:
      return <File className={`${className} text-neutral-400`} />;
  }
}

export default function PreviewModal({ item, allItems = [], onClose, onSelectItem }) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 이미지 탐색을 위해 현재 폴더의 전체 이미지 목록 필터링
  const allImages = useMemo(() => {
    return allItems.filter((i) => i.category === 'image' && !i.isDirectory);
  }, [allItems]);

  if (!item) return null;

  const downloadUrl = getDownloadUrl(item.path);

  const handleDownload = (e) => {
    e.stopPropagation();
    window.open(downloadUrl, '_blank');
  };

  const renderContent = () => {
    switch (item.category) {
      case 'video':
        return <VideoPlayer item={item} />;
      case 'image':
        return (
          <ImageViewer
            item={item}
            allImages={allImages.length > 0 ? allImages : [item]}
            onSelectImage={onSelectItem}
          />
        );
      case 'audio':
        return <AudioPlayerCard item={item} />;
      case 'document':
        return <DocumentViewer item={item} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-[#16161a] border border-neutral-800 rounded-2xl max-w-md mx-auto text-center shadow-2xl">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-800/80 text-neutral-300">
              <CategoryIcon category={item.category} className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1 truncate max-w-xs" title={item.name}>
              {item.name}
            </h3>
            <p className="text-[13px] text-neutral-400 font-mono mb-6">
              {item.sizeFormatted}
            </p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-xl bg-[#7F6DF2] px-6 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#6855dd] shadow-lg shadow-[#7F6DF2]/20"
            >
              <Download className="h-4 w-4" />
              <span>파일 다운로드</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200 select-none overflow-hidden"
    >
      {/* 1. 모달 상단 헤더 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between w-full max-w-6xl mx-auto mb-4 px-2 text-white shrink-0"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          <CategoryIcon category={item.category} className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold truncate" title={item.name}>
              {item.name}
            </h2>
            <p className="text-[13px] text-neutral-400 font-mono truncate">
              {item.sizeFormatted} {item.mtime ? `· ${new Date(item.mtime).toLocaleDateString()}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/80 px-3.5 py-2 text-[14px] font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
            title="다운로드"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">다운로드</span>
          </button>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
            title="닫기 (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 2. 미디어 플레이어 / 뷰어 메인 영역 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 flex items-center justify-center w-full max-w-6xl mx-auto overflow-hidden"
      >
        <ErrorBoundary onReset={onClose}>
          {renderContent()}
        </ErrorBoundary>
      </div>
    </div>
  );
}
