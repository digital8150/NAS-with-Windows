const fs = require('fs');
const path = require('path');
const { validateAndResolvePath, isSystemProtectedPath } = require('../config/security');
const { formatBytes } = require('./driveService');

const EXTENSION_CATEGORIES = {
    video: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.m2ts'],
    audio: ['.mp3', '.flac', '.aac', '.wav', '.m4a', '.ogg', '.wma', '.ape', '.opus'],
    image: [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.tif', '.avif',
        '.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef',
        '.psd'
    ],
    document: [
        '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.md', '.markdown',
        '.log', '.csv', '.tsv', '.json', '.xml', '.yaml', '.yml', '.ini', '.conf',
        '.hwp', '.hwpx', '.ai',
        '.sql', '.sh', '.bat', '.cmd', '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css'
    ],
    archive: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso'],
    subtitle: ['.srt', '.smi', '.vtt', '.ass', '.ssa', '.sub']
};

/**
 * 확장자에 따른 파일 카테고리 판별
 * @param {string} ext - 점을 포함한 소문자 확장자 (예: '.mp4')
 * @returns {string}
 */
function getFileCategory(ext) {
    if (!ext) return 'other';
    const lowerExt = ext.toLowerCase();
    for (const [category, extensions] of Object.entries(EXTENSION_CATEGORIES)) {
        if (extensions.includes(lowerExt)) {
            return category;
        }
    }
    return 'other';
}

/**
 * Windows 파일명 유효성 검증
 * 허용되지 않는 문자: \ / : * ? " < > |
 * @param {string} name
 */
function validateFileName(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        const err = new Error('File or folder name cannot be empty');
        err.statusCode = 400;
        throw err;
    }
    const trimmed = name.trim();
    if (/[\\/:*?"<>|]/.test(trimmed)) {
        const err = new Error('Name contains invalid characters: \\ / : * ? " < > |');
        err.statusCode = 400;
        throw err;
    }
    if (trimmed === '.' || trimmed === '..') {
        const err = new Error('Invalid name');
        err.statusCode = 400;
        throw err;
    }
    return trimmed;
}

/**
 * 지정된 디렉토리의 파일 및 폴더 목록 조회 (시스템 파일 제외)
 * @param {string} targetPath - 검증할 대상 디렉토리 경로
 * @returns {Promise<object>}
 */
async function listDirectory(targetPath) {
    const safePath = validateAndResolvePath(targetPath);

    let stat;
    try {
        stat = await fs.promises.stat(safePath);
    } catch (e) {
        const err = new Error(e.code === 'ENOENT' ? '폴더를 찾을 수 없습니다.' : '접근할 수 없는 폴더입니다.');
        err.statusCode = e.code === 'ENOENT' ? 404 : 403;
        throw err;
    }

    if (!stat.isDirectory()) {
        const err = new Error('폴더가 아닙니다.');
        err.statusCode = 400;
        throw err;
    }

    const driveLetterMatch = safePath.match(/^([a-zA-Z]):\\/);
    const driveLetter = driveLetterMatch ? driveLetterMatch[1].toUpperCase() : '';
    const isRoot = safePath.toLowerCase() === `${driveLetter.toLowerCase()}:\\`;
    const parentPath = isRoot ? null : path.dirname(safePath);

    let entries;
    try {
        entries = await fs.promises.readdir(safePath, { withFileTypes: true });
    } catch (e) {
        const err = new Error('접근 권한이 없거나 보호된 시스템 폴더입니다.');
        err.statusCode = (e.code === 'EACCES' || e.code === 'EPERM') ? 403 : 500;
        throw err;
    }
    const items = [];

    for (const entry of entries) {
        const itemName = entry.name;
        const itemFullPath = path.join(safePath, itemName);

        // 1. 블랙리스트 검사 (시스템 보호 파일/폴더 자동 필터링)
        if (isSystemProtectedPath(itemFullPath) || isSystemProtectedPath(itemName)) {
            continue;
        }

        // 2. 윈도우 시스템 숨김 파일(점(.)으로 시작하는 파일 등) 기본 무시
        if (itemName.startsWith('~$')) {
            continue; // MS Office 임시 잠금 파일
        }

        try {
            let itemStat;
            try {
                itemStat = await fs.promises.stat(itemFullPath);
            } catch {
                // 심볼릭 링크 깨짐 또는 권한 제한 시 lstat 시도
                itemStat = await fs.promises.lstat(itemFullPath);
            }

            const isDir = entry.isDirectory() || itemStat.isDirectory();
            const ext = isDir ? '' : path.extname(itemName).toLowerCase();
            const size = isDir ? 0 : itemStat.size;

            items.push({
                name: itemName,
                path: itemFullPath,
                isDirectory: isDir,
                size,
                sizeFormatted: isDir ? '-' : formatBytes(size),
                mtime: itemStat.mtime.toISOString(),
                ext,
                category: isDir ? 'folder' : getFileCategory(ext)
            });
        } catch {
            // 접근 권한 등으로 stat 실패한 항목은 건너뜀
            continue;
        }
    }

    // 폴더 우선 정렬, 그 다음 이름순 (대소문자 무시) 정렬
    items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });

    return {
        currentPath: safePath,
        parentPath,
        driveLetter,
        isRoot,
        totalItems: items.length,
        items
    };
}

