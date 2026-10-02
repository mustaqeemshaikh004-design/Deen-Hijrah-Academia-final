import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  UserCheck,
  LogIn,
  UserPlus,
  CheckCircle2,
  KeyRound,
  Mail,
  X,
} from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext.tsx';
import { useAuth, CreatedEduCredentials } from '../context/AuthContext.tsx';
import { AcademyLogo } from './AcademyLogo.tsx';
import { Profile } from '../types.ts';

export type ActiveView =
  | 'home'
  | 'courses'
  | 'faculty'
  | 'calendar'
  | 'dashboard'
  | 'admin';

interface NavbarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  unreadCount: number;
  onReplayIntro?: () => void;
  onSignedInSuccess?: (profile: Profile) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  unreadCount,
  onReplayIntro,
  onSignedInSuccess,
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const {
    profile,
    authError,
    authModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
    createEduAccount,
    signInWithCredentials,
    signInWithGoogle,
    signInWithGoogleAccount,
    logout,
  } = useAuth();

  // Step 1: Create Account Form State (supports custom email OR automatic .edu email)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('deen123');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedEduCredentials | null>(null);

  // Step 2: Sign In Form State (Never pre-fills or exposes any admin email!)
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('deen123');
  const [signingIn, setSigningIn] = useState(false);

  // Google Auth State (supports OAuth popup + instant inline Google Account sign-in if popups are restricted)
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [showGoogleQuickForm, setShowGoogleQuickForm] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleFullName, setGoogleFullName] = useState('');

  const [activeModalTab, setActiveModalTab] = useState<'create' | 'signin'>(authModalTab);

  useEffect(() => {
    setActiveModalTab(authModalTab);
    if (!authModalOpen) {
      setShowGoogleQuickForm(false);
      setSigningInGoogle(false);
    }
  }, [authModalTab, authModalOpen]);

  // Strict RBAC: Only Admin / Instructor sees the Admin Portal link
  const isAdminOrInstructor =
    profile?.role === 'admin' || profile?.role === 'instructor';

  const cycleTheme = () => {
    const order: ThemeMode[] = ['dark', 'light', 'auto'];
    const next = order[(order.indexOf(themeMode) + 1) % order.length];
    setThemeMode(next);
  };

  const previewEduEmail = createEmail.trim()
    ? createEmail.trim().toLowerCase()
    : `${
        firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'firstname'
      }@deenhijrah.edu`;

  const completeSignedInNavigation = (signedInProfile: Profile) => {
    if (
      signedInProfile.role !== 'admin' &&
      signedInProfile.role !== 'instructor' &&
      activeView === 'admin'
    ) {
      onNavigate('dashboard');
    }
    closeAuthModal();
    if (onSignedInSuccess) {
      onSignedInSuccess(signedInProfile);
    }
  };

  // Handler 1: Create Account & Immediately Sign In
  const handleCreateEduAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() && !createEmail.trim()) return;
    setCreatingAccount(true);
    try {
      const creds = await createEduAccount(
        firstName.trim(),
        lastName.trim(),
        createPassword.trim() || 'deen123',
        createEmail.trim() || undefined
      );
      setCreatedCredentials(creds);
      setSignInEmail(creds.email);
      setSignInPassword(creds.password);
      completeSignedInNavigation(creds.profile);
    } catch {
      // error is displayed via authError
    } finally {
      setCreatingAccount(false);
    }
  };

  // Handler 2: Sign In by Email
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim()) return;
    setSigningIn(true);
    try {
      const signedInProfile = await signInWithCredentials(
        signInEmail.trim(),
        signInPassword || 'deen123'
      );
      completeSignedInNavigation(signedInProfile);
    } catch {
      // error is displayed via authError
    } finally {
      setSigningIn(false);
    }
  };

  // Handler 3: Continue with Google (Popup first, or instant Google Account sign-in if popup/domain is restricted)
  const handleGoogleAuthClick = async () => {
    setSigningInGoogle(true);
    try {
      const signedInProfile = await signInWithGoogle();
      completeSignedInNavigation(signedInProfile);
    } catch {
      // If the user already typed an email in Sign In or Create Account, sign them in with Google immediately
      const candidateEmail = (googleEmail || signInEmail || createEmail).trim();
      const candidateName =
        googleFullName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();
      if (candidateEmail) {
        try {
          const signedInProfile = await signInWithGoogleAccount(
            candidateEmail,
            candidateName || undefined
          );
          completeSignedInNavigation(signedInProfile);
          return;
        } catch {
          // fall through to show inline Google form
        }
      }
      if (firstName.trim() && !googleFullName.trim()) {
        setGoogleFullName(`${firstName.trim()} ${lastName.trim()}`.trim());
      }
      setShowGoogleQuickForm(true);
    } finally {
      setSigningInGoogle(false);
    }
  };

  const handleGoogleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;
    setSigningInGoogle(true);
    try {
      const signedInProfile = await signInWithGoogleAccount(
        googleEmail.trim(),
        googleFullName.trim() || undefined
      );
      completeSignedInNavigation(signedInProfile);
    } catch {
      // error shown via authError
    } finally {
      setSigningInGoogle(false);
    }
  };

  return (
    <>
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 lg:px-10 py-4 academy-surface border-b backdrop-blur-md bg-opacity-95">
        {/* Zone 1: Brand Emblem & Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          onDoubleClick={() => {
            if (onReplayIntro) onReplayIntro();
          }}
          title="Deen Hijrah Academia (Double-click to replay logo intro)"
          className="flex items-center gap-3 font-display text-lg lg:text-xl font-bold tracking-wider text-teal-400 hover:text-teal-300 transition-colors whitespace-nowrap shrink-0"
        >
          <AcademyLogo size="sm" />
          <span>Deen Hijrah Academia</span>
        </a>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 ${
              activeView === 'home'
                ? 'border-teal-400 text-teal-400 font-semibold'
                : 'border-transparent academy-text-secondary hover:text-teal-300'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate('courses')}
            className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 ${
              activeView === 'courses'
                ? 'border-teal-400 text-teal-400 font-semibold'
                : 'border-transparent academy-text-secondary hover:text-teal-300'
            }`}
          >
            Courses
          </button>
          <button
            type="button"
            onClick={() => onNavigate('faculty')}
            className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 ${
              activeView === 'faculty'
                ? 'border-teal-400 text-teal-400 font-semibold'
                : 'border-transparent academy-text-secondary hover:text-teal-300'
            }`}
          >
            Our Faculty
          </button>
          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 ${
              activeView === 'calendar'
                ? 'border-teal-400 text-teal-400 font-semibold'
                : 'border-transparent academy-text-secondary hover:text-teal-300'
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 ${
              activeView === 'dashboard'
                ? 'border-teal-400 text-teal-400 font-semibold'
                : 'border-transparent academy-text-secondary hover:text-teal-300'
            }`}
          >
            {isAdminOrInstructor ? 'Student View' : 'My Dashboard'}
            {unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>

          {profile?.role === 'admin' ? (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 ${
                activeView === 'admin'
                  ? 'border-teal-400 text-teal-400 font-semibold'
                  : 'border-transparent academy-text-secondary hover:text-teal-300'
              }`}
            >
              Admin Portal
            </button>
          ) : profile?.role === 'instructor' ? (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`whitespace-nowrap transition-colors pb-0.5 border-b-2 ${
                activeView === 'admin'
                  ? 'border-teal-400 text-teal-400 font-semibold'
                  : 'border-transparent text-teal-400 hover:text-teal-300 font-semibold'
              }`}
            >
              Teacher Studio
            </button>
          ) : null}
        </nav>

        {/* Zone 3: 2 Primary Actions (Theme Mode Switcher + Create Account / Sign In Trigger) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={cycleTheme}
            title={`Current theme: ${themeMode.toUpperCase()} (Click to switch Light / Dark / Auto)`}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg academy-elevated hover:border-teal-400/50 transition-colors whitespace-nowrap"
          >
            {themeMode === 'dark' && <Moon className="w-3.5 h-3.5 text-teal-400" />}
            {themeMode === 'light' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
            {themeMode === 'auto' && <Monitor className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="capitalize">{themeMode}</span>
          </button>

          <button
            type="button"
            onClick={() => openAuthModal(profile ? 'signin' : 'create')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            {profile ? (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span className="max-w-[140px] truncate">{profile.fullName}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account / Sign In</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center justify-around px-3 py-2 academy-surface border-b text-xs font-medium overflow-x-auto gap-2">
        {(['home', 'courses', 'faculty', 'calendar', 'dashboard'] as ActiveView[]).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => onNavigate(view)}
            className={`px-2.5 py-1 rounded whitespace-nowrap capitalize ${
              activeView === view ? 'text-teal-400 font-semibold' : 'academy-text-secondary'
            }`}
          >
            {view === 'faculty' ? 'Our Faculty' : view}
          </button>
        ))}
        {profile?.role === 'admin' ? (
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeView === 'admin' ? 'text-teal-400 font-semibold' : 'academy-text-secondary'
            }`}
          >
            Admin
          </button>
        ) : profile?.role === 'instructor' ? (
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeView === 'admin' ? 'text-teal-400 font-semibold' : 'text-teal-400'
            }`}
          >
            Teacher Studio
          </button>
        ) : null}
      </div>

      {/* Automatic .edu Account Creator, Email Sign In & Google Auth Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl academy-surface p-6 shadow-2xl border border-teal-500/30 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b academy-divider">
              <div>
                <h3 className="font-display text-lg font-bold text-teal-400">
                  Deen Hijrah Academia Portal Access
                </h3>
                <p className="text-xs academy-text-secondary mt-0.5">
                  Sign in with <strong>Google</strong>, create an <strong>.edu</strong> account, or
                  sign in by email to enroll
                </p>
              </div>
              <button
                type="button"
                onClick={closeAuthModal}
                className="p-1.5 rounded-lg academy-text-secondary hover:text-teal-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Currently Signed-In Account Summary */}
            {profile && (
              <div className="p-3.5 rounded-lg academy-elevated border border-teal-500/30 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{profile.fullName}</div>
                  <div className="text-xs academy-text-secondary font-mono-tabular">
                    {profile.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onNavigate('home');
                    closeAuthModal();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 whitespace-nowrap"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Direct Google Auth Section (Available on both tabs so users can skip Create Account and use Google directly) */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={signingInGoogle}
                onClick={handleGoogleAuthClick}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-semibold rounded-lg bg-white text-slate-900 hover:bg-slate-100 border border-slate-300 transition-colors shadow-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>
                  {signingInGoogle
                    ? 'Signing in with Google...'
                    : 'Continue with Google (Instant Student Access)'}
                </span>
              </button>

              {showGoogleQuickForm && (
                <form
                  onSubmit={handleGoogleQuickSubmit}
                  className="p-3.5 rounded-lg academy-elevated border border-teal-400/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-teal-300">
                      Continue with Your Google Account
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGoogleQuickForm(false)}
                      className="text-[11px] academy-text-secondary hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-[11px] academy-text-secondary">
                    Enter your Google email below to sign in directly as a student and enroll in
                    courses (no password required):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      inputMode="email"
                      required
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-teal-500/30 focus:outline-none focus:border-teal-400 font-mono-tabular"
                    />
                    <input
                      type="text"
                      value={googleFullName}
                      onChange={(e) => setGoogleFullName(e.target.value)}
                      placeholder="Your Name (Optional)"
                      className="w-full px-3 py-2 text-xs rounded-lg academy-surface border border-teal-500/30 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={signingInGoogle}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-teal-400 text-slate-950 hover:bg-teal-300 transition-colors"
                  >
                    {signingInGoogle ? 'Signing In...' : 'Sign In with Google & Unlock Enrollment'}
                  </button>
                </form>
              )}

              <div className="flex items-center gap-3 py-0.5">
                <div className="h-px flex-1 bg-slate-700/60" />
                <span className="text-[10px] uppercase tracking-wider academy-text-muted">
                  or use email account
                </span>
                <div className="h-px flex-1 bg-slate-700/60" />
              </div>
            </div>

            {/* 2-Step Segmented Tabs: 1. Create .edu Account | 2. Sign In */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg academy-elevated">
              <button
                type="button"
                onClick={() => setActiveModalTab('create')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeModalTab === 'create'
                    ? 'bg-teal-400 text-slate-950 font-semibold'
                    : 'academy-text-secondary hover:text-teal-300'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>1. Create Account</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('signin')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeModalTab === 'signin'
                    ? 'bg-teal-400 text-slate-950 font-semibold'
                    : 'academy-text-secondary hover:text-teal-300'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>2. Sign In</span>
              </button>
            </div>

            {activeModalTab === 'create' ? (
              /* STEP 1: CREATE ACCOUNT & IMMEDIATELY SIGN IN */
              <form onSubmit={handleCreateEduAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Ahmad"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Last Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Mansoor"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Email Address (Optional — leave blank for automatic .edu email)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 academy-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder={previewEduEmail}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400 font-mono-tabular"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 academy-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="deen123"
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400 font-mono-tabular"
                    />
                  </div>
                </div>

                {/* Live Automatic .edu Credential Generator Preview */}
                <div className="p-3.5 rounded-lg academy-elevated border border-teal-500/30 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
                    Account Credentials Preview
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="academy-text-secondary">Account Email:</span>
                    <span className="font-mono-tabular font-semibold text-white">
                      {previewEduEmail}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="academy-text-secondary">Password:</span>
                    <span className="font-mono-tabular font-semibold text-teal-300">
                      {createPassword || 'deen123'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {creatingAccount
                      ? 'Creating Account & Signing In...'
                      : 'Create Account & Sign In'}
                  </span>
                </button>
              </form>
            ) : (
              /* STEP 2: SIGN IN BY EMAIL */
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                {createdCredentials && (
                  <div className="p-3.5 rounded-lg bg-teal-500/15 border border-teal-400/50 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Account Ready for {createdCredentials.fullName}!</span>
                    </div>
                    <div className="text-xs academy-text-secondary font-mono-tabular">
                      Email: <strong className="text-white">{createdCredentials.email}</strong> ·
                      Password: <strong className="text-teal-300">{createdCredentials.password}</strong>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 academy-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="yourname@deenhijrah.edu or email"
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400 font-mono-tabular"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs academy-text-secondary mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 academy-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="deen123"
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400 font-mono-tabular"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{signingIn ? 'Signing In...' : 'Sign In Now'}</span>
                </button>
              </form>
            )}

            {authError && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
                {authError}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
