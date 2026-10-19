import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  BookOpen,
  RotateCcw,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizAttempt, Profile } from '../types.ts';
import { smartApiFetch } from '../lib/fallbackStore.ts';

interface QuizAssessmentModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile | null;
  onCompleted?: (attempt: QuizAttempt) => void;
  showToast: (msg: string) => void;
}

export const QuizAssessmentModal: React.FC<QuizAssessmentModalProps> = ({
  quiz,
  isOpen,
  onClose,
  currentProfile,
  onCompleted,
  showToast,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(
    quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultAttempt, setResultAttempt] = useState<QuizAttempt | null>(null);

  // Reset quiz state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIdx(0);
      setAnswers({});
      setTimeLeft(quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : 0);
      setResultAttempt(null);
    }
  }, [isOpen, quiz]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || resultAttempt || quiz.timeLimitMinutes <= 0) return;
    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft, resultAttempt, quiz.timeLimitMinutes]);

  if (!isOpen) return null;

  const questions: QuizQuestion[] = quiz.questions || [];
  const currentQuestion = questions[currentIdx] || null;
  const progressPercent =
    questions.length > 0 ? Math.round(((currentIdx + 1) / questions.length) * 100) : 100;

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleTextAnswer = (questionId: string, val: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  };

  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await smartApiFetch(`/api/quizzes/${quiz.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        const attempt: QuizAttempt = await res.json();
        setResultAttempt(attempt);
        if (onCompleted) onCompleted(attempt);
        if (attempt.passed) {
          showToast(`Mubarak! You passed "${quiz.title}" with ${attempt.score}%.`);
        } else {
          showToast(`Assessment completed. Score: ${attempt.score}%. Keep reviewing.`);
        }
      } else {
        showToast('Assessment submission failed. Please try again.');
      }
    } catch (err: any) {
      showToast(err.message || 'Submission error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dark Obsidian Glass Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl rounded-2xl border border-teal-500/40 bg-slate-900 shadow-2xl overflow-hidden my-auto"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-400/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-sm sm:text-base font-bold text-white truncate">
                {quiz.title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Passing standard: <strong className="text-teal-300">{quiz.passingScore}%</strong> •{' '}
                {questions.length} questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {quiz.timeLimitMinutes > 0 && !resultAttempt && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                  timeLeft < 120
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-teal-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        {!resultAttempt && questions.length > 0 && (
          <div className="w-full bg-slate-950 border-b border-slate-800/80 px-5 py-2.5 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <span>Question</span>
              <strong className="text-teal-400 font-bold">
                {currentIdx + 1} of {questions.length}
              </strong>
            </div>

            <div className="flex-1 max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>

            <span className="text-[11px] text-teal-400 font-bold">{progressPercent}%</span>
          </div>
        )}

        {/* MAIN BODY: QUESTION SLIDER OR RESULT SCORECARD */}
        <div className="p-6 sm:p-8 min-h-[340px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {resultAttempt ? (
              /* GRAND ASSESSMENT SCORECARD (Cool Reveal Transition) */
              <motion.div
                key="scorecard"
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 text-center py-4"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-xl animate-pulse" />
                  <div
                    className={`relative w-24 h-24 mx-auto rounded-full border-4 flex flex-col items-center justify-center shadow-2xl ${
                      resultAttempt.passed
                        ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300'
                        : 'border-amber-400 bg-amber-950/60 text-amber-300'
                    }`}
                  >
                    <span className="font-display text-3xl font-black">{resultAttempt.score}%</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      {resultAttempt.passed ? 'PASSED' : 'RETRY'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-display text-xl sm:text-2xl font-bold text-white">
                    {resultAttempt.passed ? (
                      <span className="text-emerald-400 flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span>Assessment Passed with Distinction!</span>
                      </span>
                    ) : (
                      <span className="text-amber-400">Assessment Score: Review Required</span>
                    )}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                    {resultAttempt.assessmentFeedback}
                  </p>

                  {resultAttempt.badgeAwarded && (
                    <div className="pt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-400/20 border border-teal-400/50 text-teal-300 text-xs font-bold shadow-lg">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Earned Badge: {resultAttempt.badgeAwarded}</span>
                    </div>
                  )}
                </div>

                {/* Question-by-Question Detailed Review */}
                <div className="text-left space-y-3 pt-4 border-t border-slate-800 max-h-56 overflow-y-auto no-scrollbar pr-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Question Analysis Folio
                  </div>
                  {questions.map((q, idx) => {
                    const studentAns = resultAttempt.answers[q.id];
                    const isCorrect =
                      q.type === 'multiple_choice' || q.type === 'true_false'
                        ? Number(studentAns) === q.correctOptionIndex
                        : Boolean(studentAns);

                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          isCorrect
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-white">
                            Q{idx + 1}: {q.prompt}
                          </span>
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <strong>Your Answer:</strong>{' '}
                          {q.options && studentAns !== undefined
                            ? q.options[Number(studentAns)]
                            : studentAns || 'Unanswered'}
                        </div>
                        <div className="text-[11px] text-teal-300/90 leading-relaxed">
                          <strong>Scholarly Explanation:</strong> {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setResultAttempt(null);
                      setCurrentIdx(0);
                      setAnswers({});
                      setTimeLeft(quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : 0);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Assessment</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold shadow-lg transition-colors"
                  >
                    Close Scorecard
                  </button>
                </div>
              </motion.div>
            ) : currentQuestion ? (
              /* ACTIVE QUESTION WITH COOL SLIDE TRANSITIONS */
              <motion.div
                key={`q-${currentQuestion.id}`}
                initial={{ opacity: 0, x: 28, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -28, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-teal-400/10 border border-teal-400/20">
                      {currentQuestion.type === 'multiple_choice'
                        ? 'Multiple Choice'
                        : currentQuestion.type === 'true_false'
                        ? 'True / False'
                        : 'Short Analysis'}
                    </span>
                    <h4 className="font-display text-base sm:text-lg font-bold text-white leading-relaxed">
                      {currentQuestion.prompt}
                    </h4>
                  </div>

                  {/* Option Choices */}
                  {currentQuestion.type === 'multiple_choice' ||
                  currentQuestion.type === 'true_false' ? (
                    <div className="space-y-2.5">
                      {currentQuestion.options?.map((opt, optIdx) => {
                        const isSelected = answers[currentQuestion.id] === optIdx;
                        return (
                          <motion.button
                            key={optIdx}
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-teal-950/70 border-teal-400 text-teal-200 ring-2 ring-teal-400/40 shadow-lg shadow-teal-500/10'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                isSelected
                                  ? 'border-teal-400 bg-teal-400 text-slate-950'
                                  : 'border-slate-700 text-slate-400'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </div>
                            <span className="flex-1">{opt}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Type your scholarly reflection or analytical answer here..."
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {currentIdx < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentIdx((prev) => prev + 1)}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleFinalSubmit}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            <span>Evaluating...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Assessment</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
