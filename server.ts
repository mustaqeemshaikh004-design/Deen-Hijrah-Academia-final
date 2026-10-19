import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  getOrCreateProfile,
  registerEduStudentAccount,
  authenticateAccount,
  getAllProfiles,
  updateProfileRole,
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getAllLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  getAllEnrollments,
  enrollStudent,
  updateEnrollmentProgress,
  deleteEnrollment,
  getAllCourseEvents,
  createCourseEvent,
  updateCourseEvent,
  deleteCourseEvent,
  getAllHomepageSlides,
  createHomepageSlide,
  updateHomepageSlide,
  deleteHomepageSlide,
  getMessagesForProfile,
  getAllMessages,
  createMessage,
  markMessageRead,
  getAllHomeworkSubmissions,
  getHomeworkForStudent,
  createHomeworkSubmission,
  gradeHomeworkSubmission,
  createMediaUpload,
  getMediaUploadById,
  clearAllContentToBlank,
  getCommentsForLesson,
  createLessonComment,
  getAllAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getAllRoleApplications,
  createRoleApplication,
  updateRoleApplicationStatus,
  getClassSurveysForCourse,
  createClassSurvey,
  getAllStudentArticles,
  createStudentArticle,
  deleteStudentArticle,
  getStudentAttendanceForCourse,
  logStudentAttendance,
} from './src/db/queries.ts';
import { ensureInitialAcademySetup } from './src/db/seed.ts';

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Ensure public/uploads directory exists on disk for fast, lightweight video and document streaming
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Accept-Ranges', 'bytes');
    },
  })
);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

let initialSeedChecked = false;

// Strict Admin/Instructor RBAC Middleware: Students cannot access or perform any admin/teacher actions
const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || 'student@deenhijrah.edu';
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized: Missing user identity' });
    }
    const profile = await getOrCreateProfile(uid, email);
    if (profile.role !== 'admin' && profile.role !== 'instructor') {
      return res
        .status(403)
        .json({ error: 'Forbidden: Students cannot access the Teacher/Admin Portal or modify academy content.' });
    }
    (req as any).currentProfile = profile;
    next();
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Authorization check failed' });
  }
};

// Strict Founder-Only Admin Middleware: Only Founder Mustaqeem Shaikh (role === 'admin') can access global admin actions
const requireStrictFounderAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || 'student@deenhijrah.edu';
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized: Missing user identity' });
    }
    const profile = await getOrCreateProfile(uid, email);
    if (profile.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden: Full Admin access belongs exclusively to Founder Mustaqeem Shaikh.' });
    }
    (req as any).currentProfile = profile;
    next();
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Authorization check failed' });
  }
};

async function verifyTeacherCourseOwnership(profile: any, courseId: number): Promise<boolean> {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.role !== 'instructor') return false;
  const allCourses = await getAllCourses();
  const target = allCourses.find((c) => c.id === Number(courseId));
  if (!target) return false;
  return (
    target.instructorId === profile.id ||
    target.instructorName.trim().toLowerCase() === profile.fullName.trim().toLowerCase()
  );
}

let globalCalendarSettings = {
  defaultTimezone: 'America/New_York',
  defaultViewMode: 'expanded_month' as const,
  defaultCategoryFilter: 'all',
  defaultCourseFilter: 'all',
  allowPublicZoom: true,
  showWeekends: true,
  announcementTitle: 'Academy Master Schedule & Global Converted Timezones',
  announcementText: 'All class times, orientations, and live Zoom webinars automatically convert to your local region.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Academy Administration',
};

function formatCourseWithTags(c: any) {
  if (!c) return c;
  const status = c.enrollmentStatus || 'open';
  let tags: string[] = [];
  let cleanStatus = 'open';
  if (typeof status === 'string' && status.includes('::tags:')) {
    const parts = status.split('::tags:');
    cleanStatus = parts[0] || 'open';
    try {
      tags = JSON.parse(parts[1]);
    } catch {
      tags = [];
    }
  } else {
    cleanStatus = status;
    if (status === 'live') tags = ['Live Cohort', 'Open for Enrollment'];
    else if (status === 'coming_soon') tags = ['Coming Soon'];
    else tags = ['Open for Enrollment'];
  }
  return {
    ...c,
    enrollmentStatus: cleanStatus,
    tags: Array.isArray(tags) && tags.length > 0 ? tags : ['Open for Enrollment'],
  };
}

