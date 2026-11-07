import test from 'node:test';
import assert from 'node:assert/strict';
import {entryLanes} from '../src/breach-entry-lanes.ts';

const door={id:'ENTRY',a:{x:200,y:300},b:{x:248,y:300},
 open:true,openedAt:0,hinge:'a',swing:-1,kind:'hinged'};
const from={x:224,y:345};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const check=(slots,center,axis)=>{
 for(let i=0;i<slots.length;i++){
  const a=slots[i];
  const offset=(a.point.x-center.x)*axis.x+
   (a.point.y-center.y)*axis.y;
  if(Math.abs(offset)>.01){
   const side=offset<0?'left':'right';
   assert.equal(a.side,side,'sector must label actual physical flank');
   const dir=(a.look.x-a.point.x)*axis.x+
    (a.look.y-a.point.y)*axis.y;
   assert.ok(dir*offset>0,'look target must continue into the assigned flank');
  }
  assert.ok(Number.isFinite(a.look.x)&&Number.isFinite(a.look.y));
  for(let j=0;j<i;j++)assert.ok(gap(a.point,slots[j].point)>=23-.0001,
   'sector positions cannot overlap');
 }
};

test('B6: open room uses four truly distinct bilateral flank/look sectors',()=>{
 const slots=entryLanes(door,from,4,()=>true);
 assert.equal(slots.length,4);
 assert.deepEqual(slots.map(s=>s.side),['left','right','left','right']);
 assert.ok(slots.every(s=>s.point.y<300));
 check(slots,{x:224,y:300},{x:1,y:0});
 assert.deepEqual(entryLanes(door,from,4,()=>true),slots,
  'sector allocation must be deterministic');
});

test('B6: actual sector and look follow fallback flank, not requested slot index',()=>{
 // Only the right half of this room is physically viable.
 // The fallback must never label a positive-X slot as left/watching left.
 const slots=entryLanes(door,from,4,p=>p.x>=229&&p.x<=264);
 assert.equal(slots.length,4,
  'several stepped, right-side destinations are available');
 assert.ok(slots.every(s=>s.side==='right'));
 check(slots,{x:224,y:300},{x:1,y:0});
});

test('B7: corner-fed bounded fallback finds depth-staggered real lanes',()=>{
 const viable=p=>p.x>=232&&p.x<=263&&p.y<300&&p.y>55;
 const one=entryLanes(door,from,4,viable);
 const two=entryLanes(door,from,4,viable);
 assert.equal(one.length,4,'a crowded but valid flank is not falsely rejected');
 assert.deepEqual(one,two);
 check(one,{x:224,y:300},{x:1,y:0});
 assert.ok(Math.max(...one.map(s=>s.point.x))-
  Math.min(...one.map(s=>s.point.x))>=18);
});

test('B7: unviable one-body-wide passage remains a failed template',()=>{
 assert.deepEqual(entryLanes(door,from,4,p=>p.x>=223&&p.x<=225),[]);
});

test('B7: rotated vertical threshold assigns actual vertical flank',()=>{
 const vertical={...door,a:{x:300,y:200},b:{x:300,y:248}};
 const slots=entryLanes(vertical,{x:345,y:224},4,()=>true);
 assert.equal(slots.length,4);
 assert.ok(slots.every(s=>s.point.x<300));
 check(slots,{x:300,y:224},{x:0,y:1});
});

test('B7: returned look targets always advance inward, not behind the door',()=>{
 const slots=entryLanes(door,from,4,()=>true);
 for(const slot of slots)
  assert.ok(slot.look.y<slot.point.y,
   'entry facing must point deeper into room');
});

test('B10: fallback search keeps explicit planning probes bounded',()=>{
 let probes=0;
 const impossible=p=>{
  probes++;
  return p.x>=223&&p.x<=225&&p.y<300;
 };
 const snapshot=structuredClone(door);
 assert.deepEqual(entryLanes(door,from,4,impossible),[]);
 assert.ok(probes<200,
  'a tiny failed room must not trigger a heavy pathfinding search: '+probes);
 assert.deepEqual(door,snapshot,'planning cannot mutate the actual door');
});

test('B10: planning two surviving operators needs no artificial four-lane width',()=>{
 const slots=entryLanes(door,from,2,p=>p.x>=222&&p.x<=226);
 assert.equal(slots.length,2);
 for(let i=1;i<slots.length;i++)
  assert.ok(gap(slots[0].point,slots[i].point)>=23);
});
