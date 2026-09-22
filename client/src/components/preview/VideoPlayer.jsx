import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getMediaInfo, getViewStreamUrl, getSubtitleUrl } from '../../services/api';

export default function VideoPlayer({ item }) {
  const containerRef = useRef(null);
  const artRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useRemux, setUseRemux] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let artInstance = null;

    setLoading(true);
    setError(null);

    // 1. 미디어 스트림 및 자막 정보 비동기 탐색
    const initPlayer = async () => {
      let mediaInfo = {};
      let availableSubtitles = [];
      let audioStreams = [];

      try {
        const data = await getMediaInfo(item.path);
        if (!isMounted) return;
        mediaInfo = data.media || {};
        availableSubtitles = mediaInfo.subtitles || [];
        audioStreams = mediaInfo.audioStreams || [];
      } catch (probeErr) {
        console.warn('[VideoPlayer] 미디어 메타데이터 분석 실패 (직접 재생으로 대체):', probeErr.message);
        // 메타데이터 분석에 실패하더라도 기본 스트림으로 재생 시도
      }

      if (!isMounted || !containerRef.current) return;

      const initialVideoUrl = item.streamUrl || getViewStreamUrl(item.path, null, 0, useRemux);

      // 첫 번째 자막 결정
      const firstSub = availableSubtitles[0];
      let initialSubtitleUrl = '';
      if (firstSub) {
        initialSubtitleUrl = firstSub.type === 'embedded'
          ? getSubtitleUrl(item.path, 'embedded', firstSub.index)
          : getSubtitleUrl(firstSub.path, 'external');
      }

      // 자막 설정 메뉴
      const subtitleSettings = availableSubtitles.length > 0 ? [
        {
          width: 260,
          html: '자막',
          tooltip: firstSub ? (firstSub.title || firstSub.name || '자막 1') : '끄기',
          selector: [
            {
              default: !firstSub,
              html: '끄기',
              url: ''
            },
            ...availableSubtitles.map((sub, idx) => ({
              default: idx === 0,
              html: sub.title || sub.name || `자막 ${idx + 1}`,
              url: sub.type === 'embedded'
                ? getSubtitleUrl(item.path, 'embedded', sub.index)
                : getSubtitleUrl(sub.path, 'external'),
              type: 'srt'
            }))
          ],
          onSelect: function (subItem) {
            const player = this;
            if (!player || !player.subtitle) return subItem.html;
            if (subItem.url) {
              player.subtitle.switch(subItem.url, { name: subItem.html });
              player.subtitle.show = true;
            } else {
              player.subtitle.show = false;
            }
            return subItem.html;
          }
        }
      ] : [];

      // 다중 오디오 트랙 메뉴
      const audioSettings = audioStreams.length > 1 ? [
        {
          width: 260,
          html: '오디오 트랙',
          tooltip: audioStreams[0]?.title || `트랙 1`,
          selector: audioStreams.map((audio, idx) => ({
            default: idx === 0,
            html: audio.title
              ? `${audio.title} (${(audio.codec || '').toUpperCase()})`
              : `트랙 ${idx + 1} (${(audio.codec || '').toUpperCase()})`,
            index: audio.index
          })),
          onSelect: function (audioItem) {
            const player = this;
            if (!player) return audioItem.html;
            const currentPos = Math.floor(player.currentTime || 0);
            const newUrl = getViewStreamUrl(item.path, audioItem.index, currentPos, useRemux);
            player.switchUrl(newUrl);
            player.play();
            return audioItem.html;
          }
        }
      ] : [];

      // 2. Artplayer 안전 초기화
      try {
        if (artRef.current) {
          try {
            artRef.current.destroy(false);
          } catch {}
          artRef.current = null;
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        const artOptions = {
          container: containerRef.current,
          url: initialVideoUrl,
          volume: 0.75,
          isLive: false,
          muted: false,
          autoplay: false,
          pip: true,
          autoSize: false,
          autoMini: false,
          screenshot: true,
          setting: true,
          loop: false,
          flip: true,
          playbackRate: true,
          aspectRatio: true,
          fullscreen: true,
          fullscreenWeb: true,
          subtitleOffset: true,
          miniProgressBar: true,
          mutex: true,
          backdrop: true,
          playsInline: true,
          autoPlayback: true,
          theme: '#7F6DF2',
          lang: 'ko',
          moreVideoAttr: {
            crossOrigin: 'use-credentials',
          },
          subtitle: initialSubtitleUrl ? {
            url: initialSubtitleUrl,
            type: 'srt',
            encoding: 'utf-8',
            style: {
              color: '#FFFFFF',
              fontSize: '22px',
              fontFamily: 'Pretendard, sans-serif',
              textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)',
              fontWeight: '600'
            }
          } : {},
          settings: [
            ...subtitleSettings,
            ...audioSettings
          ]
        };

        artInstance = new Artplayer(artOptions);

        artInstance.on('video:error', () => {
          if (!isMounted) return;
          if (!useRemux) {
            // 브라우저 네이티브 재생 실패 시 자동 호환 리먹싱 모드로 재시도
            setUseRemux(true);
          } else {
            setError('영상을 재생할 수 없습니다. 브라우저에서 지원하지 않는 포맷입니다.');
          }
        });

        artRef.current = artInstance;
        setLoading(false);
      } catch (initErr) {
        if (!isMounted) return;
        console.error('[Artplayer Init Error]', initErr);
        setError(`플레이어 초기화에 실패했습니다: ${initErr.message}`);
        setLoading(false);
      }
    };

    initPlayer();

    return () => {
      isMounted = false;
      if (artInstance) {
        try {
          artInstance.destroy(false);
        } catch {}
        artInstance = null;
      }
      if (artRef.current) {
        try {
          artRef.current.destroy(false);
        } catch {}
        artRef.current = null;
      }
    };
  }, [item?.path, useRemux]);

  return (
    <div className="relative w-full aspect-video max-h-[75vh] bg-black rounded-xl overflow-hidden shadow-2xl">
      {/* Artplayer 컨테이너는 항상 DOM에 마운트되어 있어야 함 */}
      <div ref={containerRef} className="w-full h-full" />

      {/* 로딩 오버레이 */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#7F6DF2] mr-3" />
          <span className="text-[15px] font-medium text-neutral-300">영상을 준비하는 중...</span>
        </div>
      )}

      {/* 에러 오버레이 */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 text-white p-6 text-center">
          <AlertCircle className="h-10 w-10 text-[#E03E3E] mb-3" />
          <span className="text-[15px] font-medium text-neutral-200 mb-4">{error}</span>
          <button
            onClick={() => {
              setError(null);
              setUseRemux(prev => !prev);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#7F6DF2] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#6855dd]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>호환 모드로 다시 시도</span>
          </button>
        </div>
      )}
    </div>
  );
}