function encodeTagsInStatus(enrollmentStatus?: string | null, tagsInput?: any): string {
  const baseRaw = enrollmentStatus ? String(enrollmentStatus) : 'open';
  const base = baseRaw.includes('::tags:') ? baseRaw.split('::tags:')[0] : baseRaw;
  const cleanBase = base === 'live' || base === 'coming_soon' || base === 'open' ? base : 'open';

  let finalTags: string[] = [];
  if (Array.isArray(tagsInput)) {
    finalTags = tagsInput.filter(Boolean).map(String);
  } else if (typeof tagsInput === 'string' && tagsInput.trim()) {
    try {
      const parsed = JSON.parse(tagsInput);
      if (Array.isArray(parsed)) finalTags = parsed.filter(Boolean).map(String);
      else finalTags = [tagsInput.trim()];
    } catch {
      finalTags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  if (finalTags.length === 0) {
    if (cleanBase === 'live') finalTags = ['Live Cohort'];
    else if (cleanBase === 'coming_soon') finalTags = ['Coming Soon'];
    else finalTags = ['Open for Enrollment'];
  }
  return `${cleanBase}::tags:${JSON.stringify(finalTags)}`;
}

// Public endpoint to load portal courses, lessons, public events, homepage media slides, and faculty list
app.get('/api/portal-data', async (_req, res) => {
  try {
    if (!initialSeedChecked) {
      try {
        await ensureInitialAcademySetup(false);
      } catch (setupErr) {
        console.warn('Initial setup check warning:', setupErr);
      }
      initialSeedChecked = true;
    }

    const [
      coursesList,
      lessonsList,
      eventsList,
      slidesList,
      profilesList,
      enrollmentsList,
      announcementsList,
      applicationsList,
    ] = await Promise.all([
      getAllCourses(),
      getAllLessons(),
      getAllCourseEvents(),
      getAllHomepageSlides(),
      getAllProfiles(),
      getAllEnrollments(),
      getAllAnnouncements(),
      getAllRoleApplications(),
    ]);

    const sanitizedProfiles = profilesList.map((p) => ({
      ...p,
      email:
        p.role === 'admin' || p.uid === 'founder-mustaqeem-shaikh'
          ? 'faculty@deenhijrah.edu'
          : p.email,
    }));

    res.json({
      courses: coursesList.map(formatCourseWithTags),
      lessons: lessonsList,
      events: eventsList,
      slides: slidesList.map((s) => ({
        ...s,
        videoUrl:
          s.videoUrl && s.videoUrl.includes('commondatastorage.googleapis.com')
            ? s.id === 2 || String(s.title).toLowerCase().includes('seerah')
              ? '/uploads/hero-seerah.mp4'
              : '/uploads/hero-orientation.mp4'
            : s.videoUrl || '/uploads/hero-orientation.mp4',
      })),
      profiles: sanitizedProfiles,
      enrollments: enrollmentsList,
      announcements: announcementsList,
      roleApplications: applicationsList,
      calendarSettings: globalCalendarSettings,
    });
  } catch (error: any) {
    console.error('Failed to load portal data:', error);
    res.status(500).json({ error: error.message || 'Failed to load portal data' });
  }
});

// Academy Global Calendar Settings (Saved and synchronized for all students, visitors and admins)
app.get('/api/calendar/settings', (_req, res) => {
  res.json(globalCalendarSettings);
});

app.post('/api/calendar/settings', requireAuth, requireAdmin, (req: AuthRequest, res) => {
  try {
    const currentProfile = (req as any).currentProfile;
    const body = req.body || {};
    globalCalendarSettings = {
      defaultTimezone: body.defaultTimezone ? String(body.defaultTimezone) : globalCalendarSettings.defaultTimezone,
      defaultViewMode: body.defaultViewMode || globalCalendarSettings.defaultViewMode,
      defaultCategoryFilter: body.defaultCategoryFilter || globalCalendarSettings.defaultCategoryFilter,
      defaultCourseFilter: body.defaultCourseFilter || globalCalendarSettings.defaultCourseFilter,
      allowPublicZoom: body.allowPublicZoom !== undefined ? Boolean(body.allowPublicZoom) : globalCalendarSettings.allowPublicZoom,
      showWeekends: body.showWeekends !== undefined ? Boolean(body.showWeekends) : globalCalendarSettings.showWeekends,
      announcementTitle: body.announcementTitle !== undefined ? String(body.announcementTitle) : globalCalendarSettings.announcementTitle,
      announcementText: body.announcementText !== undefined ? String(body.announcementText) : globalCalendarSettings.announcementText,
      updatedAt: new Date().toISOString(),
      updatedBy: currentProfile?.fullName || 'Academy Administration',
    };
    res.json(globalCalendarSettings);
  } catch (error: any) {
    console.error('Failed to save calendar settings:', error);
    res.status(500).json({ error: error.message || 'Failed to save calendar settings' });
  }
});

// Step 1 of Student Registration: Automatic .edu or Custom Email Account Creator
app.post('/api/auth/create-edu-account', async (req, res) => {
  try {
    const { firstName, lastName, password, email } = req.body;
    if ((!firstName || !String(firstName).trim()) && (!email || !String(email).trim())) {
      return res
        .status(400)
        .json({ error: 'Please enter your first name or email address to create your account.' });
    }
    const created = await registerEduStudentAccount(
      String(firstName || ''),
      String(lastName || ''),
      password ? String(password) : 'deen123',
      email ? String(email) : undefined
    );
    const sessionToken = `academy-session:${created.uid}:${created.email}:${encodeURIComponent(
      created.fullName
    )}`;
    const sanitizedProfile = {
      ...created,
      email: created.role === 'admin' ? 'faculty@deenhijrah.edu' : created.email,
    };
    res.json({
      sessionToken,
      profile: sanitizedProfile,
      account: {
        id: created.id,
        fullName: created.fullName,
        email: sanitizedProfile.email,
        password: created.password || 'deen123',
        role: created.role,
      },
    });
  } catch (error: any) {
    console.error('Error creating .edu account:', error);
    res.status(400).json({ error: error.message || 'Failed to create .edu account' });
  }
});

// Step 2: Sign In with .edu Account (or private Faculty Admin credentials)
app.post('/api/auth/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: 'Email is required to sign in.' });
    }
    const profile = await authenticateAccount(
      String(email),
      String(password || 'deen123')
    );
    const sessionToken = `academy-session:${profile.uid}:${profile.email}:${encodeURIComponent(
      profile.fullName
    )}`;
    res.json({
      sessionToken,
      profile: {
        ...profile,
        email:
          profile.role === 'admin' ? 'faculty@deenhijrah.edu' : profile.email,
      },
    });
  } catch (error: any) {
    console.error('Error signing in:', error);
    res.status(401).json({ error: error.message || 'Invalid credentials' });
  }
});

// Step 3: Sign In or Register with Google Auth (recognizes normal users as students so they can immediately enroll)
app.post('/api/auth/google', async (req, res) => {
  try {
    const { uid, email, fullName, avatarUrl } = req.body;
    const rawEmail = String(email || '').trim().toLowerCase();
    if (!rawEmail) {
      return res.status(400).json({ error: 'Google email is required.' });
    }
    const cleanEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@gmail.com`;
    const effectiveUid =
      cleanEmail === 'mustaqeemshaikh004@gmail.com' ||
      cleanEmail === 'faculty@deenhijrah.edu'
        ? 'founder-mustaqeem-shaikh'
        : String(uid || '').trim() ||
          `google-${cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '') || 'user'}`;

    const profile = await getOrCreateProfile(
      effectiveUid,
      cleanEmail,
      fullName ? String(fullName).trim() : undefined,
      avatarUrl ? String(avatarUrl) : undefined
    );
    const sessionToken = `academy-session:${profile.uid}:${profile.email}:${encodeURIComponent(
      profile.fullName
    )}`;
    res.json({
      sessionToken,
      profile: {
        ...profile,
        email:
          profile.role === 'admin' ? 'faculty@deenhijrah.edu' : profile.email,
      },
    });
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    res.status(500).json({ error: error.message || 'Failed to sign in with Google' });
  }
});

// Join Our Faculty: Register as a Course Teacher (role = 'instructor', scoped strictly to their assigned course; never grants full 'admin')
app.post('/api/faculty/join', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      title,
      country,
      timezone,
      courseMode,
      courseId,
      newCourseTitle,
      newCourseCategory,
      newCourseDescription,
      classDays,
      classStartTime,
      resumeUrl,
      credentialsBio,
    } = req.body;

    const cleanName = String(fullName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanName || !cleanEmail) {
      return res.status(400).json({ error: 'Full name and email are required to join our faculty.' });
    }

    const nameParts = cleanName.split(/\s+/);
    const firstName = nameParts[0] || cleanName;
    const lastName = nameParts.slice(1).join(' ');

    const baseProfile = await registerEduStudentAccount(
      firstName,
      lastName,
      password ? String(password) : 'deen123',
      cleanEmail
    );

    // Keep Founder Mustaqeem Shaikh as 'admin'; all other teachers get 'instructor' (NOT 'admin')
    const nextRole = baseProfile.role === 'admin' ? 'admin' : 'instructor';
    const nextTitle =
      String(title || '').trim() || `Course Instructor (${country || 'Global Faculty'})`;

    const teacherProfile = await updateProfileRole(
      baseProfile.id,
      nextRole,
      nextTitle,
      cleanName,
      undefined
    );

    let assignedCourse = null;
    const allCourses = await getAllCourses();

    if (courseMode === 'existing' && courseId) {
      const targetCourse = allCourses.find((c) => c.id === Number(courseId));
      if (targetCourse) {
        assignedCourse = await updateCourse(targetCourse.id, {
          instructorId: teacherProfile.id,
          instructorName: teacherProfile.fullName,
          classDays: classDays ? String(classDays) : targetCourse.classDays,
          classStartTime: classStartTime ? String(classStartTime) : targetCourse.classStartTime,
          classTimezone: timezone ? String(timezone) : targetCourse.classTimezone,
        });
      }
    }

    if (!assignedCourse) {
      const effectiveTitle =
        String(newCourseTitle || '').trim() || `${cleanName} — Sacred Knowledge Seminar`;
      const slug =
        effectiveTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString().slice(-4);

      assignedCourse = await createCourse({
        title: effectiveTitle,
        slug,
        description:
          String(newCourseDescription || credentialsBio || '').trim() ||
          `Led by ${teacherProfile.fullName} (${nextTitle}).`,
        longDescription:
          String(newCourseDescription || credentialsBio || '').trim() ||
          `Structured curriculum led by ${teacherProfile.fullName}.`,
        thumbnailUrl: 'preset:arabic',
        category: String(newCourseCategory || 'Islamic Studies').trim(),
        price: 'Free',
        duration: '8 Weeks',
        status: 'published',
        instructorId: teacherProfile.id,
        instructorName: teacherProfile.fullName,
        launchDate: new Date().toISOString().slice(0, 10),
        maxStudents: 30,
        initialEnrolledCount: 0,
        syllabusText: null,
        syllabusBoxes: JSON.stringify([
          {
            week: 'Module 01 · Weeks 1–2',
            title: 'Foundations & Primary Textual Methodology',
            topics:
              String(newCourseDescription || credentialsBio || '').trim() ||
              'Introduction to core texts, principles, and weekly seminar readings.',
            deliverable: 'Module 1 Reflection',
          },
        ]),
        syllabusFileUrl: resumeUrl ? String(resumeUrl) : null,
        classDays: String(classDays || 'Sunday & Thursday'),
        classStartTime: String(classStartTime || '15:00'),
        classTimezone: String(timezone || 'America/New_York'),
      });
    }

    // Notify Founder Mustaqeem Shaikh via Academy Inbox
    const allProfilesList = await getAllProfiles();
    const founder =
      allProfilesList.find(
        (p) =>
          p.uid === 'founder-mustaqeem-shaikh' ||
          p.email.toLowerCase() === 'mustaqeemshaikh004@gmail.com' ||
          p.role === 'admin'
      ) || allProfilesList[0];

    if (founder) {
      await createMessage({
        senderId: teacherProfile.id,
        receiverId: founder.id,
        subject: `[FACULTY_APPLICATION] ${teacherProfile.fullName} — Course: ${assignedCourse.title}`,
        body: `Assalamu alaykum Mustaqeem Shaikh,\n\n${teacherProfile.fullName} (${cleanEmail}) has joined the faculty as the Course Teacher for "${assignedCourse.title}".\n• Country & Timezone: ${country || 'N/A'} (${timezone || 'America/New_York'})\n• Class Schedule: ${classDays || 'Sun & Thu'} at ${classStartTime || '15:00'}\n• Qualifications / Bio: ${credentialsBio || 'Provided'}\n• Resume / CV: ${resumeUrl ? 'Uploaded / Attached' : 'Included in bio'}`,
        readStatus: false,
      });
    }

    const sessionToken = `academy-session:${teacherProfile.uid}:${teacherProfile.email}:${encodeURIComponent(
      teacherProfile.fullName
    )}`;

    res.json({
      sessionToken,
      profile: {
        ...teacherProfile,
        email:
          teacherProfile.role === 'admin' ? 'faculty@deenhijrah.edu' : teacherProfile.email,
      },
      assignedCourse,
    });
  } catch (error: any) {
    console.error('Error joining faculty:', error);
    res.status(500).json({ error: error.message || 'Failed to register faculty teacher' });
  }
});

// Stream uploaded media files (video recordings, syllabus documents, custom faculty photos, homework files)
app.get('/api/media/:id', async (req, res) => {
  try {
    const mediaId = Number(req.params.id);
    if (!mediaId) return res.status(400).send('Invalid media ID');

    const media = await getMediaUploadById(mediaId);
    if (!media) return res.status(404).send('Media not found');

    const matches = media.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return res.redirect(media.dataUrl);
    }

    const mimeType = matches[1] || media.mimeType || 'application/octet-stream';
    const buffer = Buffer.from(matches[2], 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
      const chunksize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${buffer.length}`);
      res.setHeader('Content-Length', String(chunksize));
      return res.end(buffer.subarray(start, end + 1));
    }

    res.setHeader('Content-Length', String(buffer.length));
    return res.end(buffer);
  } catch (error) {
    console.error('Error streaming media:', error);
    res.status(500).send('Failed to stream media');
  }
});

