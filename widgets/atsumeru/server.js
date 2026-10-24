// Atsumeru: GET /api/server/info with the login (basic authentication).

export default {
  async fetch(ctx) {
    const { url, username, password } = ctx.options;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/api/server/info`, {
      headers: { accept: 'application/json', authorization: `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}` },
    });
    if (!res.ok) throw new Error(`Atsumeru answered ${res.status}`);
    const s = (await res.json()).stats ?? {};
    return {
      blocks: [
        { key: 'series', label: 'series', value: s.total_series ?? null },
        { key: 'archives', label: 'archives', value: s.total_archives ?? null },
        { key: 'chapters', label: 'chapters', value: s.total_chapters ?? null },
        { key: 'categories', label: 'categories', value: s.total_categories ?? null },
      ],
    };
  },
};
