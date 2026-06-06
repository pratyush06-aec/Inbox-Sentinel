// OAuth helper for Inbox Sentinel using chrome.identity.launchWebAuthFlow
// Stores token in chrome.storage.local under key `google_oauth`.

async function getOAuthClientId() {
  const manifest = chrome.runtime.getManifest();
  const manifestClientId = manifest.oauth2 && manifest.oauth2.client_id;
  if (manifestClientId && manifestClientId !== '<YOUR_GOOGLE_OAUTH_CLIENT_ID>') {
    return manifestClientId;
  }

  try {
    const url = chrome.runtime.getURL('runtime-config.json');
    const response = await fetch(url);
    if (!response.ok) throw new Error('runtime-config not available');
    const config = await response.json();
    return config.googleClientId || config.GOOGLE_OAUTH_CLIENT_ID || null;
  } catch (err) {
    console.error('getOAuthClientId failed', err);
    return null;
  }
}

const Auth = {
  async signIn() {
    let oauthClientId = null;
    try {
      oauthClientId = await getOAuthClientId();
    } catch (err) {
      console.error('load oauth client id failed', err);
    }

    if (!oauthClientId) {
      throw new Error('OAuth client_id not set in manifest or runtime-config.json');
    }

    const manifest = chrome.runtime.getManifest();
    const scopes = (manifest.oauth2 && manifest.oauth2.scopes) || [];
    const redirectUri = chrome.identity.getRedirectURL();

    console.log('Auth signIn', { oauthClientId, redirectUri, scopes });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(oauthClientId)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&include_granted_scopes=true&prompt=consent`;

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!redirectResponse) {
          reject(new Error('No redirect response from auth flow'));
          return;
        }

        const hashIndex = redirectResponse.indexOf('#');
        const fragment = hashIndex >= 0 ? redirectResponse.substring(hashIndex + 1) : '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        const scope = params.get('scope');

        if (!accessToken) {
          reject(new Error('No access_token returned from OAuth'));
          return;
        }

        const obtainedAt = Date.now();
        const expiresAt = expiresIn ? obtainedAt + parseInt(expiresIn, 10) * 1000 : null;

        const record = { access_token: accessToken, scope, obtained_at: obtainedAt, expires_at: expiresAt };

        chrome.storage.local.set({ google_oauth: record }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          chrome.runtime.sendMessage({ type: 'auth:connected', success: true });
          resolve(record);
        });
      });
    });
  },

  async signOut() {
    return new Promise((resolve) => {
      chrome.storage.local.remove('google_oauth', () => resolve());
    });
  },

  async getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get('google_oauth', (items) => resolve(items.google_oauth || null));
    });
  }
};

export default Auth;
