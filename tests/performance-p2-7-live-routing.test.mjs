import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCivilianRefuge} from '../src/breach-civilian-refuge.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {routeWithNormalWorld,recoverNormalLane} from '../src/breach-squeeze-route.ts';
import {sweptProfileClear} from '../src/breach-navigation.ts';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const courseLength=(from,path)=>{
 let length=0,prior=from;
 for(const p of path){length+=distance(prior,p);prior=p;}
 return length;
};
// Frozen unoptimized reference. Compare the actual output point-for-point
// instead of relying only on an FPS measurement or a single happy route.
function referenceRecover(from,to,doors,world){
 const direct=routeWithNormalWorld(from,to,doors,world);
 if(direct.length)return direct;
 const dist=distance(from,to);
 if(dist<12)return [];
 const fx=(to.x-from.x)/dist,fy=(to.y-from.y)/dist;
 const sx=-fy,sy=fx;
 for(const lateral of [16,28,40]){
  for(const back of [0,12]){
   for(const sign of [1,-1]){
    const escape={x:from.x+sx*lateral*sign-fx*back,
     y:from.y+sy*lateral*sign-fy*back};
    if(!sweptProfileClear(from,escape,doors,0,'normal',world))continue;
    const onward=routeWithNormalWorld(escape,to,doors,world);
    if(!onward.length)continue;
    if(distance(escape,from)+courseLength(escape,onward)>dist*1.75+40)
      continue;
    return [escape,...onward];
   }
  }
 }
 return [];
}
function worldFor(barriers){
 let calls=0;
 const world={passable(p,r=8){
  calls++;
  if(p.x < -115+r||p.x>230-r||
   p.y<-100+r||p.y>100-r)return false;
  return !barriers.some(b=>p.x>b.x0-r&&p.x<b.x1+r&&
    p.y>b.y0-r&&p.y<b.y1+r);
 }};
 return {world,get calls(){return calls;}};
}
test('P2.7 recovery reuses geometry answers without changing swept routes',()=>{
 const fixtures=[
  {barriers:[{x0:48,x1:93,y0:-19,y1:19}],
   from:{x:0,y:0},to:{x:140,y:0}},
  {barriers:[{x0:44,x1:80,y0:-100,y1:100}],
   from:{x:0,y:0},to:{x:152,y:0}},
  {barriers:[],from:{x:16,y:0},to:{x:122,y:17}}
 ];
 for(const fixture of fixtures){
  const old=worldFor(fixture.barriers);
  const expected=referenceRecover(fixture.from,fixture.to,[],old.world);
  const current=worldFor(fixture.barriers);
  const actual=recoverNormalLane(fixture.from,fixture.to,[],current.world);
  assert.deepEqual(actual,expected,
   'memoization must not alter any point or route decision');
  assert.ok(current.calls<=old.calls,
   'the exact-cache recovery must never make extra clearance queries');
 }
});

function legacyRefuge(c,world){
 const threat=c.threatEstimate;
 if(!threat)return null;
 const current=distance(c.p,threat);
 const candidates=[...c.refugePoints,...c.routine].filter(p=>
  distance(p,c.p)>20&&distance(p,threat)>=current+15&&
  !world.isCrowded?.(p))
 .sort((a,b)=>{
  const grade=p=>
   Math.min(250,distance(p,threat))-
   .17*distance(p,c.p)+
   (world.canSee&&!world.canSee(threat,p)?32:0);
  return grade(b)-grade(a)||a.x-b.x||a.y-b.y;
 });
 for(const p of candidates.slice(0,6)){
  if(world.canReach(c.p,p))return {goal:{...p},path:[]};
  if(!world.routeTo)continue;
  const waypoints=world.routeTo(c.p,p);
  if(!waypoints.length||distance(waypoints.at(-1),p)>20)continue;
  const path=waypoints.filter(q=>distance(q,c.p)>5);
  if(!path.length)continue;
  let last=c.p,pass=true;
  for(const next of path){
   if(!world.canReach(last,next)){pass=false;break;}
   last=next;
  }
  if(pass)return {goal:{...p},path};
 }
 return null;
}
test('P2.7 refugee LOS scores are once-per-candidate and preserve original decision',()=>{
 const c=createCivilian({id:'refuge-test',role:'resident',persona:'steady',
  activity:'idle',position:{x:35,y:35},heading:0,
  roomId:'main',appearanceSeed:22});
 c.threatEstimate={x:68,y:37};
 c.refugePoints=Array.from({length:15},(_,i)=>({
  x:15+i*9,y:100+(i%3)*23
 }));
 c.routine=[{x:180,y:120},{x:170,y:88},{x:55,y:75}];
 let before=0,after=0;
 const world=increment=>({
  canReach:(from,to)=>to.x>100,
  routeTo:(from,to)=>[to],
  isCrowded:p=>p.x===-999,
  canSee:(from,to)=>{
   increment();
   return Math.round(to.x*3+to.y*7)%4===0;
  }
 });
 const expected=legacyRefuge(c,world(()=>before++));
 const actual=chooseCivilianRefuge(c,world(()=>after++));
 assert.deepEqual(actual,expected,'refuge endpoint/route must match legacy');
 assert.ok(after<=c.refugePoints.length+c.routine.length);
 assert.ok(after<before,'expensive LOS calls are not repeated during sort');
});
