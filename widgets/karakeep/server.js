// Karakeep (formerly Hoarder): GET /api/v1/users/me/stats with an API key.

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/users/me/stats`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
    if (!res.ok) throw new Error(`Karakeep answered ${res.status}`);
    const s = await res.json();
    const n = (k) => Number(s[k]) || 0;
    return {
      blocks: [
        { key: 'bookmarks', label: 'bookmarks', value: n('numBookmarks') },
        { key: 'favorites', label: 'favorites', value: n('numFavorites') },
        { key: 'archived', label: 'archived', value: n('numArchived') },
        { key: 'highlights', label: 'highlights', value: n('numHighlights') },
        { key: 'lists', label: 'lists', value: n('numLists') },
        { key: 'tags', label: 'tags', value: n('numTags') },
      ],
    };
  },
};
