import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,passable,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {routeWithSqueezeWorld,routeWithNormalWorld,routeWithSqueezeIntel,
  COMFORT_RADIUS} from '../src/breach-squeeze-route.ts';
import {sweptBodyClear,profileSamples,squeezeFacing}
  from '../src/breach-navigation.ts';
import {newSession,team,planMove,stepSession} from '../src/breach-game.ts';

const p=(x,y)=>({x,y});
const site={
 seed:2008,name:'NORMAL-LANE PRIORITY',layout:'corridor',training:true,
 rooms:[],roomCount:0,doors:[],windows:[],enemies:[],
 walls:[],cover:[],entrance:p(120,120),
 spawn:[p(120,120),p(118,230),p(139,255),p(158,280)],
 objective:p(312,120),extract:p(312,120),
 bounds:{minX:0,minY:0,maxX:420,maxY:320}
};
const length=(from,path)=>{
 let sum=0,prev=from;
 for(const point of path){sum+=Math.hypot(point.x-prev.x,point.y-prev.y);prev=point;}
 return sum;
};
const swept=(from,path,r=OPERATOR_RADIUS)=>{
 let prev=from;
 for(const pt of path){
  const d=Math.hypot(pt.x-prev.x,pt.y-prev.y);
  for(let i=1;i<=Math.max(1,Math.ceil(d/2));i++){
   const f=i/Math.max(1,Math.ceil(d/2));
   if(!passable(p(prev.x+(pt.x-prev.x)*f,prev.y+(pt.y-prev.y)*f),r))return false;
  }
  prev=pt;
 }
 return true;
};

test('an incidental furniture graze receives a full-body detour, not a squeeze shortcut',()=>{
 activateSite({...site,cover:[{x:205,y:126,w:26,h:20,fixture:'desk'}]});
 try{
  const from=p(120,120),goal=p(295,120);
  const route=routeWithSqueezeWorld(from,goal,[]);
  assert.ok(route.length);
  assert.ok(swept(from,route,OPERATOR_RADIUS),
   'normal-body clearance must be valid for the entire chosen line');
  assert.ok(route.some(point=>Math.abs(point.y-120)>11),
   'naturally take space away from the edge of the desk');
  assert.deepEqual(route.at(-1),goal);
 }finally{activateSite(null);}
});

test('a few units of lateral clearance are preferred when the roomy lane is affordable',()=>{
 activateSite({...site,cover:[{x:210,y:143,w:42,h:18,fixture:'desk'}]});
 try{
  const from=p(120,120),goal=p(310,120);
  const line=routeWithNormalWorld(from,goal,[]);
  assert.ok(line.length);
  assert.ok(swept(from,line,OPERATOR_RADIUS));
  // Either stay comfortably clear, or use ordinary clearance if the
  // extra padding would force a materially longer route.
  const roomy=swept(from,line,COMFORT_RADIUS);
  if(!roomy)assert.ok(length(from,line)<285);
  assert.deepEqual(line.at(-1),goal);
 }finally{activateSite(null);}
});

test('normal passage must beat a shorter direct squeeze when a walkable detour exists',()=>{
 activateSite({...site,walls:[
  {a:p(205,20),b:p(205,150)},
  {a:p(205,165),b:p(205,295)}
 ]});
 try{
  const from=p(145,157),goal=p(275,157);
  const wide=routeWithNormalWorld(from,goal,[]);
  assert.ok(wide.length,'a normal-body trip around the wall end exists');
  const route=routeWithSqueezeWorld(from,goal,[]);
  assert.ok(route.length);
  assert.ok(swept(from,route,OPERATOR_RADIUS),
   'avoid the 15-unit aperture rather than squeeze through it');
  assert.ok(length(from,route)>=130,'a full-shoulder detour is not a narrow shortcut');
  const known={mode:'full-view',walls:new Set([0,1]),
   cover:new Set(),doors:new Set(),rooms:new Set(),doorMemory:new Map()};
  const preview=routeWithSqueezeIntel(known,from,goal);
  assert.ok(preview.length);
  assert.ok(swept(from,preview,OPERATOR_RADIUS));
 }finally{activateSite(null);}
});

test('a genuinely tight aperture still permits the oriented narrow profile',()=>{
 activateSite({...site,walls:[
  {a:p(205,0),b:p(205,150)},
  {a:p(205,165),b:p(205,320)}
 ]});
 try{
  const from=p(170,157),goal=p(240,157);
  // Established genuine-squeeze fixture contract remains in place:
  // here we assert profile geometry only; existing 190A tests assert
  // full narrow routing through deliberately enclosed apertures.
  const samples=profileSamples(p(205,157),squeezeFacing(0),'squeeze');
  assert.ok(samples.every(s=>passable(s.position,s.radius)));
  assert.equal(passable(p(205,157),OPERATOR_RADIUS),false);
 }finally{activateSite(null);}
});

test('ordinary actor travel beside known furniture does not enter squeeze',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',{
  ...site,cover:[{x:200,y:130,w:26,h:26,fixture:'desk'}]
 });
 try{
  const actor=team(s).find(x=>x.id==='rook');
  assert.ok(actor);
  assert.ok(planMove(s,actor.id,p(306,120)));
  s.phase='running';
  let squeezed=0;
  for(let i=0;i<360;i++){
   stepSession(s,1/60);
   if(actor.squeeze)squeezed++;
  }
  assert.equal(squeezed,0,'an open walking lane must not trigger squeeze pose');
  assert.ok(actor.p.x>280,'operator should pass the prop, not stall or detour forever');
 }finally{activateSite(null);}
});
