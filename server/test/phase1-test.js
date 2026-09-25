const assert = require('assert');
const { validateAndResolvePath, isSystemProtectedPath, isWindows } = require('../src/config/security');
const {
    getIpSecurityStatus,
    recordLoginFailure,
    recordLoginSuccess,
    _ipStore
} = require('../src/middleware/rateLimiter');
const { verifyPasswordSafe, issueToken, verifyToken } = require('../src/middleware/auth');
const { getMountedDrives, formatBytes } = require('../src/services/driveService');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
    }
}

async function itAsync(name, fn) {
    totalTests++;
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
    }
}

async function runAllTests() {
    console.log('\n=========================================');
    console.log('🧪 Universal React NAS Phase 1 Test Suite');
    console.log('=========================================\n');

    console.log('--- 1. Windows System Exclusion & Path Security Tests ---');
    
    it('Should block C:\\Windows and its subdirectories', () => {
        assert.throws(() => validateAndResolvePath('C:\\Windows'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('C:\\Windows\\System32\\cmd.exe'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('c:/windows/notepad.exe'), /Protected System Resource/);
    });

    it('Should block Program Files and Program Files (x86)', () => {
        assert.throws(() => validateAndResolvePath('C:\\Program Files'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('C:\\Program Files (x86)\\test'), /Protected System Resource/);
    });

    it('Should block C:\\Users root, other profiles, and AppData while allowing standard libraries', () => {
        assert.throws(() => validateAndResolvePath('C:\\Users'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('C:\\Users\\Default'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('C:\\Users\\admin\\AppData\\Local'), /Protected System Resource/);
        // 표준 라이브러리(다운로드, 바탕화면 등)는 안전하게 허용
        const desktopPath = validateAndResolvePath('C:\\Users\\admin\\Desktop');
        assert(desktopPath.toLowerCase().includes('desktop'));
    });

    it('Should block System Volume Information and $Recycle.Bin on ANY drive', () => {
        assert.throws(() => validateAndResolvePath('C:\\$Recycle.Bin'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('D:\\$RECYCLE.BIN\\S-1-5-21'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('E:\\System Volume Information'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('F:\\System Volume Information\\WPSettings.dat'), /Protected System Resource/);
    });

    it('Should block swapfile.sys, pagefile.sys, hiberfil.sys, dumpstack.log.tmp', () => {
        assert.throws(() => validateAndResolvePath('C:\\pagefile.sys'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('D:\\hiberfil.sys'), /Protected System Resource/);
        assert.throws(() => validateAndResolvePath('C:\\dumpstack.log.tmp'), /Protected System Resource/);
    });

    it('Should block Path Traversal attempting to reach C:\\Windows from valid folder', () => {
        // C:\MyData\..\Windows\System32 -> resolves to C:\Windows\System32 -> blocked
        assert.throws(() => validateAndResolvePath('C:\\MyData\\..\\Windows\\System32'), /Protected System Resource/);
    });

    it('Should block relative path without valid drive letter or absolute path', () => {
        assert.throws(() => validateAndResolvePath('../../../etc/passwd'), /Invalid drive format/);
        if (isWindows) {
            assert.throws(() => validateAndResolvePath('/var/log/syslog'), /Invalid drive format/);
        } else {
            assert.throws(() => validateAndResolvePath('var/log/syslog'), /Invalid drive format/);
            assert.throws(() => validateAndResolvePath('/proc/version'), /Protected System Resource/);
            assert.throws(() => validateAndResolvePath('/etc/shadow'), /Protected System Resource/);
        }
    });

    it('Should allow safe custom paths on C:, D:, E:, F:', () => {
        const p1 = validateAndResolvePath('C:\\Media');
        assert.strictEqual(p1, 'C:\\Media');

        const p2 = validateAndResolvePath('D:\\Movies\\Action');
        assert.strictEqual(p2, 'D:\\Movies\\Action');

        const p3 = validateAndResolvePath('E:\\NAS_Storage');
        assert.strictEqual(p3, 'E:\\NAS_Storage');
    });

    console.log('\n--- 2. Brute-Force Rate Limiter & Lockout Tests ---');

    const testIp = '192.168.1.100';
    _ipStore.delete(testIp); // 초기화

    it('Should start with 0 failed attempts and 5 remaining attempts', () => {
        const status = getIpSecurityStatus(testIp);
        assert.strictEqual(status.isLocked, false);
        assert.strictEqual(status.failedAttempts, 0);
        assert.strictEqual(status.remainingAttempts, 5);
    });

    it('Should increase failed attempts and calculate exponential backoff delay', () => {
        const fail1 = recordLoginFailure(testIp);
        assert.strictEqual(fail1.isLocked, false);
        assert.strictEqual(fail1.remainingAttempts, 4);
        assert.strictEqual(fail1.delayMs, 500); // 500 * 2^0

        const fail2 = recordLoginFailure(testIp);
        assert.strictEqual(fail2.remainingAttempts, 3);
        assert.strictEqual(fail2.delayMs, 1000); // 500 * 2^1

        const fail3 = recordLoginFailure(testIp);
        assert.strictEqual(fail3.remainingAttempts, 2);
        assert.strictEqual(fail3.delayMs, 2000); // 500 * 2^2

        const fail4 = recordLoginFailure(testIp);
        assert.strictEqual(fail4.remainingAttempts, 1);
        assert.strictEqual(fail4.delayMs, 4000); // 500 * 2^3
    });

    it('Should trigger 15-minute lockout on 5th consecutive failure', () => {
        const fail5 = recordLoginFailure(testIp);
        assert.strictEqual(fail5.isLocked, true);
        assert.strictEqual(fail5.remainingAttempts, 0);
        assert.ok(fail5.remainingLockSeconds > 890 && fail5.remainingLockSeconds <= 900, 'Lockout should be ~900s');

        const status = getIpSecurityStatus(testIp);
        assert.strictEqual(status.isLocked, true);
        assert.strictEqual(status.remainingAttempts, 0);
        assert.ok(status.remainingLockSeconds > 0);
    });

    it('Should reset lock and counter on successful login', () => {
        recordLoginSuccess(testIp);
        const status = getIpSecurityStatus(testIp);
        assert.strictEqual(status.isLocked, false);
        assert.strictEqual(status.failedAttempts, 0);
        assert.strictEqual(status.remainingAttempts, 5);
    });

    console.log('\n--- 3. Timing-Safe Password & JWT Auth Tests ---');

    it('Should verify password correctly with verifyPasswordSafe', () => {
        const master = 'admin1234';
        assert.strictEqual(verifyPasswordSafe('admin1234', master), true);
        assert.strictEqual(verifyPasswordSafe('wrongpassword', master), false);
        assert.strictEqual(verifyPasswordSafe('admin123', master), false);
        assert.strictEqual(verifyPasswordSafe('', master), false);
        assert.strictEqual(verifyPasswordSafe(null, master), false);
    });

    it('Should issue valid JWT token and decode correctly', () => {
        const token = issueToken({ role: 'admin' });
        assert.ok(token && typeof token === 'string');

        const decoded = verifyToken(token);
        assert.ok(decoded);
        assert.strictEqual(decoded.role, 'admin');

        // 변조된 토큰 검증 실패 확인
        const tampered = token.slice(0, -5) + 'xxxxx';
        assert.strictEqual(verifyToken(tampered), null);
    });

    console.log('\n--- 4. Multi-Drive Discovery Service Tests ---');

    await itAsync('Should discover system drives and calculate capacity metrics', async () => {
        const drives = await getMountedDrives(true);
        assert.ok(Array.isArray(drives), 'Drives should be an array');
        assert.ok(drives.length >= 1, 'Should find at least 1 drive');

        console.log(`     Discovered ${drives.length} drives:`);
        drives.forEach(d => {
            console.log(`       - Drive [${d.id}:] "${d.label}" (${d.driveTypeDesc}, ${d.fileSystem}): Total: ${d.totalFormatted}, Free: ${d.freeFormatted}, Used: ${d.usedPercentage}%`);
            assert.ok(d.letter);
            assert.ok(d.mountPoint);
            assert.ok(typeof d.totalBytes === 'number');
            assert.ok(typeof d.freeBytes === 'number');
            assert.ok(typeof d.usedBytes === 'number');
            assert.ok(typeof d.usedPercentage === 'number');
            assert.ok(d.totalFormatted);
            assert.ok(d.freeFormatted);
        });

        if (isWindows) {
            const driveC = drives.find(d => d.id === 'C');
            assert.ok(driveC, 'Drive C must be present');
            assert.strictEqual(driveC.isSystemDrive, true);
        } else {
            const systemDrive = drives.find(d => d.isSystemDrive);
            assert.ok(systemDrive, 'Root system drive must be present on Linux');
            assert.strictEqual(systemDrive.mountPoint, '/');
        }
    });

    it('Should format bytes properly', () => {
        assert.strictEqual(formatBytes(0), '0 B');
        assert.strictEqual(formatBytes(1024), '1 KB');
        assert.strictEqual(formatBytes(1024 * 1024), '1 MB');
        assert.strictEqual(formatBytes(1024 * 1024 * 1024), '1 GB');
        assert.strictEqual(formatBytes(1024 * 1024 * 1024 * 1024), '1 TB');
    });

    console.log('\n=========================================');
    console.log(`🏁 Test Results: ${passedTests}/${totalTests} Passed`);
    console.log('=========================================\n');

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runAllTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
