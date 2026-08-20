// src/services/auth.js

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const GITHUB_CLIENT_ID = "YOUR_GITHUB_CLIENT_ID";
const BACKEND_URL = "http://localhost:3001";

export async function loginWithOAuth(provider) {
  // 1. Chrome's unique extension redirect URL: https://<id>.chromiumapp.org/
  const redirectUri = chrome.identity.getRedirectURL();

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

  // 2. Open native Chrome popup
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

  // 3. Extract the authorization code from returning URL
  const urlParams = new URL(responseUrl).searchParams;
  const code = urlParams.get("code");
  if (!code) throw new Error("No authorization code found.");

  // 4. Send code to YOUR Node.js server
  const response = await fetch(`${BACKEND_URL}/api/auth/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirectUri }),
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Authentication failed");

  // 5. Store session in Chrome's session storage
  await chrome.storage.session.set({
    authToken: data.token,
    currentUser: data.user,
  });

  return { token: data.token, user: data.user };
}

// Helper to check for existing logged-in session
export async function getSession() {
  try {
    if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
      const result = await chrome.storage.session.get(["authToken", "currentUser"]);
      if (result.authToken && result.currentUser) {
        return { token: result.authToken, user: result.currentUser };
      }
    }
  } catch (e) {
    console.warn("Storage session lookup error:", e);
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
    console.warn("Storage session remove error:", e);
  }
}