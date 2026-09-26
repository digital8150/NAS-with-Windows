const assert = require('assert');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const CFB = require('cfb');

const { EXTENSION_CATEGORIES, getFileCategory } = require('../src/services/fileService');
const {
    RAW_EXTENSIONS,
    getPreviewImage,
    extractAiPdf,
    getExifData,
    parseHwpDocument
} = require('../src/services/previewService');
const { getThumbnail, normalizeThumbnailSize } = require('../src/services/thumbnailService');

async function runTests() {
    console.log('\n======================================================');
    console.log('🧪 Universal React NAS Preview Enhancement Test Suite');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}\n     Error: ${err.message}`);
            failed++;
        }
    }

    async function asyncTest(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}\n     Error: ${err.message}`);
            failed++;
        }
    }

    console.log('--- 1. File Extension & Category Classification Tests ---');
    test('Should constrain generated thumbnail dimensions', () => {
        assert.strictEqual(normalizeThumbnailSize(undefined), 480);
        assert.strictEqual(normalizeThumbnailSize(64), 128);
        assert.strictEqual(normalizeThumbnailSize(480), 480);
        assert.strictEqual(normalizeThumbnailSize(1200), 768);
    });
    test('Should classify RAW camera extensions as image category', () => {
        const rawExts = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef'];
        for (const ext of rawExts) {
            assert.strictEqual(getFileCategory(ext), 'image', `Failed for ${ext}`);
        }
    });

    test('Should classify PSD as image category', () => {
        assert.strictEqual(getFileCategory('.psd'), 'image');
    });

    test('Should classify Office, HWP(X), Markdown, and AI as document category', () => {
        const docExts = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.hwp', '.hwpx', '.md', '.markdown', '.ai'];
        for (const ext of docExts) {
            assert.strictEqual(getFileCategory(ext), 'document', `Failed for ${ext}`);
        }
    });

    console.log('\n--- 2. HWPX (ZIP/OWPML) Document Parsing Tests ---');
    await asyncTest('Should parse HWPX with PrvText.txt and section XML', async () => {
        const testZip = new JSZip();
        testZip.file('Preview/PrvText.txt', '대한민국 헌법 제1조 1항\n모든 국민은 법 앞에 평등하다.');
        testZip.file('Contents/section0.xml', '<hp:p><hp:t>대한민국 헌법</hp:t></hp:p><hp:p><hp:t>테스트 문서 본문입니다.</hp:t></hp:p>');
        
        const zipBuffer = await testZip.generateAsync({ type: 'nodebuffer' });
        const tempHwpx = path.join(__dirname, 'temp_test.hwpx');
        fs.writeFileSync(tempHwpx, zipBuffer);

        try {
            const res = await parseHwpDocument(tempHwpx);
            assert.strictEqual(res.type, 'hwpx');
            assert(res.text.includes('대한민국 헌법 제1조 1항'));
        } finally {
            if (fs.existsSync(tempHwpx)) fs.unlinkSync(tempHwpx);
        }
    });

    console.log('\n--- 3. HWP (CFBF/OLE) Document Parsing Tests ---');
    await asyncTest('Should parse HWP 5.0 with PrvText stream', async () => {
        const sampleText = '한글 HWP 5.0 미리보기 테스트 내용입니다.';
        const buf = Buffer.from(sampleText, 'utf16le');
        
        const cfb = CFB.utils.cfb_new();
        CFB.utils.cfb_add(cfb, '/PrvText', buf);
        const cfbBuffer = CFB.write(cfb, { type: 'buffer' });

        const tempHwp = path.join(__dirname, 'temp_test.hwp');
        fs.writeFileSync(tempHwp, cfbBuffer);

        try {
            const res = await parseHwpDocument(tempHwp);
            assert.strictEqual(res.type, 'hwp');
            assert.strictEqual(res.text, sampleText);
        } finally {
            if (fs.existsSync(tempHwp)) fs.unlinkSync(tempHwp);
        }
    });

    console.log('\n--- 4. Adobe Illustrator (AI) PDF Stream Extraction Tests ---');
    await asyncTest('Should extract PDF stream from AI file starting with %PDF-', async () => {
        const dummyPdf = '%PDF-1.5\n%Header\ntrailer\n%%EOF';
        const tempAi = path.join(__dirname, 'temp_test.ai');
        fs.writeFileSync(tempAi, dummyPdf);

        try {
            const pdfBuffer = await extractAiPdf(tempAi);
            assert(pdfBuffer !== null);
            assert.strictEqual(pdfBuffer.toString().substring(0, 5), '%PDF-');
        } finally {
            if (fs.existsSync(tempAi)) fs.unlinkSync(tempAi);
        }
    });

    await asyncTest('Should extract PDF stream from AI file with PostScript preamble', async () => {
        const preamble = '%!PS-Adobe-3.0\n%%Creator: Adobe Illustrator\n';
        const dummyPdf = '%PDF-1.6\n%IllustratorData\n%%EOF';
        const tempAi = path.join(__dirname, 'temp_preamble_test.ai');
        fs.writeFileSync(tempAi, preamble + dummyPdf);

        try {
            const pdfBuffer = await extractAiPdf(tempAi);
            assert(pdfBuffer !== null);
            assert.strictEqual(pdfBuffer.toString().substring(0, 5), '%PDF-');
        } finally {
            if (fs.existsSync(tempAi)) fs.unlinkSync(tempAi);
        }
    });

    console.log('\n--- 5. FFmpeg PSD / RAW Image Conversion Pipeline Tests ---');
    await asyncTest('Should convert synthetic image via FFmpeg image2pipe', async () => {
        // 1초짜리 단일 프레임 생성 후 테스트
        const tempBmp = path.join(__dirname, 'temp_test.bmp');
        const { execSync } = require('child_process');
        execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=320x240:d=1 -vframes 1 "${tempBmp}"`, { stdio: 'ignore' });

        try {
            const { getPreviewImage } = require('../src/services/previewService');
            // getPreviewImage는 지원 확장자에 대해 동작하므로 임시 TIFF 또는 DNG로 복사
            const tempTiff = path.join(__dirname, 'temp_test.tiff');
            fs.copyFileSync(tempBmp, tempTiff);

            const result = await getPreviewImage(tempTiff);
            assert.strictEqual(result.contentType, 'image/jpeg');
            assert(result.buffer.length > 0);

            // JPEG 매직 넘버 검증 (0xFF, 0xD8)
            assert.strictEqual(result.buffer[0], 0xFF);
            assert.strictEqual(result.buffer[1], 0xD8);

            const thumbnailPath = await getThumbnail(tempBmp, 320);
            const thumbnailBuffer = fs.readFileSync(thumbnailPath);
            assert(thumbnailBuffer.length > 0);
            assert.strictEqual(thumbnailBuffer[0], 0xFF);
            assert.strictEqual(thumbnailBuffer[1], 0xD8);
            fs.unlinkSync(thumbnailPath);

            fs.unlinkSync(tempTiff);
        } finally {
            if (fs.existsSync(tempBmp)) fs.unlinkSync(tempBmp);
        }
    });

    console.log('\n--- 6. Canon CR2 Real File Preview & EXIF Tests ---');
    await asyncTest('Should extract full-size JPEG and EXIF from actual Canon CR2 file if present', async () => {
        const sampleCr2Path = path.join('E:', '사진', '26년_도쿄', '100EOS5D', 'IMG_0156.CR2');
        if (!fs.existsSync(sampleCr2Path)) {
            console.log('     (Sample CR2 file not found in test environment, skipping real-file check)');
            return;
        }

        const previewResult = await getPreviewImage(sampleCr2Path);
        assert.strictEqual(previewResult.contentType, 'image/jpeg');
        assert(previewResult.buffer.length > 50000, 'CR2 preview buffer should be high quality (>50KB)');
        assert.strictEqual(previewResult.buffer[0], 0xFF);
        assert.strictEqual(previewResult.buffer[1], 0xD8);

        const exif = await getExifData(sampleCr2Path);
        assert(exif !== null);
        assert.strictEqual(exif.make, 'Canon');
        assert(exif.model.includes('EOS 5D'));
        console.log(`     Camera: ${exif.make} ${exif.model}, ISO: ${exif.iso}, Lens: ${exif.lens || 'N/A'}, Preview: ${(previewResult.buffer.length / 1024 / 1024).toFixed(2)} MB`);

        const thumbnailPath = await getThumbnail(sampleCr2Path, 480);
        assert(fs.existsSync(thumbnailPath));
        const thumbBuf = await fs.promises.readFile(thumbnailPath);
        assert(thumbBuf.length > 5000 && thumbBuf.length < 100000, `Thumbnail size should be lightweight (5KB-100KB), got: ${thumbBuf.length}B`);
        assert.strictEqual(thumbBuf[0], 0xFF);
        assert.strictEqual(thumbBuf[1], 0xD8);
        console.log(`     CR2 Thumbnail generated successfully: ${(thumbBuf.length / 1024).toFixed(1)} KB`);
    });

    console.log('\n======================================================');
    console.log(`🏁 Preview Enhancement Test Results: ${passed}/${passed + failed} Passed`);
    console.log('======================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
