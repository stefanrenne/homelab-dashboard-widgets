// LubeLogger 1.3.7+: GET /api/vehicle/info (Basic authentication when it is on). All vehicles,
// or with vehicleID one, with its next reminder's due date. Urgent reminders are marked, very
// urgent and past due ones as an error.

export default {
  async fetch(ctx) {
    const { username, password, vehicleID } = ctx.options;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/vehicle/info`, { headers });
    if (!res.ok) throw new Error(`LubeLogger answered ${res.status}`);
    let vehicles = await res.json();
    if (!Array.isArray(vehicles)) vehicles = [];
    if (vehicleID !== undefined && vehicleID !== null) {
      vehicles = vehicles.filter((v) => Number(v.vehicleData?.id) === Number(vehicleID));
      if (!vehicles.length) throw new Error(`no LubeLogger vehicle ${vehicleID}`);
    }
    const sum = (k) => vehicles.reduce((s, v) => s + (Number(v[k]) || 0), 0);
    const veryUrgent = sum('veryUrgentReminderCount') + sum('pastDueReminderCount');
    const urgent = sum('urgentReminderCount');
    const reminders = veryUrgent + urgent + sum('notUrgentReminderCount');
    const remindersBlock = { key: 'reminders', label: 'reminders', value: reminders, ...(veryUrgent ? { status: 'error' } : urgent ? { status: 'warn' } : {}) };
    const records = { key: 'serviceRecords', label: 'serviceRecords', value: sum('serviceRecordCount') };
    if (vehicleID === undefined || vehicleID === null) {
      return { blocks: [{ key: 'vehicles', label: 'vehicles', value: vehicles.length }, records, remindersBlock] };
    }
    const v = vehicles[0];
    const due = v.nextReminder?.dueDate ? String(v.nextReminder.dueDate).slice(0, 10) : 'none';
    return {
      blocks: [
        { key: 'vehicle', label: 'vehicle', value: [v.vehicleData?.year, v.vehicleData?.make, v.vehicleData?.model].filter(Boolean).join(' ') || null },
        records,
        remindersBlock,
        { key: 'nextReminder', label: 'nextReminder', value: due },
      ],
    };
  },
};
