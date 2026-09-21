import React, { useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SetupModal() {
  const { setup, serverName } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMsg('비밀번호를 입력해 주세요.');
      return;
    }
    if (trimmed.length < 4) {
      setErrorMsg('비밀번호를 4자 이상 입력해 주세요.');
      return;
    }
    if (trimmed !== confirmPassword.trim()) {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await setup(trimmed);
    } catch (err) {
      setErrorMsg(err.message || '설정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = serverName || '개인 저장소';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#F7F6F3] p-4 select-none">
      <div className="w-full max-w-sm rounded-2xl border border-[#E9E9E7] bg-white p-9 shadow-2xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7F6DF2] text-white shadow-md">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#191919] truncate" title={displayName}>
            {displayName}
          </h1>
          <p className="mt-1.5 text-[15px] text-[#73726E]">
            안전한 사용을 위해 새 비밀번호를 설정하세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호 (4자 이상)"
              disabled={isSubmitting}
              autoFocus
              className="w-full rounded-xl border border-[#C4C4C0] bg-white px-4 py-3 text-[15px] text-[#191919] placeholder-[#9B9A97] outline-none transition focus:border-[#7F6DF2] focus:ring-2 focus:ring-[#7F6DF2]/20 disabled:opacity-50"
            />
          </div>

          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 확인"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#C4C4C0] bg-white px-4 py-3 text-[15px] text-[#191919] placeholder-[#9B9A97] outline-none transition focus:border-[#7F6DF2] focus:ring-2 focus:ring-[#7F6DF2]/20 disabled:opacity-50"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-[#E03E3E] leading-relaxed text-center font-medium">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || !confirmPassword.trim() || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7F6DF2] px-4 py-3 text-[15px] font-medium text-white transition hover:bg-[#6855dd] focus:outline-none focus:ring-2 focus:ring-[#7F6DF2]/40 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>시작하기</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
