import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import { Loader2, AlertCircle } from 'lucide-react';
import { getMediaInfo, getViewStreamUrl, getSubtitleUrl } from '../../services/api';

export default function VideoPlayer({ item }) {
  const containerRef = useRef(null);
  const artRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mediaInfo, setMediaInfo] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    // 1. 미디어 스트림 및 자막 정보 비동기 탐색
    getMediaInfo(item.path)
      .then((data) => {
        if (!isMounted) return;
        setMediaInfo(data.media || {});
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        // 탐색 실패 시에도 기본 스트리밍 URL로 시도
        console.warn('Media probe fallback:', err.message);
        setMediaInfo({ subtitles: [], audioStreams: [] });
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (artRef.current && artRef.current.destroy) {
        artRef.current.destroy(false);
        artRef.current = null;
      }
    };
  }, [item.path]);

  useEffect(() => {
    if (loading || !containerRef.current) return;

    const initialVideoUrl = getViewStreamUrl(item.path);

    // 자막 설정 준비
    const availableSubtitles = mediaInfo?.subtitles || [];
    const firstSub = availableSubtitles[0];
    let initialSubtitleUrl = '';
    if (firstSub) {
      initialSubtitleUrl = firstSub.type === 'embedded'
        ? getSubtitleUrl(item.path, 'embedded', firstSub.index)
        : getSubtitleUrl(firstSub.path, 'external');
    }

    // 자막 선택 메뉴 구성
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
          if (subItem.url) {
            art.subtitle.switch(subItem.url, { name: subItem.html });
            art.subtitle.show = true;
          } else {
            art.subtitle.show = false;
          }
          return subItem.html;
        }
      }
    ] : [];

    // 다중 오디오 트랙 메뉴 구성
    const audioStreams = mediaInfo?.audioStreams || [];
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
          const currentPos = Math.floor(art.currentTime);
          const newUrl = getViewStreamUrl(item.path, audioItem.index, currentPos);
          art.switchUrl(newUrl);
          art.play();
          return audioItem.html;
        }
      }
    ] : [];

    // 2. Artplayer 초기화
    const art = new Artplayer({
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
          textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)',
          fontWeight: '600'
        }
      } : undefined,
      settings: [
        ...subtitleSettings,
        ...audioSettings
      ]
    });

    // 재생 에러 핸들러
    art.on('error', (err) => {
      console.error('Artplayer playback error:', err);
    });

    artRef.current = art;

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
        artRef.current = null;
      }
    };
  }, [loading, mediaInfo, item.path]);

  if (loading) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center bg-black/90 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#7F6DF2] mr-3" />
        <span className="text-[15px] font-medium text-neutral-300">미디어를 준비하는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[450px] w-full flex-col items-center justify-center bg-black/90 text-white p-6">
        <AlertCircle className="h-10 w-10 text-[#E03E3E] mb-3" />
        <span className="text-[15px] font-medium text-neutral-200">{error}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video max-h-[75vh] bg-black rounded-xl overflow-hidden shadow-2xl">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
