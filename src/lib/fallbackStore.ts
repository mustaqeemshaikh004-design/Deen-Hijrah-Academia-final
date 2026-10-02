import {
  Course,
  Lesson,
  CourseEvent,
  HomepageSlide,
  Profile,
  Enrollment,
  Message,
  HomeworkSubmission,
} from '../types.ts';

const STORAGE_KEY = 'deen_hijrah_portal_store_v1';

interface PortalStoreState {
  profiles: Profile[];
  courses: Course[];
  lessons: Lesson[];
  events: CourseEvent[];
  slides: HomepageSlide[];
  enrollments: Enrollment[];
  messages: Message[];
  homework: HomeworkSubmission[];
  media: Record<number, { id: number; fileName: string; mimeType: string; dataUrl: string }>;
}

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

function createDefaultStoreState(): PortalStoreState {
  const nowIso = new Date().toISOString();
  const founderProfile: Profile = {
    id: 1,
    uid: 'founder-mustaqeem-shaikh',
    fullName: 'Mustaqeem Shaikh',
    email: 'mustaqeemshaikh004@gmail.com',
    role: 'admin',
    title: 'Principal Faculty & Founder',
    avatarUrl: null,
    createdAt: nowIso,
  };

  const slides: HomepageSlide[] = [
    {
      id: 1,
      title: 'Autumn Term Orientation & Live Q&A Session',
      subtitle:
        'Publicly accessible Orientation Recording with Principal Faculty Mustaqeem Shaikh covering the Deen Hijrah Academia syllabus, global class timezone schedule, and enrollment process.',
      mediaType: 'video',
      badgeText: 'Orientation Session',
      thumbnailUrl: 'preset:orientation',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      ctaText: 'View Orientation Schedule',
      ctaLink: '#calendar',
      instructorName: 'Mustaqeem Shaikh',
      positionOrder: 1,
      createdAt: nowIso,
    },
    {
      id: 2,
      title: 'The Prophetic Seerah: Meccan & Medinan Chronicles',
      subtitle:
        'An immersive historical and spiritual analysis of the life of the Prophet ﷺ, combining classical manuscript sources with weekly live Zoom seminars and structured syllabus modules.',
      mediaType: 'video',
      badgeText: 'Featured Course',
      thumbnailUrl: 'preset:seerah',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      ctaText: 'Explore Syllabus & Enroll',
      ctaLink: '#courses',
      instructorName: 'Mustaqeem Shaikh',
      positionOrder: 2,
      createdAt: nowIso,
    },
    {
      id: 3,
      title: 'Foundations of Classical Arabic & Quranic Balaghah',
      subtitle:
        'Orientation overview of our linguistic immersion program unpacking the morphology, syntax, and rhetorical beauty of the Quranic text.',
      mediaType: 'video',
      badgeText: 'Orientation Session',
      thumbnailUrl: 'preset:arabic',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      ctaText: 'Inspect Course Syllabus',
      ctaLink: '#courses',
      instructorName: 'Mustaqeem Shaikh',
      positionOrder: 3,
      createdAt: nowIso,
    },
  ];

  const courses: Course[] = [
    {
      id: 1,
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
      instructorId: 1,
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
      syllabusFileUrl: null,
      createdAt: nowIso,
    },
    {
      id: 2,
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
      instructorId: 1,
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
      syllabusFileUrl: null,
      createdAt: nowIso,
    },
    {
      id: 3,
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
      instructorId: 1,
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
      syllabusFileUrl: null,
      createdAt: nowIso,
    },
  ];

  const lessons: Lesson[] = [
    {
      id: 1,
      courseId: 1,
      title: 'Orientation Recording: Seerah Syllabus, Methodology & Study Guide',
      description:
        'Publicly viewable Orientation Recording by Ustadh Mustaqeem Shaikh introducing the Seerah curriculum, primary sources, and weekly Zoom seminar expectations.',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'preset:orientation',
      duration: '28:15',
      positionOrder: 1,
      isFreePreview: true,
      attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      scheduledDate: formatRelativeDate(-2),
      createdAt: nowIso,
    },
    {
      id: 2,
      courseId: 1,
      title: 'Class Recording 01: Pre-Islamic Arabia & The Abrahamic Legacy in Makkah',
      description:
        'Enrolled Student Class Recording examining the geopolitical map of 6th-century Arabia, the lineage of Quraysh, and the spiritual anticipation preceding the first revelation.',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'preset:seerah',
      duration: '54:30',
      positionOrder: 2,
      isFreePreview: false,
      attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      scheduledDate: formatRelativeDate(1),
      createdAt: nowIso,
    },
    {
      id: 3,
      courseId: 1,
      title: 'Class Recording 02: The First Revelation & Early Sacred Circle (Dar al-Arqam)',
      description:
        'Enrolled Student Class Recording analyzing Surah Al-Alaq and how the Prophet ﷺ cultivated spiritual resilience among the earliest companions.',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnailUrl: 'preset:hero_academy',
      duration: '51:10',
      positionOrder: 3,
      isFreePreview: false,
      attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      scheduledDate: formatRelativeDate(4),
      createdAt: nowIso,
    },
    {
      id: 4,
      courseId: 2,
      title: 'Orientation Recording: Classical Arabic Program & Assessment Overview',
      description:
        'Publicly viewable Orientation Recording walking through the Arabic Mastery curriculum, weekly drill structure, and live Zoom lab times.',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'preset:orientation',
      duration: '24:00',
      positionOrder: 1,
      isFreePreview: true,
      attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      scheduledDate: formatRelativeDate(0),
      createdAt: nowIso,
    },
    {
      id: 5,
      courseId: 2,
      title: 'Class Recording 01: The Architecture of the Arabic Root System (Al-Mizan Al-Sarfi)',
      description:
        'Enrolled Student Class Recording on trilateral roots, semantic fields, and morphological patterns in Quranic vocabulary.',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'preset:arabic',
      duration: '49:20',
      positionOrder: 2,
      isFreePreview: false,
      attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      scheduledDate: formatRelativeDate(3),
      createdAt: nowIso,
    },
    {
      id: 6,
      courseId: 3,
      title: 'Orientation Recording: Usul al-Fiqh & Spiritual Ethics Introduction',
      description:
        'Publicly viewable Orientation Recording introducing classical legal theory and student expectations.',
      videoUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnailUrl: 'preset:orientation',
      duration: '26:45',
      positionOrder: 1,
      isFreePreview: true,
      attachmentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      scheduledDate: formatRelativeDate(2),
      createdAt: nowIso,
    },
  ];

  const events: CourseEvent[] = [
    {
      id: 1,
      courseId: 1,
      title: 'New Term Orientation & Seerah Syllabus Walkthrough',
      description:
        'Live academic orientation session with Principal Faculty Mustaqeem Shaikh covering study resources, weekly schedules, and live Q&A.',
      eventType: 'orientation',
      eventDate: formatRelativeDate(0),
      startTime: '14:00',
      sourceTimezone: 'America/New_York',
      duration: '60 min',
      zoomJoinUrl: 'https://zoom.us/j/94827165011',
      zoomPasscode: 'DEEN2025',
      isPublic: true,
      instructorName: 'Mustaqeem Shaikh',
      createdAt: nowIso,
    },
    {
      id: 2,
      courseId: 1,
      title: 'Seerah Live Zoom Seminar: The Meccan Period & Revelation',
      description:
        'Interactive live Zoom seminar for enrolled Seerah students. Please complete Module 01 readings before joining.',
      eventType: 'zoom_session',
      eventDate: formatRelativeDate(2),
      startTime: '14:00',
      sourceTimezone: 'America/New_York',
      duration: '90 min',
      zoomJoinUrl: 'https://zoom.us/j/94827165022',
      zoomPasscode: 'SEERAH01',
      isPublic: false,
      instructorName: 'Mustaqeem Shaikh',
      createdAt: nowIso,
    },
    {
      id: 3,
      courseId: 2,
      title: 'Classical Arabic Live Translation & Nahw Lab',
      description:
        'Weekly live Zoom linguistic lab analyzing classical syntax and morphological patterns.',
      eventType: 'zoom_session',
      eventDate: formatRelativeDate(4),
      startTime: '15:00',
      sourceTimezone: 'America/New_York',
      duration: '75 min',
      zoomJoinUrl: 'https://zoom.us/j/94827165033',
      zoomPasscode: 'ARABIC01',
      isPublic: false,
      instructorName: 'Mustaqeem Shaikh',
      createdAt: nowIso,
    },
  ];

  return {
    profiles: [founderProfile],
    courses,
    lessons,
    events,
    slides,
    enrollments: [],
    messages: [],
    homework: [],
    media: {},
  };
}

