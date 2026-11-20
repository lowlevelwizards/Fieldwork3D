import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,enemies,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {commitSuspectSurrender} from '../src/breach-suspect-compliance.ts';
import {advanceSurrenderOpportunity,canAttemptSuspectEscape,
 suspectIsSupervised,SUSPECT_REARM_SECONDS}
 from '../src/breach-suspect-opportunity.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment} from '../src/secondary-equipment.ts';
import {activeCombatant} from '../src/breach-suspect-operational-state.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {createCombatFiringPipeline} from '../src/breach-firing-pipeline.ts';
const pt=(x,y)=>({x,y});
const site=()=>({
 seed:99616,name:'D15.6 factual-world rearm',
 layout:'corridor',rooms:[{id:'floor',x:110,y:140,w:420,h:260,
 kind:'room',purpose:'floor',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],enemies:[pt(270,260)],
 spawn:[pt(170,260),pt(170,310),pt(170,360),pt(170,410)],
 entrance:pt(170,260),objective:pt(270,260),
 extract:pt(575,260),bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
function scenario(){
 const s=newSession(0,undefined,'full-view','small','capture',site());
 const a=enemies(s)[0];
 for(const other of enemies(s))if(other!==a)other.health=0;
 for(const b of team(s))b.p=pt(4800+b.p.x,4800+b.p.y);
 a.p=pt(270,260);a.priorP={...a.p};a.heading=0;
 a.health=4;a.suppression=0;a.personality='guard';
 const events=[];
 const port={
  unobstructed:()=>true,
  runCustody:(_s,actor,goal)=>{actor.p={...goal};},
  notify:(_s,m)=>events.push(m),
  battleEvent:(_s,_kind,_actor,_p,_text,meta)=>events.push(meta?.action)
 };
 return {s,a,port,events};
}
function tick(s,a,port,steps=1){
 for(let i=0;i<steps;i++){
  s.seconds+=1/60;
  advanceSurrenderOpportunity(s,a,1/60,port);
 }
}
test('D15.6 only actually submitted, unrestrained, unattended people can try',()=>{
 const {s,a,port}=scenario();
 try{
  commitSuspectSurrender(s,a,()=>{},()=>{});
  s.seconds=9;
  assert.equal(suspectIsSupervised(s,a,port.unobstructed),false);
  assert.equal(canAttemptSuspectEscape(a,s.seconds,false),true);
  a.restrained=true;
  assert.equal(canAttemptSuspectEscape(a,s.seconds,false),false);
  a.restrained=false;
  a.suppression=.45;
  assert.equal(canAttemptSuspectEscape(a,s.seconds,false),false);
  a.suppression=0;
  const blue=team(s)[0];blue.p=pt(300,260);blue.heading=Math.PI;
  assert.equal(suspectIsSupervised(s,a,port.unobstructed),true);
  assert.equal(canAttemptSuspectEscape(a,s.seconds,true),false);
  blue.p=pt(400,260);blue.heading=0;
  assert.equal(suspectIsSupervised(s,a,port.unobstructed),false);
  blue.p=pt(290,260);
  assert.equal(suspectIsSupervised(s,a,()=>false),false,
   'a real wall blocks remote supervision, even within close range');
 }finally{activateSite(null);}
});
test('D15.6 real primary is retrieved exactly once after timed physical contact',()=>{
 const {s,a,port,events}=scenario();
 try{
  const original={ammo:a.magazine,reserve:a.reserve,
   serial:a.insertedMagazineId,weapon:a.weapon};
  commitSuspectSurrender(s,a,()=>{},()=>{});
  const w=s.droppedFirearms[0];
  a.magazine=0;a.reserve=0;a.insertedMagazineId='unknown';
  s.seconds=9;tick(s,a,port);
  assert.equal(a.suspectEscapeMode,'recover');
  assert.equal(a.surrendered,true);
  assert.equal(activeCombatant(a),false);
  tick(s,a,port,Math.floor(SUSPECT_REARM_SECONDS*60)-4);
  assert.equal(w.status,'loose','no premature recovery');
  assert.equal(a.surrendered,true);
  tick(s,a,port,12);
  assert.equal(w.status,'retrieved');
  assert.equal(a.surrendered,false);
  assert.equal(a.magazine,original.ammo);
  assert.equal(a.reserve,original.reserve);
  assert.equal(a.insertedMagazineId,original.serial);
  assert.equal(a.weapon,original.weapon);
  assert.equal(a.releasedWeaponId,null);
  assert.equal(activeCombatant(a),true);
  assert.equal(events.filter(x=>x==='suspect-rearmed').length,1);
  tick(s,a,port,120);
  assert.equal(events.filter(x=>x==='suspect-rearmed').length,1);
 }finally{activateSite(null);}
});
test('D15.6 security race and physical supervisor interrupt a hand retrieval',()=>{
 const {s,a,port}=scenario();
 try{
  commitSuspectSurrender(s,a,()=>{},()=>{});
  const gun=s.droppedFirearms[0];
  s.seconds=9;tick(s,a,port,10);
  assert.equal(a.suspectEscapeMode,'recover');
  gun.status='secured';gun.securedById=team(s)[0].id;
  tick(s,a,port);
  assert.equal(a.suspectEscapeMode,null);
  assert.equal(a.surrendered,true);
  assert.equal(gun.status,'secured');
  gun.status='loose';gun.securedById=undefined;
  s.seconds+=4;
  tick(s,a,port,10);
  const blue=team(s)[0];blue.p=pt(300,260);blue.heading=Math.PI;
  tick(s,a,port);
  assert.equal(a.suspectEscapeMode,null);
  assert.equal(gun.status,'loose');
  assert.equal(a.surrendered,true);
  a.restrained=true;blue.p=pt(5000,5000);
  tick(s,a,port,1000);
  assert.equal(a.surrendered,true);
  assert.equal(gun.status,'loose','cuffs always win');
 }finally{activateSite(null);}
});
test('D15.6 genuine holstered pistol takes measurable time and never revives seized primary',()=>{
 const {s,a,port}=scenario();
 try{
  const kit=initialSecondaryEquipment(a.id,'glock-g19x');
  a.equipment={...initialEquipmentLoadout(),secondary:kit};
  commitSuspectSurrender(s,a,()=>{},()=>{});
  const released=s.droppedFirearms[0];
  released.status='secured';
  s.seconds=9;tick(s,a,port);
  assert.equal(a.suspectEscapeMode,'secondary');
  assert.equal(a.secondarySwitch.fraction,0);
  tick(s,a,port,45);
  assert.equal(a.surrendered,true,'the hand is not ready at start');
  tick(s,a,port,65);
  assert.equal(a.surrendered,false);
  assert.equal(a.suspectRearmedSecondary,true);
  assert.equal(a.secondarySwitch.fraction,1);
  assert.equal(a.secondarySwitch.active,'secondary');
  assert.equal(released.status,'secured','the old gun stays confiscated');
  assert.equal(a.equipment.secondary.loadedRounds,kit.loadedRounds);
  const after=snapshot(s);
  assert.equal(after.actors.find(x=>x.id===a.id).suspectRearmedSecondary,true);
  assert.equal(after.actors.find(x=>x.id===a.id).secondaryIssued,true);
 }finally{activateSite(null);}
});
test('D15.6 searched suspect cannot invent pistol; a bare, unarmed person flees',()=>{
 const {s,a,port}=scenario();
 try{
  a.equipment={...initialEquipmentLoadout(),
   secondary:initialSecondaryEquipment(a.id,'glock-g19x')};
  commitSuspectSurrender(s,a,()=>{},()=>{});
  s.droppedFirearms[0].status='secured';a.suspectSearched=true;
  // Physical search actually removes the holstered pistol.
  a.equipment={...a.equipment,secondary:undefined};
  s.seconds=9;tick(s,a,port);
  assert.equal(a.suspectEscapeMode,'flee');
  assert.equal(a.surrendered,true);
  assert.equal(a.suspectRearmedSecondary,false);
  const goal=a.suspectEscapeGoal;
  assert.ok(goal,'choose a genuinely passable nearby destination');
  tick(s,a,port,2);
  assert.deepEqual(a.p,goal,'existing movement port moves the actual actor');
  assert.equal(a.surrendered,true,'flight does not authorize armed combat');
  tick(s,a,port);
  assert.equal(a.suspectEscapeMode,null);
 }finally{activateSite(null);}
});
test('D15.6 physically released pistol retains its actual issued kit and magazines',()=>{
 const {s,a,port}=scenario();
 try{
  const kit=initialSecondaryEquipment(a.id,'glock-g19-gen3');
  a.equipment={...initialEquipmentLoadout(),
   secondary:{...kit,loadedRounds:4}};
  a.secondarySwitch={active:'secondary',desired:'secondary',fraction:1};
  commitSuspectSurrender(s,a,()=>{},()=>{});
  const gun=s.droppedFirearms[0];
  assert.equal(gun.secondaryWeapon,'glock-g19-gen3');
  assert.equal(gun.secondaryEquipment.loadedRounds,4);
  assert.equal(a.equipment.secondary,undefined);
  s.seconds=9;tick(s,a,port,85);
  assert.equal(gun.status,'retrieved');
  assert.equal(a.surrendered,false);
  assert.equal(a.suspectRearmedSecondary,true);
  assert.equal(a.equipment.secondary.loadedRounds,4);
  assert.equal(a.equipment.secondary.loadedMagazineId,kit.loadedMagazineId);
  assert.equal(a.equipment.secondary.spareMagazines.length,2);
 }finally{activateSite(null);}
});
test('D15.6 replay rewinds escape, world-gun retrieval, sidearm issue and legacy fields',()=>{
 const {s,a,port}=scenario();
 try{
  const kit=initialSecondaryEquipment(a.id,'glock-g26');
  a.equipment={...initialEquipmentLoadout(),secondary:kit};
  a.secondarySwitch={active:'secondary',desired:'secondary',fraction:1};
  const initial=snapshot(s);
  commitSuspectSurrender(s,a,()=>{},()=>{});
  const withoutPistol=snapshot(s);
  assert.equal(withoutPistol.actors.find(x=>x.id===a.id).secondaryIssued,false);
  assert.equal(withoutPistol.droppedFirearms[0].secondaryEquipment.loadedRounds,
   kit.loadedRounds);
  s.seconds=9;tick(s,a,port,85);
  const recovered=snapshot(s);
  assert.equal(recovered.droppedFirearms[0].status,'retrieved');
  applyReplayFrame(s,withoutPistol);
  assert.equal(a.surrendered,true);
  assert.equal(a.equipment.secondary,undefined,
   'rewind may not preserve the future held pistol');
  assert.equal(s.droppedFirearms[0].status,'loose');
  applyReplayFrame(s,recovered);
  assert.equal(a.surrendered,false);
  assert.equal(a.equipment.secondary.weapon,kit.weapon);
  assert.equal(a.suspectRearmedSecondary,true);
  applyReplayFrame(s,initial);
  assert.equal(a.surrendered,false);
  assert.equal(a.equipment.secondary.weapon,kit.weapon);
  assert.equal(a.suspectEscapeMode,null);
  const old={...withoutPistol,actors:withoutPistol.actors.map(frame=>{
   if(frame.id!==a.id)return frame;
   const {suspectEscapeMode,suspectEscapeGoal,suspectRearmedSecondary,
    secondaryIssued,...legacy}=frame;return legacy;
  })};
  applyReplayFrame(s,old);
  assert.equal(a.suspectEscapeMode,null);
  assert.equal(a.suspectRearmedSecondary,false);
 }finally{activateSite(null);}
});
test('D15.6 recovered 9mm obeys real red firing pipeline and uses only pistol rounds',()=>{
 const {s,a,port}=scenario();
 try{
  const kit=initialSecondaryEquipment(a.id,'glock-g19x');
  a.equipment={...initialEquipmentLoadout(),secondary:kit};
  commitSuspectSurrender(s,a,()=>{},()=>{});
  s.droppedFirearms[0].status='secured';
  s.seconds=9;tick(s,a,port,112);
  assert.equal(a.surrendered,false);
  assert.equal(a.suspectRearmedSecondary,true);
  const target=team(s)[0];
  target.p=pt(345,260);target.health=4;
  a.heading=0;a.weaponYaw=0;a.aim=.99;a.fireCd=0;
  a.stability=1;a.recoil=0;a.pace='walk';a.plan=[];a.velocity=0;
  a.lastHitAt=-100;a.flashUntil=-100;a.combatChoice='engage';
  a.encounterReactionUntil=0;
  const primary=a.magazine;
  const fire=createCombatFiringPipeline({
   team,enemies,
   inSight:(observer,candidate)=>observer===a&&candidate===target&&
      target.health>0,
   isSeen:()=>true,liveVisibility:()=>true,unobstructed:()=>true,
   beginReload(){throw Error('no phantom primary reload')},
   advanceReload(){throw Error('no phantom primary reload')},
   notify(){},hear(){},battleEvent(){}
  });
  for(let i=0;i<180;i++){
   fire.fire(s,a,1/60);s.seconds+=1/60;
   if(s.shots.some(x=>x.shooterId===a.id))break;
  }
  const shot=s.shots.find(x=>x.shooterId===a.id);
  assert.ok(shot,'actual 9mm shot must pass through established red combat');
  assert.equal(shot.secondaryWeapon,'glock-g19x');
  assert.equal(a.equipment.secondary.loadedRounds,kit.loadedRounds-1);
  assert.equal(a.magazine,primary);
 }finally{activateSite(null);}
});
