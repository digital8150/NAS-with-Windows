const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const rootEnvPath = path.resolve(__dirname, '../../../.env');
const serverEnvPath = path.resolve(__dirname, '../../.env');
const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : (fs.existsSync(serverEnvPath) ? serverEnvPath : rootEnvPath);

const dataDir = path.resolve(__dirname, '../../data');
const settingsPath = path.resolve(dataDir, 'settings.json');

// .env 파일이 존재하면 로드 (루트 및 서버 디렉토리 모두 지원)
if (fs.existsSync(rootEnvPath)) {
    require('dotenv').config({ path: rootEnvPath });
}
if (fs.existsSync(serverEnvPath)) {
    require('dotenv').config({ path: serverEnvPath });
}

function readJsonSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const raw = fs.readFileSync(settingsPath, 'utf8');
            return JSON.parse(raw);
        }
    } catch {
        // ignore
    }
    return null;
}

function isSetupCompleted() {
    if (process.env.SETUP_COMPLETED === 'true') {
        return true;
    }
    const jsonSettings = readJsonSettings();
    if (jsonSettings && jsonSettings.setupCompleted === true) {
        return true;
    }
    for (const p of [rootEnvPath, serverEnvPath]) {
        if (fs.existsSync(p)) {
            try {
                const envContent = fs.readFileSync(p, 'utf8');
                if (/SETUP_COMPLETED\s*=\s*true/i.test(envContent)) {
                    return true;
                }
            } catch {
                // ignore
            }
        }
    }
    return false;
}

const initialJson = readJsonSettings();
let currentPassword = process.env.NAS_PASSWORD || (initialJson && initialJson.masterPassword) || 'admin1234';

const config = {
    PORT: process.env.PORT || 3001,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Auth & Security Config
    get MASTER_PASSWORD() {
        return currentPassword;
    },
    set MASTER_PASSWORD(val) {
        currentPassword = val;
    },
    JWT_SECRET: process.env.JWT_SECRET || 'nas-super-secret-jwt-key-change-in-production-2026',
    COOKIE_NAME: 'nas_token',
    COOKIE_MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
    
    // Brute-force protection rules
    LOCKOUT_THRESHOLD: 5, // 5 consecutive failures
    LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes (900 seconds)
    BACKOFF_BASE_MS: 500, // Exponential backoff base (500ms, 1000ms, 2000ms...)

    isSetupCompleted,
    saveSetupPassword(newPassword) {
        currentPassword = newPassword;
        process.env.NAS_PASSWORD = newPassword;
        process.env.SETUP_COMPLETED = 'true';

        // 1. data/settings.json 저장
        try {
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(settingsPath, JSON.stringify({
                setupCompleted: true,
                setupDate: new Date().toISOString()
            }, null, 2), 'utf8');
        } catch (e) {
            console.error('[Config] Failed to write settings.json:', e);
        }

        // 2. .env 파일 생성 또는 갱신 (루트 .env)
        try {
            let envLines = [];
            if (fs.existsSync(envPath)) {
                envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
            } else {
                envLines = [
                    '# Server Configuration',
                    `PORT=${config.PORT}`,
                    `CLIENT_ORIGIN=${config.CLIENT_ORIGIN}`,
                    'NODE_ENV=production',
                    '',
                    '# Authentication & Security'
                ];
            }

            let passFound = false;
            let setupFound = false;
            let secretFound = false;

            const updatedLines = envLines.map(line => {
                if (/^\s*NAS_PASSWORD\s*=/.test(line)) {
                    passFound = true;
                    return `NAS_PASSWORD=${newPassword}`;
                }
                if (/^\s*SETUP_COMPLETED\s*=/.test(line)) {
                    setupFound = true;
                    return 'SETUP_COMPLETED=true';
                }
                if (/^\s*JWT_SECRET\s*=/.test(line)) {
                    secretFound = true;
                    return line;
                }
                return line;
            });

            if (!passFound) updatedLines.push(`NAS_PASSWORD=${newPassword}`);
            if (!setupFound) updatedLines.push('SETUP_COMPLETED=true');
            if (!secretFound) {
                const randomSecret = crypto.randomBytes(32).toString('hex');
                updatedLines.push(`JWT_SECRET=${randomSecret}`);
                config.JWT_SECRET = randomSecret;
            }

            fs.writeFileSync(envPath, updatedLines.join('\n').trim() + '\n', 'utf8');
        } catch (e) {
            console.error('[Config] Failed to write .env:', e);
        }
    }
};

module.exports = config;
