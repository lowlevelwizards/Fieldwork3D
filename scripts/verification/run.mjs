import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {root, filesFor, testFiles, featureNames, affectedFeatures, readBaseline} from './suites.mjs';
import {assessResults} from './baseline.mjs';

const suite = process.argv[2] ?? 'core';
let selected = process.argv.slice(3);
if (suite === 'feature' && !selected.length) selected = featureNames;
if (suite === 'feature' && selected[0] === '--changed') {
  const base = selected[1];
  if (!base) throw Error('Supply a base commit for --changed');
  const diff = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], {cwd:root,encoding:'utf8'});
  if (diff.status !== 0) throw Error(diff.stderr);
  selected = affectedFeatures(diff.stdout.trim().split('\n').filter(Boolean));
}
const files = filesFor(suite, suite === 'feature' ? selected : undefined);
for (const file of files) if (!testFiles().includes(file)) throw Error(`Suite references a missing test: ${file}`);
if (!files.length) { console.log('No affected feature tests; core and browser checks still apply.'); process.exit(0); }
const reportDir = path.join(root, 'reports', suite);
mkdirSync(reportDir, {recursive:true});
const resultFile = path.join(reportDir, 'results.ndjson');
const started = new Date();
const run = spawnSync(process.execPath, [
  '--max-old-space-size=1024', '--experimental-strip-types', '--test', '--test-concurrency=4', '--test-timeout=180000',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=./scripts/verification/reporter.mjs', `--test-reporter-destination=${resultFile}`,
  ...files,
], {cwd:root,stdio:'inherit'});
let events;
try { events = readFileSync(resultFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); }
catch (error) { throw Error(`Missing or corrupt test report: ${error.message}`); }
const summary = events.findLast(e => e.type === 'test:summary' && e.file === undefined);
const results = events.filter(e => e.type === 'test:pass' || e.type === 'test:fail');
const baselineMode = suite === 'baseline' || suite === 'feature';
const assessment = baselineMode ? assessResults(results, readBaseline(), files) : {errors:[],known:0};
if (!summary || run.signal || run.error || summary.counts?.cancelled || !results.length ||
    ![0,1].includes(run.status)) assessment.errors.push('Test run did not complete normally.');
if (!baselineMode && (run.status !== 0 || results.some(e => e.type === 'test:fail' || e.skip || e.todo)))
  assessment.errors.push('Strict verification requires every selected test to pass, with no skips/TODOs.');
const report = {
  suite, selected, node:process.version, commit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),
  startedAt:started.toISOString(), durationMs:Date.now()-started.getTime(), files:files.length,
  counts:summary?.counts, knownFailures:assessment.known, errors:assessment.errors,
  slowest:results.toSorted((a,b)=>b.durationMs-a.durationMs).slice(0,15).map(({file,name,durationMs})=>({file,name,durationMs})),
};
writeFileSync(path.join(reportDir,'summary.json'), JSON.stringify(report,null,2)+'\n');
const text = `### ${suite} verification\n\n${JSON.stringify(report.counts)}\n\n` +
  (baselineMode ? `${assessment.known} explicitly tracked existing failures (all cases executed).\n\n` : '') +
  assessment.errors.map(e=>`- ${e}`).join('\n');
writeFileSync(path.join(reportDir,'summary.md'), text+'\n');
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY,text+'\n',{flag:'a'});
console.log(text);
process.exitCode = assessment.errors.length ? 1 : 0;
