const assert = require('assert');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const { execSync } = require('child_process');

const {
    msToSrtTime,
    cleanSubtitleText,
    smiContentToSrt,
    loadAndConvertSubtitle,
    parseSubtitleLanguage,
    findMatchingSubtitles
} = require('../src/services/subtitleService');

const {
    listDirectory,
    createFolder,
    renameItem,
    deleteItems,
    getFileDetails,
    getFileCategory
} = require('../src/services/fileService');

const { probeMedia } = require('../src/services/mediaService');

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

async function runPhase2Tests() {
    console.log('\n=========================================');
    console.log('🧪 Universal React NAS Phase 2 Test Suite');
    console.log('=========================================\n');

    const tempDir = path.join(__dirname, 'temp_phase2');
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        console.log('--- 1. SAMI (.smi) -> SRT Subtitle Converter Tests ---');

        it('Should format milliseconds to SRT timestamp properly', () => {
            assert.strictEqual(msToSrtTime(0), '00:00:00,000');
            assert.strictEqual(msToSrtTime(1500), '00:00:01,500');
            assert.strictEqual(msToSrtTime(65432), '00:01:05,432');
            assert.strictEqual(msToSrtTime(3661005), '01:01:01,005');
        });

        it('Should clean HTML tags and entities in subtitles', () => {
            const raw = '<font color=red>Hello</font><br>World &nbsp; &amp; &quot;Quote&quot;';
            const cleaned = cleanSubtitleText(raw);
            assert.strictEqual(cleaned, 'Hello\nWorld   & "Quote"');
        });

        it('Should parse SAMI content and convert to valid SRT', () => {
            const sampleSmi = `
            <SAMI>
            <BODY>
            <SYNC Start=1000><P Class=KRCC>첫 번째 자막입니다.<br>반갑습니다.
            <SYNC Start=3500><P Class=KRCC>&nbsp;
            <SYNC Start=4000><P Class=KRCC>두 번째 자막입니다.
            <SYNC Start=7000><P Class=KRCC>&nbsp;
            </BODY>
            </SAMI>
            `;
            const srt = smiContentToSrt(sampleSmi);
            assert.ok(srt.includes('00:00:01,000 --> 00:00:03,500'));
            assert.ok(srt.includes('첫 번째 자막입니다.\n반갑습니다.'));
            assert.ok(srt.includes('00:00:04,000 --> 00:00:07,000'));
            assert.ok(srt.includes('두 번째 자막입니다.'));
        });

        await itAsync('Should decode CP949/EUC-KR encoded .smi file and convert to UTF-8 SRT', async () => {
            const sampleSmiKorean = `
            <SAMI>
            <BODY>
            <SYNC Start=2000><P Class=KRCC>한국어 자막 인코딩 테스트입니다.
            <SYNC Start=5000><P Class=KRCC>&nbsp;
            </BODY>
            </SAMI>
            `;
            const encodedBuffer = iconv.encode(sampleSmiKorean, 'cp949');
            const smiFilePath = path.join(tempDir, 'korean_sample.smi');
            fs.writeFileSync(smiFilePath, encodedBuffer);

            const srtOutput = await loadAndConvertSubtitle(smiFilePath);
            assert.ok(srtOutput.includes('한국어 자막 인코딩 테스트입니다.'));
            assert.ok(srtOutput.includes('00:00:02,000 --> 00:00:05,000'));
        });

        it('Should parse subtitle language labels correctly', () => {
            const ko = parseSubtitleLanguage('Interstellar.2014.ko.srt');
            assert.strictEqual(ko.lang, 'ko');
            assert.ok(ko.label.includes('한국어'));

            const en = parseSubtitleLanguage('Inception.en.smi');
            assert.strictEqual(en.lang, 'en');

            const ja = parseSubtitleLanguage('Anime.japanese.srt');
            assert.strictEqual(ja.lang, 'ja');
        });

        await itAsync('Should discover matching external subtitles for video', async () => {
            const videoFile = path.join(tempDir, 'MyMovie.mp4');
            fs.writeFileSync(videoFile, 'dummy video');
            fs.writeFileSync(path.join(tempDir, 'MyMovie.ko.srt'), '1\n00:00:01,000 --> 00:00:02,000\n안녕\n');
            fs.writeFileSync(path.join(tempDir, 'MyMovie.en.smi'), '<SAMI><BODY><SYNC Start=1000>Hello</BODY></SAMI>');
            fs.writeFileSync(path.join(tempDir, 'OtherMovie.srt'), 'different subtitle');

            const matched = await findMatchingSubtitles(videoFile);
            assert.strictEqual(matched.length, 2);
            assert.ok(matched.some(s => s.filename === 'MyMovie.ko.srt'));
            assert.ok(matched.some(s => s.filename === 'MyMovie.en.smi'));
            assert.ok(!matched.some(s => s.filename === 'OtherMovie.srt'));
        });

        console.log('\n--- 2. File Management Service Tests ---');

        it('Should categorize extensions properly', () => {
            assert.strictEqual(getFileCategory('.mp4'), 'video');
            assert.strictEqual(getFileCategory('.mkv'), 'video');
            assert.strictEqual(getFileCategory('.mp3'), 'audio');
            assert.strictEqual(getFileCategory('.jpg'), 'image');
            assert.strictEqual(getFileCategory('.pdf'), 'document');
            assert.strictEqual(getFileCategory('.zip'), 'archive');
            assert.strictEqual(getFileCategory('.smi'), 'subtitle');
        });

        await itAsync('Should list directory items with stats and categories', async () => {
            const subDir = path.join(tempDir, 'FolderA');
            fs.mkdirSync(subDir);
            fs.writeFileSync(path.join(tempDir, 'sample.txt'), 'Hello NAS');

            const listing = await listDirectory(tempDir);
            assert.strictEqual(listing.currentPath, tempDir);
            assert.ok(listing.items.length >= 2);
            const folderItem = listing.items.find(i => i.name === 'FolderA');
            const fileItem = listing.items.find(i => i.name === 'sample.txt');

            assert.ok(folderItem && folderItem.isDirectory && folderItem.category === 'folder');
            assert.ok(fileItem && !fileItem.isDirectory && fileItem.category === 'document');
            assert.strictEqual(fileItem.size, 9);
        });

        await itAsync('Should create new folder with validation', async () => {
            const created = await createFolder(tempDir, 'NewAlbum');
            assert.ok(fs.existsSync(created));
            assert.strictEqual(path.basename(created), 'NewAlbum');

            // 중복 생성 차단
            await assert.rejects(async () => {
                await createFolder(tempDir, 'NewAlbum');
            }, /already exists/);

            // 잘못된 문자 차단
            await assert.rejects(async () => {
                await createFolder(tempDir, 'Invalid:Name*');
            }, /invalid characters/);
        });

        await itAsync('Should rename file or folder', async () => {
            const originalFile = path.join(tempDir, 'sample.txt');
            const renamedPath = await renameItem(originalFile, 'renamed.txt');
            assert.ok(fs.existsSync(renamedPath));
            assert.ok(!fs.existsSync(originalFile));
        });

        await itAsync('Should get single file details', async () => {
            const target = path.join(tempDir, 'renamed.txt');
            const details = await getFileDetails(target);
            assert.strictEqual(details.name, 'renamed.txt');
            assert.strictEqual(details.size, 9);
            assert.strictEqual(details.category, 'document');
            assert.strictEqual(details.isDirectory, false);
        });

        await itAsync('Should delete items safely', async () => {
            const target = path.join(tempDir, 'renamed.txt');
            const result = await deleteItems(target);
            assert.strictEqual(result.deleted.length, 1);
            assert.strictEqual(fs.existsSync(target), false);
        });

        console.log('\n--- 3. FFmpeg Media Probe & Streaming Diagnostics ---');

        const testVideoPath = path.join(tempDir, 'test_media.mp4');
        it('Should generate a 1-second synthetic MP4 video via FFmpeg', () => {
            // 1초 길이의 H.264 + AAC 비디오 생성
            const genCmd = `ffmpeg -y -f lavfi -i testsrc=duration=1:size=320x240:rate=24 -f lavfi -i sine=frequency=440:duration=1 -c:v libx264 -c:a aac -b:a 64k "${testVideoPath}"`;
            execSync(genCmd, { stdio: 'pipe' });
            assert.ok(fs.existsSync(testVideoPath));
        });

        await itAsync('Should probe generated video via ffprobe', async () => {
            const metadata = await probeMedia(testVideoPath);
            assert.strictEqual(metadata.filename, 'test_media.mp4');
            assert.ok(metadata.duration > 0.8 && metadata.duration < 1.5, 'Duration should be ~1s');
            assert.strictEqual(metadata.videoStreams.length, 1);
            assert.strictEqual(metadata.videoStreams[0].codec, 'h264');
            assert.strictEqual(metadata.videoStreams[0].width, 320);
            assert.strictEqual(metadata.videoStreams[0].height, 240);

            assert.strictEqual(metadata.audioStreams.length, 1);
            assert.strictEqual(metadata.audioStreams[0].codec, 'aac');
            assert.strictEqual(metadata.audioStreams[0].canDirectPlay, true);
        });

        console.log('\n=========================================');
        console.log(`🏁 Phase 2 Test Results: ${passedTests}/${totalTests} Passed`);
        console.log('=========================================\n');

    } finally {
        // 임시 폴더 정리
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch {
            // 무시
        }
    }

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runPhase2Tests().catch(err => {
    console.error('Phase 2 test failed:', err);
    process.exit(1);
});
