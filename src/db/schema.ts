import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull().default('deen123'),
  role: text('role').notNull().default('student'), // 'student' | 'instructor' | 'admin'
  title: text('title').default('Scholar Student'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  longDescription: text('long_description').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  category: text('category').notNull(),
  price: text('price').notNull().default('0'),
  duration: text('duration').notNull().default('8 Weeks'),
  status: text('status').notNull().default('published'), // 'draft' | 'published'
  instructorId: integer('instructor_id').references(() => profiles.id),
  instructorName: text('instructor_name').notNull().default('Mustaqeem Shaikh'),
  launchDate: text('launch_date'), // YYYY-MM-DD
  maxStudents: integer('max_students').notNull().default(25),
  initialEnrolledCount: integer('initial_enrolled_count').notNull().default(0),
  syllabusText: text('syllabus_text'),
  syllabusBoxes: text('syllabus_boxes').notNull().default('[]'), // JSON string of SyllabusBox[]
  syllabusFileUrl: text('syllabus_file_url'),
  classDays: text('class_days').default('Saturday & Wednesday'),
  classStartTime: text('class_start_time').default('14:00'), // 24h HH:mm in sourceTimezone
  classTimezone: text('class_timezone').default('America/New_York'),
  enrollmentStatus: text('enrollment_status').default('open'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  duration: text('duration').notNull().default('45:00'),
  positionOrder: integer('position_order').notNull().default(1),
  isFreePreview: boolean('is_free_preview').notNull().default(false), // True = Orientation Recording (publicly viewable); False = Class Recording (Enrolled students ONLY)
  attachmentUrl: text('attachment_url'),
  scheduledDate: text('scheduled_date'), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow(),
});

export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => profiles.id)
    .notNull(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  progressPercentage: integer('progress_percentage').notNull().default(0),
  completedLessonIds: text('completed_lesson_ids').notNull().default('[]'),
  enrolledAt: timestamp('enrolled_at').defaultNow(),
});

export const courseEvents = pgTable('course_events', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  eventType: text('event_type').notNull().default('zoom_session'), // 'zoom_session' | 'orientation' | 'course_launch' | 'recording_release'
  eventDate: text('event_date').notNull(), // YYYY-MM-DD
  startTime: text('start_time').notNull().default('14:00'), // HH:mm (24h) or display string
  sourceTimezone: text('source_timezone').notNull().default('America/New_York'),
  duration: text('duration').notNull().default('60 min'),
  zoomJoinUrl: text('zoom_join_url'),
  zoomMeetingId: text('zoom_meeting_id'),
  zoomPasscode: text('zoom_passcode'),
  thumbnailUrl: text('thumbnail_url'),
  instructorName: text('instructor_name').notNull().default('Mustaqeem Shaikh'),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const homepageSlides = pgTable('homepage_slides', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  mediaType: text('media_type').notNull().default('image'), // 'image' | 'video'
  badgeText: text('badge_text').notNull().default('Orientation Session'), // 'Featured Course' | 'Highlight Recording' | 'Orientation Session'
  thumbnailUrl: text('thumbnail_url').notNull(),
  videoUrl: text('video_url'),
  ctaText: text('cta_text').notNull().default('Explore Program'),
  ctaLink: text('cta_link').notNull().default('#courses'),
  instructorName: text('instructor_name').notNull().default('Mustaqeem Shaikh'),
  positionOrder: integer('position_order').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id')
    .references(() => profiles.id)
    .notNull(),
  receiverId: integer('receiver_id')
    .references(() => profiles.id)
    .notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  readStatus: boolean('read_status').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const homeworkSubmissions = pgTable('homework_submissions', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  lessonId: integer('lesson_id').references(() => lessons.id),
  studentId: integer('student_id')
    .references(() => profiles.id)
    .notNull(),
  studentName: text('student_name').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  attachmentUrl: text('attachment_url'),
  status: text('status').notNull().default('submitted'), // 'submitted' | 'graded'
  grade: text('grade'),
  feedback: text('feedback'),
  submittedAt: timestamp('submitted_at').defaultNow(),
});

export const mediaUploads = pgTable('media_uploads', {
  id: serial('id').primaryKey(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  dataUrl: text('data_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(profiles, {
    fields: [courses.instructorId],
    references: [profiles.id],
  }),
  lessons: many(lessons),
  enrollments: many(enrollments),
  events: many(courseEvents),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(profiles, {
    fields: [enrollments.studentId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const courseEventsRelations = relations(courseEvents, ({ one }) => ({
  course: one(courses, {
    fields: [courseEvents.courseId],
    references: [courses.id],
  }),
}));
