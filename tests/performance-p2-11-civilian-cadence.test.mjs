import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianSenseDue,stepCivilianResponse}
 from '../src/breach-civilian-response.ts';

const person=()=>createCivilian({
 id:'civilian-cadence',role:'resident',persona:'steady',
 activity:'idle',position:{x:80,y:75},heading:0,roomId:'main',
 appearanceSeed:24
});
const sensoryWorld={
 noise:[],people:[],doors:[],walls:[],windows:[],
 canSee:()=>true,canReach:()=>true,routeTo:()=>[]
};
test('P2.11 cadence pre-gate is equivalent to the actual response admission for 360 fixed ticks',()=>{
 const c=person();
 let dueTicks=0;
 for(let i=0;i<360;i++){
  const now=i/60;
  const before=c.lastSenseAt;
  const expected=civilianSenseDue(c,now);
  if(expected)dueTicks++;
  stepCivilianResponse(c,now,1/60,sensoryWorld);
  assert.equal(c.lastSenseAt!==before,expected,
   'no missed or extra sensing tick at '+i);
 }
 // 120ms requires eight discrete 60Hz steps, and the first tick starts
 // at t=0 with a previous observation at t=0. Expect ~44 admissions.
 assert.ok(dueTicks>=42&&dueTicks<=46,
  'observer responses remain near the established 120ms cadence');
});
test('P2.11 inactive and wounded civilians retain their previous observer clocks',()=>{
 const c=person();
 for(const condition of [{health:1,injuryStage:0},{health:0,injuryStage:3}]){
  c.health=condition.health;c.injuryStage=condition.injuryStage;
  c.lastSenseAt=0;
  assert.equal(civilianSenseDue(c,1.25),false);
  stepCivilianResponse(c,1.25,1/60,sensoryWorld);
  assert.equal(c.lastSenseAt,0);
 }
 // Compliant but physically healthy civilians still perceive evidence
 // before their state-specific early return, exactly as before.
 c.health=2;c.injuryStage=0;c.state='compliant';
 assert.equal(civilianSenseDue(c,1.25),true);
 stepCivilianResponse(c,1.25,1/60,sensoryWorld);
 assert.equal(c.lastSenseAt,1.25);
});
test('P2.11 phase reuses movement ports and skips allocations only when observer not due',()=>{
 const code=readFileSync(new URL('../src/breach-simulation-motion-phase.ts',import.meta.url),'utf8');
 assert.match(code,/if\(civilianSenseDue\(civil,s\.seconds\)\)\{/);
 assert.match(code,/stepCivilianResponse\(civil,s\.seconds,h,\{/);
 assert.match(code,/stepCivilianMovement\(civil,s\.seconds,h,clear,occupied,routeTo\)/);
 assert.match(code,/const world=sessionWorldGeometry\(s\);/);
});
