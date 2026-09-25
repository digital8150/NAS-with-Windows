import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, Trash2, X, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { createShare, getShares, deleteShare } from '../../services/api';

export default function ShareModal({ isOpen, onClose, folderPath, folderName }) {
  const [loading, setLoading] = useState(false);
  const [existingShare, setExistingShare] = useState(null);
  const [expiresInDays, setExpiresInDays] = useState('0'); // 0 = 무제한
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !folderPath) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCopied(false);

    getShares()
      .then((shares) => {
        if (!isMounted) return;
        const normalizedTarget = folderPath.toLowerCase().replace(/[/\\]+$/, '');
        const matched = shares.find((s) =>
          s.folderPath.toLowerCase().replace(/[/\\]+$/, '') === normalizedTarget
        );
        setExistingShare(matched || null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, folderPath]);

  if (!isOpen) return null;

  const shareUrl = existingShare
    ? `${window.location.origin}/share/${existingShare.id}`
    : '';

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const days = parseInt(expiresInDays, 10);
      const res = await createShare(folderPath, days > 0 ? days : null);
      setExistingShare(res.share);
      const generatedUrl = `${window.location.origin}/share/${res.share.id}`;
      navigator.clipboard.writeText(generatedUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch (err) {
      setError(err.message || '공유 링크를 생성하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDelete = async () => {
    if (!existingShare) return;
    if (!window.confirm('공유를 중단하시겠습니까? 더 이상 이 링크로 폴더에 접근할 수 없게 됩니다.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteShare(existingShare.id);
      setExistingShare(null);
    } catch (err) {
      setError(err.message || '공유를 해제하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md rounded-2xl border border-[#E9E9E7] bg-white p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 dark:border-neutral-800 dark:bg-[#1c1c20] text-[#191919] dark:text-white">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E9E9E7] dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7F6DF2]/10 text-[#7F6DF2]">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">폴더 공유</h3>
              <p className="text-[13px] text-[#73726E] dark:text-neutral-400 truncate max-w-[240px]">
                {folderName || '폴더'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#9B9A97] hover:bg-[#F4F3EF] dark:hover:bg-neutral-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="py-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-[13px] text-[#E03E3E] dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-36 flex-col items-center justify-center text-[#73726E]">
              <Loader2 className="h-6 w-6 animate-spin text-[#7F6DF2] mb-2" />
              <span className="text-[14px]">공유 정보를 확인하는 중...</span>
            </div>
          ) : existingShare ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#73726E] dark:text-neutral-400 mb-1.5">
                  누구나 접근 가능한 읽기 전용 링크
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-xl border border-[#E9E9E7] dark:border-neutral-700 bg-[#F7F6F3] dark:bg-neutral-900 px-3.5 py-2.5 text-[13px] font-mono text-[#37352F] dark:text-neutral-200 outline-none select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-medium transition shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#7F6DF2] text-white hover:bg-[#6e5cd6]'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[13px] text-[#73726E] dark:text-neutral-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#9B9A97]" />
                  <span>
                    {existingShare.expiresAt
                      ? `만료: ${new Date(existingShare.expiresAt).toLocaleDateString('ko-KR')}`
                      : '만료 기간: 무제한'}
                  </span>
                </div>
                <button
                  onClick={() => window.open(shareUrl, '_blank')}
                  className="flex items-center gap-1 text-[#7F6DF2] hover:underline"
                >
                  <span>링크 열기</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="pt-2 border-t border-[#E9E9E7] dark:border-neutral-800 flex justify-end">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium text-[#E03E3E] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>공유 해제</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[14px] text-[#37352F] dark:text-neutral-300 leading-relaxed">
                비밀번호 없이 누구나 폴더의 파일과 하위 폴더를 열람 및 다운로드할 수 있는 읽기 전용 공유 링크를 생성합니다.
              </p>

              <div>
                <label className="block text-[13px] font-medium text-[#73726E] dark:text-neutral-400 mb-1.5">
                  유효 기간
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full rounded-xl border border-[#E9E9E7] dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-[14px] text-[#37352F] dark:text-neutral-200 outline-none transition focus:border-[#7F6DF2]"
                >
                  <option value="0">무제한 (직접 해제 전까지)</option>
                  <option value="1">1일 (24시간)</option>
                  <option value="7">7일</option>
                  <option value="30">30일</option>
                </select>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleCreate}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#7F6DF2] py-2.5 text-[14px] font-medium text-white shadow-md shadow-[#7F6DF2]/20 hover:bg-[#6e5cd6] transition"
                >
                  <Share2 className="h-4 w-4" />
                  <span>공유 링크 생성 및 복사</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
