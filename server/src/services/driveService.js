const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRIVE_TYPE_MAP = {
    0: 'Unknown',
    1: 'No Root Directory',
    2: 'Removable Disk',
    3: 'Local Fixed Disk',
    4: 'Network Drive',
    5: 'Compact Disc',
    6: 'RAM Disk'
};

// 5초 메모리 캐시
let cachedDrives = null;
let lastScanTime = 0;
const CACHE_TTL_MS = 5000;

/**
 * 바이트 단위를 읽기 쉬운 문자열(KB, MB, GB, TB)로 변환
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * PowerShell Get-CimInstance를 통해 Windows 드라이브 상세 정보 취득
 * @returns {Promise<Array>}
 */
function scanDrivesViaPowerShell() {
    return new Promise((resolve, reject) => {
        const psCommand = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, VolumeName, FileSystem, Size, FreeSpace, DriveType | ConvertTo-Json -Compress';
        
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
            timeout: 5000,
            windowsHide: true,
            encoding: 'utf8'
        }, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            try {
                const text = stdout.trim();
                if (!text) {
                    return resolve([]);
                }
                const parsed = JSON.parse(text);
                const list = Array.isArray(parsed) ? parsed : [parsed];
                resolve(list);
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    });
}

/**
 * Node.js fs.statfsSync를 이용한 폴백 드라이브 스캐너
 * @returns {Array}
 */
function scanDrivesFallback() {
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const results = [];

    for (const letter of letters) {
        const rootPath = `${letter}:\\`;
        try {
            if (fs.existsSync(rootPath)) {
                let size = 0;
                let freeSpace = 0;
                try {
                    const stat = fs.statfsSync(rootPath);
                    size = stat.bsize * stat.blocks;
                    freeSpace = stat.bsize * stat.bfree;
                } catch {
                    // 권한 또는 statfs 미지원
                }

                results.push({
                    DeviceID: `${letter}:`,
                    VolumeName: '',
                    FileSystem: 'Unknown',
                    Size: size,
                    FreeSpace: freeSpace,
                    DriveType: 3
                });
            }
        } catch {
            // 드라이브 접근 실패 무시
        }
    }

    return results;
}

/**
 * 시스템에 마운트된 모든 드라이브의 목록과 용량, 사용률, 포맷팅된 정보 반환
 * @param {boolean} forceRefresh
 * @returns {Promise<Array>}
 */
const isWindows = process.platform === 'win32';

/**
 * 리눅스 df 명령어를 통해 마운트된 실제 스토리지 볼륨 정보 취득
 * @returns {Promise<Array>}
 */
function scanDrivesLinux() {
    return new Promise((resolve) => {
        execFile('df', ['-B1', '-P'], { timeout: 5000, encoding: 'utf8' }, (error, stdout) => {
            const results = [];
            const seenMounts = new Set();

            if (!error && stdout) {
                const lines = stdout.trim().split('\n').slice(1);
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 6) {
                        const filesystem = parts[0];
                        const totalBytes = parseInt(parts[1], 10) || 0;
                        const usedBytes = parseInt(parts[2], 10) || 0;
                        const freeBytes = parseInt(parts[3], 10) || 0;
                        const mountPoint = parts.slice(5).join(' ');

                        // 가상 파일시스템 제외 (tmpfs, devtmpfs, cgroup 등)
                        if (
                            filesystem === 'tmpfs' ||
                            filesystem === 'devtmpfs' ||
                            filesystem === 'none' ||
                            filesystem === 'udev' ||
                            mountPoint.startsWith('/dev') ||
                            mountPoint.startsWith('/proc') ||
                            mountPoint.startsWith('/sys') ||
                            mountPoint.startsWith('/run')
                        ) {
                            continue;
                        }

                        if (!seenMounts.has(mountPoint) && fs.existsSync(mountPoint)) {
                            seenMounts.add(mountPoint);
                            results.push({
                                DeviceID: mountPoint,
                                VolumeName: mountPoint === '/' ? '루트 저장소' : path.basename(mountPoint),
                                FileSystem: filesystem,
                                Size: totalBytes,
                                FreeSpace: freeBytes,
                                DriveType: 3
                            });
                        }
                    }
                }
            }

            // 만약 df 결과에 루트 '/' 가 없거나 빈 경우 fallback
            if (!seenMounts.has('/') && fs.existsSync('/')) {
                try {
                    const stat = fs.statfsSync('/');
                    const total = stat.bsize * stat.blocks;
                    const free = stat.bsize * stat.bavail;
                    results.unshift({
                        DeviceID: '/',
                        VolumeName: '루트 저장소',
                        FileSystem: 'POSIX',
                        Size: total,
                        FreeSpace: free,
                        DriveType: 3
                    });
                } catch {}
            }

            resolve(results);
        });
    });
}

