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
    <aside className="flex h-full w-[260px] flex-col border-r border-slate-800 bg-[#0d1424] p-5 select-none shrink-0">
      {/* 로고 영역 */}
      <div className="flex items-center gap-3 px-2 py-2 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
          <HardDrive className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">
          NAS Storage
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-7 scrollbar-none pr-1">
        {/* 드라이브 섹션 */}
        <div>
          <div className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            드라이브
          </div>
          <div className="space-y-1">
            {drives.map((drive) => {
              const isSelected = currentDrive?.id === drive.id;

              return (
                <button
                  key={drive.id}
                  onClick={() => selectDrive(drive)}
                  className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{drive.id}: {drive.label ? `(${drive.label})` : ''}</span>
                  </div>
                  <span className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-slate-400'} font-mono`}>
                    {drive.freeFormatted}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 파일 유형 섹션 */}
        <div>
          <div className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            파일 유형
          </div>
          <div className="space-y-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = categoryFilter === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 로그아웃 */}
      <div className="border-t border-slate-800/80 pt-4 mt-2">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] font-medium text-slate-400 transition hover:bg-slate-800/80 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
