import React, { useState, useRef } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  GraduationCap,
  Mail,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Upload,
  UserPlus,
  Video,
  ArrowRight,
} from 'lucide-react';
import { Course, Lesson, Profile } from '../types.ts';
import {
  WORLD_TIMEZONES,
  convertClassTimeToRegion,
  getDetectedUserTimezone,
} from '../lib/timezone.ts';
import { smartApiFetch } from '../lib/fallbackStore.ts';

interface FacultyPageProps {
  profile: Profile | null;
  founderProfile: Profile | undefined;
  profiles: Profile[];
  courses: Course[];
  lessons: Lesson[];
  isAdmin: boolean;
  onWatchCourse: (course: Course) => void;
  onOpenCalendar: () => void;
  onOpenDashboard: () => void;
  onOpenTeacherStudio: () => void;
  onUploadFile: (file: File) => Promise<string>;
  onFacultyJoined: (sessionToken: string | null, updatedProfile: Profile) => Promise<void>;
}

const FACULTY_COUNTRIES = [
  { country: 'United States', defaultTz: 'America/New_York' },
  { country: 'United Kingdom', defaultTz: 'Europe/London' },
  { country: 'Canada', defaultTz: 'America/Toronto' },
  { country: 'Saudi Arabia', defaultTz: 'Asia/Riyadh' },
  { country: 'United Arab Emirates', defaultTz: 'Asia/Dubai' },
  { country: 'Egypt', defaultTz: 'Africa/Cairo' },
  { country: 'Turkey', defaultTz: 'Europe/Istanbul' },
  { country: 'Pakistan', defaultTz: 'Asia/Karachi' },
  { country: 'Malaysia', defaultTz: 'Asia/Kuala_Lumpur' },
  { country: 'Indonesia', defaultTz: 'Asia/Jakarta' },
  { country: 'South Africa', defaultTz: 'Africa/Johannesburg' },
  { country: 'Australia', defaultTz: 'Australia/Sydney' },
  { country: 'Germany', defaultTz: 'Europe/Berlin' },
  { country: 'France', defaultTz: 'Europe/Paris' },
];

