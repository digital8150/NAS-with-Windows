import React from 'react';
import { HardDrive } from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

export default function DriveSelector() {
  const { drives, currentDrive, selectDrive } = useExplorer();

  if (!drives || drives.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
      {drives.map((drive) => {
        const isSelected = currentDrive?.id === drive.id;

        return (
          <button
            key={drive.id}
            onClick={() => selectDrive(drive)}
            className={`group relative flex min-w-[140px] flex-col rounded-lg border p-2.5 text-left transition ${
              isSelected
                ? 'border-blue-500/60 bg-blue-500/5'
                : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardDrive
                  className={`h-4 w-4 ${
                    isSelected ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-200">
                  {drive.id}: {drive.label && `(${drive.label})`}
                </span>
              </div>
            </div>

            <div className="mt-2.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    drive.usedPercentage > 90
                      ? 'bg-amber-500'
                      : isSelected
                      ? 'bg-blue-500'
                      : 'bg-slate-500'
                  }`}
                  style={{ width: `${Math.min(100, drive.usedPercentage)}%` }}
                />
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{drive.freeFormatted} 남음</span>
              <span>{drive.totalFormatted}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
