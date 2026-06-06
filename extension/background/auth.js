// OAuth helper for Inbox Sentinel using chrome.identity.launchWebAuthFlow
// Stores token in chrome.storage.local under key `google_oauth`.

const Auth = {
  async signIn() {
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2 && manifest.oauth2.client_id;
    if (!clientId) throw new Error('OAuth client_id not set in manifest');

    const scopes = (manifest.oauth2 && manifest.oauth2.scopes) || [];
    const redirectUri = chrome.identity.getRedirectURL();

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&response_type=token&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes.join(' '))}&include_granted_scopes=true&prompt=consent`;

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

        // Extract fragment params (access_token etc.) from redirectResponse
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
