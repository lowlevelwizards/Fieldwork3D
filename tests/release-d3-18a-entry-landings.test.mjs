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
  ()=>false,
  (a,b)=>[p(216,155),b]);
 assert.ok(chosen);
 assert.ok(chosen.x>224,'still on original intended side');
});
