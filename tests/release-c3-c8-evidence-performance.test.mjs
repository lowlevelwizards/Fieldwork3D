import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchCandidates} from '../src/breach-ai-search.ts';
import {localFixtureObservation} from '../src/breach-ai-contextual-observation.ts';
import {AiWorkScheduler} from '../src/breach-ai-work-scheduler.ts';
const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('C8: hearing-led architectural search stays seeded, local and bounded',()=>{
 const rooms=[{id:'office',kind:'room',x:0,y:0,w:180,h:180},
  {id:'remote',kind:'room',x:420,y:420,w:100,h:100}];
 const doors=[{a:{x:0,y:75},b:{x:0,y:105}}];
 const cover=[{x:95,y:90,w:40,h:20},{x:500,y:500,w:50,h:30}];
 const query=()=>searchCandidates({x:85,y:90},60,rooms,doors,cover);
 assert.deepEqual(query(),query());
 assert.ok(query().length>0&&query().length<=6);
 assert.ok(query().every(p=>Math.hypot(p.x-85,p.y-90)<=165));
 assert.ok(!query().some(p=>p.x>350&&p.y>350));
});
test('C8: existing ordinary physical fixture supports local inspection only',()=>{
 const fixture=[{x:62,y:80,fixture:'workbench'},
  {x:390,y:390,fixture:'workbench'}];
 const rooms=[{x:0,y:0,w:180,h:180},{x:330,y:330,w:130,h:130}];
 assert.deepEqual(localFixtureObservation({x:52,y:50},fixture,rooms),
   {x:62,y:80});
 assert.equal(localFixtureObservation({x:250,y:250},fixture,rooms),null);
});
test('C8: urgent response is never deferred; ordinary search is budgeted',()=>{
 const scheduler=new AiWorkScheduler(1,['guard-a','guard-b']);
 assert.equal(scheduler.allow('guard-a','contact',2,true),true);
 assert.equal(scheduler.allow('guard-b','contact',2,true),true);
 let granted=0;for(const id of ['guard-a','guard-b'])
  if(scheduler.allow(id,'investigation-route',2))granted++;
 assert.ok(granted<=1);
});
test('C8: no recurring sort or global frame search added to contact decisions',()=>{
 const source=src('breach-enemy-decision-controller.ts');
 assert.doesNotMatch(source,/visible\.sort\(/);
 assert.match(source,/const friends:ReturnType<typeof safetyBodyFor>\\[\\]=\\[\\]/);
 assert.doesNotMatch(source,/const friends=enemies\\(s\\)\\.filter\\(/);
 assert.match(source,/AiWorkScheduler\(2,/);
});
