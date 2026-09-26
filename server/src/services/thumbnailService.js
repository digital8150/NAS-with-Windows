const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const os = require('os');
const { getPreviewImage, RAW_EXTENSIONS } = require('./previewService');

const SPECIAL_IMAGE_EXTS = new Set([
    ...RAW_EXTENSIONS,
    '.psd',
    '.ai',
    '.tiff',
    '.tif'
]);

const THUMBNAIL_CACHE_DIR = path.resolve(__dirname, '../../data/thumbnails');
const inFlight = new Map();
const queue = [];
let activeJobs = 0;
const MAX_CONCURRENT_JOBS = Math.max(2, Math.min(4, Math.floor(os.cpus().length / 2)));

function normalizeThumbnailSize(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 480;
    return Math.min(768, Math.max(128, parsed));
}

function runQueued(task) {
    return new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });
        drainQueue();
    });
}

function drainQueue() {
    while (activeJobs < MAX_CONCURRENT_JOBS && queue.length > 0) {
        const job = queue.shift();
        activeJobs += 1;
        job.task()
            .then(job.resolve, job.reject)
            .finally(() => {
                activeJobs -= 1;
                drainQueue();
            });
    }
}

function generateThumbnail(sourcePath, outputPath, size) {
    return new Promise(async (resolve, reject) => {
        const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp.jpg`;
        let temporaryInputPath = null;
        let inputBuffer = null;

        const ext = path.extname(sourcePath).toLowerCase();
        if (SPECIAL_IMAGE_EXTS.has(ext)) {
            try {
                const preview = await getPreviewImage(sourcePath);
                if (preview && preview.buffer && preview.buffer.length > 0) {
                    if (preview.contentType && preview.contentType.startsWith('image/')) {
                        inputBuffer = preview.buffer;
                    } else if (preview.contentType === 'application/pdf') {
                        temporaryInputPath = `${outputPath}.${process.pid}.${Date.now()}.input.pdf`;
                        await fs.promises.writeFile(temporaryInputPath, preview.buffer);
                    }
                }
            } catch {
                // 프리뷰 추출 실패 시 FFmpeg 직접 디코딩 fallback 진행
            }
        }

        const args = [
            '-hide_banner',
            '-loglevel', 'error',
            '-y'
        ];

        if (inputBuffer) {
            args.push('-f', 'image2pipe', '-i', 'pipe:0');
        } else if (temporaryInputPath) {
            args.push('-i', temporaryInputPath);
        } else {
            args.push('-i', sourcePath);
        }

        args.push(
            '-frames:v', '1',
            '-vf', `scale=${size}:${size}:force_original_aspect_ratio=decrease`,
            '-q:v', '5',
            '-map_metadata', '-1',
            temporaryPath
        );

        const processHandle = spawn('ffmpeg', args, {
            windowsHide: true,
            stdio: [inputBuffer ? 'pipe' : 'ignore', 'ignore', 'pipe']
        });

        let stderr = '';
        let timer = null;

        const cleanupTempInput = async () => {
            if (temporaryInputPath) {
                await fs.promises.rm(temporaryInputPath, { force: true }).catch(() => {});
            }
        };

        timer = setTimeout(() => {
            try {
                processHandle.kill('SIGKILL');
            } catch {}
            cleanupTempInput();
            reject(new Error('Thumbnail generation timed out'));
        }, 12000);

        processHandle.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        processHandle.on('error', async (err) => {
            clearTimeout(timer);
            await cleanupTempInput();
            await fs.promises.rm(temporaryPath, { force: true }).catch(() => {});
            reject(err);
        });

        processHandle.on('close', async (code) => {
            clearTimeout(timer);
            await cleanupTempInput();
            try {
                if (code !== 0) {
                    throw new Error(stderr.trim() || `Thumbnail generation failed with exit code ${code}`);
                }
                await fs.promises.rename(temporaryPath, outputPath);
                resolve(outputPath);
            } catch (error) {
                await fs.promises.rm(temporaryPath, { force: true }).catch(() => {});
                reject(error);
            }
        });

        if (inputBuffer && processHandle.stdin) {
            processHandle.stdin.on('error', () => {});
            processHandle.stdin.end(inputBuffer);
        }
    });
}

async function getThumbnail(filePath, requestedSize) {
    const size = normalizeThumbnailSize(requestedSize);
    const stat = await fs.promises.stat(filePath);
    const cacheKey = crypto
        .createHash('sha256')
        .update(`${filePath.toLowerCase()}\0${stat.size}\0${stat.mtimeMs}\0${size}`)
        .digest('hex');
    const outputPath = path.join(THUMBNAIL_CACHE_DIR, `${cacheKey}.jpg`);

    try {
        await fs.promises.access(outputPath, fs.constants.R_OK);
        return outputPath;
    } catch {
        // Generate and cache a missing thumbnail below.
    }

    if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

    const pending = runQueued(async () => {
        await fs.promises.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });
        return generateThumbnail(filePath, outputPath, size);
    }).finally(() => {
        inFlight.delete(cacheKey);
    });

    inFlight.set(cacheKey, pending);
    return pending;
}

module.exports = {
    getThumbnail,
    normalizeThumbnailSize
};
