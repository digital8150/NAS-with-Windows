import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDrives, getFiles } from '../services/api';
import { useAuth } from './AuthContext';

const ExplorerContext = createContext(null);

/**
 * Windows 파일 시스템 경로 표준화
 * 역슬래시 통일 및 드라이브 루트(C:\ 등)를 제외한 말단 슬래시 제거
 */
export function normalizePath(p) {
  if (!p || typeof p !== 'string') return '';
  let s = p.replace(/\//g, '\\').trim();
  if (/^[a-zA-Z]:$/.test(s)) {
    s += '\\';
  }
  if (s.length > 3 && s.endsWith('\\')) {
    s = s.slice(0, -1);
  }
  return s;
}

export function ExplorerProvider({ children }) {
  const { authenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. URL 기반 초기 상태
  const initialUrlPath = normalizePath(searchParams.get('path'));
  const initialUrlCategory = searchParams.get('category') || 'all';

  const [drives, setDrives] = useState([]);
  const [currentDrive, setCurrentDrive] = useState(null);
  const [currentPath, setCurrentPath] = useState(() => initialUrlPath);
  const [parentPath, setParentPath] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 뷰 및 필터 상태
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [zoomLevel, setZoomLevel] = useState(3); // 1 ~ 5
  const [categoryFilter, setCategoryFilterState] = useState(() => initialUrlCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'date' | 'size'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // 선택 상태
  const [selectedPaths, setSelectedPaths] = useState(new Set());

  // 초기 로드 완료 플래그 (중복 초기화 방지)
  const hasInitializedRef = useRef(false);

  // 2. 드라이브 목록 로드 (순수 API 호출 함수: searchParams/currentDrive 의존성 제거)
  const loadDrives = useCallback(async (forceRefresh = false) => {
    if (!authenticated) return [];
    try {
      const data = await getDrives(forceRefresh);
      const loadedDrives = data.drives || [];
      setDrives(loadedDrives);
      return loadedDrives;
    } catch (err) {
      console.error('드라이브 로드 실패:', err);
      return [];
    }
  }, [authenticated]);

  // 3. 앱 마운트 및 로그인 시 1회만 드라이브 초기 로드 및 URL 초기화
  useEffect(() => {
    if (!authenticated) {
      hasInitializedRef.current = false;
      return;
    }
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    loadDrives().then((loadedDrives) => {
      if (!loadedDrives || loadedDrives.length === 0) return;

      const urlPath = normalizePath(searchParams.get('path'));
      if (urlPath) {
        // URL에 이미 경로가 있으면 해당 드라이브 매칭
        const driveLetter = urlPath.charAt(0).toUpperCase();
        const matched = loadedDrives.find(d => d.id === driveLetter);
        if (matched) setCurrentDrive(matched);
        setCurrentPath(urlPath);
      } else {
        // URL에 경로가 없으면 첫 번째 드라이브 기본 설정
        const initialDrive = loadedDrives[0];
        const initialMount = normalizePath(initialDrive.mountPoint);
        setCurrentDrive(initialDrive);
        setCurrentPath(initialMount);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('path', initialMount);
          return next;
        }, { replace: true });
      }
    });
  }, [authenticated, loadDrives]); // searchParams는 초기 마운트 시에만 읽고 의존성에서 배제

  // 4. 브라우저 뒤로가기 / 앞으로가기(URL 파라미터 변경) 감지 및 상태 동기화
  useEffect(() => {
    const urlPath = normalizePath(searchParams.get('path'));
    if (urlPath && urlPath !== normalizePath(currentPath)) {
      setCurrentPath(urlPath);
    }

    const urlCategory = searchParams.get('category') || 'all';
    if (urlCategory !== categoryFilter) {
      setCategoryFilterState(urlCategory);
    }
  }, [searchParams]);

  // 5. currentPath 변경 시 해당 드라이브 매칭 (불필요한 re-render 방지)
  useEffect(() => {
    if (!currentPath || drives.length === 0) return;
    const driveLetter = currentPath.charAt(0).toUpperCase();
    setCurrentDrive(prev => {
      if (prev?.id === driveLetter) return prev;
      const matched = drives.find(d => d.id === driveLetter);
      return matched || prev;
    });
  }, [currentPath, drives]);

  // 6. 디렉토리 파일 목록 로드 (currentPath 변경 시 단 한 번만 실행)
  const loadFiles = useCallback(async (targetPath) => {
    if (!authenticated || !targetPath) return;
    const normalizedTarget = normalizePath(targetPath);

    setLoading(true);
    setError(null);
    setSelectedPaths(new Set());

    try {
      const data = await getFiles(normalizedTarget);
      setItems(data.items || []);
      setParentPath(data.parentPath ? normalizePath(data.parentPath) : null);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (currentPath) {
      loadFiles(currentPath);
    }
  }, [currentPath, loadFiles]);

  // 7. 경로 이동 (사용자 명시적 탐색 -> URL과 내부 상태를 동시에 업데이트)
  const navigateTo = useCallback((targetPath) => {
    if (!targetPath) return;
    const norm = normalizePath(targetPath);
    setCurrentPath(norm);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('path', norm);
      return next;
    });
  }, [setSearchParams]);

  // 8. 카테고리 필터 변경 (URL 동기화)
  const setCategoryFilter = useCallback((cat) => {
    setCategoryFilterState(cat);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (cat && cat !== 'all') {
        next.set('category', cat);
      } else {
        next.delete('category');
      }
      return next;
    });
  }, [setSearchParams]);

  // 9. 상위 폴더로 이동
  const navigateUp = useCallback(() => {
    if (parentPath) {
      navigateTo(parentPath);
    }
  }, [parentPath, navigateTo]);

  // 10. 드라이브 전환
  const selectDrive = useCallback((drive) => {
    setCurrentDrive(drive);
    navigateTo(drive.mountPoint);
  }, [navigateTo]);

  // 11. 새로고침
  const refresh = useCallback(() => {
    if (currentPath) {
      loadFiles(currentPath);
    }
    loadDrives(true);
  }, [currentPath, loadFiles, loadDrives]);

  // 선택 토글
  const toggleSelection = useCallback((path, isMulti = false) => {
    setSelectedPaths(prev => {
      const next = new Set(isMulti ? prev : []);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // 전체 선택 / 해제
  const selectAll = useCallback(() => {
    setSelectedPaths(new Set(items.map(i => i.path)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  // 필터링 및 정렬된 파일 목록
  const filteredItems = useMemo(() => {
    let list = [...items];

    // 1) 카테고리 필터
    if (categoryFilter !== 'all') {
      list = list.filter(item => item.isDirectory || item.category === categoryFilter);
    }

    // 2) 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => item.name.toLowerCase().includes(q));
    }

    // 3) 정렬 (폴더는 항상 상단)
    list.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let compareVal = 0;
      if (sortBy === 'name') {
        compareVal = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
      } else if (sortBy === 'date') {
        compareVal = new Date(a.mtime) - new Date(b.mtime);
      } else if (sortBy === 'size') {
        compareVal = (a.size || 0) - (b.size || 0);
      }

      return sortOrder === 'asc' ? compareVal : -compareVal;
    });

    return list;
  }, [items, categoryFilter, searchQuery, sortBy, sortOrder]);

  return (
    <ExplorerContext.Provider value={{
      drives,
      currentDrive,
      currentPath,
      parentPath,
      items: filteredItems,
      rawItemsCount: items.length,
      loading,
      error,
      viewMode,
      setViewMode,
      zoomLevel,
      setZoomLevel,
      categoryFilter,
      setCategoryFilter,
      searchQuery,
      setSearchQuery,
      sortBy,
      setSortBy,
      sortOrder,
      setSortOrder,
      selectedPaths,
      toggleSelection,
      selectAll,
      clearSelection,
      navigateTo,
      navigateUp,
      selectDrive,
      refresh
    }}>
      {children}
    </ExplorerContext.Provider>
  );
}

export function useExplorer() {
  const context = useContext(ExplorerContext);
  if (!context) throw new Error('useExplorer must be used within ExplorerProvider');
  return context;
}
