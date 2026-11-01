import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialRoster,resupplyRoster,equipRoster,readRoster} from '../src/breach-roster.ts';
test('operations board actions use bounded persistent state and do not force missions',()=>{
 const src=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(src,/operationsBoardToggle/);
 assert.match(src,/if\(state\.phase!==['"]planning['"]\|\|replaying\)return/);
 const r=equipRoster(initialRoster(),'moss','rifle');
 const ammo={...r,members:r.members.map(m=>m.id==='moss'?
   {...m,magazine:1,reserve:0}:m)};
 const restored=readRoster(JSON.stringify(resupplyRoster(ammo,'moss')));
 assert.equal(restored.members.find(m=>m.id==='moss').magazine,10);
 assert.equal(restored.members.find(m=>m.id==='moss').reserve,30);
 assert.equal(ammo.members.find(m=>m.id==='moss').reserve,0);
});
