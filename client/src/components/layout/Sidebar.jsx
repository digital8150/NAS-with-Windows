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
    <aside className="flex h-full w-64 flex-col bg-[#16161a] text-[#f4f4f5] p-5 select-none shrink-0 border-r border-[#232326]">
      {/* 1. 상단 로고 */}
      <div className="flex items-center gap-3 px-2 py-2 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7F6DF2] text-white shadow-md">
          <PlayCircle className="h-6 w-6 fill-white/20" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          ReelDrive
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 scrollbar-none pr-1">
        {/* 2. 라이브러리 섹션 */}
        <div>
          <div className="px-3 text-[13px] font-semibold text-[#8e8e93] mb-2.5 tracking-wide">
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
                  className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition ${
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
          <div className="px-3 text-[13px] font-semibold text-[#8e8e93] mb-2.5 tracking-wide">
            드라이브
          </div>
          <div className="space-y-1">
            {drives.map((drive) => {
              const isSelected = currentDrive?.id === drive.id;

              return (
                <button
                  key={drive.id}
                  onClick={() => selectDrive(drive)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition ${
                    isSelected
                      ? 'bg-[#27223e] text-[#a594fd] font-semibold'
                      : 'text-[#d4d4d8] hover:bg-[#232328] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <HardDrive className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#a594fd]' : 'text-[#a1a1aa]'}`} />
                    <span>{drive.id}: {drive.label ? `(${drive.label})` : ''}</span>
                  </div>
                  <span className={`text-[13px] ${isSelected ? 'text-[#c4b5fd]' : 'text-[#8e8e93]'} font-mono`}>
                    {drive.freeFormatted}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 시스템 섹션 */}
        <div>
          <div className="px-3 text-[13px] font-semibold text-[#8e8e93] mb-2.5 tracking-wide">
            시스템
          </div>
          <button
            onClick={() => alert('휴지통은 시스템 보호 정책에 따라 관리됩니다.')}
            className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[15px] font-medium text-[#d4d4d8] hover:bg-[#232328] hover:text-white transition"
          >
            <Trash2 className="h-4 w-4 text-[#a1a1aa]" />
            <span>휴지통</span>
          </button>
        </div>
      </div>

      {/* 5. 하단 저장공간 위젯 (표준 폰트 스케일) */}
      {currentDrive && (
        <div className="mt-4 rounded-xl border border-[#27272a] bg-[#1c1c20] p-4">
          <div className="flex items-center justify-between text-[14px] text-[#a1a1aa] mb-2.5 font-medium">
            <span>저장공간 ({currentDrive.id}:)</span>
            <span className="font-mono font-bold text-white">{currentDrive.usedPercentage}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#27272a]">
            <div
              className="h-full bg-[#7F6DF2] transition-all duration-300"
              style={{ width: `${Math.min(100, currentDrive.usedPercentage)}%` }}
            />
          </div>
          <div className="mt-2 text-[13px] text-[#8e8e93] font-mono">
            {currentDrive.usedFormatted} / {currentDrive.totalFormatted}
          </div>
        </div>
      )}

      {/* 6. 사용자 정보 및 로그아웃 */}
      <div className="mt-4 border-t border-[#27272a] pt-3.5">
        <div className="flex items-center gap-3 px-1 py-1.5 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7F6DF2] text-white font-bold text-sm">
            {user?.role ? user.role.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="truncate text-sm text-[#d4d4d8]">
            <span className="font-semibold block truncate">{user?.role || 'admin'}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] font-medium text-[#ef4444] hover:bg-[#2e1d21] transition"
        >
          <LogOut className="h-4 w-4 text-[#ef4444]" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
