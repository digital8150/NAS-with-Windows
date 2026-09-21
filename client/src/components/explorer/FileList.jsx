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
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

function FileIcon({ category, className = 'h-4 w-4' }) {
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

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function FileList({ onOpenFile }) {
  const {
    items,
    loading,
    error,
    selectedPaths,
    toggleSelection,
    navigateTo,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 text-slate-600" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-blue-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-400" />
    );
  };

  return (
    <div className="w-full overflow-x-auto select-none">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="border-b border-slate-800 text-[11px] font-medium text-slate-400">
          <tr>
            <th
              onClick={() => handleSort('name')}
              className="py-2.5 pl-4 pr-3 cursor-pointer hover:text-slate-200 transition"
            >
              <div className="flex items-center gap-1.5">
                <span>이름</span>
                {renderSortIcon('name')}
              </div>
            </th>
            <th
              onClick={() => handleSort('date')}
              className="py-2.5 px-3 cursor-pointer hover:text-slate-200 transition hidden sm:table-cell"
            >
              <div className="flex items-center gap-1.5">
                <span>수정한 날짜</span>
                {renderSortIcon('date')}
              </div>
            </th>
            <th className="py-2.5 px-3 hidden md:table-cell">유형</th>
            <th
              onClick={() => handleSort('size')}
              className="py-2.5 pl-3 pr-4 text-right cursor-pointer hover:text-slate-200 transition"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>크기</span>
                {renderSortIcon('size')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40 font-mono">
          {items.map((item) => {
            const isSelected = selectedPaths.has(item.path);

            return (
              <tr
                key={item.path}
                onClick={(e) => toggleSelection(item.path, e.ctrlKey || e.metaKey || e.shiftKey)}
                onDoubleClick={() => {
                  if (item.isDirectory) navigateTo(item.path);
                  else if (onOpenFile) onOpenFile(item);
                }}
                className={`transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-500/10 text-slate-100'
                    : 'hover:bg-slate-900/60 text-slate-300'
                }`}
              >
                <td className="py-2 pl-4 pr-3">
                  <div className="flex items-center gap-2.5">
                    <FileIcon category={item.category} className="h-4 w-4 shrink-0" />
                    <span className="truncate max-w-[280px] sm:max-w-md font-sans text-xs font-medium">
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3 text-slate-500 text-[11px] hidden sm:table-cell">
                  {formatDate(item.mtime)}
                </td>
                <td className="py-2 px-3 text-slate-500 text-[11px] font-sans capitalize hidden md:table-cell">
                  {item.isDirectory ? '폴더' : item.category}
                </td>
                <td className="py-2 pl-3 pr-4 text-right text-slate-400 text-[11px]">
                  {item.isDirectory ? '-' : item.sizeFormatted}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
