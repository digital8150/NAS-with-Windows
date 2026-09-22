const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateAndResolvePath, isSystemProtectedPath } = require('../config/security');
const { formatBytes } = require('./driveService');
const { getFileCategory } = require('./fileService');

const dataDir = path.resolve(__dirname, '../../data');
const sharesFilePath = path.resolve(dataDir, 'shares.json');

/**
 * shares.json 읽기
 * @returns {Array<object>}
 */
function readShares() {
    try {
        if (!fs.existsSync(sharesFilePath)) {
            return [];
        }
        const data = fs.readFileSync(sharesFilePath, 'utf8');
        const json = JSON.parse(data);
        return Array.isArray(json.shares) ? json.shares : [];
    } catch (e) {
        console.error('[ShareService] Failed to read shares.json:', e.message);
        return [];
    }
}

/**
 * shares.json 저장
 * @param {Array<object>} shares
 */
function saveShares(shares) {
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(sharesFilePath, JSON.stringify({ shares }, null, 2), 'utf8');
    } catch (e) {
        console.error('[ShareService] Failed to save shares.json:', e.message);
        throw new Error('공유 정보를 저장하는 중 오류가 발생했습니다.');
    }
}

/**
 * 공유 루트 폴더 기준으로 요청된 하위 경로가 안전하게 범위 내에 있는지 철저히 검증 (경로 탈출 공격 방어)
 * @param {object} share - 공유 객체
 * @param {string} requestedSubpath - 공유 폴더 기준 상대 경로
 * @returns {string} 검증된 실제 절대 경로
 */
function validateShareSubpath(share, requestedSubpath = '') {
    if (!share || !share.folderPath) {
        const err = new Error('유효하지 않은 공유 정보입니다.');
        err.statusCode = 400;
        throw err;
    }

    const rootPath = path.resolve(share.folderPath);
    const sanitizedSubpath = (requestedSubpath || '')
        .replace(/\0/g, '')
        .replace(/^[/\\]+/, '');

    const targetPath = path.resolve(rootPath, sanitizedSubpath);

    const normalizedRoot = path.normalize(rootPath).toLowerCase();
    const normalizedTarget = path.normalize(targetPath).toLowerCase();

    const rootPrefix = normalizedRoot.endsWith(path.sep) ? normalizedRoot : normalizedRoot + path.sep;
    const isInside = normalizedTarget === normalizedRoot || normalizedTarget.startsWith(rootPrefix);

    if (!isInside) {
        const err = new Error('허용되지 않은 경로 접근입니다.');
        err.statusCode = 403;
        throw err;
    }

    if (isSystemProtectedPath(targetPath)) {
        const err = new Error('시스템 보호 파일에는 접근할 수 없습니다.');
        err.statusCode = 403;
        throw err;
    }

    if (!fs.existsSync(targetPath)) {
        const err = new Error('파일 또는 폴더를 찾을 수 없습니다.');
        err.statusCode = 404;
        throw err;
    }

    return targetPath;
}

/**
 * 특정 폴더의 새 공유 링크 생성
 * @param {string} rawFolderPath - 공유할 원본 폴더 경로
 * @param {object} options - 만료 기간 등 옵션
 * @returns {Promise<object>} 생성된 공유 객체
 */
async function createShare(rawFolderPath, options = {}) {
    const safeFolderPath = validateAndResolvePath(rawFolderPath);

    const stat = await fs.promises.stat(safeFolderPath);
    if (!stat.isDirectory()) {
        const err = new Error('폴더만 공유할 수 있습니다.');
        err.statusCode = 400;
        throw err;
    }

    const shares = readShares();

    // 이미 동일 경로로 생성된 활성 공유가 있다면 해당 공유 반환
    const existingIndex = shares.findIndex(s =>
        path.normalize(s.folderPath).toLowerCase() === path.normalize(safeFolderPath).toLowerCase()
    );

    let expiresAt = null;
    if (options.expiresInDays && Number(options.expiresInDays) > 0) {
        const d = new Date();
        d.setDate(d.getDate() + Number(options.expiresInDays));
        expiresAt = d.toISOString();
    }

    const folderName = path.basename(safeFolderPath) || safeFolderPath;

    if (existingIndex !== -1) {
        // 기존 공유 갱신
        shares[existingIndex].expiresAt = expiresAt;
        shares[existingIndex].updatedAt = new Date().toISOString();
        saveShares(shares);
        return shares[existingIndex];
    }

    const newShare = {
        id: crypto.randomBytes(16).toString('hex'),
        folderPath: safeFolderPath,
        folderName,
        createdAt: new Date().toISOString(),
        expiresAt,
        allowDownload: options.allowDownload !== false,
        accessCount: 0
    };

    shares.unshift(newShare);
    saveShares(shares);

    return newShare;
}