// Upload media file (Used for video recordings, syllabus files, faculty avatar, or student homework attachments)
app.post('/api/upload-media', async (req: Request, res: Response) => {
  try {
    const { fileName, mimeType, dataUrl } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'File dataUrl is required' });
    }

    let finalUrl = '';
    const safeBaseName = String(fileName || 'file.bin')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_');
    const ext = path.extname(safeBaseName) || (String(mimeType).includes('video') ? '.mp4' : '.bin');
    const safeDiskName = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    const diskPath = path.join(UPLOADS_DIR, safeDiskName);

    const matches = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const buffer = Buffer.from(matches[2], 'base64');
      await fs.promises.writeFile(diskPath, buffer);
      finalUrl = `/uploads/${safeDiskName}`;
    }

    // Also persist in media table if available
    let mediaRecordId = 0;
    try {
      const created = await createMediaUpload(
        safeBaseName,
        String(mimeType || 'application/octet-stream'),
        finalUrl || String(dataUrl).slice(0, 500)
      );
      mediaRecordId = created.id;
    } catch {
      // Ok if in fallback
    }

    res.json({
      id: mediaRecordId || Date.now(),
      url: finalUrl || `/api/media/${mediaRecordId}`,
      fileName: safeBaseName,
    });
  } catch (error: any) {
    console.error('Failed to upload media:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// High-speed raw binary stream upload endpoint for long video recordings and homework files (Zero memory buffer)
app.post('/api/upload-media-raw', (req: Request, res: Response) => {
  try {
    const rawFileName = (req.headers['x-file-name'] as string) || 'upload.bin';
    const decodedName = decodeURIComponent(rawFileName);
    const safeBaseName = decodedName.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    const ext = path.extname(safeBaseName) || (safeBaseName.includes('rec') ? '.mp4' : '.pdf');
    const safeDiskName = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    const diskPath = path.join(UPLOADS_DIR, safeDiskName);

    const writeStream = fs.createWriteStream(diskPath);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const finalUrl = `/uploads/${safeDiskName}`;
      res.json({
        id: Date.now(),
        url: finalUrl,
        fileName: safeBaseName,
      });
    });

    writeStream.on('error', (err) => {
      console.error('Error writing streamed recording to disk:', err);
      res.status(500).json({ error: 'Failed to write recording to disk' });
    });
  } catch (err: any) {
    console.error('Error in raw media stream upload:', err);
    res.status(500).json({ error: err.message || 'Failed to process raw stream upload' });
  }
});

// Synchronize authenticated user profile & fetch their enrollments, messages, and homework
app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || 'student@deenhijrah.edu';
    const name = (req.user as any)?.name || undefined;
    const picture = (req.user as any)?.picture || undefined;

    if (!uid) {
      return res.status(400).json({ error: 'User UID missing from token' });
    }

    const profile = await getOrCreateProfile(uid, email, name, picture);
    const isFaculty = profile.role === 'admin' || profile.role === 'instructor';

    const [allMessages, homeworkList] = await Promise.all([
      isFaculty ? getAllMessages() : getMessagesForProfile(profile.id),
      isFaculty ? getAllHomeworkSubmissions() : getHomeworkForStudent(profile.id),
    ]);

    res.json({
      profile: {
        ...profile,
        email: profile.role === 'admin' ? 'faculty@deenhijrah.edu' : profile.email,
      },
      messages: allMessages,
      homework: homeworkList,
    });
  } catch (error: any) {
    console.error('Failed to sync profile:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user profile' });
  }
});

