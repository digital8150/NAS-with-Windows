import React from 'react';
import { UploadCloud, X } from 'lucide-react';

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '';
  const mbps = bytesPerSec / (1024 * 1024);
  if (mbps >= 1) {
    return `${mbps.toFixed(1)} MB/s`;
  }
  const kbps = bytesPerSec / 1024;
  return `${kbps.toFixed(0)} KB/s`;
}

export default function UploadToast({ uploadState, onCancel }) {
  if (!uploadState || !uploadState.active) return null;

  const { percent = 0, speedBps = 0, fileCount = 1 } = uploadState;
  const speedStr = formatSpeed(speedBps);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-slate-800 bg-[#0f172a] p-4 shadow-2xl transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
          <UploadCloud className="h-4 w-4 text-blue-400" />
          <span>{fileCount}개 파일 업로드 중</span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition"
            title="취소"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-blue-500 transition-all duration-150 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
        <span>{percent}%</span>
        {speedStr && <span className="font-mono">{speedStr}</span>}
      </div>
    </div>
  );
}
