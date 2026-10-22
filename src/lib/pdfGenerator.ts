import { jsPDF } from 'jspdf';
import { Course, Lesson, SyllabusBox } from '../types.ts';
import { convertClassTimeToRegion, getDetectedUserTimezone } from './timezone.ts';

/**
 * Generates and triggers download of a comprehensive, beautifully styled
 * Academic Syllabus Summary PDF for a course.
 */
export function generateCourseSyllabusPdf(
  course: Course,
  lessons: Lesson[],
  userTimezone?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const tz = userTimezone || getDetectedUserTimezone();
  const convertedTime = convertClassTimeToRegion(
    course.launchDate,
    course.classStartTime || '14:00',
    course.classTimezone || 'America/New_York',
    tz
  );

  // Parse modular syllabus boxes
  let boxes: SyllabusBox[] = [];
  try {
    if (course.syllabusBoxes) {
      const parsed = JSON.parse(course.syllabusBoxes);
      if (Array.isArray(parsed)) boxes = parsed;
    }
  } catch {}

  const courseLessons = lessons
    .filter((l) => l.courseId === course.id)
    .sort((a, b) => a.order - b.order);

  // Helper to ensure page breaks
  function ensureSpace(neededMm: number) {
    if (y + neededMm > pageHeight - 20) {
      drawFooter();
      doc.addPage();
      drawHeaderWatermark();
      y = margin + 10;
    }
  }

  function drawHeaderWatermark() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 160, 180);
    doc.text('DEEN HIJRAH ACADEMIA  ·  OFFICIAL COURSE SYLLABUS', margin, 12);
    doc.setDrawColor(30, 60, 90);
    doc.setLineWidth(0.3);
    doc.line(margin, 14, pageWidth - margin, 14);
  }

  function drawFooter() {
    const pageNum = doc.internal.pages.length - 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 160, 180);
    doc.setDrawColor(30, 60, 90);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.text(
      'Deen Hijrah Academia · Sacred Knowledge & Spiritual Journey · deenhijrah.edu',
      margin,
      pageHeight - 9
    );
    doc.text(`Page ${pageNum}`, pageWidth - margin - 12, pageHeight - 9);
  }

  // --- COVER / HEADER BANNER ---
  // Top Banner background
  doc.setFillColor(7, 19, 36); // #071324
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Decorative Teal Accent Line
  doc.setFillColor(45, 212, 191); // Teal 400 (#2DD4BF)
  doc.rect(0, 41, pageWidth, 1.5, 'F');

  // Gold accent line
  doc.setFillColor(212, 175, 55); // Gold
  doc.rect(margin, 10, 4, 22, 'F');

  // Academy Name
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('DEEN HIJRAH ACADEMIA', margin + 7, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(45, 212, 191);
  doc.text('FACULTY CURRICULUM COMMITTEE  ·  OFFICIAL COURSE SYLLABUS SUMMARY', margin + 7, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  const issuedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Document Reference: DHA-SYL-${course.id || 101}  ·  Generated: ${issuedDate}`, margin + 7, 29);

  y = 52;

  // --- COURSE TITLE & METADATA CARD ---
  doc.setFont('times', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(15, 23, 42); // Slate 900
  const titleLines = doc.splitTextToSize(course.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7.5 + 2;

  // Category & Faculty Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(13, 148, 136); // Teal 600
  doc.text(
    `Category: ${course.category.toUpperCase()}   ·   Faculty Instructor: ${course.instructorName || 'Mustaqeem Shaikh'}`,
    margin,
    y
  );
  y += 6;

  // Metadata Grid Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600

  // Column 1
  doc.text('Program Duration:', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(course.duration || '25 Weeks', margin + 4, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Tuition:', margin + 4, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(course.price || 'Free Admission', margin + 17, y + 17);

  // Column 2
  const col2X = margin + 55;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Class Meeting Days:', col2X, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(course.classDays || 'Saturday & Wednesday', col2X, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Class Time (Local):', col2X, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(13, 148, 136);
  doc.text(convertedTime.formattedLocalTime, col2X, y + 21);

  // Column 3
  const col3X = margin + 120;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Cohort Capacity:', col3X, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${course.maxStudents || 15} Scholar Seats Limit`, col3X, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Student Timezone:', col3X, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(tz, col3X, y + 21);

  y += 31;

  // --- SECTION 1: COURSE DESCRIPTION & LEARNING OBJECTIVES ---
  ensureSpace(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. COURSE DESCRIPTION & LEARNING OBJECTIVES', margin, y);
  y += 2;
  doc.setDrawColor(45, 212, 191);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 40, y);
  y += 5;

  const descText =
    course.longDescription?.trim() ||
    course.description?.trim() ||
    'This academic course provides deep textual and analytical insights into sacred knowledge, empowering scholars with foundational literacy, critical inquiry, and practical implementation.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const descLines = doc.splitTextToSize(descText, contentWidth);
  ensureSpace(descLines.length * 4.8);
  doc.text(descLines, margin, y);
  y += descLines.length * 4.8 + 4;

  if (course.syllabusText?.trim()) {
    ensureSpace(20);
    doc.setFillColor(240, 253, 250); // Teal 50
    doc.setDrawColor(153, 246, 228); // Teal 200
    doc.setLineWidth(0.3);

    const sylTextLines = doc.splitTextToSize(course.syllabusText.trim(), contentWidth - 8);
    const boxHeight = sylTextLines.length * 4.5 + 10;
    ensureSpace(boxHeight + 4);

    doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(13, 148, 136);
    doc.text('Faculty Syllabus Directives:', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(sylTextLines, margin + 4, y + 10);
    y += boxHeight + 6;
  }

  // --- SECTION 2: CLASS SCHEDULE & CONVERTED TIMINGS ---
  ensureSpace(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. CLASS SCHEDULE & ATTENDANCE INFORMATION', margin, y);
  y += 2;
  doc.setDrawColor(45, 212, 191);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 40, y);
  y += 6;

  const scheduleInfo = [
    `• Launch / Term Start Date: ${course.launchDate ? new Date(course.launchDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Immediate Enrollment / Active Cohort'}`,
    `• Weekly Meeting Pattern: ${course.classDays || 'Saturday'} (Weekly synchronous seminars via Live Zoom)`,
    `• Academy Headquarters Time: ${course.classStartTime || '19:15'} (${course.classTimezone || 'America/Los_Angeles'})`,
    `• Your Converted Local Time: ${convertedTime.formattedLocalTime} (${tz})`,
    `• Orientation Recording: 100% accessible to prospective applicants before cohort enrollment.`,
    `• Class Attendance Policy: Students are expected to attend live weekly interactive webinars or review recorded class archives within 48 hours.`,
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  for (const item of scheduleInfo) {
    const itemLines = doc.splitTextToSize(item, contentWidth);
    ensureSpace(itemLines.length * 4.5);
    doc.text(itemLines, margin, y);
    y += itemLines.length * 4.5 + 1.5;
  }
  y += 4;

  // --- SECTION 3: STRUCTURED WEEKLY MODULES & SYLLABUS TOPICS ---
  if (boxes.length > 0) {
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`3. STRUCTURED CURRICULUM MODULES (${boxes.length} UNITS)`, margin, y);
    y += 2;
    doc.setDrawColor(45, 212, 191);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 40, y);
    y += 6;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const titleStr = `${box.week || `Unit ${i + 1}`}: ${box.title}`;
      const topicsLines = doc.splitTextToSize(`Topics: ${box.topics}`, contentWidth - 8);
      const deliverableLines = box.deliverable
        ? doc.splitTextToSize(`Assessment/Deliverable: ${box.deliverable}`, contentWidth - 8)
        : [];

      const neededH = 8 + topicsLines.length * 4.2 + (deliverableLines.length ? deliverableLines.length * 4.2 + 2 : 0) + 4;
      ensureSpace(neededH);

      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, neededH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(titleStr, margin + 4, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(topicsLines, margin + 4, y + 10.5);

      if (deliverableLines.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9); // Amber 700
        doc.text(deliverableLines, margin + 4, y + 11.5 + topicsLines.length * 4.2);
      }

      y += neededH + 3.5;
    }
  }

  // --- SECTION 4: LESSON RECORDINGS VAULT ---
  if (courseLessons.length > 0) {
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`4. LECTURE RECORDINGS & AUDIOVISUAL ARCHIVES (${courseLessons.length} SESSIONS)`, margin, y);
    y += 2;
    doc.setDrawColor(45, 212, 191);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 40, y);
    y += 6;

    for (const lesson of courseLessons) {
      const isPublic = lesson.isFreePreview;
      const lessonTitleStr = `Session ${lesson.order}: ${lesson.title} [${lesson.duration || '45:00'}] - ${isPublic ? 'Orientation Recording (Public)' : 'Class Recording (Enrolled Only)'}`;
      const descLines = lesson.description
        ? doc.splitTextToSize(lesson.description, contentWidth - 6)
        : [];

      const needed = 7 + (descLines.length ? descLines.length * 4 : 0);
      ensureSpace(needed);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(isPublic ? 13 : 15, isPublic ? 148 : 23, isPublic ? 136 : 42);
      doc.text(lessonTitleStr, margin, y + 4);

      if (descLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(descLines, margin + 4, y + 8);
      }

      y += needed + 2;
    }
    y += 2;
  }

  // --- SECTION 5: CERTIFICATION & INSTITUTIONAL FOOTER ---
  ensureSpace(28);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '“Seeking sacred knowledge is an obligatory path of spiritual elevation and ethical refinement.”',
    margin,
    y
  );
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This curriculum document is maintained by Deen Hijrah Academia. All rights reserved. For enrollment inquiries or academic guidance, visit https://deenhijrah.edu or email faculty@deenhijrah.edu.',
    margin,
    y
  );

  drawFooter();

  // Trigger browser download
  const safeSlug = (course.slug || course.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  doc.save(`${safeSlug}-syllabus-summary.pdf`);
}
