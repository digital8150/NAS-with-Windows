import React, { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle, Search, Table } from 'lucide-react';
import { getDownloadUrl } from '../../../services/api';

// 열 인덱스를 엑셀 열 문자열(0->A, 1->B, 26->AA)로 변환
function getColumnLabel(index) {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

export default function ExcelViewer({ item }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [currentSheet, setCurrentSheet] = useState('');
  const [sheetsData, setSheetsData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const docUrl = item.downloadUrl || getDownloadUrl(item.path);

    fetch(docUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`스프레드시트를 불러오지 못했습니다. (${res.status})`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!isMounted) return;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const names = workbook.SheetNames || [];
        
        const parsedSheets = {};
        for (const name of names) {
          const ws = workbook.Sheets[name];
          const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          parsedSheets[name] = rawRows;
        }

        setSheetNames(names);
        setSheetsData(parsedSheets);
        if (names.length > 0) {
          setCurrentSheet(names[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || '스프레드시트를 읽는 중 오류가 발생했습니다.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.path]);

  // 현재 시트의 데이터
  const activeRows = sheetsData[currentSheet] || [];

  // 최대 열 개수 계산
  const maxCols = useMemo(() => {
    let max = 0;
    for (const r of activeRows) {
      if (r && r.length > max) max = r.length;
    }
    return Math.max(max, 5); // 최소 5열
  }, [activeRows]);

  // 검색 필터링
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return activeRows;
    const q = searchQuery.toLowerCase();
    return activeRows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(q))
    );
  }, [activeRows, searchQuery]);

  return (
    <div className="flex flex-col w-full h-[76vh] rounded-2xl bg-[#16161a] border border-neutral-800 shadow-2xl overflow-hidden select-text">
      {/* 1. 상단 컨트롤 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-[#1c1c20] text-neutral-300 text-[13px] select-none shrink-0">
        <div className="flex items-center gap-2 truncate mr-3">
          <Table className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-xs">{item.name}</span>
          <span className="text-neutral-500 font-mono text-[12px] hidden sm:inline">
            ({activeRows.length} 행)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 셀 검색 입력 */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="내용 검색..."
              className="h-8 w-32 sm:w-48 rounded-lg bg-neutral-900 border border-neutral-700/80 pl-8 pr-2.5 text-[12px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#7F6DF2]"
            />
          </div>
        </div>
      </div>

      {/* 2. 본문 스프레드시트 그리드 */}
      <div className="relative flex-1 overflow-auto bg-[#111113] scrollbar-thin">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111113]/80 backdrop-blur-sm text-neutral-300">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-400 mb-2" />
            <span className="text-[14px] font-medium">스프레드시트를 불러오는 중...</span>
          </div>
        )}

        {error ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <AlertCircle className="h-10 w-10 text-neutral-500 mb-3" />
            <p className="text-[14px] font-medium text-neutral-200 mb-1">{error}</p>
            <p className="text-[12px] text-neutral-500">상단 다운로드 버튼으로 원본 파일을 확인해 주세요.</p>
          </div>
        ) : (
          <div className="min-w-full inline-block align-top">
            <table className="border-collapse text-[12px] font-mono select-text w-full">
              {/* 열 머리글 (A, B, C...) */}
              <thead>
                <tr className="bg-[#1a1a1e] border-b border-neutral-800 text-neutral-400 sticky top-0 z-10 shadow-sm">
                  <th className="w-12 px-2 py-2 text-center border-r border-neutral-800 text-neutral-500 bg-[#16161a] sticky left-0 z-20 select-none">
                    #
                  </th>
                  {Array.from({ length: maxCols }).map((_, cIdx) => (
                    <th
                      key={cIdx}
                      className="min-w-[120px] max-w-[240px] px-3 py-2 text-center font-medium border-r border-neutral-800 select-none"
                    >
                      {getColumnLabel(cIdx)}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* 행 데이터 */}
              <tbody>
                {filteredRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-neutral-800/80 hover:bg-neutral-800/40 transition"
                  >
                    {/* 행 번호 (1, 2, 3...) */}
                    <td className="px-2 py-1.5 text-center text-neutral-500 bg-[#16161a] border-r border-neutral-800 sticky left-0 z-10 select-none">
                      {rIdx + 1}
                    </td>

                    {/* 각 셀 데이터 */}
                    {Array.from({ length: maxCols }).map((_, cIdx) => {
                      const cellVal = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : '';
                      return (
                        <td
                          key={cIdx}
                          className="px-3 py-1.5 border-r border-neutral-800/60 text-neutral-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]"
                          title={cellVal}
                        >
                          {cellVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. 하단 시트 탭 바 */}
      {sheetNames.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-t border-neutral-800 bg-[#1c1c20] overflow-x-auto shrink-0 select-none scrollbar-none">
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setCurrentSheet(name)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition whitespace-nowrap ${
                currentSheet === name
                  ? 'bg-[#27272a] text-white border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
