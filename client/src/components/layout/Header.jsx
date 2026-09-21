import React, { useRef } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  FolderPlus,
  Upload,
  RotateCw,
  Sliders
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
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-800 bg-[#0d1424] px-6 select-none shrink-0 gap-4">
      {/* 검색창 */}
      <div className="relative w-72 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="파일 및 폴더 검색..."
          className="h-9 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-slate-900"
        />
      </div>

      {/* 우측 컨트롤 도구들 */}
      <div className="flex items-center gap-3.5">
        {/* 줌 슬라이더 (그리드 모드 전용) */}
        {viewMode === 'grid' && (
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1 border-r border-slate-800 text-slate-400">
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="h-1.5 w-20 accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer"
              title="카드 크기"
            />
          </div>
        )}

        {/* 뷰 모드 토글 (그리드 / 리스트) */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-1.5 transition ${
              viewMode === 'grid'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="바둑판식 보기"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-md p-1.5 transition ${
              viewMode === 'list'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="목록 보기"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* 새로고침 */}
        <button
          onClick={refresh}
          disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          title="새로고침"
        >
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* 새 폴더 */}
        <button
          onClick={onNewFolder}
          className="flex h-9 items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
        >
          <FolderPlus className="h-4 w-4 text-slate-300" />
          <span className="hidden sm:inline">새 폴더</span>
        </button>

        {/* 파일 업로드 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500 shadow-sm"
        >
          <Upload className="h-4 w-4" />
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
