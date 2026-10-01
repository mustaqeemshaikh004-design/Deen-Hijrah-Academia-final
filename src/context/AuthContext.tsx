import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { Profile, Message, HomeworkSubmission } from '../types.ts';

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
  signInWithGoogle: () => Promise<void>;
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
      const res = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setMessages(data.messages || []);
        setHomework(data.homework || []);
      }
    } catch (err) {
      console.error('Error syncing profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          updateActiveToken(token);
          await syncWithBackend(token);
        } catch (err) {
          console.error('Error getting Firebase ID token:', err);
          setLoading(false);
        }
      } else {
        await syncWithBackend(idTokenRef.current);
      }
    });

    return () => unsubscribe();
  }, [syncWithBackend, updateActiveToken]);

  // Step 1: Create Account (supports automatic .edu email OR custom email) & immediately activate session
  const createEduAccount = async (
    firstName: string,
    lastName: string,
    password = 'deen123',
    customEmail?: string
  ): Promise<CreatedEduCredentials> => {
    setAuthError(null);
    const res = await fetch('/api/auth/create-edu-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, password, email: customEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || 'Failed to create account.';
      setAuthError(msg);
      throw new Error(msg);
    }

    if (data.sessionToken && data.profile) {
      updateActiveToken(data.sessionToken);
      setProfile(data.profile);
      await syncWithBackend(data.sessionToken);
    }

    return {
      fullName: data.account.fullName,
      email: data.account.email,
      password: data.account.password || 'deen123',
      profile: data.profile as Profile,
    };
  };

  // Step 2: Sign In with Email & Password (or private Faculty credentials)
  const signInWithCredentials = async (email: string, password: string): Promise<Profile> => {
    setAuthError(null);
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || 'Invalid email or password.';
      setAuthError(msg);
      throw new Error(msg);
    }
    const token = data.sessionToken as string;
    updateActiveToken(token);
    setProfile(data.profile as Profile);
    await syncWithBackend(token);
    return data.profile as Profile;
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      updateActiveToken(token);
      await syncWithBackend(token);
    } catch (err: any) {
      console.warn('Google popup sign-in blocked or cancelled in iframe:', err);
      setAuthError(
        'Google popup was blocked by browser/iframe constraints. Please sign in with your email above.'
      );
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_e) {
      // ignore
    }
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
    return fetch(url, {
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
