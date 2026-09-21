import React, { useState, useEffect } from 'react';

export default function CustomDialog({
  isOpen,
  title,
  message,
  type = 'confirm', // 'confirm' | 'prompt'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        {message && <p className="mt-2 text-sm text-slate-400">{message}</p>}

        <form onSubmit={handleSubmit} className="mt-4">
          {type === 'prompt' && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          )}

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={type === 'prompt' && !inputValue.trim()}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition focus:outline-none disabled:opacity-50 ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-500 focus:ring-2 focus:ring-red-500/40'
                  : 'bg-blue-600 hover:bg-blue-500 focus:ring-2 focus:ring-blue-500/40'
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
