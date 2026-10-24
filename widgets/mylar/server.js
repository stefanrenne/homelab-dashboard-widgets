// Mylar3: GET /api?cmd=seriesjsonListing, getIndex and getWanted with the API key in the query.
// Wanted issues are marked.

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const get = async (cmd) => {
      const res = await ctx.fetch(`${url}/api?${new URLSearchParams({ cmd, apikey: ctx.options.key })}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`Mylar3 ${cmd} answered ${res.status}`);
      const body = await res.json();
      if (body?.success === false) throw new Error(`Mylar3 ${cmd} answered 401`);
      return body;
    };
    const [series, issues, wanted] = await Promise.all([get('seriesjsonListing'), get('getIndex'), get('getWanted')]);
    const want = (wanted.issues ?? []).length;
    return {
      blocks: [
        { key: 'series', label: 'series', value: (series.data ?? []).length },
        { key: 'issues', label: 'issues', value: (issues.data ?? []).reduce((s, x) => s + (Number(x.totalIssues) || 0), 0) },
        { key: 'wanted', label: 'wanted', value: want, ...(want ? { status: 'warn' } : {}) },
      ],
    };
  },
};
