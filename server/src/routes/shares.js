const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../middleware/auth');
const {
    createShare,
    getShare,
    listShares,
    deleteShare,
    validateShareSubpath,
    listShareDirectory
} = require('../services/shareService');
const { probeMedia, streamRangeFile, streamRemuxVideo } = require('../services/mediaService');
const { getPreviewImage, extractAiPdf, parseHwpDocument, getExifData } = require('../services/previewService');
const { loadAndConvertSubtitle, extractEmbeddedSubtitle } = require('../services/subtitleService');
const { getThumbnail } = require('../services/thumbnailService');

// ==========================================
// 1. 공용 접근 라우트 (인증 불필요 - 누구나 링크로 접근 가능)
// ==========================================

/**
 * GET /api/shares/public/:id
 * 공유 폴더의 디렉토리 목록 및 메타데이터 조회
 */
router.get('/public/:id', async (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath || '';

        const share = getShare(shareId, true);
        const dirData = await listShareDirectory(share, subpath);

        return res.json({
            success: true,
            share: {
                id: share.id,
                folderName: share.folderName,
                createdAt: share.createdAt,
                expiresAt: share.expiresAt,
                allowDownload: share.allowDownload
            },
            ...dirData
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Share Error',
            message: err.message
        });
    }
});

/**
 * GET /api/shares/public/:id/download
 * 공유 폴더 내 파일 다운로드
 */
router.get('/public/:id/download', (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath;

        if (!subpath) {
            return res.status(400).json({ error: 'subpath query parameter is required' });
        }

        const share = getShare(shareId);
        if (share.allowDownload === false) {
            return res.status(403).json({ error: 'Download is not permitted for this share' });
        }

        const targetPath = validateShareSubpath(share, subpath);
        const stat = fs.statSync(targetPath);

        if (stat.isDirectory()) {
            return res.status(400).json({ error: '폴더는 직접 다운로드할 수 없습니다.' });
        }

        const filename = path.basename(targetPath);
        return res.download(targetPath, filename);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Download Error',
            message: err.message
        });
    }
});

/**
 * GET /api/shares/public/:id/preview
 * 공유 폴더 내 파일 미리보기 (이미지, 특수 이미지 RAW/PSD/AI, 문서)
 */
router.get('/public/:id/preview', async (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath;

        if (!subpath) {
            return res.status(400).json({ error: 'subpath parameter is required' });
        }

        const share = getShare(shareId);
        const targetPath = validateShareSubpath(share, subpath);

        const ext = path.extname(targetPath).toLowerCase();
        const specialRawExts = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.psd', '.tiff', '.tif'];

        if (specialRawExts.includes(ext)) {
            const { buffer, contentType } = await getPreviewImage(targetPath);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(buffer);
        }

        if (ext === '.ai') {
            const pdfBuffer = await extractAiPdf(targetPath);
            if (pdfBuffer) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline');
                return res.send(pdfBuffer);
            }
        }

        return res.sendFile(targetPath, { maxAge: '7d' });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Preview Error',
            message: err.message
        });
    }
});

/**
 * GET /api/shares/public/:id/thumbnail
 * 공유 폴더 내 파일 썸네일 (경량 이미지)
 */
router.get('/public/:id/thumbnail', async (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath;

        if (!subpath) {
            return res.status(400).json({ error: 'subpath parameter is required' });
        }

        const share = getShare(shareId);
        const targetPath = validateShareSubpath(share, subpath);

        if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
            return res.status(404).json({ error: 'File not found' });
        }

        const thumbnailPath = await getThumbnail(targetPath, req.query.size);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(thumbnailPath);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Thumbnail Generation Failed',
            message: err.message
        });
    }
});

/**
 * GET /api/shares/public/:id/document-preview
 * 공유 폴더 내 한글(HWP, HWPX) 등 문서 미리보기 추출
 */
router.get('/public/:id/document-preview', async (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath;

        if (!subpath) {
            return res.status(400).json({ error: 'subpath parameter is required' });
        }

        const share = getShare(shareId);
        const targetPath = validateShareSubpath(share, subpath);

        const preview = await parseHwpDocument(targetPath);
        return res.json({
            success: true,
            preview
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Preview Error',
            message: err.message
        });
    }
});

/**
 * GET /api/shares/public/:id/stream
 * 공유 폴더 내 비디오/오디오 스트리밍 (HTTP 206 Partial Content / Remux)
 */
