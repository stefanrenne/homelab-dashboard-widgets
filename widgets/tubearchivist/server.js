// Tube Archivist 0.4.4+: GET /api/stats/download, video, channel and playlist with the token
// ("Token <key>").

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/stats`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}/`, { headers: { accept: 'application/json', authorization: `Token ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Tube Archivist ${path} answered ${res.status}`);
      const body = await res.json();
      if (body?.detail) throw new Error(`Tube Archivist answered 401 (${String(body.detail).slice(0, 60)})`);
      return body;
    };
    const [d, v, c, p] = await Promise.all(['download', 'video', 'channel', 'playlist'].map(get));
    return {
      blocks: [
        { key: 'downloads', label: 'downloads', value: d.pending ?? 0 },
        { key: 'videos', label: 'videos', value: v.doc_count ?? 0 },
        { key: 'channels', label: 'channels', value: c.doc_count ?? 0 },
        { key: 'playlists', label: 'playlists', value: p.doc_count ?? 0 },
      ],
    };
  },
};