/**
 * 공유 ID로 공유 조회 (유효성 및 만료 여부 확인)
 * @param {string} shareId 
 * @param {boolean} incrementAccess 
 * @returns {object}
 */
function getShare(shareId, incrementAccess = false) {
    if (!shareId || typeof shareId !== 'string') {
        const err = new Error('공유 ID가 올바르지 않습니다.');
        err.statusCode = 400;
        throw err;
    }

    const shares = readShares();
    const share = shares.find(s => s.id === shareId);

    if (!share) {
        const err = new Error('유효하지 않거나 삭제된 공유 링크입니다.');
        err.statusCode = 404;
        throw err;
    }

    // 만료 여부 체크
    if (share.expiresAt) {
        const expiry = new Date(share.expiresAt).getTime();
        if (expiry < Date.now()) {
            const err = new Error('공유 링크가 만료되었습니다.');
            err.statusCode = 410;
            throw err;
        }
    }

    // 공유 원본 폴더 존재 여부 확인
    if (!fs.existsSync(share.folderPath)) {
        const err = new Error('공유 대상 원본 폴더를 찾을 수 없습니다.');
        err.statusCode = 404;
        throw err;
    }

    if (incrementAccess) {
        share.accessCount = (share.accessCount || 0) + 1;
        saveShares(shares);
    }

    return share;
}

/**
 * 전체 공유 목록 조회 (관리자용)
 * @returns {Array<object>}
 */
function listShares() {
    const shares = readShares();
    const now = Date.now();

    return shares.map(s => {
        const isExpired = s.expiresAt ? new Date(s.expiresAt).getTime() < now : false;
        const exists = fs.existsSync(s.folderPath);
        return {
            ...s,
            isExpired,
            exists
        };
    });
}

/**
 * 공유 해제 / 삭제
 * @param {string} shareId 
 * @returns {boolean}
 */
function deleteShare(shareId) {
    const shares = readShares();
    const initialLen = shares.length;
    const filtered = shares.filter(s => s.id !== shareId);

    if (filtered.length === initialLen) {
        const err = new Error('해당 공유를 찾을 수 없습니다.');
        err.statusCode = 404;
        throw err;
    }

    saveShares(filtered);
    return true;
}

/**
 * 공유된 폴더의 디렉토리 목록 조회 (하위 탐색 지원)
 * @param {object} share - 공유 객체
 * @param {string} subpath - 상대 경로
 * @returns {Promise<object>}
 */
async function listShareDirectory(share, subpath = '') {
    const targetPath = validateShareSubpath(share, subpath);

    const stat = await fs.promises.stat(targetPath);
    if (!stat.isDirectory()) {
        const err = new Error('폴더가 아닙니다.');
        err.statusCode = 400;
        throw err;
    }

    const dirents = await fs.promises.readdir(targetPath, { withFileTypes: true });

    const normalizedSubpath = subpath ? subpath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') : '';

    const items = [];

    for (const dirent of dirents) {
        const itemName = dirent.name;

        // 숨김/시스템 파일 제외
        if (
            itemName.startsWith('.') ||
            itemName.startsWith('$') ||
            itemName.toLowerCase() === 'system volume information'
        ) {
            continue;
        }

        const fullItemPath = path.join(targetPath, itemName);
        const itemSubpath = normalizedSubpath ? `${normalizedSubpath}/${itemName}` : itemName;

        try {
            const itemStat = await fs.promises.stat(fullItemPath);
            const isDir = dirent.isDirectory();
            const ext = isDir ? '' : path.extname(itemName).toLowerCase();
            const category = isDir ? 'folder' : getFileCategory(ext);

            items.push({
                name: itemName,
                subpath: itemSubpath,
                isDirectory: isDir,
                size: isDir ? 0 : itemStat.size,
                sizeFormatted: isDir ? '-' : formatBytes(itemStat.size),
                mtime: itemStat.mtime.toISOString(),
                ext,
                category
            });
        } catch {
            // 권한 없는 파일 등은 건너뜀
        }
    }

    // 폴더 우선, 그 다음 이름 알파벳/한글 가나다순 정렬
    items.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name, 'ko', { numeric: true, sensitivity: 'base' });
    });

    // 브레드크럼 구성
    const breadcrumbs = [
        { name: share.folderName, subpath: '' }
    ];

    if (normalizedSubpath) {
        const segments = normalizedSubpath.split('/').filter(Boolean);
        let currentBuild = '';
        for (const seg of segments) {
            currentBuild = currentBuild ? `${currentBuild}/${seg}` : seg;
            breadcrumbs.push({
                name: seg,
                subpath: currentBuild
            });
        }
    }

    return {
        shareId: share.id,
        folderName: share.folderName,
        currentSubpath: normalizedSubpath,
        breadcrumbs,
        items
    };
}

module.exports = {
    createShare,
    getShare,
    listShares,
    deleteShare,
    validateShareSubpath,
    listShareDirectory
};
