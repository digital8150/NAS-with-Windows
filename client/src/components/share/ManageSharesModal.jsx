import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, Trash2, X, Folder, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { getShares, deleteShare } from '../../services/api';

export default function ManageSharesModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);

  const fetchShares = () => {
    setLoading(true);
    setError(null);
    getShares()
      .then((data) => {
        setShares(data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || '공유 목록을 불러오지 못했습니다.');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (shareId) => {
    const url = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleDelete = async (shareId) => {
    if (!window.confirm('이 공유 링크를 해제하시겠습니까?')) return;
    try {
      await deleteShare(shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch (err) {
      alert(err.message || '공유 해제에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-xl rounded-2xl border border-[#E9E9E7] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 dark:border-neutral-800 dark:bg-[#1c1c20] text-[#191919] dark:text-white flex flex-col max-h-[85vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E9E9E7] dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7F6DF2]/10 text-[#7F6DF2]">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">공유 링크 관리</h3>
              <p className="text-[13px] text-[#73726E] dark:text-neutral-400">
                활성화된 폴더 공유 링크 목록입니다.
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
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 scrollbar-thin">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-[13px] text-[#E03E3E] dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center text-[#73726E]">
              <Loader2 className="h-6 w-6 animate-spin text-[#7F6DF2] mb-2" />
              <span className="text-[14px]">불러오는 중...</span>
            </div>
          ) : shares.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-[#73726E] dark:text-neutral-500">
              <Share2 className="h-10 w-10 text-[#C4C4C0] dark:text-neutral-600 mb-2 stroke-1" />
              <span className="text-[14px]">생성된 공유 링크가 없습니다.</span>
            </div>
          ) : (
            shares.map((share) => {
              const isCopied = copiedId === share.id;
              const isExpired = share.isExpired;

              return (
                <div
                  key={share.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition ${
                    isExpired
                      ? 'border-neutral-200 dark:border-neutral-800 opacity-60 bg-[#FAFAFA] dark:bg-neutral-900/50'
                      : 'border-[#E9E9E7] dark:border-neutral-800 bg-white dark:bg-[#18181c] hover:border-[#7F6DF2]/40'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[14px] truncate">{share.folderName}</span>
                        {isExpired && (
                          <span className="rounded-md bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                            만료됨
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-[#73726E] dark:text-neutral-400 mt-0.5">
                        <span className="truncate max-w-[200px]" title={share.folderPath}>
                          {share.folderPath}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {share.expiresAt
                            ? `${new Date(share.expiresAt).toLocaleDateString('ko-KR')} 만료`
                            : '무제한'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleCopy(share.id)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#F4F3EF] dark:bg-neutral-800 hover:bg-[#7F6DF2] hover:text-white'
                      }`}
                      title="링크 복사"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{isCopied ? '복사됨' : '복사'}</span>
                    </button>

                    <button
                      onClick={() => window.open(`${window.location.origin}/share/${share.id}`, '_blank')}
                      className="rounded-lg p-1.5 text-[#73726E] hover:bg-[#F4F3EF] dark:hover:bg-neutral-800 transition"
                      title="새 탭에서 열기"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(share.id)}
                      className="rounded-lg p-1.5 text-[#E03E3E] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="공유 해제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
