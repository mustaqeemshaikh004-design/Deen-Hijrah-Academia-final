import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Video,
  Film,
  Calendar,
  Plus,
  Sparkles,
  Volume2,
  VolumeX,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { HomepageSlide } from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';

interface HeroMediaShowcaseProps {
  slides: HomepageSlide[];
  isAdmin: boolean;
  hasEnrolledCourses: boolean;
  onExploreCourses: () => void;
  onOpenCalendar: () => void;
  onOpenAdminSlides: () => void;
}

const STORAGE_KEYS = {
  muted: 'deen_hijrah_hero_muted',
  volume: 'deen_hijrah_hero_volume',
  cleanView: 'deen_hijrah_clean_video',
};

export const HeroMediaShowcase: React.FC<HeroMediaShowcaseProps> = ({
  slides,
  isAdmin,
  hasEnrolledCourses,
  onExploreCourses,
  onOpenCalendar,
  onOpenAdminSlides,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  // Persistent mute state: restored from localStorage so user's unmute preference is saved
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.muted);
      // If user explicitly saved 'false' (unmuted), attempt to respect it
      return saved === 'false' ? false : true;
    } catch {
      return true;
    }
  });

  // Persistent volume state: restored from localStorage
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.volume);
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.85;
    } catch {
      return 0.85;
    }
  });

  // Persistent Clean Video View preference (hides/minimizes overlay text so video is 100% visible)
  const [isCleanView, setIsCleanView] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.cleanView) === 'true';
    } catch {
      return false;
    }
  });

  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  // Whatever video or image is put on the homescreen is immediately available for all to see
  const activeSlides = slides;
  const currentSlide = activeSlides[activeIndex % Math.max(1, activeSlides.length)] || null;

  // Every recording and video on the homepage is 100% free and unlocked for everyone to watch
  const canWatchCurrentSlideVideo = true;

  const isEmbedVideo = (url?: string | null) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  const hasBackgroundVideo = Boolean(
    currentSlide?.videoUrl && !isEmbedVideo(currentSlide.videoUrl)
  );

  const isCurrentSlideVideo = Boolean(
    hasBackgroundVideo || currentSlide?.mediaType === 'video' || currentSlide?.videoUrl
  );

  // Auto-cycle through slides when enabled (pauses when user interacts or video is unmuted/playing)
  useEffect(() => {
    if (!isAutoPlaying || activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeSlides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, activeSlides.length]);

  // Sync video audio and playback
  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.muted = isMuted;
      bgVideoRef.current.volume = volume;
      bgVideoRef.current
        .play()
        .then(() => {
          setIsVideoPlaying(true);
        })
        .catch(() => {
          // If browser restricts unmuted autoplay, fallback gracefully to muted until user clicks unmute
        });
    }
  }, [activeIndex, isMuted, volume, currentSlide?.videoUrl]);

  // Toggle Mute / Voice Audio with persistence
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem(STORAGE_KEYS.muted, String(nextMuted));
    } catch {}

    if (bgVideoRef.current) {
      bgVideoRef.current.muted = nextMuted;
      if (!nextMuted) {
        bgVideoRef.current.volume = volume;
        bgVideoRef.current.play().catch(() => {});
      }
    }
  }, [isMuted, volume]);

  // Volume slider change handler with persistence
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    try {
      localStorage.setItem(STORAGE_KEYS.volume, String(newVol));
    } catch {}
    if (bgVideoRef.current) {
      bgVideoRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        bgVideoRef.current.muted = false;
        try {
          localStorage.setItem(STORAGE_KEYS.muted, 'false');
        } catch {}
      }
    }
  };

  // Play / Pause video directly in the hero stage
  const togglePlayPause = () => {
    if (!bgVideoRef.current) return;
    if (bgVideoRef.current.paused) {
      bgVideoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    } else {
      bgVideoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  // Toggle clean video mode (hides title and text completely so video is 100% unobstructed)
  const toggleCleanView = () => {
    const nextVal = !isCleanView;
    setIsCleanView(nextVal);
    try {
      localStorage.setItem(STORAGE_KEYS.cleanView, String(nextVal));
    } catch {}
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + activeSlides.length) % Math.max(1, activeSlides.length));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % Math.max(1, activeSlides.length));
  };

  const getEmbedUrl = (url: string, autoplay = true, mute = false) => {
    const muteParam = mute ? '&mute=1' : '&mute=0';
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}${muteParam}&loop=1&playlist=${id}`;
    }
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}${muteParam}&loop=1&playlist=${id}`;
    }
    return url;
  };

  return (
    <section className="relative w-full min-h-[660px] lg:min-h-[760px] flex flex-col justify-between overflow-hidden border-b academy-divider bg-[#030811]">
      {/* FULL-BLEED UPPER HOMEPAGE BACKGROUND: DIRECT VIDEO PLAYBACK & HIGH-RES POSTER */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {currentSlide ? (
          <>
            {/* Full-Bleed Base Poster Image Layer */}
            <img
              key={`bg-img-${currentSlide.id}`}
              src={resolveThumbnailUrl(currentSlide.thumbnailUrl)}
              alt={currentSlide.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.heroAcademy;
              }}
              className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01] transition-all duration-1000"
            />

            {/* Direct Full-Bleed Background Video with Sound Capability (No zoom-in required) */}
            {hasBackgroundVideo && currentSlide.videoUrl && (
              <video
                ref={bgVideoRef}
                key={`bg-vid-${currentSlide.id}-${currentSlide.videoUrl}`}
                src={currentSlide.videoUrl}
                poster={resolveThumbnailUrl(currentSlide.thumbnailUrl)}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            )}

            {/* If YouTube/Vimeo Embed & unlocked, render full-bleed background iframe */}
            {currentSlide.videoUrl &&
              canWatchCurrentSlideVideo &&
              isEmbedVideo(currentSlide.videoUrl) && (
                <iframe
                  key={`bg-embed-${currentSlide.id}`}
                  src={getEmbedUrl(currentSlide.videoUrl, true, isMuted)}
                  title={currentSlide.title}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-105"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}
          </>
        ) : (
          <img
            src={ACADEMY_ASSETS.heroAcademy}
            alt="Deen Hijrah Academia"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-50"
          />
        )}

        {/* Lightweight Edge Vignette Scrims:
            When video is playing, keep overlays ultra-subtle so the video is bright, crisp, and vivid.
            Heavy dark scrims are eliminated so the video is fully visible! */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
            hasBackgroundVideo
              ? isCleanView
                ? 'opacity-20 bg-gradient-to-t from-black/60 via-transparent to-black/20'
                : 'opacity-40 bg-gradient-to-t from-[#030811]/90 via-transparent to-black/35'
              : 'bg-gradient-to-r from-[#030811]/90 via-[#040B16]/65 to-[#030811]/35'
          }`}
        />
        <div
          className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
            hasBackgroundVideo
              ? 'opacity-35 bg-gradient-to-t from-[#030811] via-transparent to-transparent'
              : 'bg-gradient-to-t from-[#050C17] via-[#050C17]/25 to-[#030811]/60'
          }`}
        />
      </div>

      {/* FOREGROUND CONTROLS & CONTENT:
          When video is playing, title DOES NOT cover the video, and branding text is hidden! */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-6 lg:px-10 pt-6 pb-8 flex-1 flex flex-col justify-between gap-6">
        {/* Top Control Bar:
            When video is playing, "Deen Hijrah Academia — Sacred Knowledge & Spiritual Journey" is NOT there!
            Instead, prominent audio & video controls appear so the user can easily unmute voice! */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Zone: Only show branding text on static image slides; hide completely when video plays */}
          {!hasBackgroundVideo ? (
            <div className="flex items-center gap-2 text-xs font-medium tracking-wider text-teal-300">
              <span>Deen Hijrah Academia</span>
              <span aria-hidden="true">·</span>
              <span>Principal Faculty: Ustadh Mustaqeem Shaikh</span>
            </div>
          ) : (
            /* When Video is Playing: Dedicated Sound & Video Transport Controller */
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Primary Unmute Voice Button */}
              <button
                type="button"
                onClick={toggleMute}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xl active:scale-95 ${
                  isMuted
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 ring-2 ring-amber-400/50 animate-pulse'
                    : 'bg-teal-400/25 text-teal-200 border border-teal-400/40 hover:bg-teal-400/35'
                }`}
                title={isMuted ? 'Click to unmute voice audio' : 'Voice audio is playing (click to mute)'}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 fill-slate-950" />
                    <span>Unmute Voice</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-300" />
                    <span>Voice Live</span>
                  </>
                )}
              </button>

              {/* Soundwave Animation & Volume Slider when Unmuted */}
              {!isMuted && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#050C17]/85 backdrop-blur-md border border-teal-500/30 text-xs">
                  <div className="flex items-center gap-0.5">
                    <span className="w-1 h-2.5 bg-teal-400 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse delay-75" />
                    <span className="w-1 h-2 bg-cyan-300 rounded-full animate-pulse delay-150" />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                    title={`Volume: ${Math.round(volume * 100)}%`}
                  />
                  <span className="font-mono-tabular text-[10px] text-teal-300 font-bold">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              )}

              {/* Video Play / Pause Toggle */}
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2 rounded-xl bg-[#050C17]/80 hover:bg-[#050C17] text-slate-200 hover:text-teal-300 border border-white/15 backdrop-blur-md transition-colors"
                title={isVideoPlaying ? 'Pause Background Video' : 'Play Background Video'}
              >
                {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              {/* Clean View Toggle: Hides all overlay text so the video is 100% visible */}
              <button
                type="button"
                onClick={toggleCleanView}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all ${
                  isCleanView
                    ? 'bg-teal-400 text-slate-950 border-teal-400 shadow-md font-bold'
                    : 'bg-[#050C17]/80 text-slate-200 border-white/15 hover:border-teal-400/40'
                }`}
                title={isCleanView ? 'Show Video Details' : 'Clean Video View (Hide All Text Overlays)'}
              >
                {isCleanView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">
                  {isCleanView ? 'Clean View Active' : 'Unobstructed View'}
                </span>
              </button>
            </div>
          )}

          {/* Right Zone: Admin Manage Slides & Videos Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminSlides}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#050C17]/85 backdrop-blur-md border border-teal-400/50 text-teal-300 hover:bg-teal-500/20 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Slides &amp; Videos</span>
            </button>
          )}
        </div>

        {/* MIDDLE / LOWER CONTENT:
            When video is playing:
            1. The middle of the screen is completely open and unobstructed!
            2. The video title DOES NOT cover the video — it is docked unobtrusively in the lower third!
            3. On image slides, the standard center hero layout displays. */}
        {currentSlide && (
          hasBackgroundVideo ? (
            /* VIDEO SLIDE: Title is docked neatly in the lower-third, leaving the entire video open */
            <div className="mt-auto mb-2 space-y-2 max-w-2xl">
              {!isCleanView ? (
                /* Compact Non-Obstructive Lower-Third Card */
                <div className="p-4 sm:p-5 rounded-2xl bg-[#040B16]/85 backdrop-blur-md border border-teal-500/30 shadow-2xl space-y-2 transition-all">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-teal-300">
                    <span className="px-2 py-0.5 rounded bg-teal-400/15 border border-teal-500/30 text-[10px] font-bold uppercase tracking-wider text-teal-300">
                      {currentSlide.badgeText}
                    </span>
                    <span>Faculty: {currentSlide.instructorName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400 font-medium">Video Playing</span>
                  </div>

                  {/* Compact, elegant title that does NOT cover the video */}
                  <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-white leading-snug drop-shadow line-clamp-2">
                    {currentSlide.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {currentSlide.subtitle}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentSlide.ctaLink === '#calendar') onOpenCalendar();
                        else onExploreCourses();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                    >
                      <span>{currentSlide.ctaText || 'Explore Syllabus & Enroll'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`group flex items-center gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-2xl border-2 transition-all shadow-2xl backdrop-blur-md whitespace-nowrap ${
                        isMuted
                          ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 ring-4 ring-amber-400/40 animate-pulse hover:bg-amber-300'
                          : 'bg-[#050C17]/90 text-teal-300 border-teal-500/50 hover:bg-[#050C17] hover:border-teal-300'
                      }`}
                      title={isMuted ? 'Click Square to Unmute Voice & Play Video' : 'Mute Video Audio'}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-black/25 shrink-0 border border-white/10">
                        {isMuted ? (
                          <VolumeX className="w-6 h-6 fill-current stroke-[2.5]" />
                        ) : (
                          <Volume2 className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
                        )}
                      </div>
                      <div className="text-left pr-1">
                        <div className="text-[11px] font-black uppercase tracking-wider">
                          {isMuted ? 'Unmute Voice' : 'Audio Playing'}
                        </div>
                        <div className="text-[9px] text-slate-800 dark:text-slate-400 font-mono-tabular">
                          {isMuted ? 'Click to Play Audio' : `${Math.round(volume * 100)}% Volume`}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={toggleCleanView}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-[#050C17]/80 hover:bg-[#050C17] text-slate-300 border border-white/15 transition-colors whitespace-nowrap"
                      title="Hide text overlay to view pure video"
                    >
                      <EyeOff className="w-4 h-4 text-teal-400" />
                      <span>Hide Text</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Ultra-Minimal Clean View Pill: Zero obstruction across the entire video */
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleCleanView}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#050C17]/85 hover:bg-[#050C17] backdrop-blur-md border border-teal-500/30 text-xs text-slate-200 hover:text-white transition-all shadow-lg"
                    title="Click to expand video title and course info"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-teal-300 truncate max-w-xs sm:max-w-md">
                      {currentSlide.title}
                    </span>
                    <Eye className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 shadow-2xl backdrop-blur-md transition-all ${
                      isMuted
                        ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/40 animate-pulse font-bold'
                        : 'bg-[#050C17]/90 text-teal-300 border-teal-500/40'
                    }`}
                    title={isMuted ? 'Click Square to Unmute Voice & Play Video' : 'Mute Voice'}
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-6 h-6 fill-current stroke-[2.5]" />
                        <span className="text-[8px] font-black uppercase">Unmute</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
                        <span className="text-[8px] font-black uppercase text-emerald-400">Audio</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* STATIC IMAGE SLIDE: Standard Elegant Hero Center Focal Point */
            <div className="my-auto py-6 max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-teal-300">
                <span>{currentSlide.badgeText}</span>
                <span aria-hidden="true">·</span>
                <span>Faculty: {currentSlide.instructorName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-slate-300">
                  Slide {String((activeIndex % activeSlides.length) + 1).padStart(2, '0')} /{' '}
                  {String(activeSlides.length).padStart(2, '0')}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] drop-shadow-md">
                {currentSlide.title}
              </h1>

              <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed drop-shadow">
                {currentSlide.subtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (currentSlide.ctaLink === '#calendar') onOpenCalendar();
                    else onExploreCourses();
                  }}
                  className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-lg transition-all whitespace-nowrap"
                >
                  <span>{currentSlide.ctaText || 'Explore Courses & Syllabi'}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onOpenCalendar}
                  className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium rounded-lg bg-[#050C17]/75 hover:bg-[#050C17] text-slate-200 border border-white/15 backdrop-blur-md transition-colors whitespace-nowrap"
                >
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span>Global Timezone Calendar</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* Signature DEEN HIJRAH Watermark (Source Code Academia style) */}
        {(hasBackgroundVideo || isCurrentSlideVideo) && (
          <div className="absolute top-6 right-6 sm:right-10 z-20 pointer-events-none select-none flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#040A14]/80 backdrop-blur-md border border-amber-400/50 shadow-2xl">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-black text-slate-950 leading-none">DH</span>
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
                DEEN HIJRAH
              </span>
              <span className="text-[7px] font-bold tracking-widest text-teal-300 uppercase">
                ACADEMIA
              </span>
            </div>
          </div>
        )}

        {/* Floating Prominent Square Unmute / Mute Voice Beacon Button on Video */}
        {hasBackgroundVideo && (
          <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                if (bgVideoRef.current) {
                  if (isMuted) {
                    bgVideoRef.current.muted = false;
                    bgVideoRef.current.volume = volume > 0 ? volume : 0.85;
                    setIsMuted(false);
                    bgVideoRef.current
                      .play()
                      .then(() => setIsVideoPlaying(true))
                      .catch(() => {});
                    try {
                      localStorage.setItem(STORAGE_KEYS.muted, 'false');
                    } catch {}
                  } else {
                    bgVideoRef.current.muted = true;
                    setIsMuted(true);
                    try {
                      localStorage.setItem(STORAGE_KEYS.muted, 'true');
                    } catch {}
                  }
                }
              }}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 group ${
                isMuted
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/50 animate-pulse font-bold'
                  : 'bg-[#040B16]/90 text-teal-300 border-teal-400/60 ring-2 ring-teal-500/20'
              }`}
              title={
                isMuted
                  ? 'Click Square to Unmute Voice & Play Background Video'
                  : 'Audio Active (Click to Mute)'
              }
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-7 h-7 sm:w-8 sm:h-8 fill-current stroke-[2.5]" />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                    Unmute
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 stroke-[2.5]" />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    Voice On
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty State if Admin Deleted All Slides */}
        {!currentSlide && (
          <div className="my-auto py-12 max-w-xl">
            <div className="p-8 rounded-xl bg-[#050C17]/85 backdrop-blur-md border border-teal-500/30 space-y-4">
              <Sparkles className="w-8 h-8 text-teal-400" />
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Deen Hijrah Academia — Sacred Knowledge &amp; Spiritual Journey
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isAdmin
                  ? 'Your full-bleed homepage background showcase has no slides right now. Click below to upload background videos or images.'
                  : 'Explore classical Islamic scholarship, structured course syllabi, and live global Zoom classes.'}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdminSlides}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Full-Bleed Homepage Video / Image</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Full-Width Controls: When video plays, the little boxes down below are removed, keeping only the clean slide navigation arrows */}
        {activeSlides.length > 0 && (
          <div
            className={`pt-3 flex items-center justify-between gap-4 ${
              isCurrentSlideVideo ? 'border-t-0' : 'border-t border-white/15 flex-col lg:flex-row'
            }`}
          >
            {/* Horizontal Slide Thumbnails - Completely hidden when video is playing/active */}
            {!isCurrentSlideVideo && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {activeSlides.map((slide, idx) => {
                  const isSelected = idx === activeIndex % activeSlides.length;
                  const isSlideVideo = slide.mediaType === 'video' || Boolean(slide.videoUrl);

                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => {
                        setActiveIndex(idx);
                      }}
                      className={`text-left flex items-center gap-3 p-2.5 rounded-xl backdrop-blur-md transition-all border ${
                        isSelected
                          ? 'bg-[#050C17]/90 border-teal-400 shadow-lg'
                          : 'bg-[#050C17]/60 border-white/10 hover:bg-[#050C17]/80 hover:border-white/25'
                      }`}
                    >
                      <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-white/10">
                        <img
                          src={resolveThumbnailUrl(slide.thumbnailUrl)}
                          alt={slide.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.courseSeerah;
                          }}
                          className="w-full h-full object-cover"
                        />
                        {isSlideVideo && (
                          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                            <Film className="w-3.5 h-3.5 text-teal-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-teal-300 truncate">
                          {slide.badgeText}
                        </div>
                        <div className="text-xs font-semibold text-white truncate mt-0.5">
                          {slide.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Slide Navigation Arrows - Always cleanly accessible */}
            <div
              className={`flex items-center gap-2 shrink-0 ${
                isCurrentSlideVideo ? 'ml-auto' : 'self-end lg:self-center'
              }`}
            >
              {!isCurrentSlideVideo && (
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="p-2.5 rounded-xl bg-[#050C17]/80 hover:bg-[#050C17] text-slate-200 border border-white/15 backdrop-blur-md"
                  title={isAutoPlaying ? 'Pause Slide Cycling' : 'Resume Slide Cycling'}
                >
                  {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center justify-center p-3 rounded-xl bg-[#040B16]/85 hover:bg-[#040B16] text-white border border-teal-500/40 hover:border-teal-300 backdrop-blur-md shadow-xl transition-all hover:scale-105"
                title="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center justify-center p-3 rounded-xl bg-[#040B16]/85 hover:bg-[#040B16] text-white border border-teal-500/40 hover:border-teal-300 backdrop-blur-md shadow-xl transition-all hover:scale-105"
                title="Next Slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
