#!/usr/bin/env node
// Fieldwork3D external queue drain; dry run unless --apply is given.
// Execute with Node 22 and GH_TOKEN/GITHUB_TOKEN (Actions:write) or gh auth login.
import { spawnSync } from 'node:child_process';
const repo = 'lowlevelwizards/Fieldwork3D';
const branches = [
  'feature/secondary-s5-s11-closeout-20261120',
  'feature/movement-reliability-r1-20261120',
  'feature/movement-reliability-r1b-20261120',
];
const apply = process.argv.includes('--apply');
const options = process.argv.slice(2);
if (options.some(x => x !== '--apply' && !/^--limit=\d+$/.test(x))) throw Error('Only --apply and --limit=N supported');
const limitOption = options.find(x => x.startsWith('--limit='));
const limit = limitOption ? Number(limitOption.split('=')[1]) : 850;
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 850) throw Error('--limit must be 1..850');
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  const r = spawnSync('gh', ['auth', 'token'], {encoding:'utf8'});
  if (r.status === 0) token = r.stdout.trim();
}
if (!token) throw Error('Use gh auth login or supply GH_TOKEN with Actions:write');
const base = 'https://api.github.com/repos/' + repo;
async function api(path, method = 'GET') {
  const r = await fetch(base + path, {method, headers:{
    Authorization:'Bearer ' + token,
    Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'fieldwork-guarded-pr-queue-drain'
  }});
  if (!r.ok) {
    const e = Error('GitHub ' + method + ' ' + path + ': HTTP ' + r.status);
    e.status = r.status;
    throw e;
  }
  return method === 'GET' ? r.json() : null;
}
async function head(branch) {
  return (await api('/branches/' + encodeURIComponent(branch))).commit.sha;
}
function stale(run, sha) {
  return run.status === 'queued' && run.event === 'pull_request' &&
    branches.includes(run.head_branch) && run.head_branch !== 'main' &&
    run.name !== 'Deploy Fieldwork Ground Zero' && Boolean(sha) &&
    Boolean(run.head_sha) && run.head_sha !== sha;
}
const heads = new Map();
for (const b of branches) heads.set(b, await head(b));
const queued = [];
for (let page = 1; page <= 10; page++) {
  const r = await api('/actions/runs?status=queued&per_page=100&page=' + page);
  queued.push(...r.workflow_runs);
  if (r.workflow_runs.length < 100) break;
}
const candidates = queued.filter(r => stale(r, heads.get(r.head_branch)));
console.log(JSON.stringify({mode:apply?'apply':'dry-run', scanned:queued.length,
  candidates:candidates.length, protected:queued.length-candidates.length,
  branches:Object.fromEntries(branches.map(b => [b,{
    stale:candidates.filter(r => r.head_branch === b).length,
    latest:queued.filter(r => r.head_branch === b && r.head_sha === heads.get(b)).length
  }]))}, null, 2));
if (!apply) process.exit(0);
let canceled = 0, skipped = 0, finished = 0;
for (const item of candidates.slice(0, limit)) {
  try {
    // Recheck BOTH current run status and branch SHA before every mutation.
    const [run, sha] = await Promise.all([api('/actions/runs/' + item.id), head(item.head_branch)]);
    if (!stale(run, sha)) {skipped++; continue;}
    await api('/actions/runs/' + item.id + '/cancel', 'POST');
    canceled++;
  } catch (e) {
    if ([404,409,422].includes(e.status)) finished++;
    else {console.error(String(e)); process.exitCode = 1; break;}
  }
  await new Promise(resolve => setTimeout(resolve, 650));
}
console.log(JSON.stringify({canceled, skipped, finished, limitedTo:limit}, null, 2));
