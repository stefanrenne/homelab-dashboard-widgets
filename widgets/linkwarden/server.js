// Linkwarden: GET /api/v1/collections (links counted per collection) and /api/v1/tags with an
// access token. Both answers are lists, wrapped in { response } (tags also { data: { tags } }).

const list = (body) => [body?.response, body?.data?.tags, body].find(Array.isArray) ?? [];

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Linkwarden ${path} answered ${res.status}`);
      return list(await res.json());
    };
    const [collections, tags] = await Promise.all([get('collections'), get('tags')]);
    return {
      blocks: [
        { key: 'links', label: 'links', value: collections.reduce((s, c) => s + (c._count?.links ?? 0), 0) },
        { key: 'collections', label: 'collections', value: collections.length },
        { key: 'tags', label: 'tags', value: tags.length },
      ],
    };
  },
};
