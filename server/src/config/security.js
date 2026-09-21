const path = require('path');

/**
 * Windows 시스템 무결성 유지 및 개인정보 보호를 위한 제외(블랙리스트) 정규식 패턴 목록
 * PLAN.md 섹션 4.1 기준
 */
const SYSTEM_EXCLUDES = [
    // C: 드라이브 전용 보호 디렉토리
    /^c:\\windows/i,
    /^c:\\program files(?: \(x86\))?/i,
    /^c:\\programdata/i,
    /^c:\\users/i,
    /^c:\\recovery/i,
    /^c:\\boot/i,
    /^c:\\\$getcurrent/i,
    /^c:\\perflogs/i,

    // 모든 드라이브 공통 시스템/볼륨/메타데이터 폴더 및 파일
    /(?:^|[\\/])\$recycle\.bin(?:[\\/]|$)/i,
    /(?:^|[\\/])system volume information(?:[\\/]|$)/i,
    /(?:^|[\\/])(pagefile|hiberfil|swapfile)\.sys$/i,
    /(?:^|[\\/])dumpstack\.log(?:\.tmp)?$/i,
    /(?:^|[\\/])\$(?:mft|logfile)(?:[\\/]|$)/i
];

/**
 * 특정 파일/폴더 이름 또는 전체 경로가 시스템 보호 대상인지 검사
 * @param {string} targetPath - 파일명 또는 전체 경로
 * @returns {boolean}
 */
function isSystemProtectedPath(targetPath) {
    if (!targetPath) return true;
    const normalized = path.normalize(targetPath);
    return SYSTEM_EXCLUDES.some(pattern => pattern.test(normalized));
}

/**
 * 요청된 경로의 유효성, Windows 드라이브 형식, Path Traversal 및 블랙리스트를 검증하고
 * 안전한 정규화된 절대 경로를 반환합니다.
 * @param {string} requestedPath - 클라이언트가 요청한 경로
 * @returns {string} - 검증된 절대 경로
 * @throws {Error} - 유효하지 않거나 차단된 경로일 경우 statusCode가 부여된 Error 발생
 */
function validateAndResolvePath(requestedPath) {
    if (!requestedPath || typeof requestedPath !== 'string' || requestedPath.trim() === '') {
        const err = new Error('Path is required');
        err.statusCode = 400;
        throw err;
    }

    const trimmed = requestedPath.trim();

    // 1. 윈도우 드라이브 레터로 시작하는지 검증 (상대 경로 및 암묵적 CWD 확장 차단)
    if (!/^[a-zA-Z]:(?:[\\/]|$)/.test(trimmed)) {
        const err = new Error('Invalid drive format. Path must start with a valid drive letter (e.g. C:\\)');
        err.statusCode = 400;
        throw err;
    }

    // 2. 역슬래시 및 경로 정규화
    let formatted = trimmed;
    if (/^[a-zA-Z]:$/.test(formatted)) {
        formatted += '\\';
    }

    const normalized = path.normalize(path.resolve(formatted));

    // 정규화 후에도 여전히 드라이브 레터로 시작하는지 재검증
    const match = normalized.match(/^[a-zA-Z]:\\/);
    if (!match) {
        const err = new Error('Invalid drive format. Path must start with a valid drive letter (e.g. C:\\)');
        err.statusCode = 400;
        throw err;
    }

    // 3. 블랙리스트(시스템 보호 자원) 검사
    if (isSystemProtectedPath(normalized)) {
        const err = new Error('Access Denied: Protected System Resource');
        err.statusCode = 403;
        throw err;
    }

    return normalized;
}

module.exports = {
    SYSTEM_EXCLUDES,
    isSystemProtectedPath,
    validateAndResolvePath
};
