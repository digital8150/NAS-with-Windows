import React, { useState, useEffect } from 'react';

export default function CustomDialog({
  isOpen,
  title,
  message,
  type = 'confirm',
  initialValue = '',
  placeholder = '',
  confirmText = '확인',
  cancelText = '취소',
  isDanger = false,
  onConfirm,
  onCancel
}) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'prompt') {
      if (inputValue.trim()) {
        onConfirm(inputValue.trim());
      }
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl border border-[#E9E9E7] bg-white p-7 shadow-2xl">
        <h3 className="text-lg font-bold text-[#191919]">{title}</h3>
        {message && <p className="mt-2 text-[15px] text-[#73726E] leading-relaxed">{message}</p>}

        <form onSubmit={handleSubmit} className="mt-5">
          {type === 'prompt' && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="w-full rounded-xl border border-[#C4C4C0] bg-white px-4 py-2.5 text-[15px] text-[#191919] placeholder-[#9B9A97] outline-none transition focus:border-[#7F6DF2] focus:ring-2 focus:ring-[#7F6DF2]/20"
            />
          )}

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-[15px] font-medium text-[#73726E] transition hover:bg-[#F7F6F3] hover:text-[#191919]"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={type === 'prompt' && !inputValue.trim()}
              className={`rounded-xl px-4 py-2 text-[15px] font-medium text-white transition focus:outline-none disabled:opacity-50 shadow-sm ${
                isDanger
                  ? 'bg-[#E03E3E] hover:bg-red-600 focus:ring-2 focus:ring-red-500/40'
                  : 'bg-[#7F6DF2] hover:bg-[#6855dd] focus:ring-2 focus:ring-[#7F6DF2]/40'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
