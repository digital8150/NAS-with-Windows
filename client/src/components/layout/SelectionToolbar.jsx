import React from 'react';
import { Download, Edit3, Trash2, X, Eye, Share2 } from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';
import { getDownloadUrl } from '../../services/api';

export default function SelectionToolbar({ toolbarRef, onRename, onDelete, onPreview, onShare }) {
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
    <div
      ref={toolbarRef}
      className="fixed bottom-10 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex items-center justify-between sm:justify-start gap-1 sm:gap-2.5 rounded-2xl border border-[#E9E9E7] bg-white px-3 sm:px-5 py-2.5 sm:py-3 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 select-none text-[14px] sm:text-[15px] font-medium max-w-xl sm:max-w-none mx-auto"
    >
      <span className="font-semibold text-[#191919] pr-2 sm:pr-3 border-r border-[#E9E9E7] whitespace-nowrap text-xs sm:text-sm">
        {count}개<span className="hidden sm:inline"> 선택됨</span>
      </span>

      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
        {isSingle && singleItem && !singleItem.isDirectory && onPreview && (
          <button
            onClick={() => onPreview(singleItem)}
            className="flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-[#37352F] transition hover:bg-[#F7F6F3] hover:text-[#7F6DF2]"
            title="미리보기"
          >
            <Eye className="h-4 w-4 text-[#73726E]" />
            <span className="hidden sm:inline">미리보기</span>
          </button>
        )}

        {isSingle && singleItem && !singleItem.isDirectory && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-[#37352F] transition hover:bg-[#F7F6F3] hover:text-[#7F6DF2]"
            title="다운로드"
          >
            <Download className="h-4 w-4 text-[#73726E]" />
            <span className="hidden sm:inline">다운로드</span>
          </button>
        )}

        {isSingle && (
          <button
            onClick={() => onRename(singlePath)}
            className="flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-[#37352F] transition hover:bg-[#F7F6F3] hover:text-[#7F6DF2]"
            title="이름 변경"
          >
            <Edit3 className="h-4 w-4 text-[#73726E]" />
            <span className="hidden sm:inline">이름 변경</span>
          </button>
        )}

        {isSingle && singleItem && singleItem.isDirectory && onShare && (
          <button
            onClick={() => onShare(singleItem)}
            className="flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-[#37352F] transition hover:bg-[#F7F6F3] hover:text-[#7F6DF2]"
            title="공유"
          >
            <Share2 className="h-4 w-4 text-[#73726E]" />
            <span className="hidden sm:inline">공유</span>
          </button>
        )}

        <button
          onClick={() => onDelete(selectedList)}
          className="flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-[#E03E3E] transition hover:bg-red-50 hover:text-red-600"
          title="삭제"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">삭제</span>
        </button>
      </div>

      <button
        onClick={clearSelection}
        className="ml-1 rounded-xl p-2 text-[#9B9A97] transition hover:bg-[#F7F6F3] hover:text-[#191919]"
        title="선택 해제"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
