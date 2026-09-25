const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const THUMBNAIL_CACHE_DIR = path.resolve(__dirname, '../../data/thumbnails');
const inFlight = new Map();
const queue = [];
let activeJobs = 0;
const MAX_CONCURRENT_JOBS = 2;

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
    return new Promise((resolve, reject) => {
        const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp.jpg`;
        const args = [
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-i', sourcePath,
            '-frames:v', '1',
            '-vf', `scale=${size}:${size}:force_original_aspect_ratio=decrease`,
            '-q:v', '5',
            '-map_metadata', '-1',
            temporaryPath
        ];
        const processHandle = spawn('ffmpeg', args, {
            windowsHide: true,
            stdio: ['ignore', 'ignore', 'pipe']
        });
        let stderr = '';

        processHandle.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        processHandle.on('error', reject);
        processHandle.on('close', async (code) => {
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
