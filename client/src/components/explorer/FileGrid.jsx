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
import { getThumbnailUrl } from '../../services/api';
import useProgressiveItems from '../../hooks/useProgressiveItems';

const FileThumbnail = React.memo(function FileThumbnail({ item, iconSize = 'h-12 w-12' }) {
  const [thumbError, setThumbError] = React.useState(false);

  if (item.category === 'image' && !item.isDirectory && !thumbError) {
    const src = getThumbnailUrl(item.path, item.mtime);
    return (
      <div className="w-full aspect-square flex items-center justify-center rounded-xl bg-[#F7F6F3] overflow-hidden">
        <img
          src={src}
          alt={item.name}
          loading="lazy"
          decoding="async"
          onError={() => setThumbError(true)}
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
});

const GridItem = React.memo(function GridItem({
  item,
  iconSize,
  isSelected,
  onItemClick,
  onItemDoubleClick
}) {
  const lastTapRef = React.useRef(0);

  const handleTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      e.preventDefault();
      onItemDoubleClick(item);
    }
    lastTapRef.current = now;
  };

  return (
    <div
      onClick={(event) => onItemClick(event, item)}
      onDoubleClick={() => onItemDoubleClick(item)}
      onTouchEnd={handleTouchEnd}
      className={`file-grid-item group relative flex flex-col rounded-2xl border bg-white p-3 sm:p-4 transition-[border-color,box-shadow] duration-150 cursor-pointer shadow-xs ${
        isSelected
          ? 'border-2 border-[#7F6DF2] shadow-md ring-2 ring-[#7F6DF2]/20'
          : 'border-[#E9E9E7] hover:border-[#C4C4C0] hover:shadow-md'
      }`}
    >
      <FileThumbnail item={item} iconSize={iconSize} />
      <span
        className="mt-2.5 sm:mt-3 truncate text-center text-[13px] sm:text-[15px] font-medium text-[#37352F] group-hover:text-[#191919]"
        title={item.name}
      >
        {item.name}
      </span>
      <span className="mt-0.5 text-center text-[11px] sm:text-[13px] text-[#73726E] font-mono">
        {item.isDirectory ? '폴더' : item.sizeFormatted}
      </span>
    </div>
  );
});

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

  const onOpenFileRef = React.useRef(onOpenFile);
  onOpenFileRef.current = onOpenFile;

  const { visibleItems, hasMore, sentinelRef } = useProgressiveItems(items, {
    initialCount: 80,
    batchSize: 80
  });

  const handleItemClick = React.useCallback((e, item) => {
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    toggleSelection(item.path, isMulti);
  }, [toggleSelection]);

  const handleDoubleClick = React.useCallback((item) => {
    if (item.isDirectory) {
      navigateTo(item.path);
    } else {
      onOpenFileRef.current?.(item);
    }
  }, [navigateTo]);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-[#73726E] text-[15px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7F6DF2] border-t-transparent mr-3" />
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-72 items-center justify-center text-[#E03E3E] text-[15px]">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-[#9B9A97]">
        <Folder className="h-12 w-12 stroke-1 text-[#C4C4C0] mb-3" />
        <span className="text-[15px] font-medium text-[#73726E]">폴더가 비어 있습니다.</span>
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

  return (
    <div className={`grid ${gridClasses} select-none`}>
      {visibleItems.map((item) => {
        const isSelected = selectedPaths.has(item.path);

        return (
          <GridItem
            key={item.path}
            item={item}
            iconSize={iconSizes}
            isSelected={isSelected}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleDoubleClick}
          />
        );
      })}
      {hasMore && <div ref={sentinelRef} className="col-span-full h-px" aria-hidden="true" />}
    </div>
  );
}
