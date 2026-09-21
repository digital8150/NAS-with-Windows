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
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-2xl border border-[#E9E9E7] bg-white px-5 py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 select-none text-[15px] font-medium">
      <span className="font-semibold text-[#191919] pr-3 border-r border-[#E9E9E7]">
        {count}개 선택됨
      </span>

      {isSingle && singleItem && !singleItem.isDirectory && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[#37352F] transition hover:bg-[#F7F6F3] hover:text-[#7F6DF2]"
        >
          <Download className="h-4 w-4 text-[#73726E]" />
          <span>다운로드</span>
        </button>
      )}

      {isSingle && (
        <button
          onClick={() => onRename(singlePath)}
          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[#37352F] transition hover:bg-[#F7F6F3] hover:text-[#7F6DF2]"
        >
          <Edit3 className="h-4 w-4 text-[#73726E]" />
          <span>이름 변경</span>
        </button>
      )}

      <button
        onClick={() => onDelete(selectedList)}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[#E03E3E] transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
        <span>삭제</span>
      </button>

      <button
        onClick={clearSelection}
        className="ml-1 rounded-xl p-1.5 text-[#9B9A97] transition hover:bg-[#F7F6F3] hover:text-[#191919]"
        title="선택 해제"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
