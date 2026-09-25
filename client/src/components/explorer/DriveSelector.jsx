import React from 'react';
import { HardDrive } from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

export default function DriveSelector() {
  const { drives, currentDrive, selectDrive } = useExplorer();

  if (!drives || drives.length === 0) return null;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
      {drives.map((drive) => {
        const isSelected = currentDrive?.id === drive.id;

        return (
          <button
            key={drive.id}
            onClick={() => selectDrive(drive)}
            className={`group relative flex min-w-[145px] sm:min-w-[165px] flex-col rounded-xl border p-2.5 sm:p-3 text-left transition shadow-xs shrink-0 ${
              isSelected
                ? 'border-[#7F6DF2] bg-[#F4F0F8]'
                : 'border-[#E9E9E7] bg-white hover:border-[#C4C4C0] hover:bg-[#FAF9F7]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <HardDrive
                  className={`h-4 w-4 shrink-0 ${
                    isSelected ? 'text-[#7F6DF2]' : 'text-[#73726E] group-hover:text-[#37352F]'
                  }`}
                />
                <span
                  className={`text-sm font-semibold truncate ${isSelected ? 'text-[#7F6DF2]' : 'text-[#37352F]'}`}
                  title={/^[a-zA-Z]$/.test(drive.id) ? `${drive.id}: (${drive.label})` : (drive.label || drive.mountPoint)}
                >
                  {/^[a-zA-Z]$/.test(drive.id) ? `${drive.id}: ${drive.label ? `(${drive.label})` : ''}` : (drive.label || drive.mountPoint)}
                </span>
              </div>
            </div>

            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E9E9E7]">
                <div
                  className={`h-full transition-all duration-300 ${
                    drive.usedPercentage > 90
                      ? 'bg-[#E03E3E]'
                      : isSelected
                      ? 'bg-[#7F6DF2]'
                      : 'bg-[#9B9A97]'
                  }`}
                  style={{ width: `${Math.min(100, drive.usedPercentage)}%` }}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[13px] text-[#73726E] font-mono">
              <span>{drive.freeFormatted} 남음</span>
              <span>{drive.totalFormatted}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
