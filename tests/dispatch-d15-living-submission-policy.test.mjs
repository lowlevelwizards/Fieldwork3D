import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeCombatant,captureTargetResolved}
 from '../src/breach-suspect-operational-state.ts';
import {newSession,team,enemies,toggling,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

test('D15.2 pure threat policy treats living submission as noncombatant but not incapacitation',()=>{
 const submitted={side:'red',health:3,surrendered:true};
 const resisting={...submitted,surrendered:false};
 const down={...submitted,health:0,surrendered:false};
 assert.equal(activeCombatant(submitted),false);
 assert.equal(activeCombatant(resisting),true);
 assert.equal(activeCombatant(down),false);
 assert.equal(activeCombatant({health:3}),true,'old fixture omission is not submission');
 assert.equal(captureTargetResolved(submitted),true);
 assert.equal(captureTargetResolved(resisting),false);
 assert.equal(captureTargetResolved(down),true);
 assert.equal(captureTargetResolved({...submitted,side:'blue'}),false);
 assert.equal(captureTargetResolved({...submitted,health:NaN}),false);
 assert.equal(activeCombatant({...submitted,health:Infinity}),false);
});

test('D15.2 capture objective requires the same physical contact for a living submitted target',()=>{
 const s=newSession(0,4);
 try{
  const a=team(s)[0],target=enemies(s).find(e=>e.id===s.captureTarget);
  assert.ok(target);
  enemies(s).forEach(e=>{if(e!==target)e.health=0;});
  target.surrendered=true;target.health=3;target.injuryStage=0;
  // The existing objective still belongs to the designated capture target.
  toggling(s);stepSession(s,1/60);
  assert.equal(s.mission,'secure');
  assert.equal(s.captureSecured,false,'verbal surrender is not physical custody');
  a.p={...target.p};stepSession(s,1/60);
  assert.equal(s.captureSecured,true);
  assert.equal(s.mission,'extract');
  assert.equal(target.health,3,'a submitted person was not injured to satisfy capture');
  assert.equal(target.surrendered,true);
 }finally{activateSite(null);}
});

test('D15.2 clear does not require incapacitating a submitted living hostile',()=>{
 const s=newSession(0,0);
 try{
  const a=team(s)[0],enemy=enemies(s)[0];
  enemies(s).forEach(e=>e.health=0);
  if(enemy){enemy.health=3;enemy.surrendered=true;enemy.injuryStage=0;}
  toggling(s);stepSession(s,1/60);
  assert.equal(s.mission,'secure');
  assert.equal(enemy.health,3);
 }finally{activateSite(null);}
});

test('D15.2 hold clock ignores a submitted subject at the objective',()=>{
 const s=newSession(0,3);
 try{
  const a=team(s)[0],suspect=enemies(s)[0];
  a.p={...s.scenario.objective};
  enemies(s).forEach(e=>e.health=0);
  suspect.health=3;suspect.surrendered=true;suspect.injuryStage=0;
  suspect.p={x:a.p.x+22,y:a.p.y};
  toggling(s);
  for(let i=0;i<60;i++)stepSession(s,1/60);
  assert.equal(s.mission,'secure');
  assert.ok(s.holdTime>.5,'submitted subject is not an active contestant');
  assert.equal(suspect.health,3);
 }finally{activateSite(null);}
});

test('D15.2 firing, shot commit and enemy intent independently withhold violence',()=>{
 const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 assert.match(read('breach-firing-pipeline.ts'),
  /for\(const enemy of enemiesOf\)if\(activeCombatant\(enemy\)&&inSight/);
 assert.match(read('breach-firing-pipeline.ts'),/if\(!activeCombatant\(a\)\)/);
 assert.match(read('breach-shot-resolution.ts'),
  /if\(!activeCombatant\(a\)\|\|!activeCombatant\(target\)\)return/);
 assert.match(read('breach-simulation-actor-phase.ts'),
  /if\(a.side==='red'&&activeCombatant\(a\)\)/);
});
