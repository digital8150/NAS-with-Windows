const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { validateAndResolvePath } = require('../config/security');
const { findMatchingSubtitles } = require('./subtitleService');

const MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/mp4', // MKV 리먹싱 시 브라우저 서빙은 video/mp4
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg'
};

/**
 * ffprobe를 사용하여 미디어 파일의 스트림 정보(비디오, 오디오 트랙, 자막) 분석
 * @param {string} mediaPath
 * @returns {Promise<object>}
 */
function probeMedia(mediaPath) {
    return new Promise((resolve, reject) => {
        const safePath = validateAndResolvePath(mediaPath);

        const args = [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            safePath
        ];

        const ffprobe = spawn('ffprobe', args, { windowsHide: true });
        let stdoutData = '';
        let stderrData = '';

        ffprobe.stdout.on('data', chunk => {
            stdoutData += chunk.toString('utf8');
        });

        ffprobe.stderr.on('data', chunk => {
            stderrData += chunk.toString('utf8');
        });

        ffprobe.on('close', async code => {
            if (code !== 0) {
                return reject(new Error(`ffprobe failed with code ${code}: ${stderrData}`));
            }

            try {
                const parsed = JSON.parse(stdoutData);
                const streams = parsed.streams || [];
                const format = parsed.format || {};

                const videoStreams = [];
                const audioStreams = [];
                const embeddedSubtitles = [];

                // 브라우저에서 직접 재생 가능한 오디오 코덱
                const directAudioCodecs = ['aac', 'mp3', 'opus', 'vorbis', 'flac'];

                streams.forEach(stream => {
                    const codec = (stream.codec_name || '').toLowerCase();
                    const index = stream.index;
                    const tags = stream.tags || {};
                    const title = tags.title || tags.handler_name || `Track ${index}`;
                    const language = tags.language || 'und';

                    if (stream.codec_type === 'video') {
                        videoStreams.push({
                            index,
                            codec,
                            width: stream.width,
                            height: stream.height,
                            aspectRatio: stream.display_aspect_ratio || `${stream.width}:${stream.height}`,
                            fps: stream.r_frame_rate,
                            bitRate: stream.bit_rate ? parseInt(stream.bit_rate, 10) : null
                        });
                    } else if (stream.codec_type === 'audio') {
                        audioStreams.push({
                            index,
                            codec,
                            channels: stream.channels,
                            channelLayout: stream.channel_layout,
                            sampleRate: stream.sample_rate,
                            bitRate: stream.bit_rate ? parseInt(stream.bit_rate, 10) : null,
                            language,
                            title,
                            canDirectPlay: directAudioCodecs.includes(codec)
                        });
                    } else if (stream.codec_type === 'subtitle') {
                        embeddedSubtitles.push({
                            type: 'embedded',
                            index,
                            codec,
                            language,
                            title: `${title} (${language}) [Embedded]`
                        });
                    }
                });

                // 동일 폴더의 외부 자막 자동 매칭
                let externalSubtitles = [];
                try {
                    externalSubtitles = await findMatchingSubtitles(safePath);
                } catch {
                    // 자막 매칭 실패 시 빈 배열
                }

                resolve({
                    filename: path.basename(safePath),
                    path: safePath,
                    duration: parseFloat(format.duration) || 0,
                    size: parseInt(format.size, 10) || 0,
                    bitRate: parseInt(format.bit_rate, 10) || 0,
                    videoStreams,
                    audioStreams,
                    subtitles: [...embeddedSubtitles, ...externalSubtitles]
                });
            } catch (err) {
                reject(err);
            }
        });

        ffprobe.on('error', err => reject(err));
    });
}

/**
 * 대용량 비디오의 초고속 HTTP 206 Range 청크 스트리밍
 * @param {string} filePath
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function streamRangeFile(filePath, req, res) {
    const safePath = validateAndResolvePath(filePath);
    const stat = fs.statSync(safePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (range) {
        // Range: bytes=start-end 파싱
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1); // 최대 10MB 청크

        if (start >= fileSize) {
            res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
            return;
        }

        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(safePath, { start, end });

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        fileStream.pipe(res);
        req.on('close', () => {
            fileStream.destroy();
        });
    } else {
        // 전체 파일 서빙
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes'
        });
        const fileStream = fs.createReadStream(safePath);
        fileStream.pipe(res);
        req.on('close', () => {
            fileStream.destroy();
        });
    }
}

/**
 * FFmpeg 실시간 AAC 리먹싱 스트리밍
 * 비호환 다채널 오디오(DTS/AC3) 변환 및 다중 오디오 트랙 선택 재생, Seek 동기화
 * @param {string} filePath
 * @param {object} options
 * @param {number} [options.startTime=0] - Seek 시작 위치 (초)
 * @param {number|string} [options.audioIndex] - 오디오 스트림 인덱스
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function streamRemuxVideo(filePath, options = {}, req, res) {
    const safePath = validateAndResolvePath(filePath);
    const startTime = parseFloat(options.startTime) || 0;
    const audioIndex = options.audioIndex;

    const args = [
        '-loglevel', 'error', // 64KB 파이프 데드락 방지
    ];

    // 입력 전 -ss 적용 (초고속 키프레임 Seek)
    if (startTime > 0) {
        args.push('-ss', String(startTime));
    }

    args.push('-i', safePath);

    // 비디오 매핑: 첫 번째 비디오 스트림 복사
    args.push('-map', '0:v:0');
    args.push('-c:v', 'copy');
    args.push('-tag:v', 'hvc1'); // Apple Safari / Edge HEVC 호환 태그

    // 오디오 매핑 및 변환
    if (audioIndex !== undefined && audioIndex !== null && audioIndex !== '') {
        const audioMap = String(audioIndex).includes(':') ? audioIndex : `0:${audioIndex}`;
        args.push('-map', audioMap);
    } else {
        args.push('-map', '0:a:0?'); // 없으면 무시
    }

    // 오디오를 호환성 높은 스테레오 AAC 192k로 온더플라이 트랜스코딩
    args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');

    // 실시간 스트리밍 MP4 프래그먼트 플래그
    args.push(
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof+omit_tfhd_offset',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-f', 'mp4',
        'pipe:1'
    );

    res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache, no-store',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
    });

    const ffmpegProcess = spawn('ffmpeg', args, { windowsHide: true });

    // Windows 파이프 데드락 방지를 위한 stderr drain
    ffmpegProcess.stderr.on('data', chunk => {
        // 에러 로깅 필요 시 최소화
        const msg = chunk.toString('utf8');
        if (msg.includes('Error')) {
            console.error('[FFmpeg Remux Error]', msg.trim());
        }
    });

    // FFmpeg stdout을 Express Response 파이프로 실시간 전송
    ffmpegProcess.stdout.pipe(res);

    // 클라이언트가 탭을 닫거나 Seek/트랙 변경 시 프로세스 즉시 종료하여 리소스 보호
    const cleanup = () => {
        if (!ffmpegProcess.killed) {
            try {
                ffmpegProcess.kill('SIGKILL');
            } catch {
                // 이미 종료된 프로세스 무시
            }
        }
    };

    req.on('close', cleanup);
    req.on('end', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);

    ffmpegProcess.on('error', err => {
        console.error('[FFmpeg Process Error]', err);
        cleanup();
        if (!res.headersSent) {
            res.status(500).end();
        }
    });
}

module.exports = {
    MIME_TYPES,
    probeMedia,
    streamRangeFile,
    streamRemuxVideo
};
