// Komga: GET /api/v1/libraries (available ones), and the series and books totals from
// GET /api/v1/series and /books (`version: 2`: POST /series/list and /books/list with an empty
// search). Basic authentication with a user, or an API key in X-API-Key.

export default {
  async fetch(ctx) {
    const { username, password, key } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1`;
    const headers = { accept: 'application/json', 'content-type': 'application/json' };
    if (username && password) headers.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    else if (key) headers['x-api-key'] = key;
    const v2 = Number(ctx.options.version) === 2;
    const get = async (path, search = false) => {
      const res = search && v2
        ? await ctx.fetch(`${url}/${path}/list?size=1`, { method: 'POST', headers, body: '{}' })
        : await ctx.fetch(`${url}/${path}${search ? '?size=1' : ''}`, { headers });
      if (!res.ok) throw new Error(`Komga ${path} answered ${res.status}`);
      return res.json();
    };
    const [libraries, series, books] = await Promise.all([get('libraries'), get('series', true), get('books', true)]);
    return {
      blocks: [
        { key: 'libraries', label: 'libraries', value: (libraries ?? []).filter((l) => !l.unavailable).length },
        { key: 'series', label: 'series', value: series.totalElements ?? 0 },
        { key: 'books', label: 'books', value: books.totalElements ?? 0 },
      ],
    };
  },
};
