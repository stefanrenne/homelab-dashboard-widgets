// Arcane: container and image counts and the image update summary of one environment.
// Images with an update are marked.

export default {
  async fetch(ctx) {
    const { url, key, env } = ctx.options;
    if (!/^[\w-]+$/.test(String(env))) throw new Error('env: an environment id');
    const base = `${url.replace(/\/+$/, '')}/api/environments/${env}`;
    const get = async (path) => {
      const res = await ctx.fetch(`${base}/${path}`, { headers: { accept: 'application/json', 'X-API-Key': key } });
      if (!res.ok) throw new Error(`Arcane ${path} answered ${res.status}`);
      return (await res.json()).data ?? {};
    };
    const [c, i, u] = await Promise.all([get('containers/counts'), get('images/counts'), get('image-updates/summary')]);
    const updates = u.imagesWithUpdates ?? 0;
    return {
      blocks: [
        { key: 'running', label: 'running', value: c.runningContainers ?? 0 },
        { key: 'stopped', label: 'stopped', value: c.stoppedContainers ?? 0 },
        { key: 'total', label: 'total', value: c.totalContainers ?? 0 },
        { key: 'images', label: 'images', value: i.totalImages ?? 0 },
        { key: 'images_used', label: 'images_used', value: i.imagesInuse ?? 0 },
        { key: 'images_unused', label: 'images_unused', value: i.imagesUnused ?? 0 },
        { key: 'image_updates', label: 'updates', value: updates, ...(updates > 0 ? { status: 'warn' } : {}) },
      ],
    };
  },
};
