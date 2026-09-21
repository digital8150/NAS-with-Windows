import React from 'react';
import { HardDrive } from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

export default function DriveSelector() {
  const { drives, currentDrive, selectDrive } = useExplorer();

  if (!drives || drives.length === 0) return null;

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
      {drives.map((drive) => {
        const isSelected = currentDrive?.id === drive.id;

        return (
          <button
            key={drive.id}
            onClick={() => selectDrive(drive)}
            className={`group relative flex min-w-[160px] flex-col rounded-xl border p-3 text-left transition ${
              isSelected
                ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                : 'border-slate-800 bg-[#0f172a]/70 hover:border-slate-700 hover:bg-[#0f172a]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardDrive
                  className={`h-4 w-4 ${
                    isSelected ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span className="text-sm font-semibold text-slate-100">
                  {drive.id}: {drive.label ? `(${drive.label})` : ''}
                </span>
              </div>
            </div>

            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    drive.usedPercentage > 90
                      ? 'bg-amber-500'
                      : isSelected
                      ? 'bg-indigo-500'
                      : 'bg-slate-500'
                  }`}
                  style={{ width: `${Math.min(100, drive.usedPercentage)}%` }}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>{drive.freeFormatted} 남음</span>
              <span>{drive.totalFormatted}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
