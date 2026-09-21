import React from 'react';
import {
  Folder,
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  Archive,
  File,
  Subtitles
} from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

function FileIcon({ category, className = 'h-10 w-10' }) {
  switch (category) {
    case 'folder':
      return <Folder className={`${className} text-amber-400 fill-amber-400/20`} />;
    case 'video':
      return <Film className={`${className} text-indigo-400`} />;
    case 'audio':
      return <Music className={`${className} text-emerald-400`} />;
    case 'image':
      return <ImageIcon className={`${className} text-rose-400`} />;
    case 'document':
      return <FileText className={`${className} text-sky-400`} />;
    case 'archive':
      return <Archive className={`${className} text-orange-400`} />;
    case 'subtitle':
      return <Subtitles className={`${className} text-teal-400`} />;
    default:
      return <File className={`${className} text-slate-400`} />;
  }
}

export default function FileGrid({ onOpenFile }) {
  const {
    items,
    loading,
    error,
    zoomLevel,
    selectedPaths,
    toggleSelection,
    navigateTo
  } = useExplorer();

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-slate-400 text-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-3" />
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-72 items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-slate-500 text-sm">
        <Folder className="h-12 w-12 stroke-1 text-slate-600 mb-3" />
        <span className="text-base font-medium text-slate-400">폴더가 비어 있습니다.</span>
      </div>
    );
  }

  // 줌 레벨에 따른 그리드 컬럼 및 아이콘 크기 (기존 프로젝트 기조의 넉넉한 카드)
  const gridClasses = {
    1: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3',
    2: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4',
    3: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5', // 기본 180px~200px
    4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6'
  }[zoomLevel] || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5';

  const iconSizes = {
    1: 'h-8 w-8',
    2: 'h-10 w-10',
    3: 'h-12 w-12',
    4: 'h-16 w-16',
    5: 'h-20 w-20'
  }[zoomLevel] || 'h-12 w-12';

  const handleItemClick = (e, item) => {
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    toggleSelection(item.path, isMulti);
  };

  const handleDoubleClick = (item) => {
    if (item.isDirectory) {
      navigateTo(item.path);
    } else if (onOpenFile) {
      onOpenFile(item);
    }
  };

  return (
    <div className={`grid ${gridClasses} select-none`}>
      {items.map((item) => {
        const isSelected = selectedPaths.has(item.path);

        return (
          <div
            key={item.path}
            onClick={(e) => handleItemClick(e, item)}
            onDoubleClick={() => handleDoubleClick(item)}
            className={`group relative flex flex-col rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
              isSelected
                ? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-1 ring-indigo-500/50 -translate-y-0.5'
                : 'border-slate-800 bg-[#0f172a] hover:border-indigo-500/60 hover:shadow-lg hover:-translate-y-1'
            }`}
          >
            {/* 기존 프로젝트의 시원한 정방형 file-icon 컨테이너 */}
            <div className="w-full aspect-square flex items-center justify-center rounded-lg bg-slate-900/90 mb-3 border border-slate-800/60 group-hover:bg-slate-900 transition">
              <FileIcon category={item.category} className={iconSizes} />
            </div>

            {/* 파일명 (14px 표준 폰트) */}
            <span
              className="truncate text-sm font-medium text-slate-100 group-hover:text-white"
              title={item.name}
            >
              {item.name}
            </span>

            {/* 파일 정보 (12px 서브텍스트) */}
            <span className="mt-1 text-xs text-slate-400 font-mono">
              {item.isDirectory ? '폴더' : item.sizeFormatted}
            </span>
          </div>
        );
      })}
    </div>
  );
}
