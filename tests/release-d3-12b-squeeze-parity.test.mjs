import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorLeafSegment,pointToSegment}
 from '../src/breach-core.ts';
import {profileSamples,sweptProfileClear,SQUEEZE_RADIUS}
 from '../src/breach-navigation.ts';
const p=(x,y)=>({x,y});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const door=(id,x,y,hinge,swing,fraction)=>({
 id,a:p(x,y),b:p(x+42,y),kind:'hinged',hinge,swing,
 open:fraction>0,openFraction:fraction
});
// Frozen pre-B squeeze-clearance rule: a distinct implementation retained
// for result parity, including original per-sample start-gap computation.
function original(from,to,doors,heading,world){
 const steps=Math.max(1,Math.ceil(dist(from,to)/2.5));
 const reach=SQUEEZE_RADIUS+1+3.25;
 const minX=Math.min(from.x,to.x)-reach,maxX=Math.max(from.x,to.x)+reach;
 const minY=Math.min(from.y,to.y)-reach,maxY=Math.max(from.y,to.y)+reach;
 const candidates=doors.map(d=>({leaf:doorLeafSegment(d)}))
  .filter(({leaf})=>Math.max(leaf.a.x,leaf.b.x)>=minX&&
   Math.min(leaf.a.x,leaf.b.x)<=maxX&&
   Math.max(leaf.a.y,leaf.b.y)>=minY&&
   Math.min(leaf.a.y,leaf.b.y)<=maxY);
 const start=profileSamples(from,heading,'squeeze');
 const finalOverlapProgress=Math.min(.04,dist(from,to)*.04);
 for(let i=1;i<=steps;i++){
  const t=i/steps,at=p(from.x+(to.x-from.x)*t,
   from.y+(to.y-from.y)*t);
  const current=profileSamples(at,heading,'squeeze');
  for(let j=0;j<current.length;j++){
   const sample=current[j],startSample=start[j];
   if(!world.passable(sample.position,sample.radius))return false;
   for(const item of candidates){
    const gap=pointToSegment(sample.position,item.leaf),
     before=pointToSegment(startSample.position,item.leaf);
    if(gap<sample.radius+1&&
      (before>=sample.radius+1||gap+1e-5<before||
       i===steps&&gap<before+finalOverlapProgress))
      return false;
   }
  }
 }
 return true;
}
test('D3.12B narrow body: original vs cached across real hinge positions',()=>{
 const world={passable:()=>true};
 let cases=0;
 for(const hinge of ['a','b'])for(const swing of [-1,1])
  for(const angle of [0,.28,.55,.9,1.55])
   for(const heading of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5]){
    const ds=[door('D',200,250,hinge,swing,angle)];
    for(const dx of [-22,-5,0,11,34])
     for(const dy of [-17,0,14,38]){
      const start=p(199,255),end=p(start.x+dx,start.y+dy);
      assert.equal(sweptProfileClear(start,end,ds,heading,'squeeze',world),
        original(start,end,ds,heading,world),
        JSON.stringify({hinge,swing,angle,heading,start,end}));
      cases++;
     }
   }
 assert.equal(cases,2000);
});
test('D3.12B three-point parity across random moves, doors and furniture',()=>{
 let seed=246813579;
 const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const floor={passable:(pt,r)=>pt.x>22+r&&pt.y>22+r&&
   pt.x<600-r&&pt.y<600-r&&
   !(pt.x>310-r&&pt.x<354+r&&pt.y>260-r&&pt.y<315+r)};
 for(let i=0;i<3800;i++){
  const start=p(80+rnd()*450,75+rnd()*440);
  const end=p(start.x+(rnd()-.5)*105,start.y+(rnd()-.5)*105);
  const heading=rnd()*Math.PI*2;
  const ds=[door('FRONT',200,250,i%2?'a':'b',i%3?1:-1,rnd()*1.55),
    door('SIDE',380,340,i%3?'b':'a',i%2?-1:1,rnd()*1.55)];
  assert.equal(sweptProfileClear(start,end,ds,heading,'squeeze',floor),
   original(start,end,ds,heading,floor),'random squeeze parity '+i);
 }
});
test('D3.12B retains three original profile samples and zero persistent cache',()=>{
 const source=readFileSync(new URL('../src/breach-navigation.ts',import.meta.url),'utf8');
 assert.match(source,/const start=profileSamples\(from,heading,'squeeze'\)/);
 assert.match(source,/const current=profileSamples\(at,heading,'squeeze'\)/);
 assert.match(source,/const initialGaps=candidates\.map\(item=>\s*start\.map\(sample=>pointToSegment\(sample\.position,item\.leaf\)\)\)/);
 assert.match(source,/if\(gap>=sample\.radius\+1\)continue/);
 assert.match(source,/if\(before>=sample\.radius\+1\|\|gap\+1e-5<before\|\|/);
});
