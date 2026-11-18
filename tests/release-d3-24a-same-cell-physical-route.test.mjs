import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../src/breach-core.ts';

const from={x:12,y:16},to={x:20,y:16}; // both snap to 16,16
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const swept=(a,b,stand)=>{
 const n=Math.max(1,Math.ceil(distance(a,b)/4));
 return Array.from({length:n},(_,i)=>{
  const t=(i+1)/n;
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
 }).every(stand);
};

test('D3.24A unobstructed short in-cell MOVE stays a single direct leg',()=>{
 assert.deepEqual(route(from,to,()=>true),[to]);
});

test('D3.24A blocked same-cell chord must be swept or safely bent',()=>{
 const stand=p=>!(p.x>=14&&p.x<=18&&p.y>=8&&p.y<=22);
 assert.equal(stand(from),true);
 assert.equal(stand(to),true);
 assert.equal(swept(from,to,stand),false);
 const path=route(from,to,stand);
 assert.ok(path.length>=2,'use a bounded local bend rather than blocked chord');
 assert.deepEqual(path.at(-1),to,'authored destination is never moved');
 let previous=from;
 for(const p of path){
  assert.ok(stand(p),'each waypoint needs clearance');
  assert.ok(swept(previous,p,stand),'every proposed leg must be safe');
  previous=p;
 }
});

test('D3.24A genuinely dividing same-cell wall returns no invented route',()=>{
 const stand=p=>!(p.x>=14&&p.x<=18);
 assert.deepEqual(route(from,to,stand),[]);
});
