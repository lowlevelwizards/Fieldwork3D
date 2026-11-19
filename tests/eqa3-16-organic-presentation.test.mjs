/** EQA3.16F: real hostile-vs-player movement and civilian perception;
 * visual interpretation may NOT change world truth or invent sensations.
 * Physicality is sampled observationally, no scripted gunshots or contacts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,planDoor,planMove,toggling,stepSession}
 from '../src/breach-game.ts';
import {doorCenter,activateSite} from '../src/breach-core.ts';
import {doorKnown} from '../src/breach-intel.ts';
import {civilianPhysicalityAt} from '../src/breach-encounter-physicality.ts';
import {hostilePhysicalityAt} from '../src/breach-hostile-physicality.ts';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
for(const seed of [13,23]){
 test('EQA3.16F real rescue firefight '+seed+' remains presentation-only',()=>{
  const site=generateSite(seed,'small',undefined,
    {mission:'rescue',enableIncidentIntent:true});
  const s=newSession(0,seed,'floor-plan','small','rescue',site,
   {enableCivilians:true});
  try{
   const a=team(s)[0],foes=enemies(s),civs=s.civilians;
   assert.ok(foes.length>0&&civs.some(c=>c.rescueTarget));
   const nearby=s.doors.filter(d=>doorKnown(s.intel,d.id)&&
    !d.open&&!d.locked&&!d.jammed&&!d.wedged&&
    dist(a.p,doorCenter(d))<78)
    .sort((x,y)=>dist(a.p,doorCenter(x))-dist(a.p,doorCenter(y))||
      x.id.localeCompare(y.id));
   let orderedDoor=false,roomIssued=false;
   for(const door of nearby)if(planDoor(s,a.id,door.id,'open')){
    orderedDoor=true;break;
   }
   const rooms=site.rooms.filter(r=>r.kind==='room')
    .sort((x,y)=>dist(a.p,center(x))-dist(a.p,center(y))||
      x.id.localeCompare(y.id));
   const roomOrder=()=>{
    if(roomIssued)return;
    roomIssued=true;
    if(s.phase==='running')toggling(s);
    assert.ok(rooms.slice(0,6).some(r=>planMove(s,a.id,center(r))),
     'public floor plan must admit a room move, not hidden enemy targeting');
    if(s.phase==='planning')toggling(s);
   };
   if(!orderedDoor)roomOrder();
   else toggling(s);
   let samples=0,flinch=0,hostileLook=0,violations=0;
   for(let i=0;i<720&&s.phase==='running';i++){
    if(orderedDoor&&!roomIssued&&!a.plan.length&&s.seconds>.2)roomOrder();
    stepSession(s,1/60);
    if(i%6!==0)continue;
    samples++;
    for(const c of civs){
     const before=JSON.stringify({p:c.p,goal:c.goal,state:c.state,
       fear:c.fear,nav:c.nav});
     const visual=civilianPhysicalityAt(c,s.seconds);
     if(visual.flinch>0)flinch++;
     if(!Number.isFinite(visual.headYaw)||
        Math.abs(visual.headYaw)>.37||visual.shelter<0||
        visual.shelter>1)violations++;
     assert.equal(JSON.stringify({p:c.p,goal:c.goal,state:c.state,
       fear:c.fear,nav:c.nav}),before,
       'presentation sampling must not move the person or author a plan');
    }
    for(const foe of foes){
     const before=JSON.stringify({p:foe.p,plan:foe.plan,
       alert:foe.alert,aim:foe.aim});
     const visual=hostilePhysicalityAt(foe,s.seconds);
     if(Math.abs(visual.headYaw)>.001)hostileLook++;
     if(!Number.isFinite(visual.headYaw)||
       Math.abs(visual.headYaw)>.23||
       (foe.aim>.18&&visual.headYaw!==0))violations++;
     assert.equal(JSON.stringify({p:foe.p,plan:foe.plan,
       alert:foe.alert,aim:foe.aim}),before);
    }
   }
   assert.equal(violations,0);
   assert.ok(samples>=40);
   console.log('EQA3_16_ORGANIC',JSON.stringify({seed,samples,
     shots:s.nextShotId-1,flinchSamples:flinch,
     hostileLookSamples:hostileLook,behavior:'physical live AI, no inserted stimuli'}));
  }finally{activateSite(null);}
 });
}
