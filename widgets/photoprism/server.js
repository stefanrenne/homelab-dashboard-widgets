// PhotoPrism: POST /api/v1/session (with a user, or an app password as Bearer and authToken)
// answers the client config, whose `count` holds the totals.

export default {
  async fetch(ctx) {
    const { username, password, key } = ctx.options;
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    let body = '{}';
    if (username && password) body = JSON.stringify({ username, password });
    else if (key) {
      headers.authorization = `Bearer ${key}`;
      body = JSON.stringify({ authToken: key });
    }
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/session`, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`PhotoPrism answered ${res.status}`);
    const c = (await res.json()).config?.count ?? {};
    return {
      blocks: [
        { key: 'albums', label: 'albums', value: c.albums ?? 0 },
        { key: 'photos', label: 'photos', value: c.photos ?? 0 },
        { key: 'videos', label: 'videos', value: c.videos ?? 0 },
        { key: 'people', label: 'people', value: c.people ?? 0 },
      ],
    };
  },
};
