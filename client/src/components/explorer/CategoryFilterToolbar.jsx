import React, { useMemo } from 'react';
import {
  Files,
  Film,
  Music,
  Image as ImageIcon,
  FileText,
  Archive
} from 'lucide-react';
import { useExplorer } from '../../contexts/ExplorerContext';

const FILTER_ITEMS = [
  { id: 'all', label: '전체', icon: Files },
  { id: 'video', label: '동영상', icon: Film },
  { id: 'audio', label: '음악', icon: Music },
  { id: 'image', label: '사진', icon: ImageIcon },
  { id: 'document', label: '문서', icon: FileText },
  { id: 'archive', label: '압축', icon: Archive }
];

export default function CategoryFilterToolbar() {
  const { categoryFilter, setCategoryFilter, rawItems = [] } = useExplorer();

  // 현재 폴더 내 각 카테고리별 파일 수 카운트 (필터링 전 원본 기준)
  const counts = useMemo(() => {
    const c = {
      all: 0,
      video: 0,
      audio: 0,
      image: 0,
      document: 0,
      archive: 0
    };

    for (const item of rawItems) {
      if (!item.isDirectory) {
        c.all++;
        if (c[item.category] !== undefined) {
          c[item.category]++;
        }
      }
    }
    return c;
  }, [rawItems]);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none select-none touch-pan-x">
      {FILTER_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const isSelected = categoryFilter === tab.id;
        const count = counts[tab.id] || 0;

        return (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium transition whitespace-nowrap border ${
              isSelected
                ? 'bg-white text-[#7F6DF2] border-[#7F6DF2]/30 shadow-xs font-semibold'
                : 'bg-[#F7F6F3] text-[#73726E] border-transparent hover:bg-white hover:text-[#37352F]'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#7F6DF2]' : 'text-[#9B9A97]'}`} />
            <span>{tab.label}</span>
            {count > 0 && (
              <span
                className={`ml-0.5 text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-[#7F6DF2]/10 text-[#7F6DF2]'
                    : 'bg-[#E9E9E7] text-[#73726E]'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
