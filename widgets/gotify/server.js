// Gotify: GET /application, /client and /message with a client token in X-Gotify-Key. Gotify
// gives no total of messages: the widget counts a page of at most 200 (homepage: 100).

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', 'x-gotify-key': ctx.options.key } });
      if (!res.ok) throw new Error(`Gotify ${path} answered ${res.status}`);
      return res.json();
    };
    const [apps, clients, messages] = await Promise.all([get('application'), get('client'), get('message?limit=200')]);
    return {
      blocks: [
        { key: 'apps', label: 'apps', value: (apps ?? []).length },
        { key: 'clients', label: 'clients', value: (clients ?? []).length },
        { key: 'messages', label: 'messages', value: messages?.messages?.length ?? 0 },
      ],
    };
  },
};
