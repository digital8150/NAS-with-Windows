import React from 'react';
import { ChevronRight, ArrowUp, Home } from 'lucide-react';
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
    <nav className="flex items-center gap-2 text-sm text-slate-400 select-none overflow-x-auto py-1 scrollbar-none">
      <button
        onClick={navigateUp}
        disabled={!parentPath}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900/80"
        title="상위 폴더로 이동"
      >
        <ArrowUp className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1.5 font-medium">
        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1;
          const targetPath = buildPathUpTo(idx);

          return (
            <React.Fragment key={targetPath}>
              {idx > 0 && <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />}
              <button
                onClick={() => !isLast && navigateTo(targetPath)}
                disabled={isLast}
                className={`rounded-md px-2 py-1 transition shrink-0 ${
                  isLast
                    ? 'text-slate-100 font-semibold cursor-default'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-indigo-400'
                }`}
              >
                {idx === 0 ? (
                  <span className="flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-slate-400" />
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
