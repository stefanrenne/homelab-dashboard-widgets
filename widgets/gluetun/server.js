// Gluetun's control server: GET /v1/publicip/ip, and the forwarded port from
// /v1/openvpn/portforwarded (or /v1/portforward from 3.40.1, `version: 2`). An API key goes in
// X-API-Key. The port is left empty when its route is not allowed or forwarding is off.

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const headers = { accept: 'application/json' };
    if (ctx.options.key) headers['x-api-key'] = ctx.options.key;
    const portPath = Number(ctx.options.version) > 1 ? 'portforward' : 'openvpn/portforwarded';
    const [ipRes, portRes] = await Promise.all([ctx.fetch(`${url}/v1/publicip/ip`, { headers }), ctx.fetch(`${url}/v1/${portPath}`, { headers }).catch(() => null)]);
    if (!ipRes.ok) throw new Error(`Gluetun answered ${ipRes.status}`);
    const ip = await ipRes.json();
    const port = portRes?.ok ? (await portRes.json()).port : null;
    return {
      blocks: [
        { key: 'public_ip', label: 'public_ip', value: ip.public_ip || null },
        { key: 'region', label: 'region', value: ip.region || null },
        { key: 'country', label: 'country', value: ip.country || null },
        { key: 'port_forwarded', label: 'port_forwarded', value: port || null },
      ],
    };
  },
};
