import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getDrives, getFiles } from '../services/api';
import { useAuth } from './AuthContext';

const ExplorerContext = createContext(null);

export function ExplorerProvider({ children }) {
  const { authenticated } = useAuth();

  const [drives, setDrives] = useState([]);
  const [currentDrive, setCurrentDrive] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 뷰 및 필터 상태
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [zoomLevel, setZoomLevel] = useState(3); // 1 (작게) ~ 5 (크게)
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'date' | 'size'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // 선택 상태
  const [selectedPaths, setSelectedPaths] = useState(new Set());

  // 드라이브 목록 로드
  const loadDrives = useCallback(async (forceRefresh = false) => {
    if (!authenticated) return;
    try {
      const data = await getDrives(forceRefresh);
      setDrives(data.drives || []);
      
      // 최초 실행 시 첫 번째 드라이브 선택
      if (!currentDrive && data.drives && data.drives.length > 0) {
        const initial = data.drives[0];
        setCurrentDrive(initial);
        setCurrentPath(initial.mountPoint);
      }
    } catch (err) {
      console.error('드라이브 로드 실패:', err);
    }
  }, [authenticated, currentDrive]);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  // 디렉토리 파일 목록 로드
  const loadFiles = useCallback(async (targetPath) => {
    if (!authenticated || !targetPath) return;
    setLoading(true);
    setError(null);
    setSelectedPaths(new Set());

    try {
      const data = await getFiles(targetPath);
      setItems(data.items || []);
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
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

  // 경로 이동
  const navigateTo = useCallback((targetPath) => {
    if (!targetPath) return;
    setCurrentPath(targetPath);
  }, []);

  // 상위 폴더로 이동
  const navigateUp = useCallback(() => {
    if (parentPath) {
      navigateTo(parentPath);
    }
  }, [parentPath, navigateTo]);

  // 드라이브 전환
  const selectDrive = useCallback((drive) => {
    setCurrentDrive(drive);
    navigateTo(drive.mountPoint);
  }, [navigateTo]);

  // 새로고침
  const refresh = useCallback(() => {
    if (currentPath) {
      loadFiles(currentPath);
      loadDrives(true);
    }
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

    // 1. 카테고리 필터
    if (categoryFilter !== 'all') {
      list = list.filter(item => item.isDirectory || item.category === categoryFilter);
    }

    // 2. 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => item.name.toLowerCase().includes(q));
    }

    // 3. 정렬 (폴더는 항상 상단)
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
