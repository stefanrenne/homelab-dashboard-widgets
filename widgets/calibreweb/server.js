// Calibre-Web (0.6.21 or later): GET /opds/stats with the login (basic authentication).

export default {
  async fetch(ctx) {
    const { url, username, password } = ctx.options;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/opds/stats`, {
      headers: { accept: 'application/json', authorization: `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}` },
    });
    if (!res.ok) throw new Error(`Calibre-Web answered ${res.status}`);
    const s = await res.json();
    return {
      blocks: [
        { key: 'books', label: 'books', value: s.books ?? null },
        { key: 'authors', label: 'authors', value: s.authors ?? null },
        { key: 'categories', label: 'categories', value: s.categories ?? null },
        { key: 'series', label: 'series', value: s.series ?? null },
      ],
    };
  },
};
