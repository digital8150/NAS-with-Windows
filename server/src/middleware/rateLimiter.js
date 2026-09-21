const config = require('../config');

/**
 * IP 기반 무차별 대입 공격(Brute-Force) 방어 저장소
 * Map<ip, { failedAttempts: number, lockedUntil: number, lastAttempt: number }>
 */
const ipStore = new Map();

// 10분마다 만료된 오래된 IP 레코드 정리
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipStore.entries()) {
        const isExpiredLock = data.lockedUntil && data.lockedUntil <= now;
        const isInactive = !data.lockedUntil && (now - data.lastAttempt > 30 * 60 * 1000);
        if (isExpiredLock || isInactive) {
            ipStore.delete(ip);
        }
    }
}, 10 * 60 * 1000).unref();

/**
 * 클라이언트 IP 주소 추출
 */
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * 특정 IP의 현재 보안 상태 확인
 * @param {string} ip
 * @returns {{ isLocked: boolean, remainingLockSeconds: number, failedAttempts: number, remainingAttempts: number }}
 */
function getIpSecurityStatus(ip) {
    const record = ipStore.get(ip);
    const now = Date.now();

    if (!record) {
        return {
            isLocked: false,
            remainingLockSeconds: 0,
            failedAttempts: 0,
            remainingAttempts: config.LOCKOUT_THRESHOLD
        };
    }

    if (record.lockedUntil && record.lockedUntil > now) {
        const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
        return {
            isLocked: true,
            remainingLockSeconds: remainingSeconds,
            failedAttempts: record.failedAttempts,
            remainingAttempts: 0
        };
    }

    // 만료된 잠금 해제
    if (record.lockedUntil && record.lockedUntil <= now) {
        ipStore.delete(ip);
        return {
            isLocked: false,
            remainingLockSeconds: 0,
            failedAttempts: 0,
            remainingAttempts: config.LOCKOUT_THRESHOLD
        };
    }

    const remainingAttempts = Math.max(0, config.LOCKOUT_THRESHOLD - record.failedAttempts);
    return {
        isLocked: false,
        remainingLockSeconds: 0,
        failedAttempts: record.failedAttempts,
        remainingAttempts
    };
}

/**
 * 로그인 실패 기록 및 지수 백오프/잠금 처리
 * @param {string} ip
 * @returns {{ isLocked: boolean, delayMs: number, remainingAttempts: number, remainingLockSeconds: number }}
 */
function recordLoginFailure(ip) {
    const now = Date.now();
    let record = ipStore.get(ip);

    if (!record) {
        record = { failedAttempts: 0, lockedUntil: null, lastAttempt: now };
        ipStore.set(ip, record);
    }

    record.failedAttempts += 1;
    record.lastAttempt = now;

    // 5회 이상 실패 시 15분 잠금 활성화
    if (record.failedAttempts >= config.LOCKOUT_THRESHOLD) {
        record.lockedUntil = now + config.LOCKOUT_DURATION_MS;
        const remainingLockSeconds = Math.ceil(config.LOCKOUT_DURATION_MS / 1000);
        return {
            isLocked: true,
            delayMs: 0,
            remainingAttempts: 0,
            remainingLockSeconds
        };
    }

    // 1~4회 실패 시 지수 백오프 딜레이 계산 (예: 1회=500ms, 2회=1000ms, 3회=2000ms, 4회=4000ms)
    const delayMs = config.BACKOFF_BASE_MS * Math.pow(2, record.failedAttempts - 1);
    const remainingAttempts = config.LOCKOUT_THRESHOLD - record.failedAttempts;

    return {
        isLocked: false,
        delayMs,
        remainingAttempts,
        remainingLockSeconds: 0
    };
}

/**
 * 로그인 성공 시 해당 IP 기록 초기화
 * @param {string} ip
 */
function recordLoginSuccess(ip) {
    ipStore.delete(ip);
}

/**
 * IP 잠금 여부를 검사하는 Express 미들웨어
 */
function checkLockoutMiddleware(req, res, next) {
    const ip = getClientIp(req);
    const status = getIpSecurityStatus(ip);

    if (status.isLocked) {
        res.set('Retry-After', String(status.remainingLockSeconds));
        return res.status(429).json({
            error: 'Too Many Requests',
            message: `Account locked due to multiple failed login attempts. Please try again in ${status.remainingLockSeconds} seconds.`,
            isLocked: true,
            remainingLockSeconds: status.remainingLockSeconds
        });
    }

    next();
}

module.exports = {
    getClientIp,
    getIpSecurityStatus,
    recordLoginFailure,
    recordLoginSuccess,
    checkLockoutMiddleware,
    _ipStore: ipStore // 테스트용 내부 참조
};
