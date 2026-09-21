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
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-800 bg-[#090d16] px-5 select-none shrink-0 gap-4">
      {/* 검색창 */}
      <div className="relative w-64 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="파일 검색..."
          className="h-8 w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 outline-none transition focus:border-blue-500/60 focus:bg-slate-900"
        />
      </div>

      {/* 우측 컨트롤 도구들 */}
      <div className="flex items-center gap-3">
        {/* 줌 슬라이더 (그리드 모드 전용) */}
        {viewMode === 'grid' && (
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <Sliders className="h-3 w-3 text-slate-500" />
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="h-1 w-16 accent-blue-500 bg-slate-800 rounded-lg cursor-pointer"
              title="아이콘 크기"
            />
          </div>
        )}

        {/* 뷰 모드 토글 (그리드 / 리스트) */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-1.5 transition ${
              viewMode === 'grid'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="바둑판식 보기"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-md p-1.5 transition ${
              viewMode === 'list'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="자세히 보기"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* 새로고침 */}
        <button
          onClick={refresh}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          title="새로고침"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* 새 폴더 */}
        <button
          onClick={onNewFolder}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">새 폴더</span>
        </button>

        {/* 파일 업로드 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-500"
        >
          <Upload className="h-3.5 w-3.5" />
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
