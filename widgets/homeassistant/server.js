// Home Assistant: by default people at home, lights on and switches on, counted over one
// GET /api/states. With `custom` (homepage's form) up to four entries instead: a state
// (GET /api/states/<entity_id>; label and value may name attributes in braces) or a template
// (POST /api/template). homepage leaves custom out when `fields` is set; the dashboard keeps
// `fields` to itself, so here custom simply wins.

const ENTITY = /^[a-z0-9_]+\.[a-z0-9_]+$/;

/** homepage's "{attributes.friendly_name}" placeholders, filled from a state object. */
export function fill(text, data) {
  return String(text).replace(/\{([^{}]*)\}/g, (_, path) => {
    const v = path.split('.').reduce((o, p) => (o == null ? undefined : o[p]), data);
    return v == null ? '' : String(v);
  }).trim();
}

const counted = (states, domain, on) => {
  const all = states.filter((s) => s.entity_id?.startsWith(`${domain}.`));
  return `${all.filter((s) => s.state === on).length} / ${all.length}`;
};

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = o.url.replace(/\/+$/, '');
    const headers = { authorization: `Bearer ${o.key}`, accept: 'application/json', 'content-type': 'application/json' };
    const call = async (path, init = {}) => {
      const res = await ctx.fetch(`${url}${path}`, { headers, ...init });
      if (!res.ok) throw new Error(`Home Assistant ${path.split('/').slice(0, 3).join('/')} answered ${res.status}`);
      return res;
    };
    let custom = o.custom;
    if (typeof custom === 'string') custom = JSON.parse(custom);
    if (!Array.isArray(custom) || custom.length === 0) {
      const states = await (await call('/api/states')).json();
      return {
        blocks: [
          { key: 'people_home', label: 'people_home', value: counted(states, 'person', 'home') },
          { key: 'lights_on', label: 'lights_on', value: counted(states, 'light', 'on') },
          { key: 'switches_on', label: 'switches_on', value: counted(states, 'switch', 'on') },
        ],
      };
    }
    const blocks = await Promise.all(custom.slice(0, 4).map(async (q, i) => {
      const key = `custom${i + 1}`;
      if (q?.state) {
        if (!ENTITY.test(q.state)) throw new Error(`custom[${i}].state: an entity id like sensor.power`);
        const data = await (await call(`/api/states/${q.state}`)).json();
        return { key, label: fill(q.label ?? '{attributes.friendly_name}', data), value: fill(q.value ?? '{state} {attributes.unit_of_measurement}', data) };
      }
      if (q?.template) {
        const text = await (await call('/api/template', { method: 'POST', body: JSON.stringify({ template: String(q.template) }) })).text();
        return { key, label: String(q.label ?? ''), value: text.trim() };
      }
      throw new Error(`custom[${i}]: needs state or template`);
    }));
    return { blocks };
  },
};
