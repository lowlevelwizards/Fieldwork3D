import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../src/breach-core.ts';
test('long-distance goal snapping uses a nearby swept legal endpoint',()=>{
 const from={x:304,y:40.1},to={x:40.1,y:40.1};
 const stand=p=>p.x>4&&p.y>4&&p.x<360&&p.y<200&&
  Math.hypot(p.x-48,p.y-48)>9.1;
 assert.ok(stand(to));
 assert.equal(stand({x:48,y:48}),false);
 const result=route(from,to,stand);
 assert.ok(result.length>0,'exact walkable goal should be reached');
 assert.deepEqual(result.at(-1),to);
 let previous=from;
 for(const p of result){
  const n=Math.ceil(Math.hypot(p.x-previous.x,p.y-previous.y)/3);
  for(let k=1;k<=n;k++){
   const at={x:previous.x+(p.x-previous.x)*k/n,
     y:previous.y+(p.y-previous.y)*k/n};
   assert.ok(stand(at),'rescue may not cut through physical obstruction');
  }
  previous=p;
 }
});
test('normal unblocked routes remain deterministic and end precisely',()=>{
 const pass=p=>p.x>=0&&p.y>=0&&p.x<=500&&p.y<=500;
 const a=route({x:300,y:120},{x:45,y:60},pass);
 assert.ok(a.length);assert.deepEqual(a.at(-1),{x:45,y:60});
 assert.deepEqual(a,route({x:300,y:120},{x:45,y:60},pass));
});
