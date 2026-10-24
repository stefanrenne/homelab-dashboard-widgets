// Suwayomi: its GraphQL API (POST /api/graphql). The whole library: a chapter count per
// condition in one query. A category: its manga's chapters, counted here.

const COUNTS = {
  download: (c) => c.isDownloaded,
  nondownload: (c) => !c.isDownloaded,
  read: (c) => c.isRead,
  unread: (c) => !c.isRead,
  downloadedread: (c) => c.isDownloaded && c.isRead,
  downloadedunread: (c) => c.isDownloaded && !c.isRead,
  nondownloadedread: (c) => !c.isDownloaded && c.isRead,
  nondownloadedunread: (c) => !c.isDownloaded && !c.isRead,
};
const GQL = {
  download: 'isDownloaded: true', nondownload: 'isDownloaded: false', read: 'isRead: true', unread: 'isRead: false',
  downloadedread: 'isDownloaded: true, isRead: true', downloadedunread: 'isDownloaded: true, isRead: false',
  nondownloadedread: 'isDownloaded: false, isRead: true', nondownloadedunread: 'isDownloaded: false, isRead: false',
};

export default {
  async fetch(ctx) {
    const { username, password, category } = ctx.options;
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const one = category !== undefined && category !== null && Number.isInteger(Number(category));
    const query = one
      ? { operationName: 'category', query: 'query category($id: Int!) { category(id: $id) { mangas { nodes { chapters { nodes { isRead isDownloaded } } } } } }', variables: { id: Number(category) } }
      : { operationName: 'Counts', query: `query Counts { ${Object.entries(GQL).map(([k, c]) => `${k}: chapters(condition: {${c}} filter: {inLibrary: {equalTo: true}}) { totalCount }`).join(' ')} }` };
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/graphql`, { method: 'POST', headers, body: JSON.stringify(query) });
    if (!res.ok) throw new Error(`Suwayomi answered ${res.status}`);
    const body = await res.json();
    if (body.errors?.length) throw new Error(`Suwayomi answered an error: ${String(body.errors[0].message).slice(0, 80)}`);
    let counts;
    if (one) {
      if (!body.data?.category) throw new Error(`no Suwayomi category ${category}`);
      const chapters = (body.data.category.mangas?.nodes ?? []).flatMap((m) => m.chapters?.nodes ?? []);
      counts = Object.fromEntries(Object.entries(COUNTS).map(([k, f]) => [k, chapters.filter(f).length]));
    } else {
      counts = Object.fromEntries(Object.keys(COUNTS).map((k) => [k, body.data?.[k]?.totalCount ?? 0]));
    }
    return { blocks: Object.keys(COUNTS).map((k) => ({ key: k, label: k, value: counts[k] })) };
  },
};
