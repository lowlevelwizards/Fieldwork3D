import test from 'node:test';
import assert from 'node:assert/strict';
import {entryLanes} from '../src/breach-entry-lanes.ts';
import {newSession,team,planSquadEntry}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const horizontal={id:'H',a:{x:200,y:300},b:{x:248,y:300},
 open:false,openedAt:-1};
test('149: four-person entry gives four separate interior positions',()=>{
 const slots=entryLanes(horizontal,{x:224,y:343},4,()=>true);
 assert.equal(slots.length,4);
 for(let i=0;i<4;i++){
   assert.ok(slots[i].point.y<300);
   assert.equal(slots[i].side,i%2===0?'left':'right');
   assert.ok(Number.isFinite(slots[i].look.x));
   for(let j=0;j<i;j++)
     assert.ok(Math.hypot(slots[i].point.x-slots[j].point.x,
       slots[i].point.y-slots[j].point.y)>=22);
 }
});
test('149: corner-fed entries find alternative lanes without overlap',()=>{
 const slots=entryLanes(horizontal,{x:224,y:350},4,
   p=>p.x>=213&&p.x<=264);
 assert.equal(slots.length,4);
 assert.ok(slots.every(s=>s.point.x>=213&&s.point.x<=264));
});
test('149: no space yields no template rather than duplicated positions',()=>{
 const slots=entryLanes(horizontal,{x:224,y:350},4,
   p=>p.x>=223&&p.x<=225);
 assert.equal(slots.length,0);
});
test('149: a generated mission preserves plan state when entry cannot fit',()=>{
 const s=newSession(0,100),a=team(s);
 const d=s.doors[0],before=a.map(x=>x.plan.length);
 const ok=planSquadEntry(s,d.id);
 if(!ok)assert.deepEqual(a.map(x=>x.plan.length),before);
 else{
   const destinations=a.map(x=>x.plan.filter(n=>n.kind==='move').at(-1)?.p);
   for(let i=0;i<destinations.length;i++)
     for(let j=0;j<i;j++)if(destinations[i]&&destinations[j])
       assert.ok(Math.hypot(destinations[i].x-destinations[j].x,
         destinations[i].y-destinations[j].y)>20);
 }
 activateSite(null);
});