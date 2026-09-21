const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const exifr = require('exifr');
const JSZip = require('jszip');
const CFB = require('cfb');
const zlib = require('zlib');

/**
 * RAW 이미지 확장자 목록
 */
const RAW_EXTENSIONS = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef'];

/**
 * FFmpeg 프로세스를 실행하여 첫 번째 비디오/이미지 프레임을 MJPEG 버퍼로 변환
 * @param {string} filePath 
 * @param {number} timeoutMs
 * @returns {Promise<Buffer>}
 */
function convertToJpegViaFfmpeg(filePath, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const args = [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', filePath,
            '-vframes', '1',
            '-q:v', '2',
            '-f', 'image2pipe',
            '-vcodec', 'mjpeg',
            'pipe:1'
        ];

        const proc = spawn('ffmpeg', args, {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const chunks = [];
        let stderrData = '';

        const timer = setTimeout(() => {
            try {
                proc.kill('SIGKILL');
            } catch {}
            reject(new Error('Image conversion timed out'));
        }, timeoutMs);

        proc.stdout.on('data', (chunk) => {
            chunks.push(chunk);
        });

        proc.stderr.on('data', (chunk) => {
            stderrData += chunk.toString();
        });

        proc.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0 && chunks.length > 0) {
                resolve(Buffer.concat(chunks));
            } else {
                reject(new Error(`Conversion failed with exit code ${code}: ${stderrData.trim()}`));
            }
        });
    });
}

/**
 * RAW / PSD / AI 등 지원되지 않는 이미지 파일의 브라우저용 프리뷰 이미지 버퍼 생성
 * @param {string} filePath 
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
async function getPreviewImage(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    // 1. RAW 이미지 (CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2, PEF 등)
    if (RAW_EXTENSIONS.includes(ext)) {
        try {
            // A. 메타데이터 분석을 통한 고해상도 내장 프리뷰 탐색 (Canon IFD0 Strip, JpgFromRaw 등)
            const parsed = await exifr.parse(filePath, {
                tiff: true,
                mergeOutput: false
            });

            // Canon CR2 풀사이즈 고화질 JPEG (StripOffsets & StripByteCounts)
            if (parsed?.ifd0?.StripOffsets && parsed?.ifd0?.StripByteCounts) {
                const offset = parsed.ifd0.StripOffsets;
                const length = parsed.ifd0.StripByteCounts;
                if (length > 10000) {
                    const fd = await fs.promises.open(filePath, 'r');
                    const buf = Buffer.alloc(length);
                    await fd.read(buf, 0, length, offset);
                    await fd.close();
                    if (buf[0] === 0xff && buf[1] === 0xd8) {
                        return { buffer: buf, contentType: 'image/jpeg' };
                    }
                }
            }

            // B. exifr.thumbnail() 시도
            const thumbBuffer = await exifr.thumbnail(filePath);
            if (thumbBuffer && thumbBuffer.length > 0) {
                return {
                    buffer: Buffer.from(thumbBuffer),
                    contentType: 'image/jpeg'
                };
            }
        } catch {
            // 메타 파싱 실패 시 바이너리 스캔 및 fallback 진행
        }

        // C. 바이너리 JPEG 헤더 스캔 (RAW 앞부분 15MB 내의 고해상도 JPEG 블록 탐색)
        try {
            const stat = await fs.promises.stat(filePath);
            const scanSize = Math.min(15 * 1024 * 1024, stat.size);
            const fd = await fs.promises.open(filePath, 'r');
            const scanBuf = Buffer.alloc(scanSize);
            await fd.read(scanBuf, 0, scanSize, 0);
            await fd.close();

            const soi = Buffer.from([0xff, 0xd8]);
            const eoi = Buffer.from([0xff, 0xd9]);
            let startIndex = 0;

            while (startIndex < scanSize) {
                const sIdx = scanBuf.indexOf(soi, startIndex);
                if (sIdx === -1) break;
                const eIdx = scanBuf.indexOf(eoi, sIdx + 100);
                if (eIdx !== -1 && (eIdx - sIdx) > 50000) { // 50KB 이상 고품질 이미지
                    const imgBuf = scanBuf.subarray(sIdx, eIdx + 2);
                    return { buffer: imgBuf, contentType: 'image/jpeg' };
                }
                startIndex = sIdx + 2;
            }
        } catch {
            // 스캔 실패 시 FFmpeg 시도
        }

        // D. FFmpeg 디코딩 fallback (DNG 및 호환 RAW)
        try {
            const buffer = await convertToJpegViaFfmpeg(filePath);
            return {
                buffer,
                contentType: 'image/jpeg'
            };
        } catch (err) {
            throw new Error(`Failed to generate RAW preview: ${err.message}`);
        }
    }

    // 2. Photoshop PSD 파일
    if (ext === '.psd') {
        try {
            const buffer = await convertToJpegViaFfmpeg(filePath);
            return {
                buffer,
                contentType: 'image/jpeg'
            };
        } catch (err) {
            throw new Error(`Failed to generate PSD preview: ${err.message}`);
        }
    }

    // 3. Adobe Illustrator AI 파일
    if (ext === '.ai') {
        // AI 파일 내의 PDF 데이터 스트림 추출
        const pdfBuffer = await extractAiPdf(filePath);
        if (pdfBuffer) {
            // PDF 첫 페이지를 FFmpeg로 JPEG 변환 시도
            try {
                // 임시 버퍼 파이프 대신 파일 직접 ffmpeg 입력 시도
                const buffer = await convertToJpegViaFfmpeg(filePath);
                return {
                    buffer,
                    contentType: 'image/jpeg'
                };
            } catch {
                // 이미지 변환 실패 시 PDF 자체를 반환할 수 있도록 처리
                return {
                    buffer: pdfBuffer,
                    contentType: 'application/pdf'
                };
            }
        }
    }

    // 4. 기타 이미지 포맷 fallback (TIFF 등)
    if (ext === '.tiff' || ext === '.tif') {
        try {
            const buffer = await convertToJpegViaFfmpeg(filePath);
            return {
                buffer,
                contentType: 'image/jpeg'
            };
        } catch (err) {
            throw new Error(`Failed to convert TIFF image: ${err.message}`);
        }
    }

    throw new Error(`Unsupported preview format: ${ext}`);
}

/**
 * AI (Adobe Illustrator) 파일에서 내장 PDF 데이터 추출
 * @param {string} filePath 
 * @returns {Promise<Buffer|null>}
 */
