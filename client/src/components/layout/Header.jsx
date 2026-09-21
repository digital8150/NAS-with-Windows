import React, { useRef } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  FolderPlus,
  UploadCloud,
  RotateCw,
  Minus,
  Plus
} from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

export default function Header({ onNewFolder, onUploadFiles }) {
  const {
    viewMode,
    setViewMode,
    zoomLevel,
    setZoomLevel,
    searchQuery,
    setSearchQuery,
    refresh,
    loading
  } = useExplorer();

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onUploadFiles) {
        onUploadFiles(e.target.files);
      }
      e.target.value = '';
    }
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-[#E9E9E7] bg-white px-6 select-none shrink-0 gap-4">
      {/* 1. 파일 검색창 */}
      <div className="relative w-80 sm:w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9A97]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="파일 검색..."
          className="h-10 w-full rounded-xl border border-[#E9E9E7] bg-[#F4F3EF] pl-10 pr-4 text-sm text-[#37352F] placeholder-[#9B9A97] outline-none transition focus:border-[#7F6DF2] focus:bg-white"
        />
      </div>

      {/* 2. 우측 컨트롤 도구들 */}
      <div className="flex items-center gap-3">
        {/* 줌 슬라이더 (- [====o] +) */}
        {viewMode === 'grid' && (
          <div className="hidden md:flex items-center gap-2 text-[#73726E] mr-2">
            <button
              onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
              className="p-1 hover:text-[#37352F] transition"
              title="축소"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="h-1.5 w-20 accent-[#7F6DF2] bg-[#E9E9E7] rounded-lg cursor-pointer"
            />
            <button
              onClick={() => setZoomLevel(prev => Math.min(5, prev + 1))}
              className="p-1 hover:text-[#37352F] transition"
              title="확대"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 뷰 모드 토글 (List / Grid) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode('list')}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              viewMode === 'list'
                ? 'bg-[#7F6DF2] text-white shadow-sm'
                : 'border border-[#E9E9E7] bg-white text-[#73726E] hover:bg-[#F7F6F3]'
            }`}
            title="목록 보기"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              viewMode === 'grid'
                ? 'bg-[#7F6DF2] text-white shadow-sm'
                : 'border border-[#E9E9E7] bg-white text-[#73726E] hover:bg-[#F7F6F3]'
            }`}
            title="바둑판식 보기"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* 새로고침 */}
        <button
          onClick={refresh}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9E9E7] bg-white text-[#73726E] hover:bg-[#F7F6F3] hover:text-[#37352F] transition disabled:opacity-50"
          title="새로고침"
        >
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* 새 폴더 */}
        <button
          onClick={onNewFolder}
          className="flex h-10 items-center gap-2 rounded-xl border border-[#E9E9E7] bg-white px-4 text-sm font-medium text-[#37352F] hover:bg-[#F7F6F3] transition shadow-xs"
        >
          <FolderPlus className="h-4 w-4 text-[#73726E]" />
          <span>새 폴더</span>
        </button>

        {/* 업로드 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 items-center gap-2 rounded-xl bg-[#7F6DF2] px-4 text-sm font-medium text-white hover:bg-[#6855dd] transition shadow-sm"
        >
          <UploadCloud className="h-4 w-4" />
          <span>업로드</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
      </div>
    </header>
  );
}
