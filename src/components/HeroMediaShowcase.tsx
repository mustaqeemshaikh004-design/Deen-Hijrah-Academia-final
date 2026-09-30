import React, { useState, useEffect, useRef } from 'react';
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
  Lock,
  Maximize2,
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
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  const filteredSlides =
    filterCategory === 'All'
      ? slides
      : slides.filter((s) => s.badgeText.toLowerCase().includes(filterCategory.toLowerCase()));

  const activeSlides = filteredSlides.length > 0 ? filteredSlides : slides;
  const currentSlide = activeSlides[activeIndex % Math.max(1, activeSlides.length)] || null;

  // Orientations are the ONLY recordings people can see unless and until they are enrolled
  const isCurrentSlideOrientation = Boolean(
    currentSlide?.badgeText.toLowerCase().includes('orientation')
  );
  const canWatchCurrentSlideVideo =
    isAdmin || isCurrentSlideOrientation || hasEnrolledCourses;

  useEffect(() => {
    if (!isAutoPlaying || isCinemaMode || activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, isCinemaMode, activeSlides.length]);

  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.muted = isMuted;
      bgVideoRef.current.play().catch(() => {
        // Autoplay with sound may be blocked by browser until user interaction
      });
    }
  }, [activeIndex, isMuted, currentSlide?.videoUrl]);

  const handlePrev = () => {
    setIsCinemaMode(false);
    setActiveIndex((prev) => (prev - 1 + activeSlides.length) % Math.max(1, activeSlides.length));
  };

  const handleNext = () => {
    setIsCinemaMode(false);
    setActiveIndex((prev) => (prev + 1) % Math.max(1, activeSlides.length));
  };

  const isEmbedVideo = (url?: string | null) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
  };

  const getEmbedUrl = (url: string, autoplay = true, mute = false) => {
    const muteParam = mute ? '&mute=1' : '';
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

  const hasBackgroundVideo = Boolean(
    currentSlide?.videoUrl && canWatchCurrentSlideVideo && !isEmbedVideo(currentSlide.videoUrl)
  );

  return (
    <section className="relative w-full min-h-[660px] lg:min-h-[760px] flex flex-col justify-between overflow-hidden border-b academy-divider bg-[#030811]">
      {/* FULL-BLEED UPPER HOMEPAGE BACKGROUND: VIDEO & HIGH-RES IMAGES */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {currentSlide ? (
          <>
            {/* Full-Bleed Background Image Layer (Always present as base / poster) */}
            <img
              key={`bg-img-${currentSlide.id}`}
              src={resolveThumbnailUrl(currentSlide.thumbnailUrl)}
              alt={currentSlide.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = ACADEMY_ASSETS.heroAcademy;
              }}
              className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02] transition-all duration-1000"
            />

            {/* Full-Bleed Background Video Layer (Plays across the entire upper homepage when unlocked) */}
            {hasBackgroundVideo && currentSlide.videoUrl && !isCinemaMode && (
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
              isEmbedVideo(currentSlide.videoUrl) &&
              !isCinemaMode && (
                <iframe
                  key={`bg-embed-${currentSlide.id}`}
                  src={getEmbedUrl(currentSlide.videoUrl, true, isMuted)}
                  title={currentSlide.title}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-110"
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

        {/* Layered Editorial Scrims so Typography & Controls Remain Crisp over Full-Bleed Video/Images */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030811]/90 via-[#040B16]/65 to-[#030811]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050C17] via-[#050C17]/25 to-[#030811]/60" />
      </div>

      {/* FULL-SCREEN INTERACTIVE VIDEO PLAYER OVERLAY (When user clicks Watch Full Video with Controls) */}
      {isCinemaMode && currentSlide && (
        <div className="relative z-30 w-full min-h-[660px] lg:min-h-[760px] bg-black/95 flex flex-col justify-between">
          {canWatchCurrentSlideVideo && currentSlide.videoUrl ? (
            <>
              <div className="flex items-center justify-between px-6 lg:px-10 py-4 bg-[#050C17]/95 border-b border-teal-500/20">
                <div className="flex items-center gap-3">
                  <Video className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-semibold text-teal-300">
                    {currentSlide.title} · {currentSlide.instructorName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCinemaMode(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
                >
                  Return to Full-Bleed Hero View
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center relative">
                {isEmbedVideo(currentSlide.videoUrl) ? (
                  <iframe
                    src={getEmbedUrl(currentSlide.videoUrl, true, false)}
                    title={currentSlide.title}
                    className="w-full h-[560px] lg:h-[640px]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={currentSlide.videoUrl}
                    poster={resolveThumbnailUrl(currentSlide.thumbnailUrl)}
                    controls
                    autoPlay
                    className="w-full max-h-[640px] object-contain bg-black"
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-4 p-8 rounded-xl bg-[#06101E]/95 border border-amber-400/30">
                <Lock className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="font-display text-xl font-bold text-white">
                  Class Recording Locked Until Enrolled
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Only <strong>Orientation Session</strong> recordings are publicly viewable. To
                  watch class recordings and lecture highlights, please enroll in the course first.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCinemaMode(false);
                      onExploreCourses();
                    }}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
                  >
                    View Course Syllabus &amp; Enroll
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCinemaMode(false)}
                    className="px-4 py-2.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOREGROUND CONTENT OVER FULL-BLEED VIDEO & IMAGE HERO */}
      {!isCinemaMode && (
        <div className="relative z-10 max-w-7xl w-full mx-auto px-6 lg:px-10 pt-8 pb-10 flex-1 flex flex-col justify-between gap-10">
          {/* Top Bar: Category Filter Controls & Admin Manage Button */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wider text-teal-300">
              <span>Deen Hijrah Academia</span>
              <span aria-hidden="true">·</span>
              <span>Principal Faculty: Ustadh Mustaqeem Shaikh</span>
              {hasBackgroundVideo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-300 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> Live Background Video Active
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#050C17]/80 backdrop-blur-md border border-white/10">
                {['All', 'Orientation Session', 'Featured Course', 'Highlight Recording'].map(
                  (tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setFilterCategory(tab);
                        setActiveIndex(0);
                        setIsCinemaMode(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        filterCategory === tab
                          ? 'bg-teal-400 text-slate-950 font-semibold shadow-sm'
                          : 'text-slate-200 hover:text-teal-300'
                      }`}
                    >
                      {tab === 'All' ? 'All Media' : tab}
                    </button>
                  )
                )}
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdminSlides}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#050C17]/85 backdrop-blur-md border border-teal-400/50 text-teal-300 hover:bg-teal-500/20 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Homepage Videos &amp; Images</span>
                </button>
              )}
            </div>
          </div>

          {/* Center Hero Focal Point Over the Full-Screen Background Video/Image */}
          {currentSlide ? (
            <div className="my-auto py-6 max-w-3xl space-y-5">
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

              {/* Primary CTA & Full-Screen / Audio Controls */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {currentSlide.videoUrl && (
                  <button
                    type="button"
                    onClick={() => setIsCinemaMode(true)}
                    className="flex items-center gap-2.5 px-6 py-3 text-xs sm:text-sm font-semibold rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-lg transition-all whitespace-nowrap"
                  >
                    {canWatchCurrentSlideVideo ? (
                      <Maximize2 className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>
                      {isCurrentSlideOrientation
                        ? 'Watch Full Orientation with Player Controls'
                        : canWatchCurrentSlideVideo
                        ? 'Open Full Video Player'
                        : 'Class Recording (Enroll to Unlock)'}
                    </span>
                  </button>
                )}

                {hasBackgroundVideo && (
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-lg bg-[#050C17]/80 hover:bg-[#050C17] text-teal-300 border border-teal-400/40 backdrop-blur-md transition-colors whitespace-nowrap"
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>Unmute Background Video</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Mute Audio</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (currentSlide.ctaLink === '#calendar') {
                      onOpenCalendar();
                    } else {
                      onExploreCourses();
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-colors whitespace-nowrap"
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
          ) : (
            /* Empty State if Admin Deleted All Slides */
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

          {/* Bottom Full-Width Filmstrip Dock Over Full-Bleed Background */}
          {activeSlides.length > 0 && (
            <div className="pt-4 border-t border-white/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Horizontal Slide Thumbnails */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {activeSlides.map((slide, idx) => {
                  const isSelected = idx === activeIndex % activeSlides.length;
                  const isSlideOrientation = slide.badgeText
                    .toLowerCase()
                    .includes('orientation');

                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => {
                        setActiveIndex(idx);
                        setIsCinemaMode(false);
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
                        {slide.videoUrl && (
                          <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                            {isSlideOrientation || isAdmin || hasEnrolledCourses ? (
                              <Film className="w-3.5 h-3.5 text-teal-300" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-amber-300" />
                            )}
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

              {/* Background Slideshow Transport Controls */}
              <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="p-2.5 rounded-lg bg-[#050C17]/80 hover:bg-[#050C17] text-slate-200 border border-white/15 backdrop-blur-md"
                  title={isAutoPlaying ? 'Pause Background Cycling' : 'Resume Background Cycling'}
                >
                  {isAutoPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-2.5 rounded-lg bg-[#050C17]/80 hover:bg-[#050C17] text-slate-200 border border-white/15 backdrop-blur-md"
                  title="Previous Background Slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-2.5 rounded-lg bg-[#050C17]/80 hover:bg-[#050C17] text-slate-200 border border-white/15 backdrop-blur-md"
                  title="Next Background Slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