/**
 * 시스템에 마운트된 모든 드라이브의 목록과 용량, 사용률, 포맷팅된 정보 반환
 * @param {boolean} forceRefresh
 * @returns {Promise<Array>}
 */
async function getMountedDrives(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedDrives && (now - lastScanTime < CACHE_TTL_MS)) {
        return cachedDrives;
    }

    let rawList = [];

    if (isWindows) {
        try {
            rawList = await scanDrivesViaPowerShell();
        } catch (err) {
            console.warn('PowerShell drive scan failed, using fs fallback:', err.message);
            rawList = scanDrivesFallback();
        }
    } else {
        rawList = await scanDrivesLinux();
    }

    const drives = rawList
        .filter(item => {
            if (!item || !item.DeviceID) return false;
            const mp = isWindows ? `${item.DeviceID.replace(':', '').toUpperCase()}:\\` : item.DeviceID;

            // 미디어가 없거나 파일시스템이 마운트되지 않은 드라이브 제외
            try {
                if (!fs.existsSync(mp)) {
                    return false;
                }
            } catch {
                return false;
            }

            return true;
        })
        .map(item => {
            if (isWindows) {
                const letter = item.DeviceID.replace(':', '').toUpperCase();
                const mountPoint = `${letter}:\\`;
                const totalBytes = Number(item.Size) || 0;
                const freeBytes = Number(item.FreeSpace) || 0;
                const usedBytes = Math.max(0, totalBytes - freeBytes);
                const usedPercentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
                const driveTypeNum = Number(item.DriveType) || 0;

                return {
                    id: letter,
                    letter,
                    mountPoint,
                    label: item.VolumeName || (letter === 'C' ? '로컬 디스크' : `새 볼륨 (${letter}:)`),
                    fileSystem: item.FileSystem || 'NTFS',
                    driveType: driveTypeNum,
                    driveTypeDesc: DRIVE_TYPE_MAP[driveTypeNum] || '기본 저장소',
                    totalBytes,
                    freeBytes,
                    usedBytes,
                    usedPercentage,
                    totalFormatted: formatBytes(totalBytes),
                    freeFormatted: formatBytes(freeBytes),
                    usedFormatted: formatBytes(usedBytes),
                    isSystemDrive: letter === 'C'
                };
            } else {
                const mountPoint = item.DeviceID;
                const id = mountPoint === '/' ? 'root' : (path.basename(mountPoint) || 'drive');
                const totalBytes = Number(item.Size) || 0;
                const freeBytes = Number(item.FreeSpace) || 0;
                const usedBytes = Math.max(0, totalBytes - freeBytes);
                const usedPercentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
                const driveTypeNum = 3;

                return {
                    id,
                    letter: mountPoint,
                    mountPoint,
                    label: item.VolumeName ? `${item.VolumeName} (${mountPoint})` : mountPoint,
                    fileSystem: item.FileSystem || 'ext4',
                    driveType: driveTypeNum,
                    driveTypeDesc: '로컬 스토리지',
                    totalBytes,
                    freeBytes,
                    usedBytes,
                    usedPercentage,
                    totalFormatted: formatBytes(totalBytes),
                    freeFormatted: formatBytes(freeBytes),
                    usedFormatted: formatBytes(usedBytes),
                    isSystemDrive: mountPoint === '/'
                };
            }
        });

    cachedDrives = drives;
    lastScanTime = now;
    return drives;
}

const os = require('os');

/**
 * Windows 현재 사용자 표준 라이브러리 폴더 목록 조회 (다운로드, 문서, 사진, 동영상, 음악, 바탕화면)
 * @returns {Array<{ id: string, name: string, path: string, icon: string }>}
 */
function getUserLibraries() {
    const home = os.homedir();
    const libDefs = [
        { id: 'downloads', name: '다운로드', sub: 'Downloads', icon: 'Download' },
        { id: 'documents', name: '내 문서', sub: 'Documents', icon: 'FileText' },
        { id: 'pictures', name: '내 사진', sub: 'Pictures', icon: 'Image' },
        { id: 'videos', name: '내 동영상', sub: 'Videos', icon: 'Film' },
        { id: 'music', name: '내 음악', sub: 'Music', icon: 'Music' },
        { id: 'desktop', name: '바탕화면', sub: 'Desktop', icon: 'Monitor' },
        { id: 'repos', name: '작업 저장소 (repos)', sub: 'repos', icon: 'FileText' }
    ];

    const libraries = [];
    for (const item of libDefs) {
        const fullPath = path.join(home, item.sub);
        if (fs.existsSync(fullPath)) {
            libraries.push({
                id: item.id,
                name: item.name,
                path: fullPath,
                icon: item.icon
            });
        }
    }

    if (libraries.length === 0) {
        libraries.push({
            id: 'home',
            name: '홈 디렉토리',
            path: home,
            icon: 'HardDrive'
        });
    }

    return libraries;
}

module.exports = {
    getMountedDrives,
    getUserLibraries,
    formatBytes
};
