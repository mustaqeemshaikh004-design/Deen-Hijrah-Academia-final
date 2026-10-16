import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Crown,
  Key,
  Users,
  Calendar,
  Clock,
  Globe,
  Sparkles,
  X,
  Laptop,
  Compass,
} from 'lucide-react';
import { CourseEvent, Course, Profile } from '../types.ts';
import {
  getZoomEventDetails,
  generateZoomInvitationText,
  safeOpenLink,
} from '../lib/zoomService.ts';

interface ZoomMeetingLauncherModalProps {
  isOpen: boolean;
  event: CourseEvent | null;
  course?: Course | null;
  currentUserProfile?: Profile | null;
  initialHostMode?: boolean;
  onClose: () => void;
}

export const ZoomMeetingLauncherModal: React.FC<ZoomMeetingLauncherModalProps> = ({
  isOpen,
  event,
  course,
  currentUserProfile,
  initialHostMode = false,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const isTeacherOrAdmin =
    currentUserProfile?.role === 'admin' ||
    currentUserProfile?.role === 'instructor';

  const details = getZoomEventDetails(event, currentUserProfile);
  const isHost = initialHostMode || details.isHost;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCopyInvite = () => {
    const inviteText = generateZoomInvitationText({
      eventTitle: event.title,
      courseTitle: course?.title,
      eventDate: event.eventDate,
      startTime: event.startTime,
      timezone: event.sourceTimezone,
      joinUrl: details.joinUrl,
      meetingId: details.formattedMeetingId,
      passcode: details.passcode,
      hostKey: details.hostKey,
      includeHostKey: isHost,
    });
    handleCopy(inviteText, 'invite');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl rounded-2xl academy-surface border border-teal-500/30 shadow-2xl overflow-hidden my-8"
        >
          {/* Header Banner */}
          <div
            className={`p-6 border-b ${
              isHost
                ? 'bg-gradient-to-r from-teal-950/80 via-emerald-950/40 to-slate-950 border-teal-500/30'
                : 'bg-gradient-to-r from-teal-950/80 via-sky-950/40 to-slate-950 border-teal-500/30'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {isHost ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Host Mode · Instructor Session</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm">
                      <Users className="w-3.5 h-3.5 text-teal-400" />
                      <span>Student Classroom Attendee</span>
                    </span>
                  )}
                  <span className="text-xs font-mono-tabular text-slate-400">
                    ID: {details.formattedMeetingId}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-white pt-1">
                  {event.title}
                </h3>

                <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-teal-400">
                    {course?.title || 'Academy Course'}
                  </span>
                  <span>·</span>
                  <span>Faculty: {event.instructorName}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl academy-elevated text-slate-400 hover:text-white hover:border-teal-400 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Schedule Meta Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-4 text-xs font-mono-tabular text-slate-300">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg academy-elevated">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>{event.eventDate}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg academy-elevated">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>
                  {event.startTime} ({event.duration})
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg academy-elevated">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span>{event.sourceTimezone}</span>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6">
            {/* Host View */}
            {isHost ? (
              <div className="space-y-5">
                {/* Primary Host Launch CTA */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-transparent border border-teal-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Step 1: Start Live Class as Host
                      </span>
                    </div>
                    <span className="text-[11px] text-teal-300 font-semibold">
                      Auto Host Privileges Ready
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Click the button below to launch Zoom. You will automatically start the meeting
                    as the host with full microphone, presentation, and session recording rights.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <a
                      href={details.startUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-sm font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-all shadow-lg shadow-teal-500/20 active:scale-[0.99]"
                    >
                      <Crown className="w-4 h-4 text-slate-950" />
                      <span>Start Meeting as Host Now</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => safeOpenLink(details.appStartUrl)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-colors"
                      title="Direct zoommtg:// app launcher with host token"
                    >
                      <Laptop className="w-4 h-4" />
                      <span>Open in Zoom App</span>
                    </button>
                  </div>
                </div>

                {/* Host Key PIN Card (Crucial for Zoom claiming host inside meeting) */}
                <div className="p-4 rounded-xl academy-elevated border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300">
                        6-Digit Zoom Host Key PIN
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(details.hostKey, 'hostKey')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 transition-colors border border-amber-400/30"
                    >
                      {copiedKey === 'hostKey' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Host Key</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <div className="font-mono text-2xl font-black text-amber-300 tracking-widest px-3 py-1 rounded-lg bg-slate-950/70 border border-amber-500/30">
                      {details.hostKey}
                    </div>
                    <span className="text-xs text-slate-300">
                      Inside Zoom, click <strong>Participants &rarr; Claim Host</strong> and paste this PIN if prompted.
                    </span>
                  </div>
                </div>

                {/* Alternative Launchers & Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl academy-elevated space-y-1">
                    <span className="academy-text-muted">Meeting ID</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-white">
                        {details.formattedMeetingId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(details.cleanMeetingId, 'meetingId')}
                        className="text-teal-400 hover:text-teal-300 p-1"
                        title="Copy ID"
                      >
                        {copiedKey === 'meetingId' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl academy-elevated space-y-1">
                    <span className="academy-text-muted">Passcode</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-white">
                        {details.passcode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(details.passcode, 'passcode')}
                        className="text-teal-400 hover:text-teal-300 p-1"
                        title="Copy Passcode"
                      >
                        {copiedKey === 'passcode' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Copy Invite for Students */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t academy-divider">
                  <div className="text-xs academy-text-secondary">
                    Need to share with registered cohort students?
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-white transition-colors"
                  >
                    {copiedKey === 'invite' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Invitation Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-teal-400" />
                        <span>Copy Complete Student Invitation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Student View */
              <div className="space-y-5">
                {/* Primary Student Join CTA */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-teal-500/15 via-sky-500/10 to-transparent border border-teal-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-teal-400" />
                      Live Classroom Admission
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Admitted &amp; Verified
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Click the button below to join {event.instructorName} in the live Zoom
                    majlis. Have your folios and notes ready.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <a
                      href={details.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-sm font-bold bg-teal-400 text-slate-950 hover:bg-teal-300 transition-all shadow-lg shadow-teal-500/20 active:scale-[0.99]"
                    >
                      <Video className="w-4 h-4 text-slate-950" />
                      <span>Join Live Zoom Class</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <a
                      href={details.webClientJoinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold academy-elevated hover:border-teal-400 text-teal-300 transition-colors"
                      title="Join inside web browser without installing Zoom app"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Join via Web Browser</span>
                    </a>
                  </div>
                </div>

                {/* Meeting ID & Passcode Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl academy-elevated space-y-1">
                    <span className="academy-text-muted">Meeting ID</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-white">
                        {details.formattedMeetingId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(details.cleanMeetingId, 'meetingId')}
                        className="text-teal-400 hover:text-teal-300 p-1"
                        title="Copy ID"
                      >
                        {copiedKey === 'meetingId' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl academy-elevated space-y-1">
                    <span className="academy-text-muted">Passcode</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-white">
                        {details.passcode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(details.passcode, 'passcode')}
                        className="text-teal-400 hover:text-teal-300 p-1"
                        title="Copy Passcode"
                      >
                        {copiedKey === 'passcode' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* If Teacher or Admin is previewing Student mode */}
                {isTeacherOrAdmin && (
                  <div className="p-3 rounded-lg academy-elevated border border-teal-500/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>Are you teaching this class? Switch to Host mode.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => safeOpenLink(details.startUrl)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 transition-colors border border-amber-400/30 whitespace-nowrap"
                    >
                      Start as Host
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
