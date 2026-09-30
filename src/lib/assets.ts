import heroAcademyImg from '../assets/images/hero_islamic_academy_1790718329904.jpg';
import courseSeerahImg from '../assets/images/course_seerah_chronicles_1790718341270.jpg';
import courseArabicImg from '../assets/images/course_arabic_mastery_1790718350748.jpg';
import orientationLiveImg from '../assets/images/orientation_live_session_1790718361553.jpg';

export const ACADEMY_ASSETS = {
  heroAcademy: heroAcademyImg,
  courseSeerah: courseSeerahImg,
  courseArabic: courseArabicImg,
  orientationLive: orientationLiveImg,
};

export const PRESET_THUMBNAILS = [
  {
    id: 'preset:hero_academy',
    label: 'Academy Sanctuary & Library',
    url: heroAcademyImg,
  },
  {
    id: 'preset:seerah',
    label: 'Prophetic Seerah & Manuscripts',
    url: courseSeerahImg,
  },
  {
    id: 'preset:arabic',
    label: 'Classical Arabic & Sacred Geometry',
    url: courseArabicImg,
  },
  {
    id: 'preset:orientation',
    label: 'Live Lecture Studio & Orientation',
    url: orientationLiveImg,
  },
];

export function resolveThumbnailUrl(rawUrl?: string | null): string {
  if (!rawUrl) return heroAcademyImg;
  if (rawUrl === 'preset:hero_academy' || rawUrl.includes('hero_islamic_academy')) {
    return heroAcademyImg;
  }
  if (rawUrl === 'preset:seerah' || rawUrl.includes('course_seerah_chronicles')) {
    return courseSeerahImg;
  }
  if (rawUrl === 'preset:arabic' || rawUrl.includes('course_arabic_mastery')) {
    return courseArabicImg;
  }
  if (rawUrl === 'preset:orientation' || rawUrl.includes('orientation_live_session')) {
    return orientationLiveImg;
  }
  return rawUrl;
}
