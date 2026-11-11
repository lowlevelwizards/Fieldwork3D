import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {scanRepository,markdownReport} from '../scripts/verification/consolidation-inventory.mjs';

test('A0: entrypoint and fixture distinguish production, test, tooling and type references',()=>{
 const root=mkdtempSync(join(tmpdir(),'fieldwork-a0-'));
 const add=(name,body)=>{
  const path=join(root,name);
  mkdirSync(dirname(path),{recursive:true});writeFileSync(path,body);
 };
 try{
  add('index.html','<script type="module" src="./src/main.ts"></script>');
  add('src/main.ts',[
   "import {live} from './live.ts';",
   "import type {Identity} from './type-only.ts';",
   "new Worker(new URL('./worker.ts',import.meta.url));",
   "const query = new URLSearchParams(location.search).get('seed');",
   "const value: Identity = {id: live + String(query)};"
  ].join('\n'));
  add('src/live.ts','export const live = 1;');
  add('src/worker.ts','export const port = 2;');
  add('src/type-only.ts','export type Identity = {id:string};');
  add('src/test-only.ts','export const specOnly = true;');
  add('src/tool-only.ts','export const toolOnly = true;');
  add('src/not-referenced.ts','export const maybeDynamic = true;');
  add('src/first-cycle.ts',"import './second-cycle.ts'; export const a = 1;");
  add('src/second-cycle.ts',"import './first-cycle.ts'; export const b = 2;");
  add('src/storage.ts',"localStorage.getItem('fieldwork3d.campaign.v1');");
  add('tests/check.test.mjs',"import {specOnly} from '../src/test-only.ts';");
  add('scripts/analyze.mjs',"import '../src/tool-only.ts';");
  const x=scanRepository(root);
  assert.ok(x.classifications.runtime.includes('src/main.ts'));
  assert.ok(x.classifications.runtime.includes('src/live.ts'));
  assert.ok(x.classifications.runtime.includes('src/worker.ts'));
  assert.ok(x.classifications.typeReferenced.includes('src/type-only.ts'));
  assert.ok(x.classifications.testOnly.includes('src/test-only.ts'));
  assert.ok(x.classifications.toolOnly.includes('src/tool-only.ts'));
  assert.ok(x.classifications.unreferenced.includes('src/not-referenced.ts'));
  assert.ok(x.classifications.unreferenced.includes('src/first-cycle.ts'));
  assert.ok(x.queryFlags.some(v=>v.path==='src/main.ts'&&v.keys.includes('seed')));
  assert.ok(x.storageKeys.some(v=>v.path==='src/storage.ts'&&
   v.keys.includes('fieldwork3d.campaign.v1')));
  assert.match(markdownReport(x),/Review candidates \(NOT proven dead\)/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('A0: dependency cycles report only reachable production components',()=>{
 const root=mkdtempSync(join(tmpdir(),'fieldwork-a0-cycle-'));
 try{
  mkdirSync(join(root,'src'));
  writeFileSync(join(root,'index.html'),'<script type="module" src="./src/a.ts"></script>');
  writeFileSync(join(root,'src/a.ts'),"import './b.ts';");
  writeFileSync(join(root,'src/b.ts'),"import './a.ts';");
  const x=scanRepository(root);
  assert.deepEqual(x.cycles,[['src/a.ts','src/b.ts']]);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('A0: repository audit remains conservative and recognizes the real tactical entrypoint',()=>{
 const x=scanRepository();
 assert.ok(x.counts.source>850,'all Fieldwork source modules should be indexed');
 assert.ok(x.counts.tests>1200,'historical tests should be included');
 assert.ok(x.counts.workflows>30,'workflow census should include all current gates');
 assert.ok(x.roots.runtime.includes('index.html'));
 assert.ok(x.classifications.runtime.includes('src/breach-main.ts'));
 assert.ok(x.classifications.runtime.includes('src/breach-game.ts'));
 assert.ok(x.classifications.runtime.includes('src/breach-3d.ts'));
 assert.ok(x.topDependencies.some(v=>v.path==='src/breach-main.ts'));
 assert.ok(x.duplicateWorkflowTests.length>0);
 assert.ok(x.classifications.unreferenced.length<x.counts.source);
 assert.ok(x.interpretation.includes('Review candidates only'));
});
