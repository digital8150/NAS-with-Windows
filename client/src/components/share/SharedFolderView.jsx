import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Folder,
  ChevronRight,
  Home,
  ArrowUp,
  Download,
  Search,
  LayoutGrid,
  List,
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  Archive,
  File,
  Subtitles,
  Eye,
  AlertCircle,
  Loader2,
  HardDrive
} from 'lucide-react';
import {
  getPublicShare,
  getPublicShareDownloadUrl,
  getPublicSharePreviewUrl,
  getPublicShareThumbnailUrl,
  getPublicShareStreamUrl
} from '../../services/api';
import PreviewModal from '../preview/PreviewModal';
import useProgressiveItems from '../../hooks/useProgressiveItems';

const SPECIAL_IMAGE_EXTS = [
  '.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef',
  '.psd', '.ai', '.tiff', '.tif'
];

function FileItemIcon({ category, className = 'h-5 w-5' }) {
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

const SharedFileThumbnail = React.memo(function SharedFileThumbnail({ item }) {
  const [thumbError, setThumbError] = React.useState(false);

  if (item.category === 'image' && !item.isDirectory && !thumbError) {
    const src = item.thumbnailUrl || item.previewUrl || item.downloadUrl;
    return (
      <div className="w-full aspect-square flex items-center justify-center rounded-xl bg-[#F7F6F3] dark:bg-neutral-900 overflow-hidden mb-2">
        <img
          src={src}
          alt={item.name}
          loading="lazy"
          decoding="async"
          onError={() => setThumbError(true)}
          className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div className="w-full aspect-square flex items-center justify-center rounded-xl bg-[#F7F6F3] dark:bg-neutral-900 overflow-hidden mb-2">
      <FileItemIcon category={item.category} className="h-10 w-10 sm:h-12 sm:w-12" />
    </div>
  );
});

export default function SharedFolderView() {
  const { shareId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const subpath = searchParams.get('path') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getPublicShare(shareId, subpath)
      .then((data) => {
        if (!isMounted) return;

        // 파일들에 공유 전용 다운로드/스트림/미리보기/썸네일 URL 매핑
        const augmentedItems = (data.items || []).map((item) => ({
          ...item,
          path: item.subpath,
          shareId,
          downloadUrl: getPublicShareDownloadUrl(shareId, item.subpath),
          previewUrl: getPublicSharePreviewUrl(shareId, item.subpath),
          thumbnailUrl: getPublicShareThumbnailUrl(shareId, item.subpath, item.mtime),
          streamUrl: getPublicShareStreamUrl(shareId, item.subpath)
        }));

        setShareData({
          ...data,
          items: augmentedItems
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || '공유된 폴더를 불러올 수 없습니다.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [shareId, subpath]);

  // 검색어 필터링
  const filteredItems = useMemo(() => {
    if (!shareData?.items) return [];
    if (!searchQuery.trim()) return shareData.items;
    const query = searchQuery.toLowerCase().trim();
    return shareData.items.filter((i) => i.name.toLowerCase().includes(query));
  }, [shareData?.items, searchQuery]);

  // 점진적 로딩 (대용량 폴더 모바일 스크롤 최적화)
  const { visibleItems, hasMore, sentinelRef } = useProgressiveItems(filteredItems, {
    initialCount: 40,
    batchSize: 40
  });

  const handleNavigateSubpath = (newSubpath) => {
    if (newSubpath) {
      setSearchParams({ path: newSubpath });
    } else {
      setSearchParams({});
    }
  };

  const handleNavigateUp = () => {
    if (!subpath) return;
    const segments = subpath.split('/').filter(Boolean);
    segments.pop();
    handleNavigateSubpath(segments.join('/'));
  };

  if (loading && !shareData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3] dark:bg-[#121214] text-[#73726E]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#7F6DF2]" />
          <span className="text-[15px] font-medium">공유된 폴더를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error && !shareData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3] dark:bg-[#121214] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#E9E9E7] dark:border-neutral-800 bg-white dark:bg-[#1c1c20] p-8 text-center shadow-xl">
          <AlertCircle className="h-12 w-12 text-[#E03E3E] mx-auto mb-4 stroke-1" />
          <h2 className="text-lg font-bold text-[#191919] dark:text-white mb-2">
            접근할 수 없는 공유 링크
          </h2>
          <p className="text-[14px] text-[#73726E] dark:text-neutral-400 mb-6 leading-relaxed">
            {error}
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#7F6DF2] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#6e5cd6]"
          >
            홈으로 이동
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#F7F6F3] dark:bg-[#111113] text-[#191919] dark:text-neutral-100 select-none">
      {/* 1. 상단 글로벌 헤더 */}
      <header className="flex h-16 w-full items-center justify-between border-b border-[#E9E9E7] dark:border-neutral-800 bg-white dark:bg-[#16161a] px-3.5 sm:px-8 gap-2 sm:gap-4 shrink-0 shadow-sm z-30">
        {/* 좌측: 로고 및 폴더 타이틀 */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Folder className="h-5 w-5 fill-amber-500/20" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold truncate text-[#191919] dark:text-white">
                {shareData?.folderName || '공유 폴더'}
              </h1>
              <span className="hidden sm:inline-block rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                읽기 전용
              </span>
            </div>
          </div>
        </div>

        {/* 우측 도구: 검색 및 뷰 모드 토글 */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative w-36 sm:w-64 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9A97]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="파일 검색..."
              className="h-9 w-full rounded-xl border border-[#E9E9E7] dark:border-neutral-700 bg-[#F4F3EF] dark:bg-neutral-900 pl-8 pr-3 text-[13px] text-[#37352F] dark:text-neutral-200 placeholder-[#9B9A97] outline-none transition focus:border-[#7F6DF2]"
            />
          </div>

          <div className="flex items-center rounded-xl border border-[#E9E9E7] dark:border-neutral-800 bg-[#F4F3EF] dark:bg-neutral-900 p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-neutral-800 text-[#7F6DF2] shadow-sm'
                  : 'text-[#9B9A97] hover:text-[#37352F] dark:hover:text-neutral-300'
              }`}
              title="격자 보기"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-neutral-800 text-[#7F6DF2] shadow-sm'
                  : 'text-[#9B9A97] hover:text-[#37352F] dark:hover:text-neutral-300'
              }`}
              title="목록 보기"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. 네비게이션 브레드크럼 바 */}
      <div className="flex items-center justify-between border-b border-[#E9E9E7] dark:border-neutral-800 bg-white/80 dark:bg-[#16161a]/80 backdrop-blur-sm px-3.5 sm:px-8 py-2 text-[14px] shrink-0">
        <nav className="flex items-center gap-1.5 text-[#73726E] dark:text-neutral-400 overflow-x-auto py-1 scrollbar-none min-w-0 flex-1 touch-pan-x">
          <button
            onClick={handleNavigateUp}
            disabled={!subpath}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E9E9E7] dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[#73726E] dark:text-neutral-400 hover:bg-[#F7F6F3] dark:hover:bg-neutral-800 transition disabled:opacity-30 disabled:hover:bg-white mr-1 shrink-0"
            title="상위 폴더"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>

          {(shareData?.breadcrumbs || []).map((crumb, idx) => {
            const isLast = idx === (shareData?.breadcrumbs || []).length - 1;
            return (
              <React.Fragment key={crumb.subpath || 'root'}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-[#9B9A97] shrink-0" />}
                <button
                  onClick={() => !isLast && handleNavigateSubpath(crumb.subpath)}
                  disabled={isLast}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 transition shrink-0 ${
                    isLast
                      ? 'text-[#191919] dark:text-white font-semibold cursor-default'
                      : 'text-[#73726E] dark:text-neutral-400 hover:text-[#7F6DF2]'
                  }`}
                >
                  {idx === 0 && <Home className="h-3.5 w-3.5" />}
                  <span>{crumb.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <span className="text-[12px] text-[#9B9A97] dark:text-neutral-500 hidden sm:inline shrink-0 ml-2">
          항목 {filteredItems.length}개
        </span>
      </div>

      {/* 3. 파일 및 폴더 뷰 영역 */}
      <main className="flex-1 overflow-y-auto p-3.5 sm:p-8 max-w-7xl mx-auto w-full scrollbar-thin touch-pan-y">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-[#73726E]">
            <Loader2 className="h-6 w-6 animate-spin text-[#7F6DF2] mr-2" />
            <span>불러오는 중...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center text-[#9B9A97] dark:text-neutral-500">
            <Folder className="h-12 w-12 stroke-1 text-[#C4C4C0] dark:text-neutral-700 mb-2" />
            <span className="text-[15px] font-medium text-[#73726E] dark:text-neutral-400">
              {searchQuery ? '일치하는 항목이 없습니다.' : '폴더가 비어 있습니다.'}
            </span>
          </div>
        ) : viewMode === 'grid' ? (
          /* 격자 뷰 */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
            {visibleItems.map((item) => (
              <div
                key={item.subpath}
                onClick={() => {
                  if (item.isDirectory) {
                    handleNavigateSubpath(item.subpath);
                  } else {
                    setPreviewItem(item);
                  }
                }}
                className="file-grid-item group relative flex flex-col rounded-2xl border border-[#E9E9E7] dark:border-neutral-800/80 bg-white dark:bg-[#18181c] p-2.5 sm:p-3 transition hover:shadow-md hover:border-[#7F6DF2]/50 cursor-pointer"
              >
                {/* 썸네일/아이콘 */}
                <SharedFileThumbnail item={item} />

                {/* 이름 및 크기 */}
                <div className="flex-1 min-w-0">
                  <span
                    className="block text-[13px] sm:text-[14px] font-medium text-[#191919] dark:text-neutral-200 truncate group-hover:text-[#7F6DF2] transition"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <span className="text-[11px] sm:text-[12px] text-[#9B9A97] dark:text-neutral-500 font-mono">
                    {item.isDirectory ? '폴더' : item.sizeFormatted}
                  </span>
                </div>

                {/* 파일 다운로드 / 미리보기 단축 버튼 */}
                {!item.isDirectory && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-0 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="rounded-lg bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm p-1.5 text-[#37352F] dark:text-neutral-200 shadow-md hover:text-[#7F6DF2] transition"
                      title="미리보기"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(item.downloadUrl, '_blank');
                      }}
                      className="rounded-lg bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm p-1.5 text-[#37352F] dark:text-neutral-200 shadow-md hover:text-[#7F6DF2] transition"
                      title="다운로드"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {hasMore && <div ref={sentinelRef} className="col-span-full h-px" aria-hidden="true" />}
          </div>
        ) : (
          /* 목록 뷰 */
          <div className="rounded-2xl border border-[#E9E9E7] dark:border-neutral-800 bg-white dark:bg-[#18181c] overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 px-4 sm:px-5 py-3 border-b border-[#E9E9E7] dark:border-neutral-800 text-[12px] font-semibold text-[#8E8E93] uppercase">
              <span className="col-span-8 sm:col-span-8">이름</span>
              <span className="col-span-4 sm:col-span-2 text-right">크기</span>
              <span className="hidden sm:inline sm:col-span-2 text-right">작업</span>
            </div>
            <div className="divide-y divide-[#E9E9E7]/60 dark:divide-neutral-800/60">
              {visibleItems.map((item) => (
                <div
                  key={item.subpath}
                  onClick={() => {
                    if (item.isDirectory) {
                      handleNavigateSubpath(item.subpath);
                    } else {
                      setPreviewItem(item);
                    }
                  }}
                  className="grid grid-cols-12 items-center px-4 sm:px-5 py-3 text-[14px] hover:bg-[#F7F6F3] dark:hover:bg-neutral-800/40 transition cursor-pointer"
                >
                  <div className="col-span-8 sm:col-span-8 flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2 sm:pr-3">
                    <FileItemIcon category={item.category} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="truncate font-medium text-[#191919] dark:text-neutral-200 text-[13px] sm:text-[14px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="col-span-4 sm:col-span-2 text-right text-[12px] sm:text-[13px] font-mono text-[#73726E] dark:text-neutral-400">
                    {item.isDirectory ? '-' : item.sizeFormatted}
                  </span>
                  <div className="hidden sm:flex col-span-2 items-center justify-end gap-1">
                    {!item.isDirectory && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem(item);
                          }}
                          className="p-1.5 text-[#73726E] hover:text-[#7F6DF2] transition"
                          title="미리보기"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.downloadUrl, '_blank');
                          }}
                          className="p-1.5 text-[#73726E] hover:text-[#7F6DF2] transition"
                          title="다운로드"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div ref={sentinelRef} className="py-8 flex items-center justify-center text-neutral-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-[13px]">항목 더 불러오는 중...</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 미리보기 모달 */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          allItems={filteredItems}
          onClose={() => setPreviewItem(null)}
          onSelectItem={(item) => setPreviewItem(item)}
        />
      )}
    </div>
  );
}
