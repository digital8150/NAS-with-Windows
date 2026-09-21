const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getMountedDrives } = require('../services/driveService');

/**
 * GET /api/drives
 * 마운트된 모든 드라이브 목록 및 실시간 용량 모니터링 데이터 반환
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
        const drives = await getMountedDrives(forceRefresh);
        return res.json({
            success: true,
            count: drives.length,
            drives
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
