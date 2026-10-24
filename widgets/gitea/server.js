// Gitea (and Forgejo): counts from the X-Total-Count header of searches with limit=1, so no
// paging is needed. Unread notifications are marked.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1`;
    const count = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Gitea ${path.split('?')[0]} answered ${res.status}`);
      const n = Number.parseInt(res.headers.get('x-total-count'), 10);
      return Number.isNaN(n) ? null : n;
    };
    const [notifications, issues, pulls, repositories] = await Promise.all([
      count('notifications?limit=1'),
      count('repos/issues/search?type=issues&state=open&limit=1'),
      count('repos/issues/search?type=pulls&state=open&limit=1'),
      count('repos/search?limit=1'),
    ]);
    return {
      blocks: [
        { key: 'notifications', label: 'notifications', value: notifications, ...(notifications > 0 ? { status: 'warn' } : {}) },
        { key: 'issues', label: 'issues', value: issues },
        { key: 'pulls', label: 'pulls', value: pulls },
        { key: 'repositories', label: 'repositories', value: repositories },
      ],
    };
  },
};