async function extractAiPdf(filePath) {
    const fileBuffer = await fs.promises.readFile(filePath);
    
    // '%PDF-' 매직 넘버 검색 (0x25, 0x50, 0x44, 0x46, 0x2D)
    const pdfSignature = Buffer.from('%PDF-');
    const index = fileBuffer.indexOf(pdfSignature);
    
    if (index === -1) {
        return null;
    }
    
    if (index === 0) {
        return fileBuffer;
    }
    
    return fileBuffer.subarray(index);
}

/**
 * 이미지 / RAW 파일의 EXIF 촬영 메타데이터 추출
 * @param {string} filePath 
 * @returns {Promise<object>}
 */
async function getExifData(filePath) {
    try {
        const parsed = await exifr.parse(filePath, {
            tiff: true,
            exif: true,
            xmp: true,
            iptc: true,
            gps: true
        });

        if (!parsed) return null;

        // 조리개 F값 포맷팅 (예: 2.8 -> f/2.8)
        let aperture = parsed.FNumber ? `f/${parsed.FNumber}` : null;
        
        // 셔터스피드 포맷팅 (예: 0.004 -> 1/250s)
        let shutterSpeed = null;
        if (parsed.ExposureTime) {
            if (parsed.ExposureTime < 1) {
                shutterSpeed = `1/${Math.round(1 / parsed.ExposureTime)}s`;
            } else {
                shutterSpeed = `${parsed.ExposureTime}s`;
            }
        }

        // 초점거리 포맷팅
        let focalLength = parsed.FocalLength ? `${parsed.FocalLength}mm` : null;
        if (parsed.FocalLengthIn35mmFormat && parsed.FocalLengthIn35mmFormat !== parsed.FocalLength) {
            focalLength += ` (35mm 환산 ${parsed.FocalLengthIn35mmFormat}mm)`;
        }

        return {
            make: parsed.Make || null,
            model: parsed.Model || null,
            lens: parsed.LensModel || null,
            iso: parsed.ISO || parsed.PhotographicSensitivity || null,
            aperture,
            shutterSpeed,
            focalLength,
            dateTime: parsed.DateTimeOriginal ? new Date(parsed.DateTimeOriginal).toISOString() : null,
            width: parsed.ImageWidth || parsed.ExifImageWidth || null,
            height: parsed.ImageHeight || parsed.ExifImageHeight || null,
            exposureProgram: parsed.ExposureProgram || null,
            whiteBalance: parsed.WhiteBalance || null,
            meteringMode: parsed.MeteringMode || null
        };
    } catch {
        return null;
    }
}