// Update current user's profile info
app.put('/api/me/role', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || 'student@deenhijrah.edu';
    if (!uid) return res.status(400).json({ error: 'Missing UID' });

    const profile = await getOrCreateProfile(uid, email);
    const { role, title, fullName, avatarUrl } = req.body;
    const updated = await updateProfileRole(profile.id, role, title, fullName, avatarUrl);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// Enroll in a course (enforces student capacity limit!)
app.post('/api/enrollments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || 'student@deenhijrah.edu';
    if (!uid) return res.status(400).json({ error: 'Missing UID' });

    const currentProfile = await getOrCreateProfile(uid, email);
    const isAdminRequest =
      currentProfile.role === 'admin' && Boolean(req.body.studentId);
    const targetStudentId = isAdminRequest ? Number(req.body.studentId) : currentProfile.id;
    const courseId = Number(req.body.courseId);

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const enrollment = await enrollStudent(targetStudentId, courseId, isAdminRequest);
    res.json(enrollment);
  } catch (error: any) {
    console.error('Failed to enroll:', error);
    res.status(400).json({ error: error.message || 'Failed to enroll in course' });
  }
});

// Update lesson completion progress for an enrollment
app.put('/api/enrollments/:id/progress', requireAuth, async (req: AuthRequest, res) => {
  try {
    const enrollmentId = Number(req.params.id);
    const { completedLessonIds, progressPercentage } = req.body;
    const updated = await updateEnrollmentProgress(
      enrollmentId,
      Array.isArray(completedLessonIds) ? completedLessonIds : [],
      Number(progressPercentage) || 0
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update progress:', error);
    res.status(500).json({ error: error.message || 'Failed to update progress' });
  }
});

app.delete('/api/enrollments/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const enrollmentId = Number(req.params.id);
    const result = await deleteEnrollment(enrollmentId);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to remove enrollment:', error);
    res.status(500).json({ error: error.message || 'Failed to remove enrollment' });
  }
});

// Student Homework Submission endpoint
app.post('/api/homework', async (req: Request, res: Response) => {
  try {
    let uid = 'student-guest';
    let email = 'student@deenhijrah.edu';
    let name = 'Student';

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      if (token.startsWith('academy-session:')) {
        const parts = token.split(':');
        uid = parts[1] || uid;
        email = parts[2] || email;
        name = decodeURIComponent(parts[3] || name);
      } else {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          uid = decoded.uid;
          email = decoded.email || email;
          name = decoded.name || name;
        } catch {
          const jwtParts = token.split('.');
          if (jwtParts.length === 3) {
            try {
              const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString('utf8'));
              if (payload.user_id || payload.sub) uid = String(payload.user_id || payload.sub);
              if (payload.email) email = String(payload.email);
              if (payload.name) name = String(payload.name);
            } catch {}
          }
        }
      }
    }

    const student = await getOrCreateProfile(uid, email, name);
    const { courseId, lessonId, title, content, attachmentUrl } = req.body;

    if (!courseId || !title) {
      return res.status(400).json({ error: 'Course and homework title are required' });
    }

    const cleanContent = String(content || '').trim();
    const cleanAttachment = attachmentUrl ? String(attachmentUrl).trim() : null;

    if (!cleanContent && !cleanAttachment) {
      return res.status(400).json({ error: 'Please provide either a written response or an attached file' });
    }

    const finalContent = cleanContent || `Attached homework document: ${cleanAttachment?.split('/').pop() || 'File'}`;

    const created = await createHomeworkSubmission({
      courseId: Number(courseId),
      lessonId: lessonId ? Number(lessonId) : null,
      studentId: student.id,
      studentName: student.fullName,
      title: String(title).trim(),
      content: finalContent,
      attachmentUrl: cleanAttachment,
      status: 'submitted',
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to submit homework:', error);
    res.status(500).json({ error: error.message || 'Failed to submit homework' });
  }
});

// Admin & Faculty Grade Homework endpoint (supports status, grade, and tutor feedback comments)
app.put('/api/admin/homework/:id/grade', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const submissionId = Number(req.params.id);
    const { grade, feedback, status } = req.body;
    const updated = await gradeHomeworkSubmission(
      submissionId,
      String(grade || 'Completed'),
      String(feedback || ''),
      String(status || 'graded')
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to grade homework:', error);
    res.status(500).json({ error: error.message || 'Failed to grade homework' });
  }
});

// Faculty Feedback & Grade Status endpoint accessible from Homework Submission components
app.put('/api/homework/:id/feedback', requireAuth, async (req: AuthRequest, res) => {
  try {
    const submissionId = Number(req.params.id);
    const { grade, feedback, status } = req.body;
    const updated = await gradeHomeworkSubmission(
      submissionId,
      String(grade || 'A (95%)'),
      String(feedback || ''),
      String(status || 'graded')
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to save homework feedback:', error);
    res.status(500).json({ error: error.message || 'Failed to save faculty feedback' });
  }
});

// Messages / Tutor Chat endpoints
app.post('/api/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || 'student@deenhijrah.edu';
    if (!uid) return res.status(400).json({ error: 'Missing UID' });

    const sender = await getOrCreateProfile(uid, email);
    const { receiverId, subject, body } = req.body;

    if (!receiverId || !subject || !body) {
      return res.status(400).json({ error: 'Recipient, subject, and message body are required' });
    }

    const msg = await createMessage({
      senderId: sender.id,
      receiverId: Number(receiverId),
      subject: String(subject),
      body: String(body),
      readStatus: false,
    });
    res.json(msg);
  } catch (error: any) {
    console.error('Failed to send message:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

app.put('/api/messages/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const messageId = Number(req.params.id);
    const updated = await markMessageRead(messageId);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to mark message read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark message as read' });
  }
});

// ==========================================
// 1. Threaded Lesson Comments Endpoints
// ==========================================
app.get('/api/lessons/:id/comments', async (req: Request, res: Response) => {
  try {
    const lessonId = Number(req.params.id);
    const comments = await getCommentsForLesson(lessonId);
    res.json(comments);
  } catch (error: any) {
    console.error('Failed to fetch lesson comments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch comments' });
  }
});

app.post('/api/lessons/:id/comments', async (req: Request, res: Response) => {
  try {
    const lessonId = Number(req.params.id);
    const { courseId, authorId, authorName, authorRole, authorAvatar, parentId, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const created = await createLessonComment({
      lessonId,
      courseId: Number(courseId) || 1,
      authorId: Number(authorId) || 1,
      authorName: String(authorName || 'Student'),
      authorRole: String(authorRole || 'student'),
      authorAvatar: authorAvatar ? String(authorAvatar) : null,
      parentId: parentId ? Number(parentId) : null,
      content: String(content).trim(),
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to post lesson comment:', error);
    res.status(500).json({ error: error.message || 'Failed to post comment' });
  }
});

// ==========================================
// 2. Announcements Endpoints
// ==========================================
app.get('/api/announcements', async (req: Request, res: Response) => {
  try {
    const courseId = req.query.courseId ? Number(req.query.courseId) : null;
    const list = await getAllAnnouncements(courseId);
    res.json(list);
  } catch (error: any) {
    console.error('Failed to fetch announcements:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch announcements' });
  }
});

app.post('/api/announcements', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { courseId, title, content, priority, instructorName } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const uid = req.user?.uid || 'founder-mustaqeem-shaikh';
    const email = req.user?.email || 'mustaqeemshaikh004@gmail.com';
    const profile = await getOrCreateProfile(uid, email);

    const created = await createAnnouncement({
      courseId: courseId ? Number(courseId) : null,
      instructorId: profile.id,
      instructorName: instructorName || profile.fullName || 'Mustaqeem Shaikh',
      title: String(title).trim(),
      content: String(content).trim(),
      priority: priority === 'important' ? 'important' : 'normal',
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to create announcement:', error);
    res.status(500).json({ error: error.message || 'Failed to create announcement' });
  }
});

app.delete('/api/announcements/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await deleteAnnouncement(id);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete announcement:', error);
    res.status(500).json({ error: error.message || 'Failed to delete announcement' });
  }
});

