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
        const psCommand = 'Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, VolumeName, FileSystem, Size, FreeSpace, DriveType | ConvertTo-Json -Compress';
        
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
            timeout: 5000,
            windowsHide: true
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
async function getMountedDrives(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedDrives && (now - lastScanTime < CACHE_TTL_MS)) {
        return cachedDrives;
    }

    let rawList = [];
    try {
        rawList = await scanDrivesViaPowerShell();
    } catch (err) {
        console.warn('PowerShell drive scan failed, using fs fallback:', err.message);
        rawList = scanDrivesFallback();
    }

    const drives = rawList
        .filter(item => item && item.DeviceID)
        .map(item => {
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
                label: item.VolumeName || (letter === 'C' ? 'Local Disk' : 'New Volume'),
                fileSystem: item.FileSystem || 'NTFS',
                driveType: driveTypeNum,
                driveTypeDesc: DRIVE_TYPE_MAP[driveTypeNum] || 'Unknown',
                totalBytes,
                freeBytes,
                usedBytes,
                usedPercentage,
                totalFormatted: formatBytes(totalBytes),
                freeFormatted: formatBytes(freeBytes),
                usedFormatted: formatBytes(usedBytes),
                isSystemDrive: letter === 'C'
            };
        });

    cachedDrives = drives;
    lastScanTime = now;
    return drives;
}

module.exports = {
    getMountedDrives,
    formatBytes
};
