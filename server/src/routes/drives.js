const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getMountedDrives, getUserLibraries } = require('../services/driveService');

/**
 * GET /api/drives
 * 마운트된 모든 드라이브 목록 및 사용자 표준 라이브러리(다운로드, 문서, 사진 등) 반환
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
        const drives = await getMountedDrives(forceRefresh);
        const libraries = getUserLibraries();
        return res.json({
            success: true,
            count: drives.length,
            drives,
            libraries
        });
    } catch (err) {
        console.error('Error fetching drives:', err);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve mounted drives: ' + err.message
        });
    }
});

module.exports = router;
