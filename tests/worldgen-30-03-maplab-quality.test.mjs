import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Map Lab has an actionable functional-quality inspector',()=>{
 const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
 for(const id of ['functionalQuality','functionalSummary','functionalWarnings'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(main,/function showFunctionalQuality\(/);
 assert.match(main,/functionalWarnings\.append\(button\)/);
 assert.match(main,/currentAudit=audit/);
 assert.match(main,/result\.spaceQuality\.crowdedRoomIds\.length/);
});
