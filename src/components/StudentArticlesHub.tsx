import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  PenTool,
  Search,
  Filter,
  FileText,
  Clock,
  User,
  Sparkles,
  Download,
  Share2,
  Trash2,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { StudentArticle, Profile } from '../types.ts';
import { smartApiFetch } from '../lib/fallbackStore.ts';

interface StudentArticlesHubProps {
  currentProfile?: Profile | null;
  onUploadFile?: (file: File) => Promise<string>;
}

const SAMPLE_ARTICLES: StudentArticle[] = [
  {
    id: 1,
    studentId: 101,
    authorName: 'Zayd ibn Mansoor',
    authorEmail: 'zayd.mansoor@student.deenhijrah.edu',
    authorRole: 'student',
    title: 'The Methodological Rigor of Isnad Criticism in Classical Hadith Verification',
    category: 'Hadith Sciences',
    abstract:
      'An analytical inquiry into the transmission matrices of 2nd and 3rd century muhaddithin, evaluating how historical cross-referencing preserved the Prophetic tradition against text distortion.',
    content: `In the annals of historiographical preservation, classical Islamic hadith criticism represents an unprecedented standard of biographical scrutiny (ilm al-rijal) and transmission analysis (ilm al-jarh wa al-ta'dil). 

Rather than treating historical reports as isolated anecdotes, early scholars such as Imam al-Bukhari, Yahya ibn Ma'in, and Ali ibn al-Madini developed rigorous multi-tiered verification protocols:

1. Continuous Contiguous Transmission (Ittisal al-Sanad):
Every narrator in the transmission chain must have historically coexisted and physically encountered their direct teacher, verified through chronological annals (tarikh al-ruwah).

2. Moral Integrity and Veracity (Adalah):
The transmitter's piety, public conduct, truthfulness, and freedom from flagrant spiritual defects were cross-examined across peer testimonies.

3. Precision of Memory and Transmission (Dabt):
Scholars tested whether the narrator preserved reports accurately from memory (dabt al-sadr) and written manuscripts (dabt al-kitab) by cross-referencing their transmissions against established masters.

4. Immunity from Subtle Deficiencies (Shudhudh & Ilal):
A report was flagged if a reliable transmitter contradicted narrators of superior retention or if hidden anomalies (ilal khafiyyah) invalidated the transmission path.

Through this methodology, sacred knowledge was preserved not as subjective folklore, but as a rigorously documented historical discipline.`,
    readTime: '6 min read',
    published: true,
    createdAt: '2026-03-28',
  },
  {
    id: 2,
    studentId: 102,
    authorName: 'Amina Al-Zahra',
    authorEmail: 'amina.zahra@student.deenhijrah.edu',
    authorRole: 'student',
    title: 'Balaghah and Rhetorical Cadence in Surat Maryam: A Linguistic Analysis',
    category: 'Classical Arabic & Balaghah',
    abstract:
      'Examining phonetic rhyme schemes (fawasil al-ayat), semantic inversion (taqdim wa ta’khir), and the emotive resonance of the letter Ra and Ya across the Meccan revelations.',
    content: `The Quranic aesthetic achieves a sublime synthesis between phonetic cadence and metaphysical meaning. In Surat Maryam, the transition of end-rhymes (fawasil) corresponds directly with thematic shifts in spiritual intimacy and cosmic authority.

Phonetic Resonance of the Weak Letter (Ya):
The opening verses describing Prophet Zakariyya’s silent supplication employ soft, elongated acoustic terminations: "nidā'an khafiyyā", "shayban wa-lam akun bi-du'ā'ika rabbi shaqiyyā". The lingering acoustic tail reflects personal vulnerability and hushed contemplation.

Transition to Transcendent Affirmation:
When the narrative shifts to the theological defense of monotheism against attribution of partners to the Divine, the rhyme scheme abruptly transforms into the forceful plosive "D": "laqad ji'tum shay'an iddā", "takādu al-samāwātu yatafaṭṭarna minhu". The phonetic weight mirrors the solemnity of divine majesty.

This linguistic mastery underscores why classical scholars recognized the Quran's inimitability (I'jaz) as both rhetorical and structural.`,
    readTime: '5 min read',
    published: true,
    createdAt: '2026-04-02',
  },
  {
    id: 3,
    studentId: 103,
    authorName: 'Bilal Farooq',
    authorEmail: 'bilal.farooq@student.deenhijrah.edu',
    authorRole: 'student',
    title: 'The Constitution of Medina: Pluralistic Governance and Covenantal Ethics',
    category: 'Seerah & Statecraft',
    abstract:
      'A deep-dive into the Sahifat al-Madinah as a pioneering social contract establishing reciprocal defense, judicial arbitration, and minority protections in 622 CE.',
    content: `Upon arriving in Yathrib, the Prophet Muhammad ﷺ enacted the Constitution of Medina (Sahifat al-Madinah)—a landmark charter that unified warring tribes and diverse religious communities into a single political body (Ummah wahidah).

Key Constitutional Pillars:
- Freedom of Religious Practice: Jews and allied tribes were recognized as distinct spiritual communities possessing complete autonomy over their religious rites and internal laws.
- Mutual Defense Obligations: All signatories committed to collective defense against external aggression targeting the sanctuary of Medina.
- Rule of Law and Conflict Resolution: Feuds and blood retaliations were abolished, establishing institutional arbitration rooted in justice rather than tribal affiliation.

This model provides foundational insights for contemporary Islamic political ethics and covenantal civic engagement.`,
    readTime: '7 min read',
    published: true,
    createdAt: '2026-04-10',
  },
];

