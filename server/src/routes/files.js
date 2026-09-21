const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { requireAuth } = require('../middleware/auth');
const { validateAndResolvePath } = require('../config/security');
const {
    listDirectory,
    createFolder,
    renameItem,
    deleteItems,
    getFileDetails
} = require('../services/fileService');

// Multer 스트리밍 스토리지 엔진 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const targetDir = req.query.path || req.body.path;
            if (!targetDir) {
                return cb(new Error('Target directory (path) is required'));
            }
            const safeDir = validateAndResolvePath(targetDir);
            if (!fs.existsSync(safeDir)) {
                return cb(new Error(`Destination directory does not exist: ${safeDir}`));
            }
            cb(null, safeDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        try {
            // 한글 및 다국어 파일명 UTF-8 복원 (Multer busboy 기본 latin1 인코딩 버그 처리)
            let originalName = file.originalname;
            try {
                originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            } catch {
                // 원본 유지
            }

            const targetDir = req.query.path || req.body.path;
            const safeDir = validateAndResolvePath(targetDir);
            
            // 중복 파일명 처리: movie.mp4 -> movie (1).mp4
            const ext = path.extname(originalName);
            const baseName = path.basename(originalName, ext);
            let finalName = originalName;
            let counter = 1;

            while (fs.existsSync(path.join(safeDir, finalName))) {
                finalName = `${baseName} (${counter})${ext}`;
                counter++;
            }

            cb(null, finalName);
        } catch (err) {
            cb(err);
        }
    }
});

const upload = multer({
    storage,
    limits: {
        // 대용량 미디어 업로드를 위한 넉넉한 파일 크기 제한 (100GB)
        fileSize: 100 * 1024 * 1024 * 1024
    }
});

// 모든 파일 API는 인증 필요
router.use(requireAuth);

/**
 * GET /api/files?path=...
 * 디렉토리 내 파일 및 폴더 목록 조회 (시스템 파일 제외)
 */
router.get('/', async (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Path query parameter is required (e.g. /api/files?path=C:\\)'
            });
        }

        const data = await listDirectory(rawPath);
        return res.json({
            success: true,
            ...data
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Error',
            message: err.message
        });
    }
});

/**
 * GET /api/files/info?path=...
 * 단일 파일의 상세 메타데이터 조회
 */
router.get('/info', async (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({ error: 'Path query parameter is required' });
        }
        const info = await getFileDetails(rawPath);
        return res.json({ success: true, info });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Error',
            message: err.message
        });
    }
});

/**
 * POST /api/files/upload?path=...
 * 지정된 디렉토리로 파일 단일/다중 업로드
 */
router.post('/upload', upload.array('files', 50), (req, res) => {
    try {
        const uploaded = (req.files || []).map(f => ({
            name: f.filename,
            path: f.path,
            size: f.size
        }));

        return res.json({
            success: true,
            message: `Successfully uploaded ${uploaded.length} file(s).`,
            files: uploaded
        });
    } catch (err) {
        return res.status(500).json({
            error: 'Upload Failed',
            message: err.message
        });
    }
});

/**
 * GET /api/files/download?path=...
 * 파일 다운로드
 */
router.get('/download', (req, res) => {
    try {
        const rawPath = req.query.path;
        if (!rawPath) {
            return res.status(400).json({ error: 'Path query parameter is required' });
        }

        const safePath = validateAndResolvePath(rawPath);
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const stat = fs.statSync(safePath);
        if (stat.isDirectory()) {
            return res.status(400).json({ error: 'Cannot download a directory directly' });
        }

        const filename = path.basename(safePath);
        return res.download(safePath, filename);
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Error',
            message: err.message
        });
    }
});

/**
 * POST /api/files/mkdir
 * 새 디렉토리 생성
 * Body: { path: 'D:\\folder', folderName: 'NewFolder' }
 */
router.post('/mkdir', async (req, res) => {
    try {
        const { path: parentPath, folderName } = req.body || {};
        if (!parentPath || !folderName) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Both parent path and folderName are required'
            });
        }

        const createdPath = await createFolder(parentPath, folderName);
        return res.json({
            success: true,
            message: `Folder '${folderName}' created successfully.`,
            path: createdPath
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Error',
            message: err.message
        });
    }
});

/**
 * POST /api/files/rename
 * 파일 또는 폴더 이름 변경
 * Body: { path: 'D:\\old.txt', newName: 'new.txt' }
 */
router.post('/rename', async (req, res) => {
    try {
        const { path: oldPath, newName } = req.body || {};
        if (!oldPath || !newName) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Both path and newName are required'
            });
        }

        const newPath = await renameItem(oldPath, newName);
        return res.json({
            success: true,
            message: 'Renamed successfully',
            oldPath,
            newPath
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Error',
            message: err.message
        });
    }
});

/**
 * POST /api/files/delete
 * 파일 또는 폴더 단일/다중 삭제
 * Body: { path: 'D:\\target' } 또는 { paths: ['D:\\a', 'D:\\b'] }
 */
router.post('/delete', async (req, res) => {
    try {
        const { path: singlePath, paths: multiPaths } = req.body || {};
        const targets = multiPaths || (singlePath ? [singlePath] : null);

        if (!targets || targets.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Path or paths array is required for deletion'
            });
        }

        const results = await deleteItems(targets);
        return res.json({
            success: results.failed.length === 0,
            deleted: results.deleted,
            failed: results.failed
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            error: err.name || 'Error',
            message: err.message
        });
    }
});

module.exports = router;
