import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, GraduationCap, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Profile } from '../types.ts';
import { AcademyLogo } from './AcademyLogo.tsx';

interface RoleApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile | null;
  onSubmitApplication: (
    requestedRole: 'instructor' | 'admin',
    reason: string,
    credentialsBio: string
  ) => Promise<void>;
}

export const RoleApplicationModal: React.FC<RoleApplicationModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSubmitApplication,
}) => {
  const [requestedRole, setRequestedRole] = useState<'instructor' | 'admin'>('instructor');
  const [reason, setReason] = useState('');
  const [credentialsBio, setCredentialsBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for your access request.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmitApplication(requestedRole, reason.trim(), credentialsBio.trim());
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg rounded-2xl academy-surface border border-teal-500/30 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <AcademyLogo size="md" />
            <div>
              <h3 className="text-lg font-bold font-display text-white">
                Apply for Faculty or Admin Access
              </h3>
              <p className="text-xs academy-text-secondary">
                Submit an official request to Founder Mustaqeem Shaikh for elevated privileges.
              </p>
            </div>
          </div>

          {success ? (
            <div className="p-6 rounded-xl bg-teal-500/10 border border-teal-500/30 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto" />
              <h4 className="font-display text-base font-bold text-white">Application Submitted</h4>
              <p className="text-xs text-slate-300">
                Your application has been logged in the Directorate Review Portal. You will be notified once approved.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-teal-400 mb-2">
                  Select Requested Access Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRequestedRole('instructor')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all text-left ${
                      requestedRole === 'instructor'
                        ? 'border-teal-400 bg-teal-500/15 text-white ring-1 ring-teal-400 shadow-md'
                        : 'border-slate-800 academy-elevated text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-teal-300 shrink-0" />
                    <div>
                      <div className="font-bold">Teacher / Instructor</div>
                      <div className="text-[10px] academy-text-secondary">Course &amp; lecture management</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestedRole('admin')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all text-left ${
                      requestedRole === 'admin'
                        ? 'border-amber-400 bg-amber-400/15 text-white ring-1 ring-amber-400 shadow-md'
                        : 'border-slate-800 academy-elevated text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold">Administrator</div>
                      <div className="text-[10px] academy-text-secondary">Global curriculum &amp; portal controls</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Qualifications / Bio */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1.5">
                  Academic Background &amp; Teaching Experience
                </label>
                <textarea
                  rows={3}
                  value={credentialsBio}
                  onChange={(e) => setCredentialsBio(e.target.value)}
                  placeholder="e.g. Studied Classical Arabic at Al-Azhar, 5 years teaching Seerah and Hadith..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400 border border-slate-800 text-slate-200"
                />
              </div>

              {/* Reason for Request */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1.5">
                  Statement of Intent &amp; Academic Scope *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you are requesting this access level and which courses or cohorts you plan to instruct..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl academy-elevated focus:outline-none focus:border-teal-400 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 disabled:opacity-50 transition-all shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting Application...' : 'Send Application'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
