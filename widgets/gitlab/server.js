// GitLab: GET /api/v4/users/<id>/associations_count with a personal access token (PRIVATE-TOKEN).

export default {
  async fetch(ctx) {
    const id = String(ctx.options.user_id ?? '');
    if (!/^\d+$/.test(id)) throw new Error('user_id: the number on your GitLab profile');
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v4/users/${id}/associations_count`, { headers: { accept: 'application/json', 'private-token': ctx.options.key } });
    if (!res.ok) throw new Error(`GitLab answered ${res.status}`);
    const c = await res.json();
    return {
      blocks: [
        { key: 'groups', label: 'groups', value: c.groups_count ?? 0 },
        { key: 'issues', label: 'issues', value: c.issues_count ?? 0 },
        { key: 'merges', label: 'merges', value: c.merge_requests_count ?? 0 },
        { key: 'projects', label: 'projects', value: c.projects_count ?? 0 },
      ],
    };
  },
};
