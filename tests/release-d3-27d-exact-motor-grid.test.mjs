import test from 'node:test';
import assert from 'node:assert/strict';
import {coldExactMotorGridRoute}
 from '../src/breach-d327-exact-motor-grid.ts';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const motor=(canStand)=>(a,b)=>{
 const length=dist(a,b);
 for(let i=1,n=Math.max(1,Math.ceil(length/.3));i<=n;i++){
  const t=i/n,p={x:a.x+(b.x-a.x)*t,
    y:a.y+(b.y-a.y)*t};
  if(!canStand(p))return false;
 }
 return true;
};
test('D3.27D1 exact motor-edge A* walks around a solid furniture/wall corner',()=>{
 const stand=p=>!(p.x>=10&&p.x<=18&&Math.abs(p.y)<=6);
 const from={x:0,y:0},goal={x:32,y:0};
 const route=coldExactMotorGridRoute(from,goal,stand,motor(stand));
 assert.ok(route.length>=2,
  'a physically reachable detour must not use an invalid direct chord');
 assert.deepEqual(route.at(-1),goal);
 let at=from;
 for(const p of route){
  assert.equal(motor(stand)(at,p),true);
  assert.ok(dist(at,p)<=96);
  at=p;
 }
 assert.deepEqual(coldExactMotorGridRoute(from,goal,stand,motor(stand)),route,
  'exact edge search is replay deterministic');
});
test('D3.27D1 never authorizes an obstacle-occupied GO or start',()=>{
 const stand=p=>Math.abs(p.x)>=5;
 assert.deepEqual(coldExactMotorGridRoute({x:0,y:0},{x:20,y:0},
  stand,motor(stand)),[]);
 assert.deepEqual(coldExactMotorGridRoute({x:20,y:0},{x:0,y:0},
  stand,motor(stand)),[]);
});
test('D3.27D1 finite envelope cannot bridge a true sealed wall',()=>{
 const stand=p=>!(p.x>=10&&p.x<=18&&Math.abs(p.y)<100);
 const answer=coldExactMotorGridRoute({x:0,y:0},{x:32,y:0},
  stand,motor(stand),{padding:32,maxExpansions:1200});
 assert.deepEqual(answer,[],
  'never bypass a disconnected full-body region by teleport');
});
