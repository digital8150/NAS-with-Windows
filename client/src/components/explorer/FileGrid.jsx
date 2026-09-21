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

function FileIcon({ category, className = 'h-8 w-8' }) {
  switch (category) {
    case 'folder':
      return <Folder className={`${className} text-amber-400 fill-amber-400/10`} />;
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
      <div className="flex h-64 items-center justify-center text-slate-500 text-sm">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-transparent mr-2" />
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-500 text-sm">
        <Folder className="h-10 w-10 stroke-1 text-slate-600 mb-2" />
        <span>폴더가 비어 있습니다.</span>
      </div>
    );
  }

  // 줌 레벨에 따른 그리드 클래스
  const gridClasses = {
    1: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2',
    2: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5',
    3: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3',
    4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5'
  }[zoomLevel] || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3';

  const iconSizes = {
    1: 'h-6 w-6',
    2: 'h-8 w-8',
    3: 'h-10 w-10',
    4: 'h-14 w-14',
    5: 'h-16 w-16'
  }[zoomLevel] || 'h-10 w-10';

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
    <div className={`grid ${gridClasses} select-none p-1`}>
      {items.map((item) => {
        const isSelected = selectedPaths.has(item.path);

        return (
          <div
            key={item.path}
            onClick={(e) => handleItemClick(e, item)}
            onDoubleClick={() => handleDoubleClick(item)}
            className={`group relative flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition cursor-pointer ${
              isSelected
                ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                : 'border-slate-800/80 bg-[#0f172a]/60 hover:border-slate-700 hover:bg-[#0f172a]'
            }`}
          >
            <div className="flex items-center justify-center my-2">
              <FileIcon category={item.category} className={iconSizes} />
            </div>

            <span
              className="mt-1 w-full truncate text-xs font-medium text-slate-200 group-hover:text-white"
              title={item.name}
            >
              {item.name}
            </span>

            <span className="mt-0.5 text-[11px] text-slate-500 font-mono">
              {item.isDirectory ? '폴더' : item.sizeFormatted}
            </span>
          </div>
        );
      })}
    </div>
  );
}
