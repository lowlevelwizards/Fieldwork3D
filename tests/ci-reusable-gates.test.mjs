import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
const ci=workflow('ci.yml');
const architecture=workflow('architecture-refactor-critical.yml');
const browser=workflow('closeout-stage6-browser.yml');

function job(yaml,name){
 const lines=yaml.split('\n');
 const start=lines.indexOf('  '+name+':');
 assert.ok(start>=0,'Missing workflow job '+name);
 const next=lines.findIndex((line,i)=>i>start&&/^  [\w-]+:$/.test(line));
 return lines.slice(start,next<0?lines.length:next).join('\n');
}
const prefixes=body=>[...body.matchAll(/startsWith\(github\.head_ref, '([^']+)'\)/g)]
 .map(match=>match[1]).sort();
const jobGuard=(yaml,name)=>job(yaml,name).split('\n').find(line=>/^    if: /.test(line))||'';

test('specialist acceptance can be called or dispatched but cannot create separate PR runs',()=>{
 for(const [name,source] of [['architecture',architecture],['browser',browser]]){
  const header=source.split('\njobs:')[0];
  assert.match(header,/^on:\n  workflow_call:\n  workflow_dispatch:/m,name);
  assert.doesNotMatch(header,/^  pull_request:/m,name);
 }
 assert.match(ci,/^on:\n  pull_request:/m);
});

test('CI dispatches each specialist exactly once through its reusable workflow',()=>{
 const arch=job(ci,'architecture-integration');
 const visual=job(ci,'browser-acceptance');
 assert.match(arch,/uses: \.\/\.github\/workflows\/architecture-refactor-critical\.yml/);
 assert.match(visual,/uses: \.\/\.github\/workflows\/closeout-stage6-browser\.yml/);
 assert.match(arch,/github\.event_name == 'pull_request'/);
 assert.match(visual,/github\.event_name == 'pull_request'/);
 assert.equal((ci.match(/uses: \.\/\.github\/workflows\/architecture-refactor-critical\.yml/g)||[]).length,1);
 assert.equal((ci.match(/uses: \.\/\.github\/workflows\/closeout-stage6-browser\.yml/g)||[]).length,1);
});

test('the caller preserves all historical architecture and browser branch guards',()=>{
 assert.deepEqual(prefixes(jobGuard(ci,'architecture-integration')),prefixes(jobGuard(architecture,'critical')));
 assert.deepEqual(prefixes(jobGuard(ci,'browser-acceptance')),prefixes(jobGuard(browser,'tactical-flow')));
 assert.deepEqual(prefixes(jobGuard(ci,'browser-acceptance')),prefixes(jobGuard(browser,'replay-and-lab')));
});

test('manual forensic and WebGL acceptance remain available',()=>{
 assert.match(architecture,/workflow_dispatch:/);
 assert.match(architecture,/breach-critical-suite\.mjs/);
 assert.match(architecture,/audit-pages-release-checkpoint\.mjs/);
 assert.match(browser,/workflow_dispatch:/);
 for(const script of ['smoke-closeout-stage6.mjs','smoke-replay-r43b-bodycam-ui.mjs',
  'smoke-operator-lab-unified.mjs'])assert.ok(browser.includes(script),script);
});
