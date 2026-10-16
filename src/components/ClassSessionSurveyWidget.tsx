import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, Send, MessageSquareHeart } from 'lucide-react';
import { Profile } from '../types.ts';

interface ClassSessionSurveyWidgetProps {
  courseId: number;
  courseTitle: string;
  lessonId?: number | null;
  lessonTitle?: string;
  instructorName: string;
  currentProfile: Profile | null;
  onSubmitSurvey: (rating: 'satisfactory' | 'unsatisfactory', comment: string) => Promise<void>;
}

export const ClassSessionSurveyWidget: React.FC<ClassSessionSurveyWidgetProps> = ({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
  instructorName,
  currentProfile,
  onSubmitSurvey,
}) => {
  const [selectedRating, setSelectedRating] = useState<'satisfactory' | 'unsatisfactory' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRating) return;
    setSubmitting(true);
    try {
      await onSubmitSurvey(selectedRating, feedbackComment.trim());
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-3.5 shadow-md">
        <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
        <div className="space-y-0.5">
          <h4 className="text-xs sm:text-sm font-semibold text-teal-300">
            JazakAllahu Khayran for your session feedback!
          </h4>
          <p className="text-[11px] academy-text-secondary">
            Your rating has been delivered to instructor {instructorName} to continually elevate student learning.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl academy-surface border border-teal-500/25 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b academy-divider">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="w-4 h-4 text-teal-300" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-100 font-display">
            Quick Class Feedback: How was today&apos;s session?
          </h4>
        </div>
        <span className="text-[11px] text-teal-400/80 font-mono-tabular">
          {instructorName} · {lessonTitle || courseTitle}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedRating('satisfactory')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedRating === 'satisfactory'
                ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300 shadow-md'
                : 'academy-elevated text-slate-200 hover:border-emerald-400'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Satisfactory</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRating('unsatisfactory')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedRating === 'unsatisfactory'
                ? 'bg-rose-500 text-white ring-2 ring-rose-400 shadow-md'
                : 'academy-elevated text-slate-200 hover:border-rose-400'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Unsatisfactory</span>
          </button>
        </div>

        {selectedRating && (
          <div className="space-y-2 pt-1 animate-fadeIn">
            <input
              type="text"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Optional comment on pace, audio clarity, or textual explanation..."
              className="w-full px-3.5 py-2 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400 border border-slate-800"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors shadow-sm cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{submitting ? 'Submitting...' : 'Submit Quick Rating'}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
