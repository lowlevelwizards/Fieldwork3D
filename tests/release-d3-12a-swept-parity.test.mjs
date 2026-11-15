import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorLeafSegment,pointToSegment,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const p=(x,y)=>({x,y});
const gap=(point,leaf)=>pointToSegment(point,leaf);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// Frozen pre-D3.12A collision logic, intentionally independent of the
// production implementation. Compare true/false results, not just the
// absence of invalid positions in a generated-site session.
function originalSweptBodyClear(from,to,doors,radius,world){
 const steps=Math.max(1,Math.ceil(distance(from,to)/4));
 const reach=radius+1;
 const minX=Math.min(from.x,to.x)-reach,maxX=Math.max(from.x,to.x)+reach;
 const minY=Math.min(from.y,to.y)-reach,maxY=Math.max(from.y,to.y)+reach;
 const candidates=doors.map(door=>({door,leaf:doorLeafSegment(door)}))
  .filter(({leaf})=>Math.max(leaf.a.x,leaf.b.x)>=minX&&
    Math.min(leaf.a.x,leaf.b.x)<=maxX&&
    Math.max(leaf.a.y,leaf.b.y)>=minY&&
    Math.min(leaf.a.y,leaf.b.y)<=maxY);
 const trapped=candidates.filter(({leaf})=>gap(from,leaf)<radius+1);
 for(let i=1;i<=steps;i++){
  const f=i/steps;
  const at={x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f};
  if(!world.passable(at,radius))return false;
  for(const item of candidates){
   const g=gap(at,item.leaf);
   if(g>=radius+1)continue;
   const initial=gap(from,item.leaf);
   if(!trapped.includes(item)||g+1e-5<initial)return false;
   if(i===steps&&g<radius+1&&
      g<initial+Math.min(.04,distance(from,to)*.04))return false;
  }
 }
 return true;
}

const door=(id,x,y,hinge,swing,fraction)=>({
 id,a:p(x,y),b:p(x+42,y),kind:'hinged',hinge,swing,
 open:fraction>0,openFraction:fraction
});
const floor={passable:()=>true};
test('D3.12A physical sweep parity: closed, ajar, fully open, both hinges',()=>{
 let count=0;
 for(const hinge of ['a','b'])for(const swing of [-1,1])
  for(const fraction of [0,.01,.15,.40,.72,1,1.55]){
   const doors=[door('D',200,250,hinge,swing,fraction)];
   for(const x of [176,194,208,219,239,258])
    for(const y of [232,247,255,273,300])
     for(const dx of [-20,-7,0,11,29])
      for(const dy of [-17,0,9,32]){
       const from=p(x,y),to=p(x+dx,y+dy);
       assert.equal(sweptBodyClear(from,to,doors,OPERATOR_RADIUS,floor),
        originalSweptBodyClear(from,to,doors,OPERATOR_RADIUS,floor),
        'mismatch at '+JSON.stringify({hinge,swing,fraction,from,to}));
       count++;
      }
  }
 assert.ok(count>=10000);
});
test('D3.12A same-world multi-door and static cover parity across sampled routes',()=>{
 let seed=123456789;
 const rnd=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/2**32);
 const coverWorld={passable:(pt,r)=>pt.x>20+r&&pt.y>20+r&&
  pt.x<600-r&&pt.y<600-r&&
  !(pt.x>340-r&&pt.x<375+r&&pt.y>290-r&&pt.y<335+r)};
 for(let i=0;i<2600;i++){
  const x=90+rnd()*410,y=100+rnd()*350;
  const a=p(x,y),b=p(x+(rnd()-.5)*140,y+(rnd()-.5)*140);
  const doors=[
   door('front',200,250,i%2?'a':'b',i%3?-1:1,rnd()*1.55),
   door('rear',390,345,i%3?'b':'a',i%2?1:-1,rnd()*1.55)
  ];
  const radius=i%3===0?3.8:OPERATOR_RADIUS;
  assert.equal(sweptBodyClear(a,b,doors,radius,coverWorld),
   originalSweptBodyClear(a,b,doors,radius,coverWorld),
   'multi-door parity at case '+i);
 }
});
test('D3.12A no persisted door-angle distances or clearance exceptions',()=>{
 const code=readFileSync(new URL('../src/breach-navigation.ts',import.meta.url),'utf8');
 assert.match(code,/const candidates=doorsNearSweep\(from,to,doors,radius\+1\)/);
 assert.match(code,/const initialGaps=candidates\.map\(item=>pointToSegment\(from,item\.leaf\)\)/);
 assert.match(code,/if\(initial>=radius\+1\|\|gap\+1e-5<initial\)return false/);
 assert.match(code,/if\(i===steps&&gap<initial\+releaseProgress\)return false/);
});
