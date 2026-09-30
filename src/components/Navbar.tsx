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

export type ActiveView = 'home' | 'courses' | 'calendar' | 'dashboard' | 'admin';

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
    logout,
  } = useAuth();

  // Step 1: Create .edu Account Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedEduCredentials | null>(null);

  // Step 2: Sign In Form State (Never pre-fills or exposes any admin email!)
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('deen123');
  const [signingIn, setSigningIn] = useState(false);

  const [activeModalTab, setActiveModalTab] = useState<'create' | 'signin'>(authModalTab);

  useEffect(() => {
    setActiveModalTab(authModalTab);
  }, [authModalTab, authModalOpen]);

  // Strict RBAC: Only Admin / Instructor sees the Admin Portal link
  const isAdminOrInstructor =
    profile?.role === 'admin' || profile?.role === 'instructor';

  const cycleTheme = () => {
    const order: ThemeMode[] = ['dark', 'light', 'auto'];
    const next = order[(order.indexOf(themeMode) + 1) % order.length];
    setThemeMode(next);
  };

  const previewEduEmail = `${
    firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'firstname'
  }@deenhijrah.edu`;

  // Step 1 Handler: Create .edu Account -> Pre-fill Sign In -> Switch to Sign In Tab
  const handleCreateEduAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    setCreatingAccount(true);
    try {
      const creds = await createEduAccount(firstName.trim(), lastName.trim(), 'deen123');
      setCreatedCredentials(creds);
      setSignInEmail(creds.email);
      setSignInPassword(creds.password);
      setActiveModalTab('signin');
    } catch {
      // error is displayed via authError
    } finally {
      setCreatingAccount(false);
    }
  };

  // Step 2 Handler: Sign In -> Now Can Enroll!
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim()) return;
    setSigningIn(true);
    try {
      const signedInProfile = await signInWithCredentials(
        signInEmail.trim(),
        signInPassword || 'deen123'
      );
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
    } catch {
      // error is displayed via authError
    } finally {
      setSigningIn(false);
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

        {/* Zone 2: Navigation links (Admin Portal is strictly hidden unless signed in as Admin) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
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

          {isAdminOrInstructor && (
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
          )}
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
      <div className="flex md:hidden items-center justify-around px-3 py-2 academy-surface border-b text-xs font-medium overflow-x-auto">
        {(['home', 'courses', 'calendar', 'dashboard'] as ActiveView[]).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => onNavigate(view)}
            className={`px-2.5 py-1 rounded whitespace-nowrap capitalize ${
              activeView === view ? 'text-teal-400 font-semibold' : 'academy-text-secondary'
            }`}
          >
            {view}
          </button>
        ))}
        {isAdminOrInstructor && (
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeView === 'admin' ? 'text-teal-400 font-semibold' : 'academy-text-secondary'
            }`}
          >
            Admin
          </button>
        )}
      </div>

      {/* Automatic .edu Account Creator & Sign In Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl academy-surface p-6 shadow-2xl border border-teal-500/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b academy-divider">
              <div>
                <h3 className="font-display text-lg font-bold text-teal-400">
                  Deen Hijrah Academia Portal Access
                </h3>
                <p className="text-xs academy-text-secondary mt-0.5">
                  Step 1: Create your automatic <strong>.edu</strong> account · Step 2: Sign In to
                  enroll
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
              /* STEP 1: AUTOMATIC .EDU ACCOUNT CREATOR */
              <form onSubmit={handleCreateEduAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Ahmad"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs academy-text-secondary mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Mansoor"
                      className="w-full px-3 py-2 text-sm rounded-lg academy-elevated focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                {/* Live Automatic .edu Credential Generator Preview */}
                <div className="p-3.5 rounded-lg academy-elevated border border-teal-500/30 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
                    Automatic .edu Student Credentials Preview
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="academy-text-secondary">Generated .edu Email:</span>
                    <span className="font-mono-tabular font-semibold text-white">
                      {previewEduEmail}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="academy-text-secondary">Default Password:</span>
                    <span className="font-mono-tabular font-semibold text-teal-300">deen123</span>
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
                      ? 'Creating Your .edu Account...'
                      : 'Create Account (Then Sign In)'}
                  </span>
                </button>
              </form>
            ) : (
              /* STEP 2: SIGN IN TO ENROLL */
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                {createdCredentials && (
                  <div className="p-3.5 rounded-lg bg-teal-500/15 border border-teal-400/50 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Account Created for {createdCredentials.fullName}!</span>
                    </div>
                    <div className="text-xs academy-text-secondary font-mono-tabular">
                      Email: <strong className="text-white">{createdCredentials.email}</strong> ·
                      Password: <strong className="text-teal-300">{createdCredentials.password}</strong>
                    </div>
                    <div className="text-[11px] text-teal-200">
                      Click <strong>&ldquo;Sign In Now&rdquo;</strong> below to activate your session
                      and enroll in courses!
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
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="firstname@deenhijrah.edu"
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

                <div className="pt-2 border-t academy-divider">
                  <button
                    type="button"
                    onClick={async () => {
                      await signInWithGoogle();
                      closeAuthModal();
                    }}
                    className="w-full py-2 px-4 text-xs font-medium rounded-lg academy-elevated hover:border-teal-400/50 transition-colors whitespace-nowrap"
                  >
                    Continue with Google OAuth
                  </button>
                </div>
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
