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

function FileIcon({ category, className = 'h-5 w-5' }) {
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
    );
  };

  return (
    <div className="w-full overflow-x-auto select-none rounded-xl border border-slate-800 bg-[#0f172a]/70">
      <table className="w-full text-left text-sm text-slate-200">
        <thead className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/60">
          <tr>
            <th
              onClick={() => handleSort('name')}
              className="py-3.5 pl-5 pr-4 cursor-pointer hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <span>이름</span>
                {renderSortIcon('name')}
              </div>
            </th>
            <th
              onClick={() => handleSort('date')}
              className="py-3.5 px-4 cursor-pointer hover:text-white transition hidden sm:table-cell"
            >
              <div className="flex items-center gap-2">
                <span>수정한 날짜</span>
                {renderSortIcon('date')}
              </div>
            </th>
            <th className="py-3.5 px-4 hidden md:table-cell">유형</th>
            <th
              onClick={() => handleSort('size')}
              className="py-3.5 pl-4 pr-5 text-right cursor-pointer hover:text-white transition"
            >
              <div className="flex items-center justify-end gap-2">
                <span>크기</span>
                {renderSortIcon('size')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
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
                    ? 'bg-indigo-600/15 text-white'
                    : 'hover:bg-slate-800/50 text-slate-200'
                }`}
              >
                <td className="py-3 pl-5 pr-4">
                  <div className="flex items-center gap-3">
                    <FileIcon category={item.category} className="h-5 w-5 shrink-0" />
                    <span className="truncate max-w-[280px] sm:max-w-md font-sans text-sm font-medium">
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs hidden sm:table-cell">
                  {formatDate(item.mtime)}
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs font-sans capitalize hidden md:table-cell">
                  {item.isDirectory ? '폴더' : item.category}
                </td>
                <td className="py-3 pl-4 pr-5 text-right text-slate-300 text-xs font-mono">
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
