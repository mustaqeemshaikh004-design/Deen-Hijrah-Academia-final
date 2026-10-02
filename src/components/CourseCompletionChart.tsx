import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { BarChart3, Play, CheckCircle2, ArrowRight, BookOpen } from 'lucide-react';
import { Course, Enrollment, Lesson } from '../types.ts';

interface CourseCompletionChartProps {
  courses: Course[];
  enrolledCourses: Course[];
  enrollments: Enrollment[];
  lessons: Lesson[];
  onWatchCourse: (course: Course) => void;
  onEnrollCourse: (courseId: number) => Promise<void>;
  onToggleLessonProgress?: (courseId: number, lessonId: number) => Promise<void>;
}

interface ChartDataItem {
  courseId: number;
  shortTitle: string;
  fullTitle: string;
  category: string;
  instructorName: string;
  completionPercentage: number;
  completedLessons: number;
  totalLessons: number;
  isEnrolled: boolean;
  nextLessonId: number | null;
  nextLessonTitle: string | null;
  courseObj: Course;
}

function parseCompletedIds(raw: string | undefined | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter((n) => !Number.isNaN(n));
    }
  } catch {
    // ignore
  }
  return [];
}

export const CourseCompletionChart: React.FC<CourseCompletionChartProps> = ({
  courses,
  enrolledCourses,
  enrollments,
  lessons,
  onWatchCourse,
  onEnrollCourse,
  onToggleLessonProgress,
}) => {
  const [chartScope, setChartScope] = useState<'enrolled' | 'all'>('enrolled');
  const [updatingCourseId, setUpdatingCourseId] = useState<number | null>(null);

  const effectiveScope = enrolledCourses.length === 0 ? 'all' : chartScope;

  const chartData: ChartDataItem[] = useMemo(() => {
    const targetList = effectiveScope === 'enrolled' ? enrolledCourses : courses;

    return targetList.map((course, idx) => {
      const enrollment = enrollments.find((e) => e.courseId === course.id);
      const isEnrolled = Boolean(enrollment) || enrolledCourses.some((c) => c.id === course.id);
      const completedIds = parseCompletedIds(enrollment?.completedLessonIds);
      const courseLessons = lessons
        .filter((l) => l.courseId === course.id)
        .sort((a, b) => a.positionOrder - b.positionOrder || a.id - b.id);

      const totalLessons = courseLessons.length;
      const completedLessons = completedIds.length;
      const completionPercentage =
        enrollment?.progressPercentage ??
        (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);

      const nextIncompleteLesson =
        courseLessons.find((l) => !completedIds.includes(l.id)) || null;

      // Create a concise single-line axis label
      const categoryHead = course.category.split(' ')[0] || `Course ${idx + 1}`;
      const shortTitle =
        course.title.length > 22 ? `${course.title.slice(0, 20).trim()}…` : course.title;

      return {
        courseId: course.id,
        shortTitle: `0${idx + 1}. ${categoryHead}`,
        fullTitle: shortTitle,
        category: course.category,
        instructorName: course.instructorName,
        completionPercentage,
        completedLessons,
        totalLessons,
        isEnrolled,
        nextLessonId: nextIncompleteLesson?.id ?? null,
        nextLessonTitle: nextIncompleteLesson?.title ?? null,
        courseObj: course,
      };
    });
  }, [effectiveScope, enrolledCourses, courses, enrollments, lessons]);

  const averageCompletion = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, item) => acc + item.completionPercentage, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  const handleAdvanceNextLesson = async (item: ChartDataItem) => {
    if (!onToggleLessonProgress || !item.nextLessonId) return;
    setUpdatingCourseId(item.courseId);
    try {
      await onToggleLessonProgress(item.courseId, item.nextLessonId);
    } finally {
      setUpdatingCourseId(null);
    }
  };

  return (
    <section
      aria-label="Enrolled Course Completion Percentage Bar Chart"
      className="rounded-xl academy-surface border border-teal-500/30 p-6 lg:p-7 space-y-6"
    >
      {/* Header & Interactive Scope Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b academy-divider">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-teal-400 font-medium">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Quantitative Curriculum Analytics</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Average Completion: <strong className="text-emerald-400">{averageCompletion}%</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Enrolled Courses: <strong className="text-teal-300">{enrolledCourses.length}</strong>
            </span>
          </div>
          <h2 className="font-display text-xl lg:text-2xl font-bold">
            Course Completion Percentage Across Enrolled Courses
          </h2>
          <p className="text-xs academy-text-secondary max-w-2xl">
            Visual comparison of your lecture completion percentage across each enrolled course,
            supplementing your Path of Knowledge roadmap. Click any bar to open that course&apos;s
            classroom.
          </p>
        </div>

        {/* Interactive Filter Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg academy-elevated shrink-0">
          <button
            type="button"
            onClick={() => setChartScope('enrolled')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap font-mono-tabular ${
              effectiveScope === 'enrolled'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            Enrolled Courses ({enrolledCourses.length})
          </button>
          <button
            type="button"
            onClick={() => setChartScope('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap font-mono-tabular ${
              effectiveScope === 'all'
                ? 'bg-teal-400 text-slate-950 font-semibold'
                : 'academy-text-secondary hover:text-teal-300'
            }`}
          >
            All Academy Courses ({courses.length})
          </button>
        </div>
      </div>

      {enrolledCourses.length === 0 && (
        <div className="p-4 rounded-lg academy-elevated border border-teal-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs academy-text-secondary">
            <strong className="text-teal-300">No Enrolled Courses Yet:</strong> Showing all Academy
            courses at 0% baseline. Enroll in any course below to begin tracking your live
            completion percentage on the bar chart.
          </div>
          {courses[0] && (
            <button
              type="button"
              onClick={() => onEnrollCourse(courses[0].id)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors whitespace-nowrap shrink-0"
            >
              Enroll in {courses[0].category.split(' ')[0]}
            </button>
          )}
        </div>
      )}

      {/* Main 12-Col Layout: Left 7 Cols Recharts BarChart + Right 5 Cols Course Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Recharts BarChart Container */}
        <div className="lg:col-span-7 rounded-xl academy-elevated p-4 sm:p-5 border border-teal-500/20 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono-tabular academy-text-secondary">
            <span>Y-Axis: Completion Percentage (0% – 100%)</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 inline-block" />
                <span>100% Mastered</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-400 inline-block" />
                <span>In Progress</span>
              </span>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 16, right: 20, left: 0, bottom: 12 }}
                barCategoryGap="28%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(45, 212, 191, 0.12)"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortTitle"
                  tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.25)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.25)' }}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(45, 212, 191, 0.07)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as ChartDataItem;
                    return (
                      <div className="rounded-lg academy-surface border border-teal-400/50 p-3.5 shadow-xl space-y-1.5 text-xs">
                        <div className="text-teal-400 font-semibold">{item.category}</div>
                        <div className="font-display text-sm font-bold text-white">
                          {item.courseObj.title}
                        </div>
                        <div className="font-mono-tabular text-emerald-400 font-semibold">
                          Completion: {item.completionPercentage}% ({item.completedLessons}/
                          {item.totalLessons} Modules)
                        </div>
                        <div className="text-[11px] academy-text-secondary">
                          Instructor: Ustadh {item.instructorName} ·{' '}
                          {item.isEnrolled ? 'Enrolled' : 'Not Enrolled'}
                        </div>
                      </div>
                    );
                  }}
                />
                {averageCompletion > 0 && (
                  <ReferenceLine
                    y={averageCompletion}
                    stroke="#34D399"
                    strokeDasharray="4 4"
                    label={{
                      value: `Avg ${averageCompletion}%`,
                      position: 'right',
                      fill: '#34D399',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                )}
                <Bar
                  dataKey="completionPercentage"
                  name="Completion %"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={64}
                  onClick={(barData: any) => {
                    const courseObj = barData?.courseObj || barData?.payload?.courseObj;
                    if (courseObj) {
                      onWatchCourse(courseObj as Course);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {chartData.map((entry) => {
                    const fill =
                      entry.completionPercentage >= 100
                        ? '#34D399'
                        : entry.completionPercentage > 0
                        ? '#2DD4BF'
                        : entry.isEnrolled
                        ? '#0D9488'
                        : '#334155';
                    return <Cell key={`cell-${entry.courseId}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t academy-divider flex flex-wrap items-center justify-between gap-2 text-[11px] academy-text-secondary font-mono-tabular">
            <span>Tip: Hover any bar for module breakdown or click a bar to open recordings</span>
            <span>Scale: 0% to 100% Curriculum Mastery</span>
          </div>
        </div>

        {/* Right 5 Cols: Interactive Tabular Breakdown & Quick Module Completion */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            {chartData.map((item) => (
              <div
                key={item.courseId}
                className="p-4 rounded-xl academy-elevated border border-teal-500/20 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-teal-400 font-mono-tabular">
                      {item.shortTitle} · {item.isEnrolled ? '● ENROLLED' : '○ UNENROLLED'}
                    </div>
                    <h3 className="font-display text-sm font-bold text-white truncate">
                      {item.courseObj.title}
                    </h3>
                  </div>
                  <div className="text-right font-mono-tabular shrink-0">
                    <div className="text-sm font-bold text-emerald-400">
                      {item.completionPercentage}%
                    </div>
                    <div className="text-[11px] academy-text-secondary">
                      {item.completedLessons}/{item.totalLessons} Modules
                    </div>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      item.completionPercentage >= 100 ? 'bg-emerald-400' : 'bg-teal-400'
                    }`}
                    style={{ width: `${Math.max(4, item.completionPercentage)}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {item.isEnrolled ? (
                    <>
                      {item.nextLessonId && onToggleLessonProgress ? (
                        <button
                          type="button"
                          disabled={updatingCourseId === item.courseId}
                          onClick={() => handleAdvanceNextLesson(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {updatingCourseId === item.courseId
                              ? 'Updating Chart...'
                              : 'Complete Next Module'}
                          </span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>All Modules Completed</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onWatchCourse(item.courseObj)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:underline whitespace-nowrap"
                      >
                        <Play className="w-3 h-3" />
                        <span>Open Course</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEnrollCourse(item.courseId)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:underline whitespace-nowrap"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Enroll to Track Progress</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
