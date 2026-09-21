import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import { Loader2, AlertCircle } from 'lucide-react';
import { getMediaInfo, getViewStreamUrl, getSubtitleUrl } from '../../services/api';

export default function VideoPlayer({ item }) {
  const containerRef = useRef(null);
  const artRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let artInstance = null;

    setLoading(true);
    setError(null);

    // 1. 미디어 스트림 및 자막 정보 비동기 탐색
    getMediaInfo(item.path)
      .then((data) => {
        if (!isMounted || !containerRef.current) return;

        const mediaInfo = data.media || {};
        const availableSubtitles = mediaInfo.subtitles || [];
        const audioStreams = mediaInfo.audioStreams || [];

        const initialVideoUrl = getViewStreamUrl(item.path);

        // 첫 번째 자막 URL 결정
        const firstSub = availableSubtitles[0];
        let initialSubtitleUrl = '';
        if (firstSub) {
          initialSubtitleUrl = firstSub.type === 'embedded'
            ? getSubtitleUrl(item.path, 'embedded', firstSub.index)
            : getSubtitleUrl(firstSub.path, 'external');
        }

        // 자막 메뉴 구성
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

        // 다중 오디오 트랙 메뉴 구성
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
              const newUrl = getViewStreamUrl(item.path, audioItem.index, currentPos);
              player.switchUrl(newUrl);
              player.play();
              return audioItem.html;
            }
          }
        ] : [];

        // 2. Artplayer 초기화 (try/catch 보호)
        try {
          // 기존 인스턴스 정리
          if (artRef.current && artRef.current.destroy) {
            artRef.current.destroy(false);
            artRef.current = null;
          }

          artInstance = new Artplayer({
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
              crossOrigin: 'anonymous',
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
            } : undefined,
            settings: [
              ...subtitleSettings,
              ...audioSettings
            ]
          });

          artInstance.on('error', (err) => {
            console.error('[Artplayer Error]', err);
          });

          artRef.current = artInstance;
          setLoading(false);
        } catch (initErr) {
          console.error('[Artplayer Init Error]', initErr);
          setError(`플레이어 초기화에 실패했습니다: ${initErr.message}`);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[Media Probe Error]', err);
        setError(`동영상 정보를 읽어오지 못했습니다: ${err.message}`);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (artInstance && artInstance.destroy) {
        artInstance.destroy(false);
        artInstance = null;
      }
      if (artRef.current && artRef.current.destroy) {
        artRef.current.destroy(false);
        artRef.current = null;
      }
    };
  }, [item.path]);

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
          <span className="text-[15px] font-medium text-neutral-200 mb-2">{error}</span>
        </div>
      )}
    </div>
  );
}
