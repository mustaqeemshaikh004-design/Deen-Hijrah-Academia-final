export type UserRole = 'student' | 'instructor' | 'admin';

export interface Profile {
  id: number;
  uid: string;
  fullName: string;
  email: string;
  password?: string;
  role: UserRole;
  title?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface SyllabusBox {
  week: string;
  title: string;
  topics: string;
  deliverable?: string;
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  thumbnailUrl: string;
  category: string;
  price: string;
  duration: string;
  status: 'draft' | 'published';
  instructorId?: number | null;
  instructorName: string;
  launchDate?: string | null;
  maxStudents: number;
  initialEnrolledCount: number;
  syllabusText?: string | null;
  syllabusBoxes: string; // JSON stringified SyllabusBox[]
  syllabusFileUrl?: string | null;
  classDays?: string | null;
  classStartTime?: string | null;
  classTimezone?: string | null;
  createdAt?: string;
}

export interface Lesson {
  id: number;
  courseId: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration: string;
  positionOrder: number;
  isFreePreview: boolean; // True = Orientation Recording (publicly viewable); False = Class Recording (Enrolled students ONLY)
  attachmentUrl?: string | null;
  scheduledDate?: string | null;
  createdAt?: string;
}

export interface Enrollment {
  id: number;
  studentId: number;
  courseId: number;
  progressPercentage: number;
  completedLessonIds: string; // JSON stringified number[]
  enrolledAt?: string;
}

export interface CourseEvent {
  id: number;
  courseId?: number | null;
  title: string;
  description: string;
  eventType: 'zoom_session' | 'orientation' | 'course_launch' | 'recording_release';
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  sourceTimezone: string; // IANA timezone e.g. 'America/New_York'
  duration: string;
  zoomJoinUrl?: string | null;
  zoomMeetingId?: string | null;
  zoomPasscode?: string | null;
  thumbnailUrl?: string | null;
  instructorName: string;
  isPublic: boolean;
  createdAt?: string;
}

export interface HomepageSlide {
  id: number;
  title: string;
  subtitle: string;
  mediaType: 'image' | 'video';
  badgeText: string;
  thumbnailUrl: string;
  videoUrl?: string | null;
  ctaText: string;
  ctaLink: string;
  instructorName: string;
  positionOrder: number;
  createdAt?: string;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  subject: string;
  body: string;
  readStatus: boolean;
  createdAt?: string;
}

export type HomeworkGradeStatus =
  | 'submitted'
  | 'under_review'
  | 'needs_revision'
  | 'graded'
  | 'exemplary';

export interface HomeworkSubmission {
  id: number;
  courseId: number;
  lessonId?: number | null;
  studentId: number;
  studentName: string;
  title: string;
  content: string;
  attachmentUrl?: string | null;
  status: HomeworkGradeStatus;
  grade?: string | null;
  feedback?: string | null;
  submittedAt?: string;
}
