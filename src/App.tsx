/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Play,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Video,
  CheckCircle2,
  Mail,
  Trash2,
  RotateCcw,
  Users,
  Globe,
  Upload,
  BookOpen,
  Lock,
  Sparkles,
} from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar, ActiveView } from './components/Navbar.tsx';
import { HeroMediaShowcase } from './components/HeroMediaShowcase.tsx';
import { InteractiveCalendar } from './components/InteractiveCalendar.tsx';
import { CourseWatchView } from './components/CourseWatchView.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { AdminPortal, AdminModule } from './components/AdminPortal.tsx';
import { FacultyPage } from './components/FacultyPage.tsx';
import { AcademyLogo, SplashIntro } from './components/AcademyLogo.tsx';
import { MovingBackground } from './components/MovingBackground.tsx';
import { CourseEnrollmentModal } from './components/CourseEnrollmentModal.tsx';
import { OpenEnrollmentHeroBanner } from './components/OpenEnrollmentHeroBanner.tsx';
import {
  Course,
  Lesson,
  CourseEvent,
  HomepageSlide,
  Profile,
  Enrollment,
  CalendarSettings,
  parseCourseTags,
} from './types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from './lib/assets.ts';
import {
  convertClassTimeToRegion,
  getDetectedUserTimezone,
} from './lib/timezone.ts';
import { smartApiFetch } from './lib/fallbackStore.ts';

const sectionRevealVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function AcademyPortalContent() {
  const {
    profile,
    messages,
    homework,
    authFetch,
    refreshProfileAndMessages,
    uploadMediaFile,
    openAuthModal,
  } = useAuth();

  const detectedTz = useMemo(() => getDetectedUserTimezone(), []);

  // Show the animated Logo Splash Intro first before transitioning into the homepage
  const [showSplash, setShowSplash] = useState<boolean>(true);
  // Big Open for Enrollment box (Seerahverse / Source Code style) that appears on website with a cross button to dismiss
  const [showEnrollmentModalBox, setShowEnrollmentModalBox] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [adminInitialModule, setAdminInitialModule] = useState<AdminModule>('courses');
  const [watchingCourse, setWatchingCourse] = useState<Course | null>(null);
  const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null);
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<'all' | 'open' | 'coming_soon' | 'live'>('all');

  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [slides, setSlides] = useState<HomepageSlide[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | undefined>(undefined);
  const [loadingPortal, setLoadingPortal] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploadingFacultyPhoto, setUploadingFacultyPhoto] = useState<boolean>(false);

  // Course Catalog Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Newsletter Footer State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPortalData = useCallback(async () => {
    try {
      const res = await smartApiFetch('/api/portal-data');
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
        setLessons(data.lessons || []);
        setEvents(data.events || []);
        setSlides(data.slides || []);
        setProfiles(data.profiles || []);
        setEnrollments(data.enrollments || []);
        if (data.calendarSettings) {
          setCalendarSettings(data.calendarSettings);
        }
      }
    } catch (err) {
      console.error('Error loading portal data:', err);
    } finally {
      setLoadingPortal(false);
    }
  }, []);

  const handleUpdateCalendarSettings = async (newSettings: CalendarSettings) => {
    try {
      const res = await authFetch('/api/calendar/settings', {
        method: 'POST',
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const saved = await res.json();
        setCalendarSettings(saved);
        showToast('Saved calendar options for everyone across the academy!');
      } else {
        showToast('Unable to save calendar settings globally.');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Could not save calendar settings'}`);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  // Ensure the Deen Hijrah Academia geometric emblem always appears on the browser tab
  useEffect(() => {
    document.title = 'Deen Hijrah Academia — Sacred Knowledge & Spiritual Journey';
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    existingIcons.forEach((el) => {
      (el as HTMLLinkElement).href = '/favicon.svg';
    });
  }, []);

  const handleRefreshAll = async () => {
    await Promise.all([loadPortalData(), refreshProfileAndMessages()]);
  };

  const myEnrollments = useMemo(() => {
    if (!profile) return [];
    return enrollments.filter((e) => e.studentId === profile.id);
  }, [enrollments, profile]);

  const enrolledCourseIds = useMemo(
    () => myEnrollments.map((e) => e.courseId),
    [myEnrollments]
  );

  const unreadCount = useMemo(() => {
    if (!profile) return 0;
    return messages.filter((m) => m.receiverId === profile.id && !m.readStatus).length;
  }, [messages, profile]);

  // Strict RBAC: Only Admin / Instructor can access Admin features
  const isAdmin = profile?.role === 'admin' || profile?.role === 'instructor';

  const founderProfile = useMemo(
    () =>
      profiles.find(
        (p) => p.uid === 'founder-mustaqeem-shaikh' || p.role === 'admin'
      ) || null,
    [profiles]
  );

  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status === 'published' || isAdmin),
    [courses, isAdmin]
  );

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    publishedCourses.forEach((c) => set.add(c.category));
    return Array.from(set);
  }, [publishedCourses]);

  const filteredCourses = useMemo(() => {
    return publishedCourses.filter((c) => {
      if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
      const cTags = parseCourseTags(c).map((t) => t.toLowerCase());
      if (enrollmentStatusFilter !== 'all') {
        const cStatus = c.enrollmentStatus || 'open';
        const matchesStatus = cStatus === enrollmentStatusFilter;
        const matchesTag =
          (enrollmentStatusFilter === 'live' && cTags.some((t) => t.includes('live'))) ||
          (enrollmentStatusFilter === 'open' && cTags.some((t) => t.includes('open'))) ||
          (enrollmentStatusFilter === 'coming_soon' && cTags.some((t) => t.includes('coming')));
        if (!matchesStatus && !matchesTag) return false;
      }
      if (
        searchQuery.trim() &&
        !c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !c.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !c.instructorName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !cTags.some((t) => t.includes(searchQuery.toLowerCase()))
      ) {
        return false;
      }
      return true;
    });
  }, [publishedCourses, selectedCategory, enrollmentStatusFilter, searchQuery]);

  const handleStartEnrollWizard = (course: Course) => {
    setEnrollingCourse(course);
  };

  const handleEnrollCourse = async (courseId: number, enrollmentData?: any) => {
    if (!profile) {
      openAuthModal('create');
      showToast('Sign in with Google or create an account to finalize your admission!');
      return;
    }

    const res = await authFetch('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId, ...enrollmentData }),
    });
    if (res.ok) {
      await handleRefreshAll();
      const targetCourse = courses.find((c) => c.id === courseId);
      showToast(
        `Mubarak! You are officially admitted to ${targetCourse?.title || 'course'}! Recordings, homework & Zoom links unlocked.`
      );
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || 'Unable to enroll in course.');
      throw new Error(errData.error || 'Enrollment failed');
    }
  };

  const handleToggleLessonComplete = async (lessonId: number) => {
    if (!watchingCourse) return;
    const currentEnrollment = myEnrollments.find((e) => e.courseId === watchingCourse.id);
    if (!currentEnrollment) {
      await handleEnrollCourse(watchingCourse.id);
      return;
    }

    let completedIds: number[] = [];
    try {
      completedIds = JSON.parse(currentEnrollment.completedLessonIds || '[]').map(Number);
    } catch {
      completedIds = [];
    }

    const exists = completedIds.includes(lessonId);
    const nextCompleted = exists
      ? completedIds.filter((id) => id !== lessonId)
      : [...completedIds, lessonId];

    const courseLessonsTotal = lessons.filter((l) => l.courseId === watchingCourse.id).length;
    const nextPercentage =
      courseLessonsTotal > 0
        ? Math.min(100, Math.round((nextCompleted.length / courseLessonsTotal) * 100))
        : 100;

    const res = await authFetch(`/api/enrollments/${currentEnrollment.id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({
        completedLessonIds: nextCompleted,
        progressPercentage: nextPercentage,
      }),
    });

    if (res.ok) {
      await handleRefreshAll();
      showToast(exists ? 'Lesson marked incomplete.' : 'Lesson progress synced!');
    }
  };

  const handleSendMessage = async (receiverId: number, subject: string, body: string) => {
    const res = await authFetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, subject, body }),
    });
    if (res.ok) {
      await handleRefreshAll();
      showToast('Message delivered to Tutor Inbox.');
    }
  };

  const handleMarkMessageRead = async (messageId: number) => {
    const res = await authFetch(`/api/messages/${messageId}/read`, { method: 'PUT' });
    if (res.ok) {
      await handleRefreshAll();
    }
  };

  const handleSubmitHomework = async (
    courseId: number,
    lessonId: number | null,
    title: string,
    content: string,
    attachmentUrl?: string | null
  ) => {
    const res = await authFetch('/api/homework', {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        lessonId,
        title,
        content,
        attachmentUrl,
      }),
    });
    if (res.ok) {
      await handleRefreshAll();
      showToast('Homework submitted to Ustadh Mustaqeem Shaikh!');
    }
  };

  const handleGradeHomework = async (
    submissionId: number,
    status: string,
    grade: string,
    feedback: string
  ) => {
    const res = await authFetch(`/api/homework/${submissionId}/feedback`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        grade,
        feedback,
      }),
    });
    if (res.ok) {
      await handleRefreshAll();
      showToast('Faculty feedback & grade status saved!');
    }
  };

  const handleSubmitFeedback = async (
    feedbackType: 'class' | 'website',
    categoryLabel: string,
    rating: number,
    comment: string
  ) => {
    const receiverId = founderProfile?.id || profiles[0]?.id || 1;
    const prefix = feedbackType === 'class' ? '[CLASS_FEEDBACK]' : '[WEBSITE_FEEDBACK]';
    const res = await authFetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        receiverId,
        subject: `${prefix} ${categoryLabel} (${rating}/5)`,
        body: comment,
      }),
    });
    if (res.ok) {
      await handleRefreshAll();
      showToast(
        `${
          feedbackType === 'class' ? 'Class' : 'Website'
        } feedback submitted! JazakAllah khayr.`
      );
    }
  };

  const handleToggleCourseLessonProgress = async (courseId: number, lessonId: number) => {
    const currentEnrollment = myEnrollments.find((e) => e.courseId === courseId);
    if (!currentEnrollment) {
      await handleEnrollCourse(courseId);
      return;
    }

    let completedIds: number[] = [];
    try {
      completedIds = JSON.parse(currentEnrollment.completedLessonIds || '[]').map(Number);
    } catch {
      completedIds = [];
    }

    const exists = completedIds.includes(lessonId);
    const nextCompleted = exists
      ? completedIds.filter((id) => id !== lessonId)
      : [...completedIds, lessonId];

    const courseLessonsTotal = lessons.filter((l) => l.courseId === courseId).length;
    const nextPercentage =
      courseLessonsTotal > 0
        ? Math.min(100, Math.round((nextCompleted.length / courseLessonsTotal) * 100))
        : 100;

    const res = await authFetch(`/api/enrollments/${currentEnrollment.id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({
        completedLessonIds: nextCompleted,
        progressPercentage: nextPercentage,
      }),
    });

    if (res.ok) {
      await handleRefreshAll();
      showToast(exists ? 'Lesson marked incomplete.' : 'Course progress updated!');
    }
  };

  return (
    <div id="top" className="relative min-h-screen flex flex-col academy-canvas overflow-x-hidden">
      {/* Animated Moving Dots & Sacred Geometry Constellation Background */}
      <MovingBackground />

      {/* First-Load Logo Splash Intro that transitions smoothly into the Homepage */}
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashIntro key="splash-loader" onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {/* Main Application Content with Smooth Entrance Transitions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: showSplash ? 0 : 1,
          y: showSplash ? 16 : 0,
        }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 min-h-screen flex flex-col"
      >
        <Navbar
          activeView={activeView}
          onNavigate={(view) => {
            setWatchingCourse(null);
            setActiveView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          unreadCount={unreadCount}
          onReplayIntro={() => setShowSplash(true)}
          onSignedInSuccess={async (signedInProfile) => {
            await handleRefreshAll();
            showToast(
              `As-salamu alaykum, ${signedInProfile.fullName}! You are signed in and ready to enroll.`
            );
          }}
        />

        {/* GRAND OPEN FOR ENROLLMENT BOX (SEERAHVERSE & SOURCE CODE STYLE)
            Appears on the website after the logo intro with a cross (✕) button so users can easily dismiss it */}
        <OpenEnrollmentHeroBanner
          isOpen={!showSplash && showEnrollmentModalBox}
          onClose={() => setShowEnrollmentModalBox(false)}
          courses={publishedCourses}
          enrolledCourseIds={enrolledCourseIds}
          onStartEnroll={(c) => {
            setShowEnrollmentModalBox(false);
            setEnrollingCourse(c);
          }}
          onExploreCourses={() => {
            setShowEnrollmentModalBox(false);
            const el = document.getElementById('courses-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            else setActiveView('courses');
          }}
        />

        {/* Floating Notification Banner */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-teal-400 text-slate-950 text-xs font-semibold shadow-2xl"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            {watchingCourse ? (
              <motion.div
                key={`watch-${watchingCourse.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <CourseWatchView
                  course={watchingCourse}
                  lessons={lessons}
                  events={events}
                  allCourseEnrollmentsCount={
                    enrollments.filter((e) => e.courseId === watchingCourse.id).length
                  }
                  enrollment={myEnrollments.find((e) => e.courseId === watchingCourse.id)}
                  homeworkList={homework}
                  messages={messages}
                  isAdmin={Boolean(isAdmin)}
                  onBack={() => setWatchingCourse(null)}
                  onEnroll={async (courseId) => {
                    const c = courses.find((item) => item.id === courseId) || watchingCourse;
                    if (c) setEnrollingCourse(c);
                    else await handleEnrollCourse(courseId);
                  }}
                  onToggleLessonComplete={handleToggleLessonComplete}
                  onSubmitHomework={handleSubmitHomework}
                  onGradeHomework={handleGradeHomework}
                  onSubmitFeedback={handleSubmitFeedback}
                  onUploadFile={uploadMediaFile}
                />
              </motion.div>
            ) : activeView === 'admin' ? (
              <motion.div
                key="admin-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <AdminPortal
                  initialModule={adminInitialModule}
                  profile={profile}
                  courses={courses}
                  lessons={lessons}
                  events={events}
                  slides={slides}
                  profiles={profiles}
                  enrollments={enrollments}
                  messages={messages}
                  homework={homework}
                  authFetch={authFetch}
                  onUploadFile={uploadMediaFile}
                  onRefreshData={handleRefreshAll}
                  onNavigateToStudentDashboard={() => setActiveView('dashboard')}
                />
              </motion.div>
            ) : activeView === 'dashboard' ? (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <StudentDashboard
                  profile={profile}
                  courses={courses}
                  lessons={lessons}
                  enrollments={enrollments}
                  events={events}
                  messages={messages}
                  homework={homework}
                  allProfiles={profiles}
                  onWatchCourse={(course) => setWatchingCourse(course)}
                  onEnrollCourse={async (courseId) => {
                    const c = courses.find((item) => item.id === courseId);
                    if (c) setEnrollingCourse(c);
                    else await handleEnrollCourse(courseId);
                  }}
                  onToggleLessonProgress={handleToggleCourseLessonProgress}
                  onSendMessage={handleSendMessage}
                  onMarkMessageRead={handleMarkMessageRead}
                  onSubmitHomework={handleSubmitHomework}
                  onGradeHomework={handleGradeHomework}
                  onSubmitFeedback={handleSubmitFeedback}
                  onUploadFile={uploadMediaFile}
                  onBrowseCourses={() => setActiveView('courses')}
                />
              </motion.div>
            ) : activeView === 'calendar' ? (
              <motion.div
                key="calendar-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-[1650px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8"
              >
                <InteractiveCalendar
                  courses={courses}
                  events={events}
                  lessons={lessons}
                  enrolledCourseIds={enrolledCourseIds}
                  isAdmin={Boolean(isAdmin)}
                  calendarSettings={calendarSettings}
                  onUpdateCalendarSettings={handleUpdateCalendarSettings}
                  onEnrollCourse={async (courseId) => {
                    const c = courses.find((item) => item.id === courseId);
                    if (c) setEnrollingCourse(c);
                    else await handleEnrollCourse(courseId);
                  }}
                  onOpenWatchCourse={(courseId) => {
                    const target = courses.find((c) => c.id === courseId);
                    if (target) setWatchingCourse(target);
                  }}
                  onOpenAdminSchedule={() => {
                    setAdminInitialModule('zoom_calendar');
                    setActiveView('admin');
                  }}
                />
              </motion.div>
            ) : activeView === 'faculty' ? (
              <motion.div
                key="faculty-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <FacultyPage
                  profile={profile}
                  founderProfile={founderProfile || undefined}
                  profiles={profiles}
                  courses={courses}
                  lessons={lessons}
                  isAdmin={Boolean(isAdmin)}
                  onWatchCourse={(course) => setWatchingCourse(course)}
                  onOpenCalendar={() => {
                    setWatchingCourse(null);
                    setActiveView('calendar');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onOpenDashboard={() => {
                    setWatchingCourse(null);
                    setActiveView('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onOpenTeacherStudio={() => {
                    setWatchingCourse(null);
                    setAdminInitialModule('lessons');
                    setActiveView('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onUploadFile={uploadMediaFile}
                  onFacultyJoined={async (sessionToken, updatedProfile) => {
                    if (sessionToken) {
                      try {
                        localStorage.setItem('academy_session_token', sessionToken);
                      } catch {}
                    }
                    await handleRefreshAll();
                    showToast(
                      `Mubarak! Welcome to Deen Hijrah Faculty, ${updatedProfile.fullName}. Your Teacher Studio is unlocked.`
                    );
                    setAdminInitialModule('lessons');
                    setActiveView('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </motion.div>
            ) : (
              /* HOME OR COURSES VIEW WITH STAGGERED ENTRANCE TRANSITIONS */
              <motion.div
                key={`public-${activeView}-${showSplash ? 'splash' : 'ready'}`}
                initial="hidden"
                animate={showSplash ? 'hidden' : 'visible'}
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.16, delayChildren: 0.05 },
                  },
                }}
              >
                {activeView === 'home' && (
                  <>
                    {/* Admissions Open Notification Bar: Allows reopening the Big Box anytime if dismissed */}
                    {publishedCourses.some((c) => c.enrollmentStatus !== 'coming_soon') && (
                      <motion.div
                        variants={sectionRevealVariants}
                        className="bg-gradient-to-r from-amber-400/10 via-amber-400/20 to-teal-400/10 border-b border-amber-400/30 px-6 py-2.5"
                      >
                        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span className="font-bold text-amber-300 uppercase tracking-wider">
                              Cohort 2026 Admissions Open:
                            </span>
                            <span className="text-slate-200">
                              {publishedCourses.filter((c) => c.enrollmentStatus !== 'coming_soon').length} Program{publishedCourses.length > 1 ? 's' : ''} currently accepting student enrollment.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowEnrollmentModalBox(true)}
                            className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors shadow-sm shrink-0 cursor-pointer"
                          >
                            Open Admissions Box
                          </button>
                        </div>
                      </motion.div>
                    )}

                    <motion.div variants={sectionRevealVariants}>
                      <HeroMediaShowcase
                        slides={slides}
                        isAdmin={Boolean(isAdmin)}
                        hasEnrolledCourses={enrolledCourseIds.length > 0}
                        onExploreCourses={() => {
                          const el = document.getElementById('courses-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                          else setActiveView('courses');
                        }}
                        onOpenCalendar={() => {
                          const el = document.getElementById('calendar-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                          else setActiveView('calendar');
                        }}
                        onOpenAdminSlides={() => {
                          setAdminInitialModule('homepage_media');
                          setActiveView('admin');
                        }}
                      />
                    </motion.div>
                  </>
                )}

                {/* Quick Faculty Admin Setup Bar on Homepage (Strictly Hidden for Students) */}
                {isAdmin && activeView === 'home' && (
                  <motion.div
                    variants={sectionRevealVariants}
                    className="border-b academy-divider academy-elevated"
                  >
                    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-teal-400">
                          Faculty Quick Controls (Ustadh Mustaqeem Shaikh):
                        </span>
                        <span className="academy-text-secondary">
                          Upload syllabi &amp; boxes, set student limits, upload recordings, or
                          schedule global timezone classes.
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAdminInitialModule('courses');
                            setActiveView('admin');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-teal-400 text-slate-950 font-semibold hover:bg-teal-300 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Course, Syllabus &amp; Student Cap</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminInitialModule('lessons');
                            setActiveView('admin');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md academy-surface hover:border-teal-400 whitespace-nowrap"
                        >
                          <Upload className="w-3.5 h-3.5 text-teal-400" />
                          <span>Upload Recording</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminInitialModule('zoom_calendar');
                            setActiveView('admin');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md academy-surface hover:border-teal-400 whitespace-nowrap"
                        >
                          <Video className="w-3.5 h-3.5 text-teal-400" />
                          <span>Set Course Calendar &amp; Time</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await authFetch('/api/admin/save-state', {
                              method: 'POST',
                            });
                            if (res.ok) {
                              await handleRefreshAll();
                              showToast(
                                'All changes saved permanently! Everything you added stays and everything deleted remains removed.'
                              );
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-semibold hover:bg-emerald-500/30 whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save All Changes</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await authFetch('/api/admin/clear-all', {
                              method: 'POST',
                            });
                            if (res.ok) {
                              await handleRefreshAll();
                              showToast(
                                'All demo courses & slides cleared! Ready for your custom content.'
                              );
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md academy-surface text-rose-400 hover:border-rose-400/50 whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Make Everything Blank</span>
                        </button>
                        {courses.length === 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await authFetch('/api/admin/seed-demo', {
                                method: 'POST',
                              });
                              if (res.ok) {
                                await handleRefreshAll();
                                showToast(
                                  'Restored showcase courses, syllabi, recordings, and Zoom sessions.'
                                );
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md academy-surface text-teal-400 hover:border-teal-400 whitespace-nowrap"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Load Sample Data</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* COURSE SHOWCASE GRID (Responsive Card Layout using full space with Enrollment Rate, Student Cap, Syllabus Boxes & Local Timezone) */}
                <motion.section
                  id="courses-section"
                  variants={sectionRevealVariants}
                  className="w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 py-12 lg:py-16 space-y-8"
                >
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b academy-divider">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-teal-400">
                        <Globe className="w-3.5 h-3.5" />
                        <span>
                          Class Times Automatically Shown in Your Region ({detectedTz}) · All Recordings 100% Free to Watch
                        </span>
                      </div>
                      <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
                        Sacred Knowledge Programs &amp; Courses
                      </h2>
                    </div>

                    {/* Search & Category Segmented Filter */}
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 academy-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search courses, tags, or faculty..."
                          className="pl-8 pr-3 py-1.5 text-xs rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                        />
                      </div>

                      {/* Enrollment Status Filter (All | Open | Live | Coming Soon) */}
                      <div className="flex items-center gap-1 p-1 rounded-lg academy-elevated overflow-x-auto">
                        {[
                          { key: 'all', label: 'All Programs' },
                          { key: 'open', label: '🟢 Open for Enrollment' },
                          { key: 'live', label: '🔴 Live Now' },
                          { key: 'coming_soon', label: '🟡 Coming Soon' },
                        ].map((st) => (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => setEnrollmentStatusFilter(st.key as any)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                              enrollmentStatusFilter === st.key
                                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {/* Category Filter */}
                      <div className="flex items-center gap-1 p-1 rounded-lg academy-elevated overflow-x-auto">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                              selectedCategory === cat
                                ? 'bg-teal-400 text-slate-950 font-semibold'
                                : 'academy-text-secondary hover:text-teal-300'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {loadingPortal ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="h-96 rounded-xl academy-surface animate-pulse p-5"
                        />
                      ))}
                    </div>
                  ) : filteredCourses.length > 0 ? (
                    <motion.div
                      variants={gridContainerVariants}
                      initial="hidden"
                      animate={showSplash ? 'hidden' : 'visible'}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8"
                    >
                      {filteredCourses.map((course) => {
                        const isEnrolled = enrolledCourseIds.includes(course.id);
                        const courseLessons = lessons.filter((l) => l.courseId === course.id);
                        const orientationCount = courseLessons.filter(
                          (l) => l.isFreePreview
                        ).length;
                        const classRecordingCount = courseLessons.length - orientationCount;

                        // Student Capacity & Enrollment Rate Math
                        const dbEnrollmentsCount = enrollments.filter(
                          (e) => e.courseId === course.id
                        ).length;
                        const studentsTaken =
                          dbEnrollmentsCount + (course.initialEnrolledCount || 0);
                        const maxStudents = course.maxStudents || 25;
                        const enrollmentRate =
                          maxStudents > 0
                            ? Math.min(100, Math.round((studentsTaken / maxStudents) * 100))
                            : 0;
                        const isCourseFull = maxStudents > 0 && studentsTaken >= maxStudents;

                        // Convert Course Weekly Class Schedule to Visitor's Local Country Timezone
                        const convertedClassTime = convertClassTimeToRegion(
                          course.launchDate,
                          course.classStartTime || '14:00',
                          course.classTimezone || 'America/New_York',
                          detectedTz
                        );

                        return (
                          <motion.article
                            key={course.id}
                            variants={cardItemVariants}
                            whileHover={{ y: -5 }}
                            className="rounded-xl overflow-hidden academy-surface flex flex-col justify-between group hover:border-teal-400/50 transition-colors duration-200 backdrop-blur-sm bg-opacity-90"
                          >
                            <div>
                              {/* Course Thumbnail */}
                              <div
                                onClick={() => setWatchingCourse(course)}
                                className="relative h-48 overflow-hidden bg-slate-950 cursor-pointer"
                              >
                                <img
                                  src={resolveThumbnailUrl(course.thumbnailUrl)}
                                  alt={course.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      ACADEMY_ASSETS.courseSeerah;
                                  }}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#060E1A] via-[#060E1A]/25 to-transparent" />
                                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-teal-300 font-mono-tabular">
                                  <span>{course.duration}</span>
                                  <span className="font-semibold text-white">{course.price}</span>
                                </div>
                              </div>

                              {/* Card Body — Clean Metadata + Multi-Tags + Capacity + Local Timezone */}
                              <div className="p-6 space-y-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
                                    <span>{course.category}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>Faculty: {course.instructorName}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {parseCourseTags(course).map((tag, tIdx) => {
                                      const isLive = tag.toLowerCase().includes('live');
                                      const isOpen = tag.toLowerCase().includes('open');
                                      const isComing = tag.toLowerCase().includes('coming');
                                      return (
                                        <span
                                          key={tIdx}
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 whitespace-nowrap shadow-sm ${
                                            isLive
                                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                              : isOpen
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                              : isComing
                                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                              : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                                          }`}
                                        >
                                          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                                          {isOpen && !isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                                          {isComing && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                          <span>{tag}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>

                                <h3
                                  onClick={() => setWatchingCourse(course)}
                                  className="font-display text-xl font-bold leading-snug cursor-pointer hover:text-teal-300 transition-colors"
                                >
                                  {course.title}
                                </h3>

                                <p className="text-xs academy-text-secondary line-clamp-2 leading-relaxed">
                                  {course.description}
                                </p>

                                {/* Automatic Local Country Timezone Class Schedule */}
                                <div className="pt-1 flex items-center gap-1.5 text-xs text-teal-300 font-mono-tabular">
                                  <Globe className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">
                                    {course.classDays || 'Sat & Wed'} ·{' '}
                                    {convertedClassTime.formattedLocalTime} ({detectedTz})
                                  </span>
                                </div>

                                {/* Enrollment Rate & Student Capacity Progress Bar */}
                                <div className="pt-2 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs font-mono-tabular">
                                    <span className="flex items-center gap-1.5 academy-text-secondary">
                                      <Users className="w-3.5 h-3.5 text-teal-400" />
                                      <span>
                                        <strong className="text-white">
                                          {studentsTaken}/{maxStudents}
                                        </strong>{' '}
                                        Students
                                      </span>
                                    </span>
                                    <span
                                      className={`font-semibold ${
                                        isCourseFull ? 'text-rose-400' : 'text-teal-400'
                                      }`}
                                    >
                                      {enrollmentRate}% Enrolled{' '}
                                      {isCourseFull ? '(Limit Reached)' : ''}
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-500 ${
                                        isCourseFull ? 'bg-rose-500' : 'bg-teal-400'
                                      }`}
                                      style={{ width: `${enrollmentRate}%` }}
                                    />
                                  </div>
                                </div>

                                {/* All Recordings Free for Everyone to Watch */}
                                <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular">
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>{courseLessons.length} Recordings · Free for Everyone</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer Actions: Every recording is free for everyone to watch */}
                            <div className="p-6 pt-0 space-y-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setWatchingCourse(course)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Watch Free Recordings</span>
                                </button>
                                {!isEnrolled && course.enrollmentStatus !== 'coming_soon' && !isCourseFull && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEnrollWizard(course)}
                                    className="py-2.5 px-3.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap cursor-pointer"
                                  >
                                    Enroll ({course.price || 'Free'})
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setWatchingCourse(course)}
                                  className="flex items-center gap-1 py-2.5 px-3 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400/50 transition-colors whitespace-nowrap cursor-pointer"
                                  title="View full syllabus and module breakdown"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                                  <span>Syllabus</span>
                                </button>
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </motion.div>
                  ) : (
                    /* Blank State when all courses are cleared or filtered */
                    <div className="rounded-xl academy-surface p-10 text-center border border-dashed border-teal-500/30 space-y-4">
                      <h3 className="font-display text-xl font-bold">
                        Course Catalog Ready for Your Custom Curriculum
                      </h3>
                      <p className="text-xs academy-text-secondary max-w-md mx-auto">
                        Add your own courses, syllabus boxes, student capacity limits, lesson
                        recordings, and live Zoom sessions as Principal Faculty Mustaqeem Shaikh.
                      </p>
                      {isAdmin && (
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setAdminInitialModule('courses');
                              setActiveView('admin');
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap"
                          >
                            <Plus className="w-4 h-4" />
                            <span>+ Add First Course in Admin Portal</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.section>

                {/* MASTER ACADEMY CALENDAR SECTION ON HOMEPAGE */}
                {activeView === 'home' && (
                  <motion.section
                    id="calendar-section"
                    variants={sectionRevealVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    className="border-t academy-divider py-12 lg:py-16"
                  >
                    <div className="max-w-[1650px] w-full mx-auto px-4 sm:px-6 lg:px-10">
                      <InteractiveCalendar
                        courses={courses}
                        events={events}
                        lessons={lessons}
                        enrolledCourseIds={enrolledCourseIds}
                        isAdmin={Boolean(isAdmin)}
                        calendarSettings={calendarSettings}
                        onUpdateCalendarSettings={handleUpdateCalendarSettings}
                        onEnrollCourse={handleEnrollCourse}
                        onOpenWatchCourse={(courseId) => {
                          const target = courses.find((c) => c.id === courseId);
                          if (target) setWatchingCourse(target);
                        }}
                        onOpenAdminSchedule={() => {
                          setAdminInitialModule('zoom_calendar');
                          setActiveView('admin');
                        }}
                      />
                    </div>
                  </motion.section>
                )}

                {/* PRINCIPAL FACULTY SPOTLIGHT: USTADH MUSTAQEEM SHAIKH ("MS" Monogram or Custom Uploaded Portrait) */}
                {activeView === 'home' && (
                  <motion.section
                    variants={sectionRevealVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    className="border-t academy-divider py-12 lg:py-16"
                  >
                    <div className="max-w-7xl mx-auto px-6 lg:px-10">
                      <div className="rounded-xl academy-surface p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center backdrop-blur-sm bg-opacity-90">
                        {/* Left 4 Columns: "MS" Monogram Emblem or Custom Uploaded Image */}
                        <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-3">
                          {founderProfile?.avatarUrl ? (
                            <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl overflow-hidden border-2 border-teal-400 shadow-2xl">
                              <img
                                src={founderProfile.avatarUrl}
                                alt="Ustadh Mustaqeem Shaikh"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-gradient-to-br from-[#0A2239] via-[#061527] to-[#040B14] border-2 border-teal-400/70 shadow-[0_0_50px_rgba(45,212,191,0.18)] flex flex-col items-center justify-center select-none">
                              <span className="font-display text-6xl sm:text-7xl font-bold tracking-wider bg-gradient-to-br from-teal-300 via-cyan-200 to-amber-300 bg-clip-text text-transparent">
                                MS
                              </span>
                              <span className="text-[11px] font-mono-tabular uppercase tracking-widest text-teal-400/90 mt-2">
                                Mustaqeem Shaikh
                              </span>
                            </div>
                          )}

                          {isAdmin && (
                            <div className="flex items-center gap-2 pt-1">
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400 text-teal-300">
                                <Upload className="w-3.5 h-3.5" />
                                <span>
                                  {uploadingFacultyPhoto ? 'Uploading...' : 'Upload Portrait'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingFacultyPhoto(true);
                                    try {
                                      const url = await uploadMediaFile(file);
                                      const res = await authFetch('/api/admin/founder-avatar', {
                                        method: 'PUT',
                                        body: JSON.stringify({ avatarUrl: url }),
                                      });
                                      if (res.ok) {
                                        await handleRefreshAll();
                                        showToast('Updated Mustaqeem Shaikh portrait!');
                                      }
                                    } finally {
                                      setUploadingFacultyPhoto(false);
                                    }
                                  }}
                                />
                              </label>
                              {founderProfile?.avatarUrl && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await authFetch('/api/admin/founder-avatar', {
                                      method: 'PUT',
                                      body: JSON.stringify({ avatarUrl: null }),
                                    });
                                    if (res.ok) {
                                      await handleRefreshAll();
                                      showToast('Reverted to "MS" monogram.');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-xs academy-elevated text-rose-300 hover:border-rose-400/50"
                                >
                                  Use &ldquo;MS&rdquo;
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-8 space-y-4">
                          <div className="text-xs font-medium text-teal-400">
                            Principal Faculty &amp; Academic Director
                          </div>
                          <h2 className="font-display text-2xl sm:text-3xl font-bold">
                            Ustadh Mustaqeem Shaikh
                          </h2>
                          <p className="text-sm academy-text-secondary leading-relaxed max-w-2xl">
                            Dedicated to reviving classical Islamic scholarship with contemporary
                            pedagogical clarity. Through structured syllabi, interactive weekly Zoom
                            seminars, and primary-source textual analysis, Deen Hijrah Academia
                            equips students globally with authentic sacred knowledge.
                          </p>
                          <div className="pt-2 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveView('dashboard')}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Chat with Tutor &amp; Submit Homework</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveView('calendar')}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400/50 transition-colors whitespace-nowrap"
                            >
                              <CalendarIcon className="w-3.5 h-3.5 text-teal-400" />
                              <span>View Live Orientation &amp; Local Class Times</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Clean Academic Footer with Logo Emblem */}
        <footer className="border-t academy-divider academy-surface mt-16 backdrop-blur-md bg-opacity-95">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b academy-divider">
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center gap-3">
                  <AcademyLogo size="md" />
                  <div className="font-display text-lg font-bold text-teal-400">
                    Deen Hijrah Academia
                  </div>
                </div>
                <p className="text-xs academy-text-secondary max-w-sm leading-relaxed">
                  Sacred knowledge and spiritual elevation through structured online curricula, live
                  Zoom classrooms, and faculty mentorship led by Ustadh Mustaqeem Shaikh.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSplash(true)}
                  className="text-[11px] font-medium text-teal-400 hover:underline"
                >
                  Replay Academy Emblem Intro Animation
                </button>
              </div>

              <div className="md:col-span-3 space-y-2 text-xs">
                <div className="font-semibold text-teal-400">Portal Navigation</div>
                <ul className="space-y-1.5 academy-text-secondary">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setWatchingCourse(null);
                        setActiveView('home');
                      }}
                      className="hover:text-teal-300"
                    >
                      Home &amp; Media Showcase
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setWatchingCourse(null);
                        setActiveView('courses');
                      }}
                      className="hover:text-teal-300"
                    >
                      Course Catalog &amp; Syllabi
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setWatchingCourse(null);
                        setActiveView('faculty');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-teal-300"
                    >
                      Our Faculty &amp; Academic Council
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setWatchingCourse(null);
                        setActiveView('calendar');
                      }}
                      className="hover:text-teal-300"
                    >
                      Global Timezone Calendar
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setWatchingCourse(null);
                        setActiveView('dashboard');
                      }}
                      className="hover:text-teal-300"
                    >
                      Student Dashboard, Tutor Chat &amp; Homework
                    </button>
                  </li>
                  {profile?.role === 'instructor' && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setWatchingCourse(null);
                          setAdminInitialModule('lessons');
                          setActiveView('admin');
                        }}
                        className="hover:text-teal-300 text-teal-400 font-medium"
                      >
                        Teacher Studio (Upload Recordings)
                      </button>
                    </li>
                  )}
                  {profile?.role === 'admin' && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setWatchingCourse(null);
                          setActiveView('admin');
                        }}
                        className="hover:text-teal-300 text-amber-300 font-medium"
                      >
                        Academy Admin Portal (/admin)
                      </button>
                    </li>
                  )}
                </ul>
              </div>

              <div className="md:col-span-4 space-y-2">
                <div className="text-xs font-semibold text-teal-400">
                  Academic Term Dispatch &amp; Orientation Alerts
                </div>
                <p className="text-xs academy-text-secondary">
                  Receive notifications when new course cohorts and live orientation sessions are
                  scheduled on the calendar.
                </p>
                {newsletterSubscribed ? (
                  <div className="text-xs text-teal-400 font-medium pt-1">
                    JazakAllahu Khayran — You are subscribed to Academy Term Alerts.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newsletterEmail.trim()) {
                        setNewsletterSubscribed(true);
                        setNewsletterEmail('');
                      }
                    }}
                    className="flex items-center gap-2 pt-1"
                  >
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email..."
                      className="flex-1 px-3 py-2 text-xs rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 whitespace-nowrap"
                    >
                      Subscribe
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs academy-text-muted">
              <span>
                © {new Date().getFullYear()} Deen Hijrah Academia · Principal Faculty: Mustaqeem
                Shaikh
              </span>
              <span>Dark Navy &amp; Turquoise Edition · Global Timezone Auto-Conversion</span>
            </div>
          </div>
        </footer>
      </motion.div>

      {/* 4-Step Official Admissions & Enrollment Process Modal */}
      {enrollingCourse && (
        <CourseEnrollmentModal
          course={enrollingCourse}
          profile={profile}
          isOpen={Boolean(enrollingCourse)}
          onClose={() => setEnrollingCourse(null)}
          onCompleteEnrollment={async (courseId, enrollmentData) => {
            await handleEnrollCourse(courseId, enrollmentData);
          }}
          onOpenClassroom={(courseId) => {
            const c = courses.find((item) => item.id === courseId);
            if (c) {
              setEnrollingCourse(null);
              setWatchingCourse(c);
            }
          }}
          onOpenDashboard={() => {
            setEnrollingCourse(null);
            setActiveView('dashboard');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AcademyPortalContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
