const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../middleware/auth');
const { validateAndResolvePath } = require('../config/security');
const { probeMedia, streamRangeFile, streamRemuxVideo } = require('../services/mediaService');
const { loadAndConvertSubtitle, extractEmbeddedSubtitle } = require('../services/subtitleService');
const {
    getPreviewImage,
    extractAiPdf,
    getExifData,
    parseHwpDocument
} = require('../services/previewService');

// 미디어 API는 requireAuth 적용 (쿠키, Authorization 헤더, query token 모두 지원)
router.use(requireAuth);

/**
 * GET /api/media/info (또는 /api/media-info)
 * 미디어 파일 분석(ffprobe) 및 내장/외부 자막 매칭 정보 반환
 */
router.get('/info', async (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({ error: 'Path parameter is required' });
        }

        const safePath = validateAndResolvePath(rawPath);
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const metadata = await probeMedia(safePath);
        return res.json({
            success: true,
            media: metadata
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: 'Media Probe Failed',
            message: err.message
        });
    }
});

/**
 * GET /api/media/subtitle (또는 /api/subtitle)
 * 자막 파일 서빙 (SMI 실시간 UTF-8 SRT 변환 또는 내장 자막 추출)
 */
router.get('/subtitle', async (req, res) => {
    try {
        const rawPath = req.query.path;
        const type = req.query.type || 'external';
        const streamIndex = req.query.index;

        if (!rawPath) {
            return res.status(400).json({ error: 'Path parameter is required' });
        }

        const safePath = validateAndResolvePath(rawPath);

        let srtContent = '';
        if (type === 'embedded') {
            if (streamIndex === undefined || streamIndex === null) {
                return res.status(400).json({ error: 'Subtitle stream index is required for embedded subtitles' });
            }
            srtContent = await extractEmbeddedSubtitle(safePath, streamIndex);
        } else {
            // 외부 자막 (.smi, .srt 등)
            if (!fs.existsSync(safePath)) {
                return res.status(404).json({ error: 'Subtitle file not found' });
            }
            srtContent = await loadAndConvertSubtitle(safePath);
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(srtContent);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: 'Subtitle Processing Error',
            message: err.message
        });
    }
});

/**
 * GET /api/media/view (또는 /api/view)
 * HTTP 206 Range 청크 스트리밍 또는 온더플라이 FFmpeg AAC 리먹싱 스트리밍
 */
router.get('/view', (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({ error: 'Path parameter is required' });
        }

        const safePath = validateAndResolvePath(rawPath);
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'Media file not found' });
        }

        const audioIndex = req.query.audio_index;
        const startTime = req.query.start || 0;
        const forceRemux = req.query.remux === 'true' || req.query.remux === '1';

        const ext = path.extname(safePath).toLowerCase();
        const nonNativeExtensions = ['.mkv', '.avi', '.flv', '.wmv', '.ts', '.m2ts'];

        // 리먹싱 조건:
        // 1) 클라이언트가 명시적으로 remux 요청
        // 2) 브라우저 네이티브가 아닌 컨테이너 포맷 (.mkv 등)
        // 3) 특정 오디오 트랙이 선택되었거나 Seek 위치가 지정된 경우
        const shouldRemux = forceRemux ||
            nonNativeExtensions.includes(ext) ||
            (audioIndex !== undefined && audioIndex !== '') ||
            (parseFloat(startTime) > 0 && nonNativeExtensions.includes(ext));

        if (shouldRemux) {
            return streamRemuxVideo(safePath, {
                startTime,
                audioIndex
            }, req, res);
        }

        // 일반 브라우저 호환 포맷은 초고속 HTTP 206 Range 스트리밍 제공
        return streamRangeFile(safePath, req, res);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: 'Streaming Failed',
            message: err.message
        });
    }
});

/**
 * GET /api/media/preview-image?path=...
 * RAW 이미지(CR2, NEF, ARW, DNG), PSD, AI, TIFF 등의 실시간 프리뷰 이미지 서빙
 */
router.get('/preview-image', async (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({ error: 'Path parameter is required' });
        }

        const safePath = validateAndResolvePath(rawPath);
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const result = await getPreviewImage(safePath);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Cache-Control', 'private, max-age=86400');
        return res.send(result.buffer);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: 'Preview Generation Failed',
            message: err.message
        });
    }
});

/**
 * GET /api/media/view-pdf?path=...
 * AI 파일 내장 PDF 스트림 또는 PDF 파일 직접 서빙
 */
router.get('/view-pdf', async (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({ error: 'Path parameter is required' });
        }

        const safePath = validateAndResolvePath(rawPath);
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const ext = path.extname(safePath).toLowerCase();
        if (ext === '.ai') {
            const pdfBuffer = await extractAiPdf(safePath);
            if (!pdfBuffer) {
                return res.status(400).json({ error: 'No PDF stream found in this AI file' });
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(path.basename(safePath, '.ai') + '.pdf') + '"');
            return res.send(pdfBuffer);
        }

        // 일반 PDF 파일은 파일 서빙
        res.setHeader('Content-Type', 'application/pdf');
        return fs.createReadStream(safePath).pipe(res);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: 'PDF Preview Failed',
            message: err.message
        });
    }
});

/**
 * GET /api/media/exif?path=...
 * RAW / 사진 파일의 상세 EXIF 메타데이터 (카메라 모델, 렌즈, ISO, 조리개, 셔터스피드 등)
 */
router.get('/exif', async (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({ error: 'Path parameter is required' });
        }

        const safePath = validateAndResolvePath(rawPath);
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const exif = await getExifData(safePath);
        return res.json({
            success: true,
            exif: exif || {}
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: 'EXIF Extraction Failed',
            message: err.message
        });
    }
});

/**
 * GET /api/media/document-preview?path=...
 * 한글(HWP, HWPX) 등 특수 문서의 텍스트 및 메타데이터 추출
 */
router.get('/document-preview', async (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({ error: 'Path parameter is required' });
        }

        const safePath = validateAndResolvePath(rawPath);
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const previewData = await parseHwpDocument(safePath);
        return res.json({
            success: true,
            preview: previewData
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: 'Document Preview Failed',
            message: err.message
        });
    }
});

module.exports = router;
