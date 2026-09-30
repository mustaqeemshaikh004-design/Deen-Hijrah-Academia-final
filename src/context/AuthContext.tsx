import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { Profile, Message, HomeworkSubmission } from '../types.ts';

export interface CreatedEduCredentials {
  fullName: string;
  email: string;
  password: string;
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
    password?: string
  ) => Promise<CreatedEduCredentials>;
  signInWithCredentials: (email: string, password: string) => Promise<Profile>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfileAndMessages: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  uploadMediaFile: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Store token strictly in memory (never in localStorage per security guidelines).
  // Visitors start signed out so they can create their .edu account and sign in to enroll.
  const [idToken, setIdToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [homework, setHomework] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'create' | 'signin'>('create');

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
    if (!tokenToUse) {
      setProfile(null);
      setMessages([]);
      setHomework([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
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
          setIdToken(token);
          await syncWithBackend(token);
        } catch (err) {
          console.error('Error getting Firebase ID token:', err);
          setLoading(false);
        }
      } else {
        await syncWithBackend(idToken);
      }
    });

    return () => unsubscribe();
  }, [syncWithBackend, idToken]);

  // Step 1: Automatic .edu Account Creator (First & Last Name -> firstname@deenhijrah.edu + deen123)
  const createEduAccount = async (
    firstName: string,
    lastName: string,
    password = 'deen123'
  ): Promise<CreatedEduCredentials> => {
    setAuthError(null);
    const res = await fetch('/api/auth/create-edu-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error || 'Failed to create .edu account.';
      setAuthError(msg);
      throw new Error(msg);
    }
    return {
      fullName: data.account.fullName,
      email: data.account.email,
      password: data.account.password || 'deen123',
    };
  };

  // Step 2: Sign In with .edu Email & Password (or private Faculty credentials)
  const signInWithCredentials = async (email: string, password: string): Promise<Profile> => {
    setAuthError(null);
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error || 'Invalid email or password.';
      setAuthError(msg);
      throw new Error(msg);
    }
    const token = data.sessionToken as string;
    setIdToken(token);
    await syncWithBackend(token);
    return data.profile as Profile;
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      await syncWithBackend(token);
    } catch (err: any) {
      console.warn('Google popup sign-in blocked or cancelled in iframe:', err);
      setAuthError(
        'Google popup was blocked by browser/iframe constraints. Please use the Sign In form above.'
      );
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_e) {
      // ignore
    }
    setIdToken(null);
    setProfile(null);
    setMessages([]);
    setHomework([]);
  };

  const refreshProfileAndMessages = async () => {
    await syncWithBackend(idToken);
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (idToken) {
      headers.set('Authorization', `Bearer ${idToken}`);
    }
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, {
      ...options,
      headers,
    });
  };

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