/**
 * 새 폴더 생성
 * @param {string} parentPath
 * @param {string} folderName
 * @returns {Promise<string>} 생성된 폴더 전체 경로
 */
async function createFolder(parentPath, folderName) {
    const validName = validateFileName(folderName);
    const safeParent = validateAndResolvePath(parentPath);
    const newFolderPath = path.join(safeParent, validName);
    const safeNewFolder = validateAndResolvePath(newFolderPath);

    if (fs.existsSync(safeNewFolder)) {
        const err = new Error(`Folder '${validName}' already exists.`);
        err.statusCode = 409;
        throw err;
    }

    await fs.promises.mkdir(safeNewFolder);
    return safeNewFolder;
}

/**
 * 파일 또는 폴더 이름 변경
 * @param {string} oldPath
 * @param {string} newName
 * @returns {Promise<string>} 변경된 전체 경로
 */
async function renameItem(oldPath, newName) {
    const validName = validateFileName(newName);
    const safeOldPath = validateAndResolvePath(oldPath);
    const dir = path.dirname(safeOldPath);
    const safeNewPath = validateAndResolvePath(path.join(dir, validName));

    if (safeOldPath.toLowerCase() !== safeNewPath.toLowerCase() && fs.existsSync(safeNewPath)) {
        const err = new Error(`Destination '${validName}' already exists.`);
        err.statusCode = 409;
        throw err;
    }

    await fs.promises.rename(safeOldPath, safeNewPath);
    return safeNewPath;
}

/**
 * 파일 또는 폴더 단일/다중 삭제
 * @param {string|string[]} targetPaths
 * @returns {Promise<{ deleted: string[], failed: { path: string, reason: string }[] }>}
 */
async function deleteItems(targetPaths) {
    const paths = Array.isArray(targetPaths) ? targetPaths : [targetPaths];
    const results = {
        deleted: [],
        failed: []
    };

    for (const itemPath of paths) {
        try {
            const safePath = validateAndResolvePath(itemPath);

            // 드라이브 루트(예: C:\, D:\) 자체를 삭제하려는 시도 차단
            if (/^[a-zA-Z]:\\?$/.test(safePath)) {
                throw new Error('Cannot delete a drive root');
            }

            await fs.promises.rm(safePath, { recursive: true, force: true });
            results.deleted.push(safePath);
        } catch (err) {
            results.failed.push({
                path: itemPath,
                reason: err.message
            });
        }
    }

    return results;
}

/**
 * 단일 파일 상세 정보 조회
 * @param {string} targetPath
 * @returns {Promise<object>}
 */
async function getFileDetails(targetPath) {
    const safePath = validateAndResolvePath(targetPath);
    const stat = await fs.promises.stat(safePath);
    const ext = path.extname(safePath).toLowerCase();

    return {
        name: path.basename(safePath),
        path: safePath,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        mtime: stat.mtime.toISOString(),
        birthtime: stat.birthtime.toISOString(),
        ext,
        category: stat.isDirectory() ? 'folder' : getFileCategory(ext)
    };
}

module.exports = {
    EXTENSION_CATEGORIES,
    getFileCategory,
    validateFileName,
    listDirectory,
    createFolder,
    renameItem,
    deleteItems,
    getFileDetails
};
