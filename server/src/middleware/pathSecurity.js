const { validateAndResolvePath } = require('../config/security');

/**
 * Express 미들웨어: 요청의 path 파라미터(query 또는 body)를 검증하여 req.safePath에 할당합니다.
 * 검증 실패 시 400 또는 403 JSON 에러를 반환합니다.
 */
function pathSecurityMiddleware(paramName = 'path') {
    return (req, res, next) => {
        try {
            const rawPath = req.query[paramName] || req.body[paramName];
            if (!rawPath) {
                return res.status(400).json({
                    error: `Missing required parameter '${paramName}'`
                });
            }

            const safePath = validateAndResolvePath(rawPath);
            req.safePath = safePath;
            if (paramName !== 'path') {
                req[`safe_${paramName}`] = safePath;
            }
            next();
        } catch (err) {
            return res.status(err.statusCode || 400).json({
                error: err.message || 'Path validation failed'
            });
        }
    };
}

/**
 * 복수 경로 검증 미들웨어 (예: rename의 oldPath, newPath 또는 move)
 */
function multiPathSecurityMiddleware(paramNames = ['oldPath', 'newPath']) {
    return (req, res, next) => {
        try {
            for (const param of paramNames) {
                const rawPath = req.query[param] || req.body[param];
                if (!rawPath) {
                    return res.status(400).json({
                        error: `Missing required parameter '${param}'`
                    });
                }
                const safe = validateAndResolvePath(rawPath);
                req[`safe_${param}`] = safe;
            }
            next();
        } catch (err) {
            return res.status(err.statusCode || 400).json({
                error: err.message || 'Path validation failed'
            });
        }
    };
}

module.exports = {
    pathSecurityMiddleware,
    multiPathSecurityMiddleware
};