/**
 * HWP / HWPX 파일의 미리보기 텍스트 및 메타 추출
 * @param {string} filePath 
 * @returns {Promise<{ title: string, text: string, type: 'hwpx'|'hwp' }>}
 */
async function parseHwpDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    // 1. HWPX (OWPML / ZIP 규격)
    if (ext === '.hwpx') {
        const fileBuffer = await fs.promises.readFile(filePath);
        const zip = await JSZip.loadAsync(fileBuffer);

        // A. 내장 미리보기 텍스트(Preview/PrvText.txt) 확인
        const prvTextEntry = zip.file('Preview/PrvText.txt') || zip.file('preview/prvtext.txt');
        if (prvTextEntry) {
            const rawPrvText = await prvTextEntry.async('string');
            if (rawPrvText && rawPrvText.trim().length > 0) {
                return {
                    title: fileName,
                    text: rawPrvText.trim(),
                    type: 'hwpx'
                };
            }
        }

        // B. 본문 XML (Contents/section0.xml, section1.xml 등) 파싱
        const sectionEntries = Object.keys(zip.files).filter(name => 
            name.toLowerCase().startsWith('contents/section') && name.endsWith('.xml')
        ).sort();

        let fullText = '';
        for (const secName of sectionEntries) {
            const secXml = await zip.file(secName).async('string');
            // <hp:t> 텍스트 태그 추출
            const paragraphs = secXml.split(/<hp:p\b[^>]*>/i);
            for (const p of paragraphs) {
                const textMatches = p.match(/<hp:t\b[^>]*>([\s\S]*?)<\/hp:t>/gi) || [];
                const pText = textMatches
                    .map(m => m.replace(/<[^>]+>/g, ''))
                    .join('')
                    .trim();
                if (pText) {
                    fullText += pText + '\n\n';
                }
            }
        }

        if (fullText.trim().length > 0) {
            return {
                title: fileName,
                text: fullText.trim(),
                type: 'hwpx'
            };
        }
    }

    // 2. HWP (HWP 5.0 CFBF / OLE 바이너리)
    if (ext === '.hwp') {
        const fileBuffer = await fs.promises.readFile(filePath);
        const cfb = CFB.read(fileBuffer, { type: 'buffer' });

        // A. PrvText 스트림 탐색 (UTF-16LE 텍스트)
        const prvTextEntry = cfb.FileIndex.find(f => f.name.toLowerCase() === 'prvtext');
        if (prvTextEntry && prvTextEntry.content) {
            const buf = Buffer.from(prvTextEntry.content);
            const text = buf.toString('utf16le').replace(/\0/g, '').trim();
            if (text.length > 0) {
                return {
                    title: fileName,
                    text,
                    type: 'hwp'
                };
            }
        }

        // B. BodyText/Section0 스트림 탐색 (zlib 압축 해제 후 텍스트 추출)
        const section0 = cfb.FileIndex.find(f => 
            f.name.toLowerCase().includes('section0')
        );

        if (section0 && section0.content) {
            try {
                const inflated = zlib.inflateRawSync(Buffer.from(section0.content));
                // HWP 레코드 구조에서 UTF-16LE 텍스트 추출
                const rawStr = inflated.toString('utf16le');
                // 인쇄 가능한 문자들 위주로 필터링
                const cleanText = rawStr
                    .replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .replace(/([^\s]+)\s{2,}/g, '$1\n')
                    .trim();

                if (cleanText.length > 20) {
                    return {
                        title: fileName,
                        text: cleanText,
                        type: 'hwp'
                    };
                }
            } catch {
                // 압축 해제 실패 시 계속
            }
        }
    }

    return {
        title: fileName,
        text: '문서의 미리보기를 추출할 수 없습니다.',
        type: ext.replace('.', '')
    };
}

module.exports = {
    RAW_EXTENSIONS,
    getPreviewImage,
    extractAiPdf,
    getExifData,
    parseHwpDocument
};