function loadStore(): PortalStoreState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PortalStoreState>;
      const defaults = createDefaultStoreState();
      return {
        profiles: Array.isArray(parsed.profiles) && parsed.profiles.length > 0 ? parsed.profiles : defaults.profiles,
        courses: Array.isArray(parsed.courses) ? parsed.courses : defaults.courses,
        lessons: Array.isArray(parsed.lessons) ? parsed.lessons : defaults.lessons,
        events: Array.isArray(parsed.events) ? parsed.events : defaults.events,
        slides: Array.isArray(parsed.slides) ? parsed.slides : defaults.slides,
        enrollments: Array.isArray(parsed.enrollments) ? parsed.enrollments : defaults.enrollments,
        messages: Array.isArray(parsed.messages) ? parsed.messages : defaults.messages,
        homework: Array.isArray(parsed.homework) ? parsed.homework : defaults.homework,
        media: parsed.media || {},
      };
    }
  } catch {
    // ignore storage errors
  }
  const initial = createDefaultStoreState();
  saveStore(initial);
  return initial;
}

function saveStore(state: PortalStoreState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function syncServerPortalSnapshot(data: {
  courses?: Course[];
  lessons?: Lesson[];
  events?: CourseEvent[];
  slides?: HomepageSlide[];
  profiles?: Profile[];
  enrollments?: Enrollment[];
}) {
  const store = loadStore();
  if (Array.isArray(data.courses) && data.courses.length > 0) store.courses = data.courses;
  if (Array.isArray(data.lessons) && data.lessons.length > 0) store.lessons = data.lessons;
  if (Array.isArray(data.events) && data.events.length > 0) store.events = data.events;
  if (Array.isArray(data.slides) && data.slides.length > 0) store.slides = data.slides;
  if (Array.isArray(data.profiles) && data.profiles.length > 0) {
    // Merge profiles so any locally created accounts remain available
    const byEmail = new Map<string, Profile>();
    for (const p of store.profiles) {
      byEmail.set(p.email.toLowerCase(), p);
    }
    for (const p of data.profiles) {
      byEmail.set(p.email.toLowerCase(), p);
    }
    store.profiles = Array.from(byEmail.values());
  }
  if (Array.isArray(data.enrollments)) {
    const byKey = new Map<string, Enrollment>();
    for (const e of store.enrollments) {
      byKey.set(`${e.studentId}:${e.courseId}`, e);
    }
    for (const e of data.enrollments) {
      byKey.set(`${e.studentId}:${e.courseId}`, e);
    }
    store.enrollments = Array.from(byKey.values());
  }
  saveStore(store);
}

function getOrCreateLocalProfile(
  store: PortalStoreState,
  uid: string,
  email: string,
  fullName?: string,
  avatarUrl?: string | null
): Profile {
  const cleanEmail = (email || 'student@deenhijrah.edu').trim().toLowerCase();
  const isFounder =
    cleanEmail === 'mustaqeemshaikh004@gmail.com' ||
    cleanEmail === 'faculty@deenhijrah.edu' ||
    uid === 'founder-mustaqeem-shaikh';

  if (isFounder) {
    let founder = store.profiles.find(
      (p) =>
        p.uid === 'founder-mustaqeem-shaikh' ||
        p.email.toLowerCase() === 'mustaqeemshaikh004@gmail.com' ||
        p.role === 'admin'
    );
    if (!founder) {
      founder = {
        id: 1,
        uid: 'founder-mustaqeem-shaikh',
        fullName: 'Mustaqeem Shaikh',
        email: 'mustaqeemshaikh004@gmail.com',
        role: 'admin',
        title: 'Principal Faculty & Founder',
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      };
      store.profiles.unshift(founder);
      saveStore(store);
    }
    return founder;
  }

  let existing = store.profiles.find(
    (p) => p.uid === uid || p.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    if (fullName && (!existing.fullName || existing.fullName === 'Scholar Student')) {
      existing.fullName = fullName;
    }
    if (avatarUrl && !existing.avatarUrl) {
      existing.avatarUrl = avatarUrl;
    }
    saveStore(store);
    return existing;
  }

  const nextId =
    store.profiles.reduce((max, p) => Math.max(max, p.id), 1) + 1;
  const fallbackName =
    fullName?.trim() ||
    cleanEmail
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() ||
    'Scholar Student';

  const created: Profile = {
    id: nextId,
    uid: uid || `user-${nextId}-${Date.now().toString().slice(-4)}`,
    fullName: fallbackName,
    email: cleanEmail,
    role: 'student',
    title: 'Enrolled Scholar Student',
    avatarUrl: avatarUrl || null,
    createdAt: new Date().toISOString(),
  };

  store.profiles.push(created);
  saveStore(store);
  return created;
}

function parseIdentityFromAuthHeader(authHeader?: string | null): {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
} | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  if (token.startsWith('academy-session:')) {
    const parts = token.split(':');
    const uid = parts[1] || 'student-user';
    const email = parts[2] || 'student@deenhijrah.edu';
    const name = parts[3] ? decodeURIComponent(parts[3]) : undefined;
    const picture = parts[4] ? decodeURIComponent(parts[4]) : undefined;
    return { uid, email, name, picture };
  }

  // Decode Firebase JWT payload if it's a 3-part JWT token
  const jwtParts = token.split('.');
  if (jwtParts.length === 3) {
    try {
      const base64 = jwtParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonStr);
      return {
        uid: payload.user_id || payload.sub || `google-${Date.now()}`,
        email: payload.email || 'student@deenhijrah.edu',
        name: payload.name || undefined,
        picture: payload.picture || undefined,
      };
    } catch {
      // fall through
    }
  }

  return null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleLocalFallbackRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const store = loadStore();
  const method = (options.method || 'GET').toUpperCase();
  const pathOnly = url.split('?')[0];

  const headers = new Headers(options.headers || {});
  const authHeader = headers.get('Authorization');
  const identity = parseIdentityFromAuthHeader(authHeader);

  let body: Record<string, any> = {};
  if (typeof options.body === 'string' && options.body.trim()) {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = {};
    }
  }

  // 1. GET /api/portal-data
  if (pathOnly === '/api/portal-data' && method === 'GET') {
    const sanitizedProfiles = store.profiles.map((p) => ({
      ...p,
      email:
        p.role === 'admin' || p.uid === 'founder-mustaqeem-shaikh'
          ? 'faculty@deenhijrah.edu'
          : p.email,
    }));
    return jsonResponse({
      courses: store.courses,
      lessons: store.lessons,
      events: store.events,
      slides: store.slides,
      profiles: sanitizedProfiles,
      enrollments: store.enrollments,
    });
  }

  // 2. POST /api/auth/create-edu-account
  if (pathOnly === '/api/auth/create-edu-account' && method === 'POST') {
    const rawFirst = String(body.firstName || '').trim();
    const rawLast = String(body.lastName || '').trim();
    const rawEmail = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || 'deen123').trim() || 'deen123';

    const effectiveFirst = rawFirst.includes('@') ? rawFirst.split('@')[0] : rawFirst;
    const cleanFirst = effectiveFirst.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLast = rawLast.toLowerCase().replace(/[^a-z0-9]/g, '');

    const derivedFirstName =
      effectiveFirst ||
      (rawEmail ? rawEmail.split('@')[0].replace(/[._-]+/g, ' ') : 'Scholar');
    const formattedName =
      `${derivedFirstName} ${rawLast}`
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Scholar Student';

    const candidateEmail = rawEmail
      ? rawEmail.includes('@')
        ? rawEmail
        : `${rawEmail}@deenhijrah.edu`
      : rawFirst.includes('@')
      ? rawFirst.toLowerCase()
      : `${cleanFirst || 'scholar'}@deenhijrah.edu`;

    const uid =
      candidateEmail === 'mustaqeemshaikh004@gmail.com' ||
      candidateEmail === 'faculty@deenhijrah.edu'
        ? 'founder-mustaqeem-shaikh'
        : `edu-${cleanFirst || 'user'}-${cleanLast || 'scholar'}-${Date.now()
            .toString()
            .slice(-4)}`;

    const profile = getOrCreateLocalProfile(store, uid, candidateEmail, formattedName, null);
    const sessionToken = `academy-session:${profile.uid}:${profile.email}:${encodeURIComponent(
      profile.fullName
    )}`;
    const sanitizedProfile: Profile = {
      ...profile,
      email: profile.role === 'admin' ? 'faculty@deenhijrah.edu' : profile.email,
    };

    return jsonResponse({
      sessionToken,
      profile: sanitizedProfile,
      account: {
        id: profile.id,
        fullName: profile.fullName,
        email: sanitizedProfile.email,
        password,
        role: profile.role,
      },
    });
  }

  // 3. POST /api/auth/sign-in
  if (pathOnly === '/api/auth/sign-in' && method === 'POST') {
    const rawEmail = String(body.email || '').trim().toLowerCase();
    if (!rawEmail) {
      return jsonResponse({ error: 'Please enter your email address to sign in.' }, 400);
    }
    const cleanEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@deenhijrah.edu`;
    const localPart = cleanEmail.split('@')[0] || 'Scholar';
    const displayName =
      localPart
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim() || 'Scholar Student';
    const uid =
      cleanEmail === 'mustaqeemshaikh004@gmail.com' || cleanEmail === 'faculty@deenhijrah.edu'
        ? 'founder-mustaqeem-shaikh'
        : `edu-${localPart.replace(/[^a-z0-9]/g, '') || 'scholar'}`;

    const profile = getOrCreateLocalProfile(store, uid, cleanEmail, displayName, null);
    const sessionToken = `academy-session:${profile.uid}:${profile.email}:${encodeURIComponent(
      profile.fullName
    )}`;
    return jsonResponse({
      sessionToken,
      profile: {
        ...profile,
        email: profile.role === 'admin' ? 'faculty@deenhijrah.edu' : profile.email,
      },
    });
  }

  // 4. POST /api/auth/google
  if (pathOnly === '/api/auth/google' && method === 'POST') {
    const rawEmail = String(body.email || '').trim().toLowerCase() || 'student@gmail.com';
    const cleanEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@gmail.com`;
    const fullName =
      String(body.fullName || '').trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim() ||
      'Scholar Student';
    const uid =
      cleanEmail === 'mustaqeemshaikh004@gmail.com' || cleanEmail === 'faculty@deenhijrah.edu'
        ? 'founder-mustaqeem-shaikh'
        : String(body.uid || '').trim() ||
          `google-${cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '') || 'user'}`;
    const avatarUrl = body.avatarUrl ? String(body.avatarUrl) : null;

    const profile = getOrCreateLocalProfile(store, uid, cleanEmail, fullName, avatarUrl);
    const sessionToken = `academy-session:${profile.uid}:${profile.email}:${encodeURIComponent(
      profile.fullName
    )}`;
    return jsonResponse({
      sessionToken,
      profile: {
        ...profile,
        email: profile.role === 'admin' ? 'faculty@deenhijrah.edu' : profile.email,
      },
    });
  }

  // 4B. POST /api/faculty/join
  if (pathOnly === '/api/faculty/join' && method === 'POST') {
    const cleanName = String(body.fullName || '').trim() || 'Faculty Instructor';
    const rawEmail = String(body.email || '').trim().toLowerCase() || 'instructor@deenhijrah.edu';
    const cleanEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@deenhijrah.edu`;
    const country = String(body.country || 'United States').trim();
    const timezone = String(body.timezone || 'America/New_York').trim();
    const nextTitle =
      String(body.title || '').trim() || `Course Instructor (${country})`;

    const uid =
      cleanEmail === 'mustaqeemshaikh004@gmail.com' || cleanEmail === 'faculty@deenhijrah.edu'
        ? 'founder-mustaqeem-shaikh'
        : `faculty-${cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '') || 'teacher'}`;

    const teacherProfile = getOrCreateLocalProfile(store, uid, cleanEmail, cleanName, null);
    teacherProfile.fullName = cleanName;
    // Founder Mustaqeem Shaikh stays 'admin'; all other teachers get 'instructor' (NOT 'admin')
    teacherProfile.role = teacherProfile.role === 'admin' ? 'admin' : 'instructor';
    teacherProfile.title = nextTitle;

    let assignedCourse: Course | undefined;
    if (body.courseMode === 'existing' && body.courseId) {
      const target = store.courses.find((c) => c.id === Number(body.courseId));
      if (target) {
        target.instructorId = teacherProfile.id;
        target.instructorName = teacherProfile.fullName;
        if (body.classDays) target.classDays = String(body.classDays);
        if (body.classStartTime) target.classStartTime = String(body.classStartTime);
        if (timezone) target.classTimezone = timezone;
        assignedCourse = target;
      }
    }

    if (!assignedCourse) {
      const nextCourseId =
        store.courses.reduce((max, c) => Math.max(max, c.id), 0) + 1;
      const effectiveTitle =
        String(body.newCourseTitle || '').trim() || `${cleanName} — Sacred Knowledge Seminar`;
      const createdCourse: Course = {
        id: nextCourseId,
        title: effectiveTitle,
        slug:
          effectiveTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') +
          '-' +
          nextCourseId,
        description:
          String(body.newCourseDescription || body.credentialsBio || '').trim() ||
          `Led by ${teacherProfile.fullName} (${nextTitle}).`,
        longDescription:
          String(body.newCourseDescription || body.credentialsBio || '').trim() ||
          `Structured curriculum led by ${teacherProfile.fullName}.`,
        thumbnailUrl: 'preset:arabic',
        category: String(body.newCourseCategory || 'Islamic Studies').trim(),
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
              String(body.newCourseDescription || body.credentialsBio || '').trim() ||
              'Introduction to core texts, principles, and weekly seminar readings.',
            deliverable: 'Module 1 Reflection',
          },
        ]),
        syllabusFileUrl: body.resumeUrl ? String(body.resumeUrl) : null,
        classDays: String(body.classDays || 'Sunday & Thursday'),
        classStartTime: String(body.classStartTime || '15:00'),
        classTimezone: timezone,
        createdAt: new Date().toISOString(),
      };
      store.courses.push(createdCourse);
      assignedCourse = createdCourse;
    }

    // Notify Founder Mustaqeem Shaikh
    const founder =
      store.profiles.find(
        (p) => p.uid === 'founder-mustaqeem-shaikh' || p.role === 'admin'
      ) || store.profiles[0];
    if (founder) {
      const nextMsgId =
        store.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;
      store.messages.push({
        id: nextMsgId,
        senderId: teacherProfile.id,
        receiverId: founder.id,
        subject: `[FACULTY_APPLICATION] ${teacherProfile.fullName} — Course: ${assignedCourse.title}`,
        body: `Assalamu alaykum Ustadh Mustaqeem Shaikh,\n\n${teacherProfile.fullName} (${cleanEmail}) has joined the faculty as the Course Teacher for "${assignedCourse.title}".\n• Country & Timezone: ${country} (${timezone})\n• Class Schedule: ${body.classDays || 'Sun & Thu'} at ${body.classStartTime || '15:00'}\n• Qualifications / Bio: ${body.credentialsBio || 'Provided'}`,
        readStatus: false,
        createdAt: new Date().toISOString(),
      });
    }

    saveStore(store);

    const sessionToken = `academy-session:${teacherProfile.uid}:${teacherProfile.email}:${encodeURIComponent(
      teacherProfile.fullName
    )}`;

    return jsonResponse({
      sessionToken,
      profile: {
        ...teacherProfile,
        email: teacherProfile.role === 'admin' ? 'faculty@deenhijrah.edu' : teacherProfile.email,
      },
      assignedCourse,
    });
  }

  // 5. GET /api/me
  if (pathOnly === '/api/me' && method === 'GET') {
    if (!identity) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const profile = getOrCreateLocalProfile(
      store,
      identity.uid,
      identity.email,
      identity.name,
      identity.picture
    );
    const isFaculty = profile.role === 'admin' || profile.role === 'instructor';
    const userMessages = isFaculty
      ? store.messages
      : store.messages.filter(
          (m) => m.senderId === profile.id || m.receiverId === profile.id
        );
    const userHomework = isFaculty
      ? store.homework
      : store.homework.filter((h) => h.studentId === profile.id);

    return jsonResponse({
      profile: {
        ...profile,
        email: profile.role === 'admin' ? 'faculty@deenhijrah.edu' : profile.email,
      },
      messages: userMessages,
      homework: userHomework,
    });
  }

  // 6. POST /api/enrollments
  if (pathOnly === '/api/enrollments' && method === 'POST') {
    const activeIdentity = identity || {
      uid: 'guest-student',
      email: 'student@deenhijrah.edu',
      name: 'Scholar Student',
    };
    const currentProfile = getOrCreateLocalProfile(
      store,
      activeIdentity.uid,
      activeIdentity.email,
      activeIdentity.name
    );
    const isAdminRequest = currentProfile.role === 'admin' && Boolean(body.studentId);
    const targetStudentId = isAdminRequest ? Number(body.studentId) : currentProfile.id;
    const courseId = Number(body.courseId);

    const existing = store.enrollments.find(
      (e) => e.studentId === targetStudentId && e.courseId === courseId
    );
    if (existing) {
      return jsonResponse(existing);
    }

    const nextId =
      store.enrollments.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    const created: Enrollment = {
      id: nextId,
      studentId: targetStudentId,
      courseId,
      progressPercentage: 0,
      completedLessonIds: '[]',
      enrolledAt: new Date().toISOString(),
    };
    store.enrollments.unshift(created);
    saveStore(store);
    return jsonResponse(created);
  }

  // 7. PUT /api/enrollments/:id/progress
  const progressMatch = pathOnly.match(/^\/api\/enrollments\/(\d+)\/progress$/);
  if (progressMatch && method === 'PUT') {
    const enrollmentId = Number(progressMatch[1]);
    const target = store.enrollments.find((e) => e.id === enrollmentId);
    if (target) {
      target.completedLessonIds = JSON.stringify(
        Array.isArray(body.completedLessonIds) ? body.completedLessonIds : []
      );
      target.progressPercentage = Number(body.progressPercentage) || 0;
      saveStore(store);
      return jsonResponse(target);
    }
    return jsonResponse({ error: 'Enrollment not found' }, 404);
  }

  // 8. DELETE /api/enrollments/:id
  const deleteEnrollmentMatch = pathOnly.match(/^\/api\/enrollments\/(\d+)$/);
  if (deleteEnrollmentMatch && method === 'DELETE') {
    const enrollmentId = Number(deleteEnrollmentMatch[1]);
    store.enrollments = store.enrollments.filter((e) => e.id !== enrollmentId);
    saveStore(store);
    return jsonResponse({ success: true });
  }

  // 9. POST /api/homework
  if (pathOnly === '/api/homework' && method === 'POST') {
    const activeIdentity = identity || {
      uid: 'guest-student',
      email: 'student@deenhijrah.edu',
      name: 'Scholar Student',
    };
    const student = getOrCreateLocalProfile(
      store,
      activeIdentity.uid,
      activeIdentity.email,
      activeIdentity.name
    );
    const nextId = store.homework.reduce((max, h) => Math.max(max, h.id), 0) + 1;
    const created: HomeworkSubmission = {
      id: nextId,
      courseId: Number(body.courseId),
      lessonId: body.lessonId ? Number(body.lessonId) : null,
      studentId: student.id,
      studentName: student.fullName,
      title: String(body.title || 'Homework Submission'),
      content: String(body.content || ''),
      attachmentUrl: body.attachmentUrl ? String(body.attachmentUrl) : null,
      status: 'submitted',
      grade: null,
      feedback: null,
      submittedAt: new Date().toISOString(),
    };
    store.homework.unshift(created);
    saveStore(store);
    return jsonResponse(created);
  }

  // 10. PUT /api/homework/:id/feedback or PUT /api/admin/homework/:id/grade
  const hwGradeMatch =
    pathOnly.match(/^\/api\/homework\/(\d+)\/feedback$/) ||
    pathOnly.match(/^\/api\/admin\/homework\/(\d+)\/grade$/);
  if (hwGradeMatch && method === 'PUT') {
    const submissionId = Number(hwGradeMatch[1]);
    const target = store.homework.find((h) => h.id === submissionId);
    if (target) {
      target.grade = String(body.grade || 'A (95%)');
      target.feedback = String(body.feedback || '');
      target.status = (body.status || 'graded') as HomeworkSubmission['status'];
      saveStore(store);
      return jsonResponse(target);
    }
    return jsonResponse({ error: 'Submission not found' }, 404);
  }

  // 11. POST /api/messages
  if (pathOnly === '/api/messages' && method === 'POST') {
    const activeIdentity = identity || {
      uid: 'guest-student',
      email: 'student@deenhijrah.edu',
      name: 'Scholar Student',
    };
    const sender = getOrCreateLocalProfile(
      store,
      activeIdentity.uid,
      activeIdentity.email,
      activeIdentity.name
    );
    const nextId = store.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;
    const created: Message = {
      id: nextId,
      senderId: sender.id,
      receiverId: Number(body.receiverId || 1),
      subject: String(body.subject || 'Academic Inquiry'),
      body: String(body.body || ''),
      readStatus: false,
      createdAt: new Date().toISOString(),
    };
    store.messages.unshift(created);
    saveStore(store);
    return jsonResponse(created);
  }

  // 12. PUT /api/messages/:id/read
  const msgReadMatch = pathOnly.match(/^\/api\/messages\/(\d+)\/read$/);
  if (msgReadMatch && method === 'PUT') {
    const msgId = Number(msgReadMatch[1]);
    const target = store.messages.find((m) => m.id === msgId);
    if (target) {
      target.readStatus = true;
      saveStore(store);
      return jsonResponse(target);
    }
    return jsonResponse({ success: true });
  }

  // 13. POST /api/upload-media
  if (pathOnly === '/api/upload-media' && method === 'POST') {
    const dataUrl = String(body.dataUrl || '');
    return jsonResponse({
      id: Date.now(),
      url: dataUrl,
      fileName: String(body.fileName || 'upload.bin'),
    });
  }

  // 14. Admin Courses CRUD
  if (pathOnly === '/api/admin/courses' && method === 'POST') {
    const nextId = store.courses.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const created: Course = {
      id: nextId,
      title: String(body.title || 'New Course'),
      slug:
        body.slug ||
        `${String(body.title || 'course')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}-${nextId}`,
      description: String(body.description || ''),
      longDescription: String(body.longDescription || body.description || ''),
      thumbnailUrl: String(body.thumbnailUrl || 'preset:seerah'),
      category: String(body.category || 'Islamic Studies'),
      price: String(body.price || 'Free'),
      duration: String(body.duration || '8 Weeks'),
      status: body.status === 'draft' ? 'draft' : 'published',
      instructorId: 1,
      instructorName: String(body.instructorName || 'Mustaqeem Shaikh'),
      launchDate: body.launchDate ? String(body.launchDate) : null,
      maxStudents: body.maxStudents !== undefined ? Number(body.maxStudents) : 25,
      initialEnrolledCount:
        body.initialEnrolledCount !== undefined ? Number(body.initialEnrolledCount) : 0,
      syllabusText: body.syllabusText ? String(body.syllabusText) : null,
      syllabusBoxes:
        typeof body.syllabusBoxes === 'string'
          ? body.syllabusBoxes
          : JSON.stringify(body.syllabusBoxes || []),
      syllabusFileUrl: body.syllabusFileUrl ? String(body.syllabusFileUrl) : null,
      classDays: body.classDays ? String(body.classDays) : 'Saturday & Wednesday',
      classStartTime: body.classStartTime ? String(body.classStartTime) : '14:00',
      classTimezone: body.classTimezone ? String(body.classTimezone) : 'America/New_York',
      createdAt: new Date().toISOString(),
    };
    store.courses.push(created);
    saveStore(store);
    return jsonResponse(created);
  }

  const adminCourseMatch = pathOnly.match(/^\/api\/admin\/courses\/(\d+)$/);
  if (adminCourseMatch && method === 'PUT') {
    const courseId = Number(adminCourseMatch[1]);
    const idx = store.courses.findIndex((c) => c.id === courseId);
    if (idx !== -1) {
      const updated = {
        ...store.courses[idx],
        ...body,
        syllabusBoxes: Array.isArray(body.syllabusBoxes)
          ? JSON.stringify(body.syllabusBoxes)
          : body.syllabusBoxes ?? store.courses[idx].syllabusBoxes,
      };
      store.courses[idx] = updated;
      saveStore(store);
      return jsonResponse(updated);
    }
  }
  if (adminCourseMatch && method === 'DELETE') {
    const courseId = Number(adminCourseMatch[1]);
    store.courses = store.courses.filter((c) => c.id !== courseId);
    store.lessons = store.lessons.filter((l) => l.courseId !== courseId);
    store.events = store.events.filter((ev) => ev.courseId !== courseId);
    store.enrollments = store.enrollments.filter((e) => e.courseId !== courseId);
    saveStore(store);
    return jsonResponse({ success: true });
  }

  // 15. Admin Lessons CRUD
  if (pathOnly === '/api/admin/lessons' && method === 'POST') {
    const nextId = store.lessons.reduce((max, l) => Math.max(max, l.id), 0) + 1;
    const created: Lesson = {
      id: nextId,
      courseId: Number(body.courseId),
      title: String(body.title || 'New Lesson'),
      description: String(body.description || ''),
      videoUrl: String(body.videoUrl || ''),
      thumbnailUrl: String(body.thumbnailUrl || 'preset:seerah'),
      duration: String(body.duration || '45:00'),
      positionOrder: Number(body.positionOrder || 1),
      isFreePreview: Boolean(body.isFreePreview),
      attachmentUrl: body.attachmentUrl ? String(body.attachmentUrl) : null,
      scheduledDate: body.scheduledDate ? String(body.scheduledDate) : null,
      createdAt: new Date().toISOString(),
    };
    store.lessons.push(created);
    saveStore(store);
    return jsonResponse(created);
  }

  const adminLessonMatch = pathOnly.match(/^\/api\/admin\/lessons\/(\d+)$/);
  if (adminLessonMatch && method === 'PUT') {
    const lessonId = Number(adminLessonMatch[1]);
    const idx = store.lessons.findIndex((l) => l.id === lessonId);
    if (idx !== -1) {
      store.lessons[idx] = { ...store.lessons[idx], ...body };
      saveStore(store);
      return jsonResponse(store.lessons[idx]);
    }
  }
  if (adminLessonMatch && method === 'DELETE') {
    const lessonId = Number(adminLessonMatch[1]);
    store.lessons = store.lessons.filter((l) => l.id !== lessonId);
    saveStore(store);
    return jsonResponse({ success: true });
  }

  // 16. Admin Events CRUD
  if (pathOnly === '/api/admin/events' && method === 'POST') {
    const nextId = store.events.reduce((max, ev) => Math.max(max, ev.id), 0) + 1;
    const created: CourseEvent = {
      id: nextId,
      courseId: body.courseId ? Number(body.courseId) : null,
      title: String(body.title || 'Live Session'),
      description: String(body.description || ''),
      eventType: body.eventType || 'zoom_session',
      eventDate: String(body.eventDate || formatRelativeDate(1)),
      startTime: String(body.startTime || '14:00'),
      sourceTimezone: String(body.sourceTimezone || 'America/New_York'),
      duration: String(body.duration || '60 min'),
      zoomJoinUrl: body.zoomJoinUrl ? String(body.zoomJoinUrl) : null,
      zoomPasscode: body.zoomPasscode ? String(body.zoomPasscode) : null,
      isPublic: Boolean(body.isPublic ?? body.isPublicOrientation),
      instructorName: String(body.instructorName || 'Mustaqeem Shaikh'),
      createdAt: new Date().toISOString(),
    };
    store.events.push(created);
    saveStore(store);
    return jsonResponse(created);
  }

  const adminEventMatch = pathOnly.match(/^\/api\/admin\/events\/(\d+)$/);
  if (adminEventMatch && method === 'PUT') {
    const eventId = Number(adminEventMatch[1]);
    const idx = store.events.findIndex((ev) => ev.id === eventId);
    if (idx !== -1) {
      store.events[idx] = { ...store.events[idx], ...body };
      saveStore(store);
      return jsonResponse(store.events[idx]);
    }
  }
  if (adminEventMatch && method === 'DELETE') {
    const eventId = Number(adminEventMatch[1]);
    store.events = store.events.filter((ev) => ev.id !== eventId);
    saveStore(store);
    return jsonResponse({ success: true });
  }

  // 17. Admin Slides CRUD
  if (pathOnly === '/api/admin/slides' && method === 'POST') {
    const nextId = store.slides.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    const created: HomepageSlide = {
      id: nextId,
      title: String(body.title || 'Featured Slide'),
      subtitle: String(body.subtitle || ''),
      mediaType: body.mediaType === 'image' ? 'image' : 'video',
      badgeText: String(body.badgeText || 'Orientation Session'),
      thumbnailUrl: String(body.thumbnailUrl || 'preset:orientation'),
      videoUrl: body.videoUrl ? String(body.videoUrl) : null,
      ctaText: String(body.ctaText || 'Explore Courses'),
      ctaLink: String(body.ctaLink || '#courses'),
      instructorName: String(body.instructorName || 'Mustaqeem Shaikh'),
      positionOrder: Number(body.positionOrder || 1),
      createdAt: new Date().toISOString(),
    };
    store.slides.push(created);
    saveStore(store);
    return jsonResponse(created);
  }

  const adminSlideMatch = pathOnly.match(/^\/api\/admin\/slides\/(\d+)$/);
  if (adminSlideMatch && method === 'PUT') {
    const slideId = Number(adminSlideMatch[1]);
    const idx = store.slides.findIndex((s) => s.id === slideId);
    if (idx !== -1) {
      store.slides[idx] = { ...store.slides[idx], ...body };
      saveStore(store);
      return jsonResponse(store.slides[idx]);
    }
  }
  if (adminSlideMatch && method === 'DELETE') {
    const slideId = Number(adminSlideMatch[1]);
    store.slides = store.slides.filter((s) => s.id !== slideId);
    saveStore(store);
    return jsonResponse({ success: true });
  }

  // 18. Admin Users & Founder Avatar & State controls
  if (pathOnly === '/api/admin/founder-avatar' && method === 'PUT') {
    const founder = store.profiles.find(
      (p) =>
        p.uid === 'founder-mustaqeem-shaikh' ||
        p.email.toLowerCase() === 'mustaqeemshaikh004@gmail.com' ||
        p.role === 'admin'
    );
    if (founder) {
      founder.avatarUrl = body.avatarUrl || null;
      saveStore(store);
      return jsonResponse(founder);
    }
  }

  const adminUserMatch = pathOnly.match(/^\/api\/admin\/users\/(\d+)$/);
  if (adminUserMatch && method === 'PUT') {
    const userId = Number(adminUserMatch[1]);
    const target = store.profiles.find((p) => p.id === userId);
    if (target) {
      if (body.role !== undefined) target.role = body.role;
      if (body.title !== undefined) target.title = body.title;
      if (body.fullName !== undefined) target.fullName = body.fullName;
      if (body.avatarUrl !== undefined) target.avatarUrl = body.avatarUrl;
      saveStore(store);
      return jsonResponse(target);
    }
  }

  if (pathOnly === '/api/admin/clear-all' && method === 'POST') {
    store.courses = [];
    store.lessons = [];
    store.events = [];
    store.slides = [];
    store.enrollments = [];
    store.homework = [];
    store.messages = [];
    saveStore(store);
    return jsonResponse({ success: true });
  }

  if (pathOnly === '/api/admin/seed-demo' && method === 'POST') {
    const fresh = createDefaultStoreState();
    saveStore(fresh);
    return jsonResponse({ success: true });
  }

  if (pathOnly === '/api/admin/save-state' && method === 'POST') {
    saveStore(store);
    return jsonResponse({ success: true, savedAt: new Date().toISOString() });
  }

  return jsonResponse({ ok: true });
}

/**
 * Unified API requester that talks to the Express + Cloud SQL backend when available,
 * and seamlessly falls back to the persistent local store when deployed to static/serverless
 * hosts (like Vercel) or when a route is unreachable.
 */
export async function smartApiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (res.ok && isJson) {
      if (url.startsWith('/api/portal-data')) {
        const clone = res.clone();
        clone
          .json()
          .then((data) => syncServerPortalSnapshot(data))
          .catch(() => {});
      }
      return res;
    }

    // If deployed on a static host (404/405/502/503/504 or HTML fallback) or if an auth endpoint fails,
    // handle transparently via the local fallback store so sign-in, Google auth, and enrollment always work.
    if (
      !isJson ||
      res.status === 404 ||
      res.status === 405 ||
      res.status >= 500 ||
      url.startsWith('/api/auth/') ||
      url.startsWith('/api/me')
    ) {
      return await handleLocalFallbackRequest(url, options);
    }

    return res;
  } catch {
    return await handleLocalFallbackRequest(url, options);
  }
}
