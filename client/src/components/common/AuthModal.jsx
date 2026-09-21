import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#090d16] p-4 select-none">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0f172a] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-300">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">저장소 접근</h1>
          <p className="mt-1 text-xs text-slate-400">비밀번호를 입력하여 연결하세요.</p>
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
              className="w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 leading-relaxed text-center font-medium">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
