import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies} from '../src/breach-game.ts';
import {createCombatFiringPipeline} from '../src/breach-firing-pipeline.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment,secondaryRoundTotal}
 from '../src/secondary-equipment.ts';
import {initialSecondarySwitch,requestSecondarySwitch,advanceSecondarySwitch}
 from '../src/secondary-switching.ts';

function fixture(friendInLane=false){
 const s=newSession(),a=team(s)[0],target=enemies(s)[0];
 assert.ok(target,'tactical fixture requires a hostile actor');
 a.p={x:150,y:270};target.p={x:210,y:270};
 a.heading=0;a.weaponYaw=0;a.aim=.98;a.fireCd=0;
 a.stability=1;a.recoil=0;a.firePolicy='engage';
 a.plan=[];a.pace='walk';a.velocity=0;
 a.lastHitAt=-100;a.flashUntil=-100;
 target.health=4;target.posture='stand';
 for(const other of s.operators){
  if(other===a||other===target)continue;
  if(friendInLane&&other.side==='blue'){
   other.p={x:184,y:270};other.health=4;friendInLane=false;
  }else other.health=0;
 }
 s.civilians=[];s.doors=[];s.phase='running';
 const kit=initialSecondaryEquipment(a.id,'glock-g19x');
 a.equipment={...initialEquipmentLoadout(),secondary:kit};
 let selection=requestSecondarySwitch(initialSecondarySwitch(),'secondary',kit).state;
 for(let i=0;i<60;i++)selection=advanceSecondarySwitch(selection,1/60,kit);
 a.secondarySwitch=selection;
 const run=createCombatFiringPipeline({team,enemies,
  inSight:(observer,enemy)=>observer===a&&enemy===target&&target.health>0,
  isSeen:()=>true,liveVisibility:()=>true,unobstructed:()=>true,
  beginReload(){throw Error('never reload primary while pistol drawn')},
  advanceReload(){throw Error('never advance primary reload')},
  notify(){},hear(){},battleEvent(){}});
 return {s,a,target,kit,run};
}
function attempt({s,a,run},ticks=120){
 for(let i=0;i<ticks;i++){
  run.fire(s,a,1/60);
  if(s.shots.some(shot=>shot.shooterId===a.id))break;
  s.seconds+=1/60;
 }
}
test('S7: actually fired 9mm goes through shared combat resolver, never consumes primary ammo',()=>{
 const x=fixture(),{s,a,kit}=x;
 const rifle={mag:a.magazine,res:a.reserve,serial:a.insertedMagazineId};
 const total=secondaryRoundTotal(kit);
 attempt(x);
 const shots=s.shots.filter(y=>y.shooterId===a.id);
 assert.ok(shots.length>=1,'clear visible contact should authorize a real 9mm shot');
 assert.equal(shots[0].secondaryWeapon,'glock-g19x');
 assert.equal(shots[0].weapon,'glock-g19x');
 assert.equal(a.equipment.secondary.loadedRounds,kit.loadedRounds-shots.length);
 assert.equal(secondaryRoundTotal(a.equipment.secondary),total-shots.length);
 assert.equal(a.magazine,rifle.mag);
 assert.equal(a.reserve,rifle.res);
 assert.equal(a.insertedMagazineId,rifle.serial);
 assert.ok(s.casings.some(c=>c.secondaryWeapon==='glock-g19x'));
});
test('S7: teammate occupying exact outgoing pistol corridor vetoes any shot and round loss',()=>{
 const x=fixture(true),{s,a,kit}=x;
 const primary=a.magazine;
 attempt(x,60);
 assert.equal(s.shots.some(shot=>shot.shooterId===a.id),false);
 assert.equal(a.equipment.secondary.loadedRounds,kit.loadedRounds);
 assert.equal(a.magazine,primary);
});