// ==========================================
// 3. Admin / Teacher Role Applications
// ==========================================
app.get('/api/role-applications', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const apps = await getAllRoleApplications();
    res.json(apps);
  } catch (error: any) {
    console.error('Failed to fetch applications:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch applications' });
  }
});

app.post('/api/role-applications', async (req: Request, res: Response) => {
  try {
    const { applicantId, applicantName, applicantEmail, requestedRole, reason, credentialsBio } = req.body;
    if (!applicantEmail || !reason) {
      return res.status(400).json({ error: 'Email and reason are required' });
    }
    const created = await createRoleApplication({
      applicantId: Number(applicantId) || 1,
      applicantName: String(applicantName || 'Applicant'),
      applicantEmail: String(applicantEmail).toLowerCase().trim(),
      requestedRole: requestedRole === 'admin' ? 'admin' : 'instructor',
      reason: String(reason).trim(),
      credentialsBio: credentialsBio ? String(credentialsBio).trim() : null,
      status: 'pending',
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to submit role application:', error);
    res.status(500).json({ error: error.message || 'Failed to submit application' });
  }
});

app.put('/api/role-applications/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const applicationId = Number(req.params.id);
    const { status, applicantId, requestedRole } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    const updated = await updateRoleApplicationStatus(applicationId, status);
    if (status === 'approved' && applicantId && requestedRole) {
      await updateProfileRole(Number(applicantId), requestedRole);
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update application status:', error);
    res.status(500).json({ error: error.message || 'Failed to update application' });
  }
});

// ==========================================
// 4. Daily / Class Day Session Surveys
// ==========================================
app.get('/api/class-surveys', async (req: Request, res: Response) => {
  try {
    const courseId = Number(req.query.courseId) || 0;
    const surveys = await getClassSurveysForCourse(courseId);
    res.json(surveys);
  } catch (error: any) {
    console.error('Failed to fetch class surveys:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch surveys' });
  }
});

app.post('/api/class-surveys', async (req: Request, res: Response) => {
  try {
    const { courseId, lessonId, studentId, studentName, instructorId, rating, comment } = req.body;
    if (!courseId || !rating) {
      return res.status(400).json({ error: 'Course and rating are required' });
    }
    const cleanRating = rating === 'unsatisfactory' ? 'unsatisfactory' : 'satisfactory';
    const created = await createClassSurvey({
      courseId: Number(courseId),
      lessonId: lessonId ? Number(lessonId) : null,
      studentId: Number(studentId) || 1,
      studentName: String(studentName || 'Student'),
      instructorId: instructorId ? Number(instructorId) : null,
      rating: cleanRating,
      comment: comment ? String(comment).trim() : null,
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to submit class survey:', error);
    res.status(500).json({ error: error.message || 'Failed to record class survey' });
  }
});

// ==========================================
// 5. Student Research Papers & Articles (Blogs)
// ==========================================
app.get('/api/articles', async (_req: Request, res: Response) => {
  try {
    const list = await getAllStudentArticles();
    res.json(list);
  } catch (error: any) {
    console.error('Failed to fetch articles:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch articles' });
  }
});

app.post('/api/articles', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, category, abstract, content, attachmentUrl, readTime } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const uid = req.user?.uid || 'student';
    const email = req.user?.email || 'student@deenhijrah.edu';
    const profile = await getOrCreateProfile(uid, email);

    const created = await createStudentArticle({
      studentId: profile.id,
      authorName: profile.fullName,
      authorEmail: profile.email,
      authorRole: profile.role,
      title: String(title).trim(),
      category: String(category || 'Islamic Studies').trim(),
      abstract: abstract ? String(abstract).trim() : null,
      content: String(content).trim(),
      attachmentUrl: attachmentUrl || null,
      readTime: String(readTime || '5 min read').trim(),
      published: true,
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to publish article:', error);
    res.status(500).json({ error: error.message || 'Failed to publish article' });
  }
});

app.delete('/api/articles/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await deleteStudentArticle(id);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to delete article:', error);
    res.status(500).json({ error: error.message || 'Failed to delete article' });
  }
});

// ==========================================
// 6. Student Course Auto-Attendance
// ==========================================
app.get('/api/attendance', async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.query.studentId);
    const courseId = Number(req.query.courseId);
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'studentId and courseId are required' });
    }
    const records = await getStudentAttendanceForCourse(studentId, courseId);
    res.json(records);
  } catch (error: any) {
    console.error('Failed to fetch attendance:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch attendance' });
  }
});

app.post('/api/attendance/auto-log', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, date, scheduledStartTime, sourceTimezone } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }
    const uid = req.user?.uid || 'student';
    const email = req.user?.email || 'student@deenhijrah.edu';
    const profile = await getOrCreateProfile(uid, email);

    const todayDate = date || new Date().toISOString().split('T')[0];
    const now = new Date();

    // Check on-time window (on time or up to 10 min after scheduled start time)
    let status: 'present' | 'absent' | 'late' = 'present';
    if (scheduledStartTime) {
      const [startHour, startMin] = scheduledStartTime.split(':').map(Number);
      if (!isNaN(startHour) && !isNaN(startMin)) {
        const scheduledTime = new Date();
        scheduledTime.setHours(startHour, startMin, 0, 0);
        const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);

        // If student joins > 10 min late
        if (diffMinutes > 10) {
          status = 'late';
        } else if (diffMinutes < -120) {
          // Joined hours early or outside window
          status = 'present';
        } else {
          status = 'present';
        }
      }
    }

    const record = await logStudentAttendance({
      studentId: profile.id,
      courseId: Number(courseId),
      date: todayDate,
      status,
    });
    res.json(record);
  } catch (error: any) {
    console.error('Failed to log auto-attendance:', error);
    res.status(500).json({ error: error.message || 'Failed to log auto-attendance' });
  }
});

// ==========================================
// 7. Teacher/Admin Homework & Quizzes & Assessments Studio
// ==========================================
let serverAssignments: any[] = [
  {
    id: 1,
    courseId: 1,
    lessonId: 1,
    instructorId: 1,
    instructorName: 'Mustaqeem Shaikh',
    title: 'Biographical Timeline & Prophetic Character Synthesis',
    description: 'Compose a 1,000-word scholarly summary highlighting the pivotal milestones between Hilf al-Fudul and the First Revelation in Cave Hira.',
    dueDate: '2026-11-15',
    maxPoints: 100,
    rubric: 'Historical precision (40pts), Analysis of character traits (35pts), Scholarly citations (25pts)',
    attachmentUrl: null,
    createdAt: '2026-10-18T12:00:00Z',
  },
  {
    id: 2,
    courseId: 2,
    lessonId: null,
    instructorId: 1,
    instructorName: 'Mustaqeem Shaikh',
    title: 'Al-Ajrumiyyah Grammatical Parsing (I`rab Exercise)',
    description: 'Provide full I`rab breakdown for the 5 sample sentences discussed in Lesson 2 with morphological reasoning.',
    dueDate: '2026-11-20',
    maxPoints: 100,
    rubric: 'Correct vowel markings (50pts), Correct syntactic justification (50pts)',
    attachmentUrl: null,
    createdAt: '2026-10-18T12:00:00Z',
  },
];

