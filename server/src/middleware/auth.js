const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * timingSafeEqual을 이용한 안전한 비밀번호 검증 함수 (타이밍 공격 방지)
 * @param {string} inputPassword - 사용자가 입력한 비밀번호
 * @param {string} masterPassword - 서버 설정의 마스터 비밀번호
 * @returns {boolean}
 */
function verifyPasswordSafe(inputPassword, masterPassword) {
    if (typeof inputPassword !== 'string' || typeof masterPassword !== 'string') {
        return false;
    }

    // SHA-256 해시를 통해 두 입력의 버퍼 길이를 고정 32바이트로 일치시킨 뒤 비교
    const inputHash = crypto.createHash('sha256').update(inputPassword, 'utf8').digest();
    const masterHash = crypto.createHash('sha256').update(masterPassword, 'utf8').digest();

    return crypto.timingSafeEqual(inputHash, masterHash);
}

/**
 * JWT 서명 토큰 발급
 * @param {object} payload
 * @returns {string}
 */
function issueToken(payload = { role: 'admin' }) {
    return jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: '24h'
    });
}

/**
 * 요청에서 토큰을 추출 (쿠키 우선, Authorization 헤더 차선)
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
    if (req.cookies && req.cookies[config.COOKIE_NAME]) {
        return req.cookies[config.COOKIE_NAME];
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
    }
    return null;
}

/**
 * 토큰 검증 및 디코드
 * @param {string} token
 * @returns {object|null}
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, config.JWT_SECRET);
    } catch {
        return null;
    }
}

/**
 * 인증 필수 미들웨어
 */
function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required. Please log in.'
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired session. Please log in again.'
        });
    }

    req.user = decoded;
    next();
}

/**
 * 선택적 인증 미들웨어 (인증 여부만 req.user에 기록하고 통과)
 */
function optionalAuth(req, res, next) {
    const token = extractToken(req);
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }
    next();
}

module.exports = {
    verifyPasswordSafe,
    issueToken,
    verifyToken,
    extractToken,
    requireAuth,
    optionalAuth
};