export const FacultyPage: React.FC<FacultyPageProps> = ({
  profile,
  founderProfile,
  profiles,
  courses,
  lessons,
  isAdmin,
  onWatchCourse,
  onOpenCalendar,
  onOpenDashboard,
  onOpenTeacherStudio,
  onUploadFile,
  onFacultyJoined,
}) => {
  const detectedTz = getDetectedUserTimezone();
  const joinFormRef = useRef<HTMLDivElement | null>(null);

  // Join Our Faculty Form State
  const [fullName, setFullName] = useState(
    profile && profile.role !== 'admin' ? profile.fullName : ''
  );
  const [email, setEmail] = useState(
    profile && profile.role !== 'admin' ? profile.email : ''
  );
  const [password, setPassword] = useState('deen123');
  const [scholarlyTitle, setScholarlyTitle] = useState(
    'Course Instructor · Classical Islamic Sciences'
  );
  const [country, setCountry] = useState('United States');
  const [timezone, setTimezone] = useState(detectedTz || 'America/New_York');
  const [courseAssignmentMode, setCourseAssignmentMode] = useState<'existing' | 'new'>(
    courses.length > 0 ? 'existing' : 'new'
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number>(courses[0]?.id || 1);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('Tajweed & Quranic Sciences');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [classDays, setClassDays] = useState('Sunday & Thursday');
  const [classStartTime, setClassStartTime] = useState('15:00');
  const [resumeUrl, setResumeUrl] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [credentialsBio, setCredentialsBio] = useState('');
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [joinedSuccessData, setJoinedSuccessData] = useState<{
    instructorName: string;
    courseTitle: string;
  } | null>(null);

  const scrollToJoinForm = () => {
    joinFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Courses taught by Principal Faculty Ustadh Mustaqeem Shaikh
  const founderCourses = courses.filter(
    (c) =>
      !c.instructorId ||
      c.instructorId === founderProfile?.id ||
      c.instructorName.toLowerCase().includes('mustaqeem')
  );

  // Other joined faculty instructors (role === 'instructor')
  const joinedInstructors = profiles.filter(
    (p) =>
      p.role === 'instructor' &&
      p.uid !== 'founder-mustaqeem-shaikh' &&
      p.email.toLowerCase() !== 'mustaqeemshaikh004@gmail.com'
  );

  const handleCountryChange = (nextCountry: string) => {
    setCountry(nextCountry);
    const match = FACULTY_COUNTRIES.find((c) => c.country === nextCountry);
    if (match) {
      setTimezone(match.defaultTz);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    setApplicationError(null);
    try {
      const uploadedUrl = await onUploadFile(file);
      setResumeUrl(uploadedUrl);
    } catch {
      // Fallback local file descriptor if unauthenticated upload fails
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setResumeUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleJoinFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplicationError(null);

    const cleanName = fullName.trim() || profile?.fullName || '';
    const cleanEmail = email.trim().toLowerCase() || profile?.email || '';

    if (!cleanName || !cleanEmail) {
      setApplicationError('Please provide your full name and email address.');
      return;
    }

    if (courseAssignmentMode === 'new' && !newCourseTitle.trim()) {
      setApplicationError('Please enter the title of the course you will teach.');
      return;
    }

    setSubmittingApplication(true);
    try {
      const res = await smartApiFetch('/api/faculty/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password: password.trim() || 'deen123',
          title: `${scholarlyTitle.trim()} (${country})`,
          country,
          timezone,
          courseMode: courseAssignmentMode,
          courseId: courseAssignmentMode === 'existing' ? Number(selectedCourseId) : null,
          newCourseTitle: newCourseTitle.trim(),
          newCourseCategory: newCourseCategory.trim(),
          newCourseDescription: newCourseDescription.trim() || credentialsBio.trim(),
          classDays: classDays.trim() || 'Sunday & Thursday',
          classStartTime: classStartTime || '15:00',
          resumeUrl: resumeUrl.trim() || null,
          credentialsBio: credentialsBio.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.profile) {
        throw new Error(data.error || 'Could not complete teacher registration.');
      }

      await onFacultyJoined(data.sessionToken || null, data.profile as Profile);
      setJoinedSuccessData({
        instructorName: data.profile.fullName,
        courseTitle: data.assignedCourse?.title || newCourseTitle.trim() || 'Assigned Course',
      });
    } catch (err: any) {
      setApplicationError(err.message || 'Failed to submit faculty application.');
    } finally {
      setSubmittingApplication(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 space-y-12">
      {/* Top Page Header with Direct "Join Our Faculty" CTA */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b academy-divider">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-teal-400">
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Deen Hijrah Academia · Scholarly Directorate &amp; Faculty</span>
            <span aria-hidden="true">·</span>
            <span>Led by Founder &amp; Principal Faculty Ustadh Mustaqeem Shaikh</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-balance">
            Our Faculty &amp; Scholarly Mentors
          </h1>
          <p className="text-sm academy-text-secondary max-w-3xl leading-relaxed">
            Meet our Principal Faculty and Founder, Ustadh Mustaqeem Shaikh, alongside our course
            instructors. Qualified scholars and educators may apply below to join our faculty and
            receive dedicated Teacher Studio access to upload recordings for their assigned courses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={scrollToJoinForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Join Our Faculty</span>
          </button>
          {(profile?.role === 'instructor' || isAdmin) && (
            <button
              type="button"
              onClick={onOpenTeacherStudio}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold academy-elevated border border-teal-500/40 text-teal-300 hover:border-teal-400 transition-colors whitespace-nowrap"
            >
              <Video className="w-4 h-4" />
              <span>{isAdmin ? 'Open Admin Portal' : 'Open My Teacher Studio'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: PRINCIPAL FACULTY & FOUNDER SPOTLIGHT — USTADH MUSTAQEEM SHAIKH */}
      <section
        aria-label="Principal Faculty and Founder Ustadh Mustaqeem Shaikh"
        className="rounded-xl academy-surface border border-teal-500/35 p-6 sm:p-8 lg:p-10 space-y-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 4 Columns: Portrait / MS Emblem & Founder Authority Badge */}
          <div className="lg:col-span-4 flex flex-col items-center text-center space-y-4">
            {founderProfile?.avatarUrl ? (
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-3xl overflow-hidden border-2 border-teal-400 shadow-2xl">
                <img
                  src={founderProfile.avatarUrl}
                  alt="Ustadh Mustaqeem Shaikh — Founder & Principal Faculty"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-3xl bg-gradient-to-br from-[#0A2239] via-[#061527] to-[#040B14] border-2 border-teal-400/80 shadow-[0_0_50px_rgba(45,212,191,0.18)] flex flex-col items-center justify-center select-none">
                <span className="font-display text-6xl sm:text-7xl font-bold tracking-wider bg-gradient-to-br from-teal-300 via-cyan-200 to-amber-300 bg-clip-text text-transparent">
                  MS
                </span>
                <span className="text-xs font-mono-tabular uppercase tracking-widest text-teal-400 mt-2">
                  Mustaqeem Shaikh
                </span>
                <span className="text-[11px] academy-text-secondary mt-0.5">
                  Founder &amp; Principal Faculty
                </span>
              </div>
            )}

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Sole Academy Administrator &amp; Director</span>
              </div>
              <p className="text-[11px] academy-text-secondary max-w-xs">
                All curriculum standards, academy-wide administration, and sanad verifications are
                overseen directly by Ustadh Mustaqeem Shaikh.
              </p>
            </div>
          </div>

          {/* Right 8 Columns: Full Biography, Specializations & Courses Taught by Ustadh Mustaqeem Shaikh */}
          <div className="lg:col-span-8 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-teal-400 font-medium">
                <span>Founder &amp; Principal Faculty</span>
                <span aria-hidden="true">·</span>
                <span>Chair of Seerah, Classical Arabic &amp; Usul al-Fiqh</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Ustadh Mustaqeem Shaikh
              </h2>
              <p className="text-sm academy-text-secondary leading-relaxed">
                Ustadh Mustaqeem Shaikh is the Founder, Principal Faculty, and Academic Director of
                Deen Hijrah Academia. His teaching methodology bridges classical Islamic textual
                traditions with structured modern academic pedagogy—guiding students through
                analytical Seerah chronicles, Quranic morphology and Balaghah (rhetoric), and the
                foundational legal maxims of Usul al-Fiqh.
              </p>
              <p className="text-sm academy-text-secondary leading-relaxed">
                Through weekly live Zoom seminars, primary-source folio readings, and personalized
                written feedback on student submissions, Ustadh Mustaqeem mentors seekers of
                knowledge across North America, Europe, the Middle East, and Asia.
              </p>
            </div>

            {/* Key Academic Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-lg academy-elevated border border-teal-500/25 space-y-1">
                <div className="text-xs font-semibold text-teal-300">
                  01. Prophetic Seerah &amp; History
                </div>
                <p className="text-[11px] academy-text-secondary">
                  Primary-source historiography, Meccan &amp; Medinan chronology, and constitutional
                  analysis.
                </p>
              </div>
              <div className="p-3.5 rounded-lg academy-elevated border border-teal-500/25 space-y-1">
                <div className="text-xs font-semibold text-teal-300">
                  02. Classical Arabic &amp; Balaghah
                </div>
                <p className="text-[11px] academy-text-secondary">
                  Nahw (syntax), Sarf (morphology), and rhetorical analysis of classical texts.
                </p>
              </div>
              <div className="p-3.5 rounded-lg academy-elevated border border-teal-500/25 space-y-1">
                <div className="text-xs font-semibold text-teal-300">
                  03. Usul al-Fiqh &amp; Maxims
                </div>
                <p className="text-[11px] academy-text-secondary">
                  Principles of sacred jurisprudence, Maqasid al-Shariah, and Qawa&lsquo;id
                  Fiqhiyyah.
                </p>
              </div>
            </div>

            {/* Courses Led by Ustadh Mustaqeem Shaikh */}
            {founderCourses.length > 0 && (
              <div className="pt-2 space-y-2.5">
                <div className="text-xs font-semibold text-teal-400">
                  Courses Taught by Ustadh Mustaqeem Shaikh ({founderCourses.length}):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {founderCourses.map((course) => {
                    const converted = convertClassTimeToRegion(
                      course.launchDate,
                      course.classStartTime || '14:00',
                      course.classTimezone || 'America/New_York',
                      detectedTz
                    );
                    const lessonCount = lessons.filter((l) => l.courseId === course.id).length;
                    return (
                      <div
                        key={course.id}
                        className="p-3.5 rounded-lg academy-elevated border border-teal-500/20 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-bold text-white truncate">
                            {course.title}
                          </div>
                          <div className="text-[11px] academy-text-secondary font-mono-tabular truncate">
                            {course.classDays || 'Sat & Wed'} · {converted.formattedLocalTime} ·{' '}
                            {lessonCount} Recordings
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onWatchCourse(course)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shrink-0"
                        >
                          Open Course
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Message Ustadh Mustaqeem Shaikh</span>
              </button>
              <button
                type="button"
                onClick={onOpenCalendar}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium academy-elevated hover:border-teal-400/50 transition-colors whitespace-nowrap"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>View Office Hours &amp; Seminar Schedule</span>
              </button>
              <button
                type="button"
                onClick={scrollToJoinForm}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold academy-surface border border-teal-500/35 text-teal-300 hover:border-teal-400 transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Apply to Join Our Faculty</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: DEPARTMENT INSTRUCTORS & VISITING COURSE TEACHERS */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-teal-400">
              Course Instructors · Scoped Teacher Studio Access
            </div>
            <h2 className="font-display text-2xl font-bold mt-0.5">
              Joined Course Teachers ({joinedInstructors.length})
            </h2>
            <p className="text-xs academy-text-secondary mt-0.5">
              Each course teacher holds scoped Teacher Studio permissions to upload recordings and
              manage syllabi exclusively for the courses they teach.
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToJoinForm}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:underline whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Join Our Faculty as a Course Teacher</span>
          </button>
        </div>

        {joinedInstructors.length === 0 ? (
          <div className="rounded-xl academy-surface p-6 border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white">
                Applications Open for Visiting Course Instructors
              </div>
              <p className="text-xs academy-text-secondary max-w-2xl">
                Ustadh Mustaqeem Shaikh currently leads all primary courses. Use the &ldquo;Join Our
                Faculty&rdquo; form below to register as a teacher for a specific course and receive
                instant Teacher Studio access to upload your class recordings.
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToJoinForm}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shrink-0"
            >
              Join Our Faculty Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {joinedInstructors.map((teacher) => {
              const teacherCourses = courses.filter(
                (c) =>
                  c.instructorId === teacher.id ||
                  c.instructorName.trim().toLowerCase() === teacher.fullName.trim().toLowerCase()
              );
              const initials = teacher.fullName
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={teacher.id}
                  className="rounded-xl academy-surface p-6 border border-teal-500/25 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-teal-400/50 flex items-center justify-center font-display text-lg font-bold text-teal-300 shrink-0">
                        {initials || 'TR'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-teal-400 font-medium truncate">
                          {teacher.title || 'Course Instructor'}
                        </div>
                        <h3 className="font-display text-lg font-bold text-white truncate">
                          {teacher.fullName}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t academy-divider">
                      <div className="text-[11px] font-semibold text-teal-300">
                        Assigned Courses ({teacherCourses.length}):
                      </div>
                      {teacherCourses.length === 0 ? (
                        <p className="text-xs academy-text-secondary">
                          Assigned curriculum track pending schedule publication.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {teacherCourses.map((tc) => (
                            <div
                              key={tc.id}
                              className="p-2.5 rounded-lg academy-elevated flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-medium text-white truncate">{tc.title}</span>
                              <button
                                type="button"
                                onClick={() => onWatchCourse(tc)}
                                className="text-teal-400 hover:underline text-[11px] font-semibold shrink-0"
                              >
                                View Course
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {profile?.id === teacher.id && (
                    <button
                      type="button"
                      onClick={onOpenTeacherStudio}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Recordings for My Course</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: INTERACTIVE "JOIN OUR FACULTY" APPLICATION & COURSE ASSIGNMENT FORM */}
      <section
        ref={joinFormRef}
        id="join-faculty-form"
        className="rounded-xl academy-surface border border-teal-500/35 p-6 sm:p-8 lg:p-10 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b academy-divider">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-teal-400">
              <UserPlus className="w-4 h-4" />
              <span>Teacher Onboarding &amp; Scoped Course Access</span>
            </div>
            <h2 className="font-display text-2xl font-bold">
              Join Our Faculty — Teacher Application &amp; Course Assignment Form
            </h2>
            <p className="text-xs sm:text-sm academy-text-secondary max-w-3xl">
              Complete the form below with your course selection, preferred class schedule, country
              timezone, and resume/CV. Once joined as a teacher, you will immediately receive
              <strong> Teacher Studio access</strong> to upload class recordings and manage syllabi
              <strong> exclusively for the courses you teach</strong> (full Academy Admin privileges
              remain solely with Founder Ustadh Mustaqeem Shaikh).
            </p>
          </div>

          <div className="p-3.5 rounded-lg academy-elevated border border-teal-500/25 text-xs space-y-1 shrink-0 max-w-xs">
            <div className="font-semibold text-teal-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Role &amp; Access Policy</span>
            </div>
            <p className="text-[11px] academy-text-secondary leading-relaxed">
              Teachers get upload &amp; management access <strong>only</strong> for their assigned
              courses. Global Admin access stays strictly with Ustadh Mustaqeem Shaikh.
            </p>
          </div>
        </div>

        {joinedSuccessData && (
          <div className="p-5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  MashaAllah, {joinedSuccessData.instructorName}! You have joined the Faculty as the
                  Teacher for &ldquo;{joinedSuccessData.courseTitle}&rdquo;.
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenTeacherStudio}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Open My Teacher Studio to Upload Recordings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs academy-text-secondary">
              Your account now has scoped Teacher access for{' '}
              <strong className="text-white">{joinedSuccessData.courseTitle}</strong>. Click
              &ldquo;Open My Teacher Studio&rdquo; above (or &ldquo;Teacher Studio&rdquo; in the top
              navigation bar) to upload orientation or class recordings for your course.
            </p>
          </div>
        )}

        {applicationError && (
          <div className="p-3.5 rounded-lg bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200 font-medium">
            {applicationError}
          </div>
        )}

        <form onSubmit={handleJoinFacultySubmit} className="space-y-6">
          {/* Row 1: Identity & Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs academy-text-secondary mb-1">
                Full Name &amp; Honorific *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ustadh Tariq Al-Misri"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs academy-text-secondary mb-1">
                Faculty / Teacher Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. tariq@deenhijrah.edu or gmail.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs academy-text-secondary mb-1">
                Teacher Account Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create or confirm password"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {/* Row 2: Country, Timezone & Scholarly Title */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs academy-text-secondary mb-1">
                Country of Residence *
              </label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
              >
                {FACULTY_COUNTRIES.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs academy-text-secondary mb-1">
                Teaching Timezone (Auto-Synced for Students) *
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400 font-mono-tabular"
              >
                {WORLD_TIMEZONES.map((w) => (
                  <option key={w.tz} value={w.tz}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs academy-text-secondary mb-1">
                Scholarly Title / Department *
              </label>
              <input
                type="text"
                required
                value={scholarlyTitle}
                onChange={(e) => setScholarlyTitle(e.target.value)}
                placeholder="e.g. Instructor of Tajweed & Qira'at"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {/* Row 3: Which Course They Will Teach & Preferred Class Schedule */}
          <div className="p-5 rounded-xl academy-elevated border border-teal-500/25 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-teal-300">
                  Course Selection &amp; Weekly Teaching Schedule
                </div>
                <p className="text-[11px] academy-text-secondary">
                  Select which course you are joining to teach. You will receive Teacher Studio
                  access to upload recordings specifically for this course.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg academy-surface shrink-0">
                <button
                  type="button"
                  onClick={() => setCourseAssignmentMode('existing')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    courseAssignmentMode === 'existing'
                      ? 'bg-teal-400 text-slate-950 font-semibold'
                      : 'academy-text-secondary hover:text-teal-300'
                  }`}
                >
                  Teach an Existing Course
                </button>
                <button
                  type="button"
                  onClick={() => setCourseAssignmentMode('new')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    courseAssignmentMode === 'new'
                      ? 'bg-teal-400 text-slate-950 font-semibold'
                      : 'academy-text-secondary hover:text-teal-300'
                  }`}
                >
                  + Propose &amp; Teach New Course
                </button>
              </div>
            </div>

            {courseAssignmentMode === 'existing' ? (
              <div>
                <label className="block text-xs academy-text-secondary mb-1">
                  Select Academy Course to Teach *
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-surface border border-teal-500/30 focus:outline-none focus:border-teal-400"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    New Course Title You Will Teach *
                  </label>
                  <input
                    type="text"
                    required={courseAssignmentMode === 'new'}
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g. Sciences of Tajweed & Recitation Mastery"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-surface border border-teal-500/30 focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Course Subject Category *
                  </label>
                  <input
                    type="text"
                    required={courseAssignmentMode === 'new'}
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value)}
                    placeholder="e.g. Quranic Sciences, Hadith, Fiqh"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-surface border border-teal-500/30 focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs academy-text-secondary mb-1">
                    Course Syllabus Overview / Description
                  </label>
                  <input
                    type="text"
                    value={newCourseDescription}
                    onChange={(e) => setNewCourseDescription(e.target.value)}
                    placeholder="Brief overview of weekly modules, primary texts, and student outcomes..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-surface border border-teal-500/30 focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs academy-text-secondary mb-1">
                  Preferred Weekly Class Days *
                </label>
                <input
                  type="text"
                  required
                  value={classDays}
                  onChange={(e) => setClassDays(e.target.value)}
                  placeholder="e.g. Sunday & Thursday or Saturday & Wednesday"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-surface border border-teal-500/30 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs academy-text-secondary mb-1">
                  Preferred Class Start Time (24h in {timezone}) *
                </label>
                <input
                  type="time"
                  required
                  value={classStartTime}
                  onChange={(e) => setClassStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-surface border border-teal-500/30 focus:outline-none focus:border-teal-400 font-mono-tabular"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Resume / CV Upload & Scholarly Qualifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs academy-text-secondary mb-1">
                Upload Resume / CV or Ijazah Certificate (PDF, DOC, Image, or Link) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="Upload your Resume/CV file or paste link ->"
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                />
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold academy-elevated border border-teal-500/35 text-teal-300 hover:border-teal-400 whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingResume ? 'Uploading...' : 'Upload Resume'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,image/*"
                    className="hidden"
                    onChange={handleResumeUpload}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs academy-text-secondary mb-1">
                Academic Background, Ijazahs &amp; Teaching Experience *
              </label>
              <input
                type="text"
                required
                value={credentialsBio}
                onChange={(e) => setCredentialsBio(e.target.value)}
                placeholder="Summarize your degrees, traditional ijazahs, and prior teaching experience..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs academy-text-secondary">
              Upon submission, your teacher profile will be activated for your selected course so
              you can immediately upload class recordings.
            </div>
            <button
              type="submit"
              disabled={submittingApplication}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>
                {submittingApplication
                  ? 'Activating Teacher Access...'
                  : 'Submit Application & Activate Course Teacher Access'}
              </span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
