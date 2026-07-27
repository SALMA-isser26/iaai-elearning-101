/**
 * VideoPlayer — lecteur vidéo pour les leçons e-learning
 *
 * Usage :
 *   <VideoPlayer
 *     src="https://..."
 *     poster="/thumbnails/module-1.jpg"
 *     title="Introduction à l'IA"
 *     onComplete={() => markLessonComplete(lessonId)}
 *   />
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const VideoPlayer = ({
  src,
  poster,
  title,
  onComplete,
  onProgress,
  className = '',
}) => {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimeout = useRef(null);

  const handlePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); } else { v.play(); }
  }, [playing]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const pct = (v.currentTime / v.duration) * 100;
    setCurrentTime(v.currentTime);
    setProgress(pct);
    onProgress?.(pct);
    if (pct >= 90 && !completed) {
      setCompleted(true);
      onComplete?.();
    }
  }, [completed, onComplete, onProgress]);

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
  };

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimeout.current);
    if (playing) {
      hideTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  useEffect(() => () => clearTimeout(hideTimeout.current), []);

  if (!src) {
    return (
      <div
        className={[
          'relative w-full bg-[#0d0d0d] rounded-xl overflow-hidden',
          'aspect-video flex items-center justify-center',
          className,
        ].join(' ')}
        aria-label={`Vidéo indisponible : ${title ?? ''}`}
      >
        <div className="text-center space-y-3 px-6">
          <span className="material-symbols-outlined text-[64px] text-white/20">
            videocam_off
          </span>
          <p className="text-white/50 text-sm font-medium">
            Vidéo bientôt disponible pour cette leçon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'relative w-full bg-black rounded-xl overflow-hidden group',
        'aspect-video',
        className,
      ].join(' ')}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      aria-label={`Lecteur vidéo : ${title ?? ''}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        className="w-full h-full object-contain"
        onPlay={() => { setPlaying(true); resetHideTimer(); }}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        aria-label={title}
        preload="metadata"
      />

      {!playing && !currentTime && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handlePlayPause}
            aria-label="Lancer la vidéo"
            className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}

      <div
        className={[
          'absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8',
          'bg-gradient-to-t from-black/60 to-transparent',
          'transition-opacity duration-300',
          showControls || !playing ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        <div
          className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-3 group/bar"
          onClick={handleSeek}
          role="slider"
          aria-label="Progression de la vidéo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full bg-white rounded-full relative group-hover/bar:scale-y-150 transition-transform origin-center"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            aria-label={playing ? 'Pause' : 'Lecture'}
            className="text-white hover:text-white/80 transition-colors"
          >
            {playing ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
            className="text-white hover:text-white/80 transition-colors"
          >
            {muted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          <span className="text-white/80 text-sm tabular-nums ml-1">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {completed && (
            <span className="ml-auto text-green-400 text-xs font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Complété
            </span>
          )}

          <button
            onClick={handleFullscreen}
            aria-label="Plein écran"
            className="text-white hover:text-white/80 transition-colors ml-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
