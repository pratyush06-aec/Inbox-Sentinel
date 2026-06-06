// Gmail API wrapper for Inbox Sentinel
const CATEGORY_QUERY = 'category:promotions OR category:social OR category:updates';

const GmailService = {
  async listCategoryMessages(accessToken, maxResults = 20) {
    if (!accessToken) throw new Error('Access token required');

    const listUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
      CATEGORY_QUERY
    )}&maxResults=${maxResults}`;

    const listResp = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!listResp.ok) {
      const text = await listResp.text();
      throw new Error('Gmail list error: ' + text);
    }

    const listJson = await listResp.json();
    const messages = listJson.messages || [];

    const results = [];
    for (const m of messages) {
      try {
        const meta = await GmailService.getMessageMetadata(accessToken, m.id);
        results.push(meta);
      } catch (err) {
        console.warn('Failed to get metadata for', m.id, err);
      }
    }

    return results;
  },

  async getMessageMetadata(accessToken, messageId) {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error('Gmail get error: ' + text);
    }

    const json = await resp.json();
    const headers = json.payload && json.payload.headers ? json.payload.headers : [];
    const headerMap = {};
    for (const h of headers) headerMap[h.name] = h.value;
    const from = headerMap['From'] || '';
    const subject = headerMap['Subject'] || '';
    const date = headerMap['Date'] || '';
    const snippet = json.snippet || '';

    let category = null;
    if (json.labelIds && Array.isArray(json.labelIds)) {
      for (const lbl of json.labelIds) {
        if (lbl === 'CATEGORY_PROMOTIONS') { category = 'Promotions'; break; }
        if (lbl === 'CATEGORY_SOCIAL') { category = 'Social'; break; }
        if (lbl === 'CATEGORY_UPDATES') { category = 'Updates'; break; }
      }
    }
    if (!category) category = 'Promotions';

    return {
      id: json.id,
      gmail_message_id: json.id,
      sender: from,
      subject,
      snippet,
      category,
      received_at: date
    };
  },

  async getProfile(accessToken) {
    const url = 'https://www.googleapis.com/gmail/v1/users/me/profile';
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error('Gmail profile error: ' + text);
    }
    return resp.json();
  }
};

export default GmailService;
