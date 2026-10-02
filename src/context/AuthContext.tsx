import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { openGoogleAccountsPopup } from '../lib/firebase.ts';
import { Profile, Message, HomeworkSubmission } from '../types.ts';
import { smartApiFetch, handleLocalFallbackRequest } from '../lib/fallbackStore.ts';

export interface CreatedEduCredentials {
  fullName: string;
  email: string;
  password: string;
  profile: Profile;
}

interface AuthContextType {
  profile: Profile | null;
  messages: Message[];
  homework: HomeworkSubmission[];
  idToken: string | null;
  loading: boolean;
  authError: string | null;
  authModalOpen: boolean;
  authModalTab: 'create' | 'signin';
  openAuthModal: (tab?: 'create' | 'signin') => void;
  closeAuthModal: () => void;
  createEduAccount: (
    firstName: string,
    lastName: string,
    password?: string,
    customEmail?: string
  ) => Promise<CreatedEduCredentials>;
  signInWithCredentials: (email: string, password: string) => Promise<Profile>;
  signInWithGoogle: () => Promise<Profile>;
  signInWithGoogleAccount: (email: string, fullName?: string) => Promise<Profile>;
  logout: () => Promise<void>;
  refreshProfileAndMessages: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  uploadMediaFile: (file: File) => Promise<string>;
}

const SESSION_STORAGE_KEY = 'deen_hijrah_session_token';

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted iframes
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialToken = readStoredToken();
  const [idToken, setIdToken] = useState<string | null>(initialToken);
  const idTokenRef = useRef<string | null>(initialToken);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [homework, setHomework] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'create' | 'signin'>('create');

  const updateActiveToken = useCallback((nextToken: string | null) => {
    idTokenRef.current = nextToken;
    setIdToken(nextToken);
    writeStoredToken(nextToken);
  }, []);

  const openAuthModal = useCallback((tab: 'create' | 'signin' = 'create') => {
    setAuthError(null);
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthError(null);
  }, []);

  const syncWithBackend = useCallback(async (tokenToUse: string | null) => {
    const activeToken = tokenToUse ?? idTokenRef.current;
    if (!activeToken) {
      setProfile(null);
      setMessages([]);
      setHomework([]);
      setLoading(false);
      return;
    }

    try {
      const res = await smartApiFetch('/api/me', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setMessages(data.messages || []);
          setHomework(data.homework || []);
        }
      }
    } catch (err) {
      console.error('Error syncing profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const completeGoogleSignIn = useCallback(
    async (params: {
      uid?: string;
      email: string;
      fullName?: string;
      avatarUrl?: string | null;
    }): Promise<Profile> => {
      const res = await smartApiFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.profile) {
        const msg = data.error || 'Failed to complete Google sign-in.';
        setAuthError(msg);
        throw new Error(msg);
      }
      const token = data.sessionToken as string;
      updateActiveToken(token);
      setProfile(data.profile as Profile);
      await syncWithBackend(token);
      return data.profile as Profile;
    },
    [syncWithBackend, updateActiveToken]
  );

  useEffect(() => {
    syncWithBackend(idTokenRef.current);
  }, [syncWithBackend]);

  // Step 1: Create Account (supports automatic .edu email OR custom email) & immediately activate session
  const createEduAccount = async (
    firstName: string,
    lastName: string,
    password = 'deen123',
    customEmail?: string
  ): Promise<CreatedEduCredentials> => {
    setAuthError(null);
    const reqInit: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, password, email: customEmail }),
    };
    let res = await smartApiFetch('/api/auth/create-edu-account', reqInit);
    let data = await res.json().catch(() => ({}));
    if (!res.ok || !data.profile) {
      res = await handleLocalFallbackRequest('/api/auth/create-edu-account', reqInit);
      data = await res.json().catch(() => ({}));
    }

    if (data.sessionToken && data.profile) {
      updateActiveToken(data.sessionToken);
      setProfile(data.profile);
      await syncWithBackend(data.sessionToken);
    }

    return {
      fullName: data.account?.fullName || data.profile?.fullName || 'Scholar Student',
      email: data.account?.email || data.profile?.email || 'student@deenhijrah.edu',
      password: data.account?.password || password || 'deen123',
      profile: data.profile as Profile,
    };
  };

  // Step 2: Sign In with Email & Password (or private Faculty credentials)
  const signInWithCredentials = async (email: string, password: string): Promise<Profile> => {
    setAuthError(null);
    const reqInit: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    };
    let res = await smartApiFetch('/api/auth/sign-in', reqInit);
    let data = await res.json().catch(() => ({}));
    if (!res.ok || !data.profile) {
      res = await handleLocalFallbackRequest('/api/auth/sign-in', reqInit);
      data = await res.json().catch(() => ({}));
    }
    if (!data.profile) {
      const msg = 'Please enter your email address to sign in.';
      setAuthError(msg);
      throw new Error(msg);
    }
    const token = data.sessionToken as string;
    updateActiveToken(token);
    setProfile(data.profile as Profile);
    await syncWithBackend(token);
    return data.profile as Profile;
  };

  // Direct Google Account Sign-In (used when Google popup succeeds OR when popup is blocked by iframe/domain constraints)
  const signInWithGoogleAccount = async (
    email: string,
    fullName?: string
  ): Promise<Profile> => {
    setAuthError(null);
    const rawEmail = email.trim().toLowerCase();
    const cleanEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@gmail.com`;
    return await completeGoogleSignIn({
      uid: `google-${cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '') || 'user'}`,
      email: cleanEmail,
      fullName: fullName?.trim() || undefined,
      avatarUrl: null,
    });
  };

  const signInWithGoogle = async (): Promise<Profile> => {
    setAuthError(null);
    try {
      const googleUser = await openGoogleAccountsPopup();
      return await completeGoogleSignIn({
        uid: googleUser.uid,
        email: googleUser.email,
        fullName: googleUser.fullName,
        avatarUrl: googleUser.avatarUrl,
      });
    } catch (err: any) {
      console.warn('Google Accounts popup fallback triggered:', err);
      throw new Error('GOOGLE_POPUP_UNAVAILABLE');
    }
  };

  const logout = async () => {
    updateActiveToken(null);
    setProfile(null);
    setMessages([]);
    setHomework([]);
  };

  const refreshProfileAndMessages = useCallback(async () => {
    if (idTokenRef.current) {
      await syncWithBackend(idTokenRef.current);
    }
  }, [syncWithBackend]);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    const activeToken = idTokenRef.current;
    if (activeToken) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return smartApiFetch(url, {
      ...options,
      headers,
    });
  }, []);

  const uploadMediaFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await authFetch('/api/upload-media', {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              dataUrl,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            resolve(data.url);
          } else {
            resolve(dataUrl);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        messages,
        homework,
        idToken,
        loading,
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
        refreshProfileAndMessages,
        authFetch,
        uploadMediaFile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
