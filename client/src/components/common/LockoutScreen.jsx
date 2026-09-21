import React from 'react';
import { ShieldAlert, Clock } from 'lucide-react';

export default function LockoutScreen({ remainingSeconds }) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F6F3] p-4 select-none">
      <div className="w-full max-w-sm rounded-2xl border border-[#E9E9E7] bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#E03E3E]">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-bold text-[#191919]">
          로그인이 일시적으로 제한되었습니다
        </h2>

        <p className="mt-2 text-sm text-[#73726E] leading-relaxed">
          연속된 비밀번호 오류로 인해 시스템이 일시 보호 중입니다.
        </p>

        <div className="mt-6 rounded-xl border border-[#E9E9E7] bg-[#FAF9F7] py-4">
          <div className="flex items-center justify-center gap-2 text-[#73726E] text-xs font-medium">
            <Clock className="h-4 w-4 text-[#9B9A97]" />
            <span>재시도 가능까지 남은 시간</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-wider text-[#191919] font-mono">
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
}
