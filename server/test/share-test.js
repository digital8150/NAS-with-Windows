const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const {
    createShare,
    getShare,
    listShares,
    deleteShare,
    validateShareSubpath,
    listShareDirectory
} = require('../src/services/shareService');
const { app } = require('../src/index');
const config = require('../src/config');

const TEST_PORT = 3998;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runShareTests() {
    console.log('\n=========================================');
    console.log('🧪 Universal React NAS Folder Sharing Test Suite');
    console.log('=========================================');

    // 테스트용 임시 폴더 구조 생성
    const testBaseDir = path.resolve(__dirname, '../test-fixtures-share');
    const subDir1 = path.join(testBaseDir, 'subfolder1');
    const subDir2 = path.join(subDir1, 'deepfolder');
    
    if (fs.existsSync(testBaseDir)) {
        fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
    fs.mkdirSync(subDir2, { recursive: true });

    const file1 = path.join(testBaseDir, 'hello.txt');
    const file2 = path.join(subDir1, 'sub.txt');
    fs.writeFileSync(file1, 'Hello World shared text file!');
    fs.writeFileSync(file2, 'Subfolder file content');

    let createdShare = null;
    let serverInstance = null;

    try {
        // 1. Share Creation & Listing (Service Layer)
        console.log('\n--- 1. Share Creation & Listing Tests (Service) ---');
        createdShare = await createShare(testBaseDir, { expiresInDays: 7 });
        assert.ok(createdShare.id, 'Share ID should exist');
        assert.strictEqual(createdShare.folderPath, testBaseDir);
        assert.strictEqual(createdShare.folderName, 'test-fixtures-share');
        assert.ok(createdShare.expiresAt, 'ExpiresAt should be set');
        console.log('  ✅ PASS: Should create a share with 7-day expiration');

        const allShares = listShares();
        const found = allShares.find(s => s.id === createdShare.id);
        assert.ok(found, 'Created share should be listed in listShares');
        assert.strictEqual(found.isExpired, false);
        console.log('  ✅ PASS: Should list created share in listShares');

        // 2. Directory Listing & Subfolder Navigation (Service Layer)
        console.log('\n--- 2. Public Directory Listing Tests (Service) ---');
        const rootListing = await listShareDirectory(createdShare, '');
        assert.strictEqual(rootListing.shareId, createdShare.id);
        assert.strictEqual(rootListing.currentSubpath, '');
        assert.strictEqual(rootListing.breadcrumbs.length, 1);
        assert.strictEqual(rootListing.breadcrumbs[0].name, 'test-fixtures-share');
        
        const file1Item = rootListing.items.find(i => i.name === 'hello.txt');
        assert.ok(file1Item, 'hello.txt should be listed in root');
        assert.strictEqual(file1Item.category, 'document');

        const subfolderItem = rootListing.items.find(i => i.name === 'subfolder1');
        assert.ok(subfolderItem, 'subfolder1 should be listed in root');
        assert.strictEqual(subfolderItem.isDirectory, true);
        console.log('  ✅ PASS: Should list root directory items and categories');

        const subListing = await listShareDirectory(createdShare, 'subfolder1');
        assert.strictEqual(subListing.currentSubpath, 'subfolder1');
        assert.strictEqual(subListing.breadcrumbs.length, 2);
        assert.strictEqual(subListing.breadcrumbs[1].name, 'subfolder1');
        const subFileItem = subListing.items.find(i => i.name === 'sub.txt');
        assert.ok(subFileItem, 'sub.txt should be listed inside subfolder1');
        console.log('  ✅ PASS: Should navigate into subfolder and update breadcrumbs');

        // 3. Security & Path Traversal Protection
        console.log('\n--- 3. Path Traversal & Boundary Security Tests ---');
        assert.throws(() => {
            validateShareSubpath(createdShare, '../');
        }, (err) => {
            return err.statusCode === 403;
        }, 'Should block relative escape ../');
        console.log('  ✅ PASS: Should block ../ path traversal attempt with 403');

        assert.throws(() => {
            validateShareSubpath(createdShare, '..\\..\\Windows\\System32');
        }, (err) => {
            return err.statusCode === 403;
        }, 'Should block traversal to Windows/System32');
        console.log('  ✅ PASS: Should block deep traversal to Windows directory');

        assert.throws(() => {
            validateShareSubpath(createdShare, 'nonexistent_file.txt');
        }, (err) => {
            return err.statusCode === 404;
        }, 'Should return 404 for nonexistent file inside share');
        console.log('  ✅ PASS: Should return 404 for nonexistent file inside share');

        // 4. Expiration Logic Tests
        console.log('\n--- 4. Expiration Tests ---');
        const expiredShareObj = {
            id: 'expired-test-id',
            folderPath: testBaseDir,
            folderName: 'test',
            createdAt: new Date(Date.now() - 100000).toISOString(),
            expiresAt: new Date(Date.now() - 1000).toISOString()
        };
        const sharesFile = path.resolve(__dirname, '../data/shares.json');
        const curData = JSON.parse(fs.readFileSync(sharesFile, 'utf8'));
        curData.shares.push(expiredShareObj);
        fs.writeFileSync(sharesFile, JSON.stringify(curData, null, 2));

        assert.throws(() => {
            getShare('expired-test-id');
        }, (err) => {
            return err.statusCode === 410;
        }, 'Expired share should throw 410');
        console.log('  ✅ PASS: Expired share should throw 410');

        // 5. HTTP Endpoints Integration Tests (Express API)
        console.log('\n--- 5. HTTP Express API Integration Tests ---');
        serverInstance = await new Promise((resolve) => {
            const s = app.listen(TEST_PORT, () => resolve(s));
        });

        // 5.1 Admin route without login -> 401
        const resAdminUnauth = await fetch(`${BASE_URL}/api/shares`);
        assert.strictEqual(resAdminUnauth.status, 401, 'GET /api/shares without auth should be 401');
        console.log('  ✅ PASS: Admin share management requires authentication (401)');

        // 5.2 Public share view (NO login required!) -> 200
        const resPublicView = await fetch(`${BASE_URL}/api/shares/public/${createdShare.id}`);
        assert.strictEqual(resPublicView.status, 200, 'GET /api/shares/public/:id should succeed without auth');
        const dataPublicView = await resPublicView.json();
        assert.strictEqual(dataPublicView.success, true);
        assert.strictEqual(dataPublicView.folderName, 'test-fixtures-share');
        assert.ok(dataPublicView.items.length >= 2, 'Should return files in shared folder');
        console.log('  ✅ PASS: Public share directory view accessible without authentication');

        // 5.3 Public file download (NO login required!) -> 200
        const resPublicDownload = await fetch(`${BASE_URL}/api/shares/public/${createdShare.id}/download?subpath=hello.txt`);
        assert.strictEqual(resPublicDownload.status, 200);
        const downloadText = await resPublicDownload.text();
        assert.strictEqual(downloadText, 'Hello World shared text file!');
        console.log('  ✅ PASS: Public file download accessible and content verified');

        // 5.4 Public path traversal attempt via HTTP -> 403
        const resPublicAttack = await fetch(`${BASE_URL}/api/shares/public/${createdShare.id}?subpath=../../Windows`);
        assert.strictEqual(resPublicAttack.status, 403, 'Path traversal query should be 403');
        console.log('  ✅ PASS: Path traversal attempt over HTTP blocked with 403');

        // 5.5 Expired share over HTTP -> 410
        const resPublicExpired = await fetch(`${BASE_URL}/api/shares/public/expired-test-id`);
        assert.strictEqual(resPublicExpired.status, 410, 'Expired share should return 410');
        console.log('  ✅ PASS: Expired share over HTTP returned 410 Gone');

        // 6. Share Revocation Tests
        console.log('\n--- 6. Share Revocation Tests ---');
        deleteShare(createdShare.id);
        assert.throws(() => {
            getShare(createdShare.id);
        }, (err) => {
            return err.statusCode === 404;
        }, 'Revoked share should throw 404');
        console.log('  ✅ PASS: Revoked share should return 404');

        console.log('\n=========================================');
        console.log('🏁 All Share Service & API Tests Passed Successfully!');
        console.log('=========================================\n');
    } finally {
        if (serverInstance) {
            await new Promise((resolve) => serverInstance.close(resolve));
        }
        if (fs.existsSync(testBaseDir)) {
            try {
                fs.rmSync(testBaseDir, { recursive: true, force: true });
            } catch {}
        }
        // 테스트 생성 항목 정리
        try {
            const sharesFile = path.resolve(__dirname, '../data/shares.json');
            if (fs.existsSync(sharesFile)) {
                const curData = JSON.parse(fs.readFileSync(sharesFile, 'utf8'));
                curData.shares = curData.shares.filter(s => s.id !== 'expired-test-id' && (!createdShare || s.id !== createdShare.id));
                fs.writeFileSync(sharesFile, JSON.stringify(curData, null, 2));
            }
        } catch {}
    }
}

runShareTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
