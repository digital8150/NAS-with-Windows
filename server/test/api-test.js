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

        // --- Phase 2 API Tests ---
        const fs = require('fs');
        const path = require('path');
        const { execSync } = require('child_process');
        const testWorkspace = path.join(__dirname, 'api_workspace');
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
        fs.mkdirSync(testWorkspace, { recursive: true });

        // A. Blacklist Protection on GET /api/files
        console.log('\n8. Testing GET /api/files with Blacklisted path C:\\Windows (Should be 403) ...');
        const resBlacklist = await fetch(`${BASE_URL}/api/files?path=C:\\Windows`, {
            headers: { Cookie: sessionCookie }
        });
        assert.strictEqual(resBlacklist.status, 403);
        const dataBlacklist = await resBlacklist.json();
        assert.ok(dataBlacklist.message.includes('Protected System Resource'));
        console.log('   ✅ PASS: Blacklisted path correctly returned 403');

        // B. Create Folder via POST /api/mkdir
        console.log('\n9. Testing POST /api/mkdir ...');
        const resMkdir = await fetch(`${BASE_URL}/api/mkdir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: sessionCookie
            },
            body: JSON.stringify({
                path: testWorkspace,
                folderName: 'Movies'
            })
        });
        assert.strictEqual(resMkdir.status, 200);
        const dataMkdir = await resMkdir.json();
        assert.strictEqual(dataMkdir.success, true);
        assert.ok(fs.existsSync(path.join(testWorkspace, 'Movies')));
        console.log('   ✅ PASS: Folder created via API');

        // C. Create and List Files via GET /api/files
        const movieDir = path.join(testWorkspace, 'Movies');
        const sampleVideo = path.join(movieDir, 'sample.mp4');
        const sampleSmi = path.join(movieDir, 'sample.ko.smi');
        // 1초 테스트 영상 생성
        execSync(`ffmpeg -y -f lavfi -i testsrc=duration=1:size=160x120:rate=24 -f lavfi -i sine=frequency=440:duration=1 -c:v libx264 -c:a aac -b:a 64k "${sampleVideo}"`, { stdio: 'pipe' });
        fs.writeFileSync(sampleSmi, '<SAMI><BODY><SYNC Start=500><P Class=KRCC>자막 테스트</BODY></SAMI>');

        console.log('\n10. Testing GET /api/files for created directory ...');
        const resListFiles = await fetch(`${BASE_URL}/api/files?path=${encodeURIComponent(movieDir)}`, {
            headers: { Cookie: sessionCookie }
        });
        assert.strictEqual(resListFiles.status, 200);
        const dataListFiles = await resListFiles.json();
        assert.strictEqual(dataListFiles.success, true);
        assert.strictEqual(dataListFiles.items.length, 2);
        console.log(`   ✅ PASS: Directory listed with ${dataListFiles.items.length} items`);

        // D. Probe Media via GET /api/media-info
        console.log('\n11. Testing GET /api/media-info ...');
        const resMediaInfo = await fetch(`${BASE_URL}/api/media-info?path=${encodeURIComponent(sampleVideo)}`, {
            headers: { Cookie: sessionCookie }
        });
        assert.strictEqual(resMediaInfo.status, 200);
        const dataMediaInfo = await resMediaInfo.json();
        assert.strictEqual(dataMediaInfo.success, true);
        assert.strictEqual(dataMediaInfo.media.videoStreams.length, 1);
        assert.strictEqual(dataMediaInfo.media.subtitles.length, 1);
        assert.strictEqual(dataMediaInfo.media.subtitles[0].filename, 'sample.ko.smi');
        console.log('   ✅ PASS: ffprobe metadata and auto-matched external subtitle verified');

        // E. Subtitle conversion via GET /api/subtitle
        console.log('\n12. Testing GET /api/subtitle (SMI to SRT Conversion) ...');
        const resSubtitle = await fetch(`${BASE_URL}/api/subtitle?path=${encodeURIComponent(sampleSmi)}`, {
            headers: { Cookie: sessionCookie }
        });
        assert.strictEqual(resSubtitle.status, 200);
        const srtText = await resSubtitle.text();
        assert.ok(srtText.includes('00:00:00,500 -->'));
        assert.ok(srtText.includes('자막 테스트'));
        console.log('   ✅ PASS: SAMI automatically converted to SRT via API');

        // F. Video HTTP 206 Range Streaming via GET /api/view
        console.log('\n13. Testing GET /api/view (HTTP 206 Range Streaming) ...');
        const resStream = await fetch(`${BASE_URL}/api/view?path=${encodeURIComponent(sampleVideo)}`, {
            headers: {
                Cookie: sessionCookie,
                Range: 'bytes=0-100'
            }
        });
        assert.strictEqual(resStream.status, 206);
        assert.strictEqual(resStream.headers.get('accept-ranges'), 'bytes');
        assert.ok(resStream.headers.get('content-range').startsWith('bytes 0-100/'));
        const chunk = await resStream.arrayBuffer();
        assert.strictEqual(chunk.byteLength, 101);
        console.log('   ✅ PASS: HTTP 206 Range streaming header and chunk length verified');

        // G. File Download via GET /api/download
        console.log('\n14. Testing GET /api/download ...');
        const resDownload = await fetch(`${BASE_URL}/api/download?path=${encodeURIComponent(sampleVideo)}`, {
            headers: { Cookie: sessionCookie }
        });
        assert.strictEqual(resDownload.status, 200);
        assert.ok(resDownload.headers.get('content-disposition').includes('sample.mp4'));
        console.log('   ✅ PASS: File download response header verified');

        // H. Delete items via POST /api/delete
        console.log('\n15. Testing POST /api/delete ...');
        const resDelete = await fetch(`${BASE_URL}/api/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: sessionCookie
            },
            body: JSON.stringify({
                paths: [sampleVideo, sampleSmi]
            })
        });
        assert.strictEqual(resDelete.status, 200);
        const dataDelete = await resDelete.json();
        assert.strictEqual(dataDelete.deleted.length, 2);
        assert.strictEqual(fs.existsSync(sampleVideo), false);
        console.log('   ✅ PASS: File deletion via API verified');

        // Cleanup workspace
        try { fs.rmSync(testWorkspace, { recursive: true, force: true }); } catch {}

        // 16. Logout
        console.log('\n16. Testing POST /api/auth/logout ...');
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