let serverQuizzes: any[] = [
  {
    id: 1,
    courseId: 1,
    lessonId: 1,
    title: 'Seerah Milestones & Prophetic Character Assessment',
    description: 'Assess foundational events of the Makkan period prior to the public call to Tawhid.',
    timeLimitMinutes: 10,
    passingScore: 75,
    badgeAwardName: 'Distinguished Seerah Scholar',
    questions: [
      {
        id: 'q1',
        prompt: 'At what age did Prophet Muhammad (peace be upon him) participate in Hilf al-Fudul (the Alliance of the Virtuous)?',
        options: ['Approximately 20 years old', '35 years old', '12 years old', '40 years old'],
        correctIndex: 0,
        explanation: 'The Prophet (peace be upon him) attended the pact around the age of twenty and later praised its commitment to defending the oppressed.',
        points: 25,
      },
      {
        id: 'q2',
        prompt: 'Which prominent merchant noblewoman appointed the Prophet (pbuh) to lead her trading caravan to Ash-Sham based on his truthfulness (As-Sadiq, Al-Amin)?',
        options: ['Sayyidah Khadijah bint Khuwaylid', 'Sayyidah Fatimah', 'Sayyidah Aishah', 'Sayyidah Sawdah'],
        correctIndex: 0,
        explanation: 'Sayyidah Khadijah (may Allah be pleased with her) entrusted him with her trade and subsequently proposed marriage.',
        points: 25,
      },
      {
        id: 'q3',
        prompt: 'During the rebuilding of the Ka`bah when the Prophet was 35, how did he resolve the dispute of placing the Black Stone (al-Hajar al-Aswad)?',
        options: ['By placing it onto a cloak so all tribal leaders carried it together', 'By calling an armed duel', 'By rolling dice', 'By postponing it 10 years'],
        correctIndex: 0,
        explanation: 'His wisdom united all Qurayshi tribes by placing the Stone on a garment and having representatives lift it jointly.',
        points: 25,
      },
      {
        id: 'q4',
        prompt: 'In which sanctuary did the first revelation descend with "Iqra bi-ismi Rabbika"?',
        options: ['Cave of Hira on Mount Nur', 'Cave of Thawr', 'Mount Uhud', 'Masjid Quba'],
        correctIndex: 0,
        explanation: 'Jibril (Gabriel) descended with the opening ayaat of Surah Al-Alaq in Cave Hira.',
        points: 25,
      },
    ],
    createdAt: '2026-10-18T12:00:00Z',
  },
  {
    id: 2,
    courseId: 2,
    lessonId: null,
    title: 'Arabic Nahw Foundation & Nominal Sentence Quiz',
    description: 'Test your understanding of mubtada, khabar, and vocal inflection markers.',
    timeLimitMinutes: 8,
    passingScore: 70,
    badgeAwardName: 'Nahw Grammatical Adept',
    questions: [
      {
        id: 'q1',
        prompt: 'What are the three fundamental parts of speech (Aqsam al-Kalam) in Arabic grammar?',
        options: ['Ism (Noun), Fi`l (Verb), Harf (Particle)', 'Mubtada, Khabar, Maf`ul', 'Madi, Mudari, Amr', 'Mu`rab, Mabni, Majhul'],
        correctIndex: 0,
        explanation: 'Kalam is partitioned into Ism, Fi`l, and Harf according to Ibn Ajrum and grammarians.',
        points: 30,
      },
      {
        id: 'q2',
        prompt: 'What is the default grammatical case and marker for the Mubtada (subject) in a nominal sentence?',
        options: ['Marfoo` with a Dammah', 'Mansoub with a Fathah', 'Majroor with a Kasrah', 'Majzoom with a Sukun'],
        correctIndex: 0,
        explanation: 'The mubtada is fundamentally marfoo` (in the nominative state), marked primarily by a dammah.',
        points: 35,
      },
      {
        id: 'q3',
        prompt: 'Which sign uniquely distinguishes an Ism (noun) from a Fi`l (verb)?',
        options: ['Acceptance of Tanween and Alif-Lam', 'Prefixing of the particle Sawfa', 'Taking a Jazm marker', 'Suffixing of the Ta al-Fa`il'],
        correctIndex: 0,
        explanation: 'Tanween and the definite article Al- are exclusive to Ism.',
        points: 35,
      },
    ],
    createdAt: '2026-10-18T12:00:00Z',
  },
];

let serverQuizAttempts: any[] = [];

// Assignments Endpoints
app.get('/api/assignments', (req: Request, res: Response) => {
  const courseId = Number(req.query.courseId);
  if (courseId) {
    return res.json(serverAssignments.filter((a) => a.courseId === courseId));
  }
  res.json(serverAssignments);
});

app.post('/api/admin/assignments', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const { courseId, lessonId, title, description, dueDate, maxPoints, rubric, attachmentUrl } = req.body;
  if (!courseId || !title) {
    return res.status(400).json({ error: 'Course and title are required' });
  }
  const newAssignment = {
    id: Date.now(),
    courseId: Number(courseId),
    lessonId: lessonId ? Number(lessonId) : null,
    instructorId: req.user?.uid || 1,
    instructorName: req.user?.email?.split('@')[0] || 'Mustaqeem Shaikh',
    title: String(title),
    description: String(description || ''),
    dueDate: String(dueDate || ''),
    maxPoints: Number(maxPoints) || 100,
    rubric: rubric ? String(rubric) : undefined,
    attachmentUrl: attachmentUrl || null,
    createdAt: new Date().toISOString(),
  };
  serverAssignments.unshift(newAssignment);
  res.json(newAssignment);
});

app.delete('/api/admin/assignments/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  serverAssignments = serverAssignments.filter((a) => a.id !== id);
  res.json({ success: true, id });
});

// Quizzes Endpoints
app.get('/api/quizzes', (req: Request, res: Response) => {
  const courseId = Number(req.query.courseId);
  if (courseId) {
    return res.json(serverQuizzes.filter((q) => q.courseId === courseId));
  }
  res.json(serverQuizzes);
});

app.post('/api/admin/quizzes', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const { courseId, lessonId, title, description, timeLimitMinutes, passingScore, badgeAwardName, questions } = req.body;
  if (!courseId || !title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Course, title, and at least one quiz question are required' });
  }
  const newQuiz = {
    id: Date.now(),
    courseId: Number(courseId),
    lessonId: lessonId ? Number(lessonId) : null,
    title: String(title),
    description: String(description || ''),
    timeLimitMinutes: Number(timeLimitMinutes) || 10,
    passingScore: Number(passingScore) || 70,
    badgeAwardName: badgeAwardName ? String(badgeAwardName) : 'Certified Scholar',
    questions,
    createdAt: new Date().toISOString(),
  };
  serverQuizzes.unshift(newQuiz);
  res.json(newQuiz);
});

app.delete('/api/admin/quizzes/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  serverQuizzes = serverQuizzes.filter((q) => q.id !== id);
  res.json({ success: true, id });
});

// Quiz Attempts & Assessment Grading
app.get('/api/quiz-attempts', (req: Request, res: Response) => {
  const studentId = Number(req.query.studentId);
  const courseId = Number(req.query.courseId);
  let list = [...serverQuizAttempts];
  if (studentId) list = list.filter((a) => a.studentId === studentId);
  if (courseId) list = list.filter((a) => a.courseId === courseId);
  res.json(list);
});

app.get('/api/admin/quiz-attempts', requireAuth, requireAdmin, (_req: AuthRequest, res: Response) => {
  res.json(serverQuizAttempts);
});

