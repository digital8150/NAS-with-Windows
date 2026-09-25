import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Render large folders in small chunks so mounting the first screen does not
 * block the interface. More items are prepared before the user reaches them.
 */
export default function useProgressiveItems(items, { initialCount, batchSize }) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(initialCount, items.length));
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleCount(Math.min(initialCount, items.length));
  }, [items, initialCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= items.length) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisibleCount((count) => Math.min(count + batchSize, items.length));
      },
      {
        root: sentinel.closest('main'),
        rootMargin: '800px 0px'
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [batchSize, items.length, visibleCount]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  return {
    visibleItems,
    hasMore: visibleCount < items.length,
    sentinelRef
  };
}
