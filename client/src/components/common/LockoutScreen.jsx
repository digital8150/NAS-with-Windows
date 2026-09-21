import React from 'react';
import { ShieldAlert, Clock } from 'lucide-react';

export default function LockoutScreen({ remainingSeconds }) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090d16] p-4 select-none">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0f172a] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-semibold text-slate-100">
          로그인이 일시적으로 제한되었습니다
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          연속된 입력 오류로 인해 시스템이 일시 보호 중입니다.
        </p>

        <div className="mt-6 rounded-lg border border-slate-800/80 bg-slate-900/50 py-4">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>재시도 가능까지 남은 시간</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-wider text-slate-200 font-mono">
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
}