app.post('/api/quiz-attempts', requireAuth, (req: AuthRequest, res: Response) => {
  const { quizId, quizTitle, courseId, studentId, studentName, studentEmail, score, totalPoints, percentage, passed, selectedAnswers, timeSpentSeconds } = req.body;
  const newAttempt = {
    id: Date.now(),
    quizId: Number(quizId),
    quizTitle: String(quizTitle || 'Quiz Assessment'),
    courseId: Number(courseId),
    studentId: Number(studentId),
    studentName: String(studentName || 'Student'),
    studentEmail: String(studentEmail || ''),
    score: Number(score) || 0,
    totalPoints: Number(totalPoints) || 100,
    percentage: Number(percentage) || 0,
    passed: Boolean(passed),
    selectedAnswers: selectedAnswers || {},
    timeSpentSeconds: Number(timeSpentSeconds) || 0,
    submittedAt: new Date().toISOString(),
    assessmentStatus: passed ? (Number(percentage) >= 90 ? 'distinction' : 'passed') : 'needs_revision',
  };
  serverQuizAttempts.unshift(newAttempt);
  res.json(newAttempt);
});

app.all('/api/admin/assessments/:attemptId/grade', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  const attemptId = Number(req.params.attemptId);
  const { assessmentFeedback, assessmentStatus, adjustedScore } = req.body;
  const idx = serverQuizAttempts.findIndex((a) => a.id === attemptId);
  if (idx !== -1) {
    if (assessmentFeedback !== undefined) serverQuizAttempts[idx].assessmentFeedback = String(assessmentFeedback);
    if (assessmentStatus !== undefined) serverQuizAttempts[idx].assessmentStatus = assessmentStatus;
    if (adjustedScore !== undefined) serverQuizAttempts[idx].score = Number(adjustedScore);
    serverQuizAttempts[idx].assessedBy = req.user?.email?.split('@')[0] || 'Mustaqeem Shaikh';
    serverQuizAttempts[idx].completedAt = new Date().toISOString();
    return res.json(serverQuizAttempts[idx]);
  }
  res.status(404).json({ error: 'Quiz attempt not found' });
});

// Admin: Update Founder (Mustaqeem Shaikh) Avatar Image or Reset to "MS"
app.put('/api/admin/founder-avatar', requireAuth, requireStrictFounderAdmin, async (req: AuthRequest, res) => {
  try {
    const { avatarUrl } = req.body;
    const allProfs = await getAllProfiles();
    const founder =
      allProfs.find(
        (p) =>
          p.uid === 'founder-mustaqeem-shaikh' ||
          p.email.toLowerCase() === 'mustaqeemshaikh004@gmail.com'
      ) || allProfs[0];

    if (!founder) {
      return res.status(404).json({ error: 'Founder profile not found' });
    }

    const updated = await updateProfileRole(
      founder.id,
      undefined,
      undefined,
      undefined,
      avatarUrl || null
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update founder avatar:', error);
    res.status(500).json({ error: error.message || 'Failed to update faculty avatar' });
  }
});

// Admin CRUD: Courses
app.post('/api/admin/courses', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const currentProfile = (req as any).currentProfile;
    const isInstructor = currentProfile?.role === 'instructor';

    const {
      title,
      slug,
      description,
      longDescription,
      thumbnailUrl,
      category,
      price,
      duration,
      status,
      instructorId,
      instructorName,
      launchDate,
      maxStudents,
      initialEnrolledCount,
      syllabusText,
      syllabusBoxes,
      syllabusFileUrl,
      classDays,
      classStartTime,
      classTimezone,
    } = req.body;

    const courseTitle = String(title || '').trim();
    if (!courseTitle) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    const cleanSlug =
      slug ||
      courseTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString().slice(-4) +
        '-' +
        Math.random().toString(36).substring(2, 6);

    // Resolve instructor attribution
    let assignedInstructorId: number | null = null;
    let assignedInstructorName = 'Mustaqeem Shaikh';

    if (isInstructor && currentProfile) {
      assignedInstructorId = currentProfile.id;
      assignedInstructorName = currentProfile.fullName;
    } else if (instructorId) {
      // Validate that instructorId exists in profiles to avoid FK violations
      const allProfs = await getAllProfiles();
      const matched = allProfs.find((p) => p.id === Number(instructorId));
      if (matched) {
        assignedInstructorId = matched.id;
        assignedInstructorName = matched.fullName;
      }
    }

    if (instructorName && !isInstructor) {
      assignedInstructorName = String(instructorName).trim() || assignedInstructorName;
    }

    const safeDesc = String(description || '').trim() || `${courseTitle} — Sacred Knowledge Program at Deen Hijrah Academia.`;
    const safeLongDesc = String(longDescription || '').trim() || safeDesc;

    const created = await createCourse({
      title: courseTitle,
      slug: cleanSlug,
      description: safeDesc,
      longDescription: safeLongDesc,
      thumbnailUrl: String(thumbnailUrl || 'preset:seerah'),
      category: String(category || 'Islamic Studies'),
      price: String(price || 'Free'),
      duration: String(duration || '8 Weeks'),
      status: status === 'draft' ? 'draft' : 'published',
      instructorId: assignedInstructorId,
      instructorName: assignedInstructorName,
      launchDate: launchDate ? String(launchDate) : null,
      maxStudents: maxStudents !== undefined ? Math.max(1, Number(maxStudents)) : 25,
      initialEnrolledCount:
        initialEnrolledCount !== undefined ? Math.max(0, Number(initialEnrolledCount)) : 0,
      syllabusText: syllabusText ? String(syllabusText) : null,
      syllabusBoxes:
        typeof syllabusBoxes === 'string'
          ? syllabusBoxes
          : JSON.stringify(syllabusBoxes || []),
      syllabusFileUrl: syllabusFileUrl ? String(syllabusFileUrl) : null,
      classDays: classDays ? String(classDays) : 'Saturday & Wednesday',
      classStartTime: classStartTime ? String(classStartTime) : '14:00',
      classTimezone: classTimezone ? String(classTimezone) : 'America/New_York',
      enrollmentStatus: encodeTagsInStatus(req.body.enrollmentStatus, req.body.tags),
    });
    res.json(formatCourseWithTags(created));
  } catch (error: any) {
    console.error('Failed to create course:', error);
    res.status(500).json({ error: error.message || 'Failed to create course' });
  }
});

app.put('/api/admin/courses/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const courseId = Number(req.params.id);
    const currentProfile = (req as any).currentProfile;
    const canManage = await verifyTeacherCourseOwnership(currentProfile, courseId);
    if (!canManage) {
      return res.status(403).json({
        error:
          'Forbidden: As a course teacher, you can only modify the courses you teach. Full Admin access belongs exclusively to Mustaqeem Shaikh.',
      });
    }
    const bodyData = { ...req.body };
    if (currentProfile?.role === 'instructor') {
      bodyData.instructorId = currentProfile.id;
      bodyData.instructorName = currentProfile.fullName;
    }
    if (Array.isArray(bodyData.syllabusBoxes)) {
      bodyData.syllabusBoxes = JSON.stringify(bodyData.syllabusBoxes);
    }
    if (bodyData.tags !== undefined || bodyData.enrollmentStatus !== undefined) {
      bodyData.enrollmentStatus = encodeTagsInStatus(bodyData.enrollmentStatus, bodyData.tags);
    }
    delete bodyData.tags;
    // Delete read-only properties so Drizzle update never fails
    delete bodyData.id;
    delete bodyData.createdAt;
    delete bodyData.created_at;

    const updated = await updateCourse(courseId, bodyData);
    res.json(formatCourseWithTags(updated));
  } catch (error: any) {
    console.error('Failed to update course:', error);
    res.status(500).json({ error: error.message || 'Failed to update course' });
  }
});

