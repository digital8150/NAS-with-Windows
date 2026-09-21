import React from 'react';
import { ChevronRight, ArrowUp, Home } from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

export default function Breadcrumb() {
  const { currentPath, parentPath, navigateTo, navigateUp } = useExplorer();

  if (!currentPath) return null;

  // C:\ 또는 D:\Folder\SubFolder 형태 파싱
  const normalized = currentPath.replace(/\//g, '\\');
  const segments = normalized.split('\\').filter(Boolean);

  const buildPathUpTo = (index) => {
    // 0번째는 C: -> C:\
    if (index === 0) {
      return `${segments[0]}\\`;
    }
    return segments.slice(0, index + 1).join('\\');
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 select-none overflow-x-auto py-1 scrollbar-none">
      <button
        onClick={navigateUp}
        disabled={!parentPath}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-900/60 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-slate-900/60"
        title="상위 폴더로 이동"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-1">
        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1;
          const targetPath = buildPathUpTo(idx);

          return (
            <React.Fragment key={targetPath}>
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />}
              <button
                onClick={() => !isLast && navigateTo(targetPath)}
                disabled={isLast}
                className={`rounded px-1.5 py-1 font-medium transition shrink-0 ${
                  isLast
                    ? 'text-slate-100 font-semibold cursor-default'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {idx === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-3 w-3 text-slate-500" />
                    <span>{segment}</span>
                  </span>
                ) : (
                  segment
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
