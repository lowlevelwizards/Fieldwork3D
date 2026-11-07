export const caseId = result => `${result.file} :: ${result.name}`;
export function assessResults(results, baseline, files, now = new Date()) {
  const errors = [];
  const expected = new Map();
  for (const entry of baseline.failures) {
    if (expected.has(entry.id)) errors.push(`Duplicate baseline entry: ${entry.id}`);
    expected.set(entry.id, entry);
    if (!entry.reason || !entry.owner || !entry.category || !entry.nextAction || !entry.expires)
      errors.push(`Incomplete disposition: ${entry.id}`);
    if (files.includes(entry.file) && (!Number.isFinite(Date.parse(entry.expires)) || new Date(entry.expires) < now))
      errors.push(`Expired failure disposition: ${entry.id}`);
  }
  const observed = new Set();
  let known = 0;
  for (const result of results) {
    if (result.testType === 'suite') continue;
    const id = caseId(result);
    if (result.type === 'test:fail' && result.name === result.file)
      errors.push(`Test worker failed before reporting cases: ${result.file}`);
    if (observed.has(id)) errors.push(`Ambiguous duplicate test name: ${id}`);
    observed.add(id);
    const entry = expected.get(id);
    if (result.skip || result.todo) errors.push(`Skipped/TODO test requires explicit repair: ${id}`);
    if (result.type === 'test:fail') {
      if (!entry) errors.push(`NEW FAILURE: ${id}\n${result.signature}`);
      else if (entry.signature !== result.signature) errors.push(`CHANGED FAILURE: ${id}\n${result.signature}`);
      else known++;
    } else if (entry) errors.push(`RESOLVED: remove the obsolete baseline entry: ${id}`);
  }
  for (const entry of baseline.failures) {
    if (files.includes(entry.file) && !observed.has(entry.id)) errors.push(`Missing/renamed baseline case: ${entry.id}`);
  }
  return {errors, known, passed:results.filter(r => r.type === 'test:pass' && r.testType !== 'suite').length};
}
