import React from 'react';
import {
  HardDrive,
  Files,
  Film,
  Image as ImageIcon,
  FileText,
  Trash2,
  LogOut,
  PlayCircle
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
  const { logout, user } = useAuth();

  const categories = [
    { id: 'all', label: '전체 파일', icon: Files },
    { id: 'image', label: '사진', icon: ImageIcon },
    { id: 'video', label: '동영상', icon: Film },
    { id: 'document', label: '문서', icon: FileText }
  ];

  return (
    <aside className="flex h-full w-60 flex-col bg-[#16161a] text-[#f4f4f5] p-4 select-none shrink-0 border-r border-[#232326]">
      {/* 1. 상단 로고 */}
      <div className="flex items-center gap-2.5 px-3 py-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7F6DF2] text-white shadow-sm">
          <PlayCircle className="h-5 w-5 fill-white/20" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">
          ReelDrive
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 scrollbar-none pr-0.5">
        {/* 2. 라이브러리 섹션 */}
        <div>
          <div className="px-3 text-[11px] font-semibold text-[#71717a] mb-2 tracking-wide">
            라이브러리
          </div>
          <div className="space-y-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = categoryFilter === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition ${
                    isSelected
                      ? 'bg-[#27223e] text-[#a594fd] font-semibold'
                      : 'text-[#d4d4d8] hover:bg-[#232328] hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#a594fd]' : 'text-[#a1a1aa]'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Windows 드라이브 섹션 */}
        <div>
          <div className="px-3 text-[11px] font-semibold text-[#71717a] mb-2 tracking-wide">
            드라이브
          </div>
          <div className="space-y-1">
            {drives.map((drive) => {
              const isSelected = currentDrive?.id === drive.id;

              return (
                <button
                  key={drive.id}
                  onClick={() => selectDrive(drive)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[14px] font-medium transition ${
                    isSelected
                      ? 'bg-[#27223e] text-[#a594fd] font-semibold'
                      : 'text-[#d4d4d8] hover:bg-[#232328] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#a594fd]' : 'text-[#a1a1aa]'}`} />
                    <span>{drive.id}: {drive.label ? `(${drive.label})` : ''}</span>
                  </div>
                  <span className={`text-[11px] ${isSelected ? 'text-[#c4b5fd]' : 'text-[#71717a]'} font-mono`}>
                    {drive.freeFormatted}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 시스템 섹션 */}
        <div>
          <div className="px-3 text-[11px] font-semibold text-[#71717a] mb-2 tracking-wide">
            시스템
          </div>
          <button
            onClick={() => alert('휴지통은 시스템 보호 정책에 따라 관리됩니다.')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-[#d4d4d8] hover:bg-[#232328] hover:text-white transition"
          >
            <Trash2 className="h-4 w-4 text-[#a1a1aa]" />
            <span>휴지통</span>
          </button>
        </div>
      </div>

      {/* 5. 하단 저장공간 위젯 (스크린샷 1:1 복원) */}
      {currentDrive && (
        <div className="mt-4 rounded-xl border border-[#27272a] bg-[#1c1c20] p-3.5">
          <div className="flex items-center justify-between text-xs text-[#a1a1aa] mb-2">
            <span className="font-medium">저장공간 ({currentDrive.id}:)</span>
            <span className="font-mono font-semibold text-white">{currentDrive.usedPercentage}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#27272a]">
            <div
              className="h-full bg-[#7F6DF2] transition-all duration-300"
              style={{ width: `${Math.min(100, currentDrive.usedPercentage)}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-[#71717a] font-mono">
            {currentDrive.usedFormatted} / {currentDrive.totalFormatted}
          </div>
        </div>
      )}

      {/* 6. 사용자 정보 및 로그아웃 */}
      <div className="mt-4 border-t border-[#27272a] pt-3">
        <div className="flex items-center gap-2.5 px-1 py-1 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7F6DF2] text-white font-bold text-xs">
            {user?.role ? user.role.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="truncate text-xs text-[#d4d4d8]">
            <span className="font-medium block truncate">{user?.role || 'admin'}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#ef4444] hover:bg-[#2e1d21] transition"
        >
          <LogOut className="h-3.5 w-3.5 text-[#ef4444]" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
