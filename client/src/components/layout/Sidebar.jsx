import React from 'react';
import {
  HardDrive,
  Files,
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  Archive,
  LogOut
} from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const {
    drives,
    currentDrive,
    selectDrive,
    categoryFilter,
    setCategoryFilter
  } = useExplorer();
  const { logout } = useAuth();

  const categories = [
    { id: 'all', label: '전체 파일', icon: Files },
    { id: 'video', label: '동영상', icon: Film },
    { id: 'audio', label: '음악', icon: Music },
    { id: 'image', label: '사진', icon: ImageIcon },
    { id: 'document', label: '문서', icon: FileText },
    { id: 'archive', label: '압축 파일', icon: Archive }
  ];

  return (
    <aside className="flex h-full w-56 flex-col border-r border-slate-800 bg-[#0c111d] p-4 select-none shrink-0">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 px-2 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold text-xs">
          NAS
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-100">
          내 저장소
        </span>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto space-y-6 scrollbar-none">
        {/* 드라이브 섹션 */}
        <div>
          <div className="px-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            드라이브
          </div>
          <div className="mt-2 space-y-1">
            {drives.map((drive) => {
              const isSelected = currentDrive?.id === drive.id;

              return (
                <button
                  key={drive.id}
                  onClick={() => selectDrive(drive)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-blue-600/10 text-blue-400 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <HardDrive className="h-4 w-4 shrink-0" />
                    <span>{drive.id}: {drive.label && `(${drive.label})`}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {drive.freeFormatted}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 파일 유형 섹션 */}
        <div>
          <div className="px-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            파일 유형
          </div>
          <div className="mt-2 space-y-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = categoryFilter === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-blue-600/10 text-blue-400 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 로그아웃 */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
