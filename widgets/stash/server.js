// Stash: library counts through its GraphQL API.

const QUERY = '{ stats { scene_count image_count gallery_count performer_count studio_count tag_count } }';

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/graphql`;
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (ctx.options.key) headers.ApiKey = ctx.options.key;
    const res = await ctx.fetch(url, { method: 'POST', headers, body: JSON.stringify({ query: QUERY }) });
    if (!res.ok) throw new Error(`Stash answered ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`Stash: ${json.errors[0].message}`);
    const s = json.data?.stats ?? {};
    const block = (key, field) => ({ key, label: key, value: s[field] ?? null });
    return {
      blocks: [
        block('scenes', 'scene_count'),
        block('images', 'image_count'),
        block('galleries', 'gallery_count'),
        block('performers', 'performer_count'),
        block('studios', 'studio_count'),
        block('tags', 'tag_count'),
      ],
    };
  },
};
