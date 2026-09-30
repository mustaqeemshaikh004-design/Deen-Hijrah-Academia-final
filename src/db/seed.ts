import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  profiles,
  courses,
  lessons,
  courseEvents,
  homepageSlides,
  enrollments,
  messages,
  homeworkSubmissions,
} from './schema.ts';

function formatRelativeDate(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const SEERAH_SYLLABUS_BOXES = JSON.stringify([
  {
    week: 'Module 01 · Weeks 1–3',
    title: 'Pre-Islamic Geopolitics & The Abrahamic Sanctuary',
    topics:
      'Lineage of Quraysh, socio-economic structures of 6th-century Makkah, and spiritual preparation prior to Cave Hira.',
    deliverable: 'Primary Source Reflection Paper (Surah Al-Alaq & Early Biographical Reports)',
  },
  {
    week: 'Module 02 · Weeks 4–6',
    title: 'Dar al-Arqam, Persecution & The Abyssinian Migration',
    topics:
      'Spiritual pedagogy of the early companions, diplomatic statecraft in Abyssinia, and resilience under the Meccan boycott.',
    deliverable: 'Comparative Analysis of Ja’far ibn Abi Talib’s Address',
  },
  {
    week: 'Module 03 · Weeks 7–9',
    title: 'The Sacred Hijrah & The Constitution of Madinah',
    topics:
      'Pledges of Aqabah, strategic migration to Yathrib, establishing the Prophetic Mosque, and pluralistic covenant governance.',
    deliverable: 'Clause-by-Clause Study of the Sahifah of Madinah',
  },
  {
    week: 'Module 04 · Weeks 10–12',
    title: 'Treaty of Hudaybiyyah, Fath Makkah & The Farewell Sermon',
    topics:
      'Strategic peacebuilding, ethical conduct in victory, and universal human rights in the Farewell Pilgrimage.',
    deliverable: 'Final Capstone Essay & Oral Seminar Presentation',
  },
]);

const ARABIC_SYLLABUS_BOXES = JSON.stringify([
  {
    week: 'Module 01 · Weeks 1–4',
    title: 'Al-Mizan Al-Sarfi: Trilateral Roots & Morphological Patterns',
    topics:
      'Verb forms (Awzan I–X), active/passive participles, and semantic nuances in Quranic vocabulary.',
    deliverable: 'Morphological Root Extraction Worksheet (Juz Amma)',
  },
  {
    week: 'Module 02 · Weeks 5–8',
    title: 'Classical Nahw: Nominal & Verbal Sentence Architecture',
    topics:
      'I’rab (grammatical case endings), Mubtada/Khabar shifts, and syntactic emphasis in classical prose.',
    deliverable: 'Grammatical Parsing (Tarkib) of Surah Al-Fatihah & Ayat al-Kursi',
  },
  {
    week: 'Module 03 · Weeks 9–12',
    title: 'Ilm al-Ma’ani & Ilm al-Bayan (Rhetorical Precision)',
    topics:
      'Word order foregrounding (Taqdim wa Ta’khir), metaphor, and rhythmic coherence in revelation.',
    deliverable: 'Rhetorical Commentary Brief on Selected Meccan Surahs',
  },
]);

const USUL_SYLLABUS_BOXES = JSON.stringify([
  {
    week: 'Module 01 · Weeks 1–3',
    title: 'Epistemology of Sacred Law & Primary Proofs',
    topics:
      'Relationship between Quran, Sunnah, Ijma, and Qiyas; definitive (Qat’i) vs. probabilistic (Zanni) indicators.',
    deliverable: 'Legal Methodology Diagram & Case Brief',
  },
  {
    week: 'Module 02 · Weeks 4–7',
    title: 'Maqasid al-Shariah: The Five Higher Objectives',
    topics:
      'Preservation of faith, life, intellect, lineage, and wealth across classical and contemporary legal maxims (Al-Qawa’id Al-Fiqhiyyah).',
    deliverable: 'Applied Ethics Case Study in Modern Finance & Bioethics',
  },
  {
    week: 'Module 03 · Weeks 8–10',
    title: 'Tazkiyah & The Inner Dimensions of Scholarship',
    topics:
      'Integrating outward legal adherence with sincerity (Ikhlas), scholarly etiquette (Adab al-Mufti), and spiritual integrity.',
    deliverable: 'Final Reflection & Textual Translation Submission',
  },
]);

export async function ensureInitialAcademySetup(forceReseed = false) {
  try {
    // 1. Always ensure Founder & Principal Faculty Mustaqeem Shaikh exists (with 'MS' monogram by default)
    let founderProfile = (
      await db.select().from(profiles).where(eq(profiles.uid, 'founder-mustaqeem-shaikh'))
    )[0];
    const wasAlreadyInitialized = Boolean(founderProfile);

    if (!founderProfile) {
      const inserted = await db
        .insert(profiles)
        .values({
          uid: 'founder-mustaqeem-shaikh',
          fullName: 'Mustaqeem Shaikh',
          email: 'mustaqeemshaikh004@gmail.com',
          role: 'admin',
          title: 'Principal Faculty & Founder',
          avatarUrl: null,
        })
        .returning();
      founderProfile = inserted[0];
    } else if (founderProfile.avatarUrl === 'preset:orientation') {
      // Remove old preset image so it defaults to 'MS' monogram unless custom uploaded
      const updated = await db
        .update(profiles)
        .set({ avatarUrl: null })
        .where(eq(profiles.id, founderProfile.id))
        .returning();
      founderProfile = updated[0];
    }

    const existingCourses = await db.select().from(courses);
    const existingSlides = await db.select().from(homepageSlides);

    // IMPORTANT: Once the database has been initialized (wasAlreadyInitialized === true),
    // NEVER re-seed automatically! Anything the admin adds stays permanently, and anything
    // the admin deletes stays deleted permanently unless forceReseed is explicitly clicked.
    if (!forceReseed && (wasAlreadyInitialized || existingCourses.length > 0 || existingSlides.length > 0)) {
      for (const c of existingCourses) {
        if (!c.syllabusBoxes || c.syllabusBoxes === '[]') {
          const isArabic = c.slug.includes('arabic');
          const isUsul = c.slug.includes('usul');
          await db
            .update(courses)
            .set({
              maxStudents: isArabic ? 25 : isUsul ? 20 : 30,
              initialEnrolledCount: isArabic ? 21 : isUsul ? 15 : 22,
              classDays: isArabic
                ? 'Sunday & Wednesday'
                : isUsul
                ? 'Friday & Sunday'
                : 'Saturday & Tuesday',
              classStartTime: isArabic ? '15:00' : isUsul ? '16:30' : '14:00',
              classTimezone: 'America/New_York',
              syllabusText:
                'Complete all weekly reading folios prior to the live Zoom seminar. Only the Orientation Recording is visible to public visitors; full class recordings and homework portals unlock upon cohort enrollment.',
              syllabusBoxes: isArabic
                ? ARABIC_SYLLABUS_BOXES
                : isUsul
                ? USUL_SYLLABUS_BOXES
                : SEERAH_SYLLABUS_BOXES,
            })
            .where(eq(courses.id, c.id));
        }
      }
      return { seeded: false, founderId: founderProfile.id };
    }

    if (forceReseed) {
      await db.delete(homeworkSubmissions);
      await db.delete(messages);
      await db.delete(enrollments);
      await db.delete(lessons);
      await db.delete(courseEvents);
      await db.delete(courses);
      await db.delete(homepageSlides);
    }

    // 2. Seed Homepage Dynamic Video & Media Slideshow
    await db.insert(homepageSlides).values([
      {
        title: 'Autumn Term Orientation & Live Q&A Session',
        subtitle:
          'Publicly accessible Orientation Recording with Principal Faculty Mustaqeem Shaikh covering the Deen Hijrah Academia syllabus, global class timezone schedule, and enrollment process.',
        mediaType: 'video',
        badgeText: 'Orientation Session',
        thumbnailUrl: 'preset:orientation',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        ctaText: 'View Orientation Schedule',
        ctaLink: '#calendar',
        instructorName: 'Mustaqeem Shaikh',
        positionOrder: 1,
      },
      {
        title: 'The Prophetic Seerah: Meccan & Medinan Chronicles',
        subtitle:
          'An immersive historical and spiritual analysis of the life of the Prophet ﷺ, combining classical manuscript sources with weekly live Zoom seminars and structured syllabus modules.',
        mediaType: 'video',
        badgeText: 'Featured Course',
        thumbnailUrl: 'preset:seerah',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        ctaText: 'Explore Syllabus & Enroll',
        ctaLink: '#courses',
        instructorName: 'Mustaqeem Shaikh',
        positionOrder: 2,
      },
      {
        title: 'Foundations of Classical Arabic & Quranic Balaghah',
        subtitle:
          'Orientation overview of our linguistic immersion program unpacking the morphology, syntax, and rhetorical beauty of the Quranic text.',
        mediaType: 'video',
        badgeText: 'Orientation Session',
        thumbnailUrl: 'preset:arabic',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        ctaText: 'Inspect Course Syllabus',
        ctaLink: '#courses',
        instructorName: 'Mustaqeem Shaikh',
        positionOrder: 3,
      },
    ]);

    // 3. Seed Featured Courses with Syllabus Boxes, Student Capacity Limits, and Global Class Timezone
    const insertedCourses = await db
      .insert(courses)
      .values([
        {
          title: 'The Prophetic Seerah: Analytical Chronicles',
          slug: 'prophetic-seerah-chronicles',
          description:
            'A structured deep-dive into the Prophetic biography, revelation timeline, and spiritual statecraft from primary classical sources.',
          longDescription:
            'Designed and taught by Ustadh Mustaqeem Shaikh, this flagship program takes students beyond surface-level storytelling into the socio-political, spiritual, and jurisprudential dimensions of the Seerah. Includes weekly live Zoom seminars, downloadable research folios, homework assignments, and interactive milestone tracking.',
          thumbnailUrl: 'preset:seerah',
          category: 'Seerah & History',
          price: 'Free',
          duration: '12 Weeks',
          status: 'published',
          instructorId: founderProfile.id,
          instructorName: 'Mustaqeem Shaikh',
          launchDate: formatRelativeDate(2),
          maxStudents: 30,
          initialEnrolledCount: 22,
          classDays: 'Saturday & Tuesday',
          classStartTime: '14:00',
          classTimezone: 'America/New_York',
          syllabusText:
            'Academic Expectations: Students attend two weekly live Zoom classes (automatically displayed in your local country timezone), complete the primary source readings, and submit module homework assignments for faculty review by Ustadh Mustaqeem Shaikh.',
          syllabusBoxes: SEERAH_SYLLABUS_BOXES,
        },
        {
          title: 'Classical Arabic & Quranic Eloquence (Balaghah)',
          slug: 'classical-arabic-balaghah',
          description:
            'Master Arabic nahw (syntax), sarf (morphology), and rhetorical structures to engage directly with classical Islamic scholarship.',
          longDescription:
            'A systematic linguistic immersion tailored for dedicated students of sacred knowledge. Across structured recorded modules and live weekly Zoom translation labs with Mustaqeem Shaikh, you will unlock direct comprehension of classical texts.',
          thumbnailUrl: 'preset:arabic',
          category: 'Arabic & Quranic Sciences',
          price: '$79',
          duration: '16 Weeks',
          status: 'published',
          instructorId: founderProfile.id,
          instructorName: 'Mustaqeem Shaikh',
          launchDate: formatRelativeDate(5),
          maxStudents: 25,
          initialEnrolledCount: 21,
          classDays: 'Sunday & Wednesday',
          classStartTime: '15:00',
          classTimezone: 'America/New_York',
          syllabusText:
            'Linguistic Immersion Protocol: Weekly morphological drills, live syntactic parsing on Zoom, and written homework submissions graded directly by faculty.',
          syllabusBoxes: ARABIC_SYLLABUS_BOXES,
        },
        {
          title: 'Usul al-Fiqh & Spiritual Ethics in the Modern Age',
          slug: 'usul-al-fiqh-spiritual-ethics',
          description:
            'Bridging traditional legal methodology, purification of the heart (Tazkiyah), and contemporary ethical navigation.',
          longDescription:
            'Explore how classical scholars derived rulings while maintaining deep spiritual integrity. Students gain access to full HD lecture recordings upon enrollment, annotated PDF syllabi, and interactive live Zoom majlis sessions.',
          thumbnailUrl: 'preset:hero_academy',
          category: 'Sacred Law & Ethics',
          price: '$59',
          duration: '10 Weeks',
          status: 'published',
          instructorId: founderProfile.id,
          instructorName: 'Mustaqeem Shaikh',
          launchDate: formatRelativeDate(9),
          maxStudents: 20,
          initialEnrolledCount: 15,
          classDays: 'Friday & Sunday',
          classStartTime: '16:30',
          classTimezone: 'America/New_York',
          syllabusText:
            'Foundational Jurisprudence & Ethics Syllabus: Combines classical Usul al-Fiqh treatise readings with practical ethical case studies and weekly homework reflections.',
          syllabusBoxes: USUL_SYLLABUS_BOXES,
        },
      ])
      .returning();

    const seerahCourse = insertedCourses[0];
    const arabicCourse = insertedCourses[1];
    const usulCourse = insertedCourses[2];

    // 4. Seed Lessons: Orientation Recordings (isFreePreview=true, publicly viewable) vs Class Recordings (isFreePreview=false, strictly locked until enrolled!)
    await db.insert(lessons).values([
      {
        courseId: seerahCourse.id,
        title: 'Orientation Recording: Seerah Syllabus, Methodology & Study Guide',
        description:
          'Publicly viewable Orientation Recording by Ustadh Mustaqeem Shaikh introducing the Seerah curriculum, primary sources, and weekly Zoom seminar expectations.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'preset:orientation',
        duration: '28:15',
        positionOrder: 1,
        isFreePreview: true, // Orientation recording - visible to everyone
        attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        scheduledDate: formatRelativeDate(-2),
      },
      {
        courseId: seerahCourse.id,
        title: 'Class Recording 01: Pre-Islamic Arabia & The Abrahamic Legacy in Makkah',
        description:
          'Enrolled Student Class Recording examining the geopolitical map of 6th-century Arabia, the lineage of Quraysh, and the spiritual anticipation preceding the first revelation.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'preset:seerah',
        duration: '54:30',
        positionOrder: 2,
        isFreePreview: false, // Class recording - strictly requires enrollment
        attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        scheduledDate: formatRelativeDate(1),
      },
      {
        courseId: seerahCourse.id,
        title: 'Class Recording 02: The First Revelation & Early Sacred Circle (Dar al-Arqam)',
        description:
          'Enrolled Student Class Recording analyzing Surah Al-Alaq and how the Prophet ﷺ cultivated spiritual resilience among the earliest companions.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnailUrl: 'preset:hero_academy',
        duration: '51:10',
        positionOrder: 3,
        isFreePreview: false, // Class recording - strictly requires enrollment
        attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        scheduledDate: formatRelativeDate(4),
      },
      {
        courseId: arabicCourse.id,
        title: 'Orientation Recording: Classical Arabic Program & Assessment Overview',
        description:
          'Publicly viewable Orientation Recording walking through the Arabic Mastery curriculum, weekly drill structure, and live Zoom lab times.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'preset:orientation',
        duration: '24:00',
        positionOrder: 1,
        isFreePreview: true,
        attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        scheduledDate: formatRelativeDate(0),
      },
      {
        courseId: arabicCourse.id,
        title: 'Class Recording 01: The Architecture of the Arabic Root System (Al-Mizan Al-Sarfi)',
        description:
          'Enrolled Student Class Recording on trilateral roots, semantic fields, and morphological patterns in Quranic vocabulary.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'preset:arabic',
        duration: '49:20',
        positionOrder: 2,
        isFreePreview: false,
        attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        scheduledDate: formatRelativeDate(3),
      },
      {
        courseId: usulCourse.id,
        title: 'Orientation Recording: Usul al-Fiqh & Spiritual Ethics Introduction',
        description:
          'Publicly viewable Orientation Recording introducing classical legal theory and student expectations.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnailUrl: 'preset:orientation',
        duration: '26:45',
        positionOrder: 1,
        isFreePreview: true,
        attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        scheduledDate: formatRelativeDate(2),
      },
    ]);

    // 5. Seed Calendar Events & Zoom Live Sessions with Source Timezone for Automatic Country Conversion
    await db.insert(courseEvents).values([
      {
        courseId: seerahCourse.id,
        title: 'New Term Orientation & Seerah Syllabus Walkthrough',
        description:
          'Live academic orientation session with Principal Faculty Mustaqeem Shaikh covering study resources, weekly schedules, and live Q&A.',
        eventType: 'orientation',
        eventDate: formatRelativeDate(0),
        startTime: '14:00',
        sourceTimezone: 'America/New_York',
        duration: '60 min',
        zoomJoinUrl: 'https://zoom.us/j/94827165011',
        zoomMeetingId: '948 2716 5011',
        zoomPasscode: 'HIJRAH26',
        thumbnailUrl: 'preset:orientation',
        instructorName: 'Mustaqeem Shaikh',
        isPublic: true,
      },
      {
        courseId: seerahCourse.id,
        title: 'Live Zoom Class: The Prophetic Seerah Cohort Session 01',
        description:
          'Weekly live Zoom class for enrolled Seerah students. Time is automatically converted to your local country timezone.',
        eventType: 'zoom_session',
        eventDate: formatRelativeDate(2),
        startTime: '14:00',
        sourceTimezone: 'America/New_York',
        duration: '90 min',
        zoomJoinUrl: 'https://zoom.us/j/94827165022',
        zoomMeetingId: '948 2716 5022',
        zoomPasscode: 'SEERAH01',
        thumbnailUrl: 'preset:seerah',
        instructorName: 'Mustaqeem Shaikh',
        isPublic: true,
      },
      {
        courseId: arabicCourse.id,
        title: 'Live Zoom Class: Quranic Syntax & Root Analysis Lab',
        description:
          'Interactive live Zoom classroom for enrolled Arabic Mastery students to practice grammatical parsing directly with Mustaqeem Shaikh.',
        eventType: 'zoom_session',
        eventDate: formatRelativeDate(3),
        startTime: '15:00',
        sourceTimezone: 'America/New_York',
        duration: '75 min',
        zoomJoinUrl: 'https://zoom.us/j/94827165033',
        zoomMeetingId: '948 2716 5033',
        zoomPasscode: 'BALAGHAH',
        thumbnailUrl: 'preset:arabic',
        instructorName: 'Mustaqeem Shaikh',
        isPublic: true,
      },
      {
        courseId: usulCourse.id,
        title: 'Cohort Launch & Orientation: Usul al-Fiqh & Spiritual Ethics',
        description:
          'Opening orientation and first live Zoom majlis introducing the foundational texts of Usul al-Fiqh.',
        eventType: 'orientation',
        eventDate: formatRelativeDate(6),
        startTime: '16:30',
        sourceTimezone: 'America/New_York',
        duration: '60 min',
        zoomJoinUrl: 'https://zoom.us/j/94827165044',
        zoomMeetingId: '948 2716 5044',
        zoomPasscode: 'USUL2026',
        thumbnailUrl: 'preset:hero_academy',
        instructorName: 'Mustaqeem Shaikh',
        isPublic: true,
      },
    ]);

    return { seeded: true, founderId: founderProfile.id };
  } catch (error) {
    console.error('Error in ensureInitialAcademySetup:', error);
    throw new Error('Failed to initialize academy data.', { cause: error });
  }
}
