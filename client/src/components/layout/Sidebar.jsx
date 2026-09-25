import {
  HardDrive,
  Film,
  Image as ImageIcon,
  FileText,
  Music,
  Download,
  Monitor,
  LogOut,
  PlayCircle,
  Share2,
  X
} from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';
import { useAuth } from '../../contexts/AuthContext';

const LIB_ICONS = {
  downloads: Download,
  documents: FileText,
  pictures: ImageIcon,
  videos: Film,
  music: Music,
  desktop: Monitor
};

function SidebarContent({ onOpenManageShares, onCloseMobile }) {
  const {
    drives,
    libraries,
    currentDrive,
    currentPath,
    selectDrive,
    navigateTo
  } = useExplorer();
  const { logout, user, serverName } = useAuth();

  const displayName = serverName || '개인 저장소';

  const handleNavigate = (path) => {
    navigateTo(path);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectDrive = (drive) => {
    selectDrive(drive);
    if (onCloseMobile) onCloseMobile();
  };

  const handleOpenShares = () => {
    if (onOpenManageShares) onOpenManageShares();
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogout = () => {
    if (onCloseMobile) onCloseMobile();
    logout();
  };

  return (
    <div className="flex h-full flex-col justify-between">
      {/* 상단 로고 및 PC 이름 (+ 모바일 닫기 버튼) */}
      <div className="min-h-0 flex-1 flex flex-col">
        <div className="flex items-center justify-between px-2 py-1 mb-5 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7F6DF2] text-white shadow-md shrink-0">
              <PlayCircle className="h-6 w-6 fill-white/20" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white truncate" title={displayName}>
              {displayName}
            </span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              title="사이드바 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 sidebar-scrollbar pr-1">
          {/* 내 라이브러리 바로가기 섹션 */}
          {libraries.length > 0 && (
            <div>
              <div className="px-3 text-[13px] font-semibold text-[#8e8e93] mb-2 tracking-wide">
                라이브러리
              </div>
              <div className="space-y-1">
                {libraries.map((lib) => {
                  const Icon = LIB_ICONS[lib.id] || FileText;
                  const isSelected = currentPath && currentPath.toLowerCase() === lib.path.toLowerCase();

                  return (
                    <button
                      key={lib.id}
                      onClick={() => handleNavigate(lib.path)}
                      title={lib.name}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                        isSelected
                          ? 'bg-[#27223e] text-[#a594fd] font-semibold'
                          : 'text-[#d4d4d8] hover:bg-[#232328] hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#a594fd]' : 'text-[#a1a1aa]'}`} />
                      <span className="truncate">{lib.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Windows 드라이브 섹션 */}
          <div>
            <div className="px-3 text-[13px] font-semibold text-[#8e8e93] mb-2 tracking-wide">
              드라이브
            </div>
            <div className="space-y-1">
              {drives.map((drive) => {
                const isSelected = currentDrive?.id === drive.id;

                return (
                  <button
                    key={drive.id}
                    onClick={() => handleSelectDrive(drive)}
                    title={`${drive.id}: ${drive.label ? `(${drive.label})` : ''}`}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                      isSelected
                        ? 'bg-[#27223e] text-[#a594fd] font-semibold'
                        : 'text-[#d4d4d8] hover:bg-[#232328] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <HardDrive className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#a594fd]' : 'text-[#a1a1aa]'}`} />
                      <span className="truncate">
                        {/^[a-zA-Z]$/.test(drive.id) ? `${drive.id}: ${drive.label ? `(${drive.label})` : ''}` : (drive.label || drive.mountPoint)}
                      </span>
                    </div>
                    <span className={`text-[13px] shrink-0 whitespace-nowrap font-mono ${isSelected ? 'text-[#c4b5fd]' : 'text-[#8e8e93]'}`}>
                      {drive.freeFormatted}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 공유 링크 관리 바로가기 */}
          {onOpenManageShares && (
            <div>
              <div className="px-3 text-[13px] font-semibold text-[#8e8e93] mb-2 tracking-wide">
                공유
              </div>
              <button
                onClick={handleOpenShares}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#d4d4d8] hover:bg-[#232328] hover:text-white transition"
              >
                <Share2 className="h-4 w-4 shrink-0 text-[#a1a1aa]" />
                <span>공유 링크 관리</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-2">
        {/* 하단 저장공간 위젯 */}
        {currentDrive && (
          <div className="mt-3.5 rounded-xl border border-[#27272a] bg-[#1c1c20] p-4">
            <div className="flex items-center justify-between text-[14px] text-[#a1a1aa] mb-2 font-medium">
              <span className="truncate mr-2" title={`저장공간 (${/^[a-zA-Z]$/.test(currentDrive.id) ? `${currentDrive.id}:` : (currentDrive.label || currentDrive.mountPoint)})`}>
                저장공간 ({/^[a-zA-Z]$/.test(currentDrive.id) ? `${currentDrive.id}:` : (currentDrive.label || currentDrive.mountPoint)})
              </span>
              <span className="font-mono font-bold text-white shrink-0">
                {currentDrive.usedPercentage}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#27272a]">
              <div
                className="h-full bg-[#7F6DF2] transition-all duration-300"
                style={{ width: `${Math.min(100, currentDrive.usedPercentage)}%` }}
              />
            </div>
            <div className="mt-2 text-[13px] text-[#8e8e93] font-mono whitespace-nowrap">
              {currentDrive.usedFormatted} / {currentDrive.totalFormatted}
            </div>
          </div>
        )}

        {/* 사용자 정보 및 로그아웃 */}
        <div className="mt-3.5 border-t border-[#27272a] pt-3.5">
          <div className="flex items-center gap-3 px-1 py-1 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7F6DF2] text-white font-bold text-sm shrink-0">
              {user?.role ? user.role.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold block truncate text-sm text-[#d4d4d8]">
                {user?.role || 'admin'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] font-medium text-[#ef4444] hover:bg-[#2e1d21] transition"
          >
            <LogOut className="h-4 w-4 shrink-0 text-[#ef4444]" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ onOpenManageShares, isMobileOpen, onCloseMobile }) {
  return (
    <>
      {/* 1. 데스크톱 사이드바 */}
      <aside className="hidden md:flex h-full w-72 flex-col bg-[#16161a] text-[#f4f4f5] px-4 py-5 select-none shrink-0 border-r border-[#232326]">
        <SidebarContent onOpenManageShares={onOpenManageShares} />
      </aside>

      {/* 2. 모바일 오프캔버스 드로어 */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-[#16161a] text-[#f4f4f5] px-4 py-5 select-none shrink-0 shadow-2xl z-10 animate-in slide-in-from-left duration-200 border-r border-[#232326]">
            <SidebarContent
              onOpenManageShares={onOpenManageShares}
              onCloseMobile={onCloseMobile}
            />
          </aside>
        </div>
      )}
    </>
  );
}