app.delete('/api/admin/courses/:id', requireAuth, requireStrictFounderAdmin, async (req: AuthRequest, res) => {
  try {
    const courseId = Number(req.params.id);
    const result = await deleteCourse(courseId);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to delete course:', error);
    res.status(500).json({ error: error.message || 'Failed to delete course' });
  }
});

// Admin & Scoped Teacher CRUD: Lessons & Recordings
app.post('/api/admin/lessons', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      courseId,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      duration,
      positionOrder,
      isFreePreview,
      attachmentUrl,
      scheduledDate,
    } = req.body;

    const currentProfile = (req as any).currentProfile;
    const canManage = await verifyTeacherCourseOwnership(currentProfile, Number(courseId));
    if (!canManage) {
      return res.status(403).json({
        error:
          'Forbidden: You can only upload recordings for the courses you teach.',
      });
    }

    const created = await createLesson({
      courseId: Number(courseId),
      title: String(title),
      description: String(description || ''),
      videoUrl: String(videoUrl),
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : 'preset:seerah',
      duration: String(duration || '45:00'),
      positionOrder: Number(positionOrder) || 1,
      isFreePreview: Boolean(isFreePreview),
      attachmentUrl: attachmentUrl ? String(attachmentUrl) : null,
      scheduledDate: scheduledDate ? String(scheduledDate) : null,
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to create lesson:', error);
    res.status(500).json({ error: error.message || 'Failed to create lesson' });
  }
});

app.put('/api/admin/lessons/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const lessonId = Number(req.params.id);
    const bodyData = { ...req.body };
    delete bodyData.id;
    delete bodyData.createdAt;
    delete bodyData.created_at;
    const updated = await updateLesson(lessonId, bodyData);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update lesson:', error);
    res.status(500).json({ error: error.message || 'Failed to update lesson' });
  }
});

app.delete('/api/admin/lessons/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const lessonId = Number(req.params.id);
    const result = await deleteLesson(lessonId);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to delete lesson:', error);
    res.status(500).json({ error: error.message || 'Failed to delete lesson' });
  }
});

// Admin CRUD: Calendar Events & Zoom Live Sessions (with sourceTimezone)
app.post('/api/admin/events', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      courseId,
      title,
      description,
      eventType,
      eventDate,
      startTime,
      sourceTimezone,
      duration,
      zoomJoinUrl,
      zoomMeetingId,
      zoomPasscode,
      thumbnailUrl,
      instructorName,
      isPublic,
    } = req.body;

    const created = await createCourseEvent({
      courseId: courseId ? Number(courseId) : null,
      title: String(title),
      description: String(description || ''),
      eventType: String(eventType || 'zoom_session'),
      eventDate: String(eventDate),
      startTime: String(startTime || '14:00'),
      sourceTimezone: String(sourceTimezone || 'America/New_York'),
      duration: String(duration || '60 min'),
      zoomJoinUrl: zoomJoinUrl ? String(zoomJoinUrl) : null,
      zoomMeetingId: zoomMeetingId ? String(zoomMeetingId) : null,
      zoomPasscode: zoomPasscode ? String(zoomPasscode) : null,
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : 'preset:orientation',
      instructorName: String(instructorName || 'Mustaqeem Shaikh'),
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to create event:', error);
    res.status(500).json({ error: error.message || 'Failed to create event' });
  }
});

app.put('/api/admin/events/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = Number(req.params.id);
    const updated = await updateCourseEvent(eventId, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update event:', error);
    res.status(500).json({ error: error.message || 'Failed to update event' });
  }
});

app.delete('/api/admin/events/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = Number(req.params.id);
    const result = await deleteCourseEvent(eventId);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to delete event:', error);
    res.status(500).json({ error: error.message || 'Failed to delete event' });
  }
});

// Admin CRUD: Homepage Video & Slideshow Media (Strictly Founder Admin Only)
app.post('/api/admin/slides', requireAuth, requireStrictFounderAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      subtitle,
      mediaType,
      badgeText,
      thumbnailUrl,
      videoUrl,
      ctaText,
      ctaLink,
      instructorName,
      positionOrder,
    } = req.body;

    const created = await createHomepageSlide({
      title: String(title),
      subtitle: String(subtitle || ''),
      mediaType: mediaType === 'video' ? 'video' : 'image',
      badgeText: String(badgeText || 'Orientation Session'),
      thumbnailUrl: String(thumbnailUrl || 'preset:hero_academy'),
      videoUrl: videoUrl ? String(videoUrl) : null,
      ctaText: String(ctaText || 'Explore Program'),
      ctaLink: String(ctaLink || '#courses'),
      instructorName: String(instructorName || 'Mustaqeem Shaikh'),
      positionOrder: Number(positionOrder) || 1,
    });
    res.json(created);
  } catch (error: any) {
    console.error('Failed to create slide:', error);
    res.status(500).json({ error: error.message || 'Failed to create homepage slide' });
  }
});

app.put('/api/admin/slides/:id', requireAuth, requireStrictFounderAdmin, async (req: AuthRequest, res) => {
  try {
    const slideId = Number(req.params.id);
    const updated = await updateHomepageSlide(slideId, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update slide:', error);
    res.status(500).json({ error: error.message || 'Failed to update homepage slide' });
  }
});

app.delete('/api/admin/slides/:id', requireAuth, requireStrictFounderAdmin, async (req: AuthRequest, res) => {
  try {
    const slideId = Number(req.params.id);
    const result = await deleteHomepageSlide(slideId);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to delete slide:', error);
    res.status(500).json({ error: error.message || 'Failed to delete homepage slide' });
  }
});

// Admin: Update User Role / Profile (Strictly Founder Admin Only)
app.put('/api/admin/profiles/:id', requireAuth, requireStrictFounderAdmin, async (req: AuthRequest, res) => {
  try {
    const profileId = Number(req.params.id);
    const { role, title, fullName, avatarUrl } = req.body;
    const updated = await updateProfileRole(profileId, role, title, fullName, avatarUrl);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: error.message || 'Failed to update user profile' });
  }
});

// Admin: Explicitly verify and save all current portal state (courses, lessons, events, slides)
app.post('/api/admin/save-state', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  try {
    initialSeedChecked = true;
    const [coursesList, lessonsList, eventsList, slidesList] = await Promise.all([
      getAllCourses(),
      getAllLessons(),
      getAllCourseEvents(),
      getAllHomepageSlides(),
    ]);
    res.json({
      saved: true,
      timestamp: new Date().toISOString(),
      counts: {
        courses: coursesList.length,
        lessons: lessonsList.length,
        events: eventsList.length,
        slides: slidesList.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to save portal state:', error);
    res.status(500).json({ error: error.message || 'Failed to save portal state' });
  }
});

// Admin: Reset portal to a 100% Blank Canvas (Strictly Founder Admin Only)
app.post('/api/admin/clear-all', requireAuth, requireStrictFounderAdmin, async (_req: AuthRequest, res) => {
  try {
    const result = await clearAllContentToBlank();
    res.json(result);
  } catch (error: any) {
    console.error('Failed to clear portal content:', error);
    res.status(500).json({ error: error.message || 'Failed to clear content' });
  }
});

// Admin: Restore / Seed Default Showcase Courses, Slides, and Zoom Events (Strictly Founder Admin Only)
app.post('/api/admin/seed-demo', requireAuth, requireStrictFounderAdmin, async (_req: AuthRequest, res) => {
  try {
    const result = await ensureInitialAcademySetup(true);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to seed demo content:', error);
    res.status(500).json({ error: error.message || 'Failed to seed demo content' });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      })
    );

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
  });
}

startServer();
