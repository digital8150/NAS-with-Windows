import React from 'react';
import { Download, Edit3, Trash2, X } from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';
import { getDownloadUrl } from '../../services/api';

export default function SelectionToolbar({ onRename, onDelete }) {
  const { selectedPaths, clearSelection, items } = useExplorer();

  if (selectedPaths.size === 0) return null;

  const count = selectedPaths.size;
  const isSingle = count === 1;
  const selectedList = Array.from(selectedPaths);
  const singlePath = isSingle ? selectedList[0] : null;
  const singleItem = isSingle ? items.find(i => i.path === singlePath) : null;

  const handleDownload = () => {
    if (isSingle && singleItem && !singleItem.isDirectory) {
      window.open(getDownloadUrl(singlePath), '_blank');
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-[#0f172a] px-5 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 select-none">
      <span className="text-sm font-semibold text-slate-200 pr-3 border-r border-slate-800">
        {count}개 선택됨
      </span>

      {isSingle && singleItem && !singleItem.isDirectory && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
        >
          <Download className="h-4 w-4 text-slate-400" />
          <span>다운로드</span>
        </button>
      )}

      {isSingle && (
        <button
          onClick={() => onRename(singlePath)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
        >
          <Edit3 className="h-4 w-4 text-slate-400" />
          <span>이름 변경</span>
        </button>
      )}

      <button
        onClick={() => onDelete(selectedList)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" />
        <span>삭제</span>
      </button>

      <button
        onClick={clearSelection}
        className="ml-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        title="선택 해제"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
