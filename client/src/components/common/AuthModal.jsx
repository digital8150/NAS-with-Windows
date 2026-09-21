import React, { useState } from 'react';
import { ArrowRight, Loader2, PlayCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthModal() {
  const { login, remainingAttempts } = useAuth();
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await login(password);
    } catch (err) {
      if (err.data?.isLocked) {
        // 잠금 화면은 AuthContext에서 자동으로 트리거됨
      } else {
        const attemptsLeft = err.data?.remainingAttempts ?? (remainingAttempts - 1);
        setErrorMsg(`비밀번호가 올바르지 않습니다. (${attemptsLeft}회 남음)`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#F7F6F3] p-4 select-none">
      <div className="w-full max-w-sm rounded-2xl border border-[#E9E9E7] bg-white p-9 shadow-2xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7F6DF2] text-white shadow-md">
            <PlayCircle className="h-7 w-7 fill-white/20" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#191919]">ReelDrive</h1>
          <p className="mt-1 text-sm text-[#73726E]">저장소 비밀번호를 입력하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              disabled={isSubmitting}
              autoFocus
              className="w-full rounded-xl border border-[#C4C4C0] bg-white px-4 py-2.5 text-sm text-[#191919] placeholder-[#9B9A97] outline-none transition focus:border-[#7F6DF2] focus:ring-2 focus:ring-[#7F6DF2]/20 disabled:opacity-50"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-[#E03E3E] leading-relaxed text-center font-medium">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7F6DF2] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6855dd] focus:outline-none focus:ring-2 focus:ring-[#7F6DF2]/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>계속하기</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
