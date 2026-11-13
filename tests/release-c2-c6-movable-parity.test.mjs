import test from 'node:test';import assert from 'node:assert/strict';
import {relocateCover,coverPushDistance,canRelocateCover,autoShoveLightCover}
 from '../src/breach-movable-cover.ts';
import {segmentHitsBox} from '../src/breach-ray.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const overlaps=(a,b,pad=5)=>
 Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&Math.abs(a.y-b.y)<(a.h+b.h)/2+pad;
function reference(cover,index,to,walls,doors,actors){
 const old=cover[index];
 if(!old||!canRelocateCover(old))return false;
 const displacement=Math.hypot(to.x-old.x,to.y-old.y);
 if(displacement<=0||displacement>coverPushDistance(old)+.01)return false;
 const steps=Math.max(1,Math.ceil(displacement/3));
 for(let i=1;i<=steps;i++){
  const t=i/steps,target={...old,x:old.x+(to.x-old.x)*t,y:old.y+(to.y-old.y)*t};
  const expanded={...target,w:target.w+4,h:target.h+4};
  if(walls.some(w=>segmentHitsBox(w.a,w.b,expanded)))return false;
  if(cover.some((o,j)=>j!==index&&overlaps(target,o)))return false;
  if(actors.some(a=>{
   if(Math.abs(a.x-target.x)>=target.w/2+9||
      Math.abs(a.y-target.y)>=target.h/2+9)return false;
   if(Math.abs(a.x-old.x)<old.w/2+9&&Math.abs(a.y-old.y)<old.h/2+9){
    if(Math.hypot(a.x-old.x,a.y-old.y)<
       Math.hypot(a.x-target.x,a.y-target.y)-.001)return false;
   }
   return true;
  }))return false;
  const hinge={...target,w:target.w+18,h:target.h+18};
  if(doors.some(d=>{const leaf=doorLeafSegment(d);
    return segmentHitsBox(leaf.a,leaf.b,hinge);}))return false;
 }
 cover[index]={...old,x:to.x,y:to.y};return true;
}
test('C6: swept-local broadphase preserves exact original acceptance and cover state',()=>{
 const random=rng(61737);
 for(let i=0;i<300;i++){
  const source=[{id:'m',fixture:'chair',x:60+random()*300,
    y:60+random()*300,w:19+random()*17,h:14+random()*23}];
  for(let k=0;k<20;k++)source.push({
   id:'cover'+k,fixture:k%2?'crate':'table',
   x:random()*440,y:random()*440,w:15+random()*55,h:15+random()*50});
  const walls=Array.from({length:12},()=>({
    a:{x:random()*440,y:random()*440},
    b:{x:random()*440,y:random()*440}}));
  const doors=Array.from({length:6},(_,k)=>({
    id:'D'+k,a:{x:random()*440,y:random()*440},
    b:{x:random()*440,y:random()*440},
    open:random()>.5,openedAt:-1,openFraction:random(),hinge:'a',swing:1
   }));
  const actors=Array.from({length:7},()=>({x:random()*440,y:random()*440}));
  const theta=random()*Math.PI*2,len=1+random()*14;
  const to={x:source[0].x+Math.cos(theta)*len,
    y:source[0].y+Math.sin(theta)*len};
  const a=structuredClone(source),b=structuredClone(source);
  assert.equal(relocateCover(a,0,to,walls,doors,actors),
    reference(b,0,to,walls,doors,actors),'trial '+i);
  assert.deepEqual(a,b,'exactly same state and stable IDs '+i);
 }
});
test('C6: one localized contact shove retains stable identity and does not conjure bodies',()=>{
 const cover=[{id:'chair',fixture:'chair',x:100,y:100,w:18,h:18}];
 const moved=autoShoveLightCover(cover,{x:82,y:100},
   {x:97,y:100},[],[],[]);
 assert.equal(moved,0);
 assert.equal(cover.length,1);
 assert.equal(cover[0].id,'chair');
});
