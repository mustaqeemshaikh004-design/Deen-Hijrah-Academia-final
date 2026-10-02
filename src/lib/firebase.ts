import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export const GOOGLE_OAUTH_CLIENT_ID =
  firebaseConfig.oAuthClientId ||
  '294661322976-cs5rha6hm4bvvd3eqs359doqcdqtdt0g.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export function ensureGoogleGsiLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="accounts.google.com/gsi/client"]'
    );
    if (existing) {
      let checks = 0;
      const timer = window.setInterval(() => {
        checks += 1;
        if (window.google?.accounts?.oauth2) {
          window.clearInterval(timer);
          resolve();
        } else if (checks > 40) {
          window.clearInterval(timer);
          reject(new Error('Google Identity Services script load timeout'));
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// Preload Google Identity Services as soon as the module loads in the browser
if (typeof window !== 'undefined') {
  ensureGoogleGsiLoaded().catch(() => {});
}

export interface GoogleUserInfo {
  uid: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

function triggerGsiTokenPopup(
  oauth2: NonNullable<NonNullable<Window['google']>['accounts']>['oauth2']
): Promise<GoogleUserInfo> {
  return new Promise<GoogleUserInfo>((resolve, reject) => {
    if (!oauth2) {
      reject(new Error('Google Identity Services unavailable'));
      return;
    }
    const tokenClient = oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (tokenResponse) => {
        if (tokenResponse.error || !tokenResponse.access_token) {
          reject(
            new Error(
              tokenResponse.error_description ||
                tokenResponse.error ||
                'Google sign-in cancelled'
            )
          );
          return;
        }
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          });
          if (!res.ok) {
            throw new Error('Failed to fetch Google user profile');
          }
          const info = await res.json();
          const email = String(info.email || '').trim().toLowerCase();
          const fullName = String(
            info.name || info.given_name || email.split('@')[0] || 'Scholar Student'
          ).trim();
          resolve({
            uid: String(info.sub || `google-${Date.now()}`),
            email: email || 'student@gmail.com',
            fullName,
            avatarUrl: info.picture ? String(info.picture) : null,
          });
        } catch (err) {
          reject(err);
        }
      },
      error_callback: (err) => {
        reject(new Error(err?.message || err?.type || 'Google popup closed or blocked'));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}

/**
 * Opens the official Google Accounts chooser page (https://accounts.google.com) directly
 * using Google Identity Services OAuth2 Token Client and fetches the authenticated user's profile.
 */
export function openGoogleAccountsPopup(): Promise<GoogleUserInfo> {
  const oauth2 = window.google?.accounts?.oauth2;
  if (oauth2) {
    // Call synchronously within the user click gesture so the popup is never blocked
    return triggerGsiTokenPopup(oauth2);
  }
  return ensureGoogleGsiLoaded().then(() =>
    triggerGsiTokenPopup(window.google?.accounts?.oauth2)
  );
}
