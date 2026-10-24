// Tandoor Recipes: GET /api/space/ (users and recipes of the space) and /api/keyword/ (its
// count) with an API token.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}/`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Tandoor ${path} answered ${res.status}`);
      return res.json();
    };
    const [space, keywords] = await Promise.all([get('space'), get('keyword')]);
    const s = Array.isArray(space) ? space[0] : space?.results?.[0];
    return {
      blocks: [
        { key: 'users', label: 'users', value: s?.user_count ?? null },
        { key: 'recipes', label: 'recipes', value: s?.recipe_count ?? null },
        { key: 'keywords', label: 'keywords', value: keywords?.count ?? (Array.isArray(keywords) ? keywords.length : null) },
      ],
    };
  },
};
