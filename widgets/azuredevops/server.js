// Azure DevOps: the latest build of a pipeline (its result, or its status while it runs) and,
// with repositoryId and userEmail, open pull requests: all, yours, and yours with an approval.
// A failed run is marked.

const RESULTS = { succeeded: 'succeeded', partiallySucceeded: 'partiallySucceeded', failed: 'failed', canceled: 'canceled' };
const STATUSES = { inProgress: 'inProgress', notStarted: 'notStarted', completed: 'completed', cancelling: 'canceled', postponed: 'notStarted' };

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const base = `${String(o.url).replace(/\/+$/, '')}/${encodeURIComponent(o.organization)}/${encodeURIComponent(o.project)}/_apis`;
    const get = async (path, query) => {
      const res = await ctx.fetch(`${base}/${path}?${new URLSearchParams({ ...query, 'api-version': '7.0' })}`, {
        headers: { accept: 'application/json', authorization: `Basic ${Buffer.from(`:${o.key}`).toString('base64')}` },
      });
      if (!res.ok) throw new Error(`Azure DevOps ${path.split('/')[0]} answered ${res.status}`);
      return res.json();
    };
    const blocks = [];
    if (o.definitionId) {
      const builds = await get('build/builds', { definitions: o.definitionId, $top: '1', ...(o.branchName ? { branchName: o.branchName } : {}) });
      const last = builds.value?.[0];
      if (last?.result) {
        const result = RESULTS[last.result] ?? last.result;
        blocks.push({ key: 'result', label: 'result', value: result, ...(result === 'failed' ? { status: 'error' } : result === 'partiallySucceeded' ? { status: 'warn' } : {}) });
      } else {
        blocks.push({ key: 'status', label: 'result', value: last ? STATUSES[last.status] ?? last.status : null });
      }
    }
    if (o.repositoryId && o.userEmail) {
      const prs = (await get(`git/repositories/${encodeURIComponent(o.repositoryId)}/pullrequests`, { 'searchCriteria.status': 'active' })).value ?? [];
      const mine = prs.filter((p) => String(p.createdBy?.uniqueName ?? '').toLowerCase() === String(o.userEmail).toLowerCase());
      blocks.push(
        { key: 'totalPrs', label: 'totalPrs', value: prs.length },
        { key: 'myPrs', label: 'myPrs', value: mine.length },
        // a vote of 10 is approved, 5 approved with suggestions
        { key: 'approved', label: 'approved', value: mine.filter((p) => (p.reviewers ?? []).some((r) => r.vote === 10 || r.vote === 5)).length },
      );
    }
    if (blocks.length === 0) throw new Error('Azure DevOps needs definitionId, or repositoryId and userEmail');
    return { blocks };
  },
};
