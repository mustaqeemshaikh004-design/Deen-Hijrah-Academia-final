import 'dotenv/config';
import express, { type Response, type NextFunction } from 'express';
import path from 'path';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
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
} from './src/db/queries.ts';
import { ensureInitialAcademySetup } from './src/db/seed.ts';

const app = express();
app.use(express.json({ limit: '50mb' }));

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

// Public endpoint to load portal courses, lessons, public events, homepage media slides, and faculty list
app.get('/api/portal-data', async (_req, res) => {
  try {
    if (!initialSeedChecked) {
      await ensureInitialAcademySetup(false);
      initialSeedChecked = true;
    }

    const [coursesList, lessonsList, eventsList, slidesList, profilesList, enrollmentsList] =
      await Promise.all([
        getAllCourses(),
        getAllLessons(),
        getAllCourseEvents(),
        getAllHomepageSlides(),
        getAllProfiles(),
        getAllEnrollments(),
      ]);

    const sanitizedProfiles = profilesList.map((p) => ({
      ...p,
      email:
        p.role === 'admin' || p.uid === 'founder-mustaqeem-shaikh'
          ? 'faculty@deenhijrah.edu'
          : p.email,
    }));

    res.json({
      courses: coursesList,
      lessons: lessonsList,
      events: eventsList,
      slides: slidesList,
      profiles: sanitizedProfiles,
      enrollments: enrollmentsList,
    });
  } catch (error: any) {
    console.error('Failed to load portal data:', error);
    res.status(500).json({ error: error.message || 'Failed to load portal data' });
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
        body: `Assalamu alaykum Ustadh Mustaqeem Shaikh,\n\n${teacherProfile.fullName} (${cleanEmail}) has joined the faculty as the Course Teacher for "${assignedCourse.title}".\n• Country & Timezone: ${country || 'N/A'} (${timezone || 'America/New_York'})\n• Class Schedule: ${classDays || 'Sun & Thu'} at ${classStartTime || '15:00'}\n• Qualifications / Bio: ${credentialsBio || 'Provided'}\n• Resume / CV: ${resumeUrl ? 'Uploaded / Attached' : 'Included in bio'}`,
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

// Upload media file (Authenticated: used for video recordings, syllabus files, faculty avatar, or student homework attachments)
app.post('/api/upload-media', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fileName, mimeType, dataUrl } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'File dataUrl is required' });
    }
    const created = await createMediaUpload(
      String(fileName || 'upload.bin'),
      String(mimeType || 'application/octet-stream'),
      String(dataUrl)
    );
    res.json({
      id: created.id,
      url: `/api/media/${created.id}`,
      fileName: created.fileName,
    });
  } catch (error: any) {
    console.error('Failed to upload media:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
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
app.post('/api/homework', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || 'student@deenhijrah.edu';
    if (!uid) return res.status(400).json({ error: 'Missing UID' });

    const student = await getOrCreateProfile(uid, email);
    const { courseId, lessonId, title, content, attachmentUrl } = req.body;

    if (!courseId || !title || !content) {
      return res.status(400).json({ error: 'Course, homework title, and response are required' });
    }

    const created = await createHomeworkSubmission({
      courseId: Number(courseId),
      lessonId: lessonId ? Number(lessonId) : null,
      studentId: student.id,
      studentName: student.fullName,
      title: String(title),
      content: String(content),
      attachmentUrl: attachmentUrl ? String(attachmentUrl) : null,
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

    const cleanSlug =
      slug ||
      String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now().toString().slice(-4);

    const created = await createCourse({
      title: String(title),
      slug: cleanSlug,
      description: String(description || ''),
      longDescription: String(longDescription || description || ''),
      thumbnailUrl: String(thumbnailUrl || 'preset:seerah'),
      category: String(category || 'Islamic Studies'),
      price: String(price || 'Free'),
      duration: String(duration || '8 Weeks'),
      status: status === 'draft' ? 'draft' : 'published',
      instructorId: instructorId ? Number(instructorId) : null,
      instructorName: String(instructorName || 'Mustaqeem Shaikh'),
      launchDate: launchDate ? String(launchDate) : null,
      maxStudents: maxStudents !== undefined ? Number(maxStudents) : 25,
      initialEnrolledCount:
        initialEnrolledCount !== undefined ? Number(initialEnrolledCount) : 0,
      syllabusText: syllabusText ? String(syllabusText) : null,
      syllabusBoxes:
        typeof syllabusBoxes === 'string'
          ? syllabusBoxes
          : JSON.stringify(syllabusBoxes || []),
      syllabusFileUrl: syllabusFileUrl ? String(syllabusFileUrl) : null,
      classDays: classDays ? String(classDays) : 'Saturday & Wednesday',
      classStartTime: classStartTime ? String(classStartTime) : '14:00',
      classTimezone: classTimezone ? String(classTimezone) : 'America/New_York',
    });
    res.json(created);
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
          'Forbidden: As a course teacher, you can only modify the courses you teach. Full Admin access belongs exclusively to Ustadh Mustaqeem Shaikh.',
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
    const updated = await updateCourse(courseId, bodyData);
    res.json(updated);
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
    const updated = await updateLesson(lessonId, req.body);
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
