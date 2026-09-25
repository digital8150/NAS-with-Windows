import React from 'react';
import {
  Folder,
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  Archive,
  File,
  Subtitles,
  ArrowUp,
  ArrowUpDown,
  ArrowDown
} from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';
import useProgressiveItems from '../../hooks/useProgressiveItems';

function FileIcon({ category, className = 'h-4 w-4' }) {
  switch (category) {
    case 'folder':
      return <Folder className={`${className} text-amber-500 fill-amber-500/20`} />;
    case 'video':
      return <Film className={`${className} text-[#7F6DF2]`} />;
    case 'audio':
      return <Music className={`${className} text-emerald-500`} />;
    case 'image':
      return <ImageIcon className={`${className} text-rose-500`} />;
    case 'document':
      return <FileText className={`${className} text-sky-500`} />;
    case 'archive':
      return <Archive className={`${className} text-orange-500`} />;
    case 'subtitle':
      return <Subtitles className={`${className} text-teal-500`} />;
    default:
      return <File className={`${className} text-[#9B9A97]`} />;
  }
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

const FileListRow = React.memo(function FileListRow({
  item,
  isSelected,
  onItemClick,
  onItemDoubleClick
}) {
  return (
    <tr
      onClick={(event) => onItemClick(event, item.path)}
      onDoubleClick={() => onItemDoubleClick(item)}
      className={`file-list-row transition cursor-pointer ${
        isSelected
          ? 'bg-[#F4F0F8] text-[#191919] font-medium'
          : 'hover:bg-[#F7F6F3]'
      }`}
    >
      <td className="py-3.5 pl-6 pr-4">
        <div className="flex items-center gap-3">
          <FileIcon category={item.category} className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[320px] sm:max-w-lg font-medium text-[15px] text-[#37352F]">
            {item.name}
          </span>
        </div>
      </td>
      <td className="py-3.5 px-6 text-[#73726E] text-sm font-mono">
        {item.isDirectory ? '-' : item.sizeFormatted}
      </td>
      <td className="py-3.5 px-6 text-[#73726E] text-sm uppercase hidden md:table-cell font-mono">
        {item.isDirectory ? '폴더' : (item.ext ? item.ext.replace('.', '') : '-')}
      </td>
      <td className="py-3.5 pl-6 pr-8 text-[#73726E] text-sm hidden sm:table-cell font-mono">
        {formatDate(item.mtime)}
      </td>
    </tr>
  );
});

export default function FileList({ onOpenFile }) {
  const {
    items,
    loading,
    error,
    parentPath,
    selectedPaths,
    toggleSelection,
    navigateTo,
    navigateUp,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
  } = useExplorer();

  const onOpenFileRef = React.useRef(onOpenFile);
  onOpenFileRef.current = onOpenFile;

  const { visibleItems, hasMore, sentinelRef } = useProgressiveItems(items, {
    initialCount: 160,
    batchSize: 160
  });

  const handleItemClick = React.useCallback((event, path) => {
    toggleSelection(path, event.ctrlKey || event.metaKey || event.shiftKey);
  }, [toggleSelection]);

  const handleItemDoubleClick = React.useCallback((item) => {
    if (item.isDirectory) navigateTo(item.path);
    else onOpenFileRef.current?.(item);
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-[#9B9A97]" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#7F6DF2]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#7F6DF2]" />
    );
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#E9E9E7] bg-white shadow-xs select-none">
      <table className="w-full text-left text-[15px] text-[#37352F]">
        <thead className="border-b border-[#E9E9E7] text-sm font-semibold text-[#73726E] bg-white">
          <tr>
            <th
              onClick={() => handleSort('name')}
              className="py-3.5 pl-6 pr-4 cursor-pointer hover:text-[#191919] transition"
            >
              <div className="flex items-center gap-2">
                <span>이름</span>
                {renderSortIcon('name')}
              </div>
            </th>
            <th
              onClick={() => handleSort('size')}
              className="py-3.5 px-6 cursor-pointer hover:text-[#191919] transition w-36 text-left"
            >
              <div className="flex items-center gap-2">
                <span>크기</span>
                {renderSortIcon('size')}
              </div>
            </th>
            <th className="py-3.5 px-6 w-28 hidden md:table-cell">종류</th>
            <th
              onClick={() => handleSort('date')}
              className="py-3.5 pl-6 pr-8 cursor-pointer hover:text-[#191919] transition w-36 hidden sm:table-cell"
            >
              <div className="flex items-center gap-2">
                <span>날짜</span>
                {renderSortIcon('date')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F0EE]">
          {/* 상위 폴더 바로가기 (스크린샷 1:1) */}
          {parentPath && (
            <tr
              onClick={navigateUp}
              className="hover:bg-[#F7F6F3] transition cursor-pointer text-[#7F6DF2]"
            >
              <td className="py-3.5 pl-6 pr-4 flex items-center gap-3">
                <ArrowUp className="h-4 w-4" />
                <span className="font-semibold text-[15px]">..</span>
              </td>
              <td className="py-3.5 px-6 text-[#9B9A97] text-sm font-mono">-</td>
              <td className="py-3.5 px-6 text-[#9B9A97] text-sm hidden md:table-cell font-mono">-</td>
              <td className="py-3.5 pl-6 pr-8 text-[#9B9A97] text-sm hidden sm:table-cell font-mono">-</td>
            </tr>
          )}

          {visibleItems.map((item) => {
            const isSelected = selectedPaths.has(item.path);

            return (
              <FileListRow
                key={item.path}
                item={item}
                isSelected={isSelected}
                onItemClick={handleItemClick}
                onItemDoubleClick={handleItemDoubleClick}
              />
            );
          })}

          {hasMore && (
            <tr aria-hidden="true">
              <td colSpan="4" className="h-px p-0">
                <div ref={sentinelRef} className="h-px" />
              </td>
            </tr>
          )}

          {items.length === 0 && !parentPath && (
            <tr>
              <td colSpan="4" className="py-12 text-center text-[15px] text-[#9B9A97]">
                폴더가 비어 있습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
