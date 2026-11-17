import test from 'node:test';
import assert from 'node:assert/strict';
import {selectPhysicalEntrySettle} from '../src/breach-entry-target-settle.ts';
const p=(x,y)=>({x,y});
const door={id:'D1',a:p(200,150),b:p(200,190),open:true,
 openFraction:1,locked:false,wedged:false,jammed:false,kind:'hinged'};
test('D3.18A: Retail generated landing may use verified outer interior ring',()=>{
 const original=p(206,185),from=p(208,169);
 const chosen=selectPhysicalEntrySettle(from,original,door,[],
  q=>q.x>224&&q.y>=160&&q.y<=195,
  (a,b)=>true);
 assert.ok(chosen,'a nearby physically standable generated destination exists');
 assert.ok(chosen.x>224);
 assert.ok(Math.hypot(chosen.x-original.x,chosen.y-original.y)<=26.01);
 assert.deepEqual(original,p(206,185),'the authored original GO is immutable');
});
test('D3.18A: a cold alternate route cannot fake physical clearance',()=>{
 const from=p(208,169),original=p(206,185);
 let probes=0;
 const chosen=selectPhysicalEntrySettle(from,original,door,[],
  q=>q.x>224,
  ()=>false,
  ()=>{probes++;return [p(226,185)]});
 assert.equal(chosen,null,'unsafe first microstride rejects route');
 assert.ok(probes<=3,'bounded cold search');
});
test('D3.18A: cold physically verified continuation behind a door leaf',()=>{
 const from=p(208,169),original=p(206,185);
 const chosen=selectPhysicalEntrySettle(from,original,door,[],
  q=>q.x>224,
  (a,b)=>b.x<=217||a.x>=215,
  (a,b)=>[p(216,155),b]);
 assert.ok(chosen);
 assert.ok(chosen.x>224,'still on original intended side');
});
test('D3.18A: verified cold entry route is handed to the authoritative motor',()=>{
 const from=p(208,169),goal=p(206,185);
 let accepted=null;
 const chosen=selectPhysicalEntrySettle(from,goal,door,[],
  q=>q.x>224,
  (a,b)=>b.x<=217||a.x>=215,
  (a,b)=>[p(216,155),b],
  route=>{accepted=route;});
 assert.ok(chosen);
 assert.deepEqual(accepted,[p(216,155),chosen]);
});

test('D3.19A: Retail-style blocked landing samples near, middle and outer cold joins',()=>{
 const from=p(208,169),original=p(206,185),queries=[];
 let delivered=null;
 // All physically standable landings are on the original interior
 // side of the door. The chord from the actor is blocked near its
 // origin, but a separate motor-swept departure to (216,155) is clear.
 const canStand=q=>q.x>209&&q.y>175;
 const sweep=(a,b)=>!(a.x<212&&b.x>a.x&&b.y>a.y);
 const selected=selectPhysicalEntrySettle(from,original,door,[],
  canStand,sweep,
  (a,b)=>{
   const radius=Math.hypot(b.x-original.x,b.y-original.y);
   queries.push(radius);
   return radius>=19.5?[p(216,155),b]:[];
  },
  path=>{delivered=path;});
 assert.ok(selected,'the outer band must receive a real cold route probe');
 assert.ok(Math.hypot(selected.x-original.x,selected.y-original.y)>=19.5);
 assert.ok(queries.length<=3,'never exceed the historical cold search budget');
 assert.ok(queries.some(r=>r<=8.01),'near band was considered');
 assert.ok(queries.some(r=>r>8.01&&r<=15.01),'middle band was considered');
 assert.ok(queries.some(r=>r>=19.5),'outer band was not starved');
 assert.deepEqual(delivered,[p(216,155),selected]);
 assert.deepEqual(original,p(206,185),'original generated GO not edited');
});
test('D3.19A: no cold A* when the existing direct footprint is safe',()=>{
 const from=p(208,169),original=p(206,185);
 let calls=0;
 const selected=selectPhysicalEntrySettle(from,original,door,[],
  q=>q.x>209,()=>true,()=>{calls++;return [];});
 assert.ok(selected);
 assert.equal(calls,0,'direct passage remains the inexpensive first choice');
});
