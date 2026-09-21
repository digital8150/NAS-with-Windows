import React from 'react';
import { ChevronRight, Home, ArrowUp } from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

export default function Breadcrumb() {
  const { currentPath, parentPath, navigateTo, navigateUp } = useExplorer();

  if (!currentPath) return null;

  const normalized = currentPath.replace(/\//g, '\\');
  const segments = normalized.split('\\').filter(Boolean);

  const buildPathUpTo = (index) => {
    if (index === 0) {
      return `${segments[0]}\\`;
    }
    return segments.slice(0, index + 1).join('\\');
  };

  return (
    <nav className="flex items-center gap-2 text-sm text-[#73726E] select-none overflow-x-auto py-1 scrollbar-none">
      <button
        onClick={navigateUp}
        disabled={!parentPath}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E9E9E7] bg-white text-[#73726E] hover:bg-[#F7F6F3] hover:text-[#37352F] transition disabled:opacity-30 disabled:hover:bg-white mr-1"
        title="상위 폴더"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 font-medium">
        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1;
          const targetPath = buildPathUpTo(idx);

          return (
            <React.Fragment key={targetPath}>
              {idx > 0 && <ChevronRight className="h-4 w-4 text-[#9B9A97] shrink-0" />}
              <button
                onClick={() => !isLast && navigateTo(targetPath)}
                disabled={isLast}
                className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 transition shrink-0 ${
                  isLast
                    ? 'text-[#191919] font-bold cursor-default'
                    : 'text-[#73726E] hover:text-[#7F6DF2]'
                }`}
              >
                {idx === 0 && <Home className="h-4 w-4 text-[#9B9A97]" />}
                <span>{idx === 0 ? '홈' : segment}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
