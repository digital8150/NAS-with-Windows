import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ExplorerProvider, useExplorer } from './contexts/ExplorerContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Breadcrumb from './components/explorer/Breadcrumb';
import DriveSelector from './components/explorer/DriveSelector';
import FileGrid from './components/explorer/FileGrid';
import FileList from './components/explorer/FileList';
import SelectionToolbar from './components/layout/SelectionToolbar';
import AuthModal from './components/common/AuthModal';
import LockoutScreen from './components/common/LockoutScreen';
import CustomDialog from './components/common/CustomDialog';
import UploadToast from './components/common/UploadToast';
import {
  createFolder as apiCreateFolder,
  renameItem as apiRenameItem,
  deleteItems as apiDeleteItems,
  uploadFilesWithProgress
} from './services/api';

function MainLayout() {
  const { authenticated, isLocked, remainingLockSeconds, loading: authLoading } = useAuth();
  const {
    currentPath,
    viewMode,
    refresh,
    items
  } = useExplorer();

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

  // 드래그 앤 드롭 상태
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
      <div className="flex h-screen w-screen items-center justify-center bg-[#090d16] text-slate-400 text-sm">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-transparent mr-2.5" />
        불러오는 중...
      </div>
    );
  }

  if (isLocked) {
    return <LockoutScreen remainingSeconds={remainingLockSeconds} />;
  }

  if (!authenticated) {
    return <AuthModal />;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-[#f1f5f9]"
    >
      {/* 사이드바 */}
      <Sidebar />

      {/* 메인 탐색 영역 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <Header
          onNewFolder={handleOpenNewFolder}
          onUploadFiles={handleUploadFiles}
        />

        {/* 경로 및 드라이브 서브헤더 */}
        <div className="border-b border-slate-800 bg-[#0d1424]/70 px-6 py-3.5 space-y-3">
          <DriveSelector />
          <Breadcrumb />
        </div>

        {/* 메인 파일 뷰 */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {viewMode === 'grid' ? (
            <FileGrid onOpenFile={(item) => console.log('Open:', item)} />
          ) : (
            <FileList onOpenFile={(item) => console.log('Open:', item)} />
          )}
        </main>
      </div>

      {/* 드래그 앤 드롭 오버레이 */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-950/40 backdrop-blur-sm border-2 border-dashed border-blue-500 pointer-events-none select-none">
          <div className="rounded-xl border border-slate-700 bg-[#0f172a] px-6 py-4 text-center shadow-xl">
            <span className="text-sm font-semibold text-slate-100">
              업로드할 파일을 여기에 놓으세요
            </span>
          </div>
        </div>
      )}

      {/* 하단 선택 툴바 */}
      <SelectionToolbar
        onRename={handleOpenRename}
        onDelete={handleOpenDelete}
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
      <ExplorerProvider>
        <MainLayout />
      </ExplorerProvider>
    </AuthProvider>
  );
}
