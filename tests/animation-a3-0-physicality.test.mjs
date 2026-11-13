import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {A3_SCENES,DEFAULT_A3_CONFIG,a3Fixture,createA3Session}
 from '../src/a3-physicality-scenarios.ts';
import {probeA3} from '../src/a3-physicality-probe.ts';
import {stepSession,team,enemies}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=(scenario,extra={})=>({...DEFAULT_A3_CONFIG,scenario,...extra});
const run=(scenario,ticks=12,extra={})=>{
 const cfg=config(scenario,extra),s=createA3Session(cfg);
 try{
  let a=probeA3(s,cfg);
  for(let i=0;i<ticks;i++){stepSession(s,1/60);a=probeA3(s,cfg);}
  return a;
 }finally{activateSite(null);}
};
test('A3.0 contains all fixture families and one isolated actual Breach session',()=>{
 assert.deepEqual(A3_SCENES.map(x=>x.id),[
  'clear','rear-stack','offset-left','offset-right',
  'mixed-crouch','crossing','doorway','furniture']);
 for(const entry of A3_SCENES){
  const cfg=config(entry.id,{seed:31063,operators:4});
  const site=a3Fixture(cfg),s=createA3Session(cfg);
  assert.equal(site.seed,31063);
  assert.equal(team(s).filter(a=>a.health>0).length,4);
  assert.equal(enemies(s).length>=1,true);
  assert.equal(s.phase,'running');
  const snapshot=probeA3(s,cfg);
  assert.equal(snapshot.version,1);
  assert.equal(snapshot.allies.length,3);
  assert.ok(Number.isFinite(snapshot.shot.muzzle.x));
  assert.ok(Number.isFinite(snapshot.shot.muzzle.y));
  assert.ok(Number.isFinite(snapshot.shot.muzzle.z));
 }
 activateSite(null);
});
test('A3.0 reproducible fixed seed and ticks across the complete fixture matrix',()=>{
 for(const entry of A3_SCENES){
  const first=run(entry.id,20);
  const second=run(entry.id,20);
  assert.deepEqual(second,first,entry.id+' has nondeterministic report state');
  assert.equal(first.seconds,Number((20/60).toFixed(3)));
 }
});
test('A3.0 diagnostics use the same actual shot-time muzzle and baseline lane',()=>{
 const cfg=config('rear-stack',{operators:2}),s=createA3Session(cfg);
 try{
  const shooter=team(s)[0],target=enemies(s)[0];
  const world=sessionWorldGeometry(s);
  const actual=weaponClearance({
   x:shooter.p.x,z:shooter.p.y,heading:shooter.heading,
   weaponYaw:shooter.weaponYaw,weapon:shooter.weapon,
   weaponConfiguration:shooter.weaponConfiguration,
   equipment:shooter.equipment,aim:shooter.aim,
   posture:shooter.posture,velocity:shooter.velocity,recoil:shooter.recoil
  },s.doors,world.cover,world.walls);
  const lane=assessFireLane(
   {x:actual.muzzle.x,y:actual.muzzle.z},actual.muzzle.y,
   target.p,target.posture==='crouch'?11:32,
   world.cover,world.walls,s.doors,[team(s)[1].p]);
  const reading=probeA3(s,cfg);
  assert.equal(reading.shot.lane,lane.blocker);
  assert.equal(reading.shot.lane,'friendly');
  assert.ok(Math.abs(reading.shot.muzzle.x-actual.muzzle.x)<.001);
  assert.equal(reading.shot.authorizedByGeometry,false);
  assert.equal(reading.friendlyPlanarRadius,10.5);
  assert.ok(reading.legacyRecovery.checks>=0);
  assert.equal(reading.legacyRecovery.appliedByMotor,false,
   'read-only probe cannot physically move the operator');
 }finally{activateSite(null);}
});
test('A3.0 crouch is correctly reported as baseline, not falsely permitted through friendly',()=>{
 const stand=run('rear-stack',0,{operators:2});
 const crouch=run('mixed-crouch',0,{operators:2});
 assert.equal(stand.shot.lane,'friendly');
 assert.equal(crouch.allies[0].posture,'crouch');
 assert.equal(crouch.shot.lane,'friendly',
  'future A3.1 vertical body protection is not implemented in A3.0');
});
test('A3.0 seeded options, actor count and baseline lack of contact solver are explicit',()=>{
 const one=run('clear',0,{operators:1,posture:'crouch',weapon:'smg',
  intent:'hold',seed:173});
 assert.equal(one.allies.length,0);
 assert.equal(one.shooter.posture,'crouch');
 assert.equal(one.shooter.weapon,'smg');
 assert.equal(one.config.seed,173);
 assert.ok(one.limitations.includes('no-micro-aim-solver'));
 assert.ok(one.limitations.includes('planar-friendly-guard'));
});
test('A3.0 is built and linked without touching production fire/motor authority',()=>{
 const vite=source('vite.config.ts'),home=source('index.html');
 const html=source('a3-physicality-lab.html'),main=source('src/a3-physicality-lab-main.ts');
 assert.match(vite,/a3PhysicalityLab:\s*'a3-physicality-lab.html'/);
 assert.match(home,/a3-physicality-lab.html/);
 for(const id of ['scenario','operators','posture','intent','weapon','seed',
  'run','step','reset','copy','download','stage','details','pose','perf'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(main,/stepSession\(s,1\/60\)/);
 assert.match(main,/probeA3\(s,config\)/);
 assert.match(main,/inspectOperatorPoseOutput\(rig\)/);
 assert.match(main,/JSON.stringify\(report\(\),null,2\)/);
 for(const p of ['src/breach-shot-resolution.ts','src/breach-fire-safety.ts',
  'src/breach-operator-animation-controller.ts']){
  assert.doesNotMatch(source(p),/a3-physicality/);
 }
});
