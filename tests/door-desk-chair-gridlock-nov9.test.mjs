import test from 'node:test';
import assert from 'node:assert/strict';
import {planDoorSwings} from '../src/worldgen/door-swing-planner.ts';
import {doorLeafSegment,COVER,activateSite,passable} from '../src/breach-core.ts';
import {newSession,planMove,team,toggling,stepSession} from '../src/breach-game.ts';

test('door facing a desk selects a physically unobstructed hinge and swing',()=>{
 const door={id:'OFFICE',a:{x:100,y:50},b:{x:100,y:98},
   kind:'hinged',open:false,openedAt:-1};
 const desk={x:131,y:75,w:42,h:38,fixture:'desk'};
 const site={
  archetype:'office',
  rooms:[
   {id:'H',purpose:'hallway',kind:'room',x:0,y:0,w:100,h:160,tone:0},
   {id:'R',purpose:'office',kind:'room',x:100,y:0,w:125,h:160,tone:0}
  ],doors:[door],cover:[desk],walls:[],spawn:[],enemies:[],
  objective:{x:300,y:300}
 };
 const planned=planDoorSwings(site).doors[0];
 for(let fraction=.14;fraction<=1;fraction+=.025){
  const leaf=doorLeafSegment({...planned,open:true,openFraction:fraction});
  for(const t of [.35,.55,.75,.94,.99]){
   const p={x:leaf.a.x+(leaf.b.x-leaf.a.x)*t,
    y:leaf.a.y+(leaf.b.y-leaf.a.y)*t};
   assert.ok(Math.abs(p.x-desk.x)>=desk.w/2+1.25||
       Math.abs(p.y-desk.y)>=desk.h/2+1.25,
    'the live door must not stop inside the desk');
  }
 }
});

test('no-route contact with interlocked chairs clears clutter without ghosting',()=>{
 const site={
  seed:956,name:'CHAIR GRIDLOCK',layout:'corridor',training:true,
  rooms:[],roomCount:0,doors:[],
  walls:[
   {a:{x:90,y:100},b:{x:270,y:100}},
   {a:{x:90,y:145},b:{x:270,y:145}},
   {a:{x:90,y:100},b:{x:90,y:145}},
   {a:{x:270,y:100},b:{x:270,y:145}}
  ],cover:[],entrance:{x:120,y:122},
  spawn:[{x:120,y:122},{x:120,y:190},{x:120,y:218},{x:120,y:247}],
  enemies:[],windows:[],objective:{x:242,y:122},
  extract:{x:242,y:122},bounds:{minX:0,minY:0,maxX:360,maxY:300}
 };
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 const a=team(s)[0];
 try{
  assert.ok(planMove(s,a.id,{x:242,y:122}),'move authored before chairs jam');
  s.coverState.push(
   {x:168,y:122,w:24,h:24,fixture:'chair',low:true},
   {x:194,y:122,w:24,h:24,fixture:'chair',low:true}
  );
  COVER.splice(0,COVER.length,...s.coverState);
  s.objectRevision++;
  toggling(s);
  let recovered=false;
  for(let i=0;i<850;i++){
   const previous={...a.p};
   stepSession(s,1/60);
   assert.ok(Math.hypot(a.p.x-previous.x,a.p.y-previous.y)<5,
    'no collision escape teleport');
   assert.ok(a.p.y>109&&a.p.y<136,
    'operator stays between solid corridor walls');
   if(s.coverState.some(o=>o.toppled)||a.p.x>178){recovered=true;break;}
  }
  assert.ok(recovered,'operator remains stuck on the chairs');
  assert.ok(passable(a.p),'operator must stay at a legal physical position');
 }finally{activateSite(null);}
});
