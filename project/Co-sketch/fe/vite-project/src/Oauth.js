// src/services/Oauth.js

const GOOGLE_CLIENT_ID = "757697157413-8m2fgm99av422srq9sqr5lflr714qcct.apps.googleusercontent.com";
const GITHUB_CLIENT_ID = "Ov23liFk35wT34LUSWft";

export const BACKEND_URL = "https://co-sketch.onrender.com";

export const isChromeExtension = () => {
  return typeof chrome !== 'undefined' && !!(chrome?.identity?.getRedirectURL);
};

export async function loginWithOAuth(provider) {
  const isExt = isChromeExtension();

  // 1. Determine redirect URI
  let redirectUri;
  if (isExt) {
    redirectUri = chrome.identity.getRedirectURL();
  } else {
    // Standard web browser fallback
    redirectUri = window.location.origin;
  }

  let authUrl = "";
  if (provider === "google") {
    authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=openid%20email%20profile` +
      `&prompt=select_account`;
  } else if (provider === "github") {
    authUrl =
      `https://github.com/login/oauth/authorize?` +
      `client_id=${GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=read:user%20user:email`;
  }

  let code = null;

  if (isExt) {
    // Chrome Extension web auth flow
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (callbackUrl) => {
          if (chrome.runtime.lastError || !callbackUrl) {
            return reject(new Error(chrome.runtime.lastError?.message || "Login cancelled"));
          }
          resolve(callbackUrl);
        }
      );
    });
    const urlParams = new URL(responseUrl).searchParams;
    code = urlParams.get("code");
  } else {
    // Web browser popup flow
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      `${provider}_login`,
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!popup) {
      throw new Error("Popup blocked. Please allow popups for this site or use Quick Guest Join.");
    }

    // Poll the popup for the return URL containing the OAuth authorization code
    code = await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            return reject(new Error("Login popup was closed before completing authentication."));
          }

          if (popup.location && popup.location.origin === window.location.origin) {
            const params = new URLSearchParams(popup.location.search);
            const authCode = params.get("code");
            const authError = params.get("error");
            
            clearInterval(interval);
            popup.close();

            if (authError) {
              return reject(new Error(`OAuth error: ${authError}`));
            }
            if (authCode) {
              return resolve(authCode);
            }
            return reject(new Error("No authorization code found in response."));
          }
        } catch (e) {
          // Cross-origin restriction before redirect to origin is normal; keep waiting
        }
      }, 500);
    });
  }

  if (!code) throw new Error("No authorization code found.");

  // 2. Exchange code with backend on Render
  const response = await fetch(`${BACKEND_URL}/api/auth/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Authentication failed on backend server");
  }

  // 3. Store session
  const sessionData = { token: data.token, user: data.user };
  await saveSession(sessionData);

  return sessionData;
}

// Guest login for instant local / browser testing without needing OAuth credentials
export async function loginAsGuest(customName = '') {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const name = customName.trim() || `Guest_${randomSuffix}`;
  const guestUser = {
    id: `guest-${Date.now().toString(36)}`,
    name: name,
    email: `${name.toLowerCase()}@cosketch.local`,
    avatar: null
  };

  const session = { token: null, user: guestUser };
  await saveSession(session);
  return session;
}

// Session persistence helper (works in Extension storage or browser sessionStorage)
async function saveSession(session) {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
      await chrome.storage.session.set({
        authToken: session.token,
        currentUser: session.user,
      });
    }
  } catch (e) {
    console.warn("Extension storage error:", e);
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('co_sketch_session', JSON.stringify(session));
  }
}

// Helper to check for existing logged-in session
export async function getSession() {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
      const result = await chrome.storage.session.get(["authToken", "currentUser"]);
      if (result.authToken || result.currentUser) {
        return { token: result.authToken, user: result.currentUser };
      }
    }
  } catch (e) {
    console.warn("Storage session lookup error:", e);
  }

  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem('co_sketch_session');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        // ignore
      }
    }
  }

  return null;
}

// Logout helper
export async function logoutUser() {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
      await chrome.storage.session.remove(["authToken", "currentUser"]);
    }
  } catch (e) {
    console.warn("Extension storage remove error:", e);
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('co_sketch_session');
  }
}