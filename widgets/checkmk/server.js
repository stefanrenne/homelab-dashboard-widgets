// Checkmk: the REST API's service and host collections, filtered on state != 0 (not OK / not
// up), with an automation user. Both counts are marked when there are any.

export default {
  async fetch(ctx) {
    const { url, site, username, password } = ctx.options;
    if (!/^[\w-]+$/.test(site)) throw new Error('site: the Checkmk site name');
    const base = `${url.replace(/\/+$/, '')}/${site}/check_mk/api/1.0/domain-types`;
    const query = new URLSearchParams({ columns: 'state', query: '{"op": "!=", "left": "state", "right": "0"}' });
    const count = async (kind) => {
      const res = await ctx.fetch(`${base}/${kind}/collections/all?${query}`, { headers: { accept: 'application/json', authorization: `Bearer ${username} ${password}` } });
      if (!res.ok) throw new Error(`Checkmk ${kind}s answered ${res.status}`);
      return ((await res.json()).value ?? []).length;
    };
    const [services, hosts] = await Promise.all([count('service'), count('host')]);
    return {
      blocks: [
        { key: 'serviceErrors', label: 'serviceErrors', value: services, ...(services > 0 ? { status: 'warn' } : {}) },
        { key: 'hostErrors', label: 'hostErrors', value: hosts, ...(hosts > 0 ? { status: 'error' } : {}) },
      ],
    };
  },
};
