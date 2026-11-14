import test from 'node:test';
import assert from 'node:assert/strict';
import {localDetour} from '../src/breach-cooperation.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function previousDetour(from,toward,doors,occupied,radius,world){
 const heading=Math.atan2(toward.y-from.y,toward.x-from.x);
 const f={x:Math.cos(heading),y:Math.sin(heading)};
 const side={x:-f.y,y:f.x};
 const candidates=[];
 for(const offset of [16,24,33,41])
  for(const ahead of [12,22,31])
   for(const sign of [1,-1])
    candidates.push({x:from.x+f.x*ahead+side.x*offset*sign,
     y:from.y+f.y*ahead+side.y*offset*sign});
 const safe=p=>!occupied.some(o=>distance(p,o)<radius*2+1)&&
  sweptBodyClear(from,p,doors,radius,world);
 return candidates.filter(safe).sort((a,b)=>
  distance(a,toward)-distance(b,toward))[0]??null;
}
test('D3.2.8: allocation-free local detour matches sorted oracle in random occupied and furniture layouts',()=>{
 let seed=0x32c81;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<180;i++){
  const from={x:160+rand()*60,y:160+rand()*60};
  const toward={x:from.x+(rand()-.5)*160,y:from.y+(rand()-.5)*160};
  const occupied=Array.from({length:i%7},()=>({
   x:from.x+(rand()-.5)*110,y:from.y+(rand()-.5)*110}));
  const cover=Array.from({length:i%5},()=>({
   x:from.x+(rand()-.5)*130,y:from.y+(rand()-.5)*130,
   w:7+rand()*23,h:6+rand()*22}));
  const world={passable(p,r=8){
   return p.x>=16+r&&p.x<=384-r&&p.y>=16+r&&p.y<=384-r&&
    !cover.some(b=>Math.abs(p.x-b.x)<b.w/2+r&&Math.abs(p.y-b.y)<b.h/2+r);
  }};
  const radius=i%3===0?8:i%3===1?6:9;
  const old=previousDetour(from,toward,[],occupied,radius,world);
  const actual=localDetour(from,toward,[],occupied,radius,world);
  assert.deepEqual(actual,old,'seeded case '+i);
 }
});
test('D3.2.8: no viable detour still returns null',()=>{
 const world={passable:()=>false};
 assert.equal(localDetour({x:40,y:40},{x:80,y:80},[],[],8,world),null);
});
