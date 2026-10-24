// Vikunja: GET /api/v1/projects and the open tasks by due date (/tasks/all before 1.0.0-rc4,
// /tasks from it), with an API token. Saved filters (negative IDs) are not projects. Overdue
// tasks are marked; with enableTaskList the next five tasks are rows with their due date.

const NO_DATE = '0001-01-01T00:00:00Z';
const WEEK = 7 * 86400_000;

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v1`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
      if (!res.ok) throw new Error(`Vikunja ${path.split('?')[0]} answered ${res.status}`);
      const body = await res.json();
      if (body?.message) throw new Error(`Vikunja answered 401 (${String(body.message).slice(0, 60)})`);
      return Array.isArray(body) ? body : [];
    };
    const tasksPath = Number(ctx.options.version) >= 2 ? 'tasks' : 'tasks/all';
    const [projects, tasks] = await Promise.all([get('projects'), get(`${tasksPath}?filter=done%3Dfalse&sort_by=due_date`)]);
    const now = Date.now();
    const due = (t) => (t.due_date && t.due_date !== NO_DATE ? Date.parse(t.due_date) : NaN);
    const dated = tasks.filter((t) => Number.isFinite(due(t)));
    const overdue = dated.filter((t) => due(t) <= now).length;
    const out = {
      blocks: [
        { key: 'projects', label: 'projects', value: projects.filter((p) => p.id > 0).length },
        { key: 'tasks7d', label: 'tasks7d', value: dated.filter((t) => due(t) <= now + WEEK).length },
        { key: 'tasksOverdue', label: 'tasksOverdue', value: overdue, ...(overdue ? { status: 'warn' } : {}) },
        { key: 'tasksInProgress', label: 'tasksInProgress', value: tasks.filter((t) => t.percent_done > 0 && t.percent_done < 1).length },
      ],
    };
    if (ctx.options.enableTaskList) {
      out.rows = tasks.slice(0, 5).map((t) => ({
        label: String(t.title ?? ''),
        ...(Number.isFinite(due(t)) ? { value: t.due_date.slice(0, 10), ...(due(t) <= now ? { status: 'warn' } : {}) } : {}),
      }));
    }
    return out;
  },
};
