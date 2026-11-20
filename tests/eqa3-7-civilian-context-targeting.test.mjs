import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestContextCivilian}
 from '../src/breach-civilian-context-selection.ts';
import {dispatchTacticalContextCommand}
 from '../src/breach-tactical-context-command.ts';
import {newSession,team,planCivilianInteraction}
 from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';

const make=(id,p,rescueTarget=false,state='routine')=>({
 id,p,health:2,state,rescueTarget
});
const from={x:0,y:0};
test('EQA3.7 FOLLOW chooses the real rescue person over a nearer visitor',()=>{
 const visitor=make('visitor',{x:7,y:0});
 const target=make('rescue',{x:22,y:0},true);
 const civilians=[visitor,target];
 const selected=nearestContextCivilian(civilians,from,'follow','extract',
   ()=>true,()=>true);
 assert.equal(selected,target);
 assert.equal(nearestContextCivilian(civilians,from,'follow','secure',
   ()=>true,()=>true),null,'FOLLOW is only available in extraction');
 assert.equal(nearestContextCivilian([visitor],from,'follow','extract',
   ()=>true,()=>true),null);
 assert.equal(civilians[0],visitor,'selector must not mutate or sort actors');
});
test('EQA3.7 SECURE skips compliant and physically blocked civilians',()=>{
 const compliant=make('compliant',{x:5,y:0},false,'compliant');
 const blocked=make('blocked',{x:9,y:0});
 const accessible=make('accessible',{x:20,y:0});
 const eligible=nearestContextCivilian([compliant,blocked,accessible],from,
   'secure','secure',()=>true,(_,to)=>to.x!==9);
 assert.equal(eligible,accessible);
 assert.equal(nearestContextCivilian([compliant,blocked],from,
   'secure','secure',()=>true,(_,to)=>to.x!==9),null,
   'palette must not advertise SECURE through opaque geometry');
});
test('EQA3.7 requires sight beyond physical contact; still rejects out-of-range and incapacitated',()=>{
 const unseen=make('unseen',{x:31,y:0},true);
 const known=make('known',{x:18,y:0},true);
 const distant=make('distant',{x:115,y:0},true);
 const down=make('down',{x:9,y:0},true);down.health=0;
 assert.equal(nearestContextCivilian([unseen,down,known,distant],from,
   'follow','extract',p=>p.x===18,()=>true),known);
 assert.equal(nearestContextCivilian([unseen,down,distant],from,
   'follow','extract',()=>false,()=>true),null);
 assert.equal(nearestContextCivilian([distant],from,
   'follow','extract',()=>true,()=>true),null);
 assert.equal(nearestContextCivilian([known],from,
   'follow','extract',()=>true,()=>false),null);
});
test('EQA3.7 live tactical FOLLOW dispatch targets eligible rescue person',()=>{
 const s=newSession(),a=team(s)[0];
 a.heading=0;a.weaponYaw=0;
 s.missionType='rescue';s.mission='extract';
 const visitor=createCivilian({id:'civ:eqa3-7:visitor',
   role:'visitor',persona:'steady',activity:'idle',
   position:{x:a.p.x+9,y:a.p.y},heading:0,
   roomId:'r',appearanceSeed:20});
 const rescue=createCivilian({id:'civ:eqa3-7:rescue',
   role:'rescue',persona:'steady',activity:'waiting',
   position:{x:a.p.x+20,y:a.p.y},heading:0,
   roomId:'r',appearanceSeed:21,isRescueTarget:true});
 s.civilians.push(visitor,rescue);
 const outcome=dispatchTacticalContextCommand({
   state:s,actor:a,selected:a.id,node:undefined,door:undefined,
   selectedActiveWatch:false,action:'ctxFollowCivilian',
   medicalCandidate:()=>null
 });
 assert.equal(outcome.outcome,'accepted');
 assert.equal(a.plan.at(-1)?.objectId,rescue.id);
 assert.equal(a.plan.at(-1)?.interaction,'follow-civilian');
 assert.equal(visitor.state,'routine');
 assert.equal(rescue.state,'routine','GO-time order still controls custody');
});
test('EQA3.7 direct authoring still rejects remote civilian orders',()=>{
 const s=newSession(),a=team(s)[0];
 const rescue=createCivilian({id:'civ:eqa3-7:distant',
   role:'rescue',persona:'steady',activity:'waiting',
   position:{x:a.p.x+100,y:a.p.y},heading:0,
   roomId:'r',appearanceSeed:21,isRescueTarget:true});
 s.civilians.push(rescue);s.mission='extract';
 assert.equal(planCivilianInteraction(s,a.id,rescue.id,'follow'),false);
});
