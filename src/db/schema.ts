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

export const lessonComments = pgTable('lesson_comments', {
  id: serial('id').primaryKey(),
  lessonId: integer('lesson_id')
    .references(() => lessons.id)
    .notNull(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  authorId: integer('author_id')
    .references(() => profiles.id)
    .notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull().default('student'), // 'student' | 'instructor' | 'admin'
  authorAvatar: text('author_avatar'),
  parentId: integer('parent_id'), // null for top-level, or id of parent comment for replies
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').references(() => courses.id), // null if general academy announcement
  instructorId: integer('instructor_id')
    .references(() => profiles.id)
    .notNull(),
  instructorName: text('instructor_name').notNull().default('Mustaqeem Shaikh'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  priority: text('priority').notNull().default('normal'), // 'normal' | 'important'
  createdAt: timestamp('created_at').defaultNow(),
});

export const roleApplications = pgTable('role_applications', {
  id: serial('id').primaryKey(),
  applicantId: integer('applicant_id')
    .references(() => profiles.id)
    .notNull(),
  applicantName: text('applicant_name').notNull(),
  applicantEmail: text('applicant_email').notNull(),
  requestedRole: text('requested_role').notNull().default('instructor'), // 'instructor' | 'admin'
  reason: text('reason').notNull(),
  credentialsBio: text('credentials_bio'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp('created_at').defaultNow(),
});

export const classSurveys = pgTable('class_surveys', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  lessonId: integer('lesson_id').references(() => lessons.id),
  studentId: integer('student_id')
    .references(() => profiles.id)
    .notNull(),
  studentName: text('student_name').notNull(),
  instructorId: integer('instructor_id').references(() => profiles.id),
  rating: text('rating').notNull(), // 'satisfactory' | 'unsatisfactory'
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const studentArticles = pgTable('student_articles', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => profiles.id)
    .notNull(),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  authorRole: text('author_role').notNull().default('student'),
  title: text('title').notNull(),
  category: text('category').notNull().default('Islamic Studies'),
  abstract: text('abstract'),
  content: text('content').notNull(),
  attachmentUrl: text('attachment_url'),
  readTime: text('read_time').default('5 min read'),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const courseAttendance = pgTable('course_attendance', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => profiles.id)
    .notNull(),
  courseId: integer('course_id')
    .references(() => courses.id)
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('present'), // 'present' | 'absent' | 'late'
  joinedAt: timestamp('joined_at').defaultNow(),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
  comments: many(lessonComments),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(profiles, {
    fields: [courses.instructorId],
    references: [profiles.id],
  }),
  lessons: many(lessons),
  enrollments: many(enrollments),
  events: many(courseEvents),
  comments: many(lessonComments),
  announcements: many(announcements),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  comments: many(lessonComments),
}));

export const lessonCommentsRelations = relations(lessonComments, ({ one }) => ({
  lesson: one(lessons, {
    fields: [lessonComments.lessonId],
    references: [lessons.id],
  }),
  author: one(profiles, {
    fields: [lessonComments.authorId],
    references: [profiles.id],
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
