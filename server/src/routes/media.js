const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../middleware/auth');
const { validateAndResolvePath } = require('../config/security');
const { probeMedia, streamRangeFile, streamRemuxVideo } = require('../services/mediaService');
const { loadAndConvertSubtitle, extractEmbeddedSubtitle } = require('../services/subtitleService');

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

module.exports = router;
