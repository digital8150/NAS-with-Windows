import {
  HardDrive,
  Film,
  Image as ImageIcon,
  FileText,
  Music,
  Download,
  Monitor,
  LogOut,
  PlayCircle
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

export default function Sidebar() {
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

  return (
    <aside className="flex h-full w-72 flex-col bg-[#16161a] text-[#f4f4f5] px-4 py-5 select-none shrink-0 border-r border-[#232326]">
      {/* 1. 상단 로고 및 PC 이름 */}
      <div className="flex items-center gap-3 px-2 py-1 mb-5 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7F6DF2] text-white shadow-md shrink-0">
          <PlayCircle className="h-6 w-6 fill-white/20" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white truncate" title={displayName}>
          {displayName}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 sidebar-scrollbar pr-1">
        {/* 2. 내 라이브러리 바로가기 섹션 */}
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
                    onClick={() => navigateTo(lib.path)}
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

        {/* 3. Windows 드라이브 섹션 */}
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
                  onClick={() => selectDrive(drive)}
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
                      {drive.id}: {drive.label ? `(${drive.label})` : ''}
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
      </div>

      {/* 4. 하단 저장공간 위젯 */}
      {currentDrive && (
        <div className="mt-3.5 rounded-xl border border-[#27272a] bg-[#1c1c20] p-4">
          <div className="flex items-center justify-between text-[14px] text-[#a1a1aa] mb-2 font-medium">
            <span className="truncate mr-2" title={`저장공간 (${currentDrive.id}:)`}>
              저장공간 ({currentDrive.id}:)
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

      {/* 5. 사용자 정보 및 로그아웃 */}
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
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] font-medium text-[#ef4444] hover:bg-[#2e1d21] transition"
        >
          <LogOut className="h-4 w-4 shrink-0 text-[#ef4444]" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
