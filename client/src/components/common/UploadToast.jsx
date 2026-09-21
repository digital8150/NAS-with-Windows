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
    <div className="fixed bottom-12 right-6 z-50 w-80 rounded-2xl border border-[#E9E9E7] bg-white p-4 shadow-2xl transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[#191919] text-[15px] font-semibold">
          <UploadCloud className="h-4 w-4 text-[#7F6DF2]" />
          <span>{fileCount}개 파일 업로드 중</span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-[#9B9A97] hover:text-[#191919] transition"
            title="취소"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E9E9E7]">
          <div
            className="h-full bg-[#7F6DF2] transition-all duration-150 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[13px] text-[#73726E]">
        <span className="font-semibold">{percent}%</span>
        {speedStr && <span className="font-mono">{speedStr}</span>}
      </div>
    </div>
  );
}
