const express = require('express');
const router = express.Router();
const os = require('os');
const config = require('../config');
const {
    getClientIp,
    getIpSecurityStatus,
    recordLoginFailure,
    recordLoginSuccess,
    checkLockoutMiddleware
} = require('../middleware/rateLimiter');
const {
    verifyPasswordSafe,
    issueToken,
    extractToken,
    verifyToken
} = require('../middleware/auth');

/**
 * GET /api/auth/status
 * 현재 클라이언트 IP의 보안 상태(잠금 여부, 남은 시도 횟수) 및 세션 인증 여부, 온보딩 필요 여부 반환
 */
router.get('/status', (req, res) => {
    const ip = getClientIp(req);
    const secStatus = getIpSecurityStatus(ip);

    // 세션 토큰 확인
    const token = extractToken(req);
    const decoded = token ? verifyToken(token) : null;
    const authenticated = Boolean(decoded);

    return res.json({
        authenticated,
        needsSetup: !config.isSetupCompleted(),
        serverName: os.hostname(),
        user: authenticated ? { role: decoded.role } : null,
        security: {
            ip,
            isLocked: secStatus.isLocked,
            remainingLockSeconds: secStatus.remainingLockSeconds,
            failedAttempts: secStatus.failedAttempts,
            remainingAttempts: secStatus.remainingAttempts
        }
    });
});

/**
 * POST /api/auth/setup
 * 최초 접속 시 마스터 비밀번호 설정 (온보딩)
 */
router.post('/setup', (req, res) => {
    // 이미 초기 설정이 완료된 경우 차단
    if (config.isSetupCompleted()) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '초기 설정이 이미 완료되었습니다.'
        });
    }

    const { password } = req.body || {};

    if (!password || typeof password !== 'string' || password.trim().length < 4) {
        return res.status(400).json({
            error: 'Bad Request',
            message: '비밀번호를 4자 이상 입력해 주세요.'
        });
    }

    const trimmedPassword = password.trim();

    // 비밀번호 저장 및 환경 설정 갱신
    config.saveSetupPassword(trimmedPassword);

    const ip = getClientIp(req);
    recordLoginSuccess(ip);

    // 자동 로그인 토큰 발급 및 HttpOnly 쿠키 설정
    const token = issueToken({ role: 'admin' });

    res.cookie(config.COOKIE_NAME, token, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: config.COOKIE_MAX_AGE_MS,
        path: '/'
    });

    return res.json({
        success: true,
        message: '설정이 완료되었습니다.',
        user: { role: 'admin' }
    });
});

/**
 * POST /api/auth/login
 * 마스터 비밀번호 검증 및 무차별 대입 방어 적용
 */
router.post('/login', checkLockoutMiddleware, async (req, res) => {
    const ip = getClientIp(req);
    const { password } = req.body || {};

    if (!password || typeof password !== 'string') {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Password is required'
        });
    }

    // timingSafeEqual 기반 비밀번호 검증
    const isValid = verifyPasswordSafe(password, config.MASTER_PASSWORD);

    if (!isValid) {
        const failureResult = recordLoginFailure(ip);

        // 지수 백오프 딜레이 주입 (공격자의 초당 시도 차단)
        if (failureResult.delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, failureResult.delayMs));
        }

        // 5회 실패로 잠금 상태 진입 시 429 반환
        if (failureResult.isLocked) {
            res.set('Retry-After', String(failureResult.remainingLockSeconds));
            return res.status(429).json({
                error: 'Too Many Requests',
                message: `Account locked due to 5 consecutive failed attempts. Locked for 15 minutes.`,
                isLocked: true,
                remainingLockSeconds: failureResult.remainingLockSeconds
            });
        }

        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid master password.',
            isLocked: false,
            remainingAttempts: failureResult.remainingAttempts
        });
    }

    // 로그인 성공: IP 실패 카운트 리셋
    recordLoginSuccess(ip);

    // JWT 토큰 발급 및 HttpOnly 쿠키 설정
    const token = issueToken({ role: 'admin' });

    res.cookie(config.COOKIE_NAME, token, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: config.COOKIE_MAX_AGE_MS,
        path: '/'
    });

    return res.json({
        success: true,
        message: 'Login successful',
        user: { role: 'admin' }
    });
});

/**
 * POST /api/auth/logout
 * 쿠키 파기 및 로그아웃
 */
router.post('/logout', (req, res) => {
    res.clearCookie(config.COOKIE_NAME, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    return res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
