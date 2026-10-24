// Paperless-ngx: GET /api/statistics/ with an API token or a login. Documents in the inbox wait
// for you: marked.

export default {
  async fetch(ctx) {
    const { url, key, username, password } = ctx.options;
    const headers = { accept: 'application/json' };
    if (key) headers.authorization = `Token ${key}`;
    else if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/api/statistics/?format=json`, { headers });
    if (!res.ok) throw new Error(`Paperless-ngx statistics answered ${res.status}`);
    const s = await res.json();
    const blocks = [];
    // without an inbox tag Paperless-ngx leaves documents_inbox out
    if (s.documents_inbox !== undefined && s.documents_inbox !== null) {
      blocks.push({ key: 'inbox', label: 'inbox', value: s.documents_inbox, ...(s.documents_inbox > 0 ? { status: 'warn' } : {}) });
    }
    blocks.push({ key: 'total', label: 'total', value: s.documents_total ?? null });
    return { blocks };
  },
};