export const StudentArticlesHub: React.FC<StudentArticlesHubProps> = ({
  currentProfile,
  onUploadFile,
}) => {
  const [articles, setArticles] = useState<StudentArticle[]>(SAMPLE_ARTICLES);
  const [selectedArticle, setSelectedArticle] = useState<StudentArticle | null>(null);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Prophetic Seerah');
  const [abstract, setAbstract] = useState('');
  const [content, setContent] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [readTime, setReadTime] = useState('5 min read');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const categories = [
    'All',
    'Prophetic Seerah',
    'Hadith Sciences',
    'Classical Arabic & Balaghah',
    'Usul al-Fiqh & Law',
    'Spiritual Ethics & Tasawwuf',
    'Islamic History & Civilization',
  ];

  // Load articles from backend or local fallback
  useEffect(() => {
    let isCancelled = false;
    const fetchArticles = async () => {
      try {
        const res = await smartApiFetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && !isCancelled) {
            // Merge with samples to guarantee a rich catalog
            const merged = [...data];
            SAMPLE_ARTICLES.forEach((sample) => {
              if (!merged.some((m) => m.id === sample.id || m.title === sample.title)) {
                merged.push(sample);
              }
            });
            setArticles(merged);
          }
        }
      } catch {}
    };
    fetchArticles();
    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchCat = selectedCategory === 'All' || art.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.authorName.toLowerCase().includes(q) ||
        (art.abstract && art.abstract.toLowerCase().includes(q)) ||
        art.content.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please provide both a title and article body.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        abstract: abstract.trim() || null,
        content: content.trim(),
        attachmentUrl: attachmentUrl.trim() || null,
        readTime: readTime.trim() || '5 min read',
      };

      const res = await smartApiFetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let createdArticle: StudentArticle;
      if (res.ok) {
        createdArticle = await res.json();
      } else {
        // Local fallback
        createdArticle = {
          id: Date.now(),
          studentId: currentProfile?.id || 1,
          authorName: currentProfile?.fullName || 'Scholar Student',
          authorEmail: currentProfile?.email || 'student@deenhijrah.edu',
          authorRole: currentProfile?.role || 'student',
          title: title.trim(),
          category,
          abstract: abstract.trim() || null,
          content: content.trim(),
          attachmentUrl: attachmentUrl.trim() || null,
          readTime: readTime.trim() || '5 min read',
          published: true,
          createdAt: new Date().toISOString().split('T')[0],
        };
      }

      setArticles((prev) => [createdArticle, ...prev]);
      setTitle('');
      setAbstract('');
      setContent('');
      setAttachmentUrl('');
      setIsComposing(false);
      setSelectedArticle(createdArticle);
      setToastMessage('Mubarak! Your research paper has been published to the Academy.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;
    setUploadingAttachment(true);
    try {
      const url = await onUploadFile(file);
      setAttachmentUrl(url);
    } catch {
      alert('Failed to upload attachment file.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-400 text-slate-950 text-xs font-bold shadow-2xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BANNER: Scholar Publishing Suite */}
      <div className="p-6 sm:p-8 rounded-2xl academy-surface border border-teal-500/30 bg-gradient-to-r from-[#061224] via-[#091E38] to-[#061224] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Student Research Papers, Blogs &amp; Academic Folios
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Scholarly Discourse &amp; Published Research
          </h2>
          <p className="text-xs sm:text-sm academy-text-secondary max-w-2xl leading-relaxed">
            Write and publish your reflections, comparative treatises, and research papers. All published works are accessible to students, faculty, and seekers across the academy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsComposing(true);
            setSelectedArticle(null);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-xl transition-all cursor-pointer whitespace-nowrap self-start md:self-center"
        >
          <PenTool className="w-4 h-4" />
          <span>Write &amp; Publish Article</span>
        </button>
      </div>

      {/* SEARCH & CATEGORY FILTERS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search research papers, topics, authors..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl academy-elevated border border-slate-800 focus:outline-none focus:border-teal-400 text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-teal-400 text-slate-950 font-bold'
                  : 'academy-elevated text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* COMPOSING MODAL / STUDIO */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-2xl academy-surface border border-teal-500/40 shadow-2xl p-6 sm:p-8 space-y-6 bg-[#071324] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b academy-divider pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  Publish Scholarly Article or Research Paper
                </h3>
                <p className="text-xs academy-text-secondary">
                  Your work will be published to the academy portal and visible to all scholars.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Article / Paper Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Hermeneutics of Prophetic Diplomacy..."
                  className="w-full px-3.5 py-2.5 rounded-xl academy-elevated border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-400"
                  >
                    {categories
                      .filter((c) => c !== 'All')
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Estimated Read Time</label>
                  <input
                    type="text"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    placeholder="e.g. 5 min read"
                    className="w-full px-3.5 py-2.5 rounded-xl academy-elevated border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Abstract / Executive Summary
                </label>
                <textarea
                  rows={2}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  placeholder="Brief synopsis highlighting key arguments, methodology, and primary sources..."
                  className="w-full px-3.5 py-2 rounded-xl academy-elevated border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Full Article Text &amp; Analysis *
                </label>
                <textarea
                  rows={9}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your thesis, textual citations, structured modules, and concluding reflections..."
                  className="w-full px-3.5 py-2.5 rounded-xl academy-elevated border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400 leading-relaxed font-sans"
                />
              </div>

              {/* Upload Research Attachment / PDF */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Attach Research PDF or Document (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="Document URL or upload file..."
                    className="flex-1 px-3 py-2 rounded-xl academy-elevated border border-slate-700 text-xs text-white"
                  />
                  {onUploadFile && (
                    <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingAttachment ? 'Uploading...' : 'Upload PDF'}</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t academy-divider">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold academy-elevated hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 shadow-md transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish to Academy (Visible to All)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READING VIEW MODAL (When an article is selected) */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-4xl rounded-2xl academy-surface border border-teal-500/40 shadow-2xl p-6 sm:p-10 space-y-6 bg-[#071324] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b academy-divider pb-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-400/15 text-teal-300 border border-teal-500/30">
                    {selectedArticle.category}
                  </span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono-tabular">
                    <Clock className="w-3 h-3 text-teal-400" />
                    {selectedArticle.readTime || '5 min read'}
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                  <div className="w-7 h-7 rounded-full bg-teal-400/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                    {selectedArticle.authorName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-white">{selectedArticle.authorName}</span>
                    <span className="text-slate-500 mx-1.5">·</span>
                    <span className="text-slate-400">{selectedArticle.createdAt}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedArticle.abstract && (
              <div className="p-4 rounded-xl bg-teal-950/25 border border-teal-500/25 text-xs text-teal-200 leading-relaxed">
                <strong className="text-teal-300 block mb-1">Abstract:</strong>
                {selectedArticle.abstract}
              </div>
            )}

            <div className="space-y-4 text-sm text-slate-200 leading-relaxed font-serif-sacred text-[15px] whitespace-pre-line border-b academy-divider pb-6">
              {selectedArticle.content}
            </div>

            {selectedArticle.attachmentUrl && (
              <div className="flex items-center justify-between p-4 rounded-xl academy-elevated border border-teal-500/30 bg-[#061224]">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Full Research Paper Folio (PDF)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Primary sources and bibliographical footnotes
                    </div>
                  </div>
                </div>
                <a
                  href={selectedArticle.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-400 text-slate-950 text-xs font-bold hover:bg-teal-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold academy-elevated hover:bg-white/5"
              >
                Close Reading View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTICLES GRID */}
      {filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((art) => (
            <article
              key={art.id}
              onClick={() => setSelectedArticle(art)}
              className="p-6 rounded-2xl academy-surface border border-slate-800 hover:border-teal-400/50 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 bg-[#061224]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-400/10 text-teal-300 border border-teal-500/25">
                    {art.category}
                  </span>
                  <span className="text-[11px] font-mono-tabular text-slate-400">
                    {art.readTime || '5 min read'}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-2">
                  {art.title}
                </h3>

                <p className="text-xs academy-text-secondary line-clamp-3 leading-relaxed">
                  {art.abstract || art.content}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-teal-400/15 text-teal-300 flex items-center justify-center text-[10px] font-bold">
                    {art.authorName.charAt(0)}
                  </div>
                  <span className="font-semibold text-white truncate max-w-[140px]">
                    {art.authorName}
                  </span>
                </div>

                <span className="text-teal-400 group-hover:translate-x-0.5 transition-transform font-bold flex items-center gap-1 text-[11px]">
                  <span>Read Paper</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-10 rounded-2xl academy-surface text-center space-y-3">
          <BookOpen className="w-8 h-8 text-teal-400 mx-auto" />
          <h3 className="font-display text-base font-bold text-white">
            No Published Articles Found
          </h3>
          <p className="text-xs academy-text-secondary max-w-md mx-auto">
            No research papers matched your search or category filter. Be the first to publish a research paper in this category!
          </p>
        </div>
      )}
    </div>
  );
};
