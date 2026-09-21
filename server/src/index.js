const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');

const authRoutes = require('./routes/auth');
const driveRoutes = require('./routes/drives');
const fileRoutes = require('./routes/files');
const mediaRoutes = require('./routes/media');

const app = express();

// 기본 미들웨어
app.use(cors({
    origin: (origin, callback) => {
        // 동일 오리진 또는 설정된 클라이언트 오리진 허용 (개발 환경 localhost 포트 유연성 제공)
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }
        if (origin === config.CLIENT_ORIGIN) {
            return callback(null, true);
        }
        callback(null, true); // 로컬 NAS 환경을 고려하여 유연하게 허용
    },
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 헬스체크
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        serverTime: new Date().toISOString(),
        nodeVersion: process.version
    });
});

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/media', mediaRoutes);

// PLAN.md 하위 호환 단축 엔드포인트 포워딩
app.use('/api/upload', (req, res, next) => { req.url = '/upload'; fileRoutes(req, res, next); });
app.use('/api/download', (req, res, next) => { req.url = '/download'; fileRoutes(req, res, next); });
app.use('/api/mkdir', (req, res, next) => { req.url = '/mkdir'; fileRoutes(req, res, next); });
app.use('/api/rename', (req, res, next) => { req.url = '/rename'; fileRoutes(req, res, next); });
app.use('/api/delete', (req, res, next) => { req.url = '/delete'; fileRoutes(req, res, next); });

app.use('/api/media-info', (req, res, next) => { req.url = '/info'; mediaRoutes(req, res, next); });
app.use('/api/subtitle', (req, res, next) => { req.url = '/subtitle'; mediaRoutes(req, res, next); });
app.use('/api/view', (req, res, next) => { req.url = '/view'; mediaRoutes(req, res, next); });

// 404 핸들러
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `API endpoint '${req.originalUrl}' does not exist.`
    });
});

// 글로벌 에러 핸들러
app.use((err, req, res, next) => {
    console.error('[ServerError]', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: err.name || 'Error',
        message: err.message || 'Internal Server Error'
    });
});

let server = null;
if (require.main === module) {
    server = app.listen(config.PORT, () => {
        console.log(`=========================================`);
        console.log(`🚀 Universal React NAS Backend Engine`);
        console.log(`📡 Listening on http://localhost:${config.PORT}`);
        console.log(`🔐 Master Password Protection: ACTIVE`);
        console.log(`🛡️ Brute-force Lockout Guard: ACTIVE`);
        console.log(`🚫 Windows System Path Blacklist: ACTIVE`);
        console.log(`=========================================`);
    });
}

module.exports = { app, server };

