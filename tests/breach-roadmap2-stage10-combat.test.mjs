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
 const resolution=src('breach-shot-resolution.ts');
 assert.match(resolution,/if\(sightClearance.blocked\)/);
 assert.match(resolution,/if\(shotClearance.blocked\)/);
 assert.match(resolution,/if\(shotLane.blocker==='friendly'\)/);
 assert.match(pipeline,/if\(observedCivilianFireLane\(s,a,/);
 assert.match(pipeline,/knownCivilianInFireLane/);
 assert.match(pipeline,/firstCivilianAlongRay/);
 assert.match(resolution,/fireLaneReachable\(lane,laneTrace,target.p\)/);
 assert.match(resolution,/const proposedYaw=shotYaw\(a.weaponYaw,cone,random\(s\),random\(s\)\)/);
 assert.match(resolution,/const yaw=muzzle.yaw/);
 assert.match(pipeline,/sweptBodyClear\(a.p,candidate,s.doors,8,sessionWorldGeometry\(s\)\)/);
});

test('physical bullet effects commit health, cover, doors, glass, suppression and replay',()=>{
 const pipeline=src('breach-firing-pipeline.ts');
 const resolution=src('breach-shot-resolution.ts');
 const environment=src('breach-shot-environment.ts');
 assert.match(resolution,/damageStruckCover\(s,strike.coverHits/);
 assert.match(resolution,/shatterStruckDoorGlass\(s,strike.glassDoorHits/);
 assert.match(resolution,/shatterStruckWindows\(s,actualRay/);
 assert.match(resolution,/emitMaterialEvents\(s,muzzlePoint,far/);
 assert.match(resolution,/resolveArmorImpact\(/);
 assert.match(resolution,/registerWound\(/);
 assert.match(resolution,/shotPressureAtActor\(/);
 assert.match(resolution,/recordCivilianHarm\(/);
 assert.match(resolution,/s\.shots\.push\(/);
 assert.match(resolution,/s\.casings\.push\(/);
 assert.match(resolution,/retainImpactMark\(/);
 assert.match(resolution,/s\.deaths\+\+/);
 assert.match(pipeline,/commitShot\(s,a,target,\{mode,range,moving,mods,weapon,profile\}\)/);
 assert.match(environment,/function damageStruckCover\(/);
 assert.match(environment,/function shatterStruckWindows\(/);
});
