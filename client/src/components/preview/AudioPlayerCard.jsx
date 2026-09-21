import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Repeat,
  Music
} from 'lucide-react';
import { getViewStreamUrl } from '../../services/api';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function AudioPlayerCard({ item }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const audioUrl = getViewStreamUrl(item.path);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (!isLooping) setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [isLooping]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkip = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const audio = audioRef.current;
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if (audio) {
      audio.volume = newVol;
      if (newVol > 0 && isMuted) {
        audio.muted = false;
        setIsMuted(false);
      }
    }
  };

  const toggleLoop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !isLooping;
    setIsLooping(!isLooping);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#16161a] text-white rounded-2xl max-w-lg mx-auto w-full select-none shadow-2xl border border-neutral-800">
      <audio ref={audioRef} src={audioUrl} autoPlay={false} />

      {/* 1. 앨범 아트 / 비주얼라이저 원형 영역 */}
      <div className="relative mb-7 flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-tr from-[#27223e] to-[#7F6DF2]/30 border-2 border-[#7F6DF2]/40 shadow-inner">
        <div className={`flex h-24 w-24 items-center justify-center rounded-full bg-[#1c1c20] shadow-md ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
          <Music className="h-10 w-10 text-[#7F6DF2]" />
        </div>
      </div>

      {/* 2. 곡 정보 */}
      <div className="text-center w-full px-4 mb-6">
        <h3 className="text-lg font-bold text-white truncate" title={item.name}>
          {item.name}
        </h3>
        <p className="mt-1 text-[13px] text-neutral-400 font-mono">
          {item.sizeFormatted}
        </p>
      </div>

      {/* 3. 진행 시간 슬라이더 */}
      <div className="w-full space-y-1.5 mb-6">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.5"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 accent-[#7F6DF2] bg-neutral-700 rounded-lg cursor-pointer transition"
        />
        <div className="flex justify-between text-[13px] font-mono text-neutral-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 4. 재생 컨트롤 버튼 */}
      <div className="flex items-center justify-center gap-5 w-full mb-6">
        <button
          onClick={toggleLoop}
          className={`p-2 rounded-xl transition ${isLooping ? 'text-[#7F6DF2] bg-[#27223e]' : 'text-neutral-400 hover:text-white'}`}
          title={isLooping ? '반복 재생 켜짐' : '반복 재생 꺼짐'}
        >
          <Repeat className="h-5 w-5" />
        </button>

        <button
          onClick={() => handleSkip(-10)}
          className="p-2 text-neutral-300 hover:text-white transition"
          title="10초 뒤로"
        >
          <RotateCcw className="h-5 w-5" />
        </button>

        <button
          onClick={togglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7F6DF2] text-white transition hover:bg-[#6e5cdb] hover:scale-105 shadow-lg shadow-[#7F6DF2]/25"
          title={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-white" />
          ) : (
            <Play className="h-6 w-6 fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={() => handleSkip(10)}
          className="p-2 text-neutral-300 hover:text-white transition"
          title="10초 앞으로"
        >
          <RotateCw className="h-5 w-5" />
        </button>

        <button
          onClick={toggleMute}
          className={`p-2 rounded-xl transition ${isMuted ? 'text-red-400' : 'text-neutral-400 hover:text-white'}`}
          title={isMuted ? '음소거 해제' : '음소거'}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* 5. 볼륨 슬라이더 */}
      <div className="flex items-center gap-2.5 w-44">
        <Volume2 className="h-4 w-4 text-neutral-400 shrink-0" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-full h-1 accent-[#7F6DF2] bg-neutral-700 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
}
