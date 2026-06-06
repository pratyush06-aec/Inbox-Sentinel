import Supabase from '../extension/services/supabase.js';

global.fetch = jest.fn();

describe('Supabase service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('insertEmail sends the correct REST request', async () => {
    const fakeUrl = 'https://example.supabase.co';
    const fakeKey = 'anon-key';
    Supabase.init({ url: fakeUrl, key: fakeKey });

    fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => [{ id: 'abc' }]
    });

    const email = {
      gmail_message_id: 'msg_123',
      sender: 'GitHub <noreply@github.com>',
      subject: 'Hello',
      snippet: 'Example snippet',
      category: 'Promotions',
      received_at: '2026-06-06T12:00:00Z'
    };

    const result = await Supabase.insertEmail(email);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(`${fakeUrl}/rest/v1/emails`, {
      method: 'POST',
      headers: {
        apikey: fakeKey,
        Authorization: `Bearer ${fakeKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify([email])
    });
    expect(result).toEqual([{ id: 'abc' }]);
  });

  test('markImportantByGmailId sends PATCH request', async () => {
    const fakeUrl = 'https://example.supabase.co';
    const fakeKey = 'anon-key';
    Supabase.init({ url: fakeUrl, key: fakeKey });

    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 'abc' }]
    });

    const result = await Supabase.markImportantByGmailId('msg_123', true);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `${fakeUrl}/rest/v1/emails?gmail_message_id=eq.msg_123`,
      {
        method: 'PATCH',
        headers: {
          apikey: fakeKey,
          Authorization: `Bearer ${fakeKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ is_important: true })
      }
    );
    expect(result).toEqual([{ id: 'abc' }]);
  });
});
