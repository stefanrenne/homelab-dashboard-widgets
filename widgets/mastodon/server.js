// Mastodon: GET /api/v1/instance, public, no key.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/instance`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Mastodon answered ${res.status}`);
    const s = (await res.json()).stats ?? {};
    return {
      blocks: [
        { key: 'user_count', label: 'user_count', value: s.user_count ?? 0 },
        { key: 'status_count', label: 'status_count', value: s.status_count ?? 0 },
        { key: 'domain_count', label: 'domain_count', value: s.domain_count ?? 0 },
      ],
    };
  },
};
