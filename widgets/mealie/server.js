// Mealie: GET /api/groups/statistics (version 1) or /api/households/statistics (Mealie 2+), with
// an API token.

export default {
  async fetch(ctx) {
    const path = Number(ctx.options.version) >= 2 ? 'households/statistics' : 'groups/statistics';
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
    if (!res.ok) throw new Error(`Mealie answered ${res.status}`);
    const s = await res.json();
    return {
      blocks: [
        { key: 'recipes', label: 'recipes', value: s.totalRecipes ?? 0 },
        { key: 'users', label: 'users', value: s.totalUsers ?? 0 },
        { key: 'categories', label: 'categories', value: s.totalCategories ?? 0 },
        { key: 'tags', label: 'tags', value: s.totalTags ?? 0 },
      ],
    };
  },
};
