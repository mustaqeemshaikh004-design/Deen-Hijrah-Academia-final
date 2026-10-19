import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Search,
  PenTool,
  Clock,
  Calendar,
  User,
  Share2,
  Download,
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  Tag,
  GraduationCap,
  FileText,
  Upload,
  Eye,
  Check,
} from 'lucide-react';
import { StudentArticle, Profile } from '../types.ts';
import { smartApiFetch } from '../lib/fallbackStore.ts';

interface StudentBlogsPageProps {
  currentProfile: Profile | null;
  onOpenAuthModal: () => void;
  onUploadFile?: (file: File) => Promise<string | { fileUrl: string; fileName: string } | null>;
  showToast: (msg: string) => void;
  onNavigateHome?: () => void;
}

const CATEGORIES = [
  'All Publications',
  'Seerah & History',
  'Classical Arabic & Balagha',
  'Islamic Jurisprudence (Fiqh)',
  'Tafsir & Quranic Reflection',
  'Student Academy Experience',
];

export const StudentBlogsPage: React.FC<StudentBlogsPageProps> = ({
  currentProfile,
  onOpenAuthModal,
  onUploadFile,
  showToast,
  onNavigateHome,
}) => {
  const [articles, setArticles] = useState<StudentArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Publications');

  // Reader state
  const [readingArticle, setReadingArticle] = useState<StudentArticle | null>(null);

  // Composer modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerCategory, setComposerCategory] = useState('Seerah & History');
  const [composerAbstract, setComposerAbstract] = useState('');
  const [composerContent, setComposerContent] = useState('');
  const [composerAttachmentUrl, setComposerAttachmentUrl] = useState('');
  const [composerReadTime, setComposerReadTime] = useState('5 min read');
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeComposerTab, setActiveComposerTab] = useState<'write' | 'preview'>('write');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await smartApiFetch('/api/articles');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setArticles(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCat =
        selectedCategory === 'All Publications' ||
        art.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.authorName.toLowerCase().includes(q) ||
        (art.abstract && art.abstract.toLowerCase().includes(q)) ||
        art.content.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  const handleOpenComposer = () => {
    if (!currentProfile) {
      showToast('Please sign in with your student credentials or Google account to publish your blog.');
      onOpenAuthModal();
      return;
    }
    setIsComposerOpen(true);
  };

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerTitle.trim() || !composerContent.trim()) {
      showToast('Please provide both a Title and Content for your scholarly blog.');
      return;
    }

    try {
      setIsPublishing(true);
      const payload = {
        title: composerTitle.trim(),
        category: composerCategory,
        abstract: composerAbstract.trim() || null,
        content: composerContent.trim(),
        attachmentUrl: composerAttachmentUrl.trim() || null,
        readTime: composerReadTime.trim() || '5 min read',
      };

      const res = await smartApiFetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setArticles((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
        setIsComposerOpen(false);
        setComposerTitle('');
        setComposerAbstract('');
        setComposerContent('');
        setComposerAttachmentUrl('');
        showToast('Mubarak! Your student blog has been published to the academy portal.');
      } else {
        showToast('Failed to publish article. Please review fields.');
      }
    } catch (err: any) {
      showToast(err.message || 'Error publishing blog.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = (article: StudentArticle) => {
    try {
      navigator.clipboard.writeText(`${window.location.origin}#blog-${article.id}`);
      setCopiedId(article.id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('Article link copied to clipboard!');
    } catch {
      showToast('Link copied.');
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100">
      {/* Top Banner / Hero */}
      <section className="relative overflow-hidden border-b border-teal-500/20 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-16">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Deen Hijrah Scholarly Publications</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Student Research, Folios &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-amber-300">
              Scholarly Blogs
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            Explore authentic academic articles, Seerah research treatises, Arabic grammatical
            breakthroughs, and spiritual reflections published directly by matriculated students and faculty.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenComposer}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <PenTool className="w-4 h-4" />
              <span>Publish Your Scholarly Blog</span>
            </button>
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl academy-surface border border-slate-800 hover:border-teal-500/40 text-slate-300 hover:text-white text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <span>Back to Homepage</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8">
        {/* Controls Bar: Search & Category Chips */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search blogs by title, keyword, or student author..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-teal-400/80 focus:ring-1 focus:ring-teal-400 text-xs sm:text-sm text-slate-100 placeholder-slate-500 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Author Quick Stats */}
            <div className="text-xs text-slate-400 font-medium">
              Showing <strong className="text-teal-400">{filteredArticles.length}</strong> published{' '}
              {filteredArticles.length === 1 ? 'blog' : 'blogs'}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-teal-500/40 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Blogs Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading student scholarly publications...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-4">
            <BookOpen className="w-12 h-12 mx-auto text-slate-600" />
            <h3 className="font-display text-lg font-bold text-white">No Publications Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No student articles match your filter or search query. Be the first to share your academic reflections!
            </p>
            <button
              type="button"
              onClick={handleOpenComposer}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-400 text-slate-950 font-bold text-xs hover:bg-teal-300 transition-colors cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Write the First Blog</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((art) => (
              <motion.article
                key={art.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative rounded-2xl border border-slate-800/80 bg-slate-900/70 hover:bg-slate-900/90 hover:border-teal-500/40 transition-all duration-300 p-5 flex flex-col justify-between shadow-lg hover:shadow-xl hover:shadow-teal-500/5"
              >
                <div className="space-y-3">
                  {/* Category & Read Time */}
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/20 truncate">
                      {art.category}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 shrink-0">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{art.readTime || '5 min read'}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setReadingArticle(art)}
                    className="font-display text-base font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-2 cursor-pointer"
                  >
                    {art.title}
                  </h3>

                  {/* Abstract */}
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {art.abstract || art.content.slice(0, 160) + '...'}
                  </p>
                </div>

                {/* Author & Actions Footer */}
                <div className="pt-5 mt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold text-xs shrink-0">
                        {art.authorName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {art.authorName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <GraduationCap className="w-2.5 h-2.5 text-teal-400" />
                          <span>Student Scholar</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(art)}
                        title="Share article link"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors"
                      >
                        {copiedId === art.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReadingArticle(art)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800/80 hover:bg-teal-400 hover:text-slate-950 text-xs font-bold text-slate-200 transition-all group/btn cursor-pointer"
                  >
                    <span>Read Full Treatise</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      {/* FULL ARTICLE READER MODAL (Cool Transitions & Immersive Focus) */}
      <AnimatePresence>
        {readingArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReadingArticle(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-teal-500/30 bg-slate-900 shadow-2xl overflow-hidden my-auto"
            >
              {/* Reader Header */}
              <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-xs font-semibold border border-teal-500/20">
                    {readingArticle.category}
                  </span>
                  <span className="text-xs text-slate-400">• {readingArticle.readTime || '5 min read'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(readingArticle)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-teal-300 transition-colors"
                    title="Share link"
                  >
                    {copiedId === readingArticle.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadingArticle(null)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reader Body */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-200">
                <div className="space-y-3">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {readingArticle.title}
                  </h2>

                  <div className="flex items-center gap-3 pt-2 pb-4 border-b border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold text-sm shrink-0">
                      {readingArticle.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {readingArticle.authorName}
                      </div>
                      <div className="text-xs text-teal-400 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Deen Hijrah Matriculated Scholar</span>
                      </div>
                    </div>
                    <div className="ml-auto text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{readingArticle.createdAt?.slice(0, 10)}</span>
                    </div>
                  </div>
                </div>

                {/* Abstract Highlight */}
                {readingArticle.abstract && (
                  <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/30 text-xs sm:text-sm text-teal-200 italic leading-relaxed">
                    <strong>Abstract:</strong> {readingArticle.abstract}
                  </div>
                )}

                {/* Article Content Rendered */}
                <div className="prose prose-invert max-w-none text-slate-300 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
                  {readingArticle.content}
                </div>

                {/* Attachment Link if present */}
                {readingArticle.attachmentUrl && (
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <FileText className="w-4 h-4 text-teal-400" />
                      <span>Downloadable Research Document Attached</span>
                    </div>
                    <a
                      href={readingArticle.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-400 text-slate-950 font-bold text-xs hover:bg-teal-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Folio</span>
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BLOG COMPOSER MODAL (Publish Your Scholarly Blog) */}
      <AnimatePresence>
        {isComposerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposerOpen(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-teal-500/30 bg-slate-900 shadow-2xl overflow-hidden my-auto"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-teal-400" />
                  <h3 className="font-display text-base font-bold text-white">
                    Publish Scholarly Blog / Article
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector: Write vs Preview */}
              <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveComposerTab('write')}
                  className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                    activeComposerTab === 'write'
                      ? 'border-teal-400 text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Write Content
                </button>
                <button
                  type="button"
                  onClick={() => setActiveComposerTab('preview')}
                  className={`pb-2 px-3 font-semibold border-b-2 transition-colors ${
                    activeComposerTab === 'preview'
                      ? 'border-teal-400 text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Live Preview
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handlePublishArticle} className="p-5 overflow-y-auto space-y-4">
                {activeComposerTab === 'write' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Article Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={composerTitle}
                        onChange={(e) => setComposerTitle(e.target.value)}
                        placeholder="e.g. Rhetorical Precision of Surah Yusuf: A Grammatical Synthesis"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Academic Discipline / Category
                        </label>
                        <select
                          value={composerCategory}
                          onChange={(e) => setComposerCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-teal-400"
                        >
                          {CATEGORIES.filter((c) => c !== 'All Publications').map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">
                          Estimated Reading Time
                        </label>
                        <input
                          type="text"
                          value={composerReadTime}
                          onChange={(e) => setComposerReadTime(e.target.value)}
                          placeholder="e.g. 5 min read"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-teal-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Executive Abstract (Short Summary)
                      </label>
                      <textarea
                        rows={2}
                        value={composerAbstract}
                        onChange={(e) => setComposerAbstract(e.target.value)}
                        placeholder="Provide a concise 1-2 sentence synopsis of your findings or treatise..."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-400 text-xs text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Full Treatise Content *
                      </label>
                      <textarea
                        rows={9}
                        required
                        value={composerContent}
                        onChange={(e) => setComposerContent(e.target.value)}
                        placeholder="Write your research here. Use Markdown headers (###), bullet points, and blockquotes (> quote)..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-400 text-xs font-mono text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Optional PDF / Resource URL
                      </label>
                      <input
                        type="text"
                        value={composerAttachmentUrl}
                        onChange={(e) => setComposerAttachmentUrl(e.target.value)}
                        placeholder="https://... or upload a document"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-teal-400"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                    <h4 className="font-display text-xl font-bold text-white">
                      {composerTitle || 'Untitled Blog Post'}
                    </h4>
                    <div className="text-xs text-teal-400">{composerCategory} • {composerReadTime}</div>
                    {composerAbstract && (
                      <p className="text-xs italic text-teal-200 bg-teal-950/30 p-3 rounded-lg border border-teal-500/20">
                        {composerAbstract}
                      </p>
                    )}
                    <div className="text-xs whitespace-pre-line text-slate-300 leading-relaxed font-sans">
                      {composerContent || 'No content written yet.'}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Publish Blog to Website</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
