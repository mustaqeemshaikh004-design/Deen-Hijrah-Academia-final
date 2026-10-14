import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  BookOpen,
  Download,
  Calendar,
  Clock,
  Globe,
  FileText,
  Video,
  Play,
  Users,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Course, Lesson, SyllabusBox } from '../types.ts';
import { resolveThumbnailUrl, ACADEMY_ASSETS } from '../lib/assets.ts';
import { convertClassTimeToRegion, getDetectedUserTimezone } from '../lib/timezone.ts';

interface CourseDetailsModalProps {
  course: Course | null;
  lessons: Lesson[];
  isEnrolled: boolean;
  onClose: () => void;
  onWatchCourse: (course: Course) => void;
  onEnrollCourse?: (course: Course) => void;
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  course,
  lessons,
  isEnrolled,
  onClose,
  onWatchCourse,
  onEnrollCourse,
}) => {
  if (!course) return null;

  const detectedTz = getDetectedUserTimezone();
  const courseLessons = lessons.filter((l) => l.courseId === course.id);

  // Parse structured syllabus boxes
  let parsedBoxes: SyllabusBox[] = [];
  try {
    if (course.syllabusBoxes) {
      const parsed = JSON.parse(course.syllabusBoxes);
      if (Array.isArray(parsed)) {
        parsedBoxes = parsed;
      }
    }
  } catch {}

  // Filter lessons that actually have teacher-uploaded attachments (Strictly NO ugly dummy files!)
  const teacherUploadedLessonFiles = courseLessons
    .filter((l) => l.attachmentUrl && l.attachmentUrl.trim() && !l.attachmentUrl.includes('dummy'))
    .map((l) => ({
      lessonTitle: l.title,
      fileUrl: l.attachmentUrl!,
      lessonId: l.id,
    }));

  const convertedClassTime = convertClassTimeToRegion(
    course.launchDate,
    course.classStartTime || '14:00',
    course.classTimezone || 'America/New_York',
    detectedTz
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl academy-surface border border-teal-500/30 shadow-2xl overflow-hidden bg-[#071324] z-10"
        >
          {/* Header Bar */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-r from-teal-950/80 via-slate-900 to-[#071324] border-b academy-divider flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-400/15 text-teal-300 border border-teal-500/30">
                  {course.category}
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-300 font-medium">
                  Faculty: <strong className="text-white">{course.instructorName}</strong>
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-emerald-400 font-bold">
                  {course.price || 'Free'}
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
                {course.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 sm:p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Overview & Schedule Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    Course Description &amp; Objectives
                  </h3>
                  <p className="text-sm academy-text-secondary leading-relaxed">
                    {course.longDescription || course.description}
                  </p>
                </div>

                {course.syllabusText && (
                  <div className="p-4 rounded-xl bg-teal-950/20 border border-teal-500/20 text-xs text-teal-200 leading-relaxed space-y-1">
                    <strong className="text-teal-300 block">Faculty Syllabus Overview:</strong>
                    <p>{course.syllabusText}</p>
                  </div>
                )}
              </div>

              {/* Schedule and Quick Metadata Card */}
              <div className="p-5 rounded-xl academy-elevated border border-slate-800 space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 block">Class Schedule (Local):</span>
                  <div className="flex items-center gap-1.5 text-teal-300 font-bold font-mono-tabular">
                    <Globe className="w-4 h-4 text-teal-400" />
                    <span>
                      {course.classDays || 'Sat & Wed'} · {convertedClassTime.formattedLocalTime}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Region: {detectedTz}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Program Duration:</span>
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>{course.duration}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Available Recordings:</span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Play className="w-4 h-4" />
                    <span>{courseLessons.length} Class Recordings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SYLLABUS SECTION */}
            <div className="space-y-4 pt-4 border-t academy-divider">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-400" />
                    <span>Curriculum Syllabus</span>
                  </h3>
                  <p className="text-xs academy-text-secondary">
                    Weekly scholarly modules and topics outlined by faculty.
                  </p>
                </div>

                {/* If instructor uploaded a Syllabus Document / PDF */}
                {course.syllabusFileUrl && (
                  <a
                    href={course.syllabusFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Syllabus (PDF)</span>
                  </a>
                )}
              </div>

              {/* Modular Syllabus Boxes */}
              {parsedBoxes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parsedBoxes.map((box, bIdx) => (
                    <div
                      key={bIdx}
                      className="p-4 rounded-xl academy-elevated border border-slate-800/80 hover:border-teal-500/40 transition-colors space-y-2 bg-[#061224]"
                    >
                      <div className="flex items-center justify-between text-[11px] text-teal-400 font-mono-tabular font-bold">
                        <span>{box.week}</span>
                      </div>
                      <h4 className="font-semibold text-sm text-white">{box.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{box.topics}</p>
                      {box.deliverable && (
                        <div className="pt-1 text-[11px] text-amber-300/90 font-medium">
                          <strong>Deliverable:</strong> {box.deliverable}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl academy-elevated text-xs text-slate-400">
                  {course.syllabusText ||
                    'Weekly syllabus outline will be detailed during orientation and live class meetings.'}
                </div>
              )}
            </div>

            {/* TEACHER UPLOADED FILES & HANDOUTS */}
            <div className="space-y-4 pt-4 border-t academy-divider">
              <div>
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>Teacher Uploaded Files &amp; Resources</span>
                </h3>
                <p className="text-xs academy-text-secondary">
                  Downloadable handouts, slides, and references added by faculty for this course.
                </p>
              </div>

              {teacherUploadedLessonFiles.length > 0 || course.syllabusFileUrl ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.syllabusFileUrl && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl academy-elevated border border-teal-500/30 bg-[#061224]">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-teal-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">Course Syllabus Document</div>
                          <div className="text-[10px] text-slate-400">Official Course Overview</div>
                        </div>
                      </div>
                      <a
                        href={course.syllabusFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-teal-400/10 text-teal-300 hover:bg-teal-400/20 text-xs font-semibold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  )}

                  {teacherUploadedLessonFiles.map((file, fIdx) => (
                    <div
                      key={fIdx}
                      className="flex items-center justify-between p-3.5 rounded-xl academy-elevated border border-slate-800 bg-[#061224]"
                    >
                      <div className="flex items-center gap-3 truncate mr-2">
                        <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-white truncate">
                            {file.lessonTitle} Resource
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Class Attachment
                          </div>
                        </div>
                      </div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-teal-400/10 text-teal-300 hover:bg-teal-400/20 text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                  No supplementary files uploaded by the instructor for this course yet. All primary course readings are detailed in the syllabus modules above.
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 sm:p-6 bg-slate-950/80 border-t academy-divider flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Course Status:
              </span>
              <span className="text-xs font-bold text-teal-400">
                {isEnrolled ? 'Enrolled Student ✓' : 'Open for Learning'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onWatchCourse(course);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Watch Class Recordings</span>
              </button>

              {!isEnrolled && onEnrollCourse && course.enrollmentStatus !== 'coming_soon' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEnrollCourse(course);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-all cursor-pointer shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Enroll ({course.price || 'Free'})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold academy-elevated hover:bg-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