router.get('/public/:id/stream', (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath;

        if (!subpath) {
            return res.status(400).json({ error: 'subpath parameter is required' });
        }

        const share = getShare(shareId);
        const targetPath = validateShareSubpath(share, subpath);

        const audioIndex = req.query.audio_index;
        const startTime = req.query.start || 0;
        const forceRemux = req.query.remux === 'true' || req.query.remux === '1';

        const ext = path.extname(targetPath).toLowerCase();
        const nonNativeExtensions = ['.mkv', '.avi', '.flv', '.wmv', '.ts', '.m2ts'];

        const shouldRemux = forceRemux ||
            nonNativeExtensions.includes(ext) ||
            (audioIndex !== undefined && audioIndex !== '') ||
            (parseFloat(startTime) > 0 && nonNativeExtensions.includes(ext));

        if (shouldRemux) {
            return streamRemuxVideo(targetPath, {
                startTime,
                audioIndex
            }, req, res);
        }

        return streamRangeFile(targetPath, req, res);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Stream Error',
            message: err.message
        });
    }
});

/**
 * GET /api/shares/public/:id/media-info
 * 공유 폴더 내 미디어 메타데이터 분석 (ffprobe)
 */
router.get('/public/:id/media-info', async (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath;

        if (!subpath) {
            return res.status(400).json({ error: 'subpath parameter is required' });
        }

        const share = getShare(shareId);
        const targetPath = validateShareSubpath(share, subpath);

        const metadata = await probeMedia(targetPath);
        return res.json({
            success: true,
            media: metadata
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Media Probe Error',
            message: err.message
        });
    }
});

/**
 * GET /api/shares/public/:id/subtitle
 * 공유 폴더 내 자막 제공
 */
router.get('/public/:id/subtitle', async (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath;
        const type = req.query.type || 'external';
        const streamIndex = req.query.index;

        if (!subpath) {
            return res.status(400).json({ error: 'subpath parameter is required' });
        }

        const share = getShare(shareId);
        const targetPath = validateShareSubpath(share, subpath);

        let srtContent = '';
        if (type === 'embedded') {
            srtContent = await extractEmbeddedSubtitle(targetPath, streamIndex);
        } else {
            srtContent = await loadAndConvertSubtitle(targetPath);
        }

        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(srtContent);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Subtitle Error',
            message: err.message
        });
    }
});

/**
 * GET /api/shares/public/:id/exif
 * 공유 폴더 내 이미지 파일의 상세 EXIF 메타데이터
 */
router.get('/public/:id/exif', async (req, res) => {
    try {
        const shareId = req.params.id;
        const subpath = req.query.subpath;

        if (!subpath) {
            return res.status(400).json({ error: 'subpath parameter is required' });
        }

        const share = getShare(shareId);
        const targetPath = validateShareSubpath(share, subpath);

        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const exif = await getExifData(targetPath);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.json({
            success: true,
            exif
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'EXIF Error',
            message: err.message
        });
    }
});

// ==========================================
// 2. 관리자 인증 라우트 (공유 링크 관리)
// ==========================================

router.use(requireAuth);

/**
 * POST /api/shares
 * 새 폴더 공유 링크 생성
 * Body: { folderPath: 'D:\\Shared', expiresInDays: 7 }
 */
router.post('/', async (req, res) => {
    try {
        const { folderPath, expiresInDays, allowDownload } = req.body || {};
        if (!folderPath) {
            return res.status(400).json({
                error: 'Bad Request',
                message: '공유할 폴더 경로(folderPath)가 필요합니다.'
            });
        }

        const share = await createShare(folderPath, {
            expiresInDays,
            allowDownload: allowDownload !== false
        });

        return res.json({
            success: true,
            message: '공유 링크가 생성되었습니다.',
            share
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Share Creation Error',
            message: err.message
        });
    }
});

/**
 * GET /api/shares
 * 전체 공유 목록 조회
 */
router.get('/', (req, res) => {
    try {
        const shares = listShares();
        return res.json({
            success: true,
            shares
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Share List Error',
            message: err.message
        });
    }
});

/**
 * DELETE /api/shares/:id
 * 공유 링크 삭제 / 해제
 */
router.delete('/:id', (req, res) => {
    try {
        const shareId = req.params.id;
        deleteShare(shareId);
        return res.json({
            success: true,
            message: '공유가 해제되었습니다.'
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Share Deletion Error',
            message: err.message
        });
    }
});

module.exports = router;
