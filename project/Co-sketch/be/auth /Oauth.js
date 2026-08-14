export async function loginWithCustomOAuth(provider) { // provider = 'google' or 'github'
  const redirectUri = chrome.identity.getRedirectURL(); // https://<ext-id>.chromiumapp.org/
  let authUrl = '';

  if (provider === 'google') {
    authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=YOUR_GOOGLE_CLIENT_ID` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=openid%20email%20profile`;
  } else if (provider === 'github') {
    authUrl =
      `https://github.com/login/oauth/authorize?` +
      `client_id=YOUR_GITHUB_CLIENT_ID` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=user:email`;
  }

  // 1. Launch Chrome Auth Popup
  const redirectResponse = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        return reject(new Error(chrome.runtime.lastError?.message || 'Login Canceled'));
      }
      resolve(responseUrl);
    });
  });

  // 2. Extract Auth Code from Redirect URL params
  const urlParams = new URL(redirectResponse).searchParams;
  const code = urlParams.get('code');

  if (!code) throw new Error('Authorization code not found');

  // 3. Send Auth Code to YOUR Node.js Backend
  const backendResponse = await fetch(`http://localhost:3001/api/auth/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });

  const data = await backendResponse.json();

  if (!data.success) throw new Error(data.error);

  // 4. Store YOUR custom JWT in Extension Session Storage
  await chrome.storage.session.set({ authToken: data.token, user: data.user });

  console.log(`Successfully logged in as ${data.user.name}`);
  return data;
}


