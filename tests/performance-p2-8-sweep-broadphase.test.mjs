import test from 'node:test';
import assert from 'node:assert/strict';
import {pointToSegment,doorLeafSegment,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {sweptBodyClear,sweptProfileClear,profileSamples}
 from '../src/breach-navigation.ts';

// Independent P2.7-era reference: preserve penetration, escape, sample order,
// full-body radius and oriented shoulders. Do not replace this with an output
// of the optimized implementation.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const gap=(p,door)=>pointToSegment(p,doorLeafSegment(door));
function oldBody(from,to,doors,radius,world){
 const steps=Math.max(1,Math.ceil(distance(from,to)/4));
 const trapped=doors.filter(door=>gap(from,door)<radius+1);
 for(let i=1;i<=steps;i++){
  const f=i/steps;
  const at={x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f};
  if(!world.passable(at,radius))return false;
  for(const door of doors){
   const g=gap(at,door);
   if(g>=radius+1)continue;
   const initial=gap(from,door);
   if(!trapped.includes(door)||g+1e-5<initial)return false;
   if(i===steps&&g<radius+1&&
      g<initial+Math.min(.04,distance(from,to)*.04))return false;
  }
 }
 return true;
}
function oldSqueeze(from,to,doors,heading,world){
 const steps=Math.max(1,Math.ceil(distance(from,to)/2.5));
 for(let i=1;i<=steps;i++){
  const t=i/steps,at={x:from.x+(to.x-from.x)*t,
    y:from.y+(to.y-from.y)*t};
  const start=profileSamples(from,heading,'squeeze');
  const current=profileSamples(at,heading,'squeeze');
  for(let j=0;j<current.length;j++){
   const sample=current[j],startSample=start[j];
   if(!world.passable(sample.position,sample.radius))return false;
   for(const door of doors){
    const g=gap(sample.position,door),before=gap(startSample.position,door);
    if(g<sample.radius+1&&
       (before>=sample.radius+1||g+1e-5<before||
        i===steps&&g<before+Math.min(.04,distance(from,to)*.04)))
     return false;
   }
  }
 }
 return true;
}
function door(id,x,y,kind='hinged'){
 return {id,kind,a:{x,y},b:{x:x+30,y},open:true,
  openFraction:.45,hinge:'a',swing:-1,slideDirection:1};
}
const blocked=[
 {minX:45,maxX:65,minY:68,maxY:108},
 {minX:117,maxX:139,minY:37,maxY:59}
];
const world={passable(p,r){
 if(p.x<r||p.y<r||p.x>270-r||p.y>220-r)return false;
 return !blocked.some(b=>p.x>b.minX-r&&p.x<b.maxX+r&&
   p.y>b.minY-r&&p.y<b.maxY+r);
}};
const rand=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;

test('P2.8 exact broadphase preserves body and squeeze decisions at animated hinges and sliding/shutter panels',()=>{
 const all=[
  door('hinge',110,70),
  door('sliding',180,160,'sliding'),
  door('shutter',65,140,'shutter'),
  ...Array.from({length:24},(_,i)=>door('remote-'+i,450+i*45,500))
 ];
 const random=rand(28371);
 for(let i=0;i<320;i++){
  const from={x:12+random()*240,y:12+random()*190};
  const to={x:from.x+(random()-.5)*100,y:from.y+(random()-.5)*75};
  const heading=random()*Math.PI*2;
  // Hinge and sliding geometry change on every iteration. A persistent
  // broadphase cache would fail this fixture.
  all[0].openFraction=random();
  all[0].hinge=i%2?'a':'b';
  all[1].openFraction=random();
  all[1].slideDirection=i%2?1:-1;
  all[2].openFraction=random();
  for(const r of [OPERATOR_RADIUS,4,11]){
   assert.equal(sweptBodyClear(from,to,all,r,world),
    oldBody(from,to,all,r,world),
    'full-body parity iteration '+i+' radius '+r);
  }
  assert.equal(sweptProfileClear(from,to,all,heading,'squeeze',world),
    oldSqueeze(from,to,all,heading,world),
    'squeeze parity iteration '+i);
 }
});

test('P2.8 distant swinging leaves are filtered without reusing a stale door snapshot',()=>{
 const from={x:120,y:80},to={x:140,y:83};
 const near=door('near',245,181),far=door('far',900,940);
 let lookups=0;
 let fraction=.45;
 Object.defineProperty(far,'openFraction',{get(){lookups++;return fraction;}});
 const all=[near,far];
 const expected=oldBody(from,to,all,OPERATOR_RADIUS,world);
 const originalCalls=lookups;lookups=0;
 assert.equal(sweptBodyClear(from,to,all,OPERATOR_RADIUS,world),expected);
 assert.ok(lookups<originalCalls,
  'far hinges should be inspected only once instead of on every sweep sample');
 fraction=.95;
 assert.equal(sweptBodyClear(from,to,all,OPERATOR_RADIUS,world),
  oldBody(from,to,all,OPERATOR_RADIUS,world));
});
