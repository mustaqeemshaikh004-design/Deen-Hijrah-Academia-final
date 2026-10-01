import { eq, asc, desc, and, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  profiles,
  courses,
  lessons,
  enrollments,
  courseEvents,
  homepageSlides,
  messages,
  homeworkSubmissions,
  mediaUploads,
} from './schema.ts';

export async function getOrCreateProfile(uid: string, email: string, fullName?: string, avatarUrl?: string) {
  try {
    const isFounder =
      email.toLowerCase() === 'mustaqeemshaikh004@gmail.com' ||
      uid === 'founder-mustaqeem-shaikh';

    const existing = await db.select().from(profiles).where(eq(profiles.uid, uid));
    if (existing.length > 0) {
      return existing[0];
    }

    const defaultRole = isFounder ? 'admin' : 'student';
    const defaultName = fullName || (isFounder ? 'Mustaqeem Shaikh' : email.split('@')[0]);
    const defaultTitle = isFounder ? 'Principal Faculty & Founder' : 'Scholar Student';

    const inserted = await db
      .insert(profiles)
      .values({
        uid,
        email,
        fullName: defaultName,
        role: defaultRole,
        title: defaultTitle,
        avatarUrl: isFounder ? null : avatarUrl || null,
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: { email },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateProfile:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function registerEduStudentAccount(
  firstName: string,
  lastName: string,
  customPassword?: string,
  customEmail?: string
) {
  try {
    const rawFirst = (firstName || '').trim();
    const rawLast = (lastName || '').trim();
    const rawEmail = (customEmail || '').trim().toLowerCase();

    // If user typed an email into firstName or customEmail, extract a clean name if needed
    const effectiveFirst = rawFirst.includes('@') ? rawFirst.split('@')[0] : rawFirst;
    const cleanFirst = effectiveFirst
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const cleanLast = rawLast
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (!cleanFirst && !rawEmail) {
      throw new Error('Please enter your name or email address to create an account.');
    }

    const derivedFirstName =
      effectiveFirst ||
      (rawEmail ? rawEmail.split('@')[0].replace(/[._-]+/g, ' ') : 'Scholar');
    const formattedName = `${derivedFirstName} ${rawLast}`
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const passwordToSave = (customPassword && customPassword.trim()) || 'deen123';

    let candidateEmail = rawEmail
      ? rawEmail.includes('@')
        ? rawEmail
        : `${rawEmail}@deenhijrah.edu`
      : rawFirst.includes('@')
      ? rawFirst.toLowerCase()
      : `${cleanFirst || 'scholar'}@deenhijrah.edu`;

    if (
      candidateEmail === 'mustaqeemshaikh004@gmail.com' ||
      candidateEmail === 'faculty@deenhijrah.edu'
    ) {
      return await getOrCreateProfile(
        'founder-mustaqeem-shaikh',
        'mustaqeemshaikh004@gmail.com',
        'Mustaqeem Shaikh'
      );
    }

    const allExisting = await db.select().from(profiles);
    const existingPrimary = allExisting.find(
      (p) => p.email.toLowerCase() === candidateEmail
    );

    if (
      !rawEmail &&
      existingPrimary &&
      existingPrimary.fullName.toLowerCase() !== formattedName.toLowerCase() &&
      cleanLast
    ) {
      candidateEmail = `${cleanFirst}.${cleanLast}@deenhijrah.edu`;
    }

    const matchingAccount = allExisting.find(
      (p) => p.email.toLowerCase() === candidateEmail
    );

    if (matchingAccount) {
      const updated = await db
        .update(profiles)
        .set({
          fullName: formattedName || matchingAccount.fullName,
          password: passwordToSave,
          role: matchingAccount.role === 'admin' ? 'admin' : matchingAccount.role || 'student',
        })
        .where(eq(profiles.id, matchingAccount.id))
        .returning();
      return updated[0];
    }

    const uid = `edu-${cleanFirst || 'user'}-${cleanLast || 'scholar'}-${Date.now()
      .toString()
      .slice(-4)}`;
    const inserted = await db
      .insert(profiles)
      .values({
        uid,
        fullName: formattedName || 'Scholar Student',
        email: candidateEmail,
        password: passwordToSave,
        role: 'student',
        title: 'Enrolled Scholar Student',
        avatarUrl: null,
      })
      .returning();

    return inserted[0];
  } catch (error: any) {
    console.error('Database query failed in registerEduStudentAccount:', error);
    throw new Error(error.message || 'Failed to create student account.', {
      cause: error,
    });
  }
}

export async function authenticateAccount(email: string, passwordInput: string) {
  try {
    const rawEmail = (email || '').trim().toLowerCase();
    if (!rawEmail) {
      throw new Error('Please enter your email address to sign in.');
    }

    const cleanEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@deenhijrah.edu`;
    const cleanPass = (passwordInput || '').trim() || 'deen123';

    // Founder / Admin check (supports both private email and faculty@deenhijrah.edu alias)
    if (
      cleanEmail === 'mustaqeemshaikh004@gmail.com' ||
      cleanEmail === 'faculty@deenhijrah.edu'
    ) {
      const founder = await getOrCreateProfile(
        'founder-mustaqeem-shaikh',
        'mustaqeemshaikh004@gmail.com',
        'Mustaqeem Shaikh'
      );
      return founder;
    }

    const allProfiles = await db.select().from(profiles);
    const account = allProfiles.find((p) => p.email.toLowerCase() === cleanEmail);

    if (!account) {
      // Automatically provision a student profile when logging in by email if not yet created
      const localPart = cleanEmail.split('@')[0] || 'Scholar';
      const displayName =
        localPart
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim() || 'Scholar Student';
      const uid = `edu-${localPart.replace(/[^a-z0-9]/g, '') || 'scholar'}-${Date.now()
        .toString()
        .slice(-4)}`;

      const inserted = await db
        .insert(profiles)
        .values({
          uid,
          fullName: displayName,
          email: cleanEmail,
          password: cleanPass,
          role: 'student',
          title: 'Enrolled Scholar Student',
          avatarUrl: null,
        })
        .returning();

      return inserted[0];
    }

    return account;
  } catch (error: any) {
    console.error('Database query failed in authenticateAccount:', error);
    throw new Error(error.message || 'Authentication failed.', { cause: error });
  }
}

export async function getAllProfiles() {
  try {
    return await db.select().from(profiles).orderBy(asc(profiles.id));
  } catch (error) {
    console.error('Database query failed in getAllProfiles:', error);
    throw new Error('Failed to load profiles.', { cause: error });
  }
}

export async function updateProfileRole(
  profileId: number,
  role?: string,
  title?: string,
  fullName?: string,
  avatarUrl?: string | null
) {
  try {
    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (title !== undefined) updateData.title = title;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const updated = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, profileId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateProfileRole:', error);
    throw new Error('Failed to update user profile.', { cause: error });
  }
}

export async function getAllCourses() {
  try {
    return await db.select().from(courses).orderBy(asc(courses.id));
  } catch (error) {
    console.error('Database query failed in getAllCourses:', error);
    throw new Error('Failed to fetch courses.', { cause: error });
  }
}

export async function createCourse(data: typeof courses.$inferInsert) {
  try {
    const inserted = await db.insert(courses).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createCourse:', error);
    throw new Error('Failed to create course.', { cause: error });
  }
}

export async function updateCourse(courseId: number, data: Partial<typeof courses.$inferInsert>) {
  try {
    const updated = await db
      .update(courses)
      .set(data)
      .where(eq(courses.id, courseId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateCourse:', error);
    throw new Error('Failed to update course.', { cause: error });
  }
}

export async function deleteCourse(courseId: number) {
  try {
    await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.courseId, courseId));
    await db.delete(lessons).where(eq(lessons.courseId, courseId));
    await db.delete(enrollments).where(eq(enrollments.courseId, courseId));
    await db.delete(courseEvents).where(eq(courseEvents.courseId, courseId));
    await db.delete(courses).where(eq(courses.id, courseId));
    return { success: true };
  } catch (error) {
    console.error('Database query failed in deleteCourse:', error);
    throw new Error('Failed to delete course.', { cause: error });
  }
}

export async function getAllLessons() {
  try {
    return await db.select().from(lessons).orderBy(asc(lessons.positionOrder), asc(lessons.id));
  } catch (error) {
    console.error('Database query failed in getAllLessons:', error);
    throw new Error('Failed to fetch lessons.', { cause: error });
  }
}

export async function createLesson(data: typeof lessons.$inferInsert) {
  try {
    const inserted = await db.insert(lessons).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createLesson:', error);
    throw new Error('Failed to create lesson.', { cause: error });
  }
}

export async function updateLesson(lessonId: number, data: Partial<typeof lessons.$inferInsert>) {
  try {
    const updated = await db
      .update(lessons)
      .set(data)
      .where(eq(lessons.id, lessonId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateLesson:', error);
    throw new Error('Failed to update lesson.', { cause: error });
  }
}

export async function deleteLesson(lessonId: number) {
  try {
    await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.lessonId, lessonId));
    await db.delete(lessons).where(eq(lessons.id, lessonId));
    return { success: true };
  } catch (error) {
    console.error('Database query failed in deleteLesson:', error);
    throw new Error('Failed to delete lesson.', { cause: error });
  }
}

export async function getAllEnrollments() {
  try {
    return await db.select().from(enrollments).orderBy(desc(enrollments.enrolledAt));
  } catch (error) {
    console.error('Database query failed in getAllEnrollments:', error);
    throw new Error('Failed to fetch enrollments.', { cause: error });
  }
}

export async function enrollStudent(studentId: number, courseId: number, bypassLimit = false) {
  try {
    const existing = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)));
    if (existing.length > 0) {
      return existing[0];
    }

    const courseRows = await db.select().from(courses).where(eq(courses.id, courseId));
    const targetCourse = courseRows[0];
    if (!targetCourse) {
      throw new Error('Course not found.');
    }

    const currentEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId));

    const totalTaken = currentEnrollments.length + (targetCourse.initialEnrolledCount || 0);
    const maxLimit = targetCourse.maxStudents || 25;

    if (!bypassLimit && maxLimit > 0 && totalTaken >= maxLimit) {
      throw new Error(
        `Cohort Full: This course has reached its student limit (${maxLimit}/${maxLimit} students enrolled) and is no longer available to enroll.`
      );
    }

    const inserted = await db
      .insert(enrollments)
      .values({
        studentId,
        courseId,
        progressPercentage: 0,
        completedLessonIds: '[]',
      })
      .returning();
    return inserted[0];
  } catch (error: any) {
    console.error('Database query failed in enrollStudent:', error);
    throw new Error(error.message || 'Failed to enroll student in course.', { cause: error });
  }
}

export async function updateEnrollmentProgress(
  enrollmentId: number,
  completedLessonIds: number[],
  progressPercentage: number
) {
  try {
    const updated = await db
      .update(enrollments)
      .set({
        completedLessonIds: JSON.stringify(completedLessonIds),
        progressPercentage,
      })
      .where(eq(enrollments.id, enrollmentId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateEnrollmentProgress:', error);
    throw new Error('Failed to update lesson progress.', { cause: error });
  }
}

export async function deleteEnrollment(enrollmentId: number) {
  try {
    await db.delete(enrollments).where(eq(enrollments.id, enrollmentId));
    return { success: true };
  } catch (error) {
    console.error('Database query failed in deleteEnrollment:', error);
    throw new Error('Failed to remove enrollment.', { cause: error });
  }
}

export async function getAllCourseEvents() {
  try {
    return await db.select().from(courseEvents).orderBy(asc(courseEvents.eventDate), asc(courseEvents.startTime));
  } catch (error) {
    console.error('Database query failed in getAllCourseEvents:', error);
    throw new Error('Failed to fetch calendar and Zoom events.', { cause: error });
  }
}

export async function createCourseEvent(data: typeof courseEvents.$inferInsert) {
  try {
    const inserted = await db.insert(courseEvents).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createCourseEvent:', error);
    throw new Error('Failed to create calendar/Zoom event.', { cause: error });
  }
}

export async function updateCourseEvent(eventId: number, data: Partial<typeof courseEvents.$inferInsert>) {
  try {
    const updated = await db
      .update(courseEvents)
      .set(data)
      .where(eq(courseEvents.id, eventId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateCourseEvent:', error);
    throw new Error('Failed to update calendar/Zoom event.', { cause: error });
  }
}

export async function deleteCourseEvent(eventId: number) {
  try {
    await db.delete(courseEvents).where(eq(courseEvents.id, eventId));
    return { success: true };
  } catch (error) {
    console.error('Database query failed in deleteCourseEvent:', error);
    throw new Error('Failed to delete calendar/Zoom event.', { cause: error });
  }
}

export async function getAllHomepageSlides() {
  try {
    return await db.select().from(homepageSlides).orderBy(asc(homepageSlides.positionOrder), asc(homepageSlides.id));
  } catch (error) {
    console.error('Database query failed in getAllHomepageSlides:', error);
    throw new Error('Failed to fetch homepage media slides.', { cause: error });
  }
}

export async function createHomepageSlide(data: typeof homepageSlides.$inferInsert) {
  try {
    const inserted = await db.insert(homepageSlides).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createHomepageSlide:', error);
    throw new Error('Failed to create homepage slide.', { cause: error });
  }
}

export async function updateHomepageSlide(slideId: number, data: Partial<typeof homepageSlides.$inferInsert>) {
  try {
    const updated = await db
      .update(homepageSlides)
      .set(data)
      .where(eq(homepageSlides.id, slideId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateHomepageSlide:', error);
    throw new Error('Failed to update homepage slide.', { cause: error });
  }
}

export async function deleteHomepageSlide(slideId: number) {
  try {
    await db.delete(homepageSlides).where(eq(homepageSlides.id, slideId));
    return { success: true };
  } catch (error) {
    console.error('Database query failed in deleteHomepageSlide:', error);
    throw new Error('Failed to delete homepage slide.', { cause: error });
  }
}

export async function getMessagesForProfile(profileId: number) {
  try {
    return await db
      .select()
      .from(messages)
      .where(or(eq(messages.receiverId, profileId), eq(messages.senderId, profileId)))
      .orderBy(desc(messages.createdAt));
  } catch (error) {
    console.error('Database query failed in getMessagesForProfile:', error);
    throw new Error('Failed to fetch messages.', { cause: error });
  }
}

export async function getAllMessages() {
  try {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  } catch (error) {
    console.error('Database query failed in getAllMessages:', error);
    throw new Error('Failed to fetch all messages.', { cause: error });
  }
}

export async function createMessage(data: typeof messages.$inferInsert) {
  try {
    const inserted = await db.insert(messages).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createMessage:', error);
    throw new Error('Failed to send message.', { cause: error });
  }
}

export async function markMessageRead(messageId: number) {
  try {
    const updated = await db
      .update(messages)
      .set({ readStatus: true })
      .where(eq(messages.id, messageId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in markMessageRead:', error);
    throw new Error('Failed to mark message as read.', { cause: error });
  }
}

export async function getAllHomeworkSubmissions() {
  try {
    return await db
      .select()
      .from(homeworkSubmissions)
      .orderBy(desc(homeworkSubmissions.submittedAt));
  } catch (error) {
    console.error('Database query failed in getAllHomeworkSubmissions:', error);
    throw new Error('Failed to fetch homework submissions.', { cause: error });
  }
}

export async function getHomeworkForStudent(studentId: number) {
  try {
    return await db
      .select()
      .from(homeworkSubmissions)
      .where(eq(homeworkSubmissions.studentId, studentId))
      .orderBy(desc(homeworkSubmissions.submittedAt));
  } catch (error) {
    console.error('Database query failed in getHomeworkForStudent:', error);
    throw new Error('Failed to fetch student homework submissions.', { cause: error });
  }
}

export async function createHomeworkSubmission(data: typeof homeworkSubmissions.$inferInsert) {
  try {
    const inserted = await db.insert(homeworkSubmissions).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createHomeworkSubmission:', error);
    throw new Error('Failed to submit homework.', { cause: error });
  }
}

export async function gradeHomeworkSubmission(
  submissionId: number,
  grade: string,
  feedback: string,
  status = 'graded'
) {
  try {
    const updated = await db
      .update(homeworkSubmissions)
      .set({
        status: status || 'graded',
        grade,
        feedback,
      })
      .where(eq(homeworkSubmissions.id, submissionId))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query failed in gradeHomeworkSubmission:', error);
    throw new Error('Failed to grade homework submission.', { cause: error });
  }
}

export async function createMediaUpload(fileName: string, mimeType: string, dataUrl: string) {
  try {
    const inserted = await db
      .insert(mediaUploads)
      .values({ fileName, mimeType, dataUrl })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createMediaUpload:', error);
    throw new Error('Failed to store uploaded media file.', { cause: error });
  }
}

export async function getMediaUploadById(id: number) {
  try {
    const rows = await db.select().from(mediaUploads).where(eq(mediaUploads.id, id));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getMediaUploadById:', error);
    throw new Error('Failed to load uploaded media file.', { cause: error });
  }
}

export async function clearAllContentToBlank() {
  try {
    await db.delete(homeworkSubmissions);
    await db.delete(messages);
    await db.delete(enrollments);
    await db.delete(lessons);
    await db.delete(courseEvents);
    await db.delete(courses);
    await db.delete(homepageSlides);
    return { success: true };
  } catch (error) {
    console.error('Database query failed in clearAllContentToBlank:', error);
    throw new Error('Failed to clear portal content.', { cause: error });
  }
}
