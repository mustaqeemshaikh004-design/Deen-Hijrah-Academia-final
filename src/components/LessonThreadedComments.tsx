import React, { useState } from 'react';
import { MessageSquare, Reply, Send, User, CheckCircle2, ShieldCheck, Sparkles, CornerDownRight } from 'lucide-react';
import { LessonComment, Profile } from '../types.ts';

interface LessonThreadedCommentsProps {
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  comments: LessonComment[];
  currentProfile: Profile | null;
  onPostComment: (lessonId: number, content: string, parentId?: number | null) => Promise<void>;
}

export const LessonThreadedComments: React.FC<LessonThreadedCommentsProps> = ({
  lessonId,
  lessonTitle,
  courseId,
  comments,
  currentProfile,
  onPostComment,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingMain, setSubmittingMain] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Group top-level comments and replies
  const topLevelComments = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce<Record<number, LessonComment[]>>((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  const handlePostMain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setSubmittingMain(true);
    try {
      await onPostComment(lessonId, newCommentText.trim(), null);
      setNewCommentText('');
    } finally {
      setSubmittingMain(false);
    }
  };

  const handlePostReply = async (parentId: number) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await onPostComment(lessonId, replyText.trim(), parentId);
      setReplyText('');
      setActiveReplyId(null);
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatCommentDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="rounded-2xl academy-surface p-6 sm:p-8 space-y-6 border border-teal-500/25 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b academy-divider">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-base sm:text-lg font-display">
            <MessageSquare className="w-5 h-5 text-teal-300" />
            <span>Lecture Q&amp;A &amp; Discussion</span>
          </div>
          <p className="text-xs academy-text-secondary">
            Ask questions on &ldquo;{lessonTitle}&rdquo; or read verified explanations from faculty and fellow scholars.
          </p>
        </div>
        <div className="text-xs font-mono-tabular text-teal-300 font-semibold px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 self-start sm:self-auto">
          {comments.length} {comments.length === 1 ? 'Contribution' : 'Contributions'}
        </div>
      </div>

      {/* Main Comment Compose Box */}
      <form onSubmit={handlePostMain} className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
            {currentProfile?.fullName?.charAt(0) || 'S'}
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              rows={3}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Ask a question about this recording, seek clarification on textual proofs, or share lecture notes..."
              className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl academy-elevated focus:outline-none focus:border-teal-400 border border-slate-800 placeholder:text-slate-500 leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] academy-text-secondary">
                Replies from instructors will be marked with a verified faculty emblem.
              </span>
              <button
                type="submit"
                disabled={submittingMain || !newCommentText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingMain ? 'Posting Question...' : 'Post Question'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-4 pt-2">
        {topLevelComments.length === 0 ? (
          <div className="p-8 rounded-xl academy-elevated text-center space-y-2 border border-dashed border-teal-500/20">
            <MessageSquare className="w-6 h-6 text-teal-400/60 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">No Questions or Comments Yet</h4>
            <p className="text-xs academy-text-secondary max-w-md mx-auto">
              Be the first student to start the conversation on this lecture. Your questions help fellow students reflect deeper on the material.
            </p>
          </div>
        ) : (
          topLevelComments.map((comment) => {
            const isAuthorInstructor = comment.authorRole === 'instructor' || comment.authorRole === 'admin';
            const replies = repliesByParent[comment.id] || [];
            const isReplying = activeReplyId === comment.id;

            return (
              <div
                key={comment.id}
                className="p-4 sm:p-5 rounded-xl academy-elevated border border-slate-800/80 space-y-3.5 transition-all hover:border-teal-500/30"
              >
                {/* Author row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isAuthorInstructor
                          ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      }`}
                    >
                      {comment.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{comment.authorName}</span>
                        {isAuthorInstructor ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                            <ShieldCheck className="w-3 h-3 text-amber-400" />
                            <span>Faculty Instructor</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-teal-400/80 font-mono-tabular">Scholar Student</span>
                        )}
                      </div>
                      <span className="text-[10px] academy-text-secondary">{formatCommentDate(comment.createdAt)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isReplying) {
                        setActiveReplyId(null);
                        setReplyText('');
                      } else {
                        setActiveReplyId(comment.id);
                        setReplyText('');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-teal-300 hover:text-teal-200 hover:bg-teal-400/10 transition-colors cursor-pointer"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </div>

                {/* Comment Body */}
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line pl-9">
                  {comment.content}
                </p>

                {/* Inline Reply Form */}
                {isReplying && (
                  <div className="pl-9 pt-2 space-y-2">
                    <div className="flex items-start gap-2">
                      <CornerDownRight className="w-4 h-4 text-teal-400 shrink-0 mt-2" />
                      <div className="flex-1 space-y-2">
                        <textarea
                          rows={2}
                          autoFocus
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${comment.authorName}...`}
                          className="w-full px-3 py-2 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400 border border-teal-500/30"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyId(null);
                              setReplyText('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={submittingReply || !replyText.trim()}
                            onClick={() => handlePostReply(comment.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-50 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>{submittingReply ? 'Replying...' : 'Post Reply'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nested Threaded Replies */}
                {replies.length > 0 && (
                  <div className="pl-6 sm:pl-9 pt-2 space-y-2.5 border-l-2 border-teal-500/30 ml-3.5">
                    {replies.map((reply) => {
                      const isReplyInstructor = reply.authorRole === 'instructor' || reply.authorRole === 'admin';

                      return (
                        <div
                          key={reply.id}
                          className={`p-3 sm:p-3.5 rounded-xl ${
                            isReplyInstructor
                              ? 'bg-amber-400/10 border border-amber-400/30'
                              : 'academy-elevated border border-slate-800'
                          } space-y-1.5`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                isReplyInstructor
                                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                                  : 'bg-teal-500/20 text-teal-300'
                              }`}
                            >
                              {reply.authorName.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-100">{reply.authorName}</span>
                            {isReplyInstructor && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-400/20 text-amber-300">
                                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                <span>Faculty Reply</span>
                              </span>
                            )}
                            <span className="text-[10px] academy-text-secondary ml-auto">
                              {formatCommentDate(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line pl-8">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
