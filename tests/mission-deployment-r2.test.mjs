import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
import {exteriorBriefedAt} from '../src/breach-site-footprint.ts';
import {verifiedDeploymentChoices} from '../src/breach-deployment.ts';
import {newSession,team,selectDeployment} from '../src/breach-game.ts';

test('R2: every offered staging option is exterior-connected and body-clear',()=>{
 try{
  for(const seed of [12,13,14]){
   const site=generateSite(seed,'small');activateSite(site);
   const opts=verifiedDeploymentChoices(site);
   assert.deepEqual(opts,verifiedDeploymentChoices(site));
   for(const o of opts){
    assert.ok(site.doors.some(d=>d.id===o.id)||
      site.windows?.some(w=>w.id===o.id));
    assert.equal(o.spots.length,4);
    assert.ok(o.spots.every(p=>passable(p,8)&&exteriorBriefedAt(site,p)));
    assert.ok(route(site.spawn[0],o.approach,
      p=>passable(p,8)&&exteriorBriefedAt(site,p)).length>0);
   }
  }
 }finally{activateSite(null);}
});
test('R2: insertion is optional, pre-plan only and resets to actual front',()=>{
 try{
  const site=generateSite(12,'small');
  const session=newSession(0,12,'floor-plan','small',undefined,site);
  const alternative=verifiedDeploymentChoices(site).find(o=>o.id!=='FRONT');
  if(alternative){
   assert.equal(selectDeployment(session,alternative.id),true);
   assert.deepEqual(team(session).map(a=>a.p),alternative.spots);
  }
  assert.equal(selectDeployment(session,'FRONT'),true);
  assert.deepEqual(team(session).map(a=>a.p),site.spawn);
  team(session)[0].plan=[{id:1,kind:'move',p:{x:0,y:0}}];
  assert.equal(selectDeployment(session,'FRONT'),false);
  session.started=true;
  assert.equal(selectDeployment(session,'FRONT'),false);
 }finally{activateSite(null);}
});
