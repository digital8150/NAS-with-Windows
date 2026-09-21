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
import { getDownloadUrl } from '../../services/api';

function FileThumbnail({ item, iconSize = 'h-12 w-12' }) {
  if (item.category === 'image' && !item.isDirectory) {
    return (
      <div className="w-full aspect-square flex items-center justify-center rounded-xl bg-[#F7F6F3] overflow-hidden">
        <img
          src={getDownloadUrl(item.path)}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
    );
  }

  const iconMapping = {
    folder: <Folder className={`${iconSize} text-amber-500 fill-amber-500/20`} />,
    video: <Film className={`${iconSize} text-[#7F6DF2]`} />,
    audio: <Music className={`${iconSize} text-emerald-500`} />,
    image: <ImageIcon className={`${iconSize} text-rose-500`} />,
    document: <FileText className={`${iconSize} text-sky-500`} />,
    archive: <Archive className={`${iconSize} text-orange-500`} />,
    subtitle: <Subtitles className={`${iconSize} text-teal-500`} />
  };

  const icon = iconMapping[item.category] || <File className={`${iconSize} text-[#9B9A97]`} />;

  return (
    <div className="w-full aspect-square flex items-center justify-center rounded-xl bg-[#F7F6F3] border border-[#E9E9E7]/60 group-hover:bg-[#F4F3EF] transition">
      {icon}
    </div>
  );
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
      <div className="flex h-72 items-center justify-center text-[#73726E] text-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7F6DF2] border-t-transparent mr-3" />
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-72 items-center justify-center text-[#E03E3E] text-sm">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-[#9B9A97]">
        <Folder className="h-12 w-12 stroke-1 text-[#C4C4C0] mb-3" />
        <span className="text-sm font-medium text-[#73726E]">폴더가 비어 있습니다.</span>
      </div>
    );
  }

  const gridClasses = {
    1: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3',
    2: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4',
    3: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5',
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
            className={`group relative flex flex-col rounded-2xl border bg-white p-4 transition-all duration-150 cursor-pointer shadow-xs ${
              isSelected
                ? 'border-2 border-[#7F6DF2] shadow-md ring-2 ring-[#7F6DF2]/20'
                : 'border-[#E9E9E7] hover:border-[#C4C4C0] hover:shadow-md'
            }`}
          >
            {/* 스크린샷 1:1 썸네일 영역 */}
            <FileThumbnail item={item} iconSize={iconSizes} />

            {/* 파일명 (14px font-medium #37352F) */}
            <span
              className="mt-3 truncate text-center text-sm font-medium text-[#37352F] group-hover:text-[#191919]"
              title={item.name}
            >
              {item.name}
            </span>

            {/* 파일 크기 (12px #73726E font-mono) */}
            <span className="mt-0.5 text-center text-xs text-[#73726E] font-mono">
              {item.isDirectory ? '폴더' : item.sizeFormatted}
            </span>
          </div>
        );
      })}
    </div>
  );
}
