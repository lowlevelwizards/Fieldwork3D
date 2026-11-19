import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,toggling,stepSession,planCivilianInteraction}
 from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {activateSite} from '../src/breach-core.ts';

const p=(x,y)=>({x,y});
const site=()=>({
 seed:31313,name:'EQA3.13 civilian-rich contact before extraction',
 layout:'corridor',rooms:[{id:'hall',x:80,y:140,w:420,h:210,
 kind:'room',purpose:'hall',tone:1}],roomCount:1,
 walls:[],cover:[],doors:[],windows:[],enemies:[],
 spawn:[p(300,200),p(300,245),p(300,290),p(300,330)],
 entrance:p(300,200),objective:p(285,200),extract:p(475,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
test('EQA3.13 actual panicked crowd does not block an explicit close-range SECURE after GO',()=>{
 const s=newSession(0,31313,'floor-plan','small','rescue',
  site(),{enableCivilians:true});
 try{
  const actor=team(s)[0],target=s.civilians.find(c=>c.rescueTarget);
  assert.ok(target);
  for(const other of team(s))if(other!==actor)other.health=0;
  actor.p=p(300,200);actor.priorP={...actor.p};
  actor.heading=0;actor.weaponYaw=0;
  target.p=p(285,200);target.priorP={...target.p};
  s.scenario.objective={...target.p};s.mission='secure';
  for(let i=0;i<4;i++)s.civilians.push(createCivilian({
   id:'civ:313:contact:'+i,role:'visitor',
   persona:'steady',activity:'idle',heading:0,
   position:p(350+(i%2)*40,220+Math.floor(i/2)*58),
   roomId:'hall',appearanceSeed:100+i
  }));
  s.noise.push({id:313131,p:p(310,200),radius:185,
   kind:'gunshot',time:0});
  toggling(s);
  for(let i=0;i<17&&s.phase==='running';i++)
   stepSession(s,1/60);
  assert.ok(target.fear>.4,'real audible threat should frighten the rescue target');
  assert.notEqual(target.state,'routine');
  toggling(s); // pause for a deliberate user order
  assert.equal(planCivilianInteraction(s,actor.id,target.id,'secure'),true,
   'a physically reachable frightened target may be secured even off-axis');
  assert.notEqual(target.state,'compliant',
   'authoring alone must never mutate custody');
  toggling(s);
  for(let i=0;i<150&&s.phase==='running'&&target.state!=='compliant';i++)
   stepSession(s,1/60);
  assert.equal(target.state,'compliant',
   'the real hands-forward contact should complete under live GO');
  assert.equal(target.restrained,false,'SECURE does not create physical cuffs');
  assert.equal(target.following,null,'SECURE never teleports into FOLLOW');
  assert.equal(s.mission,'extract');
  assert.ok(Number.isFinite(actor.lastCivilianContactAt));
  assert.equal(s.civilians.length,5,'other people remain in the world');
 }finally{activateSite(null);}
});
