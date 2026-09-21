const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const chardet = require('chardet');
const { spawn } = require('child_process');
const { validateAndResolvePath } = require('../config/security');

/**
 * 밀리초(ms)를 SRT 타임코드 포맷 (HH:MM:SS,mmm)으로 변환
 * @param {number} ms
 * @returns {string}
 */
function msToSrtTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = Math.max(0, Math.floor(ms % 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n, width = 2) => String(n).padStart(width, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/**
 * HTML 엔티티 및 자막 불필요 태그 정리
 * @param {string} text
 * @returns {string}
 */
function cleanSubtitleText(text) {
    if (!text) return '';
    let cleaned = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&quot;/gi, '"')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '')
        .replace(/<font[^>]*>/gi, '')
        .replace(/<\/font>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();

    return cleaned;
}

/**
 * SAMI(.smi) 파일 내용을 표준 SRT 텍스트로 변환
 * @param {string} smiContent
 * @returns {string} SRT 포맷 문자열
 */
function smiContentToSrt(smiContent) {
    if (!smiContent) return '';

    // <SYNC Start=숫자> 패턴 매칭
    const syncRegex = /<SYNC\s+Start\s*=\s*['"]?(\d+)['"]?[^>]*>([\s\S]*?)(?=(?:<SYNC|\s*<\/BODY>|\s*<\/SAMI>|$))/gi;
    const cues = [];
    let match;

    while ((match = syncRegex.exec(smiContent)) !== null) {
        const startTime = parseInt(match[1], 10);
        const rawContent = match[2] || '';
        const text = cleanSubtitleText(rawContent);

        cues.push({
            start: startTime,
            text
        });
    }

    if (cues.length === 0) {
        return '';
    }

    const srtBlocks = [];
    let srtIndex = 1;

    for (let i = 0; i < cues.length; i++) {
        const current = cues[i];
        if (!current.text) {
            // 빈 자막(싱크 종료 태그 역할)은 건너뜀
            continue;
        }

        // 종료 시간 결정: 다음 큐의 시작 시간 또는 기본 3초 뒤
        let endTime = current.start + 3000;
        if (i + 1 < cues.length) {
            endTime = cues[i + 1].start;
            // 만약 다음 큐가 바로 붙어있거나 너무 길면 적절히 조정
            if (endTime <= current.start) {
                endTime = current.start + 2000;
            } else if (endTime - current.start > 8000) {
                endTime = current.start + 5000;
            }
        }

        const startFormatted = msToSrtTime(current.start);
        const endFormatted = msToSrtTime(endTime);

        srtBlocks.push(`${srtIndex}\n${startFormatted} --> ${endFormatted}\n${current.text}\n`);
        srtIndex++;
    }

    return srtBlocks.join('\n');
}

/**
 * 자막 파일(SRT 또는 SMI)을 읽어서 UTF-8 SRT 문자열로 반환 (EUC-KR 자동 감지 변환)
 * @param {string} subtitlePath
 * @returns {Promise<string>}
 */
async function loadAndConvertSubtitle(subtitlePath) {
    const safePath = validateAndResolvePath(subtitlePath);
    const buffer = await fs.promises.readFile(safePath);

    // 인코딩 감지
    let detectedEncoding = chardet.detect(buffer) || 'UTF-8';
    let content = '';

    // 한국어 Windows 특화 인코딩 판별
    const upperEnc = detectedEncoding.toUpperCase();
    if (upperEnc.includes('EUC-KR') || upperEnc.includes('CP949') || upperEnc.includes('WINDOWS-949') || upperEnc.includes('ISO-2022-KR')) {
        content = iconv.decode(buffer, 'cp949');
    } else if (upperEnc.includes('UTF-16') || upperEnc.includes('UCS-2')) {
        content = iconv.decode(buffer, 'utf16-le');
    } else {
        // UTF-8 검증
        try {
            content = buffer.toString('utf8');
            // 만약 깨진 문자가 보이고 CP949 디코딩이 더 타당한지 검사
            if (content.includes('')) {
                const cp949Try = iconv.decode(buffer, 'cp949');
                if (!cp949Try.includes('')) {
                    content = cp949Try;
                }
            }
        } catch {
            content = iconv.decode(buffer, 'cp949');
        }
    }

    const ext = path.extname(safePath).toLowerCase();
    if (ext === '.smi') {
        return smiContentToSrt(content);
    }

    // 이미 SRT인 경우 UTF-8 텍스트 그대로 반환
    return content;
}

/**
 * 자막 언어 코드 및 한글 라벨 유추
 * @param {string} filename
 * @returns {{ lang: string, label: string }}
 */
function parseSubtitleLanguage(filename) {
    const lower = filename.toLowerCase();
    if (/\.(ko|kr|kor|korean)\./.test(lower) || /한국어|한글/.test(lower)) {
        return { lang: 'ko', label: '한국어 (Korean)' };
    }
    if (/\.(en|eng|english)\./.test(lower)) {
        return { lang: 'en', label: 'English' };
    }
    if (/\.(ja|jp|jpn|japanese)\./.test(lower) || /일본어/.test(lower)) {
        return { lang: 'ja', label: '日本語 (Japanese)' };
    }
    if (/\.(zh|chi|chinese|chs|cht)\./.test(lower) || /중국어/.test(lower)) {
        return { lang: 'zh', label: '中文 (Chinese)' };
    }
    if (/\.(es|spa|spanish)\./.test(lower)) {
        return { lang: 'es', label: 'Español' };
    }
    if (/\.(fr|fre|french)\./.test(lower)) {
        return { lang: 'fr', label: 'Français' };
    }
    return { lang: 'und', label: '기본 자막 (Default)' };
}

/**
 * 특정 비디오 파일과 매칭되는 외부 자막 파일들을 검색
 * @param {string} videoPath
 * @returns {Promise<Array>}
 */
async function findMatchingSubtitles(videoPath) {
    const safeVideoPath = validateAndResolvePath(videoPath);
    const dir = path.dirname(safeVideoPath);
    const videoExt = path.extname(safeVideoPath);
    const videoBase = path.basename(safeVideoPath, videoExt);

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const subtitles = [];

    const allowedSubtitleExts = ['.srt', '.smi', '.vtt'];

    for (const entry of entries) {
        if (!entry.isFile()) continue;

        const subExt = path.extname(entry.name).toLowerCase();
        if (!allowedSubtitleExts.includes(subExt)) continue;

        const subBase = path.basename(entry.name, subExt);

        // 비디오 파일명으로 시작하거나 완전히 일치하는 자막 파일 매칭
        // 예: Video.mp4 -> Video.srt, Video.ko.smi, Video_eng.srt
        if (subBase.toLowerCase().startsWith(videoBase.toLowerCase())) {
            const { lang, label } = parseSubtitleLanguage(entry.name);
            subtitles.push({
                type: 'external',
                path: path.join(dir, entry.name),
                filename: entry.name,
                format: subExt.substring(1),
                lang,
                label: `${label} [${subExt.substring(1).toUpperCase()}]`
            });
        }
    }

    return subtitles;
}

/**
 * MKV / MP4 등의 내장 자막 스트림을 FFmpeg 파이프를 통해 실시간 SRT로 추출
 * @param {string} videoPath
 * @param {number|string} streamIndex - 예: '0:s:0' 또는 '2'
 * @returns {Promise<string>}
 */
function extractEmbeddedSubtitle(videoPath, streamIndex) {
    return new Promise((resolve, reject) => {
        const safePath = validateAndResolvePath(videoPath);
        const mapArg = String(streamIndex).includes(':') ? streamIndex : `0:${streamIndex}`;

        const args = [
            '-loglevel', 'error',
            '-i', safePath,
            '-map', mapArg,
            '-f', 'srt',
            'pipe:1'
        ];

        const ffmpeg = spawn('ffmpeg', args, { windowsHide: true });
        let srtData = '';
        let errData = '';

        ffmpeg.stdout.on('data', chunk => {
            srtData += chunk.toString('utf8');
        });

        ffmpeg.stderr.on('data', chunk => {
            errData += chunk.toString('utf8');
        });

        ffmpeg.on('close', code => {
            if (code === 0 && srtData.trim()) {
                resolve(srtData);
            } else {
                reject(new Error(`Failed to extract embedded subtitle: ${errData || `Exit code ${code}`}`));
            }
        });

        ffmpeg.on('error', err => {
            reject(err);
        });
    });
}

module.exports = {
    msToSrtTime,
    cleanSubtitleText,
    smiContentToSrt,
    loadAndConvertSubtitle,
    parseSubtitleLanguage,
    findMatchingSubtitles,
    extractEmbeddedSubtitle
};
