const assert = require('assert');
const { app } = require('../src/index');

let serverInstance;
const PORT = 3999;
const BASE_URL = `http://localhost:${PORT}`;

async function runApiIntegrationTests() {
    console.log('\n=========================================');
    console.log('🌐 Universal React NAS API Integration Test');
    console.log('=========================================\n');

    // 포트 3999로 테스트 서버 구동
    serverInstance = await new Promise((resolve) => {
        const s = app.listen(PORT, () => resolve(s));
    });

    try {
        // 1. Health Check
        console.log('1. Testing GET /api/health ...');
        const resHealth = await fetch(`${BASE_URL}/api/health`);
        const dataHealth = await resHealth.json();
        assert.strictEqual(resHealth.status, 200);
        assert.strictEqual(dataHealth.status, 'ok');
        console.log('   ✅ PASS: Health check OK');

        // 2. Auth Status (Unauthenticated initially)
        console.log('\n2. Testing GET /api/auth/status (Initial) ...');
        const resStatus = await fetch(`${BASE_URL}/api/auth/status`);
        const dataStatus = await resStatus.json();
        assert.strictEqual(resStatus.status, 200);
        assert.strictEqual(dataStatus.authenticated, false);
        assert.strictEqual(dataStatus.security.isLocked, false);
        assert.strictEqual(dataStatus.security.remainingAttempts, 5);
        console.log('   ✅ PASS: Auth status initial state OK');

        // 3. Unauthorized access to /api/drives
        console.log('\n3. Testing GET /api/drives without cookie (Should be 401) ...');
        const resDrivesUnauth = await fetch(`${BASE_URL}/api/drives`);
        assert.strictEqual(resDrivesUnauth.status, 401);
        console.log('   ✅ PASS: 401 Unauthorized returned properly');

        // 4. Failed Login Attempt 1 (Wrong password)
        console.log('\n4. Testing POST /api/auth/login with wrong password ...');
        const resWrong = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'wrong-password' })
        });
        const dataWrong = await resWrong.json();
        assert.strictEqual(resWrong.status, 401);
        assert.strictEqual(dataWrong.isLocked, false);
        assert.strictEqual(dataWrong.remainingAttempts, 4);
        console.log('   ✅ PASS: 401 with remaining attempts: 4');

        // 5. Successful Login (Correct password: admin1234)
        console.log('\n5. Testing POST /api/auth/login with correct password ...');
        const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'admin1234' })
        });
        assert.strictEqual(resLogin.status, 200);
        const dataLogin = await resLogin.json();
        assert.strictEqual(dataLogin.success, true);

        // 쿠키 확인
        const setCookieHeader = resLogin.headers.get('set-cookie');
        assert.ok(setCookieHeader, 'Set-Cookie header must be present');
        assert.ok(setCookieHeader.includes('nas_token='), 'Cookie nas_token must be set');
        assert.ok(setCookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');
        console.log('   ✅ PASS: Login successful and HttpOnly cookie received');

        const sessionCookie = setCookieHeader.split(';')[0];

        // 6. Access /api/drives with Cookie
        console.log('\n6. Testing GET /api/drives with valid session cookie ...');
        const resDrivesAuth = await fetch(`${BASE_URL}/api/drives`, {
            headers: { Cookie: sessionCookie }
        });
        assert.strictEqual(resDrivesAuth.status, 200);
        const dataDrives = await resDrivesAuth.json();
        assert.strictEqual(dataDrives.success, true);
        assert.ok(Array.isArray(dataDrives.drives));
        assert.ok(dataDrives.drives.length >= 1);
        console.log(`   ✅ PASS: Successfully retrieved ${dataDrives.drives.length} drives:`);
        dataDrives.drives.forEach(d => {
            console.log(`      - [${d.id}:] ${d.label} | Total: ${d.totalFormatted} | Used: ${d.usedPercentage}%`);
        });

        // 7. Auth Status with Cookie
        console.log('\n7. Testing GET /api/auth/status with session cookie ...');
        const resStatusAuth = await fetch(`${BASE_URL}/api/auth/status`, {
            headers: { Cookie: sessionCookie }
        });
        const dataStatusAuth = await resStatusAuth.json();
        assert.strictEqual(dataStatusAuth.authenticated, true);
        assert.strictEqual(dataStatusAuth.user.role, 'admin');
        console.log('   ✅ PASS: Auth status reports authenticated: true');

        // 8. Logout
        console.log('\n8. Testing POST /api/auth/logout ...');
        const resLogout = await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { Cookie: sessionCookie }
        });
        assert.strictEqual(resLogout.status, 200);
        const logoutCookieHeader = resLogout.headers.get('set-cookie');
        assert.ok(logoutCookieHeader.includes('nas_token=;'), 'nas_token should be cleared');
        console.log('   ✅ PASS: Logout successful and cookie cleared');

        console.log('\n=========================================');
        console.log('🎉 ALL INTEGRATION TESTS PASSED!');
        console.log('=========================================\n');

    } finally {
        serverInstance.close();
        process.exit(0);
    }
}

runApiIntegrationTests().catch(err => {
    console.error('Integration test failed:', err);
    if (serverInstance) serverInstance.close();
    process.exit(1);
});
