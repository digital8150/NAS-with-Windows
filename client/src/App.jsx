import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ExplorerProvider, useExplorer } from './contexts/ExplorerContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Breadcrumb from './components/explorer/Breadcrumb';
import DriveSelector from './components/explorer/DriveSelector';
import CategoryFilterToolbar from './components/explorer/CategoryFilterToolbar';
import FileGrid from './components/explorer/FileGrid';
import FileList from './components/explorer/FileList';
import SelectionToolbar from './components/layout/SelectionToolbar';
import AuthModal from './components/common/AuthModal';
import SetupModal from './components/common/SetupModal';
import LockoutScreen from './components/common/LockoutScreen';
import CustomDialog from './components/common/CustomDialog';
import UploadToast from './components/common/UploadToast';
import PreviewModal from './components/preview/PreviewModal';
import ShareModal from './components/share/ShareModal';
import ManageSharesModal from './components/share/ManageSharesModal';
import SharedFolderView from './components/share/SharedFolderView';
import {
  createFolder as apiCreateFolder,
  renameItem as apiRenameItem,
  deleteItems as apiDeleteItems,
  uploadFilesWithProgress
} from './services/api';

function MainLayout() {
  const { authenticated, needsSetup, isLocked, remainingLockSeconds, loading: authLoading, user, serverName } = useAuth();

  useEffect(() => {
    if (serverName) {
      document.title = `${serverName} — 내 저장소`;
    }
  }, [serverName]);
  const {
    currentPath,
    viewMode,
    refresh,
    items,
    selectedPaths
  } = useExplorer();

  const fileViewRef = useRef(null);
  const selectionToolbarRef = useRef(null);
  const hadSelectionRef = useRef(false);

  useEffect(() => {
    const hasSelection = selectedPaths.size > 0;
    let animationFrame;

    if (hasSelection && !hadSelectionRef.current) {
      animationFrame = requestAnimationFrame(() => {
        const toolbarHeight = selectionToolbarRef.current?.getBoundingClientRect().height ?? 0;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        fileViewRef.current?.scrollBy({
          top: toolbarHeight,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      });
    }

    hadSelectionRef.current = hasSelection;
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [selectedPaths.size]);

  // 미리보기 모달 상태
  const [previewItem, setPreviewItem] = useState(null);

  // 모달 다이얼로그 상태
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    initialValue: '',
    placeholder: '',
    isDanger: false,
    onConfirm: null
  });

  // 업로드 상태
  const [uploadState, setUploadState] = useState({
    active: false,
    percent: 0,
    speedBps: 0,
    fileCount: 0
  });
  const [uploadAbortController, setUploadAbortController] = useState(null);

  // 공유 모달 상태
  const [shareModal, setShareModal] = useState({
    isOpen: false,
    folderPath: '',
    folderName: ''
  });
  const [manageSharesOpen, setManageSharesOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 드래그 앤 드롭 상태
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // 통계 계산 (하단 상태바용)
  const folderCount = useMemo(() => items.filter(i => i.isDirectory).length, [items]);
  const fileCount = useMemo(() => items.filter(i => !i.isDirectory).length, [items]);

  // 새 폴더 모달 열기
  const handleOpenNewFolder = () => {
    setDialogState({
      isOpen: true,
      title: '새 폴더 생성',
      message: '생성할 폴더 이름을 입력하세요.',
      type: 'prompt',
      initialValue: '새 폴더',
      placeholder: '폴더 이름',
      confirmText: '생성',
      isDanger: false,
      onConfirm: async (folderName) => {
        try {
          await apiCreateFolder(currentPath, folderName);
          refresh();
        } catch (err) {
          alert(err.message);
        } finally {
          setDialogState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 이름 변경 모달 열기
  const handleOpenRename = (targetPath) => {
    const item = items.find(i => i.path === targetPath);
    if (!item) return;

    setDialogState({
      isOpen: true,
      title: '이름 변경',
      message: '새로운 이름을 입력하세요.',
      type: 'prompt',
      initialValue: item.name,
      placeholder: '새 이름',
      confirmText: '변경',
      isDanger: false,
      onConfirm: async (newName) => {
        try {
          await apiRenameItem(targetPath, newName);
          refresh();
        } catch (err) {
          alert(err.message);
        } finally {
          setDialogState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 삭제 확인 모달 열기
  const handleOpenDelete = (targetPaths) => {
    const count = targetPaths.length;
    setDialogState({
      isOpen: true,
      title: '항목 삭제',
      message: `${count}개 항목을 영구적으로 삭제하시겠습니까?`,
      type: 'confirm',
      confirmText: '삭제',
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiDeleteItems(targetPaths);
          refresh();
        } catch (err) {
          alert(err.message);
        } finally {
          setDialogState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 파일 업로드 실행
  const handleUploadFiles = useCallback((fileList) => {
    if (!currentPath || !fileList || fileList.length === 0) return;

    setUploadState({
      active: true,
      percent: 0,
      speedBps: 0,
      fileCount: fileList.length
    });

    const uploader = uploadFilesWithProgress(
      currentPath,
      fileList,
      (progress) => {
        setUploadState(prev => ({
          ...prev,
          percent: progress.percent,
          speedBps: progress.speedBps
        }));
      },
      () => {
        setUploadState({ active: false, percent: 100, speedBps: 0, fileCount: 0 });
        refresh();
      },
      (err) => {
        setUploadState({ active: false, percent: 0, speedBps: 0, fileCount: 0 });
        alert(err.message);
      }
    );

    setUploadAbortController(uploader);
  }, [currentPath, refresh]);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F7F6F3] text-[#73726E] text-[15px] font-medium">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7F6DF2] border-t-transparent mr-3" />
        저장소에 연결하는 중...
      </div>
    );
  }

  if (isLocked) {
    return <LockoutScreen remainingSeconds={remainingLockSeconds} />;
  }

  if (needsSetup) {
    return <SetupModal />;
  }

  if (!authenticated) {
    return <AuthModal />;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex h-screen w-screen overflow-hidden bg-[#F7F6F3] text-[#37352F]"
    >
      {/* 사이드바 (다크 톤 - 모바일 드로어 지원) */}
      <Sidebar
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenManageShares={() => setManageSharesOpen(true)}
      />

      {/* 메인 탐색 영역 (웜 크림/화이트 톤) */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* 상단 화이트 헤더 */}
        <Header
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          onNewFolder={handleOpenNewFolder}
          onUploadFiles={handleUploadFiles}
        />

        {/* 경로 및 드라이브 내비게이션 바 */}
        <div className="px-3.5 sm:px-7 pt-3 sm:pt-4 pb-2 space-y-2 sm:space-y-2.5 shrink-0">
          <DriveSelector />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Breadcrumb />
            <CategoryFilterToolbar />
          </div>
        </div>

        {/* 메인 파일 뷰 */}
        <main
          ref={fileViewRef}
          className={`flex-1 overflow-y-auto px-3.5 sm:px-7 scrollbar-thin transition-[padding-bottom] duration-200 ${
            selectedPaths.size > 0 ? 'pb-32' : 'pb-6'
          }`}
        >
          {viewMode === 'grid' ? (
            <FileGrid onOpenFile={(item) => setPreviewItem(item)} />
          ) : (
            <FileList onOpenFile={(item) => setPreviewItem(item)} />
          )}
        </main>

        {/* 하단 상태 표시줄 (스크린샷 1:1) */}
        <footer className="flex h-8 w-full items-center justify-between border-t border-[#E9E9E7] bg-white px-3.5 sm:px-7 text-[12px] sm:text-[13px] text-[#73726E] select-none shrink-0 font-mono">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-sans text-[12px] sm:text-[13px]">연결됨 · {user?.role || 'admin'}</span>
          </div>
          <div>
            <span className="text-[12px] sm:text-[13px]">{folderCount}개 폴더, {fileCount}개 파일</span>
          </div>
        </footer>
      </div>

      {/* 드래그 앤 드롭 오버레이 */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#7F6DF2]/10 backdrop-blur-xs border-2 border-dashed border-[#7F6DF2] pointer-events-none select-none">
          <div className="rounded-2xl border border-[#E9E9E7] bg-white px-8 py-5 text-center shadow-xl">
            <span className="text-base font-semibold text-[#191919]">
              업로드할 파일을 여기에 놓으세요
            </span>
          </div>
        </div>
      )}

      {/* 하단 선택 툴바 */}
      <SelectionToolbar
        toolbarRef={selectionToolbarRef}
        onRename={handleOpenRename}
        onDelete={handleOpenDelete}
        onPreview={(item) => setPreviewItem(item)}
        onShare={(item) => setShareModal({ isOpen: true, folderPath: item.path, folderName: item.name })}
      />

      {/* 파일 미리보기 모달 */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          allItems={items}
          onClose={() => setPreviewItem(null)}
          onSelectItem={(item) => setPreviewItem(item)}
        />
      )}

      {/* 폴더 공유 생성 모달 */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal((prev) => ({ ...prev, isOpen: false }))}
        folderPath={shareModal.folderPath}
        folderName={shareModal.folderName}
      />

      {/* 전체 공유 링크 관리 모달 */}
      <ManageSharesModal
        isOpen={manageSharesOpen}
        onClose={() => setManageSharesOpen(false)}
      />

      {/* 업로드 진행 토스트 */}
      <UploadToast
        uploadState={uploadState}
        onCancel={() => {
          if (uploadAbortController) uploadAbortController.abort();
          setUploadState({ active: false, percent: 0, speedBps: 0, fileCount: 0 });
        }}
      />

      {/* 공통 다이얼로그 */}
      <CustomDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        initialValue={dialogState.initialValue}
        placeholder={dialogState.placeholder}
        confirmText={dialogState.confirmText}
        cancelText="취소"
        isDanger={dialogState.isDanger}
        onConfirm={dialogState.onConfirm}
        onCancel={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/share/:shareId/*" element={<SharedFolderView />} />
        <Route path="/share/:shareId" element={<SharedFolderView />} />
        <Route
          path="*"
          element={
            <ExplorerProvider>
              <MainLayout />
            </ExplorerProvider>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
