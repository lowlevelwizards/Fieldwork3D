import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {activateSite} from '../src/breach-core.ts';
test('B0/B4: real resolved encounter drives valid briefing facts, not a fictional map',()=>{
 try{
  const site=generateSite(12,'small');
  const session=newSession(0,12,'true-blind','small',undefined,site);
  const before=JSON.stringify(site);
  const truth=compileMissionFacts(session);
  assert.equal(truth.hostileCount,session.operators.filter(a=>a.side==='red').length);
  assert.equal(truth.building,site.archetype);
  assert.equal(truth.missionKind,session.missionType);
  const briefing=createOperationDossier(truth,{quality:'low'});
  assert.ok(briefing.rendered.standard.includes(truth.objective.objective));
  assert.ok(briefing.rendered.standard.includes(truth.objective.extraction));
  assert.equal(briefing.claims.some(c=>c.disclosure==='floor-plan'),false);
  assert.equal(JSON.stringify(site),before);
 }finally{activateSite(null);}
});
test('B4: lab is its own built page and existing game briefing remains isolated',()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const path=(p)=>fileURLToPath(new URL('../'+p,import.meta.url));
 assert.match(readFileSync(path('vite.config.ts'),'utf8'),/briefingLab: 'briefing-lab\.html'/);
 assert.match(readFileSync(path('briefing-lab.html'),'utf8'),/BRIEFING LAB/);
 assert.match(readFileSync(path('src/briefing-lab-main.ts'),'utf8'),/rerollWording/);
});
