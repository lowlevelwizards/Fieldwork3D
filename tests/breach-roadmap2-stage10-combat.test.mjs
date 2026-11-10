/** Roadmap 2 Stage 10 — firing and damage authority invariants.
 * Structural assertions follow the actual owner of each authoritative
 * behavior; simulation goldens elsewhere validate behavioral parity.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('one firing controller is invoked from the authoritative 60 Hz session',()=>{
 const game=src('breach-game.ts');
 const pipeline=src('breach-firing-pipeline.ts');
 assert.match(game,/const runCombat=createCombatFiringPipeline\(/);
 assert.match(game,/runCombat\.fire\(s,a,h\)/);
 assert.match(game,/requestClearFireStep:runCombat\.requestClearFireStep/);
 assert.doesNotMatch(game,/function (?:fire|fireSuppression|requestClearFireStep|damageStruckCover)\(/);
 assert.match(pipeline,/export function createCombatFiringPipeline\(/);
 assert.match(pipeline,/function fire\(s:Session,a:TeamActor,dt:number\)/);
 assert.match(pipeline,/function fireSuppression\(s:Session,a:TeamActor,dt:number\)/);
 assert.match(pipeline,/return \{fire,requestClearFireStep\}/);
 for(const banned of [/\bstepSession\s*\(/,/requestAnimationFrame\(/,/Math\.random\s*\(/,
  /Date\.now\s*\(/,/setInterval\s*\(/,/from ['"]three(?:\/|['"])/]){
  assert.doesNotMatch(pipeline,banned);
 }
});

test('firing evaluates clearance, friendlies and observed civilian safety before ignition',()=>{
 const pipeline=src('breach-firing-pipeline.ts');
 assert.match(pipeline,/if\(sightClearance.blocked\)/);
 assert.match(pipeline,/if\(shotClearance.blocked\)/);
 assert.match(pipeline,/if\(shotLane.blocker==='friendly'\)/);
 assert.match(pipeline,/if\(observedCivilianFireLane\(s,a,/);
 assert.match(pipeline,/knownCivilianInFireLane/);
 assert.match(pipeline,/firstCivilianAlongRay/);
 assert.match(pipeline,/fireLaneReachable\(lane,laneTrace,target.p\)/);
 assert.match(pipeline,/const proposedYaw=shotYaw\(a.weaponYaw,cone,random\(s\),random\(s\)\)/);
 assert.match(pipeline,/const yaw=muzzle.yaw/);
 assert.match(pipeline,/sweptBodyClear\(a.p,candidate,s.doors\)/);
});

test('physical bullet effects commit health, cover, doors, glass, suppression and replay',()=>{
 const pipeline=src('breach-firing-pipeline.ts');
 assert.match(pipeline,/damageStruckCover\(s,strike.coverHits/);
 assert.match(pipeline,/shatterStruckDoorGlass\(s,strike.glassDoorHits/);
 assert.match(pipeline,/shatterStruckWindows\(s,actualRay/);
 assert.match(pipeline,/emitMaterialEvents\(s,muzzlePoint,far/);
 assert.match(pipeline,/resolveArmorImpact\(/);
 assert.match(pipeline,/registerWound\(/);
 assert.match(pipeline,/shotPressureAtActor\(/);
 assert.match(pipeline,/recordCivilianHarm\(/);
 assert.match(pipeline,/s\.shots\.push\(/);
 assert.match(pipeline,/s\.casings\.push\(/);
 assert.match(pipeline,/retainImpactMark\(/);
 assert.match(pipeline,/s\.deaths\+\+/);
});
